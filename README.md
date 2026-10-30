# Naomi Acciaro · sito vetrina

Sito di una pagina per la Dott.ssa Naomi Acciaro, biologa nutrizionista (Roma | Online). HTML e CSS statici, senza framework; la prenotazione rimanda al profilo MioDottore.

## Idea grafica

"Luce da finestra": una pagina minimale in grigi freddi, dove la profondità la fanno le ombre. Una luce a strisce (come da tapparella) attraversa l'apertura, le card proiettano ombre morbide a più strati, il pulsante e i riquadri hanno rilievi in stile neumorfico, l'intestazione è un vetro smerigliato flottante, la sezione "La visita" è un pannello grafite con un fascio di luce.

Palette neutra: sfondo `#e7e9ea`, carta `#f3f4f4`, card `#fbfbfa`, inchiostro `#1b1f21` / `#2f3538`, testo secondario `#596165`, grafite `#333b3f` → `#14181a` per i pannelli scuri. Il colore lo mettono le foto. Il testo scuro su sfondo chiaro è a contrasto alto (> 12:1); il testo secondario `#596165` su `#e7e9ea` è a circa 5,2:1.

Giochi di design (solo CSS, nessun JavaScript): strisce di luce con `repeating-linear-gradient` + sfocatura e maschera, ombre proiettate con pseudo-elementi sfocati e inclinati, vetro con `backdrop-filter`, oggetti disegnati con soli gradienti conici/radiali nelle schede "Di cosa mi occupo", galleria a colonne sfalsate, entrata della luce e leggero scorrimento (`animation-timeline: scroll()` dentro `@supports`). Tutto il movimento si disattiva con `prefers-reduced-motion`.

Caratteri: Gloock (titoli) e Work Sans 400/700 (testo), entrambi con licenza OFL, self-hosted in `public/fonts/` (sottoinsieme latino, formato WOFF).

## Struttura

- `public/index.html`, `public/style.css`: tutta la pagina. Nessuna dipendenza esterna.
- `public/img/naomi-studio.webp` (foto di apertura, 1040×1300) e `public/img/naomi-camice.webp` (sezione "Chi sono", 590×590): ricavate da screenshot di Instagram. Se Naomi ha gli originali ad alta risoluzione vanno sostituiti: rendono meglio sugli schermi grandi.
- `public/img/piatti/*.webp`: otto piatti d'esempio per la sezione "A tavola", ricavati dalle storie Instagram con il testo sovrapposto rimosso (inpainting OpenCV; la foto "insalata" è ritagliata sopra l'adesivo). Sono esempi, non un piano alimentare: lo dice anche la didascalia della sezione. Anche qui vanno bene gli originali di Naomi, senza testo.
- `public/img/favicon.svg`, `apple-touch-icon.png`, `icon-512.png`: la mezzaluna del logo su grafite.
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
