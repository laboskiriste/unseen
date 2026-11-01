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
    local: { get: async (k) => (k in stored ? { [k]: stored[k] } : {}), set: async (o) => Object.assign(stored, o) },
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
  assert.equal(typeof stored.pro?.trialStart, 'number', 'the Pro trial starts');
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
