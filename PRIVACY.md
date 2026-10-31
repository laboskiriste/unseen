# Privacy

Unseen: Email Tracker Blocker collects nothing about you. It sends one thing, and only if you buy Unseen Pro: your license key, to check it.

- It runs only on `https://mail.google.com`. It has no access to any other site.
- It looks at the image addresses inside the emails you open, to decide which ones are tracking pixels. It doesn't read, store or send the text of your emails, your contacts, or your address.
- Everything else happens in your browser. Blocking trackers and cleaning tracking links make no network requests: a link's real address is read from the link itself, and the tracker is never contacted.
- With Unseen Pro, a cleaned link opens directly at its real address in a new tab. It skips the click tracker and also Gmail's own redirect page for that link. Links Unseen can't clean are left to Gmail as usual.
- It keeps a local count of blocked trackers (company name and date) for the "last 7 days" view. To avoid counting the same email twice, it stores short one-way hashes of tracker addresses, never the addresses themselves. Entries older than 30 days are deleted. Removing the extension deletes everything.
- It stores the date you first used it, for the 30-day Pro trial. Reinstalling starts the trial again.

## Unseen Pro license keys

This is the only network request Unseen makes, and it happens only after you type a license key into the popup.

- **What is sent:** the license key, the activation id that Polar returned when the key was activated, Unseen's public Polar organization id, and either the fixed label "Unseen" (when activating) or the public id of the Unseen Pro product (when checking). Nothing about your emails, your browsing, you or your device.
- **To whom:** Polar (`api.polar.sh`), the store that sells Unseen Pro. Polar sees the request's IP address, like any website you visit.
- **When:** once when you activate the key, about once a month after that to check it is still valid, when you click "Check again", and once to free the activation if you remove the key or it can't be used.
- **What is kept:** the key, the activation id and the dates of the last check, in your browser's extension storage. Polar's replies include the buyer's details; Unseen does not keep them.

When you buy Unseen Pro, you pay on Polar's checkout page. Polar is the seller and handles your email address and payment details under [its own privacy policy](https://polar.sh/legal/privacy). We see your purchase in Polar's dashboard, as any seller would. The "Get Pro" buttons are plain links: opening them sends nothing from the extension.
