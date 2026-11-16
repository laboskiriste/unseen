// Runs the real service worker against a fake `chrome` API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const listeners = {};
const on = (name) => ({ addListener: (fn) => { (listeners[name] ??= []).push(fn); } });
const fire = (name, ...args) => listeners[name].map((fn) => fn(...args));
const tabs = [];
const stored = {};
const rulesets = [];
let dynamicRules = [];
const chrome = {
  runtime: { id: 'self', getURL: (p) => `chrome-extension://self/${p}`, onInstalled: on('installed'), onStartup: on('startup'), onMessage: on('message') },
  storage: {
    local: {
      get: async (k) => Object.fromEntries((Array.isArray(k) ? k : [k]).filter((key) => key in stored).map((key) => [key, structuredClone(stored[key])])),
      set: async (o) => Object.assign(stored, structuredClone(o)),
    },
    session: { get: async () => ({}), set: async () => {}, remove: async () => {} },
    onChanged: on('changed'),
  },
  declarativeNetRequest: {
    updateEnabledRulesets: async (opts) => rulesets.push(opts),
    getDynamicRules: async () => structuredClone(dynamicRules),
    updateDynamicRules: async ({ removeRuleIds = [], addRules = [] }) => {
      dynamicRules = [...dynamicRules.filter((r) => !removeRuleIds.includes(r.id)), ...structuredClone(addRules)];
    },
  },
  action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
  tabs: { create: ({ url }) => tabs.push(url), onRemoved: on('tabRemoved') },
};
const fetch = () => { throw new Error('no network expected'); };
const code = ['license.js', 'pro.js', 'background.js'].map((f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')).join('\n');
runInNewContext(code, { chrome, crypto, TextEncoder, console, fetch, AbortSignal });

test('first install opens the welcome page and turns blocking on', async () => {
  fire('installed', { reason: 'install' });
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(tabs, ['chrome-extension://self/src/welcome/welcome.html']);
  // The object comes from the VM's realm, so compare it as JSON.
  assert.equal(JSON.stringify(rulesets.at(-1)), JSON.stringify({ enableRulesetIds: ['gmail_proxy'] }));
  assert.equal(typeof stored.installedAt, 'number', 'the first-use date is kept, for the rating card');
  assert.equal(stored.pro, undefined, 'there is no trial any more');
  assert.equal(JSON.stringify(stored.daily), '{}', 'the history starts empty');
});

test('an update keeps the rules in sync but opens nothing', async () => {
  fire('installed', { reason: 'update' });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(tabs.length, 1);
  assert.equal(rulesets.length, 2);
});

test('the allow rule uses a token made once per install', async () => {
  const token = stored.allowToken;
  assert.match(token, /^[0-9a-f]{24}$/);
  assert.equal(dynamicRules.length, 1);
  const re = new RegExp(dynamicRules[0].condition.regexFilter);
  const P = 'https://ci3.googleusercontent.com/proxy/AB';
  assert.ok(re.test(`${P}?pgb_${token}=1#https://x.com/a.png`));
  assert.ok(re.test(`${P}?sz=1&pgb_${token}=1`));
  assert.ok(!re.test(`${P}#https://evil.example/o.gif?pgb_${token}=1`), 'not in the sender URL');
  assert.ok(!re.test(`${P}?pgb_ok=1#x`), 'not the old fixed mark');

  fire('startup');
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(stored.allowToken, token, 'the token stays the same');
  assert.equal(dynamicRules.length, 1);
});

test('license actions are answered for extension pages only', async () => {
  const ask = (url) => new Promise((resolve) => {
    const kept = fire('message', { type: 'pro-activate', key: 'UNSEEN-X' }, { id: 'self', url }, resolve);
    if (!kept.includes(true)) resolve('ignored');
  });
  assert.equal(await ask('https://mail.google.com/mail/u/0/'), 'ignored');
  // fetch is unavailable here, which looks like being offline.
  assert.equal(JSON.stringify(await ask('chrome-extension://self/src/popup.html')), JSON.stringify({ ok: false, reason: 'offline' }));
});

// The history that Unseen Plus shows. Day keys are local calendar days.
const day = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const settle = () => new Promise((r) => setTimeout(r, 30));
const seeTrackers = (...names) => fire('message', { type: 'page', trackers: [], fresh: names.map(([key, name]) => ({ key, name })) }, { tab: { id: 1 } });

test('blocked trackers are counted per day and company, once per email image', async () => {
  seeTrackers(['https://t.example/a?u=1', 'Mailchimp'], ['https://t.example/b?u=1', 'HubSpot']);
  await settle();
  seeTrackers(['https://t.example/a?u=1', 'Mailchimp'], ['https://t.example/c?u=2', 'Mailchimp']);
  await settle();
  const today = day(Date.now());
  assert.equal(JSON.stringify(stored.daily[today]), JSON.stringify({ Mailchimp: 2, HubSpot: 1 }), 'the repeated image is not counted twice');
  assert.equal(stored.total, 3);
});

test('history older than a year and a bit is dropped, newer history stays', async () => {
  const old = day(Date.now() - 500 * 864e5);
  const recent = day(Date.now() - 100 * 864e5);
  stored.daily = { ...stored.daily, [old]: { Old: 5 }, [recent]: { Recent: 2 } };
  seeTrackers(['https://t.example/d?u=3', 'Yesware']);
  await settle();
  assert.equal(stored.daily[old], undefined);
  assert.equal(JSON.stringify(stored.daily[recent]), JSON.stringify({ Recent: 2 }));
});

test('an install from before 0.3.0 gets its history and start date from what it already had', async () => {
  const t = Date.now() - 3 * 864e5;
  delete stored.installedAt;
  delete stored.daily;
  stored.pro = { trialStart: t - 20 * 864e5 };
  stored.events = [{ t, n: 'Mailchimp' }, { t, n: 'Mailchimp' }, { t: t + 1000, n: 'HubSpot' }];
  fire('startup');
  await settle();
  assert.equal(stored.installedAt, t - 20 * 864e5, 'the old trial date becomes the first-use date');
  assert.equal(JSON.stringify(stored.daily), JSON.stringify({ [day(t)]: { Mailchimp: 2, HubSpot: 1 } }));
  // A second start leaves it alone.
  stored.events = [];
  fire('startup');
  await settle();
  assert.equal(stored.daily[day(t)].Mailchimp, 2);
});
