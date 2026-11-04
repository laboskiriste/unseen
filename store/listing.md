# Store listing

Text for the Chrome Web Store and Firefox Add-ons listings. Version 0.1.0 was submitted on 2026-10-31. Changes below this line are for the next update of the listing.

## Name

**Unseen: Email Tracker Blocker** (short name "Unseen") (chosen 2026-10-31). It replaces the working name "Pixel Blocker", which was too close to the existing **PixelBlock** extension.

Rejected: "Mail Guardian" (collides with MailGuardian and MailGuard), "NoPeek for Email". Before submitting, check the USPTO and EUIPO databases for "Unseen" in class 9 (software).

## Short description (≤132 chars)

> Blocks hidden email tracking pixels in Gmail, so senders can't see when you open their emails. Runs only on Gmail.

## Detailed description

No lists of company names: Chrome Web Store rejected 0.2.0 on 2026-11-02 for keyword spam ("Yellow Argon") over the list of email services in the Pro line.

> Most newsletters and sales emails contain an invisible image, a "tracking pixel". When you open the email, it tells the sender that you read it, when, and how many times.
>
> Unseen blocks those pixels in Gmail on the web and leaves normal images alone.
>
> WHAT IT DOES
> • Blocks 330+ known email trackers and hidden 1×1 images
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
> • Unseen Pro: when you click a link in an email, Unseen opens the real address without the click tracker, if the address is inside the link, and removes tracking tags such as utm_ from it. The tracker is never contacted, and pages that warn before you leave a site are never skipped. Coming later: rules per sender, full history and export.
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

- `screenshot-1.png`, `screenshot-2.png`, `screenshot-3.png` (Pro): 1280×800 (`npm run store-images`)
- `promo-small.png`: 440×280
- Icon: `icons/icon128.png`
- Packages: `npm run package` → `unseen-<version>-chrome.zip` / `-firefox.zip`. The Firefox build passes `web-ext lint` with 0 errors and 0 warnings.

Homepage URL for the listing: https://laboskiriste.github.io/unseen/

## Italian listing (0.2.2, `_locales/it`)

Name and short description come from `_locales/it/messages.json`. In the Chrome Web Store, pick **Italiano** in the Store listing tab's language menu and paste this detailed description. On AMO, add the Italian locale on the Edit Product Page. The extension's own popup is still in English.

> Molte newsletter ed email commerciali contengono un'immagine invisibile, un "tracking pixel". Quando apri l'email, dice al mittente che l'hai letta, quando e quante volte.
>
> Unseen blocca questi pixel in Gmail sul web e lascia caricare le immagini normali.
>
> COSA FA
> • Blocca più di 330 tracker noti e le immagini nascoste di 1×1 pixel
> • Mostra una piccola nota sopra ogni email tracciata, con il nome delle aziende di tracciamento
> • Pulsante "Carica comunque le immagini" per far passare una singola email
> • Conteggio settimanale dei tracker bloccati
> • Un interruttore per disattivarlo
>
> PRIVACY PRIMA DI TUTTO
> • Funziona solo su mail.google.com e non ha accesso ad altri siti
> • Non legge, non salva e non invia le tue email, i tuoi contatti o il tuo indirizzo
> • Niente server, niente statistiche, nessun account. L'unica richiesta di rete è il controllo della chiave di licenza Pro con Polar, e solo se ne inserisci una
> • Open source (MIT): https://github.com/laboskiriste/unseen
>
> GRATIS E PRO, DETTO SUBITO
> • Gratis per sempre: il blocco dei tracker, la nota sopra le email, "Carica comunque le immagini" e il conteggio settimanale
> • Unseen Pro: quando fai clic su un link in un'email, Unseen apre l'indirizzo reale senza passare dal tracker dei clic, se l'indirizzo è contenuto nel link, e rimuove i parametri di tracciamento come utm_. Il tracker non viene mai contattato.
> • Ogni nuovo utente ha 30 giorni di Pro gratis. Poi Pro costa 15 dollari una volta sola, e le funzioni gratuite continuano a funzionare.
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
> • Schaltfläche „Bilder trotzdem laden“, um eine einzelne E-Mail durchzulassen
> • Wöchentliche Zahl der blockierten Tracker
> • Ein Schalter zum Ausschalten
>
> DATENSCHUTZ ZUERST
> • Läuft nur auf mail.google.com und hat keinen Zugriff auf andere Websites
> • Liest, speichert und sendet weder deine E-Mails noch deine Kontakte oder deine Adresse
> • Keine Server, keine Statistiken, kein Konto. Die einzige Netzwerkanfrage ist die Prüfung eines Unseen-Pro-Lizenzschlüssels bei Polar, und nur, wenn du einen eingibst
> • Open Source (MIT): https://github.com/laboskiriste/unseen
>
> KOSTENLOS UND PRO, GLEICH GESAGT
> • Für immer kostenlos: das Blockieren, der Hinweis über den E-Mails, „Bilder trotzdem laden“ und die Wochenzahl
> • Unseen Pro: Wenn du auf einen Link in einer E-Mail klickst, öffnet Unseen die echte Adresse ohne den Klick-Tracker, sofern die Adresse im Link steckt, und entfernt Tracking-Parameter wie utm_. Der Tracker wird nie kontaktiert.
> • Jeder neue Nutzer bekommt 30 Tage Pro kostenlos. Danach kostet Pro einmalig 15 US-Dollar, und die kostenlosen Funktionen laufen weiter.
> • Nichts, was heute kostenlos ist, wird kostenpflichtig
>
> Hinweis: Gmail verbirgt deine IP-Adresse bereits vor Absendern. Unseen blockiert das Signal, das bleibt: dass und wann du die E-Mail geöffnet hast.
