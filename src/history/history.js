// The tracker history page. The counts come from chrome.storage.local (kept by
// background.js) and are shown here and nowhere else. Unseen Plus unlocks the
// charts and the export; everyone can read the explanation and delete their
// history.
const $ = (id) => document.getElementById(id);
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (key) => MONTH_NAMES[Number(key.slice(5)) - 1];

function bars(list, items) {
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'none';
    li.textContent = 'Nothing yet.';
    list.replaceChildren(li);
    return;
  }
  const top = items.slice(0, 8);
  const max = top[0][1];
  list.replaceChildren(...top.map(([name, n]) => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = name;
    const count = document.createElement('b');
    count.textContent = n;
    const track = document.createElement('div');
    track.className = 'track';
    const fill = document.createElement('i');
    fill.style.width = `${Math.max(3, Math.round((n / max) * 100))}%`;
    track.append(fill);
    li.append(label, count, track);
    return li;
  }));
}

function chart(daily, now) {
  const months = REPORT.months(daily, now);
  const max = Math.max(1, ...months.map((m) => m.total));
  $('months').replaceChildren(...months.map((m, i) => {
    const col = document.createElement('div');
    col.className = `month${m.total ? '' : ' empty'}${i === months.length - 1 ? ' now' : ''}`;
    col.title = `${m.month}: ${m.total}`;
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = m.total || '';
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${m.total ? Math.max(4, Math.round((m.total / max) * 120)) : 3}px`;
    const label = document.createElement('span');
    label.className = 'm';
    label.textContent = monthLabel(m.month);
    col.append(n, bar, label);
    return col;
  }));
}

async function render() {
  const { daily = {}, pro } = await chrome.storage.local.get(['daily', 'pro']);
  const now = Date.now();
  const plus = PRO.status(pro).isPro;
  const first = REPORT.since(daily);
  $('since').textContent = first ? `Counting since ${first}. Kept on this device only.` : 'Nothing counted yet. It starts the next time Unseen blocks a tracker.';

  $('locked').hidden = plus;
  $('plus').hidden = !plus;
  if (!plus) {
    const href = LICENSE.CHECKOUT.plus;
    $('buy').href = href ?? '';
    $('buy').hidden = !href;
    return;
  }
  const thisMonth = REPORT.monthKey(now);
  const months = REPORT.months(daily, now, 2);
  $('t-month').textContent = months[1].total;
  $('t-last').textContent = months[0].total;
  $('t-all').textContent = REPORT.total(daily);
  chart(daily, now);
  bars($('top-month'), REPORT.top(daily, `${thisMonth}-01`));
  bars($('top-all'), REPORT.top(daily));
}

// The file is made here, in the page, and saved by the browser. Nothing is uploaded.
$('export').addEventListener('click', async () => {
  const { daily = {} } = await chrome.storage.local.get('daily');
  const url = URL.createObjectURL(new Blob([REPORT.toCsv(daily)], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `unseen-history-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// Two clicks, so a stray click can't wipe the history.
let armed = false;
$('clear').addEventListener('click', async () => {
  if (!armed) {
    armed = true;
    $('clear').textContent = 'Click again to delete everything';
    $('clear').classList.add('armed');
    setTimeout(() => {
      armed = false;
      $('clear').textContent = 'Delete my history';
      $('clear').classList.remove('armed');
    }, 4000);
    return;
  }
  await chrome.storage.local.remove(['daily', 'events', 'seen', 'total']);
  armed = false;
  $('clear').textContent = 'Delete my history';
  $('clear').classList.remove('armed');
  $('cleared').hidden = false;
  await render();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.pro || changes.daily)) render();
});
render();
