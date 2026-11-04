// When the popup asks for a rating.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const ctx = {};
runInNewContext(`${readFileSync(new URL('../src/rate.js', import.meta.url), 'utf8')}\nglobalThis.RATE = RATE;`, ctx);
const { RATE } = ctx;
const DAY = 864e5;
const now = Date.parse('2026-11-20T00:00:00Z');

test('asks after a week and 20 blocked trackers', () => {
  assert.equal(RATE.shouldAsk({ since: now - 8 * DAY, total: 20, now }), true);
});

test('waits for a week of use and for real value', () => {
  assert.equal(RATE.shouldAsk({ since: now - 6 * DAY, total: 500, now }), false);
  assert.equal(RATE.shouldAsk({ since: now - 30 * DAY, total: 19, now }), false);
  assert.equal(RATE.shouldAsk({ since: undefined, total: 500, now }), false);
});

test('never asks again once answered', () => {
  for (const answered of ['rated', 'dismissed']) {
    assert.equal(RATE.shouldAsk({ answered, since: now - 30 * DAY, total: 500, now }), false);
  }
});

test('links to the right store', () => {
  assert.equal(RATE.reviewUrl({ id: 'fibpgcjlnnookmhclhpmhmajileledhd' }), 'https://chromewebstore.google.com/detail/fibpgcjlnnookmhclhpmhmajileledhd/reviews');
  assert.match(RATE.reviewUrl({ firefox: true }), /addons\.mozilla\.org\/firefox\/addon\/unseen-email-tracker-blocker\/reviews\/$/);
});
