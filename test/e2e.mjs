// End-to-end check without a real Gmail account. A local HTTPS server pretends
// to be mail.google.com and Gmail's image proxy; the browser reaches it through
// a local CONNECT proxy. The server logs every proxy image it receives, which is
// the ground truth for what a sender could see.
//
//   node test/e2e.mjs chrome
//   FIREFOX=/path/to/firefox node test/e2e.mjs firefox
import { createServer as createHttps } from 'node:https';
import { createServer as createHttp } from 'node:http';
import { connect } from 'node:net';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const root = new URL('..', import.meta.url).pathname;
const browserName = process.argv[2] || 'chrome';
const HTTPS_PORT = 18443;
const PROXY_PORT = 18080;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const certDir = `${root}test/.cert/`;
if (!existsSync(`${certDir}cert.pem`)) {
  mkdirSync(certDir, { recursive: true });
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '30',
    '-keyout', `${certDir}key.pem`, '-out', `${certDir}cert.pem`, '-subj', '/CN=fake-gmail',
    '-addext', 'subjectAltName=DNS:mail.google.com,DNS:*.googleusercontent.com'], { stdio: 'ignore' });
}

// Two messages shaped like Gmail's conversation view (.ii.gt holds a body).
const P = 'https://ci3.googleusercontent.com';
const PAGE = `<!doctype html><title>Fake Gmail</title>
<div class="adn" id="m1"><div class="ii gt"><div class="a3s">
  <img id="list-tracker" src="${P}/meips/AAA#https://t.yesware.com/t/abc/spacer.gif" width="20" height="20">
  <img id="hidden-tracker" src="${P}/proxy/BBB#https://news.example.com/o?id=1" style="display:none">
  <img id="logo" src="${P}/proxy/CCC#https://example.com/logo.png" width="120" height="40">
  <img id="no-fragment" src="https://ci5.googleusercontent.com/meips/DDD" width="200">
  <img id="spacer" src="${P}/meips/SSS#https://image.email.brand.com/lib/x/spacer.gif" height="1">
  <div id="bg" style="background-image: url(${P}/meips/BGG#https://example.com/hero.jpg); height: 40px"></div>
  <table><tr><td id="bg-tracker" background="${P}/meips/BGT#https://us1.list-manage.com/track/open.php?u=1">x</td></tr></table>
</div></div></div>
<div class="adn" id="m2"><div class="ii gt"><div class="a3s">
  <img id="meips-tracker" src="https://ci4.googleusercontent.com/meips/EEE#https://x.r.us-east-1.awstrack.me/I0/xyz" width="1" height="1">
  <img id="query-logo" src="${P}/proxy/FFF?sz=1#https://example.com/a.png?size=2" width="50">
  <a id="ses-link" href="https://x.r.us-east-1.awstrack.me/L0/https:%2F%2Fshop.example.com%2Fdeal%3Fid%3D7%26utm_source%3Dmail/1/01-000000/s=">Deal</a>
  <a id="opaque-link" href="https://us1.list-manage.com/track/click?u=1&id=2&e=3">Opaque</a>
</div></div></div>
<div class="adn" id="m3"><div class="ii gt"><div class="a3s">
  <style>.hero { background: url(${P}/proxy/CSS#https://example.com/hero2.jpg) }</style>
  <div class="hero">Sale</div>
  <img id="forged-mark" src="${P}/proxy/FRG#https://evil.example/o.gif?pgb_ok=1&uid=42" width="1" height="1">
  <img id="px-units" src="${P}/proxy/PXU#https://news.example.com/o?id=3" width="1px" height="1px">
  <div id="tiny-bg" style="background-image: url(${P}/proxy/TBG#https://news.example.com/b?id=4); width: 1px; height: 1px"></div>
</div></div></div>
<a id="outside-link" href="https://x.r.us-east-1.awstrack.me/L0/https:%2F%2Fshop.example.com%2Fnav/1/01-000000/s=">Not in an email</a>
<script>
// Stands in for Gmail's own link handling.
window.gmailOpened = [];
document.addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (a) { e.preventDefault(); gmailOpened.push(a.id); }
});
setTimeout(() => {
  document.querySelector('#m2 .a3s').insertAdjacentHTML('beforeend',
    '<img id="late-tracker" src="${P}/proxy/GGG#https://click.email.brand.com/open.aspx?ffcb10" width="1" height="1">' +
    '<img id="late-photo" src="${P}/proxy/HHH#https://example.com/photo.jpg" width="300">');
}, 300);
</script>`;

