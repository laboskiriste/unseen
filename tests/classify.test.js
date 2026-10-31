import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Load the content-script files the same way the browser does: as plain scripts
// sharing one global scope.
const root = new URL('..', import.meta.url).pathname;
const code = ['src/trackers-data.js', 'src/classify.js'].map((f) => readFileSync(`${root}${f}`, 'utf8')).join('\n');
const PGB = runInNewContext(`${code}\nPGB`, { URL });

const P = 'https://ci3.googleusercontent.com/meips/ADKq_Nabc';

test('recognises proxy URLs', () => {
  assert.ok(PGB.isProxyUrl(`${P}#https://x.com/a.png`));
  assert.ok(PGB.isProxyUrl('https://ci5.googleusercontent.com/proxy/xyz'));
  assert.ok(!PGB.isProxyUrl('https://lh3.googleusercontent.com/a/avatar'));
  assert.ok(!PGB.isProxyUrl('https://example.com/proxy/x'));
  assert.ok(!PGB.isProxyUrl(null));
});

test('withMark keeps the fragment and is idempotent', () => {
  assert.equal(PGB.withMark(`${P}#https://x.com/a.png`), `${P}?pgb_ok=1#https://x.com/a.png`);
  assert.equal(PGB.withMark(`${P}?sz=1#https://x.com/a.png?b=2`), `${P}?sz=1&pgb_ok=1#https://x.com/a.png?b=2`);
  assert.equal(PGB.withMark(`${P}?pgb_ok=1#x`), `${P}?pgb_ok=1#x`);
  assert.equal(PGB.withMark(P), `${P}?pgb_ok=1`);
});

test('markAllIn marks every proxy URL in a style value', () => {
  const style = `background-image: url(${P}#https://x.com/bg.jpg); color: red`;
  assert.equal(PGB.markAllIn(style), `background-image: url(${P}?pgb_ok=1#https://x.com/bg.jpg); color: red`);
});

test('names known trackers from the list', () => {
  const cases = {
    'https://us1.list-manage.com/track/open.php?u=1': /mailchimp/i,
    'https://t.yesware.com/t/abc/spacer.gif': /yesware/i,
    'https://u123.ct.sendgrid.net/wf/open?upn=xyz': /sendgrid/i,
    'https://click.email.somebrand.com/open.aspx?ffcb10-abc': /Salesforce/,
    'https://x.r.us-east-1.awstrack.me/I0/0100abc': /Amazon/,
  };
  for (const [url, name] of Object.entries(cases)) {
    assert.match(PGB.trackerName(url) || '', name, url);
  }
  assert.equal(PGB.trackerName('https://example.com/logo.png'), null);
});

test('classify: named tracker is blocked even at normal size', () => {
  const v = PGB.classify({ src: `${P}#https://us1.list-manage.com/track/open.php?u=1`, width: '600' });
  assert.equal(v.block, true);
  assert.match(v.tracker, /mailchimp/i);
});

test('classify: hidden unknown beacon is blocked and counted', () => {
  const v = PGB.classify({ src: `${P}#https://news.example.com/o/eJxabc123`, width: '1', height: '1' });
  assert.deepEqual({ ...v }, { block: true, tracker: 'Hidden pixel' });
  const hidden = PGB.classify({ src: `${P}#https://news.example.com/o?id=9`, style: 'display: none' });
  assert.equal(hidden.tracker, 'Hidden pixel');
});

test('classify: tiny static spacer is blocked but not counted', () => {
  const v = PGB.classify({ src: `${P}#https://image.email.brand.com/lib/abc/m/1/spacer.gif`, height: '1' });
  assert.deepEqual({ ...v }, { block: true, tracker: null });
});

test('classify: normal images are allowed', () => {
  for (const img of [
    { src: `${P}#https://example.com/logo.png`, width: '120', height: '40' },
    { src: `${P}#https://example.com/photo.jpg` },
    { src: P, width: '300' },
    { src: `${P}#https://example.com/a.png`, style: 'width: 100%; max-width: 600px' },
    // a divider line seen in a real Stripo newsletter
    { src: `${P}#https://x.stripocdn.email/content/guids/CABINET_1/images/line.png`, width: '600', height: '1' },
  ]) {
    assert.deepEqual({ ...PGB.classify(img) }, { block: false, tracker: null }, img.src);
  }
});
