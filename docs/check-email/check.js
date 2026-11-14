// Email tracker checker: finds tracking pixels in a pasted email, using the
// same tracker list and rules as the extension (assets/classify.js). Nothing
// is sent anywhere, and the page's CSP blocks every image, so pasted content
// can't load anything either.

// Gmail's "Show original" is a raw MIME message. Pull out the HTML parts and
// undo their transfer encoding; anything without MIME headers is taken as HTML.
function htmlParts(raw) {
  const text = raw.replace(/\r\n/g, '\n');
  if (!/^content-type:/im.test(text)) return [text];
  const parts = [];
  // Each part: headers, a blank line, then the body up to the next boundary.
  const chunks = text.split(/\n--[^\n]*\n/);
  for (const chunk of chunks) {
    const split = chunk.indexOf('\n\n');
    if (split < 0) continue;
    const headers = chunk.slice(0, split).replace(/\n[ \t]+/g, ' ');
    if (!/content-type:\s*text\/html/i.test(headers)) continue;
    let body = chunk.slice(split + 2);
    const encoding = /content-transfer-encoding:\s*([\w-]+)/i.exec(headers)?.[1].toLowerCase();
    const charset = /charset="?([\w-]+)/i.exec(headers)?.[1] ?? 'utf-8';
    if (encoding === 'base64') body = decodeBytes(Uint8Array.from(atob(body.replace(/[^A-Za-z0-9+/=]/g, '')), (c) => c.charCodeAt(0)), charset);
    else if (encoding === 'quoted-printable') body = decodeQuotedPrintable(body, charset);
    parts.push(body);
  }
  return parts.length ? parts : [text];
}

function decodeBytes(bytes, charset) {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder().decode(bytes);
  }
}

function decodeQuotedPrintable(body, charset) {
  const joined = body.replace(/=\n/g, '');
  const bytes = [];
  for (let i = 0; i < joined.length; i++) {
    if (joined[i] === '=' && /^[0-9A-F]{2}$/i.test(joined.slice(i + 1, i + 3))) {
      bytes.push(parseInt(joined.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(...new TextEncoder().encode(joined[i]));
    }
  }
  return decodeBytes(new Uint8Array(bytes), charset);
}

// The classifier expects Gmail's proxy address with the sender's URL after '#'.
const PROXY = 'https://ci3.googleusercontent.com/meips/checker#';

function findTrackers(raw) {
  const found = [];
  let images = 0;
  for (const html of htmlParts(raw)) {
    // DOMParser builds an inert document: no scripts run, no images load.
    const doc = new DOMParser().parseFromString(html, 'text/html');
    for (const img of doc.querySelectorAll('img')) {
      const src = img.getAttribute('src') || '';
      if (!/^https?:\/\//i.test(src)) continue;
      images += 1;
      const original = src.includes('googleusercontent.com/') && src.includes('#') ? src.slice(src.indexOf('#') + 1) : src;
      const { block, tracker } = PGB.classify({
        src: PROXY + original,
        width: img.getAttribute('width'),
        height: img.getAttribute('height'),
        style: img.getAttribute('style'),
      });
      if (block && tracker) found.push({ tracker, url: original });
    }
  }
  return { images, found };
}

function host(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 60);
  }
}

function show({ images, found }) {
  const out = document.getElementById('result');
  out.replaceChildren();
  const summary = document.createElement('p');
  const strong = document.createElement('strong');
  if (!images) {
    strong.textContent = 'No images found.';
    summary.append(strong, ' Paste the whole original message, including the HTML part. In Gmail: open the email, ⋮, Show original, Copy to clipboard.');
  } else if (!found.length) {
    strong.textContent = 'No tracking pixels found';
    summary.append(strong, ` among ${images} image${images === 1 ? '' : 's'}. The sender may still track link clicks.`);
  } else {
    const names = [...new Set(found.map((f) => f.tracker))];
    strong.textContent = `${found.length} tracking pixel${found.length === 1 ? '' : 's'} found`;
    summary.append(strong, `: ${names.join(', ')}. Opening this email in Gmail tells the sender you read it.`);
  }
  out.append(summary);
  if (found.length) {
    const list = document.createElement('ul');
    for (const f of found) {
      const li = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = f.tracker;
      const code = document.createElement('code');
      code.textContent = host(f.url);
      li.append(name, ' · ', code);
      list.append(li);
    }
    out.append(list);
    const cta = document.createElement('p');
    cta.innerHTML = 'Unseen blocks these automatically in Gmail and leaves normal images alone. <a class="button" href="https://chromewebstore.google.com/detail/unseen-email-tracker-bloc/fibpgcjlnnookmhclhpmhmajileledhd">Add Unseen to Chrome, free</a> <a href="https://addons.mozilla.org/firefox/addon/unseen-email-tracker-blocker/">Firefox</a>';
    out.append(cta);
  }
}

const EXAMPLE = `<html><body>
<p>Hi! Our autumn sale starts today.</p>
<img src="https://example.com/banner.jpg" width="600" height="300" alt="Sale">
<img src="https://mandrillapp.com/track/open.php?u=1234&id=abcd" width="1" height="1" alt="">
<img src="https://t.example-news.com/o/open?u=9f8e7d" style="display:none">
</body></html>`;

document.getElementById('check').addEventListener('click', () => {
  show(findTrackers(document.getElementById('email').value));
});
document.getElementById('example').addEventListener('click', () => {
  document.getElementById('email').value = EXAMPLE;
  show(findTrackers(EXAMPLE));
});
