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

// The Pro section. Nothing here talks to the network except activating a key
// the user typed and the monthly re-check (src/pro.js, src/license.js).
const $ = (id) => document.getElementById(id);
const KEY_ERRORS = {
  'not-found': "That key wasn't found. Check it and try again.",
  refused: "This key can't be used: it was refunded, has expired, or is already active in 3 browsers.",
  offline: "Couldn't reach the license server. Check your connection and try again.",
};

function proStatusText(s) {
  if (s.licensed) return 'Pro is active. Thank you for supporting Unseen!';
  if (s.hasKey) return "Your license key hasn't been checked for a while. Pro turns back on once you're online.";
  if (s.trialDaysLeft > 0) return `${s.trialDaysLeft} ${s.trialDaysLeft === 1 ? 'day' : 'days'} of Pro left in your free trial.`;
  return 'Your Pro trial ended. Blocking trackers stays free.';
}

async function renderPro() {
  const pro = await PRO.load(chrome.storage.local);
  const s = PRO.status(pro);
  $('pro-status').textContent = proStatusText(s);
  $('pro-note').hidden = !s.revoked;
  $('pro-note').textContent = 'Your license key is no longer valid (refunded, or the yearly plan ended), so Pro is off.';
  const { lifetime, yearly } = LICENSE.CHECKOUT;
  $('buy-lifetime').href = lifetime ?? '';
  $('buy-lifetime').hidden = !lifetime;
  $('buy-yearly').href = yearly ?? '';
  $('buy-yearly').hidden = !yearly;
  $('pro-buy').hidden = s.hasKey || !(lifetime || yearly);
  $('pro-form').hidden = s.hasKey;
  $('pro-owned').hidden = !s.hasKey;
  $('pro-key-shown').textContent = s.hasKey ? `…${pro.key.slice(-4)}` : '';
}

$('pro-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = $('pro-activate');
  const error = $('pro-error');
  button.disabled = true;
  error.hidden = true;
  try {
    const res = await PRO.activate($('pro-key').value);
    if (!res.ok) throw new Error(res.reason);
    $('pro-key').value = '';
  } catch (err) {
    error.textContent = KEY_ERRORS[err instanceof LICENSE.OfflineError ? 'offline' : err.message] ?? KEY_ERRORS.offline;
    error.hidden = false;
  } finally {
    button.disabled = false;
  }
  renderPro();
});

$('pro-remove').addEventListener('click', async () => {
  await PRO.removeKey();
  renderPro();
});

async function initPro() {
  await PRO.startTrial();
  await renderPro();
  await PRO.refresh().catch(() => {});
  renderPro();
}

renderFamily();
render();
initPro();
