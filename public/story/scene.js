// La scena: frullatore, ingredienti, shaker e integratori. Tutto è una funzione del tempo T (0 → T_END):
// non c'è stato da conservare, quindi scorrendo avanti e indietro la sequenza si riavvolge identica.
import { M, lathe, smooth, sweep, leaf, quad, upload, reupload, program } from './gl.js';

export const T_END = 6.2;
// finestre dei sei passaggi di testo (usate anche da main.js)
export const BEATS = [[0, 1.0], [1.0, 2.0], [2.0, 3.2], [3.2, 4.2], [4.2, 5.2], [5.2, T_END]];
export const CHAPTER_SPLIT = 3.2;

/* ---------- utilità ---------- */
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lin = (a, b, x) => cl((x - a) / (b - a));
const sm = (a, b, x) => { const t = lin(a, b, x); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const eo = (t) => 1 - Math.pow(1 - t, 3);
const hx = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mixc = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/* ---------- colori (tutti smorzati: restano dentro la palette del sito) ---------- */
const C = {
  banana: hx('#d9c68c'), apple: hx('#b3695c'), carrot: hx('#c98d63'), spinach: hx('#6f8467'), stem: hx('#6b5a45'),
  avocado: hx('#5d6d4f'), almond: hx('#a68768'), berry: hx('#666a8a'),
  charcoal: hx('#333831'), charcoal2: hx('#454b42'), sage: hx('#788373'), sageD: hx('#566052'), ivory: hx('#f6f3ee'), sand: hx('#ded5ca'), taupe: hx('#b8a99a'),
  smoothie: hx('#aebd93'), creamy: hx('#cbcaa8'), butter: hx('#dcc58c'), gold: hx('#c9a15e'), orange: hx('#d39b66'), powder: hx('#f8f5ef'),
  glass: hx('#e9eee8'), frost: hx('#e6e1d6'), steel: hx('#cfcac1'),
};

/* ---------- shader ---------- */
const VS = `
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor;
#ifdef INST
layout(location=2) in vec4 aOff; layout(location=3) in vec4 aCol;
out vec4 vCol;
#endif
uniform mat4 uM; uniform mat4 uVP;
out vec3 vW; out vec3 vN; out vec3 vL;
void main(){
#ifdef INST
  vec4 w = vec4(aPos*aOff.w + aOff.xyz, 1.); vW = w.xyz; vN = aNor; vL = aPos; vCol = aCol;
#else
  vec4 w = uM*vec4(aPos,1.); vW = w.xyz; vN = transpose(inverse(mat3(uM)))*aNor; vL = aPos;
#endif
  gl_Position = uVP*w;
}`;

const FS = `
precision highp float;
in vec3 vW; in vec3 vN; in vec3 vL;
#ifdef INST
in vec4 vCol;
#endif
uniform vec3 uEye, uCol, uC1, uC2;
uniform vec4 uMat;    // spec, shininess, fresnel, env
uniform vec4 uOpt;    // alpha, mode (0 opaco, 1 vetro, 2 liquido, 3 metallo), marmo, tempo
uniform vec4 uPlane;  // livello, ampiezza onda, fase onda, attivo
uniform float uSwirl;
out vec4 o;
const vec3 SKY = vec3(.965,.953,.935), GND = vec3(.80,.755,.69);
vec3 envc(vec3 d){
  float h = clamp(d.y*.5+.5,0.,1.);
  vec3 c = mix(GND, SKY, smoothstep(.22,.78,h));
  float b1 = smoothstep(.62,.9, dot(d, normalize(vec3(-.5,.55,.7))));
  float b2 = smoothstep(.75,.96, dot(d, normalize(vec3(.85,.25,-.35))));
  float st = smoothstep(.93,.985, dot(d, normalize(vec3(.05,.95,.3))));
  return c + vec3(1.,.985,.96)*(b1*.9 + b2*.55 + st*.5);
}
void main(){
  bool front = gl_FrontFacing;
  vec3 n = normalize(vN); if(!front) n = -n;
  vec3 V = normalize(uEye - vW);
  vec3 L = normalize(vec3(-.45,.8,.55));
  float ndv = max(dot(n,V),0.);
  vec3 R = reflect(-V,n);
  float fr = pow(1.-ndv,4.);
  float mode = uOpt.y;
  vec3 base = uCol;
#ifdef INST
  base = vCol.rgb;
#endif
  if (mode < .5) {
    float wr = clamp((dot(n,L)+.55)/1.55,0.,1.);
    vec3 amb = mix(GND*.8, SKY, n.y*.5+.5);
    vec3 c = base*(amb*.62 + vec3(1.,.975,.94)*wr*.64);
    float rim = pow(1.-ndv,3.)*max(dot(n,normalize(vec3(.8,.35,-.5)))+.3,0.)*.3;
    c += vec3(1.,.98,.95)*rim*(.45+uMat.z);
    c += envc(R)*uMat.w*(.03+uMat.z*fr);
    c += vec3(1.)*pow(max(dot(R,L),0.),uMat.y)*uMat.x;
    o = vec4(c,1.);
  } else if (mode < 1.5) {
    float f = pow(1.-ndv,2.6);
    float sp = pow(max(dot(R,L),0.),90.)*1.2 + pow(max(dot(R,normalize(vec3(.8,.3,-.4))),0.),40.)*.35;
    float a = uOpt.x + f*.42 + sp*.5;
    vec3 c = mix(uCol, envc(R), .35+.55*f) + vec3(sp);
    if(!front){ a *= .55; c *= .93; }
    a = clamp(a,0.,1.);
    o = vec4(c*a, a);
  } else if (mode < 2.5) {
    float pl = uPlane.x + uPlane.y*(sin(vW.x*5.3+uPlane.z)+sin(vW.z*4.1-uPlane.z*1.3))*.5;
    if (uPlane.w > .5 && vW.y > pl) discard;
    float a = atan(vL.z, vL.x);
    float s = sin(a*2.+vL.y*6.-uOpt.w*uSwirl) + .7*sin(a*3.-vL.y*9.+uOpt.w*uSwirl*1.4) + .4*sin(vL.y*14.+a*5.+uOpt.w*uSwirl*.7);
    vec3 b2 = mix(uCol, mix(uC1,uC2,smoothstep(-1.2,1.2,s)), uOpt.z);
    float dp = uPlane.w > .5 ? pl - vW.y : 1.;
    if (front) {
      float wr = clamp((dot(n,L)+.6)/1.6,0.,1.);
      vec3 c = b2*(mix(GND,SKY,n.y*.5+.5)*.58 + vec3(1.,.98,.95)*wr*.62);
      c += b2*pow(1.-ndv,2.)*.1;
      c += vec3(pow(max(dot(R,L),0.),28.)*.5);
      c += envc(R)*.05*(.2+fr);
      c += vec3(smoothstep(.03,0.,dp)*.16);
      o = vec4(c,1.);
    } else {
      float depth = clamp(dp*2.4,0.,1.);
      vec3 c = b2*(1.05-.3*depth) + vec3(smoothstep(.05,0.,dp)*.12);
      o = vec4(c,1.);
    }
  } else {
    vec3 e = envc(R);
    vec3 c = base*(.34 + .85*e) + vec3(pow(max(dot(R,L),0.),uMat.y)*uMat.x);
    c += vec3(.05)*pow(1.-ndv,3.);
    o = vec4(c,1.);
  }
}`;

const SVS = `
layout(location=0) in vec3 aPos;
uniform mat4 uM; uniform mat4 uVP; out vec2 vUV;
void main(){ vUV = aPos.xz; gl_Position = uVP*(uM*vec4(aPos,1.)); }`;
const SFS = `
precision highp float;
in vec2 vUV; uniform float uA; out vec4 o;
void main(){ float d = length(vUV); float a = uA*pow(smoothstep(1.,0.,d),1.6); o = vec4(vec3(.2,.19,.17)*a, a); }`;

/* ---------- geometrie ---------- */
const sphereProf = (n = 14) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n * Math.PI; return [Math.sin(t), -Math.cos(t)]; });

