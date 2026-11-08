// Il viso di Naomi come texture posata sulla testa del personaggio.
// È una piccola «pelle» che segue la superficie della testa (stessa luce del resto), con i bordi sfumati sul
// colore della pelle: sotto i capelli, e girando la testa, il viso si muove con lei.
import { texFromBitmap } from './engine.js';
import { LIGHT_GLSL, LIGHT_UNIFORMS, setLight, MAT } from './light.js';

const V3 = '#version 300 es\n';
const VS = V3 + `layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec2 aUv;
uniform mat4 uM; uniform mat4 uVP; out vec3 vW; out vec3 vN; out vec2 vUv; out vec3 vObj; out mat3 vNM;
void main(){ vec4 w = uM*vec4(aPos,1.); vW = w.xyz; mat3 nm = transpose(inverse(mat3(uM))); vNM = nm; vN = nm*aNor; vUv = aUv; vObj = aPos; gl_Position = uVP*w; }`;
const FS = V3 + `precision highp float;
in vec3 vW; in vec3 vN; in vec2 vUv; in vec3 vObj; in mat3 vNM; uniform vec3 uEye, uFogC; uniform vec2 uFog; uniform vec4 uP; uniform sampler2D uTex;
${LIGHT_UNIFORMS}${LIGHT_GLSL}
out vec4 o;
void main(){
  vec4 tx = texture(uTex, vUv);
  vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n;
  vec3 V = normalize(uEye - vW);
  // la foto ha già la sua luce: la tengo come colore di base e aggiungo ombra, controluce e luce che attraversa la pelle
  vec3 c = toDsp(shade(tx.rgb, n, V, vW, uP, vObj, vNM));
  float fd = length(uEye - vW); float f = smoothstep(uFog.x,uFog.y,fd);
  c = mix(c,uFogC,f*.8);
  o = vec4(c,1.);
}`;
function sh(gl, type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }

// la texture copre x da -0,30 a 0,30 e y da 0,40 a -0,40 (coordinate della testa)
const XR = 0.30, YT = 0.40, YB = -0.40;

export async function loadViso(X, url) {
  const { gl } = X;
  const r = await fetch(url);
  if (!r.ok) throw new Error('viso non trovato (' + r.status + ')');
  const bmp = await createImageBitmap(await r.blob(), { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  const tex = texFromBitmap(gl, bmp, { mip: true, premul: false }).t;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // griglia sulla superficie della testa: per ogni altezza, da lato a lato dell'uovo
  const sz = X.headSurface, hr = X.headRadius, NX = 44, NY = 64, pos = [], nor = [], uv = [], idx = [];
  const eps = 0.012; // sopra la pelle della testa: evita lo sfarfallio tra le due superfici
  for (let j = 0; j <= NY; j++) {
    const y = YT + (YB - YT) * (j / NY);
    const w = Math.min(XR, 0.985 * hr(y));
    for (let i = 0; i <= NX; i++) {
      const x = -w + 2 * w * (i / NX), z = sz(x, y) + eps, d = 0.012;
      const dzx = (sz(Math.min(x + d, 0.999 * hr(y)), y) - sz(Math.max(x - d, -0.999 * hr(y)), y)) / (2 * d);
      const dzy = (sz(x, y + d) - sz(x, y - d)) / (2 * d);
      const l = Math.hypot(dzx, dzy, 1);
      pos.push(x, y, z); nor.push(-dzx / l, -dzy / l, 1 / l); uv.push((x + XR) / (2 * XR), (YT - y) / (YT - YB));
    }
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, c, b, b, c, d);
  }
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const buf = (arr, loc, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); };
  buf(pos, 0, 3); buf(nor, 1, 3); buf(uv, 2, 2);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx), gl.STATIC_DRAW);
  gl.bindVertexArray(null);

  const p = gl.createProgram(); gl.attachShader(p, sh(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl, gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }

  function draw(headM) {
    const F = X.U; if (!F) return;
    gl.useProgram(p);
    gl.uniformMatrix4fv(u.uM, false, headM); gl.uniformMatrix4fv(u.uVP, false, F.vp); gl.uniform3fv(u.uEye, F.eye);
    gl.uniform3fv(u.uFogC, F.fogC); gl.uniform2fv(u.uFog, F.fog);
    setLight(gl, u, F);
    gl.uniform4f(u.uP, 0.16, 36, 0.6, MAT.skin);
    gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u.uTex, 6); gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-2, -2);
    gl.bindVertexArray(vao); gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_INT, 0); gl.bindVertexArray(null);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.useProgram(X.P.mesh.p); // il resto della scena riparte dal suo programma
  }
  X.VISO = { ready: true, draw };
  return X.VISO;
}
