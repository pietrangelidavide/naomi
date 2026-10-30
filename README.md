# Naomi Acciaro · sito vetrina

Sito di 5 pagine per la Dott.ssa Naomi Acciaro, biologa nutrizionista (Roma | Online): **Home, Chi siamo, Servizi, Dove, Contatti** (+ pagina 404). HTML e CSS statici, nessun framework, nessun JavaScript sul sito, nessun cookie. La prenotazione rimanda al profilo MioDottore.

## Identità

Palette scelta dalla cliente: **Sabbia, Tortora, Salvia, Tabacco, Nero**, con poche tinte derivate per sfondi e superfici. **Nessun logo**: il nome in testo («Dott.ssa Naomi Acciaro», Nunito ExtraBold) è il marchio; favicon e icone dell'app sono la sola iniziale *N*. Slogan: *Con scienza e coscienza.*

- Scheda completa (colori con contrasti, carattere, icone, grafica, voce dei testi): `brand/linee-guida.html` (si apre nel browser; rigenerabile con `python3 scripts/build-brand-guide.py`).
- Palette: Sabbia `#e4d9c7`, Tortora `#a39a89`, Salvia `#a6b3a1`, Tabacco `#70513f`, Nero `#242321`. Derivate: fondo `#f2ece3`, card `#f9f7f3`, salvia chiara `#d7ddd5`, tabacco scuro `#4e3c32`, testo secondario `#5a564f`. Contrasti calcolati: testo ≥ 5,2:1 su tutti gli sfondi; il Tortora si usa solo per filetti e grafica, mai per testo.
- Carattere: **Nunito** (tondo, leggibile), un solo file variabile 400–900, OFL, self-hosted in `public/fonts/` (WOFF subsettato, 44 KB).
- Icone: set proprio in `public/img/icons.svg` (griglia 24, tratto 1,5, angoli vivi).
- Grafica: spigoli vivi (nessun `border-radius`, anche con il carattere tondo: se si preferiscono angoli arrotondati basta introdurre un raggio nel `*` di `style.css`), luce a strisce da tapparella, foto come stampe con passe-partout e lastra tabacco, ombre a più strati. Entrata della luce e leggero scorrimento solo con `prefers-reduced-motion: no-preference`.
- Liste da sfogliare: sotto i 1020 px le liste di schede diventano carosello orizzontale (solo CSS, `scroll-snap`, schede successiva accennata, barra di avanzamento e «Scorri →»); da desktop restano in griglia. Macro `{{swipe}}` dopo ogni lista.
- Grafiche esplicative: cinque SVG in linea in `src/gfx/` (`venn`, `squadra`, `piatto`, `misure`, `giornata`), richiamati con `{{gfx:nome|didascalia}}`. Sono decorativi (`aria-hidden`), la didascalia porta il significato; sono esempi illustrativi, non indicazioni cliniche.

## Come è fatto

```
src/site.json        dati comuni (nome, link prenotazione, menu, video)
src/layout.html      intestazione, piede, meta tag (uguali per tutte le pagine)
src/pages/*.html     una pagina ciascuna: blocco JSON iniziale (title, description, FAQ, servizi) + contenuto
scripts/build.mjs    genera public/*.html (+ dati strutturati, sitemap, robots)
public/              il sito pubblicato (file generati e committati: su Cloudflare non serve alcuna build)
```

Macro nelle pagine: `{{ico:nome}}` icona, `{{cta:Etichetta|Microcopy}}` bottone + frase sotto, `{{link:Etichetta|/pagina|Microcopy}}`, `{{video:a|b|c}}`, `{{faq}}`, `{{crumbs}}`, `{{final:Titolo|Testo|Microcopy}}` (chiusura tabacco con voto), `{{gfx:nome|didascalia}}` (grafica esplicativa), `{{swipe}}` (barra e indicazione «Scorri» sotto una lista a carosello), `{{book}}` (link di prenotazione).

Comandi (Node 20+):

