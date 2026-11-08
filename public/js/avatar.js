// Il personaggio 3D di Naomi: corpo a segmenti con articolazioni, braccia e gambe con cinematica inversa,
// viso con occhiali, capelli lunghi e abiti per fase. Tutto in WebGL2, nessun modello esterno.
// I colori sono miscele dei tre della palette (Soft Sand, Mocha Green, Watermelon Pink).
import { lathe, smooth, upload, reupload } from './gl.js';
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
  const { MAT } = X;
  // proporzioni: la testa è più piccola di prima (circa 1/5,5 dell'altezza) e il collo si vede
  const HS = 0.86;
  // profilo della testa (uovo): lo stesso per la geometria e per posare il viso sulla pelle
  const HEAD_PROF = smooth([[0, -0.42], [0.095, -0.405], [0.185, -0.35], [0.26, -0.24], [0.305, -0.08], [0.322, 0.08], [0.3, 0.25], [0.22, 0.35], [0.1, 0.405], [0, 0.42]], 10);
  const LP = (pts, per = 4, seg = 22) => up(lathe(smooth(pts, per), seg)); // solido di rivoluzione rastremato (y da 0 a 1, raggio relativo)
  const AG = {
    thigh: LP([[0, 0], [0.55, 0.004], [0.92, 0.03], [1, 0.1], [0.97, 0.4], [0.86, 0.75], [0.75, 0.94], [0.5, 0.992], [0, 1]]),
    calf: LP([[0, 0], [0.55, 0.004], [0.95, 0.04], [1, 0.1], [1.08, 0.3], [0.95, 0.62], [0.66, 0.92], [0.5, 0.99], [0, 1]]),
    uarm: LP([[0, 0], [0.6, 0.004], [0.95, 0.03], [1, 0.1], [0.95, 0.5], [0.86, 0.9], [0.8, 0.985], [0, 1]]),
    farm: LP([[0, 0], [0.6, 0.004], [0.95, 0.03], [1, 0.08], [1.06, 0.25], [0.85, 0.65], [0.62, 0.95], [0.5, 0.99], [0, 1]]),
    sleeve: LP([[0, 0], [0.6, 0.004], [0.95, 0.03], [1, 0.08], [0.98, 0.6], [0.92, 0.96], [0.9, 0.996], [0, 1]]),
    limb: up(lathe(smooth([[0, 0], [0.55, 0.004], [0.92, 0.04], [1, 0.1], [0.93, 0.72], [0.8, 0.93], [0.5, 0.99], [0, 1]], 4), 20)),
    tube: up(lathe(smooth([[0, 0], [0.6, 0.005], [0.95, 0.05], [1, 0.12], [1, 0.88], [0.95, 0.95], [0.6, 0.995], [0, 1]], 4), 14)),
    torso: up(lathe(smooth([[0, 0], [0.3, 0.01], [0.355, 0.12], [0.34, 0.3], [0.295, 0.52], [0.31, 0.72], [0.36, 0.92], [0.385, 1.04], [0.34, 1.17], [0.2, 1.26], [0.09, 1.3], [0, 1.31]], 4), 32)),
    shirt: up(lathe(smooth([[0, -0.1], [0.37, -0.09], [0.405, -0.03], [0.385, 0.2], [0.33, 0.5], [0.355, 0.72], [0.405, 0.92], [0.43, 1.04], [0.37, 1.17], [0.22, 1.26], [0.12, 1.3], [0, 1.31]], 4), 32)),
    coat: up(lathe(smooth([[0, -0.5], [0.44, -0.48], [0.49, -0.4], [0.47, -0.1], [0.42, 0.25], [0.38, 0.55], [0.41, 0.75], [0.46, 0.95], [0.46, 1.06], [0.4, 1.18], [0.24, 1.27], [0.13, 1.31], [0, 1.32]], 4), 32)),
    rim: up(torus(1, 0.14, 44, 10)),
    head: up(lathe(HEAD_PROF, 64)),
    // ciocca: sottile alla radice, piena a metà, affusolata in punta
    lock: LP([[0, 0], [0.6, 0.004], [0.92, 0.03], [1, 0.1], [0.98, 0.5], [0.88, 0.88], [0.76, 0.985], [0, 1]], 4, 16),
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
      pos.push(x, y, z);
      // normale dell'uovo (semiassi 0,35 · 0,44 · 0,37): in cima punta verso l'alto, ai lati verso fuori
      const nx = x / 0.1225, ny = y / 0.1936, nz = z / (0.1225 * 1.1236), l = Math.hypot(nx, ny, nz) || 1; nor.push(nx / l, ny / l, nz / l);
    }
    for (let j = 0; j < NT; j++) for (let i = 0; i < NP; i++) { const a = j * (NP + 1) + i, b = a + 1, c = a + NP + 1, d = c + 1; if (sd > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }  // la metà sinistra è specchiata: avvolgimento invertito, altrimenti il lato "davanti" guarda dentro e la luce sbaglia
    return up({ pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint32Array(idx) });
  }
  AG.capL = capGeo(-1); AG.capR = capGeo(1);

  // grembiule: lamina curva che avvolge il busto (stessa ellisse del maglione, un po' più larga), pettorina stretta in alto
  const SHIRT_R = [[-0.1, 0.37], [-0.03, 0.405], [0.2, 0.385], [0.5, 0.33], [0.72, 0.355], [0.92, 0.405], [1.04, 0.43], [1.17, 0.37]];
  const shirtR = (y) => { for (let i = 1; i < SHIRT_R.length; i++) if (y <= SHIRT_R[i][0]) { const a = SHIRT_R[i - 1], b = SHIRT_R[i], u = (y - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * u; } return 0.37; };
  AG.apron = (() => {
    const NA = 20, NV = 16, pos = [], nor = [], idx = [];
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NA; i++) {
      const u = j / NV, y = -0.06 + u * 1.12, half = lerp(1.22, 0.5, smoothstep(0.55, 1.0, y)), a = (i / NA * 2 - 1) * half;
      const R = shirtR(y) + 0.028 + 0.006 * Math.sin(a * 5 + y * 9), rz = 0.72;
      const x = R * Math.sin(a), z = R * rz * Math.cos(a);
      pos.push(x, y, z);
      const nx = Math.sin(a) / R, nz = Math.cos(a) / (R * rz * rz), l = Math.hypot(nx, nz); nor.push(nx / l, 0.12, nz / l);
    }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    return up({ pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint32Array(idx) });
  })();

  /* ---------- capelli lunghi: un'unica lamina morbida che dal cranio scende sulle spalle e dietro la schiena ---------- */
  const HC = 31, HV = 20;
  const hpos = new Float32Array(HC * (HV + 1) * 3), hnor = new Float32Array(HC * (HV + 1) * 3), hidx = new Uint32Array((HC - 1) * HV * 6);
  { let k = 0; for (let j = 0; j < HV; j++) for (let i = 0; i < HC - 1; i++) { if (i === (HC - 1) / 2 - 1) continue; /* niente striscia tra le due tempie: davanti la lamina è aperta */ const a = j * HC + i, b = a + 1, c = a + HC, d = c + 1; hidx.set([a, c, b, b, c, d], k); k += 6; } }
  AG.hair = upload(gl, { pos: hpos, nor: hnor, idx: hidx }, true);
  const rigidInv = (m) => new Float32Array([m[0], m[4], m[8], 0, m[1], m[5], m[9], 0, m[2], m[6], m[10], 0,
    -(m[0] * m[12] + m[1] * m[13] + m[2] * m[14]), -(m[4] * m[12] + m[5] * m[13] + m[6] * m[14]), -(m[8] * m[12] + m[9] * m[13] + m[10] * m[14]), 1]);
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const bez4 = (a, b, c, d, t) => { const u = 1 - t, w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t; return [0, 1, 2].map((q) => a[q] * w0 + b[q] * w1 + c[q] * w2 + d[q] * w3); };
  // tutto è calcolato nello spazio del busto: la lamina si disegna con la matrice del busto
  function buildHair(headM, torsoM, swayX, swayZ, lean, longH) {
    const iT = rigidInv(torsoM), Hl = M.mul(iT, headM), down = [-torsoM[1], -torsoM[5], -torsoM[9]];
    const hcl = M.pt(Hl, [0, 0, 0]);
    for (let i = 0; i < HC; i++) {
      const s = (i / (HC - 1)) * 2 - 1, sd = s < 0 ? -1 : 1, as = Math.abs(s);
      const ph = 1.2 + (Math.PI - 1.2) * as, back = smoothstep(1.5, 2.6, ph), centre = smoothstep(2.5, Math.PI, ph);
      const yR = 0.02, r = hr(yR) + 0.034;
      const P0 = M.pt(Hl, [sd * r * Math.sin(ph), yR, 1.06 * r * Math.cos(ph)]);
      const out = v.nrm(v.sub(P0, hcl));
      const P1 = v.add(P0, v.mul(out, 0.08 + 0.05 * back)); P1[1] -= 0.16;
      // la lamina appoggia sul maglione davanti (curva più larga sulle spalle) e dietro la schiena
      const xT = sd * lerp(0.25, 0.4, smoothstep(1.2, 1.8, ph)) * (1 - 0.45 * smoothstep(1.9, 2.6, ph)) * (1 - centre);
      const zE = 0.31 * Math.sqrt(Math.max(0, 1 - (xT / 0.43) * (xT / 0.43))) + 0.055;
      const zT = lerp(zE, -zE - 0.01, smoothstep(1.55, 2.3, ph));
      const P2 = [xT, 1.06, zT];
      const rag = Math.sin(i * 1.3) * 0.07 + (hash(i * 3.7) - 0.5) * 0.14;
      let P3 = [xT * 0.97 + swayZ * 0.2, lerp(0.42, 0.18, back) + rag, zT * 0.96 - swayX * 0.3 + (1 - back) * 0.03];
      P3 = v.mix(P3, [P2[0], P2[1] - 0.85 + rag, P2[2] - 0.05], lean);
      const C2 = [P2[0], P2[1] - 0.1, P2[2]];
      for (let j = 0; j <= HV; j++) {
        const tt = j / HV;
        let q = bez4(P0, P1, C2, P3, tt);
        q[0] += Math.sin(tt * 6.5 + i * 0.9) * 0.014 * tt; q[2] += Math.cos(tt * 5.2 + i * 0.7) * 0.01 * tt; // onde leggere
        q = v.mix(P0, q, longH);
        const o = (j * HC + i) * 3; hpos[o] = q[0]; hpos[o + 1] = q[1]; hpos[o + 2] = q[2];
      }
    }
    // normali dalle differenze finite, rivolte verso l'esterno del corpo
    const neck = M.pt(iT, M.pt(torsoM, [0, 1.3, 0])); void neck;
    for (let j = 0; j <= HV; j++) for (let i = 0; i < HC; i++) {
      const o = (j * HC + i) * 3, o1 = (j * HC + Math.min(HC - 1, i + 1)) * 3, o0 = (j * HC + Math.max(0, i - 1)) * 3, p1 = (Math.min(HV, j + 1) * HC + i) * 3, p0 = (Math.max(0, j - 1) * HC + i) * 3;
      const du = [hpos[o1] - hpos[o0], hpos[o1 + 1] - hpos[o0 + 1], hpos[o1 + 2] - hpos[o0 + 2]], dv = [hpos[p1] - hpos[p0], hpos[p1 + 1] - hpos[p0 + 1], hpos[p1 + 2] - hpos[p0 + 2]];
      let n = v.cross(du, dv); const l = v.len(n); n = l > 1e-8 ? v.mul(n, 1 / l) : [0, 0, -1];
      const rel = [hpos[o], 0, hpos[o + 2] - 0.02]; if (v.dot(n, rel) < 0) n = v.mul(n, -1);
      hnor[o] = n[0]; hnor[o + 1] = n[1]; hnor[o + 2] = n[2];
    }
    reupload(gl, AG.hair, { pos: hpos, nor: hnor, idx: hidx });
  }

  /* ---------- colori: la pelle e i capelli sono di Naomi; i vestiti hanno colori veri (non solo quelli della palette) ---------- */
  const skin = FACE === 'foto' ? SKIN_FOTO : mixc(mixc(SAND, MOCHA, 0.08), PINK, 0.14), skinD = mixc(skin, PINK, 0.22), blush = mixc(skin, PINK, 0.34);
  const hair = [0.78, 0.62, 0.4], hairHi = [0.9, 0.78, 0.56], brow = mixc(MOCHA, SAND, 0.3);
  const SWEATER = [0.93, 0.89, 0.8], SWEATER_D = [0.84, 0.79, 0.69], JEANS = [0.2, 0.29, 0.47], LEGG = [0.07, 0.07, 0.08], SPORT = [0.09, 0.09, 0.1];
  const COAT = [0.96, 0.96, 0.95], INNER = [0.13, 0.17, 0.26], APRON = [0.68, 0.13, 0.1], SHOE = [0.94, 0.93, 0.9], SOLE = [0.98, 0.98, 0.96];
  const glassC = mixc(MOCHA, [0, 0, 0], 0.45);
  const soft = { spec: 0.06, shin: 14, rim: 0.55 }, gloss = { spec: 0.35, shin: 40, rim: 0.7 };
  const MS = { spec: 0.12, shin: 22, rim: 0.7, mat: MAT.skin };          // pelle
  const MC = { spec: 0.05, shin: 10, rim: 0.8, mat: MAT.cloth };         // tessuto
  const MH = { spec: 0.4, shin: 34, rim: 0.7, mat: MAT.hair };           // capelli
  const ML = { spec: 0.5, shin: 70, rim: 0.8 };                          // pelle lucida (scarpe)

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
    const hip = (() => { const r = rotV(P, [P.hx, 0, P.hz]); return [P.x + r[0], P.floor + P.hipY, P.z + r[2]]; })();
    const br = 1 + Math.sin(t * 1.4) * 0.006;
    const pelvisM = M.chain(M.T(hip[0], hip[1], hip[2]), M.Ry(P.yaw), M.Rx(P.pitch), M.Rz(P.roll));
    const torsoM = M.mul(pelvisM, M.chain(M.Rx(P.lean), M.Ry(P.twist)));
    const sh = { R: M.pt(torsoM, [-0.41, 1.08, 0]), L: M.pt(torsoM, [0.41, 1.08, 0]) };
    // la testa gira attorno alla base del cranio, con il collo sotto
    const headM = M.chain(torsoM, M.T(0, 1.44, 0), M.Ry(P.head[0]), M.Rx(P.head[1]), M.Rz(P.head[2]), M.T(0, 0.33, 0), M.S(HS));
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
    const sp = vis.sport;

    // ---- gambe: jeans dritti (o leggings), sneakers bianche
    const feet = [
      { sd: -1, p: W(P, [P.fR[0], P.fR[1], P.fR[2]]), y: P.yaw + P.fyR },
      { sd: 1, p: W(P, [P.fL[0], P.fL[1], P.fL[2]]), y: P.yaw + P.fyL },
    ];
    const fwd = [Math.sin(P.yaw), 0, Math.cos(P.yaw)];
    const legCol = mixc(JEANS, LEGG, sp), rT = lerp(0.172, 0.143, sp), rC = lerp(0.128, 0.107, sp);
    const shoeUp = mixc(SHOE, [0.1, 0.1, 0.11], sp), shoeAcc = sp > 0.5 ? PINK : mixc(SHOE, [0.78, 0.76, 0.72], 0.5);
    feet.forEach((f) => {
      const hp = M.pt(pelvisM, [f.sd * 0.13, -0.02, 0]);
      const ankle = v.add(f.p, [0, 0.12, 0]);
      const { E, H } = ik2(hp, ankle, 0.98, 0.92, v.add(fwd, [f.sd * 0.15, 0, 0]));
      J.legs.push({ sd: f.sd, floorY: f.p[1], foot: f.p, yaw: f.y, pole: v.add(fwd, [f.sd * 0.15, 0, 0]) });
      bm(AG.thigh, boneM(hp, E, rT), legCol, MC);
      bm(AG.calf, boneM(E, H, rC), legCol, MC);
      bm(G.sphere, M.chain(M.T(hp[0], hp[1], hp[2]), M.S(rT * 0.99)), legCol, MC);
      bm(G.sphere, M.chain(M.T(E[0], E[1], E[2]), M.S(rT * 0.75)), legCol, MC);
      if (sp < 0.9) bm(AG.tube, boneM(v.mix(E, H, 0.9), v.add(H, v.mul(v.sub(H, E), 0.04)), 0.088 * (1 - sp)), legCol, MC); // risvolto dei jeans
      // sneaker: tomaia, suola, puntale, linguetta con lacci, tallone colorato
      const fm = M.chain(M.T(f.p[0], f.p[1] + 0.085, f.p[2]), M.Ry(f.y), M.T(0, 0, 0.075));
      bm(G.sphere, M.mul(fm, M.S(0.118, 0.088, 0.262)), shoeUp, ML);
      bm(G.sphere, M.mul(fm, M.chain(M.T(0, -0.052, 0.012), M.S(0.128, 0.036, 0.282))), SOLE, { spec: 0.1, shin: 16, rim: 0.5 });
      bm(G.sphere, M.mul(fm, M.chain(M.T(0, 0.0, 0.2), M.S(0.1, 0.07, 0.1))), mixc(shoeUp, [0.82, 0.8, 0.76], 0.4), ML);
      bm(G.sphere, M.mul(fm, M.chain(M.T(0, 0.012, -0.21), M.S(0.04, 0.05, 0.03))), shoeAcc, ML);
      for (let q = 0; q < 3; q++) bm(G.box, M.mul(fm, M.chain(M.T(0, 0.083 - q * 0.004, 0.0 + q * 0.065), M.Rx(-0.35), M.S(0.085, 0.01, 0.018))), SOLE, MC);
    });
    // ---- tronco e vestiti
    bm(G.sphere, M.mul(pelvisM, M.chain(M.T(0, 0.02, 0), M.S(0.33, 0.24, 0.25))), legCol, MC);
    bm(AG.torso, M.mul(torsoM, M.S(1, br, 0.68)), skin, MS);
    if (sp > 0.01) bm(AG.torso, M.mul(torsoM, M.chain(M.T(0, 0.0, 0), M.S(1.035, br * 0.8, 0.71))), SPORT, MC);
    if (vis.shirt > 0.02) { // maglione panna a coste, con bordo e scollo
      const q = pop(vis.shirt);
      bm(AG.shirt, M.mul(torsoM, M.chain(M.S(q), M.S(1, br, 0.72))), SWEATER, MC);
      bm(AG.rim, M.mul(torsoM, M.chain(M.T(0, -0.085 * q, 0), M.S(0.385 * q, 0.2 * q, 0.385 * 0.72 * q))), SWEATER_D, MC);
      bm(AG.rim, M.mul(torsoM, M.chain(M.T(0, 1.27 * q, 0.005), M.S(0.125 * q, 0.5 * q, 0.1 * q))), SWEATER_D, MC);
    }
    if (vis.coat > 0.02) { // camice bianco con bottoni, taschino e maglia blu sotto
      const q = pop(vis.coat);
      bm(AG.coat, M.mul(torsoM, M.chain(M.S(q), M.S(1, br, 0.78))), COAT, { spec: 0.1, shin: 14, rim: 0.8, mat: MAT.cloth });
      bm(G.box, M.mul(torsoM, M.chain(M.T(0, 0.8, 0.4 * 0.78 + 0.068), M.S(0.13 * q, 0.5 * q, 0.012))), INNER, MC);
      for (let k = 0; k < 4; k++) bm(G.sphere, M.mul(torsoM, M.chain(M.T(0, 0.55 - k * 0.2, 0.41 * 0.78 + 0.07 + k * 0.001), M.S(0.017 * q))), [0.86, 0.87, 0.9], gloss);
      bm(G.box, M.mul(torsoM, M.chain(M.T(0.2, 0.62, 0.365), M.S(0.13 * q, 0.14 * q, 0.012))), [0.9, 0.9, 0.89], MC);
    }
    if (vis.apron > 0.02) { // grembiule rosso mattone con tasca e cinghie
      const a = pop(vis.apron), ap = M.mul(torsoM, M.chain(M.S(a, 1, a), M.S(1, br, 1)));
      bm(AG.apron, ap, APRON, MC);
      bm(G.box, M.mul(torsoM, M.chain(M.T(0, 0.3, 0.72 * 0.372 + 0.02), M.S(0.26 * a, 0.17 * a, 0.014 * a))), mixc(APRON, [0, 0, 0], 0.16), MC);               // tasca
      bm(G.box, M.mul(torsoM, M.chain(M.T(0, 0.382, 0.72 * 0.372 + 0.03), M.S(0.27 * a, 0.012 * a, 0.012 * a))), mixc(APRON, [0, 0, 0], 0.3), MC);            // orlo della tasca
      bm(G.box, M.mul(torsoM, M.chain(M.T(-0.15, 1.16, 0.2), M.Rx(-0.35), M.S(0.03 * a, 0.28 * a, 0.014 * a))), mixc(APRON, [0, 0, 0], 0.2), MC);              // cinghie al collo
      bm(G.box, M.mul(torsoM, M.chain(M.T(0.15, 1.16, 0.2), M.Rx(-0.35), M.S(0.03 * a, 0.28 * a, 0.014 * a))), mixc(APRON, [0, 0, 0], 0.2), MC);
    }
    // ---- collo e testa
    bm(AG.tube, boneM(M.pt(torsoM, [0, 1.16, 0]), M.pt(headM, [0, -0.3, 0]), 0.064), skin, MS);
    bm(AG.head, M.mul(headM, M.S(1, 1, 1.06)), skin, { ...MS, spec: 0.18, shin: 26 });
    [-1, 1].forEach((sd) => bm(G.sphere, M.mul(headM, M.chain(M.T(sd * 0.312, -0.02, 0.0), M.Ry(sd * 0.3), M.S(0.034, 0.068, 0.05))), skin, MS)); // orecchie
    if (FACE === 'foto' && X.VISO && !glbOn) X.later(() => X.VISO.draw(headM));
    // ---- capelli biondi: calotta con la riga, ciocche dietro e sulle spalle, oppure coda con elastico rosso
    const pony = vis.pony, longH = 1 - pony;
    bm(AG.capL, headM, hair, MH); bm(AG.capR, headM, hair, MH);
    bm(G.sphere, M.mul(headM, M.chain(M.T(0, 0.05, -0.1), M.S(0.335, 0.335, 0.325))), hair, MH); // volume dietro la testa
    if (longH > 0.02) {
      const lean = sm(0.35, 0.9, Math.abs(P.pitch + P.lean));
      buildHair(headM, torsoM, swayX, swayZ, lean, longH);
      bm(AG.hair, torsoM, hair, { ...MH, spec: 0.5 });
    }
    if (pony > 0.02) { // coda di cavallo con elastico rosso
      const a0 = M.pt(headM, [0, 0.22, -0.3]);
      const s1 = swayX * 1.6 + 0.35, s2 = swayX * 2.2 + 0.2;
      const p1 = v.add(a0, [Math.sin(swayZ) * 0.2, -0.42 * pony, -0.28 * pony - Math.sin(s1) * 0.1]);
      const p2 = v.add(p1, [Math.sin(swayZ * 1.4) * 0.2, -0.46 * pony, -0.12 * pony - Math.sin(s2) * 0.14]);
      const p3 = v.add(p2, [Math.sin(swayZ * 1.8) * 0.12, -0.34 * pony, -0.04 * pony - Math.sin(s2 + 0.8) * 0.1]);
      [[a0, p1, 0.1, hair], [p1, p2, 0.092, hairHi], [p2, p3, 0.072, hairHi]].forEach(([A, B, r, c]) => bm(AG.limb, boneM(A, B, r * pony), c, MH));
      bm(AG.rim, M.mul(M.T(a0[0], a0[1], a0[2]), M.chain(M.S(0.085 * pony, 0.34 * pony, 0.085 * pony))), PINK, { spec: 0.3, shin: 30, rim: 0.7, mat: MAT.cloth });
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
    // ---- braccia: pelle rastremata, maniche del maglione o del camice
    const hands = [
      { sd: -1, key: 'R', t: P.hR, pole: P.eR, n: P.nR, c: P.cR },
      { sd: 1, key: 'L', t: P.hL, pole: P.eL, n: P.nL, c: P.cL },
    ];
    const armCol = vis.coat > 0.5 ? COAT : SWEATER;
    hands.forEach((h) => {
      const A = sh[h.key], { E, H } = ik2(A, h.t, 0.66, 0.62, h.pole);
      AV.hand[h.key] = H;
      J.arms.push({ key: h.key, sd: h.sd, H, pole: h.pole, n: h.n });
      const sleeve = vis.sleeve, coatS = vis.coat;
      bm(G.sphere, M.chain(M.T(A[0], A[1], A[2]), M.S(0.097)), skin, MS);
      bm(AG.uarm, boneM(A, E, 0.094), skin, MS);
      bm(AG.farm, boneM(E, H, 0.079), skin, MS);
      bm(G.sphere, M.chain(M.T(E[0], E[1], E[2]), M.S(0.078)), skin, MS);
      if (sleeve > 0.02) { // maniche
        const r1 = coatS > 0.5 ? 0.17 : 0.128, r2 = coatS > 0.5 ? 0.15 : 0.11;
        const mid = v.mix(E, H, coatS > 0.5 ? 0.86 : 0.66);
        bm(AG.uarm, boneM(A, E, r1 * sleeve), armCol, MC);
        bm(AG.sleeve, boneM(E, mid, r2 * sleeve), armCol, MC);
        bm(G.sphere, M.chain(M.T(E[0], E[1], E[2]), M.S(r1 * 0.84 * sleeve)), armCol, MC);
        bm(G.sphere, M.chain(M.T(A[0], A[1], A[2]), M.S(0.152 * sleeve)), armCol, MC);
        if (coatS < 0.5) bm(AG.tube, boneM(v.mix(E, mid, 0.9), v.add(mid, v.mul(v.sub(mid, E), 0.04)), r2 * 0.92 * sleeve), SWEATER_D, MC); // polsino a coste
      }
      // mano
      const fd = v.nrm(v.sub(H, E)); AV.grip[h.key] = v.add(H, v.mul(fd, 0.2));
      let zz = v.sub(h.n, v.mul(fd, v.dot(h.n, fd))); if (v.len(zz) < 1e-3) zz = [0, 0, 1]; zz = v.nrm(zz);
      const hm = basis(H, v.cross(fd, zz), fd, zz);
      const bn = (a, b, r) => bm(AG.tube, boneM(M.pt(hm, a), M.pt(hm, b), r), skin, MS);
      bm(G.sphere, M.mul(hm, M.chain(M.T(0, 0.085, 0), M.S(0.066, 0.1, 0.036))), skin, MS);
      const fing = (x, l1, l2, cv, r) => {
        const a1 = cv * 1.0, a2 = cv * 1.25;
        const p0 = [x, 0.17, 0], p1 = [x, 0.17 + Math.cos(a1) * l1, Math.sin(a1) * l1], p2 = [x, p1[1] + Math.cos(a1 + a2) * l2, p1[2] + Math.sin(a1 + a2) * l2];
        bn(p0, p1, r); bn(p1, p2, r * 0.9);
      };
      const c = h.c;
      fing(h.sd * 0.036, 0.1, 0.085, c[0], 0.02);   // indice
      fing(0.0 * h.sd, 0.105, 0.085, c[1], 0.021); fing(-h.sd * 0.03, 0.098, 0.08, c[1], 0.019); fing(-h.sd * 0.056, 0.08, 0.065, c[1], 0.017);
      const th = c[2]; // pollice
      const t0 = [h.sd * 0.062, 0.05, 0.005], t1 = [h.sd * (0.1 - th * 0.05), 0.1 + th * 0.04, 0.03 + th * 0.06], t2 = [h.sd * (0.1 - th * 0.09), 0.15 + th * 0.03, 0.04 + th * 0.12];
      bn(t0, t1, 0.023); bn(t1, t2, 0.02);
    });
    if (glbOn) X.later(() => X.GLB.draw(J, t));
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
    const STL = [0.78, 0.8, 0.84], STLM = { spec: 0.8, shin: 100, rim: 1, mat: MAT.metal };
    mesh(G.cyl, M.mul(bm, M.S(0.032, 1.25 * f, 0.032)), STL, STLM);
    [-1, 1].forEach((sd) => {
      const o = M.chain(bm, M.T(0, sd * 0.95 * f, 0));
      mesh(G.cyl, M.mul(o, M.S(0.5 * f, 0.1 * f, 0.5 * f)), [0.07, 0.07, 0.08], { spec: 0.14, shin: 16, rim: 0.5 });   // disco in gomma nera
      mesh(G.cyl, M.mul(o, M.chain(M.T(0, sd * 0.06, 0), M.S(0.41 * f, 0.05 * f, 0.41 * f))), [0.1, 0.1, 0.11], soft);
      mesh(G.cyl, M.mul(o, M.chain(M.T(0, sd * 0.07, 0), M.S(0.34 * f, 0.05 * f, 0.34 * f))), [0.84, 0.1, 0.06], gloss);  // anello rosso
      mesh(G.cyl, M.mul(o, M.chain(M.T(0, sd * 0.075, 0), M.S(0.3 * f, 0.05 * f, 0.3 * f))), [0.07, 0.07, 0.08], soft);
      mesh(G.cyl, M.mul(o, M.chain(M.T(0, sd * 0.1, 0), M.S(0.1 * f, 0.04 * f, 0.1 * f))), STL, STLM);                     // mozzo cromato
    });
  });
}
