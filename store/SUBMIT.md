# How to submit Unseen (about 10 minutes per store)

All texts to paste are in [listing.md](listing.md). Files are in this `store/` folder.

## Firefox Add-ons (do this first; no fee)

1. Open https://addons.mozilla.org/developers/addon/submit/distribution (you're already signed in).
2. Pick **On this site**, then **Continue**.
3. **Select a file…** → `store/unseen-0.1.0-firefox.zip`. Wait for validation (0 errors expected), then **Continue**.
4. "Do you need to submit source code?" → **No**. The code isn't minified or bundled.
5. Describe the add-on:
   - **Name:** Unseen: Email Tracker Blocker
   - **Add-on URL:** `unseen-email-tracker-blocker`, or `unseen` if it's free
   - **Summary:** paste the short description
   - **Description:** paste the detailed description, without the `>` marks
   - **Categories:** Privacy & Security
   - **Support email:** leave empty. **Support website:** https://github.com/laboskiriste/unseen/issues
   - **License:** MIT License
   - **Privacy policy:** tick it and paste the text of [PRIVACY.md](../PRIVACY.md)
   - **Notes to reviewer:** "Blocks Gmail image-proxy requests with static declarativeNetRequest rules. No remote code and no network requests. Source: https://github.com/laboskiriste/unseen. To test, open any newsletter in Gmail."
6. **Submit Version.** Later, on the add-on's **Edit Product Page**, upload `screenshot-1.png` and `screenshot-2.png`, and set the homepage to https://laboskiriste.github.io/unseen/

## Chrome Web Store (same developer account as Extension Guardian, no new fee)

1. Open https://chrome.google.com/webstore/devconsole → **New item** → upload `store/unseen-0.1.0-chrome.zip`.
2. **Store listing** tab:
   - **Description:** paste the detailed description
   - **Category:** Privacy & Security. **Language:** English
   - **Store icon:** `icons/icon128.png`
   - **Screenshots:** `screenshot-1.png`, `screenshot-2.png`. **Small promo tile:** `promo-small.png`
   - **Homepage URL:** https://laboskiriste.github.io/unseen/. **Support URL:** https://github.com/laboskiriste/unseen/issues
3. **Privacy** tab:
   - **Single purpose:** "Block email tracking pixels in Gmail on the web."
   - **Permission justifications:** paste the three rows from the table in listing.md (declarativeNetRequest, storage, host permission for the content script on mail.google.com).
   - **Remote code:** No
   - **Data usage:** tick nothing, then tick all three certifications
   - **Privacy policy URL:** https://laboskiriste.github.io/unseen/privacy/
4. **Distribution** tab: Free, all regions, Public.
5. **Submit for review.** Review usually takes from a few days to two weeks.

After both are approved, add the store links to the README and the home page (`docs/index.html`).

## Updating to 0.2.0 (Pro)

Only after Polar payouts and identity verification are done, so Pro can be bought.

1. `npm run package`, then upload `store/unseen-0.2.0-chrome.zip` and `store/unseen-0.2.0-firefox.zip` as new versions of the existing items.
2. Paste the new detailed description from [listing.md](listing.md) on both stores (it says what is free and what is Pro).
3. **Chrome, Privacy tab:**
   - **Data usage:** tick **Authentication information** only, then all three certifications.
   - Update the `storage` and content-script justifications from listing.md.
4. **Firefox:** the manifest already declares `authenticationInfo` as optional.
5. **Notes to reviewer** (both stores): "Blocks Gmail image-proxy requests with static declarativeNetRequest rules. No remote code. Optional Pro: if the user enters a license key, the background sends only that key to api.polar.sh (the seller) to activate it and re-checks it about once a month. Nothing about browsing or email is sent. Source: https://github.com/laboskiriste/unseen. To test the free part, open any newsletter in Gmail; Pro starts with a 30-day trial, so no key is needed to try it."

