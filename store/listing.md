# Store listing

Text for the Chrome Web Store and Firefox Add-ons listings. Version 0.1.0 was submitted on 2026-10-31. Changes below this line are for the next update of the listing.

## Name

**Unseen: Email Tracker Blocker** (short name "Unseen") (chosen 2026-10-31). It replaces the working name "Pixel Blocker", which was too close to the existing **PixelBlock** extension.

Rejected: "Mail Guardian" (collides with MailGuardian and MailGuard), "NoPeek for Email". Before submitting, check the USPTO and EUIPO databases for "Unseen" in class 9 (software).

## Short description (≤132 chars)

> Blocks hidden email tracking pixels in Gmail, so senders can't see when you open their emails. Runs only on Gmail.

## Detailed description

No lists of company names: Chrome Web Store rejected 0.2.0 on 2026-11-02 for keyword spam ("Yellow Argon") over the list of email services in the Pro line. Keep the Plus text free of company names too.

> Most newsletters and sales emails contain an invisible image, a "tracking pixel". When you open the email, it tells the sender that you read it, when, and how many times.
>
> Unseen blocks those pixels in Gmail on the web and leaves normal images alone.
>
> WHAT IT DOES
> • Blocks 330+ known email trackers and hidden 1×1 images
> • Shows a small note above each email that had trackers, with the tracking companies' names
> • Opens links in emails at their real address, without the click tracker, when the address is inside the link
> • "Load images anyway" button when you want to let one email through
> • Weekly count of blocked trackers and the companies that track you most
> • One switch to turn it off
>
> PRIVACY FIRST
> • Runs only on mail.google.com and has no access to any other website
> • Never reads, stores or sends your emails, contacts or address
> • No servers, no analytics, no account. The only network request is checking an Unseen Plus license key with Polar, and only if you enter one
> • Open source (MIT): https://github.com/laboskiriste/unseen
>
> FREE, WITH AN OPTIONAL PLUS
> • Everything that protects you is free, forever: blocking trackers, the note above each email, cleaning links, "Load images anyway" and the weekly count. Nothing expires.
> • Unseen Plus is for people who want to support Unseen. It adds your tracker history: trackers blocked per month, the companies that tracked you most, and an export as a spreadsheet. It all stays on your device.
> • Pay what you want, from $5, once. No subscription.
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
| `storage` | Saves the on/off setting, a local count of blocked trackers (per day, kept up to a year, for the history page), the date of first use and, if entered, the Plus license key. |
| Content script on `https://mail.google.com/*` | Looks at image addresses in opened emails to tell tracking pixels from normal images, and shows the "trackers blocked" note, and opens clicked email links at their real address without the click tracker. |

The license check calls `api.polar.sh` with `fetch` from the background. Polar's customer-portal license endpoints answer `access-control-allow-origin: *` (checked 2026-11-01 with curl and with a live activation attempt from the Chrome extension), so no host permission is needed.

Remote code: **No.**

## Data usage disclosure (CWS) and data collection (AMO)

- Collected data, CWS: tick only **Authentication information**. It is the Plus license key, sent to Polar (the seller) only if the user enters one, to check the purchase. Nothing about browsing or email is collected. Every other category: none.
- Firefox: `data_collection_permissions: { required: ["none"], optional: ["authenticationInfo"] }` (set in `dev/build-firefox.mjs`). The popup asks for `authenticationInfo` when the user enters a key, and sends nothing if they say no.
- Certifications: no selling or transfer of user data, no use unrelated to the single purpose, no creditworthiness use.
- Privacy policy URL: https://unseen.tinyward.org/privacy/ (source: `docs/privacy/index.html`, same content as [PRIVACY.md](../PRIVACY.md)).

## Assets

- `screenshot-1.png`, `screenshot-2.png`, `screenshot-3.png` (3: clean links, free): 1280×800 (`npm run store-images`)
- `promo-small.png`: 440×280
- Icon: `icons/icon128.png`
- Packages: `npm run package` → `unseen-<version>-chrome.zip` / `-firefox.zip`. The Firefox build passes `web-ext lint` with 0 errors and 0 warnings.

Homepage URL for the listing: https://unseen.tinyward.org/

## Italian listing (0.2.2, `_locales/it`)

Name and short description come from `_locales/it/messages.json`. In the Chrome Web Store, pick **Italiano** in the Store listing tab's language menu and paste this detailed description. On AMO, add the Italian locale on the Edit Product Page. The extension's own popup is still in English.

