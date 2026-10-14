// Anteprima a file unico (senza server): crea .tmp/preview/sito.html con font e immagini incorporati.
// sito.html = frammento per Artifact; sito-page.html = con la cornice del visualizzatore (per provarlo in locale).
// Uso: npm run preview:build
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.tmp', 'preview');
mkdirSync(out, { recursive: true });
const pub = (...p) => join(root, 'public', ...p);
const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', woff: 'font/woff' };
const dataUri = (rel) => `data:${MIME[rel.split('.').pop()]};base64,${readFileSync(pub(rel)).toString('base64')}`;
const frame = (body) => `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

const style = readFileSync(pub('style.css'), 'utf8').replace(/url\((['"]?)(fonts\/[^'")]+)\1\)/g, (_m, _q, p) => `url('${dataUri(p)}')`);
const html = readFileSync(pub('index.html'), 'utf8');

let body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
body = body.replace(/(src|href)="(img\/[^"]+)"/g, (_m, a, p) => `${a}="${dataUri(p)}"`);
const ld = html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/)?.[0] ?? '';
const fragment = `<title>Dott.ssa Naomi Acciaro</title>\n<style>${style}</style>\n${body}\n${ld}`;
writeFileSync(join(out, 'sito.html'), fragment);
writeFileSync(join(out, 'sito-page.html'), frame(fragment));
console.log(`Anteprima in .tmp/preview/sito.html (${Math.round(fragment.length / 1024)} KB)`);
