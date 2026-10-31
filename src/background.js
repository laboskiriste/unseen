// Badge per tab, weekly stats, and the on/off switch. Stats stay in
// chrome.storage.local and never leave the browser. Tracker URLs are stored
// only as short hashes, so the same email opened twice is counted once.

const RULESET = 'gmail_proxy';
const KEEP_DAYS = 30;
const MAX_SEEN = 5000;

async function syncRuleset() {
  const { enabled } = await chrome.storage.local.get('enabled');
  const on = enabled !== false;
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    on ? { enableRulesetIds: [RULESET] } : { disableRulesetIds: [RULESET] },
  );
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  syncRuleset();
  if (reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('src/welcome/welcome.html') });
});
chrome.runtime.onStartup.addListener(syncRuleset);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.enabled) syncRuleset();
});

async function hash(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Messages can arrive together; run the read-modify-write one at a time.
let queue = Promise.resolve();
function addStats(items) {
  queue = queue.then(async () => {
    const { seen = [], events = [], total = 0 } = await chrome.storage.local.get(['seen', 'events', 'total']);
    const seenSet = new Set(seen);
    const now = Date.now();
    let added = 0;
    for (const item of items) {
      const h = await hash(item.key);
      if (seenSet.has(h)) continue;
      seenSet.add(h);
      events.push({ t: now, n: item.name });
      added++;
    }
    if (!added) return;
    const cutoff = now - KEEP_DAYS * 864e5;
    await chrome.storage.local.set({
      seen: [...seenSet].slice(-MAX_SEEN),
      events: events.filter((e) => e.t >= cutoff),
      total: total + added,
    });
  }).catch((e) => console.error('stats update failed', e));
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type !== 'page' || !sender.tab) return;
  const tabId = sender.tab.id;
  chrome.storage.session.set({ [`tab:${tabId}`]: msg.trackers });
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#2e7d32' });
  chrome.action.setBadgeText({ tabId, text: msg.trackers.length ? String(msg.trackers.length) : '' });
  if (msg.fresh?.length) addStats(msg.fresh);
});

chrome.tabs.onRemoved.addListener((tabId) => chrome.storage.session.remove(`tab:${tabId}`));
