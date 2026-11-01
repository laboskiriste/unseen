// Gmail loads every email image through its proxy (ci*.googleusercontent.com/proxy/...
// or /meips/...). A static DNR rule blocks all of those requests. This script
// decides which images are safe and adds an allow mark to their URL, which a
// higher-priority DNR rule lets through. The mark holds a token made once per
// install, so senders can't add it themselves. Trackers keep their URL and stay blocked.
// Nothing about the email leaves the browser.

const BODY = '.ii.gt'; // one message body in a Gmail conversation
const STYLED = '[style*="googleusercontent.com/"], [background*="googleusercontent.com/"]';
const PROXY_URLS = /https:\/\/[^/"'\s)]*googleusercontent\.com\/(?:proxy|meips)\/[^"'\s)]*/g;

let enabled = false; // until the setting and the allow token are read; a full scan follows then
const pageSeen = new Map(); // tracker key -> { name, host }, for the badge and popup
const fresh = []; // trackers found since the last report, for weekly stats
const messages = new WeakMap(); // body element -> per-message state

function messageState(body) {
  let state = messages.get(body);
  if (!state) {
    state = { keys: new Set(), counts: new Map(), blocked: new Set(), loadedAnyway: false, chip: null };
    messages.set(body, state);
  }
  return state;
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function record(body, tracker, key) {
  if (!pageSeen.has(key)) {
    pageSeen.set(key, { name: tracker, host: hostOf(key) });
    fresh.push({ name: tracker, key });
    report();
  }
  if (!body) return;
  const state = messageState(body);
  if (state.keys.has(key)) return;
  state.keys.add(key);
  state.counts.set(tracker, (state.counts.get(tracker) || 0) + 1);
  renderChip(body, state);
}

function checkImage(img) {
  const src = img.getAttribute('src');
  if (!PGB.isProxyUrl(src) || PGB.hasMark(src)) return;
  if (img.dataset.pgbSrc === src) return; // already judged and blocked

  const body = img.closest(BODY);
  const state = body && messageState(body);
  const verdict = PGB.classify({
    src,
    width: img.getAttribute('width'),
    height: img.getAttribute('height'),
    style: img.getAttribute('style'),
  });

  if (verdict.block && !state?.loadedAnyway) {
    img.dataset.pgbSrc = src;
    state?.blocked.add(img);
    if (verdict.tracker) {
      img.title = `Tracker blocked: ${verdict.tracker}`;
      record(body, verdict.tracker, PGB.originalUrl(src) || src);
    }
  } else {
    img.setAttribute('src', PGB.withMark(src));
  }
}

// Background images (inline style or the old `background` attribute) are let
// through unless their original URL is a known tracker or the element is hidden.
function checkStyled(el) {
  const box = { width: el.getAttribute('width'), height: el.getAttribute('height'), style: el.getAttribute('style') };
  for (const attr of ['style', 'background']) {
    const value = el.getAttribute(attr);
    if (!value || !value.includes('googleusercontent.com/')) continue;
    const marked = value.replace(PROXY_URLS, (url) => {
      const verdict = PGB.classify({ ...box, src: url });
      if (!verdict.block) return PGB.withMark(url);
      if (verdict.tracker) record(el.closest(BODY), verdict.tracker, PGB.originalUrl(url) || url);
      return url;
    });
    if (marked !== value) el.setAttribute(attr, marked);
  }
}

// CSS in the email's own <style> blocks (Gmail keeps them): images there are
// let through unless their original URL is a known tracker.
function checkStyleSheet(el) {
  const body = el.closest(BODY);
  const css = el.textContent;
  if (!body || !css.includes('googleusercontent.com/')) return;
  const marked = css.replace(PROXY_URLS, (url) => {
    const original = PGB.originalUrl(url);
    const tracker = original && PGB.trackerName(original);
    if (!tracker) return PGB.withMark(url);
    record(body, tracker, original);
    return url;
  });
  if (marked !== css) el.textContent = marked;
}

function scan(node) {
  if (!enabled || node.nodeType !== 1) return;
  if (node.nodeName === 'IMG') checkImage(node);
  else if (node.nodeName === 'STYLE') checkStyleSheet(node);
  else if (node.matches(STYLED)) checkStyled(node);
  node.querySelectorAll('img').forEach(checkImage);
  node.querySelectorAll(STYLED).forEach(checkStyled);
  node.querySelectorAll('style').forEach(checkStyleSheet);
}

function renderChip(body, state) {
  if (!state.chip) {
    state.chip = document.createElement('div');
    state.chip.className = 'pgb-chip';
  }
  if (!state.chip.isConnected && body.parentNode) body.parentNode.insertBefore(state.chip, body);

  const chip = state.chip;
  chip.replaceChildren();
  const icon = document.createElement('span');
  icon.className = 'pgb-icon';
  icon.textContent = '🛡';
  const text = document.createElement('span');

  if (state.loadedAnyway) {
    chip.classList.add('pgb-loaded');
    text.textContent = 'Tracking images loaded. The sender can now see that you opened this email.';
    chip.append(icon, text);
    return;
  }

  const total = [...state.counts.values()].reduce((a, b) => a + b, 0);
  const names = [...state.counts.keys()].join(', ');
  text.textContent = `Blocked ${total} tracker${total === 1 ? '' : 's'}: ${names}`;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pgb-load';
  button.textContent = 'Load images anyway';
  button.addEventListener('click', () => loadAnyway(body, state));
  chip.append(icon, text, button);
}

function loadAnyway(body, state) {
  state.loadedAnyway = true;
  for (const img of state.blocked) {
    const src = img.dataset.pgbSrc;
    delete img.dataset.pgbSrc;
    if (src && img.getAttribute('src') === src) img.setAttribute('src', PGB.withMark(src));
  }
  state.blocked.clear();
  body.querySelectorAll(STYLED).forEach((el) => {
    for (const attr of ['style', 'background']) {
      const value = el.getAttribute(attr);
      if (value) el.setAttribute(attr, PGB.markAllIn(value));
    }
  });
  body.querySelectorAll('style').forEach((el) => { el.textContent = PGB.markAllIn(el.textContent); });
  renderChip(body, state);
}

let reportTimer;
function report() {
  clearTimeout(reportTimer);
  reportTimer = setTimeout(() => {
    const items = fresh.splice(0);
    chrome.runtime.sendMessage({ type: 'page', trackers: [...pageSeen.values()], fresh: items }).catch(() => {});
  }, 300);
}

const observer = new MutationObserver((mutations) => {
  if (!enabled) return;
  for (const m of mutations) {
    if (m.type === 'attributes') {
      if (m.target.nodeName === 'IMG' && m.attributeName === 'src') checkImage(m.target);
      else if (m.attributeName !== 'src') checkStyled(m.target);
    } else {
      m.addedNodes.forEach(scan);
    }
  }
});
observer.observe(document, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['src', 'style', 'background'],
});

// Without the allow token nothing is marked, so images stay blocked (safe).
function applySettings({ enabled: value, allowToken }) {
  PGB.setToken(allowToken);
  const was = enabled;
  enabled = value !== false && !!allowToken;
  if (enabled && !was) scan(document.documentElement);
}
const settings = {};
chrome.storage.local.get(['enabled', 'allowToken']).then((stored) => applySettings(Object.assign(settings, stored)));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !(changes.enabled || changes.allowToken)) return;
  for (const key of ['enabled', 'allowToken']) if (changes[key]) settings[key] = changes[key].newValue;
  applySettings(settings);
});

// Pro: open links in emails without their click tracker, when the real
// address is written in the link itself (src/links.js). The tracker is never
// contacted; links we can't clean are left to Gmail.
let proState; // the stored `pro` object; PRO.status() decides at click time

function openClean(e) {
  if (!enabled || e.button > 1 || (e.type === 'click' && e.button !== 0)) return;
  const a = e.target.closest?.('a[href]');
  if (!a || !a.closest(BODY) || !proState || !PRO.status(proState).isPro) return;
  const href = a.getAttribute('href');
  const { url } = LINKS.clean(href);
  if (url === href) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  window.open(url, '_blank', 'noopener,noreferrer');
}
document.addEventListener('click', openClean, true);
document.addEventListener('auxclick', openClean, true);

chrome.storage.local.get('pro').then(({ pro }) => { proState = pro; });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.pro) proState = changes.pro.newValue;
});
