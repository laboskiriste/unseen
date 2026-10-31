// License keys, sold through Polar. This is the only file that knows about
// the provider; swapping it means rewriting these three calls.
//
// What is sent, and only after the user enters a key: the key, the activation
// id Polar returned, our public organization id and the fixed label "Unseen".
// Polar's responses also contain the buyer's details; we keep none of them.

const LICENSE = (() => {
  const API = 'https://api.polar.sh/v1/customer-portal/license-keys';
  const ORGANIZATION_ID = '823c8500-74cf-4283-bbf1-ffd30ed8611e';
  const LABEL = 'Unseen';
  // Polar checkout links. Plain links: opening them sends nothing from here.
  const CHECKOUT = { lifetime: null, yearly: null };

  // Thrown for anything that isn't a clear answer about the key: no internet,
  // a timeout, a server error. Callers keep the current state and retry later.
  class OfflineError extends Error {}

  async function post(path, body) {
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
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    return { status: res.status, data };
  }

  const usable = (k) => k?.status === 'granted' && (!k.expires_at || Date.parse(k.expires_at) > Date.now());

  // Returns { ok: true, activationId } or { ok: false, reason } where reason is
  // 'not-found' (no such key) or 'refused' (revoked, expired or out of activations).
  async function activate(key) {
    const { status, data } = await post('activate', { key, label: LABEL });
    if (status === 200 && data?.id && usable(data.license_key)) return { ok: true, activationId: data.id };
    if (status === 404) return { ok: false, reason: 'not-found' };
    if (status === 403 || status === 200) return { ok: false, reason: 'refused' };
    throw new OfflineError(`activate: HTTP ${status}`);
  }

  // Returns true while the key is good, false once Polar says it is not
  // (refunded, revoked, a yearly plan that lapsed, or this activation removed).
  async function validate(key, activationId) {
    const { status, data } = await post('validate', { key, activation_id: activationId });
    if (status === 200) return usable(data) && data.activation?.id === activationId;
    if (status === 404) return false;
    throw new OfflineError(`validate: HTTP ${status}`);
  }

  // Frees the activation so the key can be used elsewhere. Best effort.
  async function deactivate(key, activationId) {
    try {
      await post('deactivate', { key, activation_id: activationId });
    } catch {}
  }

  return { CHECKOUT, OfflineError, activate, validate, deactivate };
})();
