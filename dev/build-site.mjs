// Builds the generated parts of the site in docs/ from the extension's own
// tracker list, so the site never claims more than the extension does:
//   docs/assets/      copies of the tracker list and classifier for the email checker
//   docs/trackers/    every tracking company Unseen recognizes
//   docs/block/<x>/   a guide per well-known tracking tool
// Run after `npm run build:trackers`: `npm run build:site`.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const SITE = 'https://unseen.tinyward.org';
const CHROME = 'https://chromewebstore.google.com/detail/unseen-email-tracker-bloc/fibpgcjlnnookmhclhpmhmajileledhd';
const FIREFOX = 'https://addons.mozilla.org/firefox/addon/unseen-email-tracker-blocker/';
const CHECKED = 'November 14, 2026';

const source = readFileSync(new URL('src/trackers-data.js', ROOT), 'utf8');
const context = {};
vm.runInNewContext(`${source}\nthis.TRACKER_LIST = TRACKER_LIST;`, context);
const LIST = context.TRACKER_LIST;

// Patterns per company, case-insensitively merged ("MailChimp" and "Mailchimp").
const companies = new Map();
for (const { name } of LIST) {
  const key = name.toLowerCase();
  const entry = companies.get(key) ?? { name, patterns: 0 };
  entry.patterns += 1;
  companies.set(key, entry);
}
const patternsFor = (...names) => names.reduce((n, name) => n + (companies.get(name.toLowerCase())?.patterns ?? 0), 0);

// Tools people search for by name. `names` must match the tracker list; the
// build fails if one stops matching, so a page never promises a block that
// the extension no longer does.
const TOOLS = [
  {
    slug: 'mailtrack', title: 'Mailtrack', names: ['Mailtrack', 'MailTrack.io'],
    who: 'Mailtrack is a Gmail extension that senders install to get read receipts. When you open their email, Mailtrack tells them, usually with a second check mark next to the sent message.',
    sees: 'whether you opened the email, when, and how many times',
  },
  {
    slug: 'hubspot', title: 'HubSpot email tracking', names: ['HubSpot', 'HubSpot Sales'],
    who: 'HubSpot is a sales and marketing platform. Its sales tools track emails that salespeople send from Gmail or Outlook, and its marketing emails track every newsletter it sends.',
    sees: 'when you open the email, often with a live notification to the salesperson, and which links you click',
  },
  {
    slug: 'mailchimp', title: 'Mailchimp open tracking', names: ['Mailchimp'],
    who: 'Mailchimp is one of the most used newsletter services. Open tracking is on by default, so most Mailchimp newsletters you receive carry a tracking pixel.',
    sees: 'which subscribers opened each newsletter and when, used for open rates and to sort readers into groups',
  },
  {
    slug: 'streak', title: 'Streak email tracking', names: ['Streak'],
    who: 'Streak is a CRM that runs inside Gmail. Senders who use it can turn on tracking for the emails they send.',
    sees: 'when and how often you viewed the email',
  },
  {
    slug: 'yesware', title: 'Yesware', names: ['Yesware'],
    who: 'Yesware is a sales tool for Gmail and Outlook. Salespeople use it to see who opens their emails and when to follow up.',
    sees: 'when you open the email and how many times',
  },
  {
    slug: 'mixmax', title: 'Mixmax', names: ['Mixmax'],
    who: 'Mixmax is a sales email tool for Gmail. It tracks opens of the emails and sequences that salespeople send.',
    sees: 'when you open the email, with a notification to the sender',
  },
  {
    slug: 'sendgrid', title: 'SendGrid open tracking', names: ['SendGrid'],
    who: 'SendGrid sends email for many apps and online shops, from receipts to newsletters. Senders can turn on open tracking, which adds a pixel to each message.',
    sees: 'whether and when you opened the message',
  },
];