const LOADED = ['CCC', 'DDD', 'BGG', 'FFF', 'HHH', 'CSS'];
const BLOCKED = ['AAA', 'BBB', 'SSS', 'BGT', 'EEE', 'GGG', 'FRG', 'PXU', 'TBG'];
const COUNTED = 8; // all blocked except the spacer

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
let hits = [];
let linkHits = [];
const server = createHttps({ key: readFileSync(`${certDir}key.pem`), cert: readFileSync(`${certDir}cert.pem`) }, (req, res) => {
  const host = (req.headers.host || '').split(':')[0];
  if (host === 'mail.google.com') res.writeHead(200, { 'content-type': 'text/html' }).end(PAGE);
  else if (host.endsWith('.googleusercontent.com')) {
    hits.push(req.url);
    res.writeHead(200, { 'content-type': 'image/png' }).end(PNG);
  } else if (host === 'shop.example.com') {
    linkHits.push(req.url);
    res.writeHead(200, { 'content-type': 'text/html' }).end('shop');
  } else res.writeHead(404).end();
});
await new Promise((r) => server.listen(HTTPS_PORT, '127.0.0.1', r));

const proxy = createHttp((req, res) => res.writeHead(403).end());
proxy.on('connect', (req, socket) => {
  const host = req.url.split(':')[0];
  if (host !== 'mail.google.com' && host !== 'shop.example.com' && !host.endsWith('.googleusercontent.com')) {
    socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
    return;
  }
  const upstream = connect(HTTPS_PORT, '127.0.0.1', () => {
    socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});
await new Promise((r) => proxy.listen(PROXY_PORT, '127.0.0.1', r));

let browser;
let extPath = root;
if (browserName === 'chrome') {
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome',
    headless: true,
    pipe: true,
    enableExtensions: true,
    acceptInsecureCerts: true,
    args: [`--proxy-server=http://127.0.0.1:${PROXY_PORT}`, '--ignore-certificate-errors'],
  });
} else {
  execFileSync('node', [`${root}dev/build-firefox.mjs`]);
  extPath = `${root}build/firefox/`;
  browser = await puppeteer.launch({
    browser: 'firefox',
    executablePath: process.env.FIREFOX,
    headless: true,
    acceptInsecureCerts: true,
    extraPrefsFirefox: {
      'network.proxy.type': 1,
      'network.proxy.ssl': '127.0.0.1',
      'network.proxy.ssl_port': PROXY_PORT,
      'security.cert_pinning.enforcement_level': 0,
      'network.stricttransportsecurity.preloadlist': false,
    },
  });
}

let failed = false;
const check = (ok, label) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failed = true;
};
const reached = (id) => hits.some((h) => h.includes(id));

