# Privacy

Unseen: Email Tracker Blocker collects nothing about you. It sends one thing, and only if you buy Unseen Plus: your license key, to check it.

- It runs only on `https://mail.google.com`. It has no access to any other site.
- It looks at the image addresses inside the emails you open, to decide which ones are tracking pixels. It doesn't read, store or send the text of your emails, your contacts, or your address.
- Everything else happens in your browser. Blocking trackers and cleaning tracking links make no network requests: a link's real address is read from the link itself, and the tracker is never contacted.
- A cleaned link opens directly at its real address in a new tab. It skips the click tracker and also Gmail's own redirect page for that link. Only email services' click trackers are skipped; pages that warn before leaving a site, such as Google's redirect notice or LinkedIn's and Facebook's link checks, are kept. Links Unseen can't clean are left to Gmail as usual.
- It keeps a local count of blocked trackers for the "last 7 days" view: the company name and the time, for the last 30 days. To avoid counting the same email twice, it stores short one-way hashes of tracker addresses, never the addresses themselves.
- It also keeps a count per day and company, for up to about a year, for the history page of Unseen Plus. It never leaves your device. The history page has a button that deletes it, and removing the extension deletes everything.
- It stores the date you first used it, to know when to ask for a rating. Nothing is sent.

## Unseen Plus license keys

This is the only network request Unseen makes, and it happens only after you type a license key into the popup.

- **What is sent:** the license key, the activation id that Polar returned when the key was activated, Unseen's public Polar organization id, and either the fixed label "Unseen" (when activating) or the public id of the Unseen Plus product (when checking). Nothing about your emails, your browsing, you or your device.
- **To whom:** Polar (`api.polar.sh`), the store that sells Unseen Plus. Polar sees the request's IP address, like any website you visit.
- **When:** once when you activate the key, about once a month after that to check it is still valid, when you click "Check again", and once to free the activation if you remove the key or it can't be used.
- **What is kept:** the key, the activation id and the dates of the last check, in your browser's extension storage. Polar's replies include the buyer's details; Unseen does not keep them.

When you buy Unseen Plus, you pay on Polar's checkout page. Polar is the seller and handles your email address and payment details under [its own privacy policy](https://polar.sh/legal/privacy). We see your purchase in Polar's dashboard, as any seller would. The "Get Plus" buttons are plain links: opening them sends nothing from the extension.
