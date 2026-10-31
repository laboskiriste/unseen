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

renderFamily();
render();
