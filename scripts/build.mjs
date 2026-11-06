// Genera le pagine di public/ a partire da src/ (layout + pagine + site.json).
// Uso:
//   npm run build                          → versione di sviluppo (noindex, nofollow, niente canonical)
//   node scripts/build.mjs --site-url https://www.dominio.it
//                                          → versione di go-live: indicizzabile, canonical, og:url, URL assoluti
//                                            nei dati strutturati, sitemap.xml e robots.txt
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (...p) => readFileSync(join(root, ...p), 'utf8');
const argIdx = process.argv.indexOf('--site-url');
const SITE_URL = argIdx > -1 ? process.argv[argIdx + 1].replace(/\/+$/, '') : '';
const LIVE = Boolean(SITE_URL);

const site = JSON.parse(rd('src/site.json'));
const layout = rd('src/layout.html');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (v) => (LIVE && typeof v === 'string' && /^\/(?!\/)/.test(v) ? SITE_URL + v : v);
const absDeep = (o) => (typeof o === 'string' ? abs(o) : Array.isArray(o) ? o.map(absDeep) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, absDeep(v)])) : o);

// ---------- macro per le pagine ----------
const ico = (n, cls = '') => `<svg class="ico${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="/img/icons.svg#${n}"/></svg>`;
const stars = '<span class="stars" aria-hidden="true">' + ico('star').repeat(5) + '</span>';
const cta = (label, micro, variant = '') =>
  `<div class="cta${variant ? ' cta--' + variant : ''}"><a class="btn btn--big${variant === 'light' ? ' btn--light' : ''}" href="${site.booking}" target="_blank" rel="noopener">${label}</a>${micro ? `<p class="cta__micro">${micro}</p>` : ''}</div>`;
const link = (label, href, micro = '') =>
  `<div class="cta cta--link"><a class="btn btn--ghost" href="${href}">${label}</a>${micro ? `<p class="cta__micro">${micro}</p>` : ''}</div>`;
const final = (title, lead, micro) =>
  `<section class="sec final-sec" id="prenota" aria-labelledby="prenota-title"><div class="wrap"><div class="final"><div class="final__text"><h2 class="final__title" id="prenota-title">${title}</h2><p class="final__lead">${lead}</p><div class="cta cta--light"><a class="btn btn--big btn--light" href="${site.booking}" target="_blank" rel="noopener">Prenota la tua consulenza</a>${micro ? `<p class="cta__micro">${micro}</p>` : ''}</div></div><a class="final__rating" href="${site.booking}" target="_blank" rel="noopener" aria-label="Valutazione 5 su 5, 160 recensioni su MioDottore"><span class="final__score">5,0</span>${stars}<span class="final__count">160 recensioni su MioDottore</span></a></div></div></section>`;
