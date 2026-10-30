# Naomi Acciaro · sito vetrina

Sito di una pagina per la Dott.ssa Naomi Acciaro, biologa nutrizionista (Roma | Online). HTML e CSS statici, senza framework; la prenotazione rimanda al profilo MioDottore.

## Idea grafica

Una vetrina in "luce da finestra": spigoli netti (nessun angolo arrotondato, `border-radius: 0` ovunque) e nessun nero pieno. Il colore è tutto nei neutri caldi (pietra, sabbia, tortora); la profondità la fanno solo le ombre.

Palette: muro `#e9e5de`, carta `#f1eee8`, card `#f8f6f2`, sabbia `#ddd7cc`, testo bruno caldo `#3b3631` / `#4c453f`, testo secondario `#62594f`, azione e pannello di prenotazione tortora `#665b50` (sfumato fino a `#54493f`). Contrasti calcolati: testo su tutti gli sfondi chiari ≥ 4,8:1 (il testo principale ≥ 8:1), testo chiaro sul tortora ≥ 4,7:1.

Giochi di design (solo CSS, nessun JavaScript): strisce di luce da tapparella sfocate, la finestra proiettata sul muro (riquadro di luce con montanti in ombra) dietro la foto, foto come stampe incorniciate con passepartout e ombre portate a più strati, vetro smerigliato per l'intestazione e l'etichetta ISAK, rilievi sottili negli oggetti delle tre aree (tessera, righello, barre), sezioni "incassate" con ombre interne, pannello tortora per la prenotazione. Entrata della luce e leggero scorrimento (`animation-timeline: scroll()` dentro `@supports`); tutto il movimento si disattiva con `prefers-reduced-motion`.

Impostazione: sito vetrina con fascia di prenotazione subito sotto l'apertura (dove, come si prenota, valutazione aggregata, pulsante), pulsante "Prenota" sempre visibile nell'intestazione e pannello di prenotazione in fondo. La prenotazione resta su MioDottore: il sito non raccoglie dati.

Caratteri: Instrument Serif (titoli) e Instrument Sans 400/700 (testo), entrambi con licenza OFL, self-hosted in `public/fonts/` (sottoinsieme latino, formato WOFF).

## Struttura

- `public/index.html`, `public/style.css`: tutta la pagina. Nessuna dipendenza esterna.
- `public/img/naomi-studio.webp` (foto di apertura, 1040×1300) e `public/img/naomi-camice.webp` (sezione "Chi sono", 590×590): ricavate da screenshot di Instagram. Se Naomi ha gli originali ad alta risoluzione vanno sostituiti: rendono meglio sugli schermi grandi.
- `public/img/piatti/*.webp`: otto piatti d'esempio per la sezione "A tavola", ricavati dalle storie Instagram con il testo sovrapposto rimosso (inpainting OpenCV; la foto "insalata" è ritagliata sopra l'adesivo). Sono esempi, non un piano alimentare: lo dice anche la didascalia della sezione. Anche qui vanno bene gli originali di Naomi, senza testo.
- `public/img/favicon.svg`, `apple-touch-icon.png`, `icon-512.png`: marchio quadrato a due strisce di luce su tortora (lo stesso dell'intestazione).
- `scripts/preview.mjs` (`npm run preview:build`): crea `.tmp/preview/sito.html`, pagina a file unico con font e immagini incorporati, per le anteprime.
- `wrangler.jsonc`: sito statico su Cloudflare (cartella `public/`, nessun comando di build).

## Pubblicazione su Cloudflare

Workers & Pages → collegare il repository → **Build command**: vuoto · **Deploy command**: `npx wrangler deploy`.

## Prima del go-live

- [ ] Dominio definitivo; poi togliere `noindex` da `index.html` e cancellare `public/robots.txt`, aggiungere `canonical`, `og:url` e `url` nel JSON-LD.
- [ ] Dati obbligatori per i siti dei professionisti, da inserire nel piede: numero e sezione di iscrizione all'albo dei biologi (ONB), partita IVA, indirizzo dello studio (c'è un commento in `index.html`).
- [ ] Far confermare a Naomi le foto dei piatti (e le didascalie) e sostituirle con gli originali senza testo, se li ha.
- [ ] Far rileggere a Naomi i testi: sono bozze scritte a partire dalla sua bio Instagram (Chi sono, Di cosa mi occupo, Come si svolge una visita).
- [ ] Aggiungere il profilo Instagram e, se vuole, telefono/email e indirizzo (oggi la pagina rimanda solo a MioDottore).
- [ ] Valutazione e numero di recensioni (oggi "5,0 · 160", scritti a mano in `index.html`, due punti: apertura e sezione Prenota) sono quelli del profilo MioDottore: aggiornarli ogni tanto. Si mostra solo il dato aggregato, non i testi dei pazienti; farlo approvare a Naomi (regole sulla pubblicità sanitaria e termini di MioDottore).
- [ ] Se si aggiungono moduli, statistiche o cookie: informativa privacy e cookie.

Link di prenotazione (senza parametri di tracciamento): https://www.miodottore.it/profilo/naomi-acciaro
