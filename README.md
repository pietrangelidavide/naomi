# Naomi Acciaro · sito vetrina

Sito di 5 pagine per Naomi Acciaro, biologa nutrizionista (Roma | Online): **Home, Chi sono, Servizi, Metodo, Contatti**, più Privacy policy, Cookie policy e 404. HTML e CSS statici, nessun framework, **nessun JavaScript e nessun cookie sul sito**. La prenotazione rimanda al profilo MioDottore; il modulo di contatto passa da un piccolo Worker (vedi sotto).

## Identità (brief «Science meets wellness»)

Concept **Science meets wellness**, payoff *«Il tuo benessere, il tuo equilibrio, il tuo percorso.»* Stile minimal luxury, editoriale, femminile contemporaneo, organic modernism.

- **Logo: solo nome e cognome**, testo puro, senza ritratto né «Dott.ssa»: **NAOMI ACCIARO** in Cormorant Garamond maiuscolo spaziato, con sotto «BIOLOGA NUTRIZIONISTA» in DM Sans piccolo (`.brand` in `style.css`, markup in `src/layout.html`). Nelle icone piccole (favicon, icona di iOS) non ci starebbe: lì ci sono le iniziali «NA»; `icon-512.png` (usata nei dati strutturati) riporta il nome per esteso. Si rigenerano con `python3 scripts/build-icons.py`.
- **Palette, solo queste cinque** (variabili in cima a `public/style.css`): Ivory `#F6F3EE` (fondo), Sand `#DED5CA` (sezioni alternate), Taupe `#B8A99A` (filetti e dettagli), Sage `#788373` (secondario; per il testo si usa la versione scurita `--sage-d`, per il contrasto), Charcoal `#333831` (testo e bottoni). Le tinte intermedie sono miscele di queste cinque con `color-mix()`. Niente colori vivaci, gradienti o forti contrasti.
- **Caratteri**, self-hosted in `public/fonts/` (OFL, WOFF subsettato, circa 130 KB in tutto): **Cormorant Garamond** per titoli (variabile, tondo e corsivo), **DM Sans** per testo, menu e bottoni. Il corsivo serif è per i piccoli dettagli editoriali. Si rigenerano con `python3 scripts/fonts.py CARTELLA/google-fonts/ofl` (serve `fonttools`).
- **Movimento**, leggero e solo con `prefers-reduced-motion: no-preference`: dissolvenze allo scorrimento (CSS `animation-timeline: view()`, dove il browser lo supporta; altrove il contenuto è semplicemente visibile), apertura morbida del menu, hover dei bottoni, scoperta delle foto della home. Nessuna libreria.
- Niente grafica ospedaliera (caduceo, croci), niente foto stock di frutta e verdura: le foto sono quelle vere di Naomi e dei suoi piatti.
- Icone: set proprio in `public/img/icons.svg` (griglia 24, tratto sottile).
- Liste di schede (servizi, fasi, valori): sotto i 1020 px diventano carosello orizzontale, solo CSS (`scroll-snap`), con la scheda successiva accennata e la barra «Scorri →». Macro `{{swipe}}` dopo ogni lista.
- Menu da telefono: `<details>` senza JavaScript. La barra «Prenota» in basso su iPhone compare dopo l'apertura della pagina e non c'è nella pagina Contatti.

## Come è fatto

```
src/site.json        dati comuni (nome, link prenotazione, menu, link legali)
src/layout.html      intestazione sticky, piede, meta tag (uguali per tutte le pagine)
src/pages/*.html     una pagina ciascuna: blocco JSON iniziale (title, description, FAQ) + contenuto
src/reviews.json     le schermate delle recensioni (file, misure, data, testo alternativo) della macro {{reviews}}
src/photos.json      testi alternativi delle foto usate nelle strisce (chiave = percorso in public/img senza .webp)
scripts/build.mjs    genera public/*.html (+ dati strutturati, sitemap, robots)
scripts/fonts.py     ricava i font in public/fonts da Google Fonts
scripts/build-icons.py, build-og.py   favicon, icona 512 e anteprima social (1200×630)
scripts/photos.py, enhance.py         ritagli e ritocco delle foto (recensioni, scrivania, trittico)
worker/index.js      Worker del modulo di contatto (POST /api/contatti); worker/test.mjs lo prova senza rete
public/              il sito pubblicato (file generati e committati: su Cloudflare non serve alcuna build)
public/_redirects    /chi-siamo → /chi-sono e /dove → /contatti (gli indirizzi della vecchia versione)
```

