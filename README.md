# Naomi Acciaro · sito vetrina

Sito di una pagina per la Dott.ssa Naomi Acciaro, biologa nutrizionista (Roma | Online). HTML e CSS statici, senza framework; la prenotazione rimanda al profilo MioDottore.

## Idea grafica

Il ritratto sta dentro un piatto visto dall'alto: un anello a tre segmenti con la proporzione del "piatto sano" (metà, un quarto, un quarto). Palette "dispensa fresca": verde spinacio `#0d3b2e` (testi e fogli scuri), lime `#d5f36b`, mandarino `#ff8a3d`, pesca `#ffe1cc`, salvia `#dfeadb` / `#9fcca5` su bianco latte `#fbf8f1`. Tutte le coppie testo/sfondo superano il rapporto di contrasto 4,5:1 (il testo spinacio sul mandarino è a 5,3:1).

Giochi di design (solo CSS, nessun JavaScript): intestazione a pillola flottante, badge che ruota con il testo su un cerchio, adesivo inclinato, fascia scorrevole inclinata, griglia "bento" con le tessere che si inclinano al passaggio del mouse, schede che si impilano allo scorrimento (`position: sticky`), sezioni a fogli con l'angolo alto arrotondato, nome gigante nel piede. Le animazioni si disattivano con `prefers-reduced-motion`.

Caratteri: Outfit (titoli e testo) e Lora corsivo (accenti), entrambi con licenza OFL, self-hosted in `public/fonts/`.

## Struttura

- `public/index.html`, `public/style.css`: tutta la pagina. Nessuna dipendenza esterna.
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
- [ ] Valutazione e numero di recensioni (oggi "5,0 · 160", scritti a mano in `index.html`, due punti: apertura e sezione Prenota) sono quelli del profilo MioDottore: aggiornarli ogni tanto. Si mostra solo il dato aggregato, non i testi dei pazienti; farlo approvare a Naomi (regole sulla pubblicità sanitaria e termini di MioDottore).
- [ ] Se si aggiungono moduli, statistiche o cookie: informativa privacy e cookie.

Link di prenotazione (senza parametri di tracciamento): https://www.miodottore.it/profilo/naomi-acciaro