for (const tool of TOOLS) {
  tool.patterns = patternsFor(...tool.names);
  if (!tool.patterns) throw new Error(`${tool.title}: no pattern in the tracker list matches ${tool.names.join(', ')}`);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page({ path, title, description, body, depth }) {
  const up = '../'.repeat(depth);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${SITE}/${path}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${SITE}/${path}">
  <meta property="og:image" content="${SITE}/icon.png">
  <link rel="icon" href="${up}icon.png">
  <link rel="stylesheet" href="${up}style.css">
</head>
<body>
<main>
  <header><img src="${up}icon.png" alt=""><a href="${up}">Unseen</a></header>
${body}
  <footer>Unseen is part of Tinyward, small privacy tools with as few permissions as possible. Also from Tinyward: <a href="https://guardian.tinyward.org">Extension Guardian</a>, a free checker that shows who owns a Chrome extension. <a href="${up}">Unseen home</a> · <a href="${up}privacy/">Privacy policy</a> · <a href="https://github.com/laboskiriste/unseen">Source code</a></footer>
</main>
</body>
</html>
`;
}

function write(path, html) {
  const dir = new URL(`docs/${path}`, ROOT);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), html);
}

// 1. The email checker runs the extension's own classifier.
mkdirSync(new URL('docs/assets/', ROOT), { recursive: true });
copyFileSync(new URL('src/trackers-data.js', ROOT), new URL('docs/assets/trackers-data.js', ROOT));
copyFileSync(new URL('src/classify.js', ROOT), new URL('docs/assets/classify.js', ROOT));

// 2. One guide per tool.
const install = `<p><a class="button" href="${CHROME}">Add Unseen to Chrome, free</a> <a href="${FIREFOX}">Also for Firefox</a></p>`;
for (const tool of TOOLS) {
  const others = TOOLS.filter((t) => t !== tool).map((t) => `<a href="../${t.slug}/">${esc(t.title)}</a>`).join(' · ');
  write(`block/${tool.slug}/`, page({
    path: `block/${tool.slug}/`,
    depth: 2,
    title: `How to block ${tool.title} in Gmail`,
    description: `${tool.title} tells senders when you open their email. How it works, how to check if an email has it, and how to block it in Gmail for free.`,
    body: `  <h1>How to block ${esc(tool.title)} in Gmail</h1>
  <p class="muted">Checked ${CHECKED}. Written by the developer of Unseen, a free tracker blocker for Gmail.</p>
  <p>${esc(tool.who)}</p>

  <h2>What the sender sees</h2>
  <p>Through a tracking pixel, a tiny invisible image unique to you, the sender learns ${esc(tool.sees)}. Gmail loads images through its own proxy, which hides your IP address, but the open is still recorded. <a href="../../can-senders-see-when-you-open-email/">More on what Gmail does and doesn't hide</a>.</p>

  <h2>Check whether an email has it</h2>
  <p>In Gmail, open the email, click ⋮ and then <strong>Show original</strong>, copy the whole text and paste it into the <a href="../../check-email/">email tracker checker</a>. It lists every tracking pixel it finds and runs entirely in your browser.</p>

  <h2>Block it</h2>
  <h3>With Unseen (free)</h3>
  <p>Unseen recognizes ${tool.patterns} ${tool.title.split(' ')[0]} tracking ${tool.patterns === 1 ? 'pattern' : 'patterns'}, among ${LIST.length} patterns from ${companies.size} companies, and also blocks hidden 1×1 images. It blocks only the tracker, so the rest of the email looks normal, and shows a note naming who tried to track you. It can only see Gmail, and it's open source.</p>
  ${install}
  <h3>Without an extension</h3>
  <p>In Gmail's settings, set <strong>Images</strong> to <strong>Ask before displaying external images</strong>. That stops every tracking pixel, but also hides every normal picture until you click. <a href="../../block-email-tracking-gmail/">Step-by-step guide</a>.</p>

  <h2>Will the sender know I blocked it?</h2>
  <p>No. They see the same thing as when someone reads email with images off: no open is recorded.</p>

  <p>Other tools: ${others} · <a href="../../trackers/">All ${companies.size} companies Unseen recognizes</a></p>`,
  }));
}

// 3. The directory of every company.
const sorted = [...companies.values()].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
const guides = Object.fromEntries(TOOLS.flatMap((t) => t.names.map((n) => [n.toLowerCase(), t.slug])));
const rows = sorted.map((c) => {
  const slug = guides[c.name.toLowerCase()];
  const label = slug ? `<a href="../block/${slug}/">${esc(c.name)}</a>` : esc(c.name);
  return `      <tr><td>${label}</td><td>${c.patterns}</td></tr>`;
}).join('\n');
write('trackers/', page({
  path: 'trackers/',
  depth: 1,
  title: `${companies.size} email tracking companies Unseen blocks in Gmail`,
  description: `Every email tracking company Unseen recognizes in Gmail, from Mailchimp and HubSpot to Mailtrack and Yesware: ${companies.size} companies, ${LIST.length} patterns, from open-source lists.`,
  body: `  <h1>Email trackers Unseen blocks</h1>
  <p class="muted">Updated ${CHECKED}: ${companies.size} companies, ${LIST.length} patterns.</p>
  <p>Unseen checks the address of every image in the emails you open in Gmail against these patterns. They come from the open-source Simplify and Trocker blocklists. Unseen also blocks hidden and 1×1 images from companies that aren't on the list, so the list is a floor, not a ceiling.</p>
  <p>Want to know which trackers are in a particular email? Use the <a href="../check-email/">email tracker checker</a>.</p>
  ${install}
  <div class="table">
  <table>
    <thead><tr><th>Company</th><th>Patterns</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
  </div>
  <p>Missing a tracker? <a href="https://github.com/laboskiriste/unseen/issues">Tell us on GitHub</a>.</p>`,
}));

console.log(`docs: ${TOOLS.length} guides, ${companies.size} companies, ${LIST.length} patterns`);
