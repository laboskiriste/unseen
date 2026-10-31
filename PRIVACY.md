# Privacy

Unseen: Email Tracker Blocker collects nothing and sends nothing anywhere.

- It runs only on `https://mail.google.com`. It has no access to any other site.
- It looks at the image addresses inside the emails you open, to decide which ones are tracking pixels. It doesn't read, store or send the text of your emails, your contacts, or your address.
- Everything happens in your browser. The extension makes no network requests of its own.
- It keeps a local count of blocked trackers (company name and date) for the "last 7 days" view. To avoid counting the same email twice, it stores short one-way hashes of tracker addresses, never the addresses themselves. Entries older than 30 days are deleted. Removing the extension deletes everything.
