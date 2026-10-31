// Clean links: the real address is read from the tracking link itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const code = readFileSync(new URL('../src/links.js', import.meta.url), 'utf8');
const LINKS = runInNewContext(`${code}\nLINKS`, { URL, atob, TextDecoder, Uint8Array });
const b64url = (s) => Buffer.from(s).toString('base64url');
const clean = (href) => LINKS.clean(href).url;

const CASES = [
  ['Google', 'https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fa&sa=D&source=gmail&ust=1&usg=AOv', 'https://example.com/a'],
  ['Google, url=', 'https://www.google.co.uk/url?url=https://example.com/b', 'https://example.com/b'],
  ['Amazon SES', 'https://abc123.r.us-east-1.awstrack.me/L0/https:%2F%2Fexample.com%2Fpricing%3Fplan%3Dpro/1/0100019abc-1-000000/Xyz=123', 'https://example.com/pricing?plan=pro'],
  ['Amazon SES, own domain', 'https://click.redditmail.com/CL0/https:%2F%2Fwww.reddit.com%2Fr%2Fx%2F/1/0100019a2b-c3-000000/abc=', 'https://www.reddit.com/r/x/'],
  ['Postmark https', 'https://click.pstmrk.it/3s/example.com%2Fwelcome%3Fref%3Demail/AbCd/EfGh/IjKl', 'https://example.com/welcome?ref=email'],
  ['Postmark http', 'https://click.pstmrk.it/2/example.com%2Fold/AbCd/EfGh', 'http://example.com/old'],
  ['Kit', `https://click.convertkit-mail4.com/13vyokfqpr2/ml70lp19elw6/${Buffer.from('https://example.com/guide').toString('base64')}`, 'https://example.com/guide'],
  ['Substack', `https://substack.com/redirect/2/${b64url(JSON.stringify({ e: 'https://example.com/article', u: 987654 }))}.sig123`, 'https://example.com/article'],
  ['Mandrill', `https://mandrillapp.com/track/click/30972310/www.example.se?p=${b64url(JSON.stringify({ s: 'x', v: 1, p: JSON.stringify({ u: 1, url: 'https://www.example.se/sale', id: 'abc' }) }))}`, 'https://www.example.se/sale'],
  ['Mailchimp mctx', 'https://us12.mailchimp.com/mctx/clicks?url=https%3A%2F%2Fexample.com%2Fx&h=abc', 'https://example.com/x'],
  ['Yesware', `https://t.yesware.com/tt/${'a'.repeat(40)}/${'b'.repeat(32)}/${'c'.repeat(32)}/example.com/page`, 'https://example.com/page'],
  ['HubSpot Sales', 'https://t.sidekickopen06.com/s2t/c/5/f18dQhb0?t=https%3A%2F%2Fexample.com%2F&si=1', 'https://example.com/'],
  ['GovDelivery', 'https://links.govdelivery.com/track?type=click&enid=ZWFz&&&100&&&https://www.example.gov/news', 'https://www.example.gov/news'],
  ['Facebook', 'https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2F&h=AT0x', 'https://example.com/'],
  ['Instagram', 'https://l.instagram.com/?u=https%3A%2F%2Fexample.com%2Fig&e=AT1', 'https://example.com/ig'],
  ['LinkedIn', 'https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fexample.com&urlhash=Ab1c', 'https://example.com/'],
  ['YouTube', 'https://www.youtube.com/redirect?q=https%3A%2F%2Fexample.com%2Fyt&event=video_description', 'https://example.com/yt'],
  ['Slack', 'https://slack-redir.net/link?url=https%3A%2F%2Fexample.com%2Fs', 'https://example.com/s'],
  ['Medium', 'https://medium.com/m/global-identity-2?redirectUrl=https%3A%2F%2Fblog.example.com%2Fp', 'https://blog.example.com/p'],
  ['Steam', 'https://steamcommunity.com/linkfilter/?u=https%3A%2F%2Fexample.com%2Fst', 'https://example.com/st'],
  ['Reddit', 'https://out.reddit.com/t3_abc?url=https%3A%2F%2Fexample.com%2Fr&token=x', 'https://example.com/r'],
  ['Tumblr', 'https://t.umblr.com/redirect?z=https%3A%2F%2Fexample.com%2Ft&t=abc', 'https://example.com/t'],
  ['VK', 'https://vk.com/away.php?to=https%3A%2F%2Fexample.com%2Fvk&cc_key=', 'https://example.com/vk'],
  ['Disqus', 'https://disq.us/url?url=https%3A%2F%2Fexample.com%2F%3AAbCdEfGhIjKlMnOpQrStUvWxYz0&cuid=1', 'https://example.com/'],
  ['X', 'https://t.co/redirect?url=https%3A%2F%2Fexample.com%2Fx', 'https://example.com/x'],
  ['Pinterest', 'https://www.pinterest.com/offsite/?url=https%3A%2F%2Fexample.com%2Fpin&token=1', 'https://example.com/pin'],
];