const R_JAR = (y) => 0.30 + 0.16 * Math.pow(Math.max(0, y - 0.09) / 1.21, 0.85);
const R_SH = (y) => 0.265 + 0.085 * (y / 1.05) + 0.006 * (Math.exp(-Math.pow((y - 0.38) / 0.025, 2)) + Math.exp(-Math.pow((y - 0.66) / 0.025, 2)));
const JAR_H = 1.34, SH_H = 1.1;

function jarOuter() {
  const p = [[0, 0], [0.16, 0], [0.24, 0.008], [0.285, 0.035], [0.3, 0.085]];
  for (let k = 1; k <= 26; k++) { const y = 0.09 + 1.21 * k / 26; p.push([R_JAR(y), y]); }
  p.push([0.472, 1.3], [0.485, 1.312], [0.487, 1.33], [0.478, 1.343], [0.462, 1.342]);
  return p;
}
function jarLiquid() {
  const p = [[0, 0.04], [0.15, 0.04], [0.235, 0.05], [0.27, 0.085]];
  for (let k = 0; k <= 24; k++) { const y = 0.1 + 1.18 * k / 24; p.push([R_JAR(y) - 0.032, y]); }
  p.push([0, 1.28]);
  return p;
}
function shOuter() {
  const p = [[0, 0], [0.18, 0], [0.24, 0.012], [0.262, 0.04], [0.268, 0.09]];
  for (let k = 1; k <= 40; k++) { const y = 0.1 + 0.92 * k / 40; p.push([R_SH(y), y]); }
  p.push([0.36, 1.04], [0.368, 1.055], [0.368, 1.085], [0.358, 1.1], [0.342, 1.1]);
  return p;
}
function shLiquid() {
  const p = [[0, 0.035], [0.17, 0.035], [0.23, 0.05], [0.255, 0.09]];
  for (let k = 0; k <= 30; k++) { const y = 0.1 + 0.9 * k / 30; p.push([R_SH(y) - 0.03, y]); }
  p.push([0, 1.0]);
  return p;
}
function volumeSamples(rf, y0, y1, N = 700) { // punti distribuiti nel volume: servono a trovare il livello del liquido
  const out = new Float32Array(N * 3), rmax = rf(y1); let i = 0;
  while (i < N) {
    const y = y0 + rnd() * (y1 - y0), r = rf(y);
    if (rnd() * rmax * rmax > r * r) continue;
    const rr = r * Math.sqrt(rnd()), a = rnd() * Math.PI * 2;
    out[i * 3] = rr * Math.cos(a); out[i * 3 + 1] = y; out[i * 3 + 2] = rr * Math.sin(a); i++;
  }
  return out;
}
function capHalf(r, len) {
  const p = [];
  for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; p.push([r * Math.sin(a), r - r * Math.cos(a)]); }
  p.push([r, r + len], [0, r + len]);
  return p;
}