Pagine: `/` · `/chi-sono` · `/servizi` · `/metodo` · `/contatti` (qui c'è anche cosa succede in studio e online, la vecchia pagina «Dove») · `/privacy` · `/cookie`.

Macro nelle pagine: `{{ico:nome}}` icona, `{{cta:Etichetta|Microcopy}}` bottone + frase, `{{link:Etichetta|/pagina|Microcopy}}`, `{{faq}}`, `{{crumbs}}`, `{{final:Titolo|Testo|Microcopy}}` (chiusura in carbone con voto), `{{swipe}}` e `{{swipe:rv}}` (indicazione «Scorri» sotto un carosello), `{{reviews}}` (le schermate di `src/reviews.json`: da desktop tessere affiancate, da telefono carosello; toccandone una si apre ingrandita, senza JavaScript), `{{stars}}`, `{{book}}` (link di prenotazione), `{{film:Etichetta|foto1,foto2,…}}` (striscia di foto, vedi sotto). Le macro non si annidano (niente `{{ }}` dentro un'altra macro).

Strisce di foto (`{{film:…}}`): dove prima c'era una sola foto (a bassa risoluzione, ricavata da Instagram) ora scorre una fascia orizzontale con più foto affiancate, così la qualità del singolo scatto non si nota. Si usa in home (`#filosofia`) e nell'intestazione di Chi sono. I nomi sono i file di `public/img` senza `.webp` (es. `piatti/spaghetti`); le misure si leggono dal file e il testo alternativo da `src/photos.json` (la build si ferma se una foto manca). Solo CSS: di norma scorre da sola in loop (90 s a giro), con pausa al passaggio del mouse o alla tastiera; se l'utente ha impostato «riduci movimento» diventa una fascia da sfogliare col dito (le copie del ciclo sono nascoste e `aria-hidden`). Per cambiare le foto basta cambiare l'elenco nella pagina e rilanciare `npm run build`.

Comandi (Node 20+):

| Comando | Cosa fa |
|---|---|
| `npm run build` | rigenera `public/*.html` (versione di sviluppo: `noindex`); scrive anche quanti segnaposto restano |
| `npm run dev` | build + server locale su http://localhost:8788 (URL senza estensione e 404 come su Cloudflare) |
| `node worker/test.mjs` | prova il modulo di contatto con una rete finta (invio, bot, dati errati, errori di Resend) |
| `node scripts/build.mjs --site-url https://dominio.it` | **versione di go-live**: indicizzabile, `canonical`, `og:url`, URL assoluti nei dati strutturati, `sitemap.xml`, `robots.txt` |
| `python3 scripts/build-icons.py` / `build-og.py` | favicon e icona 512 / anteprima social |
| `python3 scripts/photos.py CARTELLA [nome ...]` | rifà dalle foto originali i ritagli in `public/img` (serve `opencv-contrib-python`) |
| `npm run preview:build` | anteprima a file unico in `.tmp/preview/sito.html` |

## Segnaposto da completare

Dove manca un'informazione vera compare un riquadro tratteggiato (classe `ph`); non ho inventato titoli, numeri o storie. `npm run build` dice quanti ne restano (oggi 13). Per trovarli: cercare `class="ph"` in `src/pages/`.

- **Contatti** (`contatti.html`): email professionale, telefono/WhatsApp, via e numero civico dello studio.
- **Chi sono** (`chi-sono.html`): la storia di Naomi (2-3 righe sue), laurea e università, percorso professionale, numero e sezione di iscrizione all'albo ONB.
- **Privacy e Cookie**: data di aggiornamento, dati completi del titolare (ragione sociale, P. IVA, sede), periodo di conservazione, trasferimenti fuori SEE.

Altri punti: l'indirizzo va anche nei dati strutturati (`scripts/build.mjs`, `address` di `ProfessionalService`) e, quando c'è, nel piede (`src/layout.html`).

## Modulo di contatto

Il modulo in `/contatti` è un `<form method="post" action="/api/contatti">`. Il Worker (`worker/index.js`) controlla i dati (campo trappola anti-bot, email valida, consenso privacy, stessa origine), manda l'email con **Resend** e riporta su `/contatti#inviato` oppure `/contatti#errore` (due avvisi che si mostrano con `:target`, senza JavaScript). Il messaggio arriva a `CONTACT_TO` con «Rispondi» già puntato a chi ha scritto.

Per farlo funzionare servono tre **segreti** nel Worker su Cloudflare (Workers → `naomi-acciaro` → Settings → Variables and Secrets):

| Nome | Valore |
|---|---|
| `RESEND_API_KEY` | chiave API di Resend (resend.com → API Keys) |
| `CONTACT_TO` | l'indirizzo che riceve i messaggi |
| `CONTACT_FROM` | mittente su un dominio **verificato** in Resend, es. `Sito Naomi Acciaro <sito@dominio.it>` |

Finché mancano, chi invia vede l'avviso «Non siamo riusciti a inviare il messaggio… prenota su MioDottore»: nessun messaggio si perde in silenzio, ma nemmeno arriva. Il recapito reale si prova solo dal sito pubblicato.

## SEO on-page

Un solo `<h1>` per pagina, `title` ≤ 65 e `description` 70–160 caratteri unici, breadcrumb, dati strutturati JSON-LD (`Person`, `ProfessionalService` con i 4 servizi, `FAQPage` generata dalle FAQ visibili di Servizi e Contatti, `BreadcrumbList`, `WebPage`), immagini con `alt` e dimensioni, font preloadati, Open Graph con anteprima 1200×630. `build.mjs` segnala H1 multipli, title/description fuori misura, titoli doppi o immagini senza `alt`, ed esce con errore.

Finché non c'è il dominio definitivo il sito resta `noindex` e `robots.txt` blocca tutto.

## Prima del go-live

- [ ] **Dominio definitivo**, poi `node scripts/build.mjs --site-url https://dominio.it`, commit e push.
- [ ] **Segnaposto** (sopra) e i tre segreti del modulo.
- [ ] **Privacy e cookie**: sono bozze scritte su come funziona oggi il sito; farle rivedere a un consulente. Se si aggiungono statistiche, mappe, video o altri servizi esterni vanno aggiornate e può servire un banner per il consenso (oggi non serve: nessun cookie).
- [ ] **Dati obbligatori** per i siti dei professionisti sanitari: numero e sezione di iscrizione all'albo dei biologi (ONB), partita IVA, indirizzo dello studio, da inserire nel piede (`src/layout.html`).
- [ ] **Far rileggere a Naomi tutti i testi**: sono bozze scritte sul brief e sulla sua bio. Il tono è quello del brief (niente promesse di risultato, niente «prima e dopo»).
- [ ] **Recensioni**: in home (`#recensioni`) ci sono 7 schermate di recensioni MioDottore e messaggi di ringraziamento, così come le ha consegnate Naomi (`src/reviews.json`, immagini in `public/img/recensioni/`). Il brief ammette solo testimonianze autentiche e autorizzate: verificare con Naomi il **consenso dei pazienti** a pubblicarle (in `r5` si legge «Cecilia C.», in `r3` un cognome in parte visibile; negli altri i nomi sono sfocati), la data di ogni recensione e che il messaggio in `r4` sia pubblicabile. Per toglierne una basta eliminarla da `src/reviews.json` e rilanciare la build. Il dato aggregato «5,0 · 160 recensioni» è scritto a mano in `index.html`, `chi-sono.html`, `contatti.html` e nella macro `final` di `build.mjs`.
- [ ] **Foto**: sostituire con gli originali ad alta risoluzione quelle ricavate da Instagram (`naomi-*.webp`, `scrivania-*.webp`, `piatti/*.webp`). Il ritocco ha tolto rumore e scritte, ma la risoluzione di partenza non si recupera.

## Pubblicazione su Cloudflare

Workers & Pages → collegare il repository → **Build command**: vuoto · **Deploy command**: `npx wrangler deploy`. `wrangler.jsonc` pubblica la cartella `public/` (con `not_found_handling: "404-page"`) e fa passare dal Worker solo `/api/*`.

Link di prenotazione (senza parametri di tracciamento): https://www.miodottore.it/profilo/naomi-acciaro
