# Store listing

Text for the Chrome Web Store and Firefox Add-ons listings. Version 0.1.0 was submitted on 2026-10-31. Changes below this line are for the next update of the listing.

## Name

**Unseen: Email Tracker Blocker** (short name "Unseen") (chosen 2026-10-31). It replaces the working name "Pixel Blocker", which was too close to the existing **PixelBlock** extension.

Rejected: "Mail Guardian" (collides with MailGuardian and MailGuard), "NoPeek for Email". Before submitting, check the USPTO and EUIPO databases for "Unseen" in class 9 (software).

## Short description (≤132 chars)

> Blocks hidden email tracking pixels in Gmail, so senders can't see when you open their emails. Runs only on Gmail.

## Detailed description

> Most newsletters and sales emails contain an invisible image, a "tracking pixel". When you open the email, it tells the sender that you read it, when, and how many times.
>
> Unseen blocks those pixels in Gmail on the web and leaves normal images alone.
>
> WHAT IT DOES
> • Blocks 330+ known email trackers (Mailchimp, HubSpot, SendGrid, Salesforce Marketing Cloud, Customer.io and many more) and hidden 1×1 images
> • Shows a small note above each email that had trackers, with the tracking companies' names
> • "Load images anyway" button when you want to let one email through
> • Weekly count of blocked trackers and the companies that track you most
> • One switch to turn it off
>
> PRIVACY FIRST
> • Runs only on mail.google.com and has no access to any other website
> • Never reads, stores or sends your emails, contacts or address
> • No servers, no analytics, no account. The only network request is checking an Unseen Pro license key with Polar, and only if you enter one
> • Open source (MIT): https://github.com/laboskiriste/unseen
>
> FREE AND PRO, SAID UP FRONT
> • Free forever: tracker blocking, the note above each email, "Load images anyway" and the weekly count
> • Unseen Pro: when you click a link in an email, Unseen opens the real address without the click tracker, where the address is inside the link (Amazon SES, Postmark, Kit, Substack, Mandrill, Mailchimp, HubSpot and more; pages that warn before leaving a site are never skipped), and removes tracking tags such as utm_ from that address. The tracker is never contacted. Coming later: rules per sender, full history and export.
> • Every new user gets 30 days of Pro free. After that, Pro costs $15 once, and the free features keep working.
> • Nothing that is free today will ever become paid
>
> Unseen is part of Tinyward, small privacy tools with as few permissions as possible. Also from Tinyward: Extension Guardian, which warns you when your browser extensions change owner or gain new permissions.
>
> Note: Gmail already hides your IP address from senders. Unseen stops the remaining signal: the fact that, and when, you opened the email.

## Category

Chrome Web Store: **Privacy & Security** (fallback: Productivity / Communication). Firefox: **Privacy & Security**.

## Single purpose (CWS)

> Prevent email open and click tracking in Gmail on the web.

## Permission justifications (CWS)

| Permission | Justification |
|---|---|
| `declarativeNetRequest` | Blocks Gmail's image-proxy requests for tracking pixels. Static rules only; the extension can't read request contents. |
| `storage` | Saves the on/off setting, a local count of blocked trackers, the Pro trial start date and, if entered, the Pro license key. |
| Content script on `https://mail.google.com/*` | Looks at image addresses in opened emails to tell tracking pixels from normal images, and shows the "trackers blocked" note. With Pro, opens clicked email links at their real address without the click tracker. |

The license check calls `api.polar.sh` with `fetch` from the background. Polar's customer-portal license endpoints answer `access-control-allow-origin: *` (checked 2026-11-01 with curl and with a live activation attempt from the Chrome extension), so no host permission is needed.

Remote code: **No.**

## Data usage disclosure (CWS) and data collection (AMO)

- Collected data, CWS: tick only **Authentication information**. It is the Pro license key, sent to Polar (the seller) only if the user enters one, to check the purchase. Nothing about browsing or email is collected. Every other category: none.
- Firefox: `data_collection_permissions: { required: ["none"], optional: ["authenticationInfo"] }` (set in `dev/build-firefox.mjs`). The popup asks for `authenticationInfo` when the user enters a key, and sends nothing if they say no.
- Certifications: no selling or transfer of user data, no use unrelated to the single purpose, no creditworthiness use.
- Privacy policy URL: https://laboskiriste.github.io/unseen/privacy/ (source: `docs/privacy/index.html`, same content as [PRIVACY.md](../PRIVACY.md)).

## Assets

- `screenshot-1.png`, `screenshot-2.png`: 1280×800 (`npm run store-images`)
- `promo-small.png`: 440×280
- Icon: `icons/icon128.png`
- Packages: `npm run package` → `unseen-<version>-chrome.zip` / `-firefox.zip`. The Firefox build passes `web-ext lint` with 0 errors and 0 warnings.

Homepage URL for the listing: https://laboskiriste.github.io/unseen/
