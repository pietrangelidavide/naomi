// Anteprima a file unico (senza server né rete): crea .tmp/preview/sito.html con tutte le pagine, font, immagini,
// icone e video incorporati, e un piccolo "router" a hash solo per l'anteprima (il sito vero ha pagine separate).
//   sito.html       = frammento per Artifact (ha già <title> e <style>)
//   sito-page.html  = lo stesso, con la cornice minima del visualizzatore (per provarlo in locale)
// Uso: npm run preview:build   (esegue prima la build delle pagine)
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.tmp', 'preview');
mkdirSync(out, { recursive: true });
const pub = (...p) => join(root, 'public', ...p);
const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', woff: 'font/woff', mp4: 'video/mp4' };
const dataUri = (rel) => `data:${MIME[rel.split('.').pop()]};base64,${readFileSync(pub(rel)).toString('base64')}`;
const frame = (body) => `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

const style = readFileSync(pub('style.css'), 'utf8').replace(/url\((['"]?)(fonts\/[^'")]+)\1\)/g, (_m, _q, p) => `url('${dataUri(p)}')`);
const sprite = readFileSync(pub('img/icons.svg'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

// ---- pagine: ogni pagina → il suo <main>; intestazione e piede sono presi dalla home e condivisi
const files = readdirSync(pub()).filter((f) => f.endsWith('.html') && f !== '404.html');
const key = (f) => (f === 'index.html' ? 'home' : f.replace('.html', ''));
const assets = {}; // dedup: ogni file incorporato una volta sola
const asset = (p) => { const k = p.replace(/^\//, ''); assets[k] ??= dataUri(k); return k; };
const route = (href) => { // /servizi#clinica → #servizi~clinica ; / → #home
  const [path, frag] = href.split('#'); const k = path === '/' || path === '' ? 'home' : path.replace(/^\//, '');
  return '#' + k + (frag ? '~' + frag : '');
};
const fix = (h) => h
  .replace(/<use href="\/img\/icons\.svg#/g, '<use href="#')
  .replace(/<source src="(\/video\/[^"]+)"/g, (_m, p) => `<source data-a="${asset(p)}"`)
  .replace(/ poster="(\/img\/[^"]+)"/g, (_m, p) => ` data-poster="${asset(p)}"`)
  .replace(/(<img\b[^>]*?) src="(\/img\/[^"]+)"/g, (_m, a, p) => `${a} data-a="${asset(p)}"`)
  .replace(/href="(\/[^"]*)"/g, (_m, h) => (/^\/(img|fonts|video)\//.test(h) ? _m : `href="${route(h)}"`));

const pages = {};
let shell = '';
for (const f of files) {
  const html = readFileSync(pub(f), 'utf8');
  const main = html.match(/<main id="contenuto">([\s\S]*?)<\/main>/)[1];
  pages[key(f)] = { main: fix(main), title: html.match(/<title>([^<]*)<\/title>/)[1] };
  if (f === 'index.html') {
    const pre = html.slice(html.indexOf('<body'), html.indexOf('<main id="contenuto">'));
    const post = html.slice(html.indexOf('</main>') + 7, html.indexOf('</body>'));
    shell = fix(pre.replace(/^<body[^>]*>/, '').replace(/ aria-current="page"/g, '')) + '<main id="contenuto"></main>' + fix(post);
  }
}
shell = shell.replace(/<a class="nav__link" href="(#[^"]+)"/g, (_m, h) => `<a class="nav__link" data-r="${h.slice(1)}" href="${h}"`);

const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
const script = `
const PAGES = JSON.parse(document.getElementById('pages').textContent);
const ASSETS = JSON.parse(document.getElementById('assets').textContent);
const main = document.getElementById('contenuto');
function hydrate(root) {
  root.querySelectorAll('[data-a]').forEach((e) => { const u = ASSETS[e.dataset.a]; if (e.tagName === 'SOURCE') { e.src = u; e.parentElement.load(); } else e.src = u; });
  root.querySelectorAll('[data-poster]').forEach((e) => { e.poster = ASSETS[e.dataset.poster]; });
}
function show() {
  const [k, sec] = decodeURIComponent(location.hash.slice(1)).split('~');
  const key = PAGES[k] ? k : 'home';
  if (main.dataset.k !== key) {
    main.innerHTML = PAGES[key].main; main.dataset.k = key; hydrate(main); document.title = PAGES[key].title;
    document.body.className = 'page-' + key;
    document.querySelectorAll('.nav__link').forEach((a) => { if (a.dataset.r === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.querySelectorAll('details.menu').forEach((d) => d.removeAttribute('open'));
    if (!sec) window.scrollTo(0, 0);
  }
  if (sec) { const el = document.getElementById(sec); if (el) el.scrollIntoView(); }
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const h = a.getAttribute('href').slice(1);
  if (h && !PAGES[h.split('~')[0]]) { const el = document.getElementById(h); if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); } }
});
addEventListener('hashchange', show);
hydrate(document); show();`;

const fragment = `<title>Sito Naomi Acciaro</title>
<style>${style}</style>
${sprite}
${shell}
<script type="application/json" id="pages">${json(pages)}</script>
<script type="application/json" id="assets">${json(assets)}</script>
<script>${script}</script>`;
writeFileSync(join(out, 'sito.html'), fragment);
writeFileSync(join(out, 'sito-page.html'), frame(fragment));
console.log(`Anteprima in .tmp/preview/sito.html (${(fragment.length / 1048576).toFixed(1)} MB, ${Object.keys(pages).length} pagine, ${Object.keys(assets).length} file incorporati)`);
