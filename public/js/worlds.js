// Gli oggetti dei cinque ambienti e la loro coreografia. Ogni funzione dipende solo da pos (0 → 4) e dal tempo.
export function addWorlds(X) {
  const { G, T, PAL, mesh: mesh0, quadFX, quadTex, TXM, M, cl, lin, sm, lerp, eo, pop, phv, phIn, phOut, FIG, fig, hooks, mixc } = X;
  // gli oggetti che fluttuano non devono buttare ombre sul viso: noSh li esclude dalla mappa delle ombre
  let noSh = false;
  const mesh = (g, m, col, o) => mesh0(g, m, col, noSh ? { ...(o || {}), noShadow: true } : o);
  const Mx = (x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => M.chain(M.T(x, y, z), M.Ry(ry), M.Rx(rx), M.Rz(rz), M.S(sx, sy, sz));
  const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const bez = (a, b, c, t) => [0, 1, 2].map((i) => (1 - t) * (1 - t) * a[i] + 2 * (1 - t) * t * b[i] + t * t * c[i]);
  const C = PAL; const LEAF = mixc(PAL.khaki, PAL.sand, 0.3), LEAF2 = mixc(PAL.olive, PAL.sand, 0.25);
  const glossy = { spec: 0.5, shin: 60, rim: 0.9 }, matte = { spec: 0.05, shin: 12, rim: 0.5 };
  const { MAT } = X;
  // colori veri degli oggetti: cibo, legno, acciaio, ceramica, libri. Il marchio (lime, bordeaux, rosso) resta su sfondo, grafica e accenti.
  const K = {
    gold: [0.86, 0.66, 0.26], steel: [0.78, 0.8, 0.84], darkSteel: [0.22, 0.23, 0.26], black: [0.06, 0.06, 0.07],
    red: [0.84, 0.1, 0.06], tomato: [0.86, 0.12, 0.07], cherry: [0.56, 0.03, 0.08], apple: [0.74, 0.1, 0.07], lemon: [0.97, 0.83, 0.12], orange: [0.97, 0.52, 0.1], lime: [0.5, 0.75, 0.16],
    carrot: [0.95, 0.47, 0.08], carrotTop: [0.2, 0.5, 0.15], broc: [0.12, 0.36, 0.12], brocStem: [0.52, 0.68, 0.32], avoc: [0.17, 0.27, 0.12], avocFlesh: [0.76, 0.83, 0.34],
    egg: [0.94, 0.88, 0.76], bread: [0.79, 0.5, 0.2], breadCut: [0.93, 0.79, 0.5], wheat: [0.9, 0.72, 0.34], spinach: [0.1, 0.42, 0.12], leaf2: [0.22, 0.54, 0.15],
    salmon: [0.98, 0.5, 0.36], fat: [1, 0.87, 0.79], melon: [0.92, 0.16, 0.2], rind: [0.1, 0.4, 0.16], oil: [0.12, 0.3, 0.1], almond: [0.64, 0.42, 0.24],
    banana: [0.98, 0.85, 0.18], blueberry: [0.19, 0.21, 0.46], milk: [0.97, 0.97, 0.98], water: [0.55, 0.8, 0.95], cereal: [0.8, 0.6, 0.32], batter: [0.92, 0.82, 0.52],
    wood: [0.8, 0.62, 0.4], woodD: [0.46, 0.3, 0.18], walnut: [0.38, 0.24, 0.14], kraft: [0.78, 0.6, 0.38], cabinet: [0.15, 0.29, 0.21], marble: [0.95, 0.94, 0.91], porcelain: [0.97, 0.96, 0.93],
    terracotta: [0.78, 0.4, 0.23], cream: [0.93, 0.89, 0.8], cork: [0.72, 0.54, 0.34], pot: [0.76, 0.78, 0.82], pan: [0.14, 0.14, 0.15], rubber: [0.07, 0.07, 0.08], birch: [0.84, 0.7, 0.48], shaker: [0.93, 0.95, 0.98],
    book: [[0.46, 0.1, 0.13], [0.11, 0.2, 0.4], [0.84, 0.63, 0.16], [0.12, 0.34, 0.22]], page: [0.96, 0.93, 0.85],
    C: [0.22, 0.22, 0.25], O: [0.86, 0.1, 0.1], N: [0.22, 0.32, 0.92], H: [0.95, 0.95, 0.95], dnaA: [0.16, 0.38, 0.8], dnaB: [0.82, 0.16, 0.2],
  };
  const ORG = { spec: 0.22, shin: 28, rim: 0.6, mat: MAT.organic }, ORGG = { spec: 0.38, shin: 60, rim: 0.8, mat: MAT.organic };
  const WOODM = { spec: 0.14, shin: 22, rim: 0.5, mat: MAT.wood }, STEELM = { spec: 0.8, shin: 100, rim: 1, mat: MAT.metal }, GOLDM = { spec: 0.8, shin: 80, rim: 1, mat: MAT.metal };
  const CER = { spec: 0.55, shin: 80, rim: 0.8 }, RUB = { spec: 0.12, shin: 16, rim: 0.5 }, GLASS = { spec: 0.9, shin: 120, rim: 1 }, PAINT = { spec: 0.08, shin: 14, rim: 0.6 };
  const LEAFM = { spec: 0.28, shin: 34, rim: 0.7 }, SHINY = { spec: 0.6, shin: 70, rim: 0.9 };
  const STEM = [0.36, 0.4, 0.14], PEARL = [0.97, 0.94, 0.9], KRAFTD = [0.6, 0.44, 0.27];
  // frutta vera (colori reali, buccia con puntini): m è la matrice dell'oggetto con raggio 1
  const fruit = (kind, m) => {
    switch (kind) {
      case 'cherry': mesh(G.sphere, M.mul(m, M.S(1, 0.94, 1)), K.cherry, ORGG); mesh(G.cherryStem, M.mul(m, M.chain(M.T(0, 0.8, 0), M.S(1.7, 1.7, 1.7))), STEM, ORG); break;
      case 'blueberry': mesh(G.sphere, m, K.blueberry, ORGG); mesh(G.sphere, M.mul(m, M.chain(M.T(0, 0.93, 0), M.S(0.3, 0.12, 0.3))), [0.08, 0.08, 0.16], matte); break;
      case 'lemon': mesh(G.lemon, M.mul(m, M.Rz(1.15)), K.lemon, ORG); break;
      case 'orange': mesh(G.sphere, M.mul(m, M.S(1, 0.96, 1)), K.orange, ORG); mesh(G.sphere, M.mul(m, M.chain(M.T(0, 0.93, 0), M.S(0.16, 0.06, 0.16))), K.carrotTop, matte); break;
      case 'lime': mesh(G.sphere, M.mul(m, M.S(1, 0.94, 1)), K.lime, ORG); break;
      case 'apple': mesh(G.apple, m, K.apple, ORGG); mesh(G.stem, M.mul(m, M.chain(M.T(0, 0.58, 0), M.S(0.5, 0.5, 0.5))), K.woodD, matte); mesh(G.leafG, M.mul(m, M.chain(M.T(0.05, 0.78, 0), M.S(0.34, 0.34, 0.34), M.Rz(0.5))), K.leaf2, LEAFM); break;
      case 'banana': mesh(G.banana, m, K.banana, ORG); break;
      case 'drop': mesh(G.drop, m, K.water, GLASS); break;
      default: break;
    }
  };
  // matrice che porta l'asse y lungo la direzione d (per i legami delle molecole)
  function alignY(d) {
    const l = Math.hypot(...d) || 1, y = [d[0] / l, d[1] / l, d[2] / l];
    let a = [-y[2], 0, y[0]]; const al = Math.hypot(...a);
    if (al < 1e-6) return y[1] > 0 ? M.id() : M.Rx(Math.PI);
    a = a.map((v) => v / al); const c = y[1], s = al, t = 1 - c, [x, yy, z] = a;
    return new Float32Array([t * x * x + c, t * x * yy + s * z, t * x * z - s * yy, 0, t * x * yy - s * z, t * yy * yy + c, t * yy * z + s * x, 0, t * x * z + s * yy, t * yy * z - s * x, t * z * z + c, 0, 0, 0, 0, 1]);
  }
  // fronte di mobile: ante verde bosco con maniglie in ottone, così il piano di lavoro non è una lastra vuota
  const cabinet = (yTop, hgt, zFront, rise, f = 1) => {
    const seam = mixc(K.cabinet, [0, 0, 0], 0.5);
    for (let i = -4; i <= 4; i++) {
      mesh(G.box, Mx(i * 1.7, yTop - hgt / 2 - rise, zFront + 0.005, 0.03, (hgt - 0.16) * f, 0.012), seam, matte);
      if (i < 4) mesh(G.cyl, Mx(i * 1.7 + 0.2, yTop - 0.42 - rise, zFront + 0.035, 0.034, 0.28, 0.034), K.gold, GOLDM);
    }
  };
  const bond = (a, b, r, col) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(...d); const m = M.chain(M.T((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), alignY(d), M.S(r, len, r)); return m; };

  /* ---------- figure: una sola protagonista, cinque pose ---------- */
  const place = (f, i) => { const m = fig[f.k], s = f.h / m.h; return { s, wq: m.w * s, hq: m.h * s, cx: f.ax - m.headx * s + m.w * s / 2, cy: f.ay + m.heady * s - m.h * s / 2 }; };
  hooks.figures.push((pos, t, R, w, intro) => {
    if (X.AV && X.AV.on) return;
    FIG.forEach((f, i) => {
      const pIn = i === 0 ? intro : phIn(i, pos), pOut = i === PHASESX - 1 ? 0 : phOut(i, pos);
      if (pIn <= 0.002 || pOut >= 0.998) return;
      const p = place(f, i), k = R.kx; p.cx += (R.Wv > 3.2 ? [0.55, -0.55, 0.55, -0.45, 0.55][i] : 0);
      const sway = Math.sin(t * 0.9 + i) * 0.012, breathe = 1 + Math.sin(t * 1.1 + i) * 0.004;
      const shake = i === 3 ? Math.sin(t * 22) * 0.02 * sm(3.0, 3.1, pos) * (1 - sm(3.4, 3.6, pos)) : 0;
      quadTex(T[f.k], p.cx + shake, p.cy + sway, 0, p.wq * breathe, p.hq * breathe, { mode: 1, pIn, pOut, bias: 1.6 * (1 - pIn) + 1.6 * pOut, tint: i === 3 ? [0.97, 0.95, 0.9] : [1, 1, 1] });
    });
  });
  const PHASESX = 5;

  /* ---------- titoli giganti ---------- */
  hooks.titles.push((pos, t, R, w) => {
    for (let i = 0; i < PHASESX; i++) {
      const v = phv(i, pos); if (v < 0.01) continue;
      const dark = i === 3, col = dark ? C.sandL : C.mocha, sc = Math.min(1, R.Wv * 2 / 10.8);
      const d = pos - i;
      quadTex(T['t' + i], -d * 2.6, (R.ty || 0) * 0.5 + 0.35, -2.6, 10.4 * sc * 1.0, 3.25 * sc, { ...TXM(col), alpha: v * (dark ? 0.16 : 0.18) });
    }
  });

  /* =========================================================================================
     FASE 1 · PERSONAL BRAND
     ========================================================================================= */
  const P1 = { hand: [0.76 + 0.55, 1.12, 0.2] };
  hooks.backdrops.push((pos, t, R) => {
    const v = phv(0, pos);
    quadFX(0, 0, 0.3, -3.2, 8.5, 8.5, C.sandL, 0.75 * v, { a: 1.6 });
    quadFX(5, 0.05, 0.2, -2.3, 8.2 * Math.min(1, R.Wv / 4), 8.2 * Math.min(1, R.Wv / 4), C.mocha, 0.3 * v, {});
  });
  hooks.opaque.push((pos, t, R) => {
    const v = phv(0, pos); if (v < 0.01) return;
    const k = R.kx, appear = (i) => pop(lin(0.0, 1, v * 1.25 - i * 0.07));
    noSh = true;
    // anelli sospesi: oro e acciaio, come gioielli che orbitano attorno a lei
    [[-2.1 * k, 1.9, -0.4, 0.5, 0.5, 0.3, K.gold], [2.6 * k, -0.1, -0.8, 0.8, 1.1, -0.2, K.steel], [-1.5 * k, 2.3, 0.4, 0.3, 0.3, 0.9, K.gold]].forEach(([x, y, z, s, rx, ry, col], i) => {
      const f = appear(i);
      mesh(G.ring, Mx(x, y + Math.sin(t * 0.7 + i * 2) * 0.12, z, s * f, s * f, s * f, rx + t * 0.25, ry + t * 0.18, 0), col, col === K.gold ? GOLDM : STEELM);
    });
    // frutta che galleggia: ciliegie, mirtillo, limone, arancia, lime
    [[-1.35 * k, 1.1, 0.7, 0.13, 'cherry'], [1.9 * k, 2.0, 0.2, 0.1, 'blueberry'], [-3.0 * k, 1.5, -0.6, 0.22, 'lemon'], [3.1 * k, 0.5, -0.3, 0.18, 'orange'], [2.2 * k, -1.0, 0.8, 0.1, 'cherry'], [-1.0 * k, 2.2, 0.6, 0.12, 'lime']].forEach(([x, y, z, s, kind], i) => {
      const f = appear(i + 1);
      fruit(kind, Mx(x, y + Math.sin(t * 0.8 + i * 1.7) * 0.1, z, s * f, s * f, s * f, 0.3 + t * 0.2 * (i % 2 ? 1 : -1), t * 0.25 + i, 0));
    });
    // rametti di foglie
    [[-2.6 * k, 2.0, -0.4, 0.55, 0.5], [3.0 * k, 1.9, -1.0, 0.6, 2.4]].forEach(([x, y, z, s, r], i) => {
      const f = appear(i + 3);
      mesh(G.leafG, Mx(x, y + Math.sin(t * 0.6 + i) * 0.1, z, s * f, s * f, s * f, 0, 0, r + Math.sin(t * 0.5 + i) * 0.1), K.leaf2, LEAFM);
    });
    // la perla tra le dita: reagisce allo scorrimento e poi vola via verso la spesa
    const leave = sm(0.12, 0.7, pos), pr = 0.065 * (1 + 0.12 * Math.sin(t * 3)) * appear(0) * (1 - leave);
    if (pr > 0.002) mesh(G.sphere, Mx(X.AV.pearl[0] + leave * 0.8, X.AV.pearl[1] + leave * 0.6, X.AV.pearl[2], pr), PEARL, { spec: 0.9, shin: 140, rim: 1, glow: [0.03, 0.025, 0.022] });
    noSh = false;
  });

  /* =========================================================================================
     FASE 2 · LA SPESA  +  FASE 3 · LA CUCINA  (gli ingredienti sono gli stessi: passano dalla borsa al piano)
     ========================================================================================= */
  const BAG = { x: -1.25, y: -1.5, z: 0.55, w: 0.9, h: 1.15 };
  const KIT = { top: -0.35, z: 1.05 };
  const SH = { x: -2.4, y: -0.45, z: 1.0 };
  const LAY = X.LAY = { BAG, KIT, SH, K: { cx: 0.3 }, DESK: { top: -0.75 } };
  X.bez = bez; X.eio = eio;
  // ingredienti: mesh, scala, colori, partenza, riposo nella borsa (altezza sul bordo), destinazione in cucina e dove "finiscono"
  const mk = (g, s, col, o) => ({ g, s, col, ...o });
  const ING = [
    mk('wedge', 0.78, K.melon, { spawn: [-3.5, 1.2, 0.6], rest: [0.18, 0.02], kit: [-1.05, 0.2, 1.0], rot: [0, 0.2, 0.2], plate: true, rind: true }),
    mk('apple', 0.3, K.apple, { spawn: [-2.5, 2.0, 0.3], rest: [-0.18, -0.05], kit: [3.2, 0.3, 0.8], rot: [0.2, 0, 0] }),
    mk('carrot', 0.3, K.carrot, { spawn: [-3.9, -0.1, 0.2], rest: [0.12, 0.22], kit: [-0.72, 0.08, 1.08], rot: [0, 0, -1.2], chop: true }),
    mk('broc', 0.34, K.broc, { spawn: [-1.3, 2.15, -0.6], rest: [0.28, 0.1], kit: [2.2, 0.35, 0.5], rot: [0.1, 0, 0] }),
    mk('avocado', 0.34, K.avoc, { spawn: [-3.7, 0.75, -0.3], rest: [-0.25, 0.0], kit: [-0.3, 0.2, 1.85], rot: [0, 0, 0.4], plate: true }),
    mk('egg', 0.2, K.egg, { spawn: [-2.2, -0.1, 0.8], rest: [0.0, -0.1], kit: [0.55, 0.1, 1.95], rot: [0.3, 0, 0.2] }),
    mk('bread', 0.5, K.bread, { spawn: [0.7, 2.15, -0.4], rest: [-0.3, 0.3], kit: [-3.1, 0.32, 0.4], rot: [0, 0.5, 0.1], stay: true }),
    mk('wheat', 0.5, K.wheat, { spawn: [2.5, 2.0, -0.3], rest: [0.3, 0.35], kit: [1.9, 0.1, 1.0], rot: [0, 0, 0.2] }),
    mk('leaves', 0.5, K.spinach, { spawn: [-2.6, 0.95, 0.9], rest: [0.0, 0.3], kit: [-0.42, 0.06, 1.2], rot: [0, 0, 0], chop: true }),
    mk('salmon', 0.64, K.salmon, { spawn: [3.4, 1.7, 0.2], rest: [0.05, 0.12], kit: [1.0, 0.2, 1.75], rot: [0, 0, 0], plate: true }),
    mk('bottle', 0.34, K.oil, { spawn: [-3.9, -1.25, 0.4], rest: [-0.05, 0.25], kit: [-2.6, 0.45, 0.3], rot: [0, 0, 0], stay: true }),
    mk('almond', 0.1, K.almond, { spawn: [1.9, 2.1, 0.5], rest: [0.0, -0.2], kit: [0.2, 0.1, 1.98], rot: [0, 0, 0], plate: true }),
  ];
  ING.forEach((it, i) => { it.i = i; });
  function drawIng(it, m, R, o = {}) {
    switch (it.g) {
      case 'wedge': // anguria: buccia verde, polpa rossa lucida, semi neri
        mesh(G.wedge, M.mul(m, M.S(1.1, 1.1, 1.1)), K.rind, ORG); mesh(G.wedge, M.mul(m, M.chain(M.T(0, 0.02, 0.04), M.S(0.96, 0.96, 1))), K.melon, ORGG);
        [[-0.17, 0.2], [0.05, 0.28], [0.2, 0.17], [-0.05, 0.12], [-0.28, 0.1], [0.3, 0.07]].forEach(([x, y]) => mesh(G.sphere, M.mul(m, M.chain(M.T(x, y, 0.1), M.S(0.026, 0.042, 0.02), M.Rz(x * 2))), K.black, SHINY)); break;
      case 'apple': fruit('apple', m); break;
      case 'carrot': mesh(G.carrot, m, K.carrot, ORG); [-0.12, 0, 0.12].forEach((x) => mesh(G.leafG, M.mul(m, M.chain(M.T(x, 0.85, 0), M.Rz(x * -4), M.S(0.28, 0.5, 0.28), M.Rz(Math.PI / 2))), K.carrotTop, LEAFM)); break;
      case 'broc': mesh(G.cyl, M.mul(m, M.chain(M.T(0, -0.4, 0), M.S(0.2, 0.9, 0.2))), K.brocStem, ORG);
        [[0, 0.35, 0, 0.5], [-0.4, 0.15, 0.05, 0.36], [0.4, 0.15, -0.05, 0.36], [0.15, 0.55, 0.2, 0.3], [-0.2, 0.5, -0.15, 0.3], [0.3, 0.38, 0.28, 0.24], [-0.15, 0.3, 0.3, 0.22], [0.05, 0.62, -0.1, 0.22]].forEach(([x, y, z, sc]) => mesh(G.sphere, M.mul(m, M.chain(M.T(x, y, z), M.S(sc))), K.broc, ORG)); break;
      case 'avocado': mesh(G.avocado, m, K.avoc, ORGG); break;
      case 'egg': [[-0.5, 0, 0, 0.3], [0.5, 0.0, 0.1, -0.25]].forEach(([x, y, z, r]) => mesh(G.egg, M.mul(m, M.chain(M.T(x, y, z), M.Rz(r), M.S(0.62, 0.62, 0.62))), K.egg, { spec: 0.45, shin: 50, rim: 0.7 })); break;
      case 'bread': mesh(G.sphere, M.mul(m, M.S(1.5, 0.62, 0.62)), K.bread, ORG); [-0.7, -0.25, 0.2, 0.65].forEach((x) => mesh(G.cyl, M.mul(m, M.chain(M.T(x, 0.36, 0.05), M.Rx(0.25), M.Rz(0.7), M.S(0.04, 0.4, 0.04))), K.breadCut, matte)); break;
      case 'wheat': [-0.5, 0, 0.5].forEach((x, j) => { mesh(G.wheat, M.mul(m, M.chain(M.T(x * 0.5, -0.9, 0), M.Rz(x * -0.35), M.S(0.9, 0.9, 0.9))), K.wheat, ORG); for (let e = 0; e < 5; e++) mesh(G.sphere, M.mul(m, M.chain(M.T(x * 0.5 + Math.sin(0.12 * 9) * 0.1 - x * 0.26 + (e % 2 ? 0.06 : -0.06), 0.62 + e * 0.15 + j * 0.02, 0), M.S(0.07, 0.14, 0.07))), K.gold, ORG); }); break;
      case 'leaves': [[0, 0, 0.5], [0.3, 0.1, -0.4], [-0.3, 0.05, 1.1]].forEach(([x, y, r]) => mesh(G.leafBig, M.mul(m, M.chain(M.T(x, y, 0), M.Rz(r), M.S(0.6))), r > 1 ? K.leaf2 : K.spinach, LEAFM)); break;
      case 'salmon': mesh(G.tray, M.mul(m, M.chain(M.T(0, 0.04, 0), M.Rx(Math.PI / 2))), K.salmon, ORGG); [-0.3, 0, 0.3].forEach((x) => mesh(G.tray, M.mul(m, M.chain(M.T(x, 0.09, 0), M.Rx(Math.PI / 2), M.Rz(0.25), M.S(0.14, 0.62, 1))), K.fat, matte)); break;
      case 'bottle': mesh(G.bottle, m, K.oil, GLASS); mesh(G.cyl, M.mul(m, M.chain(M.T(0, 1.34, 0), M.S(0.24, 0.1, 0.24))), K.gold, GOLDM); mesh(G.cyl, M.mul(m, M.chain(M.T(0, 0, 0), M.S(0.62, 0.55, 0.62))), K.cream, matte); mesh(G.cyl, M.mul(m, M.chain(M.T(0, 0, 0), M.S(0.625, 0.08, 0.625))), C.pink, PAINT); break;
      case 'almond': for (let a = 0; a < 7; a++) mesh(G.sphere, M.mul(m, M.chain(M.T(Math.cos(a * 2.4) * 0.9 * (a / 7), (a % 3) * 0.55, Math.sin(a * 2.4) * 0.9 * (a / 7)), M.S(0.7, 1.0, 0.55), M.Rz(a))), K.almond, ORG); break;
      default: break;
    }
  }
  X.ingPos = (j, pos, t, R) => ingState(ING[j], pos, t, R).p;
  function ingState(it, pos, t, R) {
    const kx = R.kx, i = it.i;
    const spawn = [it.spawn[0] * kx, it.spawn[1], it.spawn[2]];
    const bagTop = BAG.y + BAG.h / 2, rest = [BAG.x + it.rest[0] * kx * 1.4 * 1, bagTop + it.rest[1] * 1.0, BAG.z + 0.0];
    const kit = [LAY.K.cx + it.kit[0] * (Math.abs(it.kit[0]) > 1.5 ? kx : 1), KIT.top + it.kit[1], it.kit[2]];
    const aIn = pop(lin(0.32 + i * 0.035, 0.7 + i * 0.035, pos));
    const tb = eio(lin(0.92 + i * 0.03, 1.38 + i * 0.03, pos));
    const tk = eio(lin(1.55 + i * 0.03, 2.0 + i * 0.03, pos));
    const ts = lin(2.1 + i * 0.03, 2.55 + i * 0.03, pos);
    let p;
    if (pos < 1.5) {
      const bob = [0, Math.sin(t * 1.1 + i * 1.3) * 0.1 * (1 - tb), 0];
      p = bez(spawn, [lerp(spawn[0], rest[0], 0.5), Math.max(spawn[1], rest[1]) + 1.2, lerp(spawn[2], rest[2], 0.5) + 0.3], rest, tb); p[1] += bob[1];
    } else {
      p = bez(rest, [lerp(rest[0], kit[0], 0.5), Math.max(rest[1], kit[1]) + 1.4, lerp(rest[2], kit[2], 0.5)], kit, tk);
    }
    let s = it.s * aIn * lerp(1, 0.78, tk);
    const used = !it.stay && !it.chop ? ts : (it.chop ? Math.max(0, ts - 0.35) * 1.5 : 0);
    s *= 1 - sm(0, 1, used);
    const spin = (1 - (pos > 1.5 ? tk : tb)) * 0.8 + 0.1;
    return { p, s, rot: [it.rot[0] + t * 0.3 * spin * (it.g === 'carrot' ? 0 : 1), it.rot[1] + t * 0.45 * spin, it.rot[2]], ts, tk };
  }

  // ---- ambiente della spesa
  hooks.backdrops.push((pos, t, R) => {
    const v = phv(1, pos);
    quadFX(4, -0.3, 0.2, -3.6, 5.6 * Math.min(1, R.Wv / 3.2), 6.8 * Math.min(1, R.Wv / 3.2), C.sandD, 0.55 * v, { a: 0.95 });
    quadFX(0, 0.4, 0.5, -3.0, 8, 8, C.sandL, 0.5 * v, { a: 1.8 });
    // pavimento: ombra morbida sotto la borsa
    quadFX(6, BAG.x, BAG.y - BAG.h / 2 - 0.01, BAG.z, 2.6, 1.0, C.mocha, 0.28 * phv(1, pos) * (1 - sm(1.45, 1.75, pos)), { a: 1.4 });
  });
  hooks.opaque.push((pos, t, R) => {
    const v1 = phv(1, pos), v2 = phv(2, pos);
    // piante ai lati: foglie verdi vere, le due a terra in vaso di terracotta
    if (v1 > 0.01) {
      const k = R.kx; [[-3.9 * k, -1.5, -1.6, 0.55, 0.9], [4.0 * k, -1.2, -1.9, 0.7, 2.4], [-3.6 * k, 1.6, -2.2, 0.5, -0.3]].forEach(([x, y, z, s, r], i) => {
        const f = pop(lin(0, 1, v1 * 1.2 - i * 0.1));
        noSh = true;
        for (let j = 0; j < 3; j++) mesh(G.leafBig, Mx(x + j * 0.18, y + j * 0.12, z, s * f * (1 - j * 0.12), s * f, s * f, 0.2, r + j * 0.5, 0.9 + j * 0.45 + Math.sin(t * 0.5 + j + i) * 0.06), j === 1 ? K.leaf2 : K.spinach, LEAFM);
        noSh = false;
        if (i < 2) {
          mesh(G.cyl, Mx(x + 0.18, y - 0.24 * f, z, 0.34 * s * f * 1.5, 0.3 * f, 0.34 * s * f * 1.5), K.terracotta, PAINT);
          mesh(G.cyl, Mx(x + 0.18, y - 0.06 * f, z, 0.4 * s * f * 1.5, 0.06 * f, 0.4 * s * f * 1.5), K.terracotta, PAINT);
          mesh(G.cyl, Mx(x + 0.18, y - 0.025 * f, z, 0.33 * s * f * 1.5, 0.02 * f, 0.33 * s * f * 1.5), K.walnut, matte);
        }
      });
    }
    // borsa di carta kraft con i manici di carta
    const bv = pop(lin(0.55, 1.05, pos)) * (1 - sm(1.45, 1.8, pos));
    if (bv > 0.01) {
      const b = BAG; const lift = (1 - bv) * 1.2;
      const sway = Math.sin(t * 0.8) * 0.02;
      mesh(G.bagBody, Mx(b.x, b.y - lift, b.z, b.w * bv, b.h * bv, 1.1 * bv, 0, sway, 0), K.kraft, { spec: 0.06, shin: 12, rim: 0.7 });
      mesh(G.handle, Mx(b.x, b.y - lift + b.h * 0.5 * bv, b.z, 0.95 * bv, 0.8 * bv, 1 * bv, 0, 0, 0), KRAFTD, matte);
      // bollino crema con puntino rosso (il tocco di marchio)
      mesh(G.cyl, Mx(b.x, b.y - lift + 0.0, b.z + 0.36 * bv, 0.16 * bv, 0.02 * bv, 0.16 * bv, Math.PI / 2, 0, 0), K.cream, matte);
      mesh(G.cyl, Mx(b.x, b.y - lift + 0.0, b.z + 0.372 * bv, 0.075 * bv, 0.02 * bv, 0.075 * bv, Math.PI / 2, 0, 0), C.pink, glossy);
    }
    // ingredienti
    ING.forEach((it) => { const st = ingState(it, pos, t, R); if (st.s < 0.004) return; noSh = pos < 2.05; drawIng(it, Mx(st.p[0], st.p[1], st.p[2], st.s, st.s, st.s, st.rot[0], st.rot[1], st.rot[2]), R); noSh = false; });

    /* ---------- cucina ---------- */
    if (v2 > 0.01) {
      const k = R.kx, rise = 1 - eo(v2), top = KIT.top, cx = LAY.K.cx;
      const oy = -rise * 3.4;
      // mobile verde bosco e piano di lavoro in rovere (assi accostate, ognuna di un tono)
      mesh(G.box, Mx(0, top - 1.1 - rise * 3.4, 1.2, 14, 2.2, 2.5), K.cabinet, PAINT);
      [0, 0.16, 0.05, 0.22, 0.1, 0.03].forEach((v, j) => mesh(G.box, Mx(0, top - 0.04 + oy, 0.125 + j * 0.45, 14, 0.1, 0.45), mixc(K.wood, K.woodD, v), WOODM));
      cabinet(top - 0.1, 2.0, 2.45, rise * 3.4);
      // tagliere d'acero + fettine (il coltello è nella mano destra, la frusta nella sinistra: si disegnano più sotto)
      const chopU = lin(2.0, 2.5, pos), cn = Math.floor(chopU * 9);
      mesh(G.box, Mx(cx - 0.8, top + 0.035 + oy, 1.05, 1.5, 0.07, 0.85), K.birch, WOODM);
      for (let c = 0; c < 9; c++) if (c < cn) mesh(G.cyl, Mx(cx - 0.22 + c * 0.04, top + 0.1 + oy + (c % 2) * 0.01, 1.2 + (c % 3) * 0.03, 0.08, 0.03, 0.08, Math.PI / 2, 0, 0.1 * c), K.carrot, ORG);
      // ciotola di porcellana con l'impasto
      const bw = 0.5, bx = cx + 0.88;
      mesh(G.bowl, Mx(bx, top + oy, 1.15, bw, bw, bw), K.porcelain, CER);
      mesh(G.cyl, Mx(bx, top + 0.19 * bw + oy + 0.02, 1.15, 0.84 * bw, 0.02, 0.84 * bw), K.batter, ORGG);
      // pentola d'acciaio con coperchio
      const px0 = cx + 3.2 * k;
      mesh(G.cyl, Mx(px0, top + 0.26 + oy, 0.6, 0.5, 0.52, 0.5), K.pot, STEELM);
      mesh(G.sphere, Mx(px0, top + 0.54 + oy + Math.sin(t * 5) * 0.01 * v2, 0.6, 0.52, 0.14, 0.52), K.pot, STEELM);
      mesh(G.sphere, Mx(px0, top + 0.66 + oy, 0.6, 0.07), K.black, SHINY);
      // padella antiaderente col manico nero
      mesh(G.cyl, Mx(cx - 3.3 * k, top + 0.06 + oy, 1.35, 0.55, 0.12, 0.55), K.pan, { spec: 0.6, shin: 70, rim: 0.7, mat: MAT.metal });
      mesh(G.box, Mx(cx - 2.75 * k, top + 0.09 + oy, 1.35, 0.7, 0.05, 0.09), K.black, RUB);
      // piatto di porcellana: l'impiattamento (cereali, salmone, avocado, spinaci, pomodorini)
      const pk = 0.6, py = top + oy, px = cx + 0.05, pz = 1.78;
      mesh(G.plate, Mx(px, py, pz, pk, pk, pk), K.porcelain, CER);
      const lay = (a, b) => pop(lin(a, b, pos));
      const L1 = lay(2.12, 2.3), L2 = lay(2.22, 2.4), L3 = lay(2.32, 2.5), L4 = lay(2.42, 2.58), L5 = lay(2.5, 2.65);
      mesh(G.sphere, Mx(px, py + 0.1, pz, 0.46 * L1, 0.14 * L1, 0.34 * L1), K.cereal, ORG);
      mesh(G.tray, Mx(px - 0.05, py + 0.2, pz + 0.04, 0.46 * L2, 0.46 * L2, 0.46 * L2, Math.PI / 2, 0, 0.1), K.salmon, ORGG);
      [-0.2, 0, 0.2].forEach((dx, j) => mesh(G.sphere, Mx(px + dx, py + 0.26, pz + 0.12, 0.13 * L3, 0.06 * L3, 0.11 * L3, 0, 0, 0.3 * j), K.avocFlesh, ORG));
      mesh(G.leafG, Mx(px + 0.28, py + 0.2, pz - 0.05, 0.4 * L4, 0.4 * L4, 0.4 * L4, 0.2, 0.5, 0.5), K.spinach, LEAFM);
      [[-0.25, 0.28, -0.05], [0.12, 0.32, 0.0], [0.05, 0.27, 0.15]].forEach(([dx, dy, dz]) => mesh(G.sphere, Mx(px + dx, py + dy, pz + dz, 0.07 * L5), K.tomato, ORGG));
      // mensole di legno con barattoli di ceramica e tappi di sughero
      const JARS = [[K.cream, K.terracotta], [[0.36, 0.5, 0.4], K.cream], [K.terracotta, [0.36, 0.5, 0.4]], [K.cream, K.terracotta]];
      [[-3.3 * k, 1.25], [-2.7 * k, 1.25], [3.2 * k, 1.55], [3.8 * k, 1.55]].forEach(([x, y], j) => {
        const f = pop(lin(0, 1, v2 * 1.3 - j * 0.1)); mesh(G.box, Mx(x, y - 0.02, -2.4, 1.3, 0.05, 0.4), K.wood, WOODM);
        mesh(G.jar, Mx(x - 0.28, y + 0.27 * f, -2.4, 0.22 * f, 0.25 * f, 0.22 * f), JARS[j][0], CER);
        mesh(G.lid, Mx(x - 0.28, y + 0.27 * f + 0.25 * f * 0.86, -2.4, 0.22 * f, 0.22 * f, 0.22 * f), K.cork, WOODM);
        mesh(G.jar, Mx(x + 0.22, y + 0.2 * f, -2.4, 0.17 * f, 0.19 * f, 0.17 * f), JARS[j][1], CER);
      });
    }
  });

  // coltello nella mano destra e frusta nella sinistra: seguono le mani del personaggio
  hooks.opaque.push((pos, t, R) => {
    const v2 = phv(2, pos); if (v2 < 0.02 || !X.AV.on) return;
    const AV = X.AV, cx = LAY.K.cx, top = KIT.top, rise = 1 - eo(v2), oy = -rise * 3.4;
    const ad = sm(2.42, 2.62, pos), f = pop(lin(0, 1, v2 * 1.4));
    // coltello: lama verso sinistra (verso il cibo), manico nel pugno
    const gR = AV.grip.R, board = [cx - 0.8, top + 0.1 + oy, 1.05];
    const kp = [gR[0] * (1 - ad) + (cx - 0.55) * ad, gR[1] * (1 - ad) + board[1] * ad, gR[2] * (1 - ad) + 1.15 * ad];
    const kt = 0.05 * (1 - ad);
    mesh(G.box, Mx(kp[0] - 0.3, kp[1] - 0.07, kp[2], 0.6 * f, 0.13 * f, 0.022 * f, 0, 0, kt), K.steel, STEELM);
    mesh(G.box, Mx(kp[0] - 0.02, kp[1] - 0.01, kp[2], 0.3 * f, 0.065 * f, 0.065 * f, 0, 0, kt), K.walnut, WOODM);
    mesh(G.cyl, Mx(kp[0] - 0.165, kp[1] - 0.01, kp[2], 0.07 * f, 0.025 * f, 0.07 * f, 0, 0, Math.PI / 2 + kt), K.gold, GOLDM);
    // frusta: manico in mano, la testa dentro la ciotola
    const gL = AV.grip.L, bx = cx + 0.88, wa = t * 6;
    const wp = [gL[0] * (1 - ad) + bx * ad, gL[1] * (1 - ad) + (top + 0.75 + oy) * ad, gL[2] * (1 - ad) + 1.15 * ad];
    mesh(G.stem, Mx(wp[0], wp[1] - 0.2, wp[2], 0.55 * f, 0.55 * f, 0.55 * f, 0, wa, 0), K.darkSteel, STEELM);
    mesh(G.whisk, Mx(wp[0], wp[1] - 0.2 - 0.43, wp[2], 0.7 * f, 0.7 * f, 0.7 * f, 0, wa, 0), K.steel, STEELM);
  });
  hooks.backdrops.push((pos, t, R) => {
    const v = phv(2, pos); if (v < 0.01) return;
    quadFX(1, 0, 0.6, -3.2, 18, 8, C.sandD, 0.9 * v, { a: 6.5, b: 1.0, col2: C.tan });
    quadFX(6, LAY.K.cx + 0.05, KIT.top + 0.02, 1.78, 1.5, 0.9, C.mocha, 0.3 * v, { a: 1.2 });
    quadFX(6, LAY.K.cx - 0.8, KIT.top + 0.02, 1.05, 1.9, 0.8, C.mocha, 0.22 * v, { a: 1.2 });
  });
  // i piatti veri di Naomi appesi alla parete
  hooks.mid.push((pos, t, R) => {
    const v = phv(2, pos); if (v < 0.01) return;
    const k = R.kx;
    [['gnocchetti', -3.7 * k, 0.45, 1.25], ['spatzle', 3.8 * k, 0.55, 1.1], ['mezze', -2.55 * k, 1.95, 0.9], ['insalata', 2.45 * k, 2.05, 0.95]].forEach(([n, x, y, s], j) => {
      const f = pop(lin(0, 1, v * 1.3 - j * 0.12));
      quadTex(T['d-' + n], x, y + Math.sin(t * 0.6 + j * 1.3) * 0.06, -2.2, s * f, s * f, { mode: 2, alpha: Math.min(1, f), rim: C.sandL });
    });
  });

  /* =========================================================================================
     FASE 4 · ENERGIA E SPORT
     ========================================================================================= */
  hooks.backdrops.push((pos, t, R) => {
    const v = phv(3, pos); if (v < 0.01) return;
    quadFX(3, 0.8, 0.6, -3.6, 12, 9, C.pink, 0.05 * v, { a: 0.55, b: 0.7 });
    quadFX(0, 0.6, 0.2, -3.2, 8, 8, mixc(C.pink, C.mocha, 0.6), 0.25 * v, { a: 1.5 });
  });
  hooks.opaque.push((pos, t, R) => {
    const v = phv(3, pos); if (v < 0.01) return;
    const k = R.kx, ap = (i) => pop(lin(0, 1, v * 1.25 - i * 0.08));
    // dischi di bilanciere in gomma nera appesi alla parete, con anello rosso e mozzo cromato
    [[-3.9 * k, 1.1, -3.0, 1.0], [4.0 * k, 2.0, -3.2, 0.75]].forEach(([x, y, z, s], i) => {
      const f = ap(i);
      mesh(G.cyl, Mx(x, y, z, s * f, 0.26, s * f, Math.PI / 2), K.rubber, RUB);
      mesh(G.ringT, Mx(x, y, z + 0.14, s * 0.78 * f, 0.5, s * 0.78 * f, Math.PI / 2, 0, 0), K.red, PAINT);
      mesh(G.cyl, Mx(x, y, z + 0.14, s * 0.22 * f, 0.3, s * 0.22 * f, Math.PI / 2), K.steel, STEELM);
    });
    mesh(G.cyl, Mx(0, 1.15, -2.9, 0.05, 11, 0.05, 0, 0, Math.PI / 2), K.steel, STEELM);
    // cassone da palestra in betulla con fascia rossa: il supporto su cui aspetta lo shaker
    const bxs = SH.x * k, bh = SH.y - 0.47 + 2.0, bf2 = ap(2);
    mesh(G.box, Mx(bxs, -2.0 + bh / 2, SH.z, 0.86 * bf2, bh * bf2, 0.86 * bf2), K.birch, WOODM);
    mesh(G.box, Mx(bxs, -2.0 + bh - 0.03, SH.z, 0.9 * bf2, 0.06 * bf2, 0.9 * bf2), K.wood, WOODM);
    mesh(G.box, Mx(bxs, -2.0 + bh * 0.5, SH.z + 0.436, 0.88 * bf2, 0.14 * bf2, 0.01), K.red, PAINT);
    // shaker: gli ingredienti entrano, il tappo si chiude, si agita
    const sv = pop(lin(0, 1, v * 1.3 - 0.3));
    const close = eio(lin(2.95, 3.1, pos)), shk = X.AV.shaker.shake;
    const AVs = X.AV.shaker, sx = AVs.x, sy = AVs.y, szz = AVs.z, tilt = AVs.tilt;
    if (sv > 0.01) {
      const ss = 0.46 * sv;
      mesh(G.shaker, Mx(sx, sy, szz, ss, ss, ss, 0, 0, tilt), K.shaker, { spec: 0.5, shin: 70, rim: 0.9 });
      mesh(G.cyl, Mx(sx, sy - 0.0, szz, 0.72 * ss * 1.01, 0.3 * ss, 0.72 * ss * 1.01, 0, 0, tilt), K.red, { spec: 0.4, shin: 50, rim: 0.8 }); // fascia rossa
      const cy = sy + ss * (0.56 + (1 - close) * 1.1 + 0.0);
      mesh(G.shakerTop, Mx(sx + (1 - close) * 0.3 * k, cy, szz, ss, ss, ss, 0, 0, tilt + (1 - close) * -0.6), K.black, { spec: 0.5, shin: 60, rim: 0.8 });
      // ingredienti che cadono dentro: banana, latte, mirtillo, mandorla, ciliegia
      [[0, K.banana, 0.2, [1, 1, 1], ORG, 'banana'], [1, K.milk, 0.15, [1, 1, 1], GLASS, 'drop'], [2, K.blueberry, 0.14, [1, 1, 1], ORGG, 'sphere'], [3, K.almond, 0.15, [0.7, 0.95, 0.55], ORG, 'capsule'], [4, K.cherry, 0.11, [1, 1, 1], ORGG, 'sphere']].forEach(([i, col, sc, [ax, ay, az], mat, g]) => {
        const u = lin(2.55 + i * 0.07, 2.9 + i * 0.07, pos); if (u <= 0 || u >= 1) return;
        const sp = [sx + (i - 2) * 0.55, 1.9 + i * 0.12, 0.5], en = [sx + 0.05 * (i - 2), sy + ss * 1.35, szz];
        const p = bez(sp, [lerp(sp[0], en[0], 0.5), sp[1] + 0.9, 0.9], en, eio(u)), q = sc * (1 - 0.3 * u);
        mesh(G[g], Mx(p[0], p[1], p[2], q * ax, q * ay, q * az, u * 6, u * 4, u * 3), col, mat);
      });
      // gocce che schizzano durante la scossa: latte e acqua
      if (shk > 0.02) for (let d = 0; d < 7; d++) { const a = d * 0.9 + Math.floor(pos * 12) * 0.7, rr = 0.5 + (Math.sin(pos * 60 + d) * 0.5 + 0.5) * 0.6; mesh(G.sphere, Mx(sx + Math.cos(a) * rr * 0.9, sy + 0.4 + Math.sin(a) * rr, szz + 0.1, 0.045), d % 2 ? K.water : K.milk, GLASS); }
    }
    // frutta che galleggia: mela, arancia, goccia d'acqua
    [[-1.5 * k, 2.0, 0.4, 'apple', 0.28], [1.4 * k, 2.1, -0.8, 'orange', 0.17], [-3.6 * k, 1.9, 0.2, 'drop', 0.22]].forEach(([x, y, z, kind, sc], i) => {
      const f = ap(i + 3); noSh = true; fruit(kind, Mx(x, y + Math.sin(t * 0.9 + i) * 0.12, z, sc * f, sc * f, sc * f, t * 0.3, t * 0.4, 0)); noSh = false;
    });
  });

  // onda d'energia dietro di lei mentre scuote lo shaker
  hooks.backdrops.push((pos, t, R) => {
    const v = phv(3, pos), shk = X.AV.shaker.shake; if (v < 0.05 || shk < 0.02) return;
    const A = X.AV.shaker;
    for (let q = 0; q < 2; q++) { const pulse = (t * 1.3 + q * 0.5) % 1; quadFX(7, A.x, A.y + 0.2, A.z - 0.6, 6, 6, C.pink, (1 - pulse) * 0.85 * shk * v, { a: 0.18 + pulse * 0.7, b: 0.025 }); }
  });

  /* =========================================================================================
     FASE 5 · SCIENZA E FORMAZIONE
     ========================================================================================= */
  hooks.backdrops.push((pos, t, R) => {
    const v = phv(4, pos); if (v < 0.01) return;
    quadFX(2, 0, 0.3, -3.8, 16, 9, C.mocha, 0.16 * v, { a: 8 });
    quadFX(0, 0.1, 0.4, -3.2, 8, 8, [1, 1, 1], 0.6 * v, { a: 1.7 });
    quadFX(6, 0, LAY.DESK.top + 0.01, 0.95, 6.0, 1.1, C.mocha, 0.22 * v, { a: 1.2 });
  });
  hooks.opaque.push((pos, t, R) => {
    const v = phv(4, pos); if (v < 0.01) return;
    const k = R.kx, ap = (i) => pop(lin(0, 1, v * 1.25 - i * 0.09)), rise = 1 - eo(v);
    // scrivania da laboratorio: mobile verde, piano di marmo; il piano arriva ai fianchi, lei sta dietro
    const DT = LAY.DESK.top, top = DT - rise * 3.4;
    mesh(G.box, Mx(0, DT - 0.65 - rise * 3.4, 0.9, 14, 1.3, 1.9), K.cabinet, PAINT);
    mesh(G.box, Mx(0, DT - 0.04 - rise * 3.4, 0.9, 14, 0.07, 2.0), K.marble, { spec: 0.45, shin: 70, rim: 0.7 });
    cabinet(DT - 0.08, 1.15, 1.855, rise * 3.4);
    // pila di libri: copertine vere (bordeaux, blu notte, senape, verde), tagli delle pagine color carta
    [[-2.2 * k, 1.25, 0.1], [-2.2 * k, 0.9, -0.05], [-2.2 * k, 0.65, 0.05], [-2.2 * k, 0.42, 0.0]].forEach(([x, , dz], i) => {
      const f = ap(i); const y = top + 0.12 + i * 0.24; const w = 1.35 - i * 0.07;
      mesh(G.box, Mx(x + dz * 0.5, y, 1.0, w * f, 0.2 * f, 0.9 * f, 0, i * 0.08 - 0.1, 0), K.book[i], { spec: 0.18, shin: 20, rim: 0.6 });
      mesh(G.box, Mx(x + dz * 0.5 + 0.03, y, 1.0 + 0.03, (w - 0.08) * f, 0.15 * f, 0.9 * f, 0, i * 0.08 - 0.1, 0), K.page, matte);
    });
    mesh(G.box, Mx(-2.2 * k + 0.55, top + 0.12 + 0.24 * 3 + 0.12, 1.45, 0.05, 0.02, 0.5 * ap(4), 0, 0, 0), K.red, glossy); // segnalibro
    // libro aperto sulla scrivania: copertina blu, pagine crema, piega al centro
    const ob = ap(5);
    mesh(G.box, Mx(-0.55 * k, top + 0.03, 1.45, 1.4 * ob, 0.05 * ob, 0.98 * ob, 0, 0.1, 0), K.book[1], { spec: 0.18, shin: 20, rim: 0.6 });
    mesh(G.box, Mx(-0.55 * k, top + 0.07, 1.45, 1.3 * ob, 0.06 * ob, 0.9 * ob, 0, 0.1, 0), K.page, matte);
    mesh(G.box, Mx(-0.55 * k, top + 0.1, 1.45, 0.02 * ob, 0.04 * ob, 0.9 * ob, 0, 0.1, 0), K.cork, matte);
    // grafico a barre in 3D: verde acqua, ambra e l'ultima barra rossa
    const BARC = [[0.17, 0.5, 0.55], [0.96, 0.7, 0.17], [0.17, 0.5, 0.55], [0.96, 0.7, 0.17], [0.84, 0.1, 0.06]];
    const bars = [0.35, 0.6, 0.45, 0.85, 1.1];
    bars.forEach((h, i) => { const f = pop(lin(0, 1, v * 1.4 - 0.2 - i * 0.06)) * (0.85 + 0.15 * Math.sin(t * 0.8 + i)); const hh = h * f; mesh(G.box, Mx((2.0 + i * 0.28) * k, top + hh / 2 + 0.04, 1.2, 0.2, hh, 0.2), BARC[i], { spec: 0.4, shin: 50, rim: 0.8 }); });
    mesh(G.box, Mx((2.56) * k, top + 0.03, 1.2, 1.75, 0.06, 0.45), K.darkSteel, { spec: 0.3, shin: 40, rim: 0.7 });
    // capsula di Petri: vetro, agar ambra, colonie colorate
    const pf = ap(6);
    mesh(G.cyl, Mx(0.95 * k, top + 0.05, 1.5, 0.42 * pf, 0.08 * pf, 0.42 * pf), K.shaker, GLASS);
    mesh(G.cyl, Mx(0.95 * k, top + 0.092, 1.5, 0.37 * pf, 0.02 * pf, 0.37 * pf), [0.93, 0.68, 0.22], { spec: 0.6, shin: 80, rim: 0.8 });
    mesh(G.ring, Mx(0.95 * k, top + 0.09, 1.5, 0.42 * pf, 1.5 * pf, 0.42 * pf), K.shaker, GLASS);
    [[0.1, 0.05, K.cream], [-0.12, 0.1, K.red], [0.14, -0.1, [0.95, 0.85, 0.3]], [-0.08, -0.12, [0.3, 0.7, 0.35]]].forEach(([dx, dz, col]) => mesh(G.sphere, Mx(0.95 * k + dx, top + 0.108, 1.5 + dz, 0.05 * pf, 0.025 * pf, 0.05 * pf), col, SHINY));
    // molecola che ruota: colori CPK (carbonio grigio scuro, ossigeno rosso, azoto blu, idrogeno bianco)
    const mf = ap(7), mc = [2.3 * k, 1.5, -0.6], ry = t * 0.4 + pos * 1.2;
    const atoms = [[0, 0, 0, 0.2, K.C], [0.7, 0.35, 0.1, 0.15, K.O], [-0.65, 0.4, -0.2, 0.15, K.O], [0.1, -0.75, 0.25, 0.17, K.N], [1.25, -0.1, -0.3, 0.12, K.H], [-1.25, 0.1, 0.25, 0.12, K.H]];
    const bonds = [[0, 1], [0, 2], [0, 3], [1, 4], [2, 5]];
    const mm = (a) => { const c = Math.cos(ry), s = Math.sin(ry); return [mc[0] + a[0] * c + a[2] * s, mc[1] + a[1] + Math.sin(t * 0.7) * 0.1, mc[2] - a[0] * s + a[2] * c]; };
    const sc = 0.62 * mf;
    atoms.forEach(([x, y, z, r, col]) => { const q = mm([x * sc, y * sc, z * sc]); mesh(G.sphere, Mx(q[0], q[1], q[2], r * sc * 1.3), col, SHINY); });
    bonds.forEach(([a, b]) => { const qa = mm([atoms[a][0] * sc, atoms[a][1] * sc, atoms[a][2] * sc]), qb = mm([atoms[b][0] * sc, atoms[b][1] * sc, atoms[b][2] * sc]); mesh(G.cyl, bond(qa, qb, 0.04 * sc, 0), K.pot, { spec: 0.6, shin: 70, rim: 0.8, mat: MAT.metal }); });
    // elica del DNA dietro, a sinistra: filamenti blu e rossi, basi colorate
    const hf = ap(8), hc = [-3.4 * k, 0.6, -1.4];
    const hm = Mx(hc[0], hc[1], hc[2], hf, hf, hf, 0.1, t * 0.35 + pos * 1.5, 0.12);
    mesh(G.helixA, hm, K.dnaA, SHINY); mesh(G.helixB, hm, K.dnaB, SHINY);
    const BASES = [[0.96, 0.78, 0.2], [0.25, 0.72, 0.4], [0.2, 0.75, 0.85], [0.96, 0.5, 0.15]];
    for (let r = 0; r < 12; r++) { const tt = r / 11, a = tt * 2.2 * Math.PI * 2, y = (tt - 0.5) * 3.0, p1 = [Math.cos(a) * 0.42, y, Math.sin(a) * 0.42], p2 = [-p1[0], y, -p1[2]]; mesh(G.cyl, M.mul(hm, bond(p1, p2, 0.02, 0)), BASES[r % 4], SHINY); }
  });
  hooks.mid.push((pos, t, R) => {
    const v = phv(4, pos); if (v < 0.01) return;
    const k = R.kx, ap = (i) => pop(lin(0, 1, v * 1.25 - i * 0.1));
    // pubblicazioni che fluttuano attorno a lei, e la tesi vera
    [['paper0', -2.35 * k, 1.5, 0.95, 0.12], ['paper1', 2.55 * k, 1.85, 0.85, -0.1], ['paper2', -1.35 * k, -0.15, 0.7, -0.06]].forEach(([n, x, y, s, r], i) => {
      const f = ap(i); quadTex(T[n], x + Math.sin(t * 0.5 + i) * 0.05, y + Math.sin(t * 0.7 + i * 1.7) * 0.1, -1.1 - i * 0.15, 0.74 * s * f, 0.98 * s * f, { mode: 3, rz: r, alpha: Math.min(1, f) });
    });
    const f = ap(3); quadTex(T.tesi, 3.35 * k, 0.15 + Math.sin(t * 0.6) * 0.07, -1.4, 1.7 * f, 0.96 * f, { mode: 3, rz: 0.06, alpha: Math.min(1, f) });
  });
  hooks.front.push((pos, t, R) => {
    const v = phv(4, pos); if (v < 0.01) return;
    const f = pop(lin(0, 1, v * 1.25 - 0.45)); quadTex(T.chart, 1.45 * R.kx, -0.35 + Math.sin(t * 0.8) * 0.06, 1.25, 1.55 * f, 1.12 * f, { mode: 3, rz: -0.05, alpha: Math.min(1, f) });
  });
}
