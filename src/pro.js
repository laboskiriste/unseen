// Unseen Pro: the 30-day trial and the license key. Everything is kept in
// chrome.storage.local under `pro`:
//   { trialStart, key, activationId, okAt, triedAt, revoked }
// okAt is the last time the provider confirmed the key, triedAt the last
// attempt. A key the provider rejects is kept with revoked: true, so the user
// can check it again or remove it. Only Pro features check isPro; blocking
// never does.
// Expects LICENSE (src/license.js) to be loaded first.

const PRO = (() => {
  const DAY = 864e5;
  const TRIAL_DAYS = 30;
  const RECHECK_DAYS = 30;
  const GRACE_DAYS = 14;
  const RETRY_DAYS = 1;

  const deps = (d = {}) => ({
    store: d.store ?? chrome.storage.local,
    license: d.license ?? LICENSE,
    now: d.now ?? Date.now(),
  });

  async function load(store) {
    const { pro = {} } = await store.get('pro');
    return pro;
  }

  // Pure: what the stored state means at time `now`.
  function status(pro = {}, now = Date.now()) {
    const hasKey = Boolean(pro.key && pro.activationId);
    const licensed = hasKey && !pro.revoked && now - (pro.okAt || 0) < (RECHECK_DAYS + GRACE_DAYS) * DAY;
    // No start date means the trial never started properly: no trial.
    const trialEnd = pro.trialStart ? pro.trialStart + TRIAL_DAYS * DAY : 0;
    const trialDaysLeft = Math.max(0, Math.ceil((trialEnd - now) / DAY));
    return { isPro: licensed || trialDaysLeft > 0, licensed, hasKey, trialDaysLeft, revoked: Boolean(pro.revoked) };
  }

  const needsCheck = (pro, now) =>
    Boolean(pro.key && pro.activationId) &&
    !pro.revoked &&
    now - (pro.okAt || 0) >= RECHECK_DAYS * DAY &&
    now - (pro.triedAt || 0) >= RETRY_DAYS * DAY;

  // The trial starts the first time Unseen runs, including for people who
  // installed before Pro existed. Reinstalling starts it again, by design.
  async function startTrial(d) {
    const { store, now } = deps(d);
    const pro = await load(store);
    if (!pro.trialStart) await store.set({ pro: { ...pro, trialStart: now } });
  }

  async function isPro(d) {
    const { store, now } = deps(d);
    return status(await load(store), now).isPro;
  }

  // Returns { ok: true } or { ok: false, reason }. Throws LICENSE.OfflineError
  // when the provider can't be reached.
  async function activate(key, d) {
    const { store, license, now } = deps(d);
    key = key.trim();
    if (!key) return { ok: false, reason: 'not-found' };
    const res = await license.activate(key);
    if (!res.ok) return res;
    const { trialStart = now } = await load(store);
    await store.set({ pro: { trialStart, key, activationId: res.activationId, okAt: now, triedAt: now } });
    return { ok: true };
  }

  async function removeKey(d) {
    const { store, license, now } = deps(d);
    const pro = await load(store);
    if (pro.key && pro.activationId) license.deactivate(pro.key, pro.activationId);
    await store.set({ pro: { trialStart: pro.trialStart ?? now } });
  }

  // Re-checks the key about once a month. Offline, the key keeps working for
  // GRACE_DAYS after the check was due; a key the provider rejects turns Pro
  // off. `force` checks now, for the popup's "Check again".
  async function check(d, force = false) {
    const { store, license, now } = deps(d);
    const pro = await load(store);
    if (force ? !(pro.key && pro.activationId) : !needsCheck(pro, now)) return;
    await store.set({ pro: { ...pro, triedAt: now } });
    let good;
    try {
      good = await license.validate(pro.key, pro.activationId);
    } catch (e) {
      if (e instanceof license.OfflineError && !force) return;
      throw e;
    }
    const latest = await load(store);
    if (latest.key !== pro.key || latest.activationId !== pro.activationId) return;
    const { revoked, ...rest } = latest;
    await store.set({ pro: good ? { ...rest, okAt: now } : { ...rest, revoked: true } });
  }

  let running = null;
  function refresh(d) {
    running ??= check(d).finally(() => { running = null; });
    return running;
  }

  // Throws LICENSE.OfflineError when the provider can't be reached.
  const recheck = (d) => check(d, true);

  return { TRIAL_DAYS, load, status, startTrial, isPro, activate, removeKey, refresh, recheck };
})();