for (const [name, href, expected] of CASES) {
  test(`unwraps ${name}`, () => assert.equal(clean(href), expected));
}

test('nested wrappers and tracking parameters are all removed', () => {
  const inner = 'https://shop.example.com/sale?id=7&utm_source=news&utm_medium=email&mc_eid=abc123#top';
  const ses = `https://x.r.eu-west-1.awstrack.me/L0/${encodeURIComponent(inner)}/1/01-000000/s=`;
  const google = `https://www.google.com/url?q=${encodeURIComponent(ses)}&sa=D`;
  const res = LINKS.clean(google);
  assert.equal(res.url, 'https://shop.example.com/sale?id=7#top');
  assert.deepEqual([...res.via], ['Google', 'Amazon SES']);
});

test('strip keeps everything else byte for byte', () => {
  assert.equal(LINKS.strip('https://a.com/p?q=a+b%20c&utm_campaign=x&fbclid=1'), 'https://a.com/p?q=a+b%20c');
  assert.equal(LINKS.strip('https://a.com/p?utm_source=x'), 'https://a.com/p');
  assert.equal(LINKS.strip('https://a.com/p?ref=x&source=y&s=1'), 'https://a.com/p?ref=x&source=y&s=1', 'broad names stay');
  assert.equal(LINKS.strip('https://a.com/p?x=%E0%A4%A&_hsenc=1'), 'https://a.com/p?x=%E0%A4%A');
  assert.equal(LINKS.strip('https://a.com/#/route?utm_source=x'), 'https://a.com/#/route?utm_source=x', "a router's hash stays");
});

test('tracking parameters are only removed after unwrapping a tracker', () => {
  const plain = 'https://click.mailer.example/x?utm_source=news&sig=abc';
  assert.equal(clean(plain), plain);
  assert.equal(clean(`https://www.google.com/url?q=${encodeURIComponent(plain)}`), 'https://click.mailer.example/x?sig=abc');
});

test('links that cannot be cleaned are left exactly as they are', () => {
  for (const href of [
    'https://us1.list-manage.com/track/click?u=abc&id=def&e=123',
    'https://u123.ct.sendgrid.net/ls/click?upn=u001.abcdef',
    'https://t.co/AbCdEf',
    'https://example.com/plain?page=2',
    'mailto:someone@example.com',
    '#section',
    '/relative/path',
  ]) {
    assert.equal(clean(href), href);
  }
});

test('security gateways are not unwrapped', () => {
  for (const href of [
    'https://eur01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fexample.com%2F&data=05',
    'https://urldefense.proofpoint.com/v2/url?u=https-3A__example.com_a&d=DwMF',
    'https://linkprotect.cudasvc.com/url?a=https%3A%2F%2Fexample.com',
  ]) {
    assert.equal(clean(href), href);
  }
});

test('only http and https destinations are ever opened', () => {
  for (const href of [
    'https://www.google.com/url?q=javascript%3Aalert(1)',
    'https://www.google.com/url?q=data%3Atext%2Fhtml%2C%3Cb%3E',
    'https://l.facebook.com/l.php?u=file%3A%2F%2F%2Fetc%2Fpasswd',
    'https://www.google.com/url?q=not%20a%20url',
    `https://substack.com/redirect/2/${b64url('{"e":"chrome://settings"}')}.s`,
    'https://mandrillapp.com/track/click/1/x?p=%%%broken',
  ]) {
    assert.equal(clean(href), href, href);
  }
});

test('lookalike hosts are not trusted', () => {
  for (const href of [
    'https://www.google.com.evil.example/url?q=https%3A%2F%2Fexample.com',
    'https://l.facebook.com.evil.example/l.php?u=https%3A%2F%2Fexample.com',
    'https://evilsubstack.com/redirect/2/eyJlIjoiaHR0cHM6Ly9leGFtcGxlLmNvbSJ9.s',
    'https://bank.example.com/CL0/https:%2F%2Fevil.example%2F/1/abc-000000/x',
  ]) {
    assert.equal(clean(href), href, href);
  }
});
