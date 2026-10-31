// Trial and license logic, with a fake storage and a fake Polar API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const DAY = 864e5;
const T0 = Date.parse('2026-11-01T00:00:00Z');
const ORG = '823c8500-74cf-4283-bbf1-ffd30ed8611e';
const API = 'https://api.polar.sh/v1/customer-portal/license-keys';
const BENEFIT = '88642029-aeb9-4cdf-bbeb-4ef18c5a7ab7';

let requests = [];
let reply = () => ({ status: 500 });
async function fetch(url, opts) {
  requests.push({ url, body: JSON.parse(opts.body) });
  const r = reply(url);
  if (r === 'offline') throw new TypeError('Failed to fetch');
  return { status: r.status, json: async () => r.data };
}

const root = new URL('..', import.meta.url).pathname;
const code = ['src/license.js', 'src/pro.js'].map((f) => readFileSync(`${root}${f}`, 'utf8')).join('\n');
const { LICENSE, PRO } = runInNewContext(`${code}\n({ LICENSE, PRO })`, { fetch, AbortSignal, JSON, Date });

function fakeStore(pro) {
  const data = pro ? { pro } : {};
  return {
    data,
    get: async (k) => (k in data ? { [k]: structuredClone(data[k]) } : {}),
    set: async (obj) => Object.assign(data, structuredClone(obj)),
  };
}
const granted = (extra = {}) => ({ status: 'granted', benefit_id: BENEFIT, expires_at: null, customer: { email: 'buyer@example.com' }, ...extra });

test.beforeEach(() => {
  requests = [];
  reply = () => ({ status: 500 });
});

test('trial: 30 days of Pro from the first run, then only Pro turns off', async () => {
  const store = fakeStore();
  await PRO.startTrial({ store, now: T0 });
  await PRO.startTrial({ store, now: T0 + 5 * DAY });
  assert.equal(store.data.pro.trialStart, T0, 'a second run keeps the first date');
  assert.equal(PRO.status(store.data.pro, T0).trialDaysLeft, 30);
  assert.equal(PRO.status(store.data.pro, T0 + 29.5 * DAY).trialDaysLeft, 1);
  assert.equal(await PRO.isPro({ store, now: T0 + 29.9 * DAY }), true);
  assert.equal(await PRO.isPro({ store, now: T0 + 30 * DAY }), false);
  assert.equal(requests.length, 0, 'no network without a key');
});

test('activating sends only the key, org id and a fixed label, and stores only key and activation id', async () => {
  reply = () => ({ status: 200, data: { id: 'act-1', license_key: granted() } });
  const store = fakeStore({ trialStart: T0 });
  const res = await PRO.activate('  UNSEEN-ABCD-1234  ', { store, now: T0 + 40 * DAY });
  assert.equal(res.ok, true);
  assert.equal(requests[0].url, `${API}/activate`);
  assert.deepEqual(requests[0].body, { key: 'UNSEEN-ABCD-1234', label: 'Unseen', organization_id: ORG });
  assert.deepEqual(store.data.pro, {
    trialStart: T0, key: 'UNSEEN-ABCD-1234', activationId: 'act-1', okAt: T0 + 40 * DAY, triedAt: T0 + 40 * DAY,
  });
  assert.ok(!JSON.stringify(store.data).includes('buyer@example.com'), "the buyer's details are not kept");
  assert.equal(await PRO.isPro({ store, now: T0 + 40 * DAY }), true);
});

test('activation errors: unknown key, refused key, no internet', async () => {
  const store = fakeStore({ trialStart: T0 });
  reply = () => ({ status: 404, data: { error: 'ResourceNotFound' } });
  assert.equal((await PRO.activate('UNSEEN-X', { store })).reason, 'not-found');
  reply = () => ({ status: 403, data: { error: 'NotPermitted' } });
  assert.equal((await PRO.activate('UNSEEN-X', { store })).reason, 'refused');
  reply = (url) => (url.endsWith('/activate') ? { status: 200, data: { id: 'a', license_key: granted({ expires_at: '2020-01-01T00:00:00Z' }) } } : { status: 204 });
  requests = [];
  assert.equal((await PRO.activate('UNSEEN-X', { store })).reason, 'refused');
  assert.equal(requests[1]?.url, `${API}/deactivate`, 'an unusable activation is given back');
  reply = (url) => (url.endsWith('/activate') ? { status: 200, data: { id: 'a', license_key: granted({ benefit_id: 'other' }) } } : { status: 204 });
  requests = [];
  assert.equal((await PRO.activate('GUARDIAN-X', { store })).reason, 'not-found', "another product's key");
  assert.equal(requests[1].url, `${API}/deactivate`, 'and its activation is given back');
  reply = () => 'offline';
  await assert.rejects(PRO.activate('UNSEEN-X', { store }), LICENSE.OfflineError);
  reply = () => ({ status: 503 });
  await assert.rejects(PRO.activate('UNSEEN-X', { store }), LICENSE.OfflineError);
  assert.equal((await PRO.activate('   ', { store })).reason, 'not-found');
  assert.deepEqual(store.data.pro, { trialStart: T0 });
});

