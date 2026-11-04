const WEEK = 7 * 864e5;

function listItem(main, extra) {
  const li = document.createElement('li');
  li.textContent = main;
  if (extra) {
    const span = document.createElement('span');
    span.className = 'host';
    span.textContent = ` ${extra}`;
    li.append(span);
  }
  return li;
}

async function render() {
  const { enabled, events = [], total = 0 } = await chrome.storage.local.get(['enabled', 'events', 'total']);
  const on = enabled !== false;
  document.getElementById('enabled').checked = on;

  const recent = events.filter((e) => e.t >= Date.now() - WEEK);
  document.getElementById('week').textContent = recent.length;
  const counts = new Map();
  for (const e of recent) counts.set(e.n, (counts.get(e.n) || 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  document.getElementById('top').replaceChildren(...top.map(([name, n]) => listItem(name, `×${n}`)));
  document.getElementById('total').textContent = `${total} blocked in total`;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const key = tab && `tab:${tab.id}`;
  const page = key ? (await chrome.storage.session.get(key))[key] || [] : [];
  if (page.length) {
    document.getElementById('page').replaceChildren(...page.map((t) => listItem(t.name, t.host)));
  }
}

document.getElementById('enabled').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ enabled: e.target.checked });
  const note = document.getElementById('off-note');
  note.textContent = `Blocking is ${e.target.checked ? 'on' : 'off'}. Reload Gmail for the change to apply.`;
  note.hidden = false;
});

// One line pointing to the other Tinyward extensions. Plain links from
// family.js: nothing is fetched or tracked.
function renderFamily() {
  const { family, extensions } = globalThis.TINYWARD;
  const others = extensions.filter((e) => e.id !== 'unseen');
  if (!others.length) return;
  const firefox = typeof browser !== 'undefined' && typeof browser.runtime?.getBrowserInfo === 'function';
  const el = document.getElementById('family');
  el.append(`More from ${family}: `);
  others.forEach((e, i) => {
    if (i > 0) el.append(' · ');
    const a = document.createElement('a');
    a.href = (firefox ? e.firefox : e.chrome) ?? e.website;
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = e.short;
    a.textContent = e.name.split(':')[0];
    el.append(a);
  });
}

// The Pro section. Key actions run in the background (src/background.js),
// which is the only place that talks to the license server.
const $ = (id) => document.getElementById(id);
const KEY_ERRORS = {
  'not-found': "That key wasn't found. Check it and try again.",
  refused: "This key can't be used: it was refunded, has expired, or is already active in 3 browsers. To move it, remove it from a browser you no longer use in Polar's customer portal (the link is in your purchase email).",
  unexpected: "The license server gave an answer Unseen doesn't understand. Please update Unseen, or tell us on GitHub.",
  'not-allowed': 'Firefox needs your OK to send the key to Polar. Allow it under Unseen in about:addons, then try again.',
  offline: "Couldn't reach the license server. Check your connection and try again.",
  declined: 'Firefox needs your OK to send the key to Polar, the seller, to check it. Nothing else is sent.',
  error: 'Something went wrong. Please try again.',
};

function proStatusText(s) {
  if (s.licensed) return 'Pro is active. Thank you for supporting Unseen!';
  if (s.revoked) return 'Your license key is no longer valid (for example refunded), so Pro is off. Blocking trackers stays free.';
  if (s.hasKey) return "Your license key hasn't been checked for a while. Pro turns back on once you're online.";
  if (s.trialDaysLeft > 0) return `${s.trialDaysLeft} ${s.trialDaysLeft === 1 ? 'day' : 'days'} of Pro left in your free trial.`;
  return 'Your Pro trial ended. Blocking trackers stays free.';
}

async function renderPro() {
  const pro = await PRO.load(chrome.storage.local);
  const s = PRO.status(pro);
  $('pro-status').textContent = proStatusText(s);
  const { lifetime } = LICENSE.CHECKOUT;
  $('buy-lifetime').href = lifetime ?? '';
  $('buy-lifetime').hidden = !lifetime;
  $('pro-buy').hidden = s.licensed || !lifetime;
  $('pro-form').hidden = s.hasKey;
  $('pro-owned').hidden = !s.hasKey;
  $('pro-recheck').hidden = !s.revoked;
  $('pro-key-shown').textContent = s.hasKey ? `…${pro.key.slice(-4)}` : '';
}

// Sends a key action to the background and shows any error under `where`.
async function proAction(message, button, where) {
  button.disabled = true;
  where.hidden = true;
  const res = await chrome.runtime.sendMessage(message).catch(() => ({ ok: false, reason: 'error' }));
  button.disabled = false;
  if (!res?.ok) {
    where.textContent = KEY_ERRORS[res?.reason] ?? KEY_ERRORS.error;
    where.hidden = false;
  }
  await renderPro();
  return res?.ok;
}

// Firefox asks for the optional authenticationInfo data permission before the
// key leaves the browser. It has to be requested straight from the click.
function allowKeyCheck() {
  if (typeof browser === 'undefined' || typeof browser.runtime?.getBrowserInfo !== 'function') return true;
  return browser.permissions.request({ data_collection: ['authenticationInfo'] }).catch(() => false);
}

$('pro-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const key = $('pro-key').value.trim();
  if (!(await allowKeyCheck())) {
    $('pro-error').textContent = KEY_ERRORS.declined;
    $('pro-error').hidden = false;
    return;
  }
  if (await proAction({ type: 'pro-activate', key }, $('pro-activate'), $('pro-error'))) $('pro-key').value = '';
});
$('pro-remove').addEventListener('click', () => proAction({ type: 'pro-remove' }, $('pro-remove'), $('pro-owned-error')));
$('pro-recheck').addEventListener('click', () => proAction({ type: 'pro-recheck' }, $('pro-recheck'), $('pro-owned-error')));

async function initPro() {
  await PRO.startTrial();
  await renderPro();
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.pro) renderPro();
});

// Asks once for a store rating, after a week and 20 blocked trackers.
async function renderRate() {
  const [{ ratePrompt, total = 0 }, pro] = await Promise.all([
    chrome.storage.local.get(['ratePrompt', 'total']),
    PRO.load(chrome.storage.local),
  ]);
  const ask = RATE.shouldAsk({ answered: ratePrompt, since: pro.trialStart, total });
  $('rate').hidden = !ask;
  if (!ask) return;
  const firefox = typeof browser !== 'undefined' && typeof browser.runtime?.getBrowserInfo === 'function';
  $('rate-count').textContent = total;
  $('rate-go').href = RATE.reviewUrl({ firefox, id: chrome.runtime.id });
}
const answerRate = (value) => chrome.storage.local.set({ ratePrompt: value }).then(() => { $('rate').hidden = true; });
$('rate-go').addEventListener('click', () => answerRate('rated'));
$('rate-no').addEventListener('click', () => answerRate('dismissed'));

renderFamily();
render();
initPro().then(renderRate);
