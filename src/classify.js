// Pure helpers shared by the content script and the unit tests. No DOM access.
// Expects TRACKER_LIST (src/trackers-data.js) to be loaded first.

const PGB = (() => {
  // The allow mark carries a random token made once per install (background.js),
  // so a sender can't copy it into an email. Only the part of the URL before '#'
  // counts: Gmail puts the sender's own URL after it.
  let MARK = null;
  const setToken = (token) => { MARK = token ? `pgb_${token}=1` : null; };
  const PROXY = /^https:\/\/[^/]*googleusercontent\.com\/(proxy|meips)\//;
  const PROXY_IN_TEXT = /https:\/\/[^/"'\s)]*googleusercontent\.com\/(?:proxy|meips)\/[^"'\s)]*/g;
  const STATIC_IMAGE = /\.(gif|png|jpe?g|webp|svg)$/i;
  const trackers = TRACKER_LIST.map((t) => ({ name: t.name, re: new RegExp(t.source, 'i') }));

  const isProxyUrl = (src) => PROXY.test(src || '');

  // Gmail keeps the sender's original URL after '#' in the proxy URL.
  function originalUrl(src) {
    const i = src.indexOf('#');
    return i > -1 ? src.slice(i + 1) : null;
  }

  const beforeHash = (src) => {
    const i = src.indexOf('#');
    return i > -1 ? src.slice(0, i) : src;
  };
  const hasMark = (src) => !!MARK && beforeHash(src).split(/[?&]/).includes(MARK);

  function withMark(src) {
    if (!MARK || hasMark(src)) return src;
    const hash = src.indexOf('#');
    const base = hash > -1 ? src.slice(0, hash) : src;
    const rest = hash > -1 ? src.slice(hash) : '';
    return base + (base.includes('?') ? '&' : '?') + MARK + rest;
  }

  // Adds the mark to every proxy URL inside a CSS value or attribute.
  const markAllIn = (text) => text.replace(PROXY_IN_TEXT, (url) => withMark(url));

  function trackerName(url) {
    const hit = trackers.find((t) => t.re.test(url));
    return hit ? hit.name : null;
  }

  // A 600×1 divider line is not a pixel: when both sizes are given, both must be tiny.
  // Sizes may carry a unit ("1px"); a value that isn't a number counts as not given.
  const size = (v) => {
    const n = v == null ? NaN : parseFloat(v);
    return Number.isNaN(n) ? null : n <= 2;
  };
  const HIDDEN_STYLE = new RegExp([
    'display:none', 'visibility:hidden',
    'opacity:(0|0?\\.0\\d*)(;|$|!)', // fully or almost fully transparent
    '(^|;)(max-)?(width|height):-?[0-2](\\.\\d+)?(px)?(;|$|!)',
    'position:(absolute|fixed).*(^|;)(left|top|right):-\\d{3,}', // moved off screen
  ].join('|'));

  function isTiny({ width, height, style }) {
    const w = size(width);
    const h = size(height);
    if (w !== null && h !== null ? w && h : w || h) return true;
    return HIDDEN_STYLE.test((style || '').replace(/\s/g, '').toLowerCase());
  }

  // A static file such as spacer.gif is a layout spacer, not a per-recipient beacon.
  function looksLikeBeacon(original) {
    if (!original) return true;
    try {
      const u = new URL(original);
      return u.search.length > 1 || !STATIC_IMAGE.test(u.pathname);
    } catch {
      return true;
    }
  }

  // img: { src, width, height, style } as plain attribute values.
  // Returns { block: boolean, tracker: string | null }. A tracker name means
  // it is counted and shown; tiny unnamed images are blocked silently when
  // they look like spacers (invisible either way).
  function classify(img) {
    const original = originalUrl(img.src);
    const named = original && trackerName(original);
    if (named) return { block: true, tracker: named };
    if (isTiny(img)) return { block: true, tracker: looksLikeBeacon(original) ? 'Hidden pixel' : null };
    return { block: false, tracker: null };
  }

  return { setToken, hasMark, isProxyUrl, originalUrl, withMark, markAllIn, trackerName, classify };
})();
