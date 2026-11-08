// Collega lo scorrimento della pagina alla scena: pos va da 0 (apertura) a 4 (scienza e formazione).
import { createScene } from './scene.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const body = document.body, story = $('#percorso'), canvas = $('#gl');
const phases = $$('.phase'), rail = $$('.rail a'), hint = $('.hint');
const params = new URLSearchParams(location.search);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = !!(navigator.connection && navigator.connection.saveData);
const lowMem = !!(navigator.deviceMemory && navigator.deviceMemory <= 2);
const wantLive = (params.has('live') || (!reduce && !saveData && !lowMem)) && !params.has('static');
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const STEPS = phases.length - 1;

function fallback(why) {
  if (why) console.info('Versione statica:', why);
  body.classList.remove('is-live', 'is-loading'); body.classList.add('no-live');
  phases.forEach((p) => { p.style.opacity = ''; p.style.visibility = ''; const c = $('.copy', p); if (c) { c.style.transform = ''; c.style.pointerEvents = ''; } });
  rail.forEach((a) => a.addEventListener('click', () => { }));
}

async function start() {
  if (!wantLive) return fallback('riduci movimento / risparmio dati');
  body.classList.add('is-live');
  let scene = null;
  try { scene = await createScene(canvas, { base: new URL('../', import.meta.url).href }); } catch (e) { console.warn(e); }
  if (!scene) return fallback('WebGL non disponibile');
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); live = false; fallback('contesto WebGL perso'); });

  let live = true, cur = 0, target = 0, last = 0, t0 = performance.now(), introStart = null, quality = 1, slow = 0, frames = 0, forced = null;
  const ptr = [0, 0];
  const maxDpr = () => (matchMedia('(max-width: 860px)').matches ? 1.5 : 2);
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    scene.resize(w, h, Math.max(1, Math.min(devicePixelRatio || 1, maxDpr()) * quality));
  }
  addEventListener('resize', resize); resize();

  function measure() {
    const r = story.getBoundingClientRect(), total = r.height - innerHeight;
    target = cl(-r.top / Math.max(1, total), 0, 1) * STEPS;
  }
  addEventListener('scroll', measure, { passive: true }); measure();
  addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { ptr[0] = e.clientX / innerWidth * 2 - 1; ptr[1] = e.clientY / innerHeight * 2 - 1; } }, { passive: true });

  // posizioni di scorrimento delle fasi (per la navigazione e per la tastiera)
  const scrollFor = (i) => { const r = story.getBoundingClientRect(); const top = r.top + scrollY; return top + (i / STEPS) * (r.height - innerHeight); };
  const goTo = (i) => scrollTo({ top: scrollFor(i), behavior: reduce ? 'auto' : 'smooth' });
  $$('[data-go]').forEach((a) => a.addEventListener('click', (e) => { if (!body.classList.contains('is-live')) return; e.preventDefault(); goTo(+a.dataset.go); }));
  // se un link in una fase non visibile riceve il focus da tastiera, porto lì la scena
  phases.forEach((p, i) => p.addEventListener('focusin', () => { if (Math.abs(cur - i) > 0.4) scrollTo({ top: scrollFor(i), behavior: 'auto' }); }));
  $$('.brand[href="#fase-1"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); goTo(0); }));

  function captions() {
    let near = 0, nd = 9;
    phases.forEach((p, i) => {
      const d = cur - i, a = Math.abs(d), v = 1 - sm(0.1, 0.42, a);
      if (a < nd) { nd = a; near = i; }
      p.style.opacity = v.toFixed(3);
      p.classList.toggle('is-on', v > 0.02);
      const c = $('.copy', p);
      c.style.transform = `translate3d(0, ${((d > 0 ? -1 : 1) * (1 - v) * 28).toFixed(1)}px, 0)`;
      c.style.pointerEvents = v > 0.7 ? 'auto' : 'none';
    });
    rail.forEach((a, i) => { if (i === near) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
    body.classList.toggle('dark-on', Math.abs(cur - 3) < 0.5);
    if (hint) hint.style.opacity = String(1 - sm(0.02, 0.18, cur));
  }

  let running = false, visible = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }, { rootMargin: '10% 0px' }).observe(story);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  function kick() { if (!running && live) { running = true; last = performance.now(); requestAnimationFrame(frame); } }

  function frame(now) {
    if (!live || document.hidden || !visible) { running = false; return; }
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const tgt = forced ?? target;
    cur += (tgt - cur) * (forced != null ? 1 : 1 - Math.exp(-dt * 8));
    if (Math.abs(tgt - cur) < 0.0004) cur = tgt;
    let intro = 1;
    if (introStart != null) { intro = cl((now - introStart) / 2400); }
    try { scene.render(cur, (now - t0) / 1000, ptr, forced != null ? 1 : intro); } catch (e) { console.error(e); live = false; fallback('errore di disegno'); return; }
    captions();
    // se il dispositivo fatica, abbasso la risoluzione senza cambiare nulla del resto
    frames++; if (dt > 0.034) slow++; if (frames === 90) { if (slow > 40) { if (!scene.lower()) { if (quality > 0.6) { quality -= 0.2; resize(); } } } frames = 0; slow = 0; } // prima si spengono gli effetti più pesanti (profondità di campo, strisce), poi scende la risoluzione
    requestAnimationFrame(frame);
  }

  window.__story = {
    setPos(p) { forced = p; cur = p; if (!running) { running = true; last = performance.now(); } scene.render(p, (performance.now() - t0) / 1000, [0, 0], 1); captions(); },
    release() { forced = null; kick(); },
    scene,
  };
  // pronto: tolgo il caricamento e faccio partire l'ingresso della protagonista
  await (document.fonts ? document.fonts.ready : Promise.resolve());
  body.classList.remove('is-loading');
  introStart = performance.now() + 250;
  captions(); kick();
}
start();
