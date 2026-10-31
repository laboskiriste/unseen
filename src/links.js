// Pure helpers for Unseen Pro's clean links. No DOM access, no network.
// Many click trackers carry the real address inside the link: in a query
// parameter, a path segment or a base64 payload. We read it from there and
// never contact the tracker. Trackers with an opaque id (Mailchimp's
// list-manage, SendGrid's upn=, HubSpot marketing...) are left alone.
//
// Corporate security gateways (Outlook Safe Links, Proofpoint, Mimecast,
// Barracuda) are deliberately not unwrapped: they scan the page on click.
//
// Formats cross-checked against urlpurify, ClearURLs and uBlock Origin's
// filter lists (2026-11-01).

const LINKS = (() => {
  const isWeb = (s) => typeof s === 'string' && /^https?:\/\/[^/\s]/i.test(s.trim());

  const param = (...names) => (u) => {
    for (const n of names) {
      const v = u.searchParams.get(n);
      if (v) return v;
    }
    return null;
  };

  // base64 or base64url, UTF-8.
  function b64(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    s += '='.repeat((4 - (s.length % 4)) % 4);
    return new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
  }

  // [tracker name, host, path, read the destination]
  const UNWRAP = [
    ['Google', /^(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/, /^\/url$/, param('q', 'url')],
    ['Amazon SES', /\.awstrack\.me$/, /^\/L0\/([^/]+)\//, (u, m) => decodeURIComponent(m[1])],
    ['Amazon SES', /./, /^\/CL0\/([^/]+)\/\d+\/[^/]+-000000\/[^/]+$/, (u, m) => decodeURIComponent(m[1])],
    ['Postmark', /^(click|track)\.pstmrk\.it$/, /^\/[23][mt]?(s?)\/([^/]+)\//,
      (u, m) => `${m[1] ? 'https' : 'http'}://${decodeURIComponent(m[2])}`],
    ['Kit', /^click\.convertkit-mail\d*\.com$/, /^\/[^/]+\/[^/]+\/([A-Za-z0-9+/=_-]+)\/?$/, (u, m) => b64(m[1])],
    ['Substack', /(^|\.)substack\.com$/, /^\/redirect\/2\/([\w-]+)\.[\w-]+$/, (u, m) => JSON.parse(b64(m[1])).e],
    ['Mandrill', /^(mandrillapp\.com|go\.mnsvc\.com)$/, /^\/track\/click\/\d+\/[^/]+$/,
      (u) => JSON.parse(JSON.parse(b64(u.searchParams.get('p'))).p).url],
    ['Mailchimp', /^us\d+\.mailchimp\.com$/, /^\/mctx\/clicks?$/, param('url')],
    ['Yesware', /^t\.yesware\.com$/, /^\/tt\/[0-9a-f]{40}\/[0-9a-f]{32}\/[0-9a-f]{32}\/(.+)$/,
      (u, m) => `https://${m[1]}${u.search}${u.hash}`],
    ['HubSpot Sales', /^t\.(sidekickopen\d+|signaux\w*|senalquatro)\.com$/, /^\/(e1t|s[12]t)\/c\/5\//, param('t')],
    ['GovDelivery', /^links\.govdelivery\.com$/, /^\/track$/, (u) => {
      const i = u.href.lastIndexOf('&&&');
      return i > -1 ? u.href.slice(i + 3) : null;
    }],
    ['Facebook', /^((l|lm|www|m|web|business)\.facebook\.com|l\.messenger\.com)$/, /^\/l\.php$/, param('u')],
    ['Instagram', /^l\.instagram\.com$/, /^\/$/, param('u')],
    ['LinkedIn', /^(www\.)?linkedin\.com$/, /^\/(redir\/redirect|safety\/go|redirect|nus-trk|nhome\/nus-redirect)\/?$/, param('url')],
    ['YouTube', /^(www\.|m\.)?youtube\.com$/, /^\/redirect$/, param('q')],
    ['Slack', /^slack-redir\.net$/, /^\/link$/, param('url')],
    ['Medium', /^(gen\.)?medium\.com$/, /^\/m\/global-identity(-2)?$/, param('redirectUrl')],
    ['Medium', /^medium\.com$/, /^\/r\/?$/, param('url')],
    ['Steam', /^steamcommunity\.com$/, /^\/linkfilter\/?$/, param('url', 'u')],
    ['Reddit', /^out\.reddit\.com$/, /^\//, param('url')],
    ['Tumblr', /^t\.umblr\.com$/, /^\/redirect$/, param('z')],
    ['VK', /^(m\.)?vk\.(com|ru)$/, /^\/away\.php$/, param('to')],
    ['Disqus', /^disq\.us$/, /^\/(url)?$/, (u) => u.searchParams.get('url')?.replace(/:[\w-]{27}$/, '')],
    ['X', /^t\.co$/, /^\/redirect$/, param('url')],
    ['Pinterest', /^([a-z]{2,3}\.)?pinterest\.(com|co\.uk|com\.au)$/, /^\/offsite\/?$/, param('url')],
  ];

  // Tracking parameters on the destination. Kept conservative: every name is
  // in ClearURLs' global rules or the AdGuard/uBlock removeparam lists.
  const STRIP = new Set([
    'fbclid', 'gclid', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'twclid', 'ttclid', 'yclid', 'igshid',
    'irclickid', 'rb_clickid', 'epik', '_ga', '_gl',
    'pk_campaign', 'pk_source', 'pk_medium', 'pk_cid', 'pk_vid',
    'mc_cid', 'mc_eid', 'mc_tc', '_hsenc', '_hsmi', '__hstc', '__hssc', '__hsfp', 'hsCtaTracking',
    'mkt_tok', 'elq', 'elqTrackId', 'elqaid', 'elqat', 'elqCampaignId', 'sfmc_id', 'sfmc_activityid',
    'et_rid', 'vero_id', 'vero_conv', 'ml_subscriber', 'ml_subscriber_hash', 'oly_anon_id', 'oly_enc_id',
    '_kx', 'ss_email_id', '_bta_tid', '_bta_c', 'trk_contact', 'trk_msg', 'wickedid', 's_cid', 'mbid', 'bbeml',
  ]);
  const STRIP_PREFIX = /^(utm|mtm)_/;

  function parse(href) {
    try {
      const u = new URL(href);
      return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
    } catch {
      return null;
    }
  }

  // One layer: { name, url } or null.
  function unwrap(href) {
    const u = parse(href);
    if (!u) return null;
    const host = u.hostname.toLowerCase();
    for (const [name, hostRe, pathRe, get] of UNWRAP) {
      if (!hostRe.test(host)) continue;
      const m = u.pathname.match(pathRe);
      if (!m) continue;
      let dest;
      try {
        dest = get(u, m);
      } catch {
        continue;
      }
      if (!isWeb(dest)) continue;
      const next = parse(dest.trim());
      if (next) return { name, url: next.href };
    }
    return null;
  }

  // Removes tracking parameters, keeping the rest of the query byte for byte.
  function strip(href) {
    const q = href.indexOf('?');
    if (q === -1 || !parse(href)) return href;
    const h = href.indexOf('#', q);
    const query = href.slice(q + 1, h === -1 ? undefined : h);
    const kept = query.split('&').filter((pair) => {
      const name = pair.split('=')[0];
      let key;
      try {
        key = decodeURIComponent(name.replace(/\+/g, ' '));
      } catch {
        return true;
      }
      return !(STRIP.has(key) || STRIP_PREFIX.test(key));
    });
    if (kept.length === query.split('&').length) return href;
    return href.slice(0, q) + (kept.length ? `?${kept.join('&')}` : '') + (h === -1 ? '' : href.slice(h));
  }

  // { url, via }: the address to open and the trackers skipped on the way.
  // url === href when there was nothing to clean.
  function clean(href) {
    let url = href;
    const via = [];
    for (let i = 0; i < 5; i++) {
      const next = unwrap(url);
      if (!next) break;
      via.push(next.name);
      url = next.url;
    }
    return { url: strip(url), via };
  }

  return { clean, unwrap, strip };
})();
