// Runs the real service worker against a fake `chrome` API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const listeners = {};
const on = (name) => ({ addListener: (fn) => { listeners[name] = fn; } });
const tabs = [];
const rulesets = [];
const chrome = {
  runtime: { getURL: (p) => `chrome-extension://self/${p}`, onInstalled: on('installed'), onStartup: on('startup'), onMessage: on('message') },
  storage: {
    local: { get: async () => ({}), set: async () => {} },
    session: { get: async () => ({}), set: async () => {}, remove: async () => {} },
    onChanged: on('changed'),
  },
  declarativeNetRequest: { updateEnabledRulesets: async (opts) => rulesets.push(opts) },
  action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
  tabs: { create: ({ url }) => tabs.push(url), onRemoved: on('tabRemoved') },
};
runInNewContext(readFileSync(new URL('../src/background.js', import.meta.url), 'utf8'), { chrome, crypto, TextEncoder, console });

test('first install opens the welcome page and turns blocking on', async () => {
  listeners.installed({ reason: 'install' });
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(tabs, ['chrome-extension://self/src/welcome/welcome.html']);
  // The object comes from the VM's realm, so compare it as JSON.
  assert.equal(JSON.stringify(rulesets.at(-1)), JSON.stringify({ enableRulesetIds: ['gmail_proxy'] }));
});

test('an update keeps the rules in sync but opens nothing', async () => {
  listeners.installed({ reason: 'update' });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(tabs.length, 1);
  assert.equal(rulesets.length, 2);
});