> Molte newsletter ed email commerciali contengono un'immagine invisibile, un "tracking pixel". Quando apri l'email, dice al mittente che l'hai letta, quando e quante volte.
>
> Unseen blocca questi pixel in Gmail sul web e lascia caricare le immagini normali.
>
> COSA FA
> • Blocca più di 330 tracker noti e le immagini nascoste di 1×1 pixel
> • Mostra una piccola nota sopra ogni email tracciata, con il nome delle aziende di tracciamento
> • Apre i link delle email direttamente all'indirizzo reale, senza il tracker dei clic, quando l'indirizzo è contenuto nel link
> • Pulsante "Carica comunque le immagini" per far passare una singola email
> • Conteggio settimanale dei tracker bloccati
> • Un interruttore per disattivarlo
>
> PRIVACY PRIMA DI TUTTO
> • Funziona solo su mail.google.com e non ha accesso ad altri siti
> • Non legge, non salva e non invia le tue email, i tuoi contatti o il tuo indirizzo
> • Niente server, niente statistiche, nessun account. L'unica richiesta di rete è il controllo della chiave di licenza Plus con Polar, e solo se ne inserisci una
> • Open source (MIT): https://github.com/laboskiriste/unseen
>
> GRATIS, CON UN PLUS FACOLTATIVO
> • Tutto ciò che ti protegge è gratis per sempre: il blocco dei tracker, la nota sopra le email, la pulizia dei link, "Carica comunque le immagini" e il conteggio settimanale. Niente scade.
> • Unseen Plus è per chi vuole sostenere Unseen. Aggiunge la cronologia dei tracker: i tracker bloccati ogni mese, le aziende che ti hanno tracciato di più e l'esportazione in un foglio di calcolo. Tutto resta sul tuo dispositivo.
> • Paghi quanto vuoi, da 5 dollari, una volta sola. Nessun abbonamento.
> • Niente di ciò che oggi è gratis diventerà a pagamento
>
> Dal 29 ottobre 2026, secondo le linee guida del Garante privacy, chi invia email in Italia deve di regola chiedere il consenso prima di usare i tracking pixel. Unseen ti permette di bloccarli comunque.
>
> Nota: Gmail nasconde già il tuo indirizzo IP ai mittenti. Unseen blocca il segnale che resta: il fatto che hai aperto l'email, e quando.

## German listing (0.2.2, `_locales/de`)

> Viele Newsletter und Werbe-E-Mails enthalten ein unsichtbares Bild, ein „Tracking-Pixel“. Wenn du die E-Mail öffnest, erfährt der Absender, dass du sie gelesen hast, wann und wie oft.
>
> Unseen blockiert diese Pixel in Gmail im Browser und lässt normale Bilder laden.
>
> WAS ES MACHT
> • Blockiert über 330 bekannte Tracker und versteckte 1×1-Bilder
> • Zeigt über jeder getrackten E-Mail einen kleinen Hinweis mit den Namen der Tracking-Firmen
> • Öffnet Links in E-Mails direkt unter ihrer echten Adresse, ohne den Klick-Tracker, sofern die Adresse im Link steckt
> • Schaltfläche „Bilder trotzdem laden“, um eine einzelne E-Mail durchzulassen
> • Wöchentliche Zahl der blockierten Tracker
> • Ein Schalter zum Ausschalten
>
> DATENSCHUTZ ZUERST
> • Läuft nur auf mail.google.com und hat keinen Zugriff auf andere Websites
> • Liest, speichert und sendet weder deine E-Mails noch deine Kontakte oder deine Adresse
> • Keine Server, keine Statistiken, kein Konto. Die einzige Netzwerkanfrage ist die Prüfung eines Unseen-Plus-Lizenzschlüssels bei Polar, und nur, wenn du einen eingibst
> • Open Source (MIT): https://github.com/laboskiriste/unseen
>
> KOSTENLOS, MIT OPTIONALEM PLUS
> • Alles, was dich schützt, ist für immer kostenlos: das Blockieren der Tracker, der Hinweis über den E-Mails, das Bereinigen von Links, „Bilder trotzdem laden“ und die Wochenzahl. Nichts läuft ab.
> • Unseen Plus ist für alle, die Unseen unterstützen möchten. Es fügt deinen Tracker-Verlauf hinzu: pro Monat blockierte Tracker, die Firmen, die dich am meisten getrackt haben, und den Export als Tabelle. Alles bleibt auf deinem Gerät.
> • Zahle, was du willst, ab 5 US-Dollar, einmalig. Kein Abo.
> • Nichts, was heute kostenlos ist, wird kostenpflichtig
>
> Hinweis: Gmail verbirgt deine IP-Adresse bereits vor Absendern. Unseen blockiert das Signal, das bleibt: dass und wann du die E-Mail geöffnet hast.

## More languages (0.2.3)

Name and short description only, from `_locales/{es,fr,pt_BR,pl,nl,tr,ja}`. If the Chrome Web Store asks for a detailed description in one of these languages, paste the English one; search matches the name and short description.