/* ---------- costruzione ---------- */
export function createScene(canvas) {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true, depth: true, powerPreference: 'high-performance' });
  if (!gl) throw new Error('webgl2');
  const prog = program(gl, '#version 300 es\n' + VS, '#version 300 es\n' + FS);
  const progI = program(gl, '#version 300 es\n#define INST\n' + VS, '#version 300 es\n#define INST\n' + FS);
  const progS = program(gl, '#version 300 es\n' + SVS, '#version 300 es\n' + SFS);

  const mesh = (g, dyn) => upload(gl, g, dyn);
  const G = {
    jarGlass: mesh(lathe(jarOuter(), 64)), jarLiq: mesh(lathe(jarLiquid(), 48)),
    shGlass: mesh(lathe(shOuter(), 64)), shLiq: mesh(lathe(shLiquid(), 48)),
    base: mesh(lathe([[0, 0], [0.56, 0], [0.585, 0.02], [0.6, 0.08], [0.595, 0.16], [0.56, 0.3], [0.5, 0.37], [0.44, 0.395], [0.4, 0.4], [0, 0.4]], 64)),
    knob: mesh(lathe([[0, 0], [0.07, 0], [0.076, 0.01], [0.076, 0.034], [0.062, 0.042], [0, 0.042]], 28)),
    ring: mesh(lathe([[0.58, 0.15], [0.6, 0.155], [0.607, 0.18], [0.6, 0.205], [0.58, 0.21]], 64)),
    lid: mesh(lathe([[0, 0], [0.5, 0], [0.505, 0.02], [0.5, 0.06], [0.47, 0.09], [0.43, 0.1], [0.4, 0.14], [0.3, 0.16], [0.27, 0.19], [0.15, 0.2], [0.13, 0.27], [0.11, 0.29], [0, 0.29]], 48)),
    cap: mesh(lathe([[0, 0], [0.35, 0], [0.372, 0.012], [0.376, 0.1], [0.368, 0.15], [0.33, 0.185], [0.27, 0.2], [0.235, 0.22], [0.235, 0.3], [0.2, 0.325], [0.12, 0.34], [0, 0.34]], 56)),
    capRing: mesh(lathe([[0.37, 0.085], [0.382, 0.09], [0.386, 0.11], [0.382, 0.13], [0.37, 0.135]], 56)),
    loop: mesh(sweep(Array.from({ length: 25 }, (_, i) => { const a = i / 24 * Math.PI * 2; return [0.085 * Math.cos(a), 0.34 + 0.085 + 0.085 * Math.sin(a), 0]; }), new Array(25).fill(0.014), 8)),
    sphere: mesh(lathe(sphereProf(14), 18)),
    sphereLo: mesh(lathe(sphereProf(5), 7)),
    apple: mesh(lathe(smooth([[0, -0.9], [0.45, -0.86], [0.82, -0.6], [0.98, -0.15], [1, 0.25], [0.84, 0.68], [0.52, 0.86], [0.2, 0.8], [0.08, 0.66], [0, 0.64]], 5), 28)),
    stem: mesh(sweep([[0, 0.55, 0], [0.01, 0.8, 0], [0.04, 1.0, 0]], [0.035, 0.03, 0.025], 6)),
    avocado: mesh(lathe(smooth([[0, -0.52], [0.24, -0.48], [0.4, -0.22], [0.38, 0.14], [0.28, 0.38], [0.14, 0.5], [0, 0.52]], 5), 28)),
    carrot: mesh(lathe(smooth([[0, -0.34], [0.014, -0.325], [0.07, -0.1], [0.092, 0.2], [0.086, 0.3], [0, 0.31]], 5), 20)),
    leafMesh: mesh(leaf(0.62, 0.42, 16, 8, 0.55, 0.3)),
    banana: mesh(sweep(Array.from({ length: 20 }, (_, i) => { const t = i / 19, a = -0.62 + 1.24 * t; return [0.72 * Math.sin(a), 0.72 * (1 - Math.cos(a)) - 0.12, 0]; }), Array.from({ length: 20 }, (_, i) => { const t = i / 19; return 0.016 + 0.062 * Math.pow(Math.sin(Math.PI * (0.06 + 0.88 * t)), 0.55); }), 10)),
    halfCap: mesh(lathe(capHalf(0.046, 0.05), 16)),
    scoopBowl: mesh(lathe([[0, 0], [0.05, 0.004], [0.09, 0.024], [0.116, 0.06], [0.128, 0.105], [0.122, 0.108], [0.11, 0.08], [0.085, 0.046], [0.045, 0.024], [0, 0.02]], 32)),
    scoopHandle: mesh(sweep([[0.1, 0.09, 0], [0.2, 0.1, 0], [0.34, 0.11, 0], [0.44, 0.11, 0]], [0.017, 0.016, 0.015, 0.02], 8)),
    shadow: mesh(quad()), stream: mesh({ pos: new Float32Array(9), nor: new Float32Array(9), idx: new Uint32Array(3) }, true),
  };
  // sfere istanziate (polvere di creatina)
  const NP = 64, instBuf = gl.createBuffer(), instData = new Float32Array(NP * 8);
  const sph = lathe(sphereProf(5), 7), pm = upload(gl, sph);
  gl.bindVertexArray(pm.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, instBuf); gl.bufferData(gl.ARRAY_BUFFER, instData.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(2, 1);
  gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(3, 1);
  gl.bindVertexArray(null);
  const parts = Array.from({ length: NP }, (_, i) => ({ t: 3.5 + 0.34 * (i / NP) + rnd() * 0.02, x: (rnd() - 0.5) * 0.06, z: (rnd() - 0.5) * 0.06, vx: -0.05 - rnd() * 0.14, r: 0.011 + rnd() * 0.007, k: 0.9 + rnd() * 0.1 }));

  const samJar = volumeSamples((y) => R_JAR(y) - 0.032, 0.04, 1.28);
  const samSh = volumeSamples((y) => R_SH(y) - 0.03, 0.035, 1.0);
  const levelOf = (m, sam, frac) => {
    if (frac <= 0.0005) return -9;
    if (frac >= 0.999) return 99;
    const n = sam.length / 3, ys = new Float32Array(n);
    for (let i = 0; i < n; i++) ys[i] = m[1] * sam[i * 3] + m[5] * sam[i * 3 + 1] + m[9] * sam[i * 3 + 2] + m[13];
    ys.sort();
    return ys[Math.min(n - 1, Math.floor(frac * n))];
  };

  /* ---------- ingredienti ---------- */
  const leafPart = (col) => ({ mesh: G.leafMesh, col, mat: 'matte', scale: 1 });
  const ING = [
    { id: 'banana', t0: 0.00, dur: 0.40, x0: -1.15, z0: 0.1, xr: -0.04, zr: 0.03, yr: 1.0, r0: [0.4, 0.3, 1.5], r1: [0.05, 0.2, 0.34], parts: [{ mesh: G.banana, col: C.banana, mat: 'soft' }] },
    { id: 'spinach', t0: 0.12, dur: 0.36, x0: 1.05, z0: -0.1, xr: 0.02, zr: 0.0, yr: 1.22, r0: [0.5, 1.2, 0.4], r1: [0.35, 0.2, 0.15], parts: [leafPart(C.spinach)], extra: [{ off: [-0.08, -0.04, 0.05], rot: [0.3, 2.2, -0.2] }] },
    { id: 'avocado', t0: 0.24, dur: 0.36, x0: -0.8, z0: 0.15, xr: 0.12, zr: -0.05, yr: 0.78, r0: [0.5, 0.2, 0.8], r1: [0.1, 0.5, -0.2], parts: [{ mesh: G.avocado, col: C.avocado, mat: 'soft', scale: 0.4 }] },
    { id: 'apple', t0: 0.36, dur: 0.36, x0: 0.92, z0: 0.12, xr: -0.14, zr: 0.07, yr: 0.66, r0: [0.3, 0.2, -0.6], r1: [0, 0.8, 0.1], parts: [{ mesh: G.apple, col: C.apple, mat: 'soft', scale: 0.2 }, { mesh: G.stem, col: C.stem, mat: 'matte', scale: 0.2 }] },
    { id: 'carrot', t0: 0.48, dur: 0.36, x0: -0.55, z0: -0.1, xr: 0.04, zr: -0.08, yr: 0.96, r0: [0.2, 0.2, 1.1], r1: [0.05, 0.1, -0.34], parts: [{ mesh: G.carrot, col: C.carrot, mat: 'matte', scale: 1 }, { mesh: G.leafMesh, col: C.spinach, mat: 'matte', scale: 0.22, off: [0, 0.34, 0], rot: [0, 0, 1.5] }] },
    { id: 'almond', t0: 0.58, dur: 0.34, x0: 0.7, z0: 0.0, xr: 0.0, zr: 0.0, yr: 0.55, r0: [0.5, 0.2, 0.2], r1: [0.2, 0.9, 0.1], parts: [{ mesh: G.sphere, col: C.almond, mat: 'soft', sc3: [0.09, 0.055, 0.055] }], extra: [{ off: [0.08, 0.14, 0.05], rot: [0.3, 0.6, 0.9] }, { off: [-0.06, 0.07, -0.07], rot: [0.9, 0.2, 0.2] }] },
    { id: 'berry', t0: 0.66, dur: 0.34, x0: -0.2, z0: 0.1, xr: 0.0, zr: 0.02, yr: 0.52, r0: [0, 0, 0], r1: [0, 0, 0], parts: [{ mesh: G.sphere, col: C.berry, mat: 'gloss', scale: 0.062 }], extra: [{ off: [0.1, 0.08, 0.06], rot: [0, 0, 0] }, { off: [-0.09, 0.12, -0.05], rot: [0, 0, 0] }] },
  ];
  // integratori: cadono nello shaker e vengono assorbiti dal liquido
  const SUP = [
    { id: 'mag', t0: 3.55, dur: 0.30, x0: 0.62, z0: 0.1, xr: 0.05, zr: 0, rot: [0.3, 0.2, 0.7], cap: [C.sage, C.ivory] },
    { id: 'mag2', t0: 3.66, dur: 0.30, x0: -0.5, z0: -0.1, xr: -0.06, zr: 0.04, rot: [0.2, 0.9, -0.5], cap: [C.sage, C.ivory] },
    { id: 'omega', t0: 3.76, dur: 0.30, x0: 0.45, z0: -0.1, xr: 0.08, zr: -0.03, rot: [0.5, 0.4, 0.3], soft: [C.gold, [0.085, 0.05, 0.05]] },
    { id: 'omega2', t0: 3.86, dur: 0.30, x0: -0.65, z0: 0.1, xr: -0.08, zr: 0.05, rot: [0.2, 1.1, 0.8], soft: [C.gold, [0.085, 0.05, 0.05]] },
    { id: 'vitd', t0: 3.96, dur: 0.30, x0: 0.7, z0: 0.0, xr: 0.0, zr: 0.06, rot: [0, 0, 0], soft: [C.orange, [0.052, 0.052, 0.052]] },
    { id: 'vitd2', t0: 4.06, dur: 0.30, x0: -0.4, z0: 0.0, xr: 0.03, zr: -0.05, rot: [0, 0, 0], soft: [C.orange, [0.052, 0.052, 0.052]] },
  ];
  const SH_X = 0.95;

  /* ---------- stato di rendering ---------- */
  let W = 1, H = 1, DPR = 1, VP = M.id(), eye = [0, 1, 5], layout = { cx: 0, cy: 0, w: 1, h: 1 };
  const state = { tags: {} };
  const MATS = {
    matte: [0.12, 14, 0.12, 0.15], soft: [0.35, 30, 0.3, 0.3], gloss: [0.9, 70, 0.6, 0.5], metal: [1.0, 60, 0.5, 1], plastic: [0.6, 40, 0.4, 0.4],
  };

  function setLayout(l) {
    layout = l;
    const FOV = 0.46, fit = Math.min(l.w / 2.8, l.h / 2.75);
    state.fov = FOV; state.dist0 = H / (2 * fit * Math.tan(FOV / 2));
    state.sx = (l.cx - W / 2) / (W / 2); state.sy = -(l.cy - H / 2) / (H / 2);
  }
  function resize(w, h, dpr, l) {
    W = w; H = h; DPR = dpr;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    setLayout(l || layout);
  }

  const camKeys = [ // T, yaw, pitch, dolly, targetY
    [0, -0.1, 0.25, 1, 1.0], [1.0, -0.04, 0.25, 1, 1.05], [2.5, 0.07, 0.26, 1, 1.32], [3.3, 0.0, 0.27, 0.9, 1.0],
    [4.5, 0.05, 0.25, 0.82, 0.92], [5.3, 0.0, 0.24, 0.8, 0.9], [T_END, 0.13, 0.19, 0.74, 0.8],
  ];
  function camAt(T) {
    let i = 0; while (i < camKeys.length - 2 && T > camKeys[i + 1][0]) i++;
    const a = camKeys[i], b = camKeys[i + 1], t = sm(a[0], b[0], T);
    return [1, 2, 3, 4].map((k) => mix(a[k], b[k], t));
  }

  /* ---------- disegno ---------- */
  let cur = null;
  const use = (p) => { if (cur !== p) { gl.useProgram(p.p); cur = p; } return p; };
  function draw(g, model, o) {
    const p = use(prog), u = p.u;
    gl.uniformMatrix4fv(u.uM, false, model); gl.uniformMatrix4fv(u.uVP, false, VP); gl.uniform3fv(u.uEye, eye);
    gl.uniform3fv(u.uCol, o.col || C.ivory);
    gl.uniform3fv(u.uC1, o.c1 || C.ivory); gl.uniform3fv(u.uC2, o.c2 || C.ivory);
    const mt = MATS[o.mat || 'matte'];
    gl.uniform4f(u.uMat, mt[0], mt[1], mt[2], mt[3]);
    gl.uniform4f(u.uOpt, o.alpha ?? 1, o.mode || 0, o.marble || 0, o.time || 0);
    const pl = o.plane; gl.uniform4f(u.uPlane, pl ? pl[0] : 0, pl ? pl[1] : 0, pl ? pl[2] : 0, pl ? 1 : 0);
    gl.uniform1f(u.uSwirl, o.swirl || 0);
    gl.bindVertexArray(g.vao); gl.drawElements(gl.TRIANGLES, g.n, gl.UNSIGNED_INT, 0);
  }
  const shadow = (x, z, r, a) => {
    if (a <= 0.003) return;
    const p = use(progS);
    gl.uniformMatrix4fv(p.u.uM, false, M.chain(M.T(x, 0.001, z), M.S(r, 1, r * 0.62))); gl.uniformMatrix4fv(p.u.uVP, false, VP);
    gl.uniform1f(p.u.uA, a);
    gl.bindVertexArray(G.shadow.vao); gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_INT, 0);
  };
  const rotE = (r) => M.chain(M.Ry(r[1]), M.Rx(r[0]), M.Rz(r[2]));

  function render(T, clock = 0) {
    T = cl(T, 0, T_END);
    const [yaw, pitch, dolly, ty] = camAt(T);
    const d = state.dist0 * dolly;
    eye = [Math.sin(yaw) * Math.cos(pitch) * d, ty + Math.sin(pitch) * d, Math.cos(yaw) * Math.cos(pitch) * d];
    const proj = M.persp(state.fov, W / H, 0.5, 40, state.sx, state.sy);
    VP = M.mul(proj, M.look(eye, [0, ty, 0]));
    state.VP = VP; state.pxu = H / (2 * d * Math.tan(state.fov / 2));

    /* — pose del frullatore — */
    const vibA = sm(1.18, 1.3, T) * (1 - sm(1.85, 1.95, T));
    const vib = [Math.sin(T * 141) * 0.0045 * vibA, Math.sin(T * 173) * 0.003 * vibA, Math.sin(T * 127) * 0.0045 * vibA];
    const baseX = -7 * sm(2.45, 3.6, T);
    const lift = sm(2.0, 2.35, T), move = sm(2.2, 2.7, T), tilt = Math.pow(sm(2.25, 2.78, T), 1.15) * 1.66, exit = sm(3.0, 3.55, T);
    const S = [0.48, JAR_H, 0]; // bordo da cui si versa, nel sistema del vaso
    let jarM, spout;
    if (T < 2.0) {
      jarM = M.T(vib[0], 0.4 + vib[1], vib[2]); spout = null;
    } else {
      const sw = [mix(0.48, SH_X - 0.2, move) - 1.9 * exit, mix(0.4 + JAR_H + 0.55 * lift, 1.5, move) + 2.3 * exit, 0];
      spout = sw;
      jarM = M.chain(M.T(sw[0], sw[1], 0), M.Rz(-tilt), M.T(-S[0], -S[1], 0));
    }
    const baseM = M.T(baseX + vib[0], vib[1] * 0.3, vib[2]);

    /* — pose dello shaker — */
    const rise = eo(lin(1.95, 2.45, T)), cx = mix(SH_X, 0, sm(3.0, 3.45, T));
    const shA = sm(4.78, 4.92, T) * (1 - sm(5.3, 5.5, T));
    const shY = -1.9 * (1 - rise) + shA * 0.1 * Math.abs(Math.sin(T * 36));
    const shM = M.chain(M.T(cx, shY, 0), M.Ry(0.55 * sm(5.45, T_END, T)), M.Rz(shA * 0.17 * Math.sin(T * 18 + 1)), M.Rx(shA * 0.06 * Math.sin(T * 23)));

    /* — liquidi — */
    const fJ = T < 2.3 ? 0.62 * sm(1.2, 1.85, T) : 0.62 * (1 - sm(2.5, 2.98, T));
    const fS = 0.7 * sm(2.62, 3.02, T) + 0.05 * lin(3.5, 4.3, T);
    const lvJ = levelOf(jarM, samJar, fJ), lvS = levelOf(shM, samSh, fS);
    let slosh = 0.004 + 0.012 * vibA * 3 + shA * 0.05;
    for (const s of SUP) { const a = T - (s.t0 + s.dur - 0.04); if (a > 0 && a < 0.5) slosh += 0.02 * Math.exp(-a * 7) * Math.abs(Math.sin(a * 55)); }
    slosh += 0.006 * sm(2.6, 3.1, T) * (1 - sm(3.1, 3.4, T)) + 0.018 * sm(2.6, 2.9, T) * (1 - sm(2.95, 3.3, T));
    const marbJ = 1 - sm(1.3, 1.95, T);
    const marbS = T < 3.4 ? marbJ * 0.0 : 0.55 * sm(3.5, 4.0, T) * (1 - sm(4.9, 5.4, T));
    const colS = mixc(C.smoothie, C.creamy, sm(4.9, 5.5, T));

    /* — pulizia e ombre — */
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE); gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    cur = null;
    shadow(baseX, 0, 0.82 * (1 + 0.1 * lift), 0.34);
    shadow(cx, 0, 0.5 * (1 + 0.25 * (1 + shY / 1.9)), 0.34 * rise);
    if (spout) shadow(spout[0] - 0.7, 0, 0.7 + 0.5 * lift, 0.1 * (1 - exit) * lift);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true);

    /* — oggetti opachi — */
    draw(G.base, baseM, { col: C.charcoal, mat: 'plastic' });
    draw(G.ring, baseM, { col: C.sage, mat: 'soft' });
    draw(G.knob, M.chain(baseM, M.T(0, 0.27, 0.57), M.Rx(1.2)), { col: C.charcoal2, mat: 'soft' });
    // lame
    const bl = M.chain(jarM, M.T(0, 0.075, 0));
    if (T < 2.0 && fJ < 0.4) {
      const a = T * 60;
      draw(G.sphere, M.chain(bl, M.Ry(a), M.S(0.2, 0.012, 0.045)), { col: C.steel, mat: 'metal', mode: 3 });
      draw(G.sphere, M.chain(bl, M.Ry(a + 1.57), M.S(0.2, 0.012, 0.045)), { col: C.steel, mat: 'metal', mode: 3 });
    }

    // ingredienti
    state.tags = {};
    const blendT = (T - 1.15);
    ING.forEach((it, idx) => {
      const u = lin(it.t0, it.t0 + it.dur, T);
      if (T < it.t0 || T > 2.0) return;
      const k = Math.pow(u, 1.7), wx = sm(0, 0.74, u);
      let p = [mix(it.x0, it.xr, wx), mix(3.6, it.yr, k), mix(it.z0, it.zr, wx)];
      const ro = [0, 1, 2].map((q) => mix(it.r0[q], it.r1[q], sm(0, 1, u)));
      // frullatura: ruotano attorno all'asse e si rimpiccioliscono
      let shr = 1, extraSpin = 0;
      if (blendT > 0) {
        const a = blendT * 4.5 * (0.6 + 0.12 * idx), r = Math.hypot(p[0], p[2]);
        const ang = Math.atan2(p[2], p[0]) + a;
        p = [r * Math.cos(ang), p[1] - 0.05 * sm(0, 0.6, blendT), r * Math.sin(ang)];
        shr = 1 - sm(1.3 + 0.05 * idx, 1.8 + 0.05 * idx, T);
        extraSpin = a * 1.5;
      }
      p[0] += vib[0]; p[1] += 0.4 * 0 + vib[1]; p[2] += vib[2];
      if (shr <= 0.01) return;
      const items = [{ off: [0, 0, 0], rot: [0, 0, 0] }, ...(it.extra || [])];
      items.forEach((ex, ei) => {
        const base = M.chain(M.T(p[0] + ex.off[0] * shr, p[1] + ex.off[1] * shr, p[2] + ex.off[2] * shr), rotE([ro[0] + ex.rot[0], ro[1] + ex.rot[1] + extraSpin, ro[2] + ex.rot[2]]), M.S(shr));
        for (const part of it.parts) {
          const sc = part.sc3 || [part.scale || 1, part.scale || 1, part.scale || 1];
          const po = part.off ? M.T(part.off[0], part.off[1], part.off[2]) : M.id();
          const pr = part.rot ? rotE(part.rot) : M.id();
          draw(part.mesh, M.chain(base, po, pr, M.S(sc[0], sc[1], sc[2])), { col: part.col, mat: part.mat });
        }
      });
      const vis = sm(it.t0 + 0.04, it.t0 + 0.16, T) * (1 - sm(it.t0 + it.dur - 0.12, it.t0 + it.dur + 0.04, T));
      state.tags[it.id] = { p, v: vis };
    });

    // coperchio del frullatore
    {
      const land = lin(0.95, 1.16, T), dropY = 2.4 * (1 - land * land) * (T < 1.16 ? 1 : 0);
      const away = sm(1.95, 2.3, T);
      if (T > 0.95 && away < 1) {
        const bounce = T > 1.16 && T < 1.3 ? 0.012 * Math.sin((T - 1.16) / 0.14 * Math.PI) : 0;
        const lm = M.chain(M.T(vib[0] - 0.9 * away, 0.4 + JAR_H - 0.0 + dropY + 2.6 * away + bounce, vib[2]), M.Rz(0.5 * away), M.Ry(2 * away));
        draw(G.lid, lm, { col: C.charcoal, mat: 'plastic' });
      }
    }

    // shaker e cappuccio
    let capDraw = null;
    if (T > 4.3) {
      const c = lin(4.35, 4.72, T), e = eo(c);
      capDraw = M.chain(shM, M.T(0, SH_H - 0.01 + 2.3 * (1 - e) + (c < 1 ? 0 : 0), 0), M.Ry(2.6 * (1 - e)), M.Rx(0.35 * (1 - e)));
      draw(G.cap, capDraw, { col: C.charcoal, mat: 'plastic' });
      draw(G.capRing, capDraw, { col: C.sage, mat: 'soft' });
      draw(G.loop, capDraw, { col: C.charcoal2, mat: 'plastic' });
    }

    // integratori
    SUP.forEach((s) => {
      if (T < s.t0 || T > s.t0 + s.dur + 0.25) return;
      const u = lin(s.t0, s.t0 + s.dur + 0.05, T), k = Math.pow(u, 1.55), wx = sm(0, 0.7, u);
      const ytop = SH_H + 0.1, ybot = lvS - 0.05;
      const p = [mix(s.x0, s.xr + cx, wx), mix(3.4, ybot, k), mix(s.z0, s.zr, wx)];
      const under = 1 - sm(lvS + 0.01, lvS - 0.12, p[1]);
      if (under <= 0.01) return;
      const ro = s.rot.map((v, i) => v + (i === 2 ? u * 5 : u * 3));
      const base = M.chain(M.T(p[0], p[1], p[2]), rotE(ro), M.S(under * 1.55));
      if (s.cap) {
        draw(G.halfCap, M.chain(base, M.T(0, -0.096, 0)), { col: s.cap[0], mat: 'gloss' });
        draw(G.halfCap, M.chain(base, M.Rz(Math.PI), M.T(0, -0.096, 0)), { col: s.cap[1], mat: 'gloss' });
      } else {
        draw(G.sphere, M.chain(base, M.S(s.soft[1][0], s.soft[1][1], s.soft[1][2])), { col: s.soft[0], mat: 'gloss' });
      }
      const vis = sm(s.t0 + 0.02, s.t0 + 0.12, T) * (1 - sm(s.t0 + s.dur - 0.06, s.t0 + s.dur + 0.04, T));
      state.tags[s.id] = { p, v: vis };
    });

    // misurino di creatina
    {
      const inn = eo(lin(3.2, 3.46, T)), out = sm(3.86, 4.1, T), pourA = sm(3.44, 3.62, T) * (1 - sm(3.8, 3.92, T)) * 1.0 + 0.0;
      if (T > 3.2 && out < 1) {
        const tilt2 = 1.25 * sm(3.44, 3.66, T) * (1 - sm(3.84, 3.95, T));
        const px = mix(1.7, 0.42, inn) + 1.5 * out, py = mix(3.4, 1.95, inn) + 1.2 * out;
        const sM = M.chain(M.T(px, py, 0), M.Rz(tilt2), M.S(1.45), M.T(-0.0, -0.06, 0));
        draw(G.scoopBowl, sM, { col: C.sand, mat: 'plastic' });
        draw(G.scoopHandle, sM, { col: C.sand, mat: 'plastic' });
        const mound = 1 - sm(3.5, 3.84, T);
        if (mound > 0.02) draw(G.sphere, M.chain(sM, M.T(0, 0.085, 0), M.S(0.112, 0.05 * mound + 0.004, 0.112)), { col: C.powder, mat: 'matte' });
        const lip = M.pt(sM, [-0.122, 0.105, 0]);
        state.lip = lip;
        state.tags.creatina = { p: [px - 0.08, py, 0], v: sm(3.28, 3.42, T) * (1 - sm(3.72, 3.88, T)) };
      }
    }

    // polvere
    if (T > 3.45 && T < 4.3 && state.lip) {
      let n = 0; const lip = state.lip;
      for (const q of parts) {
        const a = T - q.t; if (a < 0 || a > 0.6) continue;
        const x = lip[0] + q.x + q.vx * a, y = lip[1] - 0.5 * 15 * a * a, z = lip[2] + q.z;
        if (y < lvS + 0.01) continue;
        instData.set([x, y, z, q.r, 0.97 * q.k, 0.955 * q.k, 0.93 * q.k, 1], n * 8); n++;
      }
      if (n) {
        gl.bindBuffer(gl.ARRAY_BUFFER, instBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, instData, 0, n * 8);
        const p = use(progI);
        gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniform3fv(p.u.uEye, eye);
        gl.uniform4f(p.u.uMat, 0.1, 14, 0.1, 0.1); gl.uniform4f(p.u.uOpt, 1, 0, 0, 0); gl.uniform4f(p.u.uPlane, 0, 0, 0, 0);
        gl.bindVertexArray(pm.vao); gl.drawElementsInstanced(gl.TRIANGLES, pm.n, gl.UNSIGNED_INT, 0, n);
      }
    }

    // liquidi (opachi)
    const swT = T * 1;
    if (lvJ > -8 && T < 3.6) draw(G.jarLiq, jarM, { col: C.smoothie, c1: C.butter, c2: C.spinach, marble: marbJ * 0.95, time: swT, swirl: 9 * vibA + 0.6, plane: [lvJ, slosh + 0.01 * vibA, T * 14 + clock * 1.7], mode: 2 });
    if (lvS > -8) draw(G.shLiq, shM, { col: colS, c1: C.powder, c2: C.gold, marble: marbS, time: swT, swirl: 3 + 14 * shA, plane: [lvS, slosh, T * 12 + clock * 1.7], mode: 2 });

    // filo del versamento
    if (spout) {
      const s0 = lin(2.9, 3.06, T), s1 = lin(2.5, 2.64, T);
      if (s1 > s0 + 0.01 && T < 3.1) {
        const P0 = [spout[0] + 0.03, spout[1] - 0.02, 0], L = [SH_X - 0.04 + (cx - SH_X), Math.max(lvS, 0.4), 0];
        const dx = L[0] - P0[0], dy = P0[1] - L[1], N = 14, path = [], rad = [];
        for (let i = 0; i <= N; i++) {
          const s = mix(s0, s1, i / N);
          path.push([P0[0] + dx * s, P0[1] - dy * s * s, 0.004 * Math.sin(T * 30 + s * 9)]);
          rad.push(0.036 * (1 - 0.3 * s) * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, i / N * 1.15 + 0.12))));
        }
        reupload(gl, G.stream, sweep(path, rad, 8));
        draw(G.stream, M.id(), { col: C.smoothie, mat: 'soft', mode: 2 });
      }
    }

    /* — vetro (per ultimo, con trasparenza) — */
    gl.depthMask(false);
    gl.enable(gl.CULL_FACE);
    const glassJ = { col: C.glass, mode: 1, alpha: 0.07 }, glassS = { col: C.frost, mode: 1, alpha: 0.22 };
    const jarVisible = !(T > 3.6);
    gl.cullFace(gl.FRONT);
    if (jarVisible) draw(G.jarGlass, jarM, glassJ);
    if (T > 1.9) draw(G.shGlass, shM, glassS);
    gl.cullFace(gl.BACK);
    if (jarVisible) draw(G.jarGlass, jarM, glassJ);
    if (T > 1.9) draw(G.shGlass, shM, glassS);
    gl.disable(gl.CULL_FACE); gl.depthMask(true);
  }

  const project = (p) => {
    const m = VP, x = p[0], y = p[1], z = p[2];
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [(cx / cw * 0.5 + 0.5) * W, (1 - (cy / cw * 0.5 + 0.5)) * H];
  };

  return { resize, setLayout, render, project, state, gl };
}
