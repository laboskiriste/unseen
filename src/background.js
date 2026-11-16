// Badge per tab, weekly stats, and the on/off switch. Stats stay in
// chrome.storage.local and never leave the browser. Tracker URLs are stored
// only as short hashes, so the same email opened twice is counted once.

// Chrome runs this as a service worker; Firefox loads the same files from
// the manifest's background scripts list instead.
if (typeof importScripts === 'function') importScripts('license.js', 'pro.js');

const RULESET = 'gmail_proxy';
const KEEP_DAYS = 30;
// The history page (Unseen Plus) shows daily counts per company for up to a
// year. They stay in chrome.storage.local, like the rest.
const KEEP_DAILY_DAYS = 400;
const MAX_SEEN = 5000;

// Local calendar day, "2026-11-16".
function dayKey(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function syncRuleset() {
  const { enabled } = await chrome.storage.local.get('enabled');
  const on = enabled !== false;
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    on ? { enableRulesetIds: [RULESET] } : { disableRulesetIds: [RULESET] },
  );
}

// Lets through proxy images that carry the allow mark. The mark holds a random
// token made once per install, and the rule only looks before '#', where Gmail
// keeps its own part of the URL; the sender's URL comes after it. A dynamic
// rule because static rules can't hold a per-install value.
const ALLOW_RULE_ID = 1;
const allowRule = (token) => ({
  id: ALLOW_RULE_ID,
  priority: 2,
  action: { type: 'allow' },
  condition: {
    regexFilter: `^https://[a-z0-9.-]*googleusercontent\\.com/(proxy|meips)/[^?#]*\\?([^#]*&)?pgb_${token}=1(&|#|$)`,
    initiatorDomains: ['mail.google.com'],
    resourceTypes: ['image', 'media'],
  },
});

// The token is saved only after its rule exists, so the content script never
// marks an image the rule wouldn't let through.
async function syncAllowRule() {
  let { allowToken } = await chrome.storage.local.get('allowToken');
  allowToken ??= [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const rule = allowRule(allowToken);
  const current = (await chrome.declarativeNetRequest.getDynamicRules()).find((r) => r.id === ALLOW_RULE_ID);
  if (current?.condition?.regexFilter !== rule.condition.regexFilter) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [ALLOW_RULE_ID], addRules: [rule] });
  }
  await chrome.storage.local.set({ allowToken });
}

// Remembers the day Unseen was first used, for the rating card. Installs from
// before 0.3.0 start from their old trial date. Nothing leaves the browser.
async function markStart() {
  const { installedAt, pro } = await chrome.storage.local.get(['installedAt', 'pro']);
  if (!installedAt) await chrome.storage.local.set({ installedAt: pro?.trialStart ?? Date.now() });
}

// Re-checks the Plus license key when it is due. The check only talks to the
// license provider when a key was entered.
function syncPro() {
  markStart()
    .then(() => backfillDaily())
    .then(() => PRO.refresh())
    .catch((e) => console.error('pro check failed', e));
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  syncRuleset();
  syncAllowRule().catch((e) => console.error('allow rule failed', e));
  syncPro();
  if (reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('src/welcome/welcome.html') });
});
chrome.runtime.onStartup.addListener(() => {
  syncRuleset();
  syncAllowRule().catch((e) => console.error('allow rule failed', e));
  syncPro();
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.enabled) syncRuleset();
});

async function hash(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Messages can arrive together; run the read-modify-write one at a time.
let queue = Promise.resolve();

function addDaily(daily, day, name) {
  const counts = (daily[day] ??= {});
  counts[name] = (counts[name] || 0) + 1;
}

// Drops days older than the history keeps. Day keys sort as text.
function pruneDaily(daily, now) {
  const oldest = dayKey(now - KEEP_DAILY_DAYS * 864e5);
  for (const day of Object.keys(daily)) if (day < oldest) delete daily[day];
}

function addStats(items) {
  queue = queue.then(async () => {
    const { seen = [], events = [], total = 0, daily = {} } = await chrome.storage.local.get(['seen', 'events', 'total', 'daily']);
    const seenSet = new Set(seen);
    const now = Date.now();
    let added = 0;
    for (const item of items) {
      const h = await hash(item.key);
      if (seenSet.has(h)) continue;
      seenSet.add(h);
      events.push({ t: now, n: item.name });
      addDaily(daily, dayKey(now), item.name);
      added++;
    }
    if (!added) return;
    const cutoff = now - KEEP_DAYS * 864e5;
    pruneDaily(daily, now);
    await chrome.storage.local.set({
      seen: [...seenSet].slice(-MAX_SEEN),
      events: events.filter((e) => e.t >= cutoff),
      total: total + added,
      daily,
    });
  }).catch((e) => console.error('stats update failed', e));
}

// Installs from before 0.3.0 have the last 30 days as events but no daily
// counts yet. Builds them once, so the history doesn't start empty.
function backfillDaily() {
  queue = queue.then(async () => {
    const { events = [], daily } = await chrome.storage.local.get(['events', 'daily']);
    if (daily) return;
    const built = {};
    for (const e of events) addDaily(built, dayKey(e.t), e.n);
    await chrome.storage.local.set({ daily: built });
  }).catch((e) => console.error('history backfill failed', e));
  return queue;
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type !== 'page' || !sender.tab) return;
  const tabId = sender.tab.id;
  chrome.storage.session.set({ [`tab:${tabId}`]: msg.trackers });
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#2e7d32' });
  chrome.action.setBadgeText({ tabId, text: msg.trackers.length ? String(msg.trackers.length) : '' });
  if (msg.fresh?.length) addStats(msg.fresh);
  PRO.refresh().catch((e) => console.error('pro check failed', e));
});

// License actions from the popup run here, so closing the popup halfway
// through can't lose an activation. Replies { ok, reason? }.
const PRO_ACTIONS = {
  'pro-activate': (msg) => PRO.activate(msg.key),
  'pro-remove': () => PRO.removeKey().then(() => ({ ok: true })),
  'pro-recheck': () => PRO.recheck().then(() => ({ ok: true })),
};
const errorReason = (e) => {
  if (e instanceof LICENSE.NotAllowedError) return 'not-allowed';
  if (e instanceof LICENSE.UnexpectedReplyError) return 'unexpected';
  return e instanceof LICENSE.OfflineError ? 'offline' : 'error';
};
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const action = PRO_ACTIONS[msg?.type];
  // Only the extension's own pages, never a content script.
  if (!action || sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) return;
  action(msg)
    .catch((e) => ({ ok: false, reason: errorReason(e) }))
    .then(sendResponse);
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => chrome.storage.session.remove(`tab:${tabId}`));
