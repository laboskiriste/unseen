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
> • Makes no network requests of its own: no servers, no analytics, no account
> • Open source (MIT): https://github.com/laboskiriste/unseen
>
> FREE AND PRO, SAID UP FRONT
> • Free forever: tracker blocking, the note above each email, "Load images anyway" and the weekly count
> • Unseen Pro (coming soon): clean tracking links, rules per sender, full history and export. Every new user gets 30 days of Pro free. After that, Pro costs €12 once or €6 per year, and the free features keep working.
> • Nothing that is free today will ever become paid
>
> Unseen is part of Tinyward, small privacy tools with as few permissions as possible. Also from Tinyward: Extension Guardian, which warns you when your browser extensions change owner or gain new permissions.
>
> Note: Gmail already hides your IP address from senders. Unseen stops the remaining signal: the fact that, and when, you opened the email.

## Category

Chrome Web Store: **Privacy & Security** (fallback: Productivity / Communication). Firefox: **Privacy & Security**.

## Single purpose (CWS)

> Block email tracking pixels in Gmail on the web.

## Permission justifications (CWS)

| Permission | Justification |
|---|---|
| `declarativeNetRequest` | Blocks Gmail's image-proxy requests for tracking pixels. Static rules only; the extension can't read request contents. |
| `storage` | Saves the on/off setting and a local count of blocked trackers. |
| Content script on `https://mail.google.com/*` | Looks at image addresses in opened emails to tell tracking pixels from normal images, and shows the "trackers blocked" note. |

Remote code: **No.**

## Data usage disclosure (CWS) and data collection (AMO)

- Collected data: **none** in every category.
- Certifications: no selling or transfer of user data, no use unrelated to the single purpose, no creditworthiness use.
- Firefox `data_collection_permissions`: `required: ["none"]` (already set in `dev/build-firefox.mjs`).
- Privacy policy URL: https://laboskiriste.github.io/unseen/privacy/ (source: `docs/privacy/index.html`, same content as [PRIVACY.md](../PRIVACY.md)).

## Assets

- `screenshot-1.png`, `screenshot-2.png`: 1280×800 (`npm run store-images`)
- `promo-small.png`: 440×280
- Icon: `icons/icon128.png`
- Packages: `npm run package` → `unseen-<version>-chrome.zip` / `-firefox.zip`. The Firefox build passes `web-ext lint` with 0 errors and 0 warnings.

Homepage URL for the listing: https://laboskiriste.github.io/unseen/
