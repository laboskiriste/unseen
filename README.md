# Unseen: Email Tracker Blocker

Blocks email tracking pixels in Gmail on the web, so senders can't see when you open their emails. Chrome, Edge and Firefox. Submitted to the Chrome Web Store and Firefox Add-ons in October 2026.

Part of **Tinyward**, small privacy tools with as few permissions as possible. Also from Tinyward: [Extension Guardian](https://github.com/laboskiriste/extension-guardian), which warns you when an extension you use is sold or gains new permissions.

## What it does

- Blocks known tracking pixels (332 patterns from about 195 companies) and hidden 1×1 images in emails you open.
- Shows a chip above each email that had trackers ("Blocked 3 trackers: Mailchimp, …") with a **Load images anyway** button for that one email.
- Popup: trackers blocked in the last 7 days, top tracking companies, trackers on the current page, and an on/off switch.
- Badge with the number of trackers on the current Gmail tab.

**Permissions:** `declarativeNetRequest`, `storage`, and a content script on `https://mail.google.com/*`. No host permissions, no network requests of its own. See [PRIVACY.md](PRIVACY.md) or the [hosted privacy policy](https://laboskiriste.github.io/unseen/privacy/).

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

## Not done yet

- Icons on inbox rows (before an email is opened)
- Remote tracker-list updates through the Worker (the list is bundled for now)
- Outlook.com, and link-click tracking cleanup (planned paid features)
- Firefox: check that a normal (non-temporary) install grants mail.google.com access
