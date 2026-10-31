// Pure helpers shared by the content script and the unit tests. No DOM access.
// Expects TRACKER_LIST (src/trackers-data.js) to be loaded first.

const PGB = (() => {
  const MARK = 'pgb_ok=1';
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

  function withMark(src) {
    if (src.includes(MARK)) return src;
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
  function isTiny({ width, height, style }) {
    const w = width != null ? Number(width) <= 2 : null;
    const h = height != null ? Number(height) <= 2 : null;
    if (w !== null && h !== null ? w && h : w || h) return true;
    const s = (style || '').replace(/\s/g, '').toLowerCase();
    return /display:none|visibility:hidden|opacity:0(;|$)|(^|;)(max-|min-)?(width|height):[0-2]px/.test(s);
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

  return { MARK, isProxyUrl, originalUrl, withMark, markAllIn, trackerName, classify };
})();
