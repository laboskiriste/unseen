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
> • Unseen Pro: when you click a link in an email, Unseen opens the real address without the click tracker, where the address is inside the link (Google, Amazon SES, Postmark, Kit, Substack, Mandrill, Facebook, LinkedIn and more), and removes tracking tags such as utm_ from the address. The tracker is never contacted. Coming later: rules per sender, full history and export.
> • Every new user gets 30 days of Pro free. After that, Pro costs $15 once or $8 per year, and the free features keep working.
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
| `storage` | Saves the on/off setting, a local count of blocked trackers, the Pro trial start date and, if entered, the Pro license key. |
| Content script on `https://mail.google.com/*` | Looks at image addresses in opened emails to tell tracking pixels from normal images, and shows the "trackers blocked" note. With Pro, opens clicked email links at their real address without the click tracker. |

The license check calls `api.polar.sh` with `fetch`. Polar allows any origin (CORS), so no host permission is needed.

Remote code: **No.**

## Data usage disclosure (CWS) and data collection (AMO)

- Collected data: **none** in every category. ⚠️ To decide before submitting the Pro version: the Pro license key is sent to Polar (only if the user enters one). It is not personal data about the user's browsing, but a reviewer may see it as "authentication information". The safe choice is to declare it in that category on both stores (CWS: "Authentication information"; Firefox: add `authenticationInfo` to `data_collection_permissions.optional`) and explain it is only the license key, sent to the seller to check the purchase.
- Certifications: no selling or transfer of user data, no use unrelated to the single purpose, no creditworthiness use.
- Firefox `data_collection_permissions`: `required: ["none"]` (already set in `dev/build-firefox.mjs`).
- Privacy policy URL: https://laboskiriste.github.io/unseen/privacy/ (source: `docs/privacy/index.html`, same content as [PRIVACY.md](../PRIVACY.md)).

## Assets

- `screenshot-1.png`, `screenshot-2.png`: 1280×800 (`npm run store-images`)
- `promo-small.png`: 440×280
- Icon: `icons/icon128.png`
- Packages: `npm run package` → `unseen-<version>-chrome.zip` / `-firefox.zip`. The Firefox build passes `web-ext lint` with 0 errors and 0 warnings.

Homepage URL for the listing: https://laboskiriste.github.io/unseen/
