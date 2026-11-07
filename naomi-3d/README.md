# Naomi Acciaro · sito 3D «Il percorso»

Bozza del sito immersivo in 5 fasi (personal brand, alimentazione, cucina, performance, scienza e formazione). Sito statico: nessuna libreria, nessuna build.

## Anteprima in locale

    cd naomi-3d
    python3 -m http.server 8000

Apri http://localhost:8000. Con `?static` si vede la versione senza animazioni, con `?live` si forza quella 3D.

## Com'è fatto

- `js/engine.js` e `js/gl.js`: motore WebGL2 scritto a mano (forme, shader, particelle).
- `js/scene.js` e `js/worlds.js`: scena, fasi e oggetti 3D; tutto è funzione della posizione di scorrimento.
- `js/main.js`: scorrimento, didascalie, navigazione, ripiego senza WebGL.
- `img/`: foto di Naomi ritagliate e portate ai colori della palette (Soft Sand, Mocha Green, Watermelon Pink).

Non sostituisce il sito pubblicato: la cartella `public/` di questo repository resta quella servita da Cloudflare.
