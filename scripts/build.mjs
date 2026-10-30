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
  `<section class="sec final-sec" id="prenota" aria-labelledby="prenota-title"><div class="wrap"><div class="final"><div class="final__light" aria-hidden="true"></div><div class="final__text"><h2 class="final__title" id="prenota-title">${title}</h2><p class="final__lead">${lead}</p>${cta('Prenota la prima visita', micro, 'light')}</div><a class="final__rating" href="${site.booking}" target="_blank" rel="noopener" aria-label="Valutazione 5 su 5, 160 recensioni su MioDottore"><span class="final__score">5,0</span>${stars}<span class="final__count">160 recensioni su MioDottore</span></a></div></div></section>`;
const usedVideos = new Set();
const video = (k) => {
  const v = site.videos[k]; if (!v) throw new Error('video sconosciuto: ' + k); usedVideos.add(k);
  return `<figure class="video"><video controls preload="none" playsinline width="${v.w}" height="${v.h}" poster="${v.poster}" aria-label="${esc(v.title)}"><source src="${v.file}" type="video/mp4">Il tuo browser non riproduce i video.</video><figcaption><strong>${v.title}</strong><span>${v.text}</span></figcaption></figure>`;
};

function expand(html, meta) {
  return html
    .replace(/\{\{ico:([a-z-]+)(?:\|([^}]*))?\}\}/g, (_m, n, c) => ico(n, c || ''))
    .replace(/\{\{cta:([^|}]*)\|(.*?)(?:\|(light))?\}\}/g, (_m, l, m, v) => cta(l, m, v))
    .replace(/\{\{link:([^|}]*)\|([^|}]*)(?:\|([^}]*))?\}\}/g, (_m, l, h, m) => link(l, h, m))
    .replace(/\{\{final:([^|}]*)\|([^|}]*)\|([^}]*)\}\}/g, (_m, t, l, m) => final(t, l, m))
    .replace(/\{\{video:([a-z])\}\}/g, (_m, k) => video(k))
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
    '@type': 'Person', '@id': '/#naomi', name: 'Naomi Acciaro', honorificPrefix: 'Dott.ssa', jobTitle: 'Biologa nutrizionista',
    description: 'Biologa nutrizionista e antropometrista ISAK Level 1. Nutrizione clinica e sportiva a Roma e online.',
    image: '/img/naomi-camice.webp',
    knowsAbout: ['Nutrizione clinica', 'Nutrizione sportiva', 'Antropometria ISAK', 'Piano alimentare personalizzato'],
    hasCredential: { '@type': 'EducationalOccupationalCredential', credentialCategory: 'certification', name: 'Antropometrista ISAK Level 1' },
    worksFor: { '@id': '/#studio' }
  },
  {
    '@type': 'ProfessionalService', '@id': '/#studio', name: 'Dott.ssa Naomi Acciaro, biologa nutrizionista',
    description: 'Visite nutrizionali, valutazione antropometrica ISAK e nutrizione sportiva a Roma e online.',
    image: site.ogImage, areaServed: { '@type': 'City', name: 'Roma' },
    address: { '@type': 'PostalAddress', addressLocality: 'Roma', addressCountry: 'IT' },
    availableLanguage: 'it', employee: { '@id': '/#naomi' },
    hasOfferCatalog: {
      '@type': 'OfferCatalog', name: 'Servizi',
      itemListElement: ['Nutrizione clinica', 'Valutazione antropometrica ISAK', 'Nutrizione sportiva'].map((n) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: n } }))
    }
  }
];

// ---------- pagine ----------
mkdirSync(join(root, 'public'), { recursive: true });
const warnings = [];
const pages = [];
const titles = new Set();

for (const f of readdirSync(join(root, 'src/pages')).filter((x) => x.endsWith('.html')).sort()) {
  const raw = rd('src/pages', f);
  const m = raw.match(/^<!--([\s\S]*?)-->\s*/);
  if (!m) throw new Error(f + ': manca il blocco meta iniziale');
  const meta = JSON.parse(m[1]);
  usedVideos.clear();
  const main = expand(raw.slice(m[0].length), meta);
  const path = meta.path;

  const graph = [...siteGraph];
  if (meta.crumbs) graph.push({ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: '/' }, { '@type': 'ListItem', position: 2, name: meta.crumbs.replace(/<[^>]+>/g, ''), item: path }] });
  graph.push({ '@type': 'WebPage', '@id': path + '#page', url: path, name: meta.title, description: meta.description, inLanguage: 'it', about: { '@id': '/#naomi' }, isPartOf: { '@id': '/#site' } });
  if (path === '/') graph.push({ '@type': 'WebSite', '@id': '/#site', url: '/', name: site.name, inLanguage: 'it' });
  if (meta.faq) graph.push({ '@type': 'FAQPage', mainEntity: meta.faq.map((q) => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) });
  if (meta.services) for (const s of meta.services) graph.push({ '@type': 'Service', name: s.name, serviceType: s.type, description: s.description, provider: { '@id': '/#studio' }, areaServed: { '@type': 'City', name: 'Roma' }, availableChannel: { '@type': 'ServiceChannel', serviceUrl: site.booking } });
  for (const k of usedVideos) { const v = site.videos[k]; graph.push({ '@type': 'VideoObject', name: v.title, description: v.description, thumbnailUrl: v.poster, contentUrl: v.file, uploadDate: site.uploadDate, duration: v.duration, inLanguage: 'it' }); }
  const jsonld = `<script type="application/ld+json">\n${JSON.stringify(absDeep({ '@context': 'https://schema.org', '@graph': graph }), null, 1)}\n</script>`;

  const robots = meta.noindex || !LIVE
    ? '<!-- Finché il sito non ha il dominio definitivo resta fuori da Google. Al go-live: node scripts/build.mjs --site-url https://dominio -->\n<meta name="robots" content="noindex, nofollow">'
    : '<meta name="robots" content="index, follow, max-image-preview:large">' + `\n<link rel="canonical" href="${SITE_URL}${path}">\n<meta property="og:url" content="${SITE_URL}${path}">`;

  const navlinks = site.nav.map((n) => `      <a class="nav__link" href="${n.href}"${meta.nav === n.key ? ' aria-current="page"' : ''}>${n.label}</a>`).join('\n');
  const footlinks = site.nav.map((n) => `      <a href="${n.href}">${n.label}</a>`).join('\n');
  const preload = (meta.preload || []).map((p) => `<link rel="preload" href="${p}" as="image" type="image/webp">`).join('\n');

  const vars = {
    title: esc(meta.title), description: esc(meta.description), ogTitle: esc(meta.ogTitle || meta.title),
    themeColor: site.themeColor, locale: site.locale, name: esc(site.name), booking: site.booking, ogImage: abs(site.ogImage),
    key: meta.nav || meta.file
  };
  const raws = { robots, jsonld, navlinks, footlinks, main, preload };
  let out = layout.replace(/\{\{\{(\w+)\}\}\}/g, (_m, k) => (k in raws ? raws[k] : ''))
                  .replace(/\{\{(\w+)\}\}/g, (_m, k) => (k in vars ? vars[k] : ''));
  writeFileSync(join(root, 'public', meta.file + '.html'), out);
  pages.push({ ...meta, out });

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
console.log(`${pages.length} pagine generate (${LIVE ? 'LIVE ' + SITE_URL : 'sviluppo, noindex'})`);
if (warnings.length) { console.warn('Avvisi:\n - ' + warnings.join('\n - ')); process.exitCode = 1; }
