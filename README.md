# Naomi Acciaro · sito vetrina

Sito di una pagina per la Dott.ssa Naomi Acciaro, biologa nutrizionista (Roma | Online). HTML e CSS statici, senza framework; la prenotazione rimanda al profilo MioDottore.

## Idea grafica

Il ritratto sta dentro un piatto visto dall'alto: un anello a tre colori (verdure e frutta, cereali, proteine) con la proporzione del "piatto sano" (metà, un quarto, un quarto). I colori vengono dalla camicia della foto (barbabietola) e da frutta e verdura (foglia, albicocca). Le sezioni si impilano come fogli con l'angolo alto arrotondato. Caratteri: Lora (titoli) e Instrument Sans (testo), entrambi con licenza OFL, self-hosted in `public/fonts/`.

## Struttura

- `public/index.html`, `public/style.css`: tutta la pagina. L'animazione d'apertura (l'anello che si compone) si disattiva con `prefers-reduced-motion`.
- `public/img/naomi.webp`: ritratto circolare ricavato da uno screenshot (870 px). Se Naomi ha l'originale ad alta risoluzione, va sostituito: rende meglio sugli schermi grandi.
- `scripts/preview.mjs` (`npm run preview:build`): crea `.tmp/preview/sito.html`, pagina a file unico con font e immagini incorporati, per le anteprime.
- `wrangler.jsonc`: sito statico su Cloudflare (cartella `public/`, nessun comando di build).

## Pubblicazione su Cloudflare

Workers & Pages → collegare il repository → **Build command**: vuoto · **Deploy command**: `npx wrangler deploy`.

## Prima del go-live

- [ ] Dominio definitivo; poi togliere `noindex` da `index.html` e cancellare `public/robots.txt`, aggiungere `canonical`, `og:url` e `url` nel JSON-LD.
- [ ] Dati obbligatori per i siti dei professionisti, da inserire nel piede: numero e sezione di iscrizione all'albo dei biologi (ONB), partita IVA, indirizzo dello studio (c'è un commento in `index.html`).
- [ ] Far rileggere a Naomi i testi: sono bozze scritte a partire dalla sua bio Instagram (Chi sono, Di cosa mi occupo, Come si svolge una visita).
- [ ] Aggiungere il profilo Instagram e, se vuole, telefono/email e indirizzo (oggi la pagina rimanda solo a MioDottore).
- [ ] Se si aggiungono moduli, statistiche o cookie: informativa privacy e cookie.

Link di prenotazione (senza parametri di tracciamento): https://www.miodottore.it/profilo/naomi-acciaro