const swipe = (v = '') => `<div class="swipe-ui${v ? ' swipe-ui--' + v : ''}" aria-hidden="true"><span class="swipe-bar"></span><span class="swipe-hint">Scorri ${ico('arrow')}</span></div>`;
// recensioni: schermate dei pazienti (src/reviews.json, immagini in public/img/recensioni). Ogni riquadro apre la sua versione
// grande con :target (nessun JavaScript): prev/next passano alla recensione accanto, «Chiudi» riporta sul riquadro.
const reviewsData = JSON.parse(rd('src/reviews.json'));
const reviews = () => {
  const n = reviewsData.length;
  const tiles = reviewsData.map((r) =>
    `<li class="rv__item" id="t-${r.id}" style="--ar:${(r.w / r.h).toFixed(3)}"><a class="rv__open" href="#rv-${r.id}" aria-label="Apri la recensione: ${esc(r.date)}"><img src="${r.src}" width="${r.w}" height="${r.h}" alt="${esc(r.alt)}" loading="lazy" decoding="async"></a></li>`).join('');
  const boxes = reviewsData.map((r, i) => {
    const prev = reviewsData[(i + n - 1) % n].id, next = reviewsData[(i + 1) % n].id;
    return `<div class="rvbox" id="rv-${r.id}" role="dialog" aria-modal="true" aria-label="Recensione: ${esc(r.date)} (${i + 1} di ${n})"><a class="rvbox__bg" href="#t-${r.id}" tabindex="-1" aria-hidden="true"></a><figure class="rvbox__fig"><img src="${r.src}" width="${r.w}" height="${r.h}" alt="${esc(r.alt)}" loading="lazy" decoding="async"></figure><a class="rvbox__x" href="#t-${r.id}">Chiudi</a><a class="rvbox__nav rvbox__nav--prev" href="#rv-${prev}" aria-label="Recensione precedente">${ico('arrow')}</a><a class="rvbox__nav rvbox__nav--next" href="#rv-${next}" aria-label="Recensione successiva">${ico('arrow')}</a></div>`;
  }).join('');
  return `<ul class="rv" aria-label="Recensioni dei pazienti">${tiles}</ul>${boxes}`;
};
function expand(html, meta) {
  return html
    .replace(/\{\{ico:([a-z-]+)(?:\|([^}]*))?\}\}/g, (_m, n, c) => ico(n, c || ''))
    .replace(/\{\{cta:([^|}]*)\|(.*?)(?:\|(light))?\}\}/g, (_m, l, m, v) => cta(l, m, v))
    .replace(/\{\{link:([^|}]*)\|([^|}]*)(?:\|([^}]*))?\}\}/g, (_m, l, h, m) => link(l, h, m))
    .replace(/\{\{final:([^|}]*)\|([^|}]*)\|([^}]*)\}\}/g, (_m, t, l, m) => final(t, l, m))
    .replace(/\{\{swipe(?::([a-z]+))?\}\}/g, (_m, v) => swipe(v))
    .replace(/\{\{reviews\}\}/g, () => reviews())
    .replace(/\{\{stars\}\}/g, stars)
    .replace(/\{\{book\}\}/g, site.booking)
    .replace(/\{\{crumbs\}\}/g, () => crumbsHtml(meta))
    .replace(/\{\{faq\}\}/g, () => faqHtml(meta));
}
const crumbsHtml = (m) => (m.crumbs ? `<nav class="crumbs" aria-label="Percorso"><ol><li><a href="/">Home</a></li><li aria-current="page">${m.crumbs}</li></ol></nav>` : '');
const faqHtml = (m) => `<div class="faq">${(m.faq || []).map((f) => `<details class="faq__item"><summary>${f.q}</summary><div class="faq__a"><p>${f.a}</p></div></details>`).join('')}</div>`;

// ---------- dati strutturati ----------
const siteGraph = [
  {
    '@type': 'Person', '@id': '/#naomi', name: 'Naomi Acciaro', jobTitle: 'Biologa nutrizionista',
    description: 'Biologa nutrizionista e antropometrista ISAK Level 1. Percorsi alimentari personalizzati, nutrizione clinica e sportiva a Roma e online.',
    image: '/img/naomi-camicia.webp',
    knowsAbout: ['Nutrizione clinica', 'Nutrizione sportiva', 'Antropometria ISAK', 'Piano alimentare personalizzato', 'Educazione alimentare'],
    hasCredential: { '@type': 'EducationalOccupationalCredential', credentialCategory: 'certification', name: 'Antropometrista ISAK Level 1' },
    worksFor: { '@id': '/#studio' }
  },
  {
    '@type': 'ProfessionalService', '@id': '/#studio', name: 'Naomi Acciaro, biologa nutrizionista', logo: site.logo,
    description: 'Consulenza nutrizionale, percorsi alimentari personalizzati, educazione alimentare e controlli a Roma e online.',
    image: site.ogImage, areaServed: { '@type': 'City', name: 'Roma' },
    address: { '@type': 'PostalAddress', addressLocality: 'Roma', addressCountry: 'IT' },
    availableLanguage: 'it', employee: { '@id': '/#naomi' },
    hasOfferCatalog: {
      '@type': 'OfferCatalog', name: 'Servizi',
      itemListElement: ['Consulenza nutrizionale', 'Percorsi alimentari personalizzati', 'Educazione alimentare', 'Controlli e monitoraggio'].map((n) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: n } }))
    }
  }
];

// ---------- pagine ----------
mkdirSync(join(root, 'public'), { recursive: true });
const warnings = [];
const pages = [];
const titles = new Set();
let placeholders = 0;

