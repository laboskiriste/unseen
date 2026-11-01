// License keys, sold through Polar. This is the only file that knows about
// the provider; swapping it means rewriting these three calls.
//
// What is sent, and only after the user enters a key: the key, the activation
// id Polar returned, our public organization id and the fixed label "Unseen".
// Polar's responses also contain the buyer's details; we keep none of them.

const LICENSE = (() => {
  const API = 'https://api.polar.sh/v1/customer-portal/license-keys';
  const ORGANIZATION_ID = '823c8500-74cf-4283-bbf1-ffd30ed8611e';
  // The "Unseen Pro license key" benefit, so keys for other Tinyward
  // products in the same organization don't unlock Unseen.
  const BENEFIT_ID = '88642029-aeb9-4cdf-bbeb-4ef18c5a7ab7';
  const LABEL = 'Unseen';
  // Polar checkout links. Plain links: opening them sends nothing from here.
  const CHECKOUT = {
    lifetime: 'https://buy.polar.sh/polar_cl_ufyOS7IHgqRtf7LB67tKPwA9nSgQzgIt6rY1o0lb8fX',
  };

  // Thrown for anything that isn't a clear answer about the key: no internet,
  // a timeout, a server error, a Wi-Fi login page. Callers keep the current
  // state and retry later.
  class OfflineError extends Error {}
  // A 200 that isn't a license reply. Handled like being offline, so a brief
  // glitch costs nothing, but the popup says so: if Polar changed its replies,
  // Unseen needs an update rather than a better connection.
  class UnexpectedReplyError extends OfflineError {}
  // Firefox: the user took back the permission to send the key (about:addons).
  class NotAllowedError extends OfflineError {}

  async function allowedToSend() {
    if (typeof browser === 'undefined' || typeof browser.runtime?.getBrowserInfo !== 'function') return true;
    return browser.permissions.contains({ data_collection: ['authenticationInfo'] }).catch(() => true);
  }

  async function post(path, body) {
    if (!(await allowedToSend())) throw new NotAllowedError(`${path}: not allowed`);
    let res;
    try {
      res = await fetch(`${API}/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, organization_id: ORGANIZATION_ID }),
        credentials: 'omit',
        signal: AbortSignal.timeout(15000),
      });
    } catch (e) {
      throw new OfflineError(e.message);
    }
    if (res.redirected) throw new OfflineError(`${path}: redirected`);
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    // A 200 must be a real license reply; anything else came from somewhere
    // between us and Polar.
    if (res.status === 200 && !(data && typeof data === 'object' && 'benefit_id' in (data.license_key ?? data))) {
      throw new UnexpectedReplyError(`${path}: unexpected reply`);
    }
    return { status: res.status, data };
  }

  // Expiry is Polar's call (it answers 404 for an expired key), so the local
  // clock never turns Pro off.
  const usable = (k) => k?.status === 'granted' && k.benefit_id === BENEFIT_ID;

  // Returns { ok: true, activationId } or { ok: false, reason } where reason is
  // 'not-found' (no such key, or a key for another product) or 'refused'
  // (revoked, expired or out of activations).
  async function activate(key) {
    const { status, data } = await post('activate', { key, label: LABEL });
    if (status === 200 && data?.id) {
      if (usable(data.license_key)) return { ok: true, activationId: data.id };
      // Give the activation back, so a key we can't use loses nothing.
      await deactivate(key, data.id);
      return { ok: false, reason: data.license_key?.benefit_id === BENEFIT_ID ? 'refused' : 'not-found' };
    }
    if (status === 404) return { ok: false, reason: 'not-found' };
    if (status === 403) return { ok: false, reason: 'refused' };
    throw new OfflineError(`activate: HTTP ${status}`);
  }

  // Returns true while the key is good, false once Polar says it is not
  // (refunded, revoked, or this activation removed).
  async function validate(key, activationId) {
    const { status, data } = await post('validate', { key, activation_id: activationId, benefit_id: BENEFIT_ID });
    // Polar answers 404 when the activation doesn't belong to the key; the
    // activation in the reply is optional, so only a different one counts.
    if (status === 200) return usable(data) && (!data.activation || data.activation.id === activationId);
    if (status === 404) return false;
    throw new OfflineError(`validate: HTTP ${status}`);
  }

  // Frees the activation so the key can be used elsewhere. Best effort.
  async function deactivate(key, activationId) {
    try {
      await post('deactivate', { key, activation_id: activationId });
    } catch {}
  }

  return { CHECKOUT, OfflineError, UnexpectedReplyError, NotAllowedError, activate, validate, deactivate };
})();
