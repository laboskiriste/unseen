// What the history page (Unseen Plus) shows, worked out from the daily counts
// the background keeps: { "2026-11-16": { "Mailchimp": 3, "HubSpot": 1 } }.
// Pure functions with no DOM and no storage, so the tests can run them.

const REPORT = (() => {
  const monthOf = (day) => day.slice(0, 7);

  const sum = (counts) => Object.values(counts).reduce((a, b) => a + b, 0);

  // "2026-11" for the month `back` months before `now`'s month (local time).
  function monthKey(now, back = 0) {
    const d = new Date(now);
    d.setDate(1);
    d.setMonth(d.getMonth() - back);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // Trackers blocked in each of the last `count` months, oldest first. Months
  // with nothing are included as 0, so the chart has no gaps.
  function months(daily, now = Date.now(), count = 12) {
    const totals = new Map();
    for (const [day, counts] of Object.entries(daily)) {
      totals.set(monthOf(day), (totals.get(monthOf(day)) || 0) + sum(counts));
    }
    return Array.from({ length: count }, (_, i) => {
      const month = monthKey(now, count - 1 - i);
      return { month, total: totals.get(month) || 0 };
    });
  }

  // Companies by number of trackers blocked, most first. `fromDay` limits it
  // to that day and later ("2026-11-01" for this month); omit it for all time.
  function top(daily, fromDay = '') {
    const totals = new Map();
    for (const [day, counts] of Object.entries(daily)) {
      if (day < fromDay) continue;
      for (const [name, n] of Object.entries(counts)) totals.set(name, (totals.get(name) || 0) + n);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  const total = (daily) => Object.values(daily).reduce((n, counts) => n + sum(counts), 0);

  // The first day with anything counted, or null.
  const since = (daily) => Object.keys(daily).sort()[0] ?? null;

  // A spreadsheet opens a cell starting with = + - @ as a formula. The names
  // come from our own list, but the export shouldn't depend on that.
  function cell(value) {
    let text = String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  // One row per day and company: date,company,count.
  function toCsv(daily) {
    const rows = [];
    for (const day of Object.keys(daily).sort()) {
      for (const [name, n] of Object.entries(daily[day]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
        rows.push(`${day},${cell(name)},${n}`);
      }
    }
    return `date,company,count\n${rows.join('\n')}${rows.length ? '\n' : ''}`;
  }

  return { monthKey, months, top, total, since, toCsv };
})();