| Comando | Cosa fa |
|---|---|
| `npm run build` | rigenera `public/*.html` (versione di sviluppo: `noindex`) |
| `npm run dev` | build + server locale su http://localhost:8788 (URL senza estensione e 404 come su Cloudflare) |
| `npm run preview:build` | crea `.tmp/preview/sito.html`: anteprima a file unico con tutte le pagine |
| `node scripts/build.mjs --site-url https://dominio.it` | **versione di go-live**: indicizzabile, `canonical`, `og:url`, URL assoluti nei dati strutturati, `sitemap.xml`, `robots.txt` |
| `python3 scripts/build-video.py [a\|b\|c]` | rigenera i 3 video e le copertine (Playwright + ffmpeg) |
| `python3 scripts/build-og.py` | rigenera `public/img/og.jpg` (anteprima social 1200×630) |
| `python3 scripts/build-brand-guide.py` | rigenera `brand/linee-guida.html` |

## SEO on-page

Un solo `<h1>` per pagina (formula «tema + promessa»), `title` ≤ 65 e `description` 70–160 caratteri unici, una parola chiave per pagina (nutrizionista Roma, servizi, dove, contatti), breadcrumb, dati strutturati JSON-LD (`Person`, `ProfessionalService`, `Service`, `FAQPage` generata dalle stesse FAQ visibili, `BreadcrumbList`, `VideoObject`), immagini con `alt` e dimensioni, video con copertina e `preload="none"`, font preloadati. `build.mjs` segnala a console eventuali H1 multipli, title/description fuori misura o immagini senza `alt`.

Finché non c'è il dominio definitivo il sito resta `noindex` e `robots.txt` blocca tutto.

## Video

Tre clip brevi, senza audio, 720×900: *Con scienza e coscienza* (10 s), *La prima visita in 4 passi* (12 s), *A tavola* (10 s). Sono animazioni grafiche costruite con le foto vere di Naomi, non riprese. Se Naomi gira i suoi video, basta sostituire gli MP4 in `public/video/` (stessi nomi; consigliato H.264, 720×900 o 9:16, sotto 2 MB) e le copertine in `public/img/video/`.

## Prima del go-live

- [ ] **Dominio definitivo**, poi `node scripts/build.mjs --site-url https://dominio.it` e pubblicare.
- [ ] **Dati obbligatori** per i siti dei professionisti sanitari, da inserire nel piede (`src/layout.html`, c'è un commento): numero e sezione di iscrizione all'albo dei biologi (ONB), partita IVA, indirizzo dello studio. L'indirizzo va anche in `scripts/build.mjs` (`address` di `ProfessionalService`) e nella pagina Dove.
- [ ] **Far rileggere a Naomi tutti i testi**: sono bozze scritte sulla sua bio e sulle sue foto. In particolare: «Con scienza e coscienza» (Chi siamo, c'è un commento dove aggiungere 2-3 righe di storia personale vera), la sezione squadra (quali professionisti collaborano davvero: medico, allenatore, fisioterapista; con nomi e foto se vuole), formazione e titoli, le FAQ.
- [ ] **Contatti diretti**: telefono, email, Instagram, orari (oggi la prenotazione e i contatti passano solo da MioDottore; i punti da completare sono segnalati nei commenti di `contatti.html`).
- [ ] **Recensioni**: sul sito c'è solo il dato aggregato (5,0 · 160 su MioDottore, scritto a mano in 4 punti: `build.mjs` macro `final`, `index.html`, `chi-siamo.html`, `contatti.html`) con il link al profilo; aggiornarlo ogni tanto e farlo approvare a Naomi. **Nessuna testimonianza è stata inventata**: con il consenso scritto dei pazienti si possono aggiungere 2-3 citazioni vere con il componente `.quote` (`<blockquote class="quote"><p>…</p><cite>Nome, età/città</cite></blockquote>`). Regole sulla pubblicità sanitaria: niente promesse di risultato, niente prima/dopo.
- [ ] **Foto**: sostituire con gli originali ad alta risoluzione le foto ricavate da Instagram (`naomi-camicia.webp`, `naomi-camicia-quadrata.webp`, `naomi-camice.webp`, `piatti/*.webp`, le foto dei piatti senza testo sovrapposto).
- [ ] Se si aggiungono moduli, statistiche o cookie: informativa privacy e cookie.

## Pubblicazione su Cloudflare

Workers & Pages → collegare il repository → **Build command**: vuoto · **Deploy command**: `npx wrangler deploy` (`wrangler.jsonc`: cartella `public/`, `not_found_handling: "404-page"`).

Link di prenotazione (senza parametri di tracciamento): https://www.miodottore.it/profilo/naomi-acciaro