try {
  await browser.installExtension(extPath);
  await sleep(1000);
  const page = await browser.newPage();
  await page.goto('https://mail.google.com/mail/u/0/', { waitUntil: 'load' });
  await sleep(2000);

  console.log('-- blocking');
  for (const id of BLOCKED) check(!reached(id), `tracker ${id} never reached the server`);
  for (const id of LOADED) check(reached(id), `normal image ${id} loaded`);
  check(hits.every((h) => /[?&]pgb_[0-9a-f]{24}=1/.test(h.split('#')[0])), 'every request that got through carries the secret allow mark');

  console.log('-- message chips');
  const chips = await page.evaluate(() =>
    [...document.querySelectorAll('.pgb-chip')].map((c) => ({ msg: c.closest('.adn')?.id, text: c.textContent })));
  console.log('   ' + JSON.stringify(chips));
  check(chips.length === 3, 'one chip per message with trackers');
  check(/Blocked 3 trackers/.test(chips.find((c) => c.msg === 'm3')?.text || ''), 'message 3 chip counts 3 (forged mark, px units, tiny background)');
  check(/Blocked 3 trackers/.test(chips.find((c) => c.msg === 'm1')?.text || ''), 'message 1 chip counts 3 (spacer not counted)');
  check(/Blocked 2 trackers/.test(chips.find((c) => c.msg === 'm2')?.text || ''), 'message 2 chip counts 2');

  if (browserName === 'chrome') {
    console.log('-- stats');
    const sw = await (await browser.waitForTarget((t) => t.type() === 'service_worker')).worker();
    await sleep(500);
    const stored = await sw.evaluate(() => chrome.storage.local.get(['total', 'events', 'seen']));
    check(stored.total === COUNTED, `total is ${COUNTED} (got ${stored.total})`);
    check(!JSON.stringify(stored).includes('http'), 'no URLs stored, only hashes');

    await page.reload({ waitUntil: 'load' });
    await sleep(2000);
    const again = await sw.evaluate(() => chrome.storage.local.get('total'));
    check(again.total === COUNTED, 'reopening the same emails does not count them twice');
  }

  // SHOTS=/some/dir saves screenshots of the chips and the popup.
  if (process.env.SHOTS && browserName === 'chrome') {
    await page.setViewport({ width: 760, height: 330 });
    await page.screenshot({ path: `${process.env.SHOTS}/chips.png` });
    const sw = await (await browser.waitForTarget((t) => t.type() === 'service_worker')).worker();
    const id = new URL(sw.url()).host;
    const popup = await browser.newPage();
    await popup.setViewport({ width: 300, height: 420 });
    await popup.goto(`chrome-extension://${id}/src/popup.html`);
    await sleep(500);
    await popup.screenshot({ path: `${process.env.SHOTS}/popup.png` });
    await popup.close();
    await page.bringToFront();
  }

  console.log('-- clean links (Pro trial)');
  const gmailOpened = () => page.evaluate(() => window.gmailOpened.splice(0));
  await page.click('#ses-link');
  await sleep(1500);
  await page.bringToFront();
  check(linkHits.includes('/deal?id=7'), `the real address opened, without utm_ (got ${JSON.stringify(linkHits)})`);
  check((await gmailOpened()).length === 0, 'Gmail did not open the tracker');
  await page.click('#opaque-link');
  await page.click('#outside-link');
  await sleep(300);
  check(JSON.stringify(await gmailOpened()) === '["opaque-link","outside-link"]', 'links it cannot clean, or outside emails, are left to Gmail');
  for (const p of (await browser.pages()).slice(2)) if (p !== page) await p.close();

  if (browserName === 'chrome') {
    const sw = await (await browser.waitForTarget((t) => t.type() === 'service_worker')).worker();
    await sw.evaluate(() => chrome.storage.local.set({ pro: { trialStart: Date.now() - 31 * 864e5 } }));
    await sleep(300);
    linkHits = [];
    await page.click('#ses-link');
    await sleep(500);
    await page.bringToFront();
    check(JSON.stringify(await gmailOpened()) === '["ses-link"]' && linkHits.length === 0, 'after the trial, links are left to Gmail');
    await sw.evaluate(() => chrome.storage.local.set({ pro: { trialStart: Date.now() } }));
  }

  console.log('-- load images anyway');
  hits = [];
  await page.click('#m1 .pgb-load');
  await sleep(1500);
  for (const id of ['AAA', 'BBB', 'SSS', 'BGT']) check(reached(id), `message 1 image ${id} loaded on request`);
  check(!reached('EEE'), 'message 2 trackers stay blocked');
  const loadedText = await page.$eval('#m1 .pgb-chip', (c) => c.textContent);
  check(/sender can now see/.test(loadedText), 'chip explains the consequence');

  if (browserName === 'chrome') {
    console.log('-- off switch');
    const sw = await (await browser.waitForTarget((t) => t.type() === 'service_worker')).worker();
    await sw.evaluate(() => chrome.storage.local.set({ enabled: false }));
    await sleep(800);
    hits = [];
    await page.reload({ waitUntil: 'load' });
    await sleep(2000);
    for (const id of [...BLOCKED, ...LOADED]) check(reached(id), `off: ${id} loads`);
    check(hits.every((h) => !h.includes('pgb_')), 'off: page is left untouched');
    check((await page.$$('.pgb-chip')).length === 0, 'off: no chips');
  }

  console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: PASS');
} finally {
  await browser.close();
  server.close();
  proxy.close();
}
process.exit(failed ? 1 : 0);
