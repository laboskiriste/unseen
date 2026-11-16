# Unseen: Email Tracker Blocker

Unseen blocks email tracking pixels in Gmail on the web. It works in Chrome, Edge and Firefox. It is part of the Tinyward family; shared rules are in `../CLAUDE.md`.

## Commands

| Task | Command |
|---|---|
| Unit tests | `npm test` |
| End-to-end test, Chrome | `npm run test:e2e` |
| End-to-end test, Firefox | `npm run test:e2e:firefox` |
| Store packages | `npm run package` |
| Rebuild tracker list | `npm run build:trackers` |

`npm run package` writes `store/unseen-<version>-chrome.zip` and `store/unseen-<version>-firefox.zip`.

## Notes

- **Permissions:** `declarativeNetRequest`, `storage`, and a content script on `mail.google.com`. Keep them this narrow; it's the main selling point.
- **Privacy policy:** hosted on GitHub Pages from `docs/`.
- **Store submission steps:** in `store/SUBMIT.md`. The user submits by hand.
- **Monetization (decided 2026-11-15, replaces the Pro trial model):** everything that protects stays free forever: blocking, the note, link cleaning, "Load images anyway", the weekly count. There is no trial. **Unseen Plus** is optional, pay what you want from $5, once (sold through Polar), and today unlocks the history page (`src/history/`, monthly chart, top companies, CSV export). Never move a free feature behind Plus. The code and the `pro` storage key still say "pro" so keys bought earlier keep working. Details and options considered: `../business/ideas/unseen-pro-options-2026-11-15.md`; older plan: `../business/ideas/monetization.md`.
- **History data:** `background.js` keeps per-day counts per company (`daily`, about a year) in `chrome.storage.local` for everyone; only viewing and exporting needs Plus. The history page has a delete button.
