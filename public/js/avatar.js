// Il personaggio 3D di Naomi: corpo a segmenti con articolazioni, braccia e gambe con cinematica inversa,
// viso con occhiali, capelli lunghi e abiti per fase. Tutto in WebGL2, nessun modello esterno.
// I colori sono miscele dei tre della palette (Soft Sand, Mocha Green, Watermelon Pink).
import { lathe, smooth, upload } from './gl.js';
import { torus } from './engine.js';

/* ---------- vettori ---------- */
const v = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  nrm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  mix: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
const basis = (o, x, y, z) => new Float32Array([x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, o[0], o[1], o[2], 1]);
// segmento da A a B: la geometria "limb" va da y=0 a y=1 con raggio 1
function boneM(A, B, r) {
  const d = v.sub(B, A), yn = v.nrm(d), ref = Math.abs(yn[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const xn = v.nrm(v.cross(ref, yn)), zn = v.cross(xn, yn);
  return basis(A, v.mul(xn, r), d, v.mul(zn, r));
}
// cinematica inversa a due segmenti: spalla/anca A, bersaglio T, lunghezze l1 l2, direzione indicativa del gomito/ginocchio
// segmento con sezione ellittica: rx lungo 'side', rz in profondità (per le ciocche piatte)
function boneF(A, B, rx, rz, side) {
  const d = v.sub(B, A), yn = v.nrm(d);
  let xn = v.sub(side, v.mul(yn, v.dot(side, yn))); xn = v.nrm(xn);
  const zn = v.cross(xn, yn);
  return basis(A, v.mul(xn, rx), d, v.mul(zn, rz));
}
function ik2(A, T, l1, l2, pole) {
  const d = v.sub(T, A), L = v.len(d), dn = L > 1e-6 ? v.mul(d, 1 / L) : [0, -1, 0];
  const Lc = Math.min((l1 + l2) * 0.998, Math.max(Math.abs(l1 - l2) + 0.03, L));
  const H = v.add(A, v.mul(dn, Lc));
  const ca = Math.min(1, Math.max(-1, (l1 * l1 + Lc * Lc - l2 * l2) / (2 * l1 * Lc))), sa = Math.sqrt(1 - ca * ca);
  let p = v.sub(pole, v.mul(dn, v.dot(pole, dn))); if (v.len(p) < 1e-4) p = [0, 0, 1]; p = v.nrm(p);
  return { E: v.add(A, v.add(v.mul(dn, l1 * ca), v.mul(p, l1 * sa))), H };
}
function blend(poses, w) {
  const s = w.reduce((a, b) => a + b, 0) || 1, out = {};
  for (const k of Object.keys(poses[0])) {
    const a = poses[0][k];
    out[k] = Array.isArray(a) ? a.map((_, j) => poses.reduce((q, p, i) => q + p[k][j] * w[i], 0) / s) : poses.reduce((q, p, i) => q + p[k] * w[i], 0) / s;
  }
  return out;
}

// Viso: di base quello di Naomi dalla foto (texture sulla testa). ?viso=neutro lo lascia liscio, ?viso=cartoon è quello disegnato.
const FQ = new URLSearchParams(location.search).get('viso');
const FACE = FQ === 'cartoon' ? 'cartoon' : FQ === 'neutro' ? 'neutro' : 'foto';
const SKIN_FOTO = [0.9059, 0.7196, 0.6569]; // la pelle del viso in foto: collo, braccia e mani hanno lo stesso colore

export function addAvatar(X) {
  const { gl, G, PAL, M, mesh, cl, lin, sm, lerp, eo, pop, hooks, mixc } = X;
  const up = (g) => upload(gl, g);
  const { SAND, MOCHA, PINK } = { SAND: PAL.sand, MOCHA: PAL.mocha, PINK: PAL.pink };

  /* ---------- geometrie ---------- */
  // profilo della testa (uovo): lo stesso per la geometria e per posare il viso sulla pelle
  const HEAD_PROF = smooth([[0, -0.42], [0.095, -0.405], [0.185, -0.35], [0.26, -0.24], [0.305, -0.08], [0.322, 0.08], [0.3, 0.25], [0.22, 0.35], [0.1, 0.405], [0, 0.42]], 10);
  const AG = {
    limb: up(lathe(smooth([[0, 0], [0.55, 0.004], [0.92, 0.04], [1, 0.1], [0.93, 0.72], [0.8, 0.93], [0.5, 0.99], [0, 1]], 4), 20)),
    tube: up(lathe(smooth([[0, 0], [0.6, 0.005], [0.95, 0.05], [1, 0.12], [1, 0.88], [0.95, 0.95], [0.6, 0.995], [0, 1]], 4), 14)),
    torso: up(lathe(smooth([[0, 0], [0.3, 0.01], [0.355, 0.12], [0.34, 0.3], [0.295, 0.52], [0.31, 0.72], [0.36, 0.92], [0.385, 1.04], [0.34, 1.17], [0.2, 1.26], [0.09, 1.3], [0, 1.31]], 4), 32)),
    shirt: up(lathe(smooth([[0, -0.1], [0.37, -0.09], [0.405, -0.03], [0.385, 0.2], [0.33, 0.5], [0.355, 0.72], [0.405, 0.92], [0.43, 1.04], [0.37, 1.17], [0.22, 1.26], [0.12, 1.3], [0, 1.31]], 4), 32)),
    coat: up(lathe(smooth([[0, -0.5], [0.44, -0.48], [0.49, -0.4], [0.47, -0.1], [0.42, 0.25], [0.38, 0.55], [0.41, 0.75], [0.46, 0.95], [0.46, 1.06], [0.4, 1.18], [0.24, 1.27], [0.13, 1.31], [0, 1.32]], 4), 32)),
    rim: up(torus(1, 0.14, 44, 10)),
    head: up(lathe(HEAD_PROF, 64)),
    lock: up(lathe(smooth([[0, 0], [0.7, 0.01], [1, 0.12], [0.95, 0.45], [0.7, 0.8], [0.3, 0.96], [0, 1]], 4), 18)),
  };
  // raggio della testa a una data altezza e profondità della superficie nel punto (x, y): serve a posare il viso sulla pelle
  const hr = (y) => { // raggio della testa all'altezza y, interpolato sul profilo vero (liscio)
    y = Math.min(0.42, Math.max(-0.42, y));
    for (let i = 1; i < HEAD_PROF.length; i++) if (y <= HEAD_PROF[i][1]) { const p = HEAD_PROF[i - 1], q = HEAD_PROF[i], u = q[1] === p[1] ? 0 : (y - p[1]) / (q[1] - p[1]); return p[0] + (q[0] - p[0]) * u; }
    return 0;
  };
  const sz = (x, y) => 1.06 * Math.sqrt(Math.max(0, hr(y) * hr(y) - x * x));
  X.headSurface = sz; X.headRadius = hr; // per la texture del viso (viso.js)
  // calotta dei capelli con la riga in mezzo: segue la testa, bordo sulla fronte che scende alle tempie
  const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function capGeo(sd) {
    const NP = 26, NT = 16, pos = [], nor = [], idx = [], ph0 = 0.035, ph1 = Math.PI * 0.97;
    for (let j = 0; j <= NT; j++) for (let i = 0; i <= NP; i++) {
      const ph = ph0 + (ph1 - ph0) * (i / NP), edge = 0.262 - 0.29 * smoothstep(0.3, 1.55, ph), t = j / NT;
      const y = 0.432 + (edge - 0.432) * t, r = hr(Math.min(y, 0.418)) + 0.024 + 0.012 * Math.sin(Math.PI * Math.min(1, t * 1.4));
      const x = sd * r * Math.sin(ph), z = 1.06 * r * Math.cos(ph);
      pos.push(x, y, z); const l = Math.hypot(x, z / 1.06 / 1.06, 0.25) || 1; nor.push(x / l, 0.25 / l, z / 1.06 / 1.06 / l);
    }
    for (let j = 0; j < NT; j++) for (let i = 0; i < NP; i++) { const a = j * (NP + 1) + i, b = a + 1, c = a + NP + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    return up({ pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint32Array(idx) });
  }
  AG.capL = capGeo(-1); AG.capR = capGeo(1);
  /* ---------- colori: tutte miscele dei tre ---------- */
  const skin = FACE === 'foto' ? SKIN_FOTO : mixc(mixc(SAND, MOCHA, 0.08), PINK, 0.14), skinD = mixc(skin, PINK, 0.22), blush = mixc(skin, PINK, 0.34);
  // capelli biondi come quelli di Naomi (biondo dorato, punte più chiare): l'unico colore fuori dai tre della palette
  const hair = [0.77, 0.64, 0.44], hairHi = [0.89, 0.78, 0.59], brow = mixc(MOCHA, SAND, 0.3);
  const shirtC = mixc(PAL.sandL, MOCHA, 0.07), trousersC = mixc(SAND, MOCHA, 0.5), shoesC = mixc(MOCHA, [0, 0, 0], 0.1);
  const glassC = mixc(MOCHA, [0, 0, 0], 0.45), sportC = PAL.tan, leggC = mixc(MOCHA, SAND, 0.08);
  const coatC = mixc(PAL.sandL, [1, 1, 1], 0.5), innerC = PAL.pinkD, apronC = mixc(PINK, SAND, 0.62);
  const soft = { spec: 0.06, shin: 14, rim: 0.55 }, gloss = { spec: 0.35, shin: 40, rim: 0.7 };

  /* ---------- stato condiviso con gli oggetti di scena ---------- */
  const AV = X.AV = { hand: { L: [0, 0, 0], R: [0, 0, 0] }, grip: { L: [0, 0, 0], R: [0, 0, 0] }, shaker: { x: -2.4, y: -0.45, z: 1, tilt: 0, shake: 0 }, pearl: [1.3, 1.1, 0.2], root: [0, -2.1, 0], head: [0, 1.5, 0], on: true };

  /* ---------- pose ---------- */
  const base = () => ({
    x: 0, z: 0, yaw: 0, floor: -2.1, hipY: 1.97, hx: 0, hz: 0, pitch: 0, lean: 0, twist: 0, roll: 0,
    head: [0, 0, 0],
    hR: [-0.45, 1.5, 0.05], hL: [0.45, 1.5, 0.05], eR: [-1, -0.2, -0.4], eL: [1, -0.2, -0.4], nR: [1, 0, 0.2], nL: [-1, 0, 0.2],
    cR: [0.4, 0.4, 0.4], cL: [0.4, 0.4, 0.4],       // curvatura: indice, tre dita, pollice
    fR: [-0.2, 0, 0], fL: [0.2, 0, 0], fyR: -0.12, fyL: 0.12,
    smile: 0.6, sway: 0,
  });
  const rotV = (P, l) => { const c = Math.cos(P.yaw), s = Math.sin(P.yaw); return [c * l[0] + s * l[2], l[1], -s * l[0] + c * l[2]]; };
  const W = (P, l) => { const r = rotV(P, l); return [P.x + r[0], P.floor + r[1], P.z + r[2]]; };
  const lookAt = (P, from, to, k = 1) => { // angoli della testa per guardare un punto del mondo
    const d = v.sub(to, from), yw = Math.atan2(d[0], d[2]) - P.yaw, pt = Math.atan2(-d[1], Math.hypot(d[0], d[2]));
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    return [cl(wrap(yw), -0.9, 0.9) * k, cl(pt, -0.6, 0.7) * k, 0];
  };

  function build(i, pos, t, R, d) {
    const L = X.LAY, P = base(), k = R.kx; L.K.cx = 0.3 * d;
    if (i === 0) { // ---- 1 · personal brand: la perla tra le dita
      P.x = 0.55 * d; P.yaw = -0.14; P.hx = Math.sin(t * 0.7) * 0.03; P.roll = P.hx * 0.4; P.hipY = 1.95;
      P.hL = W(P, [0.82, 3.3 + Math.sin(t * 1.3) * 0.02, 0.38]); P.eL = [0.8, -0.8, -0.2]; P.nL = [-0.6, 0.1, 0.8]; P.cL = [0.62, 0.95, 0.7];
      P.hR = W(P, [-0.4, 1.78, 0.1]); P.eR = [-1, -0.3, -0.8]; P.nR = [0.6, 0, 0.6]; P.cR = [0.5, 0.5, 0.3];
      P.head = [0.42 + Math.sin(t * 0.5) * 0.03, -0.05, -0.1]; P.smile = 0.7;
      P.fR = [-0.2, 0, 0.04]; P.fL = [0.22, 0, -0.04];
      AV.pearl = v.add(P.hL, rotV(P, [0.0, 0.1, 0.02]));
    } else if (i === 1) { // ---- 2 · la spesa: tiene la borsa e indica gli ingredienti
      P.x = -0.55 * d; P.yaw = -0.5; P.lean = 0.1; P.hipY = 1.9;
      const bagH = [L.BAG.x, L.BAG.y + L.BAG.h * 0.5 + 0.28, L.BAG.z];
      P.hR = bagH; P.eR = [-1, -0.2, -0.3]; P.nR = [0.9, 0, 0.1]; P.cR = [0.7, 0.9, 0.8];
      // l'altra mano segue l'ingrediente che sta volando verso la borsa
      let tg = [0, 0, 0], wsum = 0;
      for (let j = 0; j < 12; j++) { const c = 1.15 + j * 0.03 + 0.1; const ww = Math.exp(-Math.pow((pos - c) / 0.13, 2)); if (ww > 0.01 && X.ingPos) { tg = v.add(tg, v.mul(X.ingPos(j, pos, t, R), ww)); wsum += ww; } }
      const idle = W(P, [0.85, 2.45 + Math.sin(t * 1.1) * 0.04, 0.6]);
      const f = cl(wsum, 0, 1); P.hL = wsum > 0.01 ? v.mix(idle, v.mul(tg, 1 / wsum), f) : idle;
      P.eL = [0.6, -0.5, -0.6]; P.nL = [-0.2, 0.5, 0.9]; P.cL = [0.1, 0.1, 0.1];
      P.head = lookAt(P, W(P, [0, 3.6, 0]), P.hL, 0.9); P.smile = 0.7;
      P.fR = [-0.22, 0, 0.1]; P.fL = [0.22, 0, -0.12];
    } else if (i === 2) { // ---- 3 · cucina: taglia, mescola, poi assaggia con il mento sulle mani
      P.x = L.K.cx; P.yaw = 0.0; P.lean = 0.2; P.hipY = 1.95;
      const top = L.KIT.top, ad = sm(2.42, 2.62, pos);
      const wa = t * 6, chopU = lin(2.0, 2.5, pos);
      const cutting = chopU > 0 && chopU < 1 ? 1 : 0.25;
      const chop = Math.abs(Math.sin(t * 5.5)) * 0.15 * cutting;
      const hRw = [L.K.cx - 0.5 - chopU * 0.5, top + 0.27 + chop, 1.05];
      const hLw = [L.K.cx + 0.88 + Math.cos(wa) * 0.05, top + 0.88, 1.15 + Math.sin(wa) * 0.05];
      const chinR = W(P, [-0.14, 2.92, 0.4]), chinL = W(P, [0.14, 2.92, 0.4]);
      P.hR = v.mix(hRw, chinR, ad); P.hL = v.mix(hLw, chinL, ad);
      P.eR = [-0.6, -1, 0.3]; P.eL = [0.6, -1, 0.3]; P.nR = [0.4, 0.6, 0.5]; P.nL = [-0.4, 0.6, 0.5];
      P.cR = [0.4, 0.9, 0.5]; P.cL = [0.5, 0.9, 0.5];
      const plate = [L.K.cx + 0.05, top + 0.15, 1.78];
      P.head = lerpA(lookAt(P, W(P, [0, 3.55, 0]), [L.K.cx - 0.6, top + 0.1, 1.05], 0.9), lookAt(P, W(P, [0, 3.55, 0]), plate, 0.9), ad); P.head[2] = 0.05;
      P.smile = lerp(0.5, 0.85, ad); P.pitch = ad * 0.12;
    } else if (i === 3) { // ---- 4 · performance: stacco da terra, poi lo shaker
      P.x = -0.5 * d; P.yaw = 0.75; P.floor = -2.0;
      const pull = 1 - sm(3.12, 3.3, pos), u = 0.5 - 0.5 * Math.cos(t * 1.7), uu = u * u * (3 - 2 * u);
      // stacco: anche e busto seguono la barra, le braccia restano quasi verticali (spalle sopra la barra)
      const hipL = lerp(1.1, 1.95, uu), pitL = lerp(1.0, 0.05, uu), hzL = lerp(-0.5, -0.02, uu);
      const hipY = lerp(1.97, hipL, pull), pit = lerp(0.1, pitL, pull);
      P.hipY = hipY; P.pitch = pit; P.hz = lerp(0, hzL, pull); P.head = [0, -pit * 0.6 + 0.05, 0];
      const shY = hipL + 1.08 * Math.cos(pitL), shZ = hzL + 1.08 * Math.sin(pitL);
      const barY = cl(shY - 1.32, 0.52, 1.42), barZ = Math.max(0.24, shZ - 0.03);
      AV.bar = { y: lerp(barY, 0.5, 1 - pull), z: lerp(barZ, 0.32, 1 - pull) };
      // lo shaker: dal supporto alle mani, poi si agita
      const go = sm(3.14, 3.34, pos), shk = lin(3.32, 3.42, pos) * (1 - lin(3.68, 3.82, pos));
      P.yaw = lerp(0.75, 0.35, go);
      const chest = W(P, [0.02, 2.35, 0.55]);
      const sh = [Math.sin(t * 22) * 0.05 * shk, Math.abs(Math.sin(t * 17)) * 0.09 * shk, 0];
      const rest = [L.SH.x * k, L.SH.y, L.SH.z];
      const sp = X.bez(rest, [lerp(rest[0], chest[0], 0.5), Math.max(rest[1], chest[1]) + 0.5, 0.9], chest, X.eio(go));
      AV.shaker = { x: sp[0] + sh[0], y: sp[1] + sh[1], z: sp[2], tilt: Math.sin(t * 22) * 0.28 * shk, shake: shk, held: go };
      const hb = [W(P, [-0.27, AV.bar.y + 0.2, AV.bar.z]), W(P, [0.27, AV.bar.y + 0.2, AV.bar.z])];
      const hs = [[AV.shaker.x - 0.08, AV.shaker.y + 0.02, AV.shaker.z + 0.3], [AV.shaker.x + 0.08, AV.shaker.y + 0.3, AV.shaker.z + 0.3]];
      const grip = pull * (1 - go);
      P.hR = v.mix(hb[0], v.mix(hs[0], hs[1], 0), 1 - grip); P.hL = v.mix(hb[1], hs[1], 1 - grip);
      P.hR = v.mix(hb[0], hs[0], go * 1); P.hL = v.mix(hb[1], hs[1], go * 1);
      if (go < 0.001) { P.hR = hb[0]; P.hL = hb[1]; }
      P.eR = [-0.6, -0.7, -0.4]; P.eL = [0.6, -0.7, -0.4]; P.nR = [1, 0, 0.2]; P.nL = [-1, 0, 0.2];
      P.cR = [0.95, 0.95, 0.9]; P.cL = [0.95, 0.95, 0.9];
      P.fR = [-0.22, 0, 0.02]; P.fL = [0.22, 0, 0.02]; P.fyR = -0.35; P.fyL = 0.35;
      P.smile = 0.4 + go * 0.4;
      if (go > 0.5) P.head = [0.1, -0.02, 0];
    } else { // ---- 5 · scienza: braccia incrociate in camice
      P.x = 0.12 * d; P.yaw = -0.08; P.hipY = 1.95; P.hx = Math.sin(t * 0.6) * 0.02;
      P.hR = W(P, [0.36, 2.74, 0.44]); P.hL = W(P, [-0.34, 2.66, 0.56]);
      P.eR = [0, -0.7, 1]; P.eL = [0, -0.7, 1]; P.nR = [0.1, 0.3, -1]; P.nL = [-0.1, 0.3, -1]; P.cR = [0.7, 0.8, 0.5]; P.cL = [0.7, 0.8, 0.5];
      P.head = [0.1, -0.03, 0.09]; P.smile = 1; P.fR = [-0.19, 0, 0.0]; P.fL = [0.19, 0, 0.0];
    }
    return P;
  }
  const lerpA = (a, b, t) => a.map((x, j) => x + (b[j] - x) * t);

  /* ---------- scheletro, disegno ---------- */
  const hairSt = { p: null, t: 0 };
  function draw(P, vis, t, R, intro) {
    const sc = intro;
    const hip = (() => { const r = rotV(P, [P.hx, 0, P.hz]); return [P.x + r[0], P.floor + P.hipY, P.z + r[2]]; })();
    const br = 1 + Math.sin(t * 1.4) * 0.006;
    const pelvisM = M.chain(M.T(hip[0], hip[1], hip[2]), M.Ry(P.yaw), M.Rx(P.pitch), M.Rz(P.roll));
    const torsoM = M.mul(pelvisM, M.chain(M.Rx(P.lean), M.Ry(P.twist)));
    const sh = { R: M.pt(torsoM, [-0.41, 1.08, 0]), L: M.pt(torsoM, [0.41, 1.08, 0]) };
    const neck = M.pt(torsoM, [0, 1.27, 0]);
    const headM = M.chain(torsoM, M.T(0, 1.27, 0), M.Ry(P.head[0]), M.Rx(P.head[1]), M.Rz(P.head[2]), M.T(0, 0.37, 0), M.S(1.12));
    const hc = M.pt(headM, [0, 0, 0]);
    // se c'è il modello .glb, il corpo procedurale non si disegna: servono solo i bersagli per muovere lo scheletro
    const glbOn = !!(X.GLB && X.GLB.ready), bm = glbOn ? () => {} : mesh;
    const J = { pelvisM, torsoM, headM, hip, legs: [], arms: [] };
    // capelli: seguono la testa con un po' di ritardo
    if (!hairSt.p) hairSt.p = hc.slice();
    const dt = Math.min(0.1, Math.max(0.001, t - (hairSt.t || t))); hairSt.t = t;
    const kh = 1 - Math.exp(-dt * 7);
    hairSt.p = hairSt.p.map((x, a) => x + (hc[a] - x) * kh);
    const drag = v.sub(hairSt.p, hc); // verso opposto al movimento
    const swayX = cl(-drag[2] * 1.2 + Math.sin(t * 1.3) * 0.03, -0.4, 0.4), swayZ = cl(drag[0] * 1.2 + Math.sin(t * 0.9 + 1) * 0.025, -0.4, 0.4);
    AV.root = [P.x, P.floor, P.z]; AV.head = hc;

    const sk = (s) => ({ ...gloss, spec: 0.12, shin: 20, rim: 0.6, ...(s || {}) });
    const S = (m, s) => M.mul(m, M.S(s));
    // ---- gambe
    const feet = [
      { sd: -1, p: W(P, [P.fR[0], P.fR[1], P.fR[2]]), y: P.yaw + P.fyR },
      { sd: 1, p: W(P, [P.fL[0], P.fL[1], P.fL[2]]), y: P.yaw + P.fyL },
    ];
    const fwd = [Math.sin(P.yaw), 0, Math.cos(P.yaw)];
    const legCol = vis.sport > 0.5 ? leggC : trousersC;
    feet.forEach((f) => {
      const hp = M.pt(pelvisM, [f.sd * 0.13, -0.02, 0]);
      const ankle = v.add(f.p, [0, 0.12, 0]);
      const { E, H } = ik2(hp, ankle, 0.98, 0.92, v.add(fwd, [f.sd * 0.15, 0, 0]));
      J.legs.push({ sd: f.sd, floorY: f.p[1], foot: f.p, yaw: f.y, pole: v.add(fwd, [f.sd * 0.15, 0, 0]) });
      bm(AG.limb, boneM(hp, E, 0.135), legCol, soft);
      bm(AG.limb, boneM(E, H, 0.098), legCol, soft);
      bm(G.sphere, M.chain(M.T(hp[0], hp[1], hp[2]), M.S(0.145)), legCol, soft);
      bm(G.sphere, M.chain(M.T(E[0], E[1], E[2]), M.S(0.102)), legCol, soft);
      // scarpa
      const fm = M.chain(M.T(f.p[0], f.p[1] + 0.085, f.p[2]), M.Ry(f.y), M.T(0, 0, 0.075));
      bm(G.sphere, M.mul(fm, M.S(0.125, 0.09, 0.27)), shoesC, gloss);
      bm(G.sphere, M.mul(fm, M.chain(M.T(0, -0.045, 0.01), M.S(0.13, 0.04, 0.275))), PAL.sandL, soft);
      bm(G.sphere, M.mul(fm, M.chain(M.T(0, 0.02, -0.2), M.S(0.034))), PINK, gloss);
    });
    // ---- tronco e vestiti
    bm(G.sphere, M.mul(pelvisM, M.chain(M.T(0, 0.02, 0), M.S(0.33, 0.24, 0.25))), legCol, soft);
    const torsoCol = vis.sport > 0.5 ? sportC : shirtC;
    bm(AG.torso, M.mul(torsoM, M.S(1, br, 0.68)), vis.sport > 0.5 ? sportC : skin, soft);
    if (vis.sport > 0.01) bm(AG.torso, M.mul(torsoM, M.chain(M.T(0, 0.0, 0), M.S(1.035, br * 0.8, 0.71))), sportC, soft);
    if (vis.shirt > 0.02) bm(AG.shirt, M.mul(torsoM, M.chain(M.S(pop(vis.shirt)), M.S(1, br, 0.72))), shirtC, soft);
    if (vis.coat > 0.02) {
      bm(AG.coat, M.mul(torsoM, M.chain(M.S(pop(vis.coat)), M.S(1, br, 0.78))), coatC, { spec: 0.08, shin: 14, rim: 0.7 });
      bm(G.box, M.mul(torsoM, M.chain(M.T(0, 0.78, 0.4 * 0.78 + 0.07), M.S(0.12 * pop(vis.coat), 0.62 * pop(vis.coat), 0.012))), innerC, soft); // scollo: la maglia sotto
    }
    if (vis.apron > 0.02) {
      const a = pop(vis.apron);
      bm(G.box, M.mul(torsoM, M.chain(M.T(0, 0.55, 0.325), M.S(0.56 * a, 0.95 * a, 0.03 * a))), apronC, soft);
      bm(G.box, M.mul(torsoM, M.chain(M.T(-0.17, 1.12, 0.27), M.Rx(-0.3), M.S(0.035 * a, 0.3 * a, 0.02 * a))), apronC, soft);
      bm(G.box, M.mul(torsoM, M.chain(M.T(0.17, 1.12, 0.27), M.Rx(-0.3), M.S(0.035 * a, 0.3 * a, 0.02 * a))), apronC, soft);
    }
    // ---- collo e testa
    bm(AG.tube, boneM(M.pt(torsoM, [0, 1.15, 0]), v.add(M.pt(headM, [0, -0.2, 0]), [0, 0, 0]), 0.075), skin, soft);
    bm(AG.head, M.mul(headM, M.S(1, 1, 1.06)), skin, sk());
    if (FACE === 'foto' && X.VISO && !glbOn) X.VISO.draw(headM);
    // capelli: calotta, frangia, massa dietro, ciocche ai lati o coda
    const pony = vis.pony, longH = 1 - pony, hs = { spec: 0.2, shin: 22, rim: 0.7 };
    bm(AG.capL, headM, hair, hs); bm(AG.capR, headM, hair, hs);   // capelli con la riga in mezzo
    bm(G.sphere, M.mul(headM, M.chain(M.T(0, 0.05, -0.1), M.S(0.34, 0.34, 0.33))), hair, hs); // volume dietro la testa
    if (longH > 0.02) {
      const hm = M.chain(headM, M.T(0, 0.1, -0.08), M.Rx(swayX), M.Rz(swayZ), M.T(0, -0.62 * longH, -0.03));
      bm(G.sphere, M.mul(hm, M.S(0.4 * longH, 0.76 * longH, 0.28 * longH)), hair, hs);
      bm(G.sphere, M.mul(hm, M.chain(M.T(0, -0.55 * longH, 0.02), M.S(0.34 * longH, 0.34 * longH, 0.22 * longH))), hairHi, soft);
      const side = v.nrm(v.sub(M.pt(torsoM, [1, 0, 0]), M.pt(torsoM, [0, 0, 0])));
      [-1, 1].forEach((sd) => { // ciocche piatte ai lati del viso, che scendono sulle spalle
        const A = M.pt(headM, [sd * 0.295, 0.09, 0.06]);
        const tp = M.pt(torsoM, [sd * 0.4, 0.9, 0.1]), gr = [A[0] + sd * 0.03, A[1] - 0.95, A[2] + 0.1];
        const B = v.mix(tp, gr, sm(0.35, 0.9, Math.abs(P.pitch + P.lean)));
        bm(AG.lock, boneF(A, B, 0.115 * longH, 0.06 * longH, side), hair, hs);
      });
    }
    if (pony > 0.02) { // coda di cavallo con fiocco rosa
      const a0 = M.pt(headM, [0, 0.22, -0.3]);
      const s1 = swayX * 1.6 + 0.35, s2 = swayX * 2.2 + 0.2;
      const p1 = v.add(a0, [Math.sin(swayZ) * 0.2, -0.42 * pony, -0.28 * pony - Math.sin(s1) * 0.1]);
      const p2 = v.add(p1, [Math.sin(swayZ * 1.4) * 0.2, -0.46 * pony, -0.12 * pony - Math.sin(s2) * 0.14]);
      bm(AG.limb, boneM(a0, p1, 0.1 * pony), hair, { spec: 0.2, shin: 22, rim: 0.7 });
      bm(AG.limb, boneM(p1, p2, 0.085 * pony), hairHi, { spec: 0.2, shin: 22, rim: 0.7 });
      bm(G.sphere, M.chain(M.T(a0[0], a0[1], a0[2]), M.S(0.07 * pony)), PINK, gloss);
    }
    if (FACE === 'cartoon') {
      // viso, posato sulla superficie della testa: occhi, sopracciglia, naso, bocca, guance, occhiali
      const blink = (Math.sin(t * 0.9) > 0.985 || (t % 4.3) < 0.1) ? 0.15 : 1;
      [-1, 1].forEach((sd) => {
        const ex = sd * 0.115, ey = 0.045;
        bm(G.sphere, M.mul(headM, M.chain(M.T(ex, ey, sz(ex, ey) - 0.004), M.S(0.034, 0.04 * blink, 0.02))), glassC, gloss);
        bm(G.sphere, M.mul(headM, M.chain(M.T(ex + 0.012, ey + 0.016, sz(ex + 0.012, ey + 0.016) + 0.012), M.S(0.009))), PAL.sandL, soft);
        bm(AG.tube, M.mul(headM, M.chain(M.T(sd * 0.075, 0.155, sz(sd * 0.075, 0.155) + 0.004), M.Rz(sd * 1.42), M.S(0.016, 0.075, 0.016))), brow, soft);
        bm(G.sphere, M.mul(headM, M.chain(M.T(sd * 0.19, -0.1, sz(sd * 0.19, -0.1) - 0.006), M.Ry(sd * 0.55), M.S(0.04, 0.024, 0.014))), blush, soft);
        // montatura (occhio di gatto) e asta fino all'orecchio
        const gz = sz(sd * 0.118, 0.045) + 0.035;
        bm(AG.rim, M.mul(headM, M.chain(M.T(sd * 0.118, 0.045, gz), M.Rz(sd * 0.16), M.Rx(Math.PI / 2), M.S(0.112, 0.03, 0.088))), glassC, gloss);
        bm(AG.tube, boneM(M.pt(headM, [sd * 0.228, 0.065, sz(sd * 0.228, 0.065) + 0.03]), M.pt(headM, [sd * 0.325, 0.06, 0.08]), 0.012), glassC, gloss);
      });
      bm(AG.tube, boneM(M.pt(headM, [-0.02, 0.05, (sz(0, 0.05) + 0.035)]), M.pt(headM, [0.02, 0.05, (sz(0, 0.05) + 0.035)]), 0.011), glassC, gloss);
      bm(G.sphere, M.mul(headM, M.chain(M.T(0, -0.05, sz(0, -0.05) + 0.004), M.S(0.026, 0.03, 0.028))), skinD, soft);
      { // bocca: tre segmenti che disegnano un sorriso
        const s = P.smile, w = 0.075, y0 = -0.185, lift = 0.02 + 0.03 * s;
        const pts = [[-w, y0 + lift], [-w * 0.5, y0 - 0.008], [w * 0.5, y0 - 0.008], [w, y0 + lift]].map(([x, y]) => [x, y, sz(x, y) + 0.008]);
        for (let q = 0; q < 3; q++) bm(AG.tube, boneM(M.pt(headM, pts[q]), M.pt(headM, pts[q + 1]), 0.0085), PAL.pinkD, gloss);
      }
    }
    // ---- braccia
    const hands = [
      { sd: -1, key: 'R', t: P.hR, pole: P.eR, n: P.nR, c: P.cR },
      { sd: 1, key: 'L', t: P.hL, pole: P.eL, n: P.nL, c: P.cL },
    ];
    const armCol = (vis.sport > 0.5 ? skin : (vis.coat > 0.5 ? coatC : shirtC));
    hands.forEach((h) => {
      const A = sh[h.key], { E, H } = ik2(A, h.t, 0.66, 0.62, h.pole);
      AV.hand[h.key] = H;
      J.arms.push({ key: h.key, sd: h.sd, H, pole: h.pole, n: h.n });
      const sleeve = vis.sleeve, coatS = vis.coat;
      bm(G.sphere, M.chain(M.T(A[0], A[1], A[2]), M.S(0.125)), vis.sport > 0.5 ? skin : armCol, soft);
      bm(AG.limb, boneM(A, E, 0.105), skin, sk());
      bm(AG.limb, boneM(E, H, 0.088), skin, sk());
      bm(G.sphere, M.chain(M.T(E[0], E[1], E[2]), M.S(0.095)), skin, sk());
      if (sleeve > 0.02) { // maniche
        const r1 = coatS > 0.5 ? 0.17 : 0.135, r2 = coatS > 0.5 ? 0.15 : 0.115;
        const mid = v.mix(E, H, coatS > 0.5 ? 0.86 : 0.62);
        bm(AG.limb, boneM(A, E, r1 * sleeve), armCol, soft);
        bm(AG.limb, boneM(E, mid, r2 * sleeve), armCol, soft);
        bm(G.sphere, M.chain(M.T(E[0], E[1], E[2]), M.S(r1 * 0.98 * sleeve)), armCol, soft);
        bm(G.sphere, M.chain(M.T(A[0], A[1], A[2]), M.S(0.15 * sleeve)), armCol, soft);
      }
      // mano
      const fd = v.nrm(v.sub(H, E)); AV.grip[h.key] = v.add(H, v.mul(fd, 0.2));
      let zz = v.sub(h.n, v.mul(fd, v.dot(h.n, fd))); if (v.len(zz) < 1e-3) zz = [0, 0, 1]; zz = v.nrm(zz);
      const hm = basis(H, v.cross(fd, zz), fd, zz);
      const bn = (a, b, r) => bm(AG.tube, boneM(M.pt(hm, a), M.pt(hm, b), r), skin, sk());
      bm(G.sphere, M.mul(hm, M.chain(M.T(0, 0.085, 0), M.S(0.07, 0.1, 0.038))), skin, sk());
      const fing = (x, l1, l2, cv, r) => {
        const a1 = cv * 1.0, a2 = cv * 1.25;
        const p0 = [x, 0.17, 0], p1 = [x, 0.17 + Math.cos(a1) * l1, Math.sin(a1) * l1], p2 = [x, p1[1] + Math.cos(a1 + a2) * l2, p1[2] + Math.sin(a1 + a2) * l2];
        bn(p0, p1, r); bn(p1, p2, r * 0.9);
      };
      const c = h.c;
      fing(h.sd * 0.036, 0.1, 0.085, c[0], 0.021);   // indice
      fing(0.0 * h.sd, 0.105, 0.085, c[1], 0.022); fing(-h.sd * 0.03, 0.098, 0.08, c[1], 0.02); fing(-h.sd * 0.056, 0.08, 0.065, c[1], 0.018);
      const th = c[2]; // pollice
      const t0 = [h.sd * 0.062, 0.05, 0.005], t1 = [h.sd * (0.1 - th * 0.05), 0.1 + th * 0.04, 0.03 + th * 0.06], t2 = [h.sd * (0.1 - th * 0.09), 0.15 + th * 0.03, 0.04 + th * 0.12];
      bn(t0, t1, 0.024); bn(t1, t2, 0.021);
    });
    if (glbOn) X.GLB.draw(J, t);
    return { pelvisM, torsoM, headM };
  }

  /* ---------- disegno nel passaggio opaco ---------- */
  hooks.opaque.unshift((pos, t, R, w) => {
    const d = R.Wv > 3.2 ? 1 : 0;
    const list = [], ws = [];
    for (let i = 0; i < 5; i++) if (w[i] > 0.002) { list.push(build(i, pos, t, R, d)); ws.push(w[i]); }
    if (!list.length) return;
    const P = blend(list, ws);
    const vis = {
      sport: sm(0.4, 0.62, w[3]), shirt: 1 - sm(0.4, 0.62, w[3]), coat: sm(0.42, 0.62, w[4]), apron: sm(0.42, 0.62, w[2]),
      sleeve: 1 - sm(0.4, 0.62, w[3]), pony: sm(0.4, 0.62, w[3]),
    };
    const intro = R.intro == null ? 1 : R.intro;
    draw(P, vis, t, R, intro);
  });
  if (FACE === 'foto') import('./viso.js').then((m) => m.loadViso(X, 'img/viso.webp')).catch((e) => console.warn('[viso] non caricato, resta la testa liscia:', e.message));
  // ombra morbida a terra
  hooks.backdrops.push((pos, t, R, w) => {
    const r = AV.root; quadFXShadow(r);
  });
  function quadFXShadow(r) { X.quadFX(6, r[0], r[1] + 0.01, r[2] - 0.35, 2.6, 1.0, PAL.mocha, 0.32, { a: 1.3 }); }

  // bilanciere (resta a terra quando lei passa allo shaker) e shaker, disegnati qui
  hooks.opaque.push((pos, t, R, w) => {
    if (w[3] < 0.02 || !AV.bar) return;
    const d = R.Wv > 3.2 ? 1 : 0, f = pop(lin(0, 1, w[3] * 1.3));
    const PD = { x: -0.5 * d, z: 0, floor: -2.0, yaw: 0.75 };
    const c = W(PD, [0, AV.bar.y, AV.bar.z]);
    const bm = M.chain(M.T(c[0], c[1], c[2]), M.Ry(PD.yaw), M.Rz(Math.PI / 2));
    mesh(G.cyl, M.mul(bm, M.S(0.032, 1.25 * f, 0.032)), PAL.sandL, { spec: 0.7, shin: 80, rim: 1 });
    [-1, 1].forEach((sd) => {
      const o = M.chain(bm, M.T(0, sd * 0.95 * f, 0));
      mesh(G.cyl, M.mul(o, M.S(0.5 * f, 0.1 * f, 0.5 * f)), PAL.mocha, { spec: 0.25, shin: 24, rim: 0.7 });
      mesh(G.cyl, M.mul(o, M.chain(M.T(0, sd * 0.06, 0), M.S(0.41 * f, 0.05 * f, 0.41 * f))), PAL.olive, soft);
      mesh(G.cyl, M.mul(o, M.chain(M.T(0, sd * 0.1, 0), M.S(0.1 * f, 0.04 * f, 0.1 * f))), PAL.pink, gloss);
    });
  });
}
