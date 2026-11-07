// La scena: cinque ambienti collegati da una sola protagonista (le foto vere di Naomi, ritagliate e portate sui tre colori
// del marchio) e da oggetti 3D. Tutto è una funzione di `pos` (0 → 4, la posizione nel percorso) e del tempo: scorrendo
// all'indietro la sequenza si riavvolge identica.
import {
  createGL, texFromBitmap, M, PAL, mixc, sphere, cyl, torus, box, bag, extrude, halfDisc, rrect, helix, lathe, smooth, sweep, leaf, upload,
} from './engine.js';

const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lin = (a, b, x) => cl((x - a) / (b - a));
const sm = (a, b, x) => { const t = lin(a, b, x); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const eo = (t) => 1 - Math.pow(1 - t, 3);
const pop = (t) => { t = cl(t); const c1 = 1.9, c3 = c1 + 1; return t <= 0 ? 0 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };

export const PHASES = 5;
const FOV = 28 * Math.PI / 180, TANH = Math.tan(FOV / 2);
// per ogni posa: altezza in unità-mondo e punto in cui va la cima della testa (x, y)
const FIG = [
  { k: 'p1', h: 4.1, ax: 0.0, ay: 2.0 },
  { k: 'p2', h: 4.0, ax: 0.7, ay: 1.85 },
  { k: 'p3', h: 4.0, ax: -0.45, ay: 1.6 },
  { k: 'p4', h: 3.3, ax: 0.7, ay: 0.95 },
  { k: 'p5', h: 3.2, ax: 0.0, ay: 1.45 },
];
const NEEDW = [1.55, 2.3, 2.2, 2.2, 1.7]; // metà larghezza minima in mondo (su telefono)
const NEEDH = [3.75, 3.6, 3.5, 3.3, 3.1]; // metà altezza visibile: la figura sta nella parte alta, il testo sotto

export async function createScene(canvas, { base = '' } = {}) {
  const C = createGL(canvas); if (!C) return null;
  const { gl, P } = C;

  /* ---------- risorse ---------- */
  const load = async (u) => { const r = await fetch(base + u); if (!r.ok) throw new Error(u); return createImageBitmap(await r.blob(), { premultiplyAlpha: 'premultiply' }); };
  const fig = JSON.parse(await (await fetch(base + 'img/figures.json')).text());
  const T = {};
  await Promise.all([
    ...['p1', 'p2', 'p3', 'p4', 'p5'].map(async (k) => { T[k] = texFromBitmap(gl, await load(`img/${k}.webp`)); }),
    ...['gnocchetti', 'spatzle', 'spaghetti', 'mezze', 'insalata', 'salmone'].map(async (k) => { T['d-' + k] = texFromBitmap(gl, await load(`img/d-${k}.webp`)); }),
    (async () => { T.tesi = texFromBitmap(gl, await load('img/tesi.webp')); })(),
  ]);
  try { await document.fonts.load('italic 300 200px "Cormorant Garamond"'); await document.fonts.load('400 40px "DM Sans"'); } catch (e) { /* font di riserva */ }
  const cv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return texFromBitmap(gl, c, { mip: true, premul: true }); };
  const css = (c, a = 1) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;
  const MOC = PAL.mocha, SAN = PAL.sand;
  // titoli giganti dietro la protagonista
  const TITLES = ['Percorso', 'Spesa', 'Cucina', 'Energia', 'Scienza'];
  TITLES.forEach((w, i) => { T['t' + i] = cv(2048, 640, (g, W, H) => { g.fillStyle = '#fff'; g.font = 'italic 300 460px "Cormorant Garamond", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(w, W / 2, H / 2 + 20); }); });
  // schede delle pubblicazioni e grafici (testo vero, dati d'esempio dichiarati)
  const paper = (kicker, title, lines) => cv(560, 740, (g, W, H) => {
    g.fillStyle = css(PAL.sandL); g.fillRect(0, 0, W, H);
    g.strokeStyle = css(PAL.tan, .8); g.lineWidth = 3; g.strokeRect(14, 14, W - 28, H - 28);
    g.fillStyle = css(PAL.pink); g.fillRect(44, 56, 46, 8);
    g.fillStyle = css(MOC); g.font = '500 24px "DM Sans", sans-serif'; g.fillText(kicker, 44, 110);
    g.font = '500 64px "Cormorant Garamond", Georgia, serif'; title.split('\n').forEach((t, i) => g.fillText(t, 44, 190 + i * 66));
    g.fillStyle = css(MOC, .28); for (let i = 0; i < lines; i++) g.fillRect(44, 360 + i * 38, (W - 88) * (i % 3 === 2 ? .55 : 1 - (i % 2) * .12), 11);
  });
  T.paper0 = paper('LINEE GUIDA', 'Nutrizione\nclinica', 9);
  T.paper1 = paper('REVISIONE SISTEMATICA', 'Dieta e\ncomposizione\ncorporea', 7);
  T.paper2 = paper('PROTOCOLLO ISAK', 'Pliche,\ncirconferenze,\ndiametri', 7);
  T.chart = cv(720, 520, (g, W, H) => {
    g.fillStyle = css(PAL.sandL); g.fillRect(0, 0, W, H); g.strokeStyle = css(PAL.tan, .8); g.lineWidth = 3; g.strokeRect(12, 12, W - 24, H - 24);
    g.fillStyle = css(MOC); g.font = '500 26px "DM Sans", sans-serif'; g.fillText('MACRONUTRIENTI', 44, 66);
    g.font = '500 20px "DM Sans", sans-serif'; g.fillStyle = css(MOC, .6); g.fillText('esempio illustrativo', 44, 96);
    const segs = [[.5, PAL.mocha], [.3, PAL.tan], [.2, PAL.pink]]; let a0 = -Math.PI / 2; const cx = 210, cy = 300, R = 120;
    segs.forEach(([f, c]) => { const a1 = a0 + f * Math.PI * 2; g.beginPath(); g.arc(cx, cy, R, a0, a1 - 0.03); g.strokeStyle = css(c); g.lineWidth = 46; g.stroke(); a0 = a1; });
    g.fillStyle = css(MOC); g.font = 'italic 400 54px "Cormorant Garamond", Georgia, serif'; g.textAlign = 'center'; g.fillText('50·30·20', cx, cy + 16); g.textAlign = 'left';
    g.font = '500 22px "DM Sans", sans-serif'; [['Carboidrati', PAL.mocha], ['Proteine', PAL.tan], ['Grassi', PAL.pink]].forEach(([t, c], i) => { g.fillStyle = css(c); g.fillRect(400, 220 + i * 54, 26, 26); g.fillStyle = css(MOC); g.fillText(t, 440, 242 + i * 54); });
  });

  /* ---------- geometrie ---------- */
  const up = (g) => upload(gl, g);
  const faceZ = (g) => { for (let i = 0; i < g.pos.length; i += 3) { const y = g.pos[i + 1], z = g.pos[i + 2]; g.pos[i + 1] = -z; g.pos[i + 2] = y; const ny = g.nor[i + 1], nz = g.nor[i + 2]; g.nor[i + 1] = -nz; g.nor[i + 2] = ny; } return g; };
  const G = {
    sphere: up(sphere(28)), box: up(box()), cyl: up(cyl(40)), torus: up(torus(1, 0.22, 48, 14)), ring: up(torus(1, 0.035, 72, 8)), ringT: up(torus(1, 0.09, 48, 10)),
    apple: up(lathe(smooth([[0, -0.88], [0.45, -0.86], [0.88, -0.45], [1, 0.1], [0.82, 0.65], [0.42, 0.86], [0.14, 0.7], [0, 0.72]], 5), 30)),
    carrot: up(lathe(smooth([[0, -1.55], [0.06, -1.4], [0.24, -0.5], [0.37, 0.5], [0.4, 0.82], [0, 0.86]], 5), 22)),
    avocado: up(lathe(smooth([[0, -1], [0.5, -0.95], [0.85, -0.5], [0.72, 0.1], [0.48, 0.62], [0.32, 0.95], [0, 1.02]], 5), 28)),
    bottle: up(lathe([[0, -1], [0.55, -1], [0.55, -1], [0.6, -0.92], [0.6, 0.25], [0.5, 0.45], [0.28, 0.62], [0.18, 0.74], [0.17, 1.1], [0.17, 1.1], [0.22, 1.12], [0.22, 1.28], [0, 1.28]], 36)),
    jar: up(lathe([[0, -1], [0.8, -1], [0.8, -1], [0.82, -0.94], [0.82, 0.72], [0.82, 0.72], [0.7, 0.8], [0.7, 0.86], [0, 0.86]], 36)),
    lid: up(lathe([[0, 0], [0.86, 0], [0.86, 0], [0.86, 0.22], [0.86, 0.22], [0, 0.22]], 36)),
    bowl: up(lathe([[0, 0], [0.34, 0], [0.62, 0.08], [0.88, 0.3], [1, 0.66], [1, 0.66], [0.93, 0.66], [0.82, 0.38], [0.58, 0.18], [0.3, 0.14], [0, 0.14]], 40)),
    plate: up(lathe([[0, 0], [0.55, 0], [0.8, 0.02], [1, 0.1], [1, 0.1], [0.97, 0.12], [0.78, 0.07], [0.5, 0.05], [0, 0.05]], 44)),
    shaker: up(lathe([[0, -1], [0.56, -1], [0.56, -1], [0.6, -0.92], [0.7, 0.56], [0.7, 0.56], [0, 0.56]], 40)),
    shakerTop: up(lathe([[0, 0], [0.74, 0], [0.74, 0], [0.74, 0.16], [0.66, 0.5], [0.5, 0.62], [0.3, 0.66], [0, 0.66]], 40)),
    capsule: up(lathe(smooth([[0, -1], [0.45, -0.92], [0.5, -0.5], [0.5, 0.5], [0.45, 0.92], [0, 1]], 4), 20)),
    drop: up(lathe(smooth([[0, -0.9], [0.38, -0.7], [0.55, -0.2], [0.35, 0.5], [0.12, 0.95], [0, 1.1]], 4), 20)),
    leafG: up(faceZ(leaf(1.4, 0.7, 18, 8, 0.45, 0.35))), leafBig: up(faceZ(leaf(2.4, 1.0, 22, 10, 0.5, 0.5))),
    wedge: up(extrude(halfDisc(0.5, 30), 0.1)), tray: up(extrude(rrect(1.2, 0.5, 0.2), 0.08)),
    bagBody: up(bag(0.55, 0.62, 0.3, 0.34)), handle: up(sweep(Array.from({ length: 15 }, (_, i) => { const a = Math.PI * i / 14; return [Math.cos(a) * 0.3, Math.sin(a) * 0.55, 0]; }), Array(15).fill(0.028), 8)),
    wheat: up(sweep(Array.from({ length: 10 }, (_, i) => [Math.sin(i * 0.12) * 0.1, i * 0.2, 0]), Array(10).fill(0.018), 6)),
    stem: up(sweep(Array.from({ length: 8 }, (_, i) => [0, i * 0.12, Math.sin(i * 0.5) * 0.03]), Array(8).fill(0.05), 8)),
    arm: up(sweep(Array.from({ length: 16 }, (_, i) => { const a = -0.3 + i * 0.12; return [Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0]; }), Array(16).fill(0.09), 10)),
    helixA: up(helix(2.2, 0.42, 3.0, 80, 0)), helixB: up(helix(2.2, 0.42, 3.0, 80, Math.PI)),
    whisk: up(sweep(Array.from({ length: 12 }, (_, i) => { const t = i / 11, a = t * Math.PI; return [Math.sin(a) * 0.32, 0.62 - t * 0.62, 0]; }), Array(12).fill(0.012), 5)),
  };
  const defM = { spec: 0.14, shin: 26, rim: 0.7 };

  /* ---------- stato ---------- */
  const S = { w: 1, h: 1, dpr: 1, asp: 1.6, mobile: false };
  const vp = new Float32Array(16);
  let eye = [0, 0, 10];
  const FOGC = [0.93, 0.9, 0.86];

  const bgU = (n) => gl.getUniformLocation(P.bg.p, n);
  // matrici
  function mvpQuad(x, y, z, w, h, rz = 0) { return M.mul(vp, M.chain(M.T(x, y, z), M.Rz(rz), M.S(w, h, 1))); }

  /* ---------- disegno ---------- */
  function setMesh(m, col, o = {}) {
    const u = P.mesh.u;
    gl.uniformMatrix4fv(u.uM, false, m); gl.uniform3fv(u.uCol, col);
    gl.uniform4f(u.uP, o.spec ?? defM.spec, o.shin ?? defM.shin, o.rim ?? defM.rim, 0);
    gl.uniform1f(u.uAlpha, o.alpha ?? 1);
    gl.uniform3fv(u.uGlow, o.glow || [0, 0, 0]);
  }
  function mesh(g, m, col, o) { setMesh(m, col, o); gl.bindVertexArray(g.vao); gl.drawElements(gl.TRIANGLES, g.n, gl.UNSIGNED_INT, 0); }
  function quadFX(kind, x, y, z, w, h, col, alpha, o = {}) {
    if (alpha <= 0.002) return;
    const u = P.fx.u;
    gl.uniformMatrix4fv(u.uMVP, false, mvpQuad(x, y, z, w, h, o.rz || 0));
    gl.uniform1f(u.uKind, kind); gl.uniform1f(u.uAlpha, alpha); gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uA, o.a ?? 2); gl.uniform1f(u.uB, o.b ?? 1); gl.uniform1f(u.uC, o.c ?? 0);
    gl.uniform3fv(u.uCol, col); gl.uniform3fv(u.uCol2, o.col2 || col);
    gl.bindVertexArray(C.qv); gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function quadTex(tx, x, y, z, w, h, o = {}) {
    const a = o.alpha ?? 1; if (a <= 0.002) return;
    const u = P.tex.u;
    gl.uniformMatrix4fv(u.uMVP, false, mvpQuad(x, y, z, w, h, o.rz || 0));
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx.t); gl.uniform1i(u.uTex, 0);
    gl.uniform1f(u.uAlpha, a); gl.uniform1f(u.uMode, o.mode ?? 0); gl.uniform1f(u.uBias, o.bias ?? 0);
    gl.uniform1f(u.uPIn, o.pIn ?? 1); gl.uniform1f(u.uPOut, o.pOut ?? 0); gl.uniform1f(u.uAsp, w / h);
    gl.uniform3fv(u.uTint, o.tint || [1, 1, 1]); gl.uniform3fv(u.uPink, PAL.pink); gl.uniform3fv(u.uRim, o.rim || PAL.sandL); gl.uniform2f(u.uRes, S.w, S.h);
    gl.bindVertexArray(C.qv); gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  const TXM = (col) => ({ mode: 4, tint: col });

  /* ---------- particelle ---------- */
  const NP = 190, pa = new Float32Array(NP * 4), pb = new Float32Array(NP * 4);
  const PS = Array.from({ length: NP }, () => ({ x: rnd(), y: rnd(), z: rnd(), s: rnd(), ph: rnd() * 6.28, k: rnd(), sp: 0.4 + rnd() }));

  /* ---------- tempo & finestre ---------- */
  let time = 0;
  // 0 → 1 → 0 attorno al passo i: visibile da -0.78 a +0.78
  const phv = (i, pos) => { const d = pos - i; return sm(-0.8, -0.3, d) * (1 - sm(0.3, 0.8, d)); };
  const phIn = (i, pos) => lin(-0.78, -0.22, pos - i);
  const phOut = (i, pos) => lin(0.22, 0.78, pos - i);

  /* ---------- ambienti: colori di fondo per fase (tutti miscele dei tre colori) ---------- */
  const ENV = [
    { top: mixc(PAL.sand, PAL.sandL, 0.55), bot: PAL.sand, glow: PAL.sandL, glowK: 0.8, vig: PAL.tan, vigK: 0.28, gp: [0.5, 0.62], dark: 0 },
    { top: mixc(PAL.sand, PAL.sandL, 0.35), bot: mixc(PAL.sand, PAL.tan, 0.35), glow: PAL.sandL, glowK: 0.6, vig: PAL.tan, vigK: 0.3, gp: [0.55, 0.6], dark: 0 },
    { top: mixc(PAL.sand, PAL.tan, 0.2), bot: mixc(PAL.sand, PAL.tan, 0.55), glow: PAL.sandL, glowK: 0.55, vig: PAL.khaki, vigK: 0.3, gp: [0.45, 0.62], dark: 0 },
    { top: mixc(PAL.mocha, PAL.tan, 0.42), bot: mixc(PAL.mocha, PAL.tan, 0.04), glow: mixc(PAL.tan, PAL.pink, 0.1), glowK: 0.5, vig: PAL.mocha, vigK: 0.6, gp: [0.6, 0.5], dark: 1 },
    { top: PAL.sandL, bot: mixc(PAL.sand, PAL.sandL, 0.4), glow: [1, 1, 1], glowK: 0.5, vig: PAL.tan, vigK: 0.22, gp: [0.5, 0.65], dark: 0 },
  ];

  /* ---------- camera / layout ---------- */
  function layout(pos) {
    const wts = Array.from({ length: PHASES }, (_, i) => 1 - sm(0.2, 0.8, Math.abs(pos - i)));
    const sum = wts.reduce((a, b) => a + b, 0) || 1;
    return wts.map((w) => w / sum);
  }
  const mix3 = (arr, w) => [0, 1, 2].map((c) => arr.reduce((a, v, i) => a + v[c] * w[i], 0));

  let ptr = [0, 0], ptrS = [0, 0];

  function render(pos, t, pointer = [0, 0], intro = 1) {
    time = t; pos = cl(pos, 0, PHASES - 1);
    ptrS[0] += (pointer[0] - ptrS[0]) * 0.05; ptrS[1] += (pointer[1] - ptrS[1]) * 0.05;
    const w = layout(pos);
    const need = NEEDW.reduce((a, v, i) => a + v * w[i], 0);
    const needH = NEEDH.reduce((a, v, i) => a + v * w[i], 0);
    let dist = 10;
    if (S.asp < 1.25) dist = Math.max(10, need / (S.asp * TANH), S.mobile ? needH / TANH : 0);
    dist *= lerp(1.25, 1, eo(intro)); // dolly d'ingresso
    const Hv = TANH * dist, Wv = Hv * S.asp;
    const yaw = [0, -0.07, 0.05, -0.08, 0.04].reduce((a, v, i) => a + v * w[i], 0) + ptrS[0] * 0.06;
    const ty = S.mobile ? -0.3 * Hv : 0;
    const camY = ty + [0.1, 0.0, 0.25, -0.1, 0.15].reduce((a, v, i) => a + v * w[i], 0) + ptrS[1] * -0.12;
    eye = [Math.sin(yaw) * dist, camY + 0.0, Math.cos(yaw) * dist];
    const view = M.look(eye, [0, ty, 0]);
    const proj = M.persp(FOV, S.asp, 0.5, 80);
    vp.set(M.mul(proj, view));
    // unità per i layout: su telefono i lati si stringono
    const kx = S.mobile ? Math.min(1, Wv / 4.2) * 0.9 : 1;
    const R = { Wv, Hv, kx, ty, dist };

    gl.viewport(0, 0, S.w, S.h);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.depthMask(true);
    gl.clearColor(0.94, 0.9, 0.86, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // ---- sfondo
    const env = (k) => mix3(ENV.map((e) => e[k]), w);
    const envs = (k) => ENV.reduce((a, e, i) => a + e[k] * w[i], 0);
    const envA = (k, idx) => ENV.reduce((a, e, i) => a + e.gp[idx] * w[i], 0);
    gl.useProgram(P.bg.p); const U = P.bg.u;
    gl.uniform3fv(U.uTop, env('top')); gl.uniform3fv(U.uBot, env('bot')); gl.uniform3fv(U.uGlow, env('glow')); gl.uniform3fv(U.uVig, env('vig'));
    gl.uniform2f(U.uGlowPos, envA('gp', 0), envA('gp', 1)); gl.uniform1f(U.uGlowK, envs('glowK')); gl.uniform1f(U.uAsp, S.asp); gl.uniform1f(U.uTime, t); gl.uniform1f(U.uVigK, envs('vigK'));
    gl.bindVertexArray(C.bv); gl.drawArrays(gl.TRIANGLES, 0, 3);
    const dark = envs('dark');
    const FOGM = mixc(FOGC, mixc(PAL.mocha, PAL.tan, 0.3), dark);

    // ---- passaggio opaco: oggetti 3D
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.useProgram(P.mesh.p); const mu = P.mesh.u;
    gl.uniformMatrix4fv(mu.uVP, false, vp); gl.uniform3fv(mu.uEye, eye);
    gl.uniform3fv(mu.uShadow, mixc([0.66, 0.6, 0.52], [0.5, 0.44, 0.4], dark)); gl.uniform3fv(mu.uLight, mixc([1.06, 1.02, 0.97], [1.1, 1.0, 0.92], dark));
    gl.uniform3fv(mu.uFogC, FOGM); gl.uniform2f(mu.uFog, dist * 0.9, dist * 2.2);
    world.opaque(pos, t, R, w);

    // ---- passaggio traslucido (da lontano a vicino)
    gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(P.fx.p);
    world.backdrops(pos, t, R, w);
    gl.useProgram(P.tex.p);
    world.titles(pos, t, R, w);
    world.mid(pos, t, R, w);
    world.figures(pos, t, R, w, intro);
    world.front(pos, t, R, w);
    // particelle
    drawParticles(pos, t, R, w, dark);
    gl.depthMask(true); gl.disable(gl.BLEND);
  }

  function drawParticles(pos, t, R, w, dark) {
    const pinkK = [0.28, 0.12, 0.16, 0.5, 0.1].reduce((a, v, i) => a + v * w[i], 0);
    const speed = [0.04, 0.05, 0.09, 0.42, 0.03].reduce((a, v, i) => a + v * w[i], 0);
    const sizeK = [1, 0.8, 0.9, 1.1, 0.8].reduce((a, v, i) => a + v * w[i], 0);
    const lightC = mixc(PAL.mocha, PAL.sandL, dark), spread = R.Wv;
    for (let i = 0; i < NP; i++) {
      const p = PS[i];
      const yy = ((p.y + t * speed * p.sp * 0.25 + pos * 0.18 * p.sp) % 1 + 1) % 1;
      const x = (p.x - 0.5) * 2 * spread * 1.05 + Math.sin(t * 0.4 * p.sp + p.ph) * 0.25;
      const y = R.ty + (yy - 0.5) * 2 * R.Hv * 1.1;
      const z = (p.z - 0.5) * 6 + 0.5;
      const near = Math.abs(z); if (z > 0.2 && Math.abs(x) < R.Wv * 0.38 && !S.mobile) { pa.set([x, y, -3, 0], i * 4); pb.set([0, 0, 0, 0], i * 4); continue; }
      const size = (0.05 + p.s * 0.1) * sizeK * (1 + near * 0.35);
      const pink = p.k < pinkK;
      const c = pink ? PAL.pink : lightC;
      const a = (pink ? 0.7 : 0.32 + dark * 0.15) * (near > 2 ? 0.5 : 1) * (0.5 + 0.5 * Math.sin(t * 0.8 + p.ph));
      pa.set([x, y, z, size * 80], i * 4); pb.set([c[0], c[1], c[2], a], i * 4);
    }
    gl.useProgram(P.pt.p);
    gl.uniformMatrix4fv(P.pt.u.uVP, false, vp); gl.uniform1f(P.pt.u.uPx, S.h * 0.5 / TANH * 0.0125 * 1.0);
    gl.uniform1f(P.pt.u.uSoft, 0.55);
    gl.bindVertexArray(C.pv);
    gl.bindBuffer(gl.ARRAY_BUFFER, C.pa); gl.bufferData(gl.ARRAY_BUFFER, pa, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, C.pb); gl.bufferData(gl.ARRAY_BUFFER, pb, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.POINTS, 0, NP);
  }

  /* =====================================================================================================
     I MONDI
     ===================================================================================================== */
  const world = { opaque() {}, backdrops() {}, titles() {}, mid() {}, figures() {}, front() {} };
  const hooks = { opaque: [], backdrops: [], titles: [], mid: [], figures: [], front: [] };
  for (const k of Object.keys(hooks)) world[k] = (...a) => hooks[k].forEach((f) => f(...a));
  const ctxObj = { gl, P, G, T, PAL, mesh, quadFX, quadTex, TXM, M, cl, lin, sm, lerp, eo, pop, phv, phIn, phOut, FIG, fig, hooks, S, css, mixc, rnd, get time() { return time; } };
  const { addWorlds } = await import('./worlds.js');
  addWorlds(ctxObj);

  function resize(w, h, dpr) {
    S.dpr = dpr; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    S.w = canvas.width; S.h = canvas.height; S.asp = w / h; S.mobile = S.asp < 0.9;
  }
  return { render, resize, S, destroy() { const e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); } };
}
