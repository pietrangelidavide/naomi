// Collega la scena allo scroll: la sezione resta ferma (sticky) mentre la pagina scorre, il progresso diventa il tempo T.
// Senza WebGL2, con «riduci movimento» o con il risparmio dati la sezione resta quella statica (immagini + testo).
import { createScene, T_END, BEATS, CHAPTER_SPLIT } from './scene.js';

const root = document.querySelector('[data-story]');
if (root) boot(root);

function boot(root) {
  const nav = navigator;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || (nav.connection && nav.connection.saveData)) return;
  const cv = root.querySelector('.story__cv'), stage = root.querySelector('.story__stage'), track = root.querySelector('.story__track');
  let scene;
  try { scene = createScene(cv); } catch (e) { return; }

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const beats = [...root.querySelectorAll('.beat')];
  const idx = [...root.querySelectorAll('.story__idx span')];
  const tags = [...root.querySelectorAll('.tag')].map((el) => ({ el, id: el.dataset.tag, side: +el.dataset.side || 1, w: 0 }));
  const bars = [...root.querySelectorAll('.story__idx i')];
  const cue = root.querySelector('.story__cue');
  const cta = root.querySelector('.beat .btn');
  const header = document.querySelector('.top');

  root.classList.add('is-live');
  let W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 2), hh = 0;
  const layoutFor = (w, h) => (w >= 900
    ? { cx: w * 0.69, cy: h * 0.52, w: w * 0.56, h: h * 0.88 }
    : { cx: w / 2, cy: h * 0.3, w: w * 0.98, h: h * 0.5 });
  function measure() {
    hh = header ? header.getBoundingClientRect().height : 0;
    root.style.setProperty('--hh', hh + 'px');
    W = stage.clientWidth; H = stage.clientHeight;
    if (!W || !H) return;
    scene.resize(W, H, dpr, layoutFor(W, H));
    tags.forEach((t) => { t.w = t.el.offsetWidth; t.h = t.el.offsetHeight; });
    dirty = true;
  }

  let lock = false, target = 0, cur = 0, dirty = true, visible = false, raf = 0, last = 0, lastDraw = 0, clock = 0, slow = 0, frames = 0, T = 0;
  function readTarget() {
    if (lock) return target;
    const r = track.getBoundingClientRect(), total = r.height - stage.clientHeight;
    return total > 0 ? clamp((hh - r.top) / total) * T_END : 0;
  }

  function paint(now) {
    scene.render(T, clock);
    const st = scene.state, pxu = st.pxu || 100;
    // tag d'ingrediente: seguono l'oggetto e si dissolvono quando entra nel vaso
    for (const t of tags) {
      const s = st.tags[t.id];
      if (!s || s.v < 0.01) { if (t.on) { t.el.style.opacity = '0'; t.on = false; } continue; }
      const [px, py] = scene.project(s.p);
      const gap = Math.max(0.32 * pxu, 24) + t.w * 0.5;
      const x = px + t.side * gap - t.w / 2, y = py - t.h / 2 - 0.1 * pxu;
      t.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${(t.side * -3.5).toFixed(1)}deg)`;
      t.el.style.opacity = s.v.toFixed(3); t.on = true;
    }
    // testi
    const F = 0.16;
    beats.forEach((b, i) => {
      const [a, e] = BEATS[i];
      const vin = i === 0 ? 1 : sm(a, a + F, T), vout = i === beats.length - 1 ? 1 : 1 - sm(e - F, e, T);
      const v = vin * vout, dir = T < (a + e) / 2 ? 1 : -1;
      b.style.opacity = v.toFixed(3);
      b.style.transform = v > 0.999 ? 'none' : `translate3d(0,${(dir * (1 - v) * 22).toFixed(1)}px,0)`;
      b.style.filter = v > 0.999 ? 'none' : `blur(${((1 - v) * 7).toFixed(1)}px)`;
      b.classList.toggle('on', v > 0.6);
    });
    if (idx[0]) { idx[0].classList.toggle('is-on', T < CHAPTER_SPLIT); idx[1].classList.toggle('is-on', T >= CHAPTER_SPLIT); }
    stage.style.setProperty('--k', sm(2.85, 3.5, T).toFixed(3));
    if (bars[0]) bars[0].style.transform = `scaleX(${clamp(T / CHAPTER_SPLIT).toFixed(3)})`;
    if (bars[1]) bars[1].style.transform = `scaleX(${clamp((T - CHAPTER_SPLIT) / (T_END - CHAPTER_SPLIT)).toFixed(3)})`;
    if (cue) cue.style.opacity = (1 - sm(0.02, 0.3, T)).toFixed(2);
  }

  function tick(now) {
    raf = 0;
    if (!visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016; last = now;
    clock += dt; target = readTarget();
    const d = target - cur;
    cur = Math.abs(d) < 0.0004 ? target : cur + d * (1 - Math.exp(-dt * 9));
    const moving = cur !== T || dirty;
    // da fermo la scena respira appena (onda del liquido): basta a 30 fps
    if (moving || now - lastDraw > 33) {
      const t0 = performance.now();
      T = cur; paint(now); dirty = false; lastDraw = now;
      // se il dispositivo fatica, scendo di risoluzione
      if (moving && ++frames > 12) { const ms = performance.now() - t0; slow = slow * 0.9 + ms * 0.1; if (slow > 14 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); slow = 0; frames = 0; measure(); } }
    }
    raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(tick); };

  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) { last = 0; dirty = true; kick(); } }, { rootMargin: '10% 0px' }).observe(track);
  new ResizeObserver(measure).observe(stage);
  addEventListener('scroll', kick, { passive: true });
  document.addEventListener('visibilitychange', kick);
  // per chi naviga da tastiera: il pulsante finale si raggiunge portando la pagina alla fine della sequenza
  if (cta) cta.addEventListener('focus', () => {
    if (T < T_END - 0.7) { const r = track.getBoundingClientRect(); scrollTo({ top: scrollY + r.bottom - innerHeight + 1, behavior: 'auto' }); }
  });
  // se il contesto grafico si perde (iPhone con tante schede), torno alla versione statica
  cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); root.classList.remove('is-live'); cancelAnimationFrame(raf); visible = false; });

  measure();
  if (location.search.includes('storydebug')) window.__story = { scene, setT: (t) => { lock = true; target = t; cur = t; T = t; dirty = true; paint(0); }, get T() { return T; } };
  // il font dei titoli può arrivare dopo: rimisuro le tessere dei tag
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
}
