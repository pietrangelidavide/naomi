// Slot per il modello 3D vero di Naomi.
// Carica un file .glb umanoide con scheletro (nomi Mixamo o Ready Player Me), lo muove con le stesse pose
// del personaggio procedurale (le braccia e le gambe si risolvono con le lunghezze del modello) e lo disegna
// con skinning in WebGL2. Nessuna libreria. Se il file manca o non è valido, resta il personaggio procedurale.
import { texFromBitmap } from './engine.js';

/* ---------- algebra: quaternioni [x,y,z,w] e matrici 4x4 per colonne ---------- */
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vmul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const vlen = (a) => Math.hypot(a[0], a[1], a[2]);
const vnrm = (a) => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const qn = (q) => { const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; };
const qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qinv = (q) => [-q[0], -q[1], -q[2], q[3]];
const qrot = (q, v) => {
  const [x, y, z, w] = q, tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
};
const QI = [0, 0, 0, 1];
const qslerp = (a, b, t) => {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (d < 0) { b = [-b[0], -b[1], -b[2], -b[3]]; d = -d; }
  if (d > 0.9995) return qn(a.map((x, i) => x + (b[i] - x) * t));
  const th = Math.acos(d), s = Math.sin(th), k1 = Math.sin((1 - t) * th) / s, k2 = Math.sin(t * th) / s;
  return a.map((x, i) => x * k1 + b[i] * k2);
};
const qaxis = (ax, a) => { const s = Math.sin(a / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(a / 2)]; };
// rotazione più corta che porta il versore a sul versore b
const qfromTo = (a, b) => {
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  if (d > 0.999999) return QI;
  if (d < -0.999999) { const ax = vnrm(cross(a, Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0])); return [ax[0], ax[1], ax[2], 0]; }
  const c = cross(a, b); return qn([c[0], c[1], c[2], 1 + d]);
};
// quaternione dalla parte di rotazione di una matrice 4x4 (le colonne possono avere una scala uniforme)
function qfromMat(m) {
  const c0 = vnrm([m[0], m[1], m[2]]), c1 = vnrm([m[4], m[5], m[6]]), c2 = vnrm([m[8], m[9], m[10]]);
  const m00 = c0[0], m10 = c0[1], m20 = c0[2], m01 = c1[0], m11 = c1[1], m21 = c1[2], m02 = c2[0], m12 = c2[1], m22 = c2[2];
  const tr = m00 + m11 + m22; let x, y, z, w, S;
  if (tr > 0) { S = Math.sqrt(tr + 1) * 2; w = 0.25 * S; x = (m21 - m12) / S; y = (m02 - m20) / S; z = (m10 - m01) / S; }
  else if (m00 > m11 && m00 > m22) { S = Math.sqrt(1 + m00 - m11 - m22) * 2; w = (m21 - m12) / S; x = 0.25 * S; y = (m01 + m10) / S; z = (m02 + m20) / S; }
  else if (m11 > m22) { S = Math.sqrt(1 + m11 - m00 - m22) * 2; w = (m02 - m20) / S; x = (m01 + m10) / S; y = 0.25 * S; z = (m12 + m21) / S; }
  else { S = Math.sqrt(1 + m22 - m00 - m11) * 2; w = (m10 - m01) / S; x = (m02 + m20) / S; y = (m12 + m21) / S; z = 0.25 * S; }
  return qn([x, y, z, w]);
}
function mfromQ(q) { // 3x3 per colonne
  const [x, y, z, w] = q, xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  return [1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy), 2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx), 2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy)];
}
function mul4(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
function trs(t, q, s) {
  const r = mfromQ(q);
  return [r[0] * s[0], r[1] * s[0], r[2] * s[0], 0, r[3] * s[1], r[4] * s[1], r[5] * s[1], 0, r[6] * s[2], r[7] * s[2], r[8] * s[2], 0, t[0], t[1], t[2], 1];
}
const mpt = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];

