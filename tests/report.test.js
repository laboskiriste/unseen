// What the history page shows, from daily counts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const { REPORT } = runInNewContext(`${readFileSync(new URL('../src/report.js', import.meta.url), 'utf8')}\n({ REPORT })`, { Date });
// Noon on the 16th, so the local time zone can't move it to another day.
const NOW = new Date(2026, 10, 16, 12).getTime();

const daily = {
  '2026-11-15': { Mailchimp: 3, HubSpot: 1 },
  '2026-11-02': { Mailchimp: 2 },
  '2026-10-30': { Yesware: 4, Mailchimp: 1 },
  '2025-12-01': { Old: 7 },
  '2025-11-30': { TooOld: 9 },
};
const plain = (x) => JSON.parse(JSON.stringify(x));

test('months: the last 12, oldest first, empty months as 0', () => {
  const m = plain(REPORT.months(daily, NOW));
  assert.equal(m.length, 12);
  assert.deepEqual(m[0], { month: '2025-12', total: 7 });
  assert.deepEqual(m[10], { month: '2026-10', total: 5 });
  assert.deepEqual(m[11], { month: '2026-11', total: 6 });
  assert.equal(m[5].total, 0);
  assert.ok(!m.some((x) => x.month === '2025-11'), 'a month outside the window is left out');
});

test('months: crossing a year boundary', () => {
  assert.equal(REPORT.monthKey(new Date(2026, 0, 31, 12).getTime(), 0), '2026-01');
  assert.equal(REPORT.monthKey(new Date(2026, 0, 31, 12).getTime(), 1), '2025-12');
  assert.equal(REPORT.monthKey(new Date(2026, 2, 31, 12).getTime(), 1), '2026-02', 'the 31st does not skip a short month');
});

test('top companies: this month and of all time', () => {
  assert.deepEqual(plain(REPORT.top(daily, '2026-11-01')), [['Mailchimp', 5], ['HubSpot', 1]]);
  const all = plain(REPORT.top(daily));
  assert.deepEqual(all.slice(0, 3), [['TooOld', 9], ['Old', 7], ['Mailchimp', 6]]);
  assert.deepEqual(plain(REPORT.top({ '2026-11-01': { B: 2, A: 2 } })), [['A', 2], ['B', 2]], 'ties are alphabetical');
  assert.deepEqual(plain(REPORT.top({})), []);
});

test('totals and the first day', () => {
  assert.equal(REPORT.total(daily), 3 + 1 + 2 + 4 + 1 + 7 + 9);
  assert.equal(REPORT.since(daily), '2025-11-30');
  assert.equal(REPORT.since({}), null);
  assert.equal(REPORT.total({}), 0);
});

test('CSV: one row per day and company, safe for spreadsheets', () => {
  assert.equal(REPORT.toCsv({}), 'date,company,count\n');
  const csv = REPORT.toCsv({
    '2026-11-02': { Mailchimp: 2 },
    '2026-11-01': { 'Acme, Inc': 1, 'Say "hi"': 4, '=SUM(1)': 3 },
  });
  assert.equal(csv, [
    'date,company,count',
    '2026-11-01,"Say ""hi""",4',
    "2026-11-01,'=SUM(1),3",
    '2026-11-01,"Acme, Inc",1',
    '2026-11-02,Mailchimp,2',
    '',
  ].join('\n'));
});