const licensed = (okAt, extra = {}) => ({ trialStart: T0, key: 'UNSEEN-K', activationId: 'act-1', okAt, triedAt: okAt, ...extra });

test('the key is re-checked only once a month', async () => {
  const store = fakeStore(licensed(T0));
  await PRO.refresh({ store, now: T0 + 29 * DAY });
  assert.equal(requests.length, 0);

  reply = () => ({ status: 200, data: granted({ activation: { id: 'act-1' } }) });
  await PRO.refresh({ store, now: T0 + 31 * DAY });
  assert.equal(requests[0].url, `${API}/validate`);
  assert.deepEqual(requests[0].body, { key: 'UNSEEN-K', activation_id: 'act-1', benefit_id: BENEFIT, organization_id: ORG });
  assert.equal(store.data.pro.okAt, T0 + 31 * DAY);
});

test('offline: 14 days of grace after the check is due, retried daily', async () => {
  reply = () => 'offline';
  const store = fakeStore(licensed(T0));
  await PRO.refresh({ store, now: T0 + 31 * DAY });
  await PRO.refresh({ store, now: T0 + 31.5 * DAY });
  assert.equal(requests.length, 1, 'no second try the same day');
  assert.equal(store.data.pro.key, 'UNSEEN-K', 'the key is kept');
  assert.equal(await PRO.isPro({ store, now: T0 + 43 * DAY }), true);
  const late = PRO.status(store.data.pro, T0 + 44 * DAY);
  assert.equal(late.isPro, false);
  assert.equal(late.hasKey, true);

  reply = () => ({ status: 200, data: granted({ activation: { id: 'act-1' } }) });
  await PRO.refresh({ store, now: T0 + 50 * DAY });
  assert.equal(await PRO.isPro({ store, now: T0 + 50 * DAY }), true, 'back online turns Pro back on');
});

test('a valid reply without the activation keeps the key', async () => {
  reply = () => ({ status: 200, data: granted({ activation: null }) });
  const store = fakeStore(licensed(T0));
  await PRO.refresh({ store, now: T0 + 31 * DAY });
  assert.equal(store.data.pro.okAt, T0 + 31 * DAY);
});

test('a revoked key turns Pro off and is removed', async () => {
  const cases = [
    { status: 404, data: { error: 'ResourceNotFound' } },
    { status: 200, data: granted({ status: 'revoked', activation: { id: 'act-1' } }) },
    { status: 200, data: granted({ expires_at: '2026-10-01T00:00:00Z', activation: { id: 'act-1' } }) },
    { status: 200, data: granted({ activation: { id: 'act-other' } }) },
    { status: 200, data: granted({ benefit_id: 'other', activation: { id: 'act-1' } }) },
  ];
  for (const r of cases) {
    reply = () => r;
    const store = fakeStore(licensed(T0));
    await PRO.refresh({ store, now: T0 + 31 * DAY });
    assert.deepEqual(store.data.pro, { trialStart: T0, revoked: true }, JSON.stringify(r));
    const s = PRO.status(store.data.pro, T0 + 31 * DAY);
    assert.equal(s.isPro, false);
    assert.equal(s.revoked, true);
  }
});

test('removing the key frees the activation and keeps the trial date', async () => {
  reply = () => ({ status: 204 });
  const store = fakeStore(licensed(T0));
  await PRO.removeKey({ store });
  assert.equal(requests[0].url, `${API}/deactivate`);
  assert.deepEqual(requests[0].body, { key: 'UNSEEN-K', activation_id: 'act-1', organization_id: ORG });
  assert.deepEqual(store.data.pro, { trialStart: T0 });
});

test('checkout links are plain Polar links', () => {
  for (const url of Object.values(LICENSE.CHECKOUT)) {
    assert.match(url, /^https:\/\/buy\.polar\.sh\/polar_cl_\w+$/);
  }
});