// cinematica inversa a due segmenti (stessa dell'avatar procedurale), con le lunghezze del modello
function ik2(A, T, l1, l2, pole) {
  const d = vsub(T, A), L = vlen(d), dn = L > 1e-6 ? vmul(d, 1 / L) : [0, -1, 0];
  const Lc = Math.min((l1 + l2) * 0.998, Math.max(Math.abs(l1 - l2) + 0.03, L));
  const H = vadd(A, vmul(dn, Lc));
  const ca = Math.min(1, Math.max(-1, (l1 * l1 + Lc * Lc - l2 * l2) / (2 * l1 * Lc))), sa = Math.sqrt(1 - ca * ca);
  const dp = pole[0] * dn[0] + pole[1] * dn[1] + pole[2] * dn[2];
  let p = vsub(pole, vmul(dn, dp)); if (vlen(p) < 1e-4) p = [0, 0, 1]; p = vnrm(p);
  return { E: vadd(A, vadd(vmul(dn, l1 * ca), vmul(p, l1 * sa))), H };
}

/* ---------- lettura del .glb ---------- */
const COMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const CSIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const CTYPE = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const CGET = {
  5120: (d, o) => d.getInt8(o), 5121: (d, o) => d.getUint8(o), 5122: (d, o) => d.getInt16(o, true), 5123: (d, o) => d.getUint16(o, true),
  5125: (d, o) => d.getUint32(o, true), 5126: (d, o) => d.getFloat32(o, true),
};
const CNORM = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };

async function readGLB(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`file non trovato (${r.status})`);
  const buf = await r.arrayBuffer(), dv = new DataView(buf);
  if (buf.byteLength < 20 || dv.getUint32(0, true) !== 0x46546c67) throw new Error('non è un file .glb');
  let off = 12, json = null, bin = null;
  while (off + 8 <= buf.byteLength) {
    const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true); off += 8;
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off, len)));
    else if (type === 0x004e4942 && !bin) bin = new Uint8Array(buf, off, len);
    off += len;
  }
  if (!json) throw new Error('.glb senza JSON');
  const bad = (json.extensionsRequired || []).filter((e) => /draco|meshopt|basisu|webp/i.test(e));
  if (bad.length) throw new Error('il file usa la compressione ' + bad.join(', ') + ': esportalo senza compressione');
  return { json, bin };
}