for (const f of readdirSync(join(root, 'src/pages')).filter((x) => x.endsWith('.html')).sort()) {
  const raw = rd('src/pages', f);
  const m = raw.match(/^<!--([\s\S]*?)-->\s*/);
  if (!m) throw new Error(f + ': manca il blocco meta iniziale');
  const meta = JSON.parse(m[1]);
  const main = expand(raw.slice(m[0].length), meta);
  const path = meta.path;

  const graph = [...siteGraph];
  if (meta.crumbs) graph.push({ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: '/' }, { '@type': 'ListItem', position: 2, name: meta.crumbs.replace(/<[^>]+>/g, ''), item: path }] });
  graph.push({ '@type': 'WebPage', '@id': path + '#page', url: path, name: meta.title, description: meta.description, inLanguage: 'it', about: { '@id': '/#naomi' }, isPartOf: { '@id': '/#site' } });
  if (path === '/') graph.push({ '@type': 'WebSite', '@id': '/#site', url: '/', name: site.name, inLanguage: 'it' });
  if (meta.faq) graph.push({ '@type': 'FAQPage', mainEntity: meta.faq.map((q) => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) });
  if (meta.services) for (const s of meta.services) graph.push({ '@type': 'Service', name: s.name, serviceType: s.type, description: s.description, provider: { '@id': '/#studio' }, areaServed: { '@type': 'City', name: 'Roma' }, availableChannel: { '@type': 'ServiceChannel', serviceUrl: site.booking } });
  const jsonld = `<script type="application/ld+json">\n${JSON.stringify(absDeep({ '@context': 'https://schema.org', '@graph': graph }), null, 1)}\n</script>`;

  const robots = meta.noindex || !LIVE
    ? '<!-- Finché il sito non ha il dominio definitivo resta fuori da Google. Al go-live: node scripts/build.mjs --site-url https://dominio -->\n<meta name="robots" content="noindex, nofollow">'
    : '<meta name="robots" content="index, follow, max-image-preview:large">' + `\n<link rel="canonical" href="${SITE_URL}${path}">\n<meta property="og:url" content="${SITE_URL}${path}">`;

  const navlinks = site.nav.map((n) => `      <a class="nav__link" href="${n.href}"${meta.nav === n.key ? ' aria-current="page"' : ''}>${n.label}</a>`).join('\n');
  const footlinks = site.nav.map((n) => `      <a href="${n.href}">${n.label}</a>`).join('\n');
  const legallinks = site.legal.map((n) => `<a href="${n.href}">${n.label}</a>`).join('');
  const preload = (meta.preload || []).map((p) => `<link rel="preload" href="${p}" as="image" type="image/webp">`).join('\n');

  const vars = {
    title: esc(meta.title), description: esc(meta.description), ogTitle: esc(meta.ogTitle || meta.title),
    themeColor: site.themeColor, locale: site.locale, name: esc(site.name), tagline: esc(site.tagline), booking: site.booking, ogImage: abs(site.ogImage),
    key: meta.nav || meta.file
  };
  const raws = { robots, jsonld, navlinks, footlinks, legallinks, main, preload };
  let out = layout.replace(/\{\{\{(\w+)\}\}\}/g, (_m, k) => (k in raws ? raws[k] : ''))
                  .replace(/\{\{(\w+)\}\}/g, (_m, k) => (k in vars ? vars[k] : ''));
  writeFileSync(join(root, 'public', meta.file + '.html'), out);
  pages.push({ ...meta, out });
  placeholders += (raw.match(/class="ph"/g) || []).length;

  // controlli SEO di base
  const h1 = (main.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) warnings.push(`${meta.file}: ${h1} H1 (deve essere 1)`);
  if (meta.title.length > 65) warnings.push(`${meta.file}: title di ${meta.title.length} caratteri (>65)`);
  if (meta.description.length > 160 || meta.description.length < 70) warnings.push(`${meta.file}: description di ${meta.description.length} caratteri (70-160)`);
  if (titles.has(meta.title)) warnings.push(`${meta.file}: title duplicato`);
  titles.add(meta.title);
  for (const im of main.match(/<img\b[^>]*>/g) || []) if (!/\balt="/.test(im)) warnings.push(`${meta.file}: immagine senza alt: ${im.slice(0, 80)}`);
}

if (LIVE) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages.filter((p) => !p.noindex).map((p) => `  <url><loc>${SITE_URL}${p.path}</loc><lastmod>${today}</lastmod></url>`).join('\n');
  writeFileSync(join(root, 'public/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  writeFileSync(join(root, 'public/robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
} else {
  writeFileSync(join(root, 'public/robots.txt'), 'User-agent: *\nDisallow: /\n');
}
console.log(`${pages.length} pagine generate (${LIVE ? 'LIVE ' + SITE_URL : 'sviluppo, noindex'}); segnaposto da completare (class="ph"): ${placeholders}`);
if (warnings.length) { console.warn('Avvisi:\n - ' + warnings.join('\n - ')); process.exitCode = 1; }
