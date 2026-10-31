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
- **Monetization plan:** in `../business/ideas/monetization.md`. Decided 2026-10-31: free core forever; Pro features get a 30-day free trial, then €12 once or €6 per year, and only Pro turns off. The model is stated up front in the store description. Never move a free feature behind Pro.