function makeReader(J, bin, baseUrl) {
  const view = (i) => {
    const bv = J.bufferViews[i];
    if (bv.buffer !== 0 || !bin) throw new Error('buffer esterni non supportati: esporta un .glb unico');
    return { o: bin.byteOffset + (bv.byteOffset || 0), n: bv.byteLength, stride: bv.byteStride || 0 };
  };
  // legge un accessor in un array tipizzato (float se normalizzato o se richiesto)
  function acc(i, asFloat) {
    const a = J.accessors[i], n = COMP[a.type], ct = a.componentType, sz = CSIZE[ct];
    const norm = a.normalized || (asFloat && ct !== 5126);
    const out = new (norm ? Float32Array : CTYPE[ct])(a.count * n);
    if (a.bufferView != null) {
      const bv = view(a.bufferView), base = bv.o + (a.byteOffset || 0), stride = bv.stride || n * sz;
      const d = new DataView(bin.buffer), g = CGET[ct], k = CNORM[ct];
      for (let e = 0; e < a.count; e++) for (let c = 0; c < n; c++) {
        let x = g(d, base + e * stride + c * sz);
        if (norm && k) x = Math.max(x / k, -1);
        out[e * n + c] = x;
      }
    }
    return { data: out, n, count: a.count };
  }
  async function image(i) {
    const im = J.images[i];
    let blob;
    if (im.bufferView != null) { const bv = view(im.bufferView); blob = new Blob([new Uint8Array(bin.buffer, bv.o, bv.n)], { type: im.mimeType || 'image/png' }); }
    else if (im.uri) { const r = await fetch(new URL(im.uri, baseUrl)); if (!r.ok) throw new Error('texture non trovata'); blob = await r.blob(); }
    else throw new Error('immagine senza dati');
    return createImageBitmap(blob, { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  }
  return { acc, image };
}

/* ---------- riconoscimento delle ossa (Mixamo, Ready Player Me, simili) ---------- */
const nrm = (s) => String(s || '').replace(/^.*[:|]/, '').replace(/mixamorig/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
function mapBones(nodes) {
  const by = {};
  nodes.forEach((n) => { n.key = nrm(n.name); if (n.key && !(n.key in by)) by[n.key] = n.i; });
  const pick = (...names) => { for (const k of names) if (k in by) return by[k]; return -1; };
  const side = (L, l) => ({
    up: pick(`${L}upleg`, `${L}upperleg`, `${L}thigh`, `thigh${l}`, `${l}thigh`),
    leg: pick(`${L}leg`, `${L}lowerleg`, `${L}calf`, `${L}shin`, `calf${l}`, `${l}calf`),
    foot: pick(`${L}foot`, `foot${l}`, `${l}foot`),
    arm: pick(`${L}arm`, `${L}upperarm`, `upperarm${l}`, `${l}upperarm`),
    fore: pick(`${L}forearm`, `${L}lowerarm`, `lowerarm${l}`, `${l}lowerarm`),
    hand: pick(`${L}hand`, `hand${l}`, `${l}hand`),
  });
  const depth = (i) => { let d = 0; while (nodes[i].parent >= 0) { i = nodes[i].parent; d++; } return d; };
  const spine = nodes.filter((n) => /^(spine\d*|chest|upperchest)$/.test(n.key)).sort((a, b) => depth(a.i) - depth(b.i)).map((n) => n.i);
  const B = { hips: pick('hips', 'pelvis'), spine, neck: pick('neck', 'neck1'), head: pick('head'), L: side('left', 'l'), R: side('right', 'r') };
  const miss = [];
  if (B.hips < 0) miss.push('hips'); if (B.head < 0) miss.push('head');
  for (const s of ['L', 'R']) for (const k of Object.keys(B[s])) if (B[s][k] < 0) miss.push(s + '.' + k);
  return { B, miss };
}

/* ---------- shader: stessa luce del personaggio procedurale + skinning e texture ---------- */
const V3 = '#version 300 es\n';
const VS = V3 + `layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec2 aUv; layout(location=3) in uvec4 aJ; layout(location=4) in vec4 aW;
uniform mat4 uVP; uniform highp sampler2D uJT; out vec3 vW; out vec3 vN; out vec2 vUv;
mat4 jm(uint j){ int b = int(j)*4; return mat4(texelFetch(uJT,ivec2(b,0),0), texelFetch(uJT,ivec2(b+1,0),0), texelFetch(uJT,ivec2(b+2,0),0), texelFetch(uJT,ivec2(b+3,0),0)); }
void main(){
  mat4 s = jm(aJ.x)*aW.x + jm(aJ.y)*aW.y + jm(aJ.z)*aW.z + jm(aJ.w)*aW.w;
  vec4 w = s*vec4(aPos,1.); vW = w.xyz; vN = mat3(s)*aNor; vUv = aUv; gl_Position = uVP*w;
}`;
const FS = V3 + `precision highp float;
in vec3 vW; in vec3 vN; in vec2 vUv; uniform vec3 uEye, uShadow, uLight, uFogC; uniform vec2 uFog; uniform vec4 uBase, uP; uniform float uCut, uUseTex; uniform sampler2D uTex;
out vec4 o;
void main(){
  vec4 tc = uUseTex > .5 ? texture(uTex, vUv) : vec4(1.);
  float al = tc.a*uBase.a; if(al < uCut) discard;
  vec3 base = tc.rgb*uBase.rgb;
  vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n;
  vec3 V = normalize(uEye - vW); vec3 L = normalize(vec3(-.5,.8,.6));
  float wr = smoothstep(-.4,.9,dot(n,L));
  vec3 c = base*mix(uShadow, uLight, wr);
  c *= mix(.9,1.05,n.y*.5+.5);
  float rim = pow(1.-max(dot(n,V),0.),3.);
  c += uLight*rim*uP.z*.32;
  vec3 R = reflect(-V,n);
  c += uLight*pow(max(dot(R,L),0.),uP.y)*uP.x;
  float fd = length(uEye - vW); float f = smoothstep(uFog.x,uFog.y,fd);
  c = mix(c,uFogC,f*.8);
  o = vec4(c,1.);
}`;
function compile(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function program(gl) {
  const p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, nm); }
  return { p, u };
}

/* ---------- carica il modello e prepara lo scheletro ---------- */
// opzioni: scala (moltiplicatore sulla scala automatica), y (alzata in unità di scena)
export async function loadModel(X, url, opt = {}) {
  const { gl, M } = X;
  const { json: J, bin } = await readGLB(url);
  const baseUrl = new URL(url, location.href);
  const rd = makeReader(J, bin, baseUrl);

  // nodi e matrici a riposo (in spazio mondo del file)
  const nodes = (J.nodes || []).map((n, i) => ({
    i, name: n.name || '', parent: -1, children: n.children || [], mesh: n.mesh, skin: n.skin,
    local: n.matrix ? n.matrix.slice() : trs(n.translation || [0, 0, 0], n.rotation || QI, n.scale || [1, 1, 1]),
  }));
  nodes.forEach((n) => n.children.forEach((c) => { nodes[c].parent = n.i; }));
  const order = [];
  (function walk() { const st = nodes.filter((n) => n.parent < 0).map((n) => n.i).reverse(); while (st.length) { const i = st.pop(); order.push(i); for (let k = nodes[i].children.length - 1; k >= 0; k--) st.push(nodes[i].children[k]); } })();
  order.forEach((i) => { const n = nodes[i]; n.world = n.parent < 0 ? n.local : mul4(nodes[n.parent].world, n.local); n.pos = [n.world[12], n.world[13], n.world[14]]; });

  const { B, miss } = mapBones(nodes);
  if (miss.length) throw new Error('scheletro non riconosciuto, mancano: ' + miss.join(', ') + ' (nomi trovati: ' + nodes.slice(0, 12).map((n) => n.name).join(', ') + '…)');
  const roleOf = new Array(nodes.length).fill(null);
  roleOf[B.hips] = ['hips']; roleOf[B.head] = ['head']; if (B.neck >= 0) roleOf[B.neck] = ['neck'];
  B.spine.forEach((i, k) => { roleOf[i] = ['spine', k, B.spine.length]; });
  for (const S of ['L', 'R']) for (const k of ['up', 'leg', 'foot', 'arm', 'fore']) roleOf[B[S][k]] = [S + '.' + k, S];
  const inHips = new Array(nodes.length).fill(false);
  order.forEach((i) => { inHips[i] = i === B.hips || (nodes[i].parent >= 0 && inHips[nodes[i].parent]); });

  // geometrie
  const slots = []; // un "slot" per ogni coppia (pelle, osso): nodo e matrice di legame
  const slotBase = [];
  (J.skins || []).forEach((sk, si) => {
    slotBase[si] = slots.length;
    const ibm = sk.inverseBindMatrices != null ? rd.acc(sk.inverseBindMatrices).data : null;
    sk.joints.forEach((nd, k) => {
      const inv = ibm ? Array.from(ibm.subarray(k * 16, k * 16 + 16)) : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
      slots.push({ node: nd, B: mul4(nodes[nd].world, inv) });
    });
  });
  const rigidSlot = {};
  const slotFor = (nd) => { if (!(nd in rigidSlot)) { rigidSlot[nd] = slots.length; slots.push({ node: nd, B: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] }); } return rigidSlot[nd]; };
  const jointNodes = new Set(); (J.skins || []).forEach((sk) => sk.joints.forEach((nd) => jointNodes.add(nd)));

  const tex = {}; // immagine → texture
  async function texOf(ref) {
    if (!ref) return null;
    const t = J.textures[ref.index], src = t.source;
    if (src == null) return null;
    if (!(src in tex)) {
      try { const bmp = await rd.image(src); tex[src] = texFromBitmap(gl, bmp, { mip: true, premul: false }).t; gl.bindTexture(gl.TEXTURE_2D, tex[src]); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); }
      catch (e) { console.warn('[modello 3D] texture ignorata:', e.message); tex[src] = null; }
    }
    return tex[src];
  }

  const prims = []; let minY = Infinity;
  for (const nd of nodes) {
    if (nd.mesh == null) continue;
    const mesh = J.meshes[nd.mesh];
    for (const pr of mesh.primitives) {
      if (pr.mode != null && pr.mode !== 4) continue;
      const at = pr.attributes; if (at.POSITION == null) continue;
      const P = rd.acc(at.POSITION, true), cnt = P.count;
      const pos = P.data;
      let nor = at.NORMAL != null ? rd.acc(at.NORMAL, true).data : null;
      const uv = at.TEXCOORD_0 != null ? rd.acc(at.TEXCOORD_0, true).data : new Float32Array(cnt * 2);
      let idx = pr.indices != null ? rd.acc(pr.indices).data : Uint32Array.from({ length: cnt }, (_, i) => i);
      if (!(idx instanceof Uint32Array)) idx = Uint32Array.from(idx);
      const jn = new Uint16Array(cnt * 4), wt = new Float32Array(cnt * 4);
      const skinned = nd.skin != null && at.JOINTS_0 != null && at.WEIGHTS_0 != null;
      if (skinned) {
        const j0 = rd.acc(at.JOINTS_0).data, w0 = rd.acc(at.WEIGHTS_0, true).data, base = slotBase[nd.skin];
        for (let i = 0; i < cnt * 4; i++) { jn[i] = base + j0[i]; wt[i] = w0[i]; }
        for (let i = 0; i < cnt; i++) { const s = wt[i * 4] + wt[i * 4 + 1] + wt[i * 4 + 2] + wt[i * 4 + 3] || 1; for (let k = 0; k < 4; k++) wt[i * 4 + k] /= s; }
      } else { // senza scheletro: si aggancia all'osso più vicino e si porta in spazio mondo
        let a = nd.i; while (a >= 0 && !jointNodes.has(a)) a = nodes[a].parent;
        const sl = slotFor(a >= 0 ? a : B.hips), w = nd.world;
        for (let i = 0; i < cnt; i++) { const p = mpt(w, [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]]); pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2]; jn[i * 4] = sl; wt[i * 4] = 1; }
        if (nor) for (let i = 0; i < cnt; i++) { const a0 = [nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]], n2 = vnrm([w[0] * a0[0] + w[4] * a0[1] + w[8] * a0[2], w[1] * a0[0] + w[5] * a0[1] + w[9] * a0[2], w[2] * a0[0] + w[6] * a0[1] + w[10] * a0[2]]); nor[i * 3] = n2[0]; nor[i * 3 + 1] = n2[1]; nor[i * 3 + 2] = n2[2]; }
      }
      if (!nor) { // normali lisce calcolate dai triangoli
        nor = new Float32Array(cnt * 3);
        for (let t = 0; t < idx.length; t += 3) {
          const ia = idx[t] * 3, ib = idx[t + 1] * 3, ic = idx[t + 2] * 3;
          const e1 = [pos[ib] - pos[ia], pos[ib + 1] - pos[ia + 1], pos[ib + 2] - pos[ia + 2]], e2 = [pos[ic] - pos[ia], pos[ic + 1] - pos[ia + 1], pos[ic + 2] - pos[ia + 2]], c = cross(e1, e2);
          for (const q of [ia, ib, ic]) { nor[q] += c[0]; nor[q + 1] += c[1]; nor[q + 2] += c[2]; }
        }
        for (let i = 0; i < cnt; i++) { const n2 = vnrm([nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]]); nor[i * 3] = n2[0]; nor[i * 3 + 1] = n2[1]; nor[i * 3 + 2] = n2[2]; }
      }
      // altezza dei piedi a riposo (serve a posare la suola a terra)
      const dom = slots[jn[0]] || { B: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] };
      for (let i = 0; i < cnt; i += 3) { const y = mpt(dom.B, [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]])[1]; if (y < minY) minY = y; }

      // materiale
      const mt = pr.material != null ? J.materials[pr.material] : null, pbr = (mt && mt.pbrMetallicRoughness) || {}, sg = mt && mt.extensions && mt.extensions.KHR_materials_pbrSpecularGlossiness;
      let bc = pbr.baseColorFactor || [1, 1, 1, 1], bt = pbr.baseColorTexture;
      if (sg) { bc = sg.diffuseFactor || [1, 1, 1, 1]; bt = sg.diffuseTexture; }
      const glTex = await texOf(bt);
      const base = [Math.pow(bc[0], 1 / 2.2), Math.pow(bc[1], 1 / 2.2), Math.pow(bc[2], 1 / 2.2), bc[3]];
      const cut = !mt ? 0 : mt.alphaMode === 'MASK' ? (mt.alphaCutoff ?? 0.5) : mt.alphaMode === 'BLEND' ? 0.35 : 0;

      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const buf = (arr, loc, size, ptr) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); ptr(loc, size); };
      buf(pos, 0, 3, (l, s) => gl.vertexAttribPointer(l, s, gl.FLOAT, false, 0, 0));
      buf(nor, 1, 3, (l, s) => gl.vertexAttribPointer(l, s, gl.FLOAT, false, 0, 0));
      buf(uv, 2, 2, (l, s) => gl.vertexAttribPointer(l, s, gl.FLOAT, false, 0, 0));
      buf(jn, 3, 4, (l, s) => gl.vertexAttribIPointer(l, s, gl.UNSIGNED_SHORT, 0, 0));
      buf(wt, 4, 4, (l, s) => gl.vertexAttribPointer(l, s, gl.FLOAT, false, 0, 0));
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      prims.push({ vao, n: idx.length, base, cut, tex: glTex, name: (mt && mt.name) || mesh.name || '' });
    }
  }
  if (!prims.length) throw new Error('nessuna geometria nel file');

  // misure a riposo
  const rp = (i) => nodes[i].pos;
  const legLen = (S) => vlen(vsub(rp(B[S].leg), rp(B[S].up))) + vlen(vsub(rp(B[S].foot), rp(B[S].leg)));
  const sAuto = 1.9 / ((legLen('L') + legLen('R')) / 2); // le gambe del modello pari a quelle del personaggio (0,98 + 0,92)
  const s = sAuto * (opt.scala || 1);
  const footH = ((rp(B.L.foot)[1] + rp(B.R.foot)[1]) / 2 - minY) * s; // dalla caviglia alla suola
  const upMid = vmul(vadd(rp(B.L.up), rp(B.R.up)), 0.5);
  const hipsToUp = vsub(upMid, rp(B.hips));

  // texture dei giunti: 4 texel RGBA32F per giunto
  const jt = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, jt);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, slots.length * 4, 1, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const jbuf = new Float32Array(slots.length * 16);
  const PG = program(gl), u = PG.u;

  /* ---------- posa: dai bersagli del personaggio procedurale allo scheletro del modello ---------- */
  const nP = new Array(nodes.length), dR = new Array(nodes.length);
  function pose(Jt) {
    const pelQ = qfromMat(Jt.pelvisM), torQ = qfromMat(Jt.torsoM), headQ = qfromMat(Jt.headM);
    const relT = qmul(qinv(pelQ), torQ), relH = qmul(qinv(torQ), headQ);
    const hipA = M.pt(Jt.pelvisM, [0, -0.02, 0]);
    const hipsPos = vadd(vsub(hipA, qrot(pelQ, vmul(hipsToUp, s))), [0, opt.y || 0, 0]);
    const ik = {};
    for (const i of order) {
      const n = nodes[i], p = n.parent;
      if (i === B.hips) { nP[i] = hipsPos; dR[i] = pelQ; continue; }
      if (!inHips[i]) { nP[i] = vadd(hipsPos, vmul(vsub(n.pos, rp(B.hips)), s)); dR[i] = QI; continue; }
      const pos = vadd(nP[p], vmul(qrot(dR[p], vsub(n.pos, nodes[p].pos)), s));
      nP[i] = pos;
      const r = roleOf[i]; let q = dR[p];
      if (r) {
        const k = r[0];
        if (k === 'spine') q = qmul(pelQ, qslerp(QI, relT, (r[1] + 1) / r[2]));
        else if (k === 'neck') q = qmul(torQ, qslerp(QI, relH, 0.45));
        else if (k === 'head') q = headQ;
        else {
          const S = r[1], part = k.slice(2), sd = S === 'L' ? 1 : -1;
          if (part === 'arm' || part === 'up') { // si risolve a spalla/anca: due segmenti con le lunghezze del modello
            const isArm = part === 'arm', mid = isArm ? B[S].fore : B[S].leg, end = isArm ? B[S].hand : B[S].foot;
            const l1 = vlen(vsub(rp(mid), rp(i))) * s, l2 = vlen(vsub(rp(end), rp(mid))) * s;
            let T, pole;
            if (isArm) { const a = Jt.arms.find((h) => h.key === S); T = a.H; pole = a.pole; }
            else { const l = Jt.legs.find((h) => h.sd === (S === 'L' ? 1 : -1)); T = vadd(l.foot, [0, footH, 0]); pole = l.pole; }
            ik[S + (isArm ? 'A' : 'L')] = ik2(pos, T, l1, l2, pole);
            q = qfromTo(vnrm(vsub(rp(mid), rp(i))), vnrm(vsub(ik[S + (isArm ? 'A' : 'L')].E, pos)));
          } else if (part === 'fore' || part === 'leg') {
            const isArm = part === 'fore', end = isArm ? B[S].hand : B[S].foot, t = ik[S + (isArm ? 'A' : 'L')];
            q = qfromTo(vnrm(vsub(rp(end), rp(i))), vnrm(vsub(t.H, pos)));
          } else if (part === 'foot') {
            const l = Jt.legs.find((h) => h.sd === sd); q = qaxis([0, 1, 0], l.yaw);
          }
        }
      }
      dR[i] = q;
    }
    // matrici di pelle: T(posizione nuova) · R · S(scala) · T(−posizione a riposo) · legame
    for (let k = 0; k < slots.length; k++) {
      const sl = slots[k], r = mfromQ(dR[sl.node]), rp0 = nodes[sl.node].pos, np = nP[sl.node], Bm = sl.B;
      const t = [np[0] - s * (r[0] * rp0[0] + r[3] * rp0[1] + r[6] * rp0[2]), np[1] - s * (r[1] * rp0[0] + r[4] * rp0[1] + r[7] * rp0[2]), np[2] - s * (r[2] * rp0[0] + r[5] * rp0[1] + r[8] * rp0[2])];
      const A = [r[0] * s, r[1] * s, r[2] * s, 0, r[3] * s, r[4] * s, r[5] * s, 0, r[6] * s, r[7] * s, r[8] * s, 0, t[0], t[1], t[2], 1];
      const o = mul4(A, Bm); for (let e = 0; e < 16; e++) jbuf[k * 16 + e] = o[e];
    }
  }

  function draw(Jt) {
    pose(Jt);
    const F = X.U; if (!F) return;
    gl.useProgram(PG.p);
    gl.uniformMatrix4fv(u.uVP, false, F.vp); gl.uniform3fv(u.uEye, F.eye);
    gl.uniform3fv(u.uShadow, F.shadow); gl.uniform3fv(u.uLight, F.light); gl.uniform3fv(u.uFogC, F.fogC); gl.uniform2fv(u.uFog, F.fog);
    gl.uniform4f(u.uP, 0.1, 18, 0.5, 0);
    gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, jt);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, slots.length * 4, 1, gl.RGBA, gl.FLOAT, jbuf);
    gl.uniform1i(u.uJT, 5); gl.uniform1i(u.uTex, 6);
    gl.activeTexture(gl.TEXTURE6);
    for (const p of prims) {
      gl.bindTexture(gl.TEXTURE_2D, p.tex || null);
      gl.uniform1f(u.uUseTex, p.tex ? 1 : 0); gl.uniform4fv(u.uBase, p.base); gl.uniform1f(u.uCut, p.cut);
      gl.bindVertexArray(p.vao); gl.drawElements(gl.TRIANGLES, p.n, gl.UNSIGNED_INT, 0);
    }
    gl.bindVertexArray(null); gl.activeTexture(gl.TEXTURE0);
    gl.useProgram(X.P.mesh.p); // il resto della scena riparte dal suo programma
  }

  X.GLB = { ready: true, draw, info: { prims: prims.length, giunti: slots.length, scala: s, piedi: footH, url } };
  return X.GLB;
}
