# Unseen: Email Tracker Blocker

Blocks email tracking pixels in Gmail on the web, so senders can't see when you open their emails. Chrome, Edge and Firefox.

**Install:** [Chrome Web Store](https://chromewebstore.google.com/detail/unseen-email-tracker-bloc/fibpgcjlnnookmhclhpmhmajileledhd) (also works in Edge and Brave). Firefox Add-ons: submitted, waiting for review.

Part of **Tinyward**, small privacy tools with as few permissions as possible. Also from Tinyward: [Extension Guardian](https://github.com/laboskiriste/extension-guardian), which warns you when an extension you use is sold or gains new permissions. Its [free web checker](https://guardian.tinyward.org) shows who publishes any Chrome extension today.

## What it does

- Blocks known tracking pixels (332 patterns from about 185 companies) and hidden 1×1 images in emails you open.
- Shows a chip above each email that had trackers ("Blocked 3 trackers: Mailchimp, …") with a **Load images anyway** button for that one email.
- Popup: trackers blocked in the last 7 days, top tracking companies, trackers on the current page, and an on/off switch.
- Badge with the number of trackers on the current Gmail tab.
- **Clean tracking links:** when you click a link in an email, Unseen opens the real address without the click tracker, where the address is written inside the link ([src/links.js](src/links.js)). The tracker is never contacted; links it can't clean are left to Gmail.

### Free, with an optional Unseen Plus

Everything that protects you is free forever, and nothing expires: blocking, the note in Gmail, cleaning links, the weekly count. There is no trial.

**Unseen Plus** is for people who want to support Unseen. It adds a history page ([src/history/](src/history/)): trackers blocked per month for the last year, the companies that tracked you most, and a CSV export. The counts are kept per day in your browser only ([src/background.js](src/background.js), [src/report.js](src/report.js)) and everyone can delete them from that page. Pay what you want, from $5, once. No subscription, no account.

- License keys are sold through [Polar](https://polar.sh) and checked directly with Polar's public API ([src/license.js](src/license.js)), about once a month, with 14 days of grace when offline. License logic: [src/pro.js](src/pro.js) (the code still says "pro", so keys bought before 0.3.0 keep working).

**Permissions:** `declarativeNetRequest`, `storage`, and a content script on `https://mail.google.com/*`. No host permissions. The only network request is the Unseen Plus license check with Polar, and only after the user enters a key. See [PRIVACY.md](PRIVACY.md) or the [hosted privacy policy](https://unseen.tinyward.org/privacy/).

## How it works

1. Gmail loads every email image through its proxy (`ci*.googleusercontent.com/proxy/…` or `/meips/…`). A static DNR rule ([src/rules.json](src/rules.json)) blocks all of them when the request comes from mail.google.com.
2. [src/content.js](src/content.js) checks each image. Gmail keeps the sender's original URL after `#`, so [src/classify.js](src/classify.js) matches it against [src/trackers-data.js](src/trackers-data.js) and also looks for hidden or 1×1 images.
3. Safe images (and CSS background images) get `pgb_ok=1` added to their URL. A higher-priority DNR `allow` rule lets those through. Trackers keep their URL and stay blocked.
4. Tiny static files such as `spacer.gif` are blocked but not counted, since they're layout spacers rather than per-recipient beacons.

## Development

```bash
npm install
```

```bash
npm test
```

```bash
npm run test:e2e
```

```bash
FIREFOX=/path/to/firefox npm run test:e2e:firefox
```

- `npm run build:trackers` regenerates the tracker list from `vendor/` (parsed as text, never executed). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- `npm run build:firefox` writes a Firefox copy to `build/firefox/`.
- `npm run icons` renders the icons from the SVG in `dev/make-icons.mjs`.
- `npm run store-images` renders the store screenshots and promo tile into `store/`.
- `npm run package` runs the unit tests, then builds `store/unseen-<version>-chrome.zip` and `-firefox.zip`. The Firefox build passes `npx web-ext lint` with 0 errors and 0 warnings.
- Store listing draft: [store/listing.md](store/listing.md).

The end-to-end test runs a fake Gmail on a local HTTPS server that the browser reaches through a local proxy, and checks what the "sender" actually receives. It covers blocking, normal and background images loading, chips and counts, no double counting on reload, "Load images anyway", and the off switch. Status on 2026-10-31: **all checks pass on Chrome 155 and Firefox 159**, and the 8 unit tests pass.

## Real Gmail check

Checked by hand on real newsletters and notification emails in Gmail (October 2026): trackers from Salesforce Marketing Cloud, Customer.io, SendGrid and several unnamed hidden pixels were blocked, while 0 normal images broke. Inline attachments aren't proxied by Gmail, so they're left untouched.

## Try it in Gmail

1. Open `chrome://extensions`, turn on **Developer mode** and click **Load unpacked**. Pick this folder.
2. Pin the icon: click the puzzle piece in the toolbar, then the pin next to "Unseen: Email Tracker Blocker".
3. Reload Gmail and open a few newsletters.

## Roadmap

Free forever: blocking pixels, the note above each email, cleaning links, "Load images anyway", and the weekly count. Nothing that is free today will ever become paid.

**Unseen Plus** (pay what you want, from $5, once), in this order:

1. Tracker history and CSV export. Done in 0.3.0.
2. Rules per sender: always allow images from your bank, always block one newsletter.
3. Outlook.com, once Unseen has enough users to justify it.

Everything that protects you stays free; Plus is for what is nice to have.

Also planned:
- Icons on inbox rows, before an email is opened.
- Tracker-list updates without a new version of the extension.
- A check that a normal Firefox install (not a temporary one) grants mail.google.com access.
