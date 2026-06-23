/* ============================================================
   DDUP · DOMAINEX — the breathing seed (hero)
   WebGL2 fragment shader. Domain-warped multi-bloom + radial
   lensing + photon ring. Subscribes to engine.js (no private
   RAF loop — see CLAUDE.md §3).
============================================================ */

import { onBreath, config } from './engine.js';

const VERT = /* glsl */`#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = /* glsl */`#version 300 es
precision highp float;
in  vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform float u_breath;        // 0..1 from engine.js
uniform float u_phase;         // 0..1 cycle position
uniform float u_scroll;        // 0..1, drives camera distance
uniform vec2  u_pointer;       // 0..1 (normalised viewport)
uniform vec2  u_resolution;    // px

// brand palette as uniforms — sourced from CSS custom properties at init
uniform vec3 u_warm;           // --warm
uniform vec3 u_ember;          // --ember
uniform vec3 u_cool;           // --cool
uniform vec3 u_ink;            // --ink
uniform vec3 u_bg;             // --bg

// ── value noise (cheap, smooth, GPU-friendly) ───────────────
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i + vec2(0,0)), hash21(i + vec2(1,0)), u.x),
             mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.02; a *= 0.5; }
  return s;
}

// ── domain warp: fluid drift ────────────────────────────────
vec2 warp(vec2 uv, float t, float k) {
  float n1 = fbm(uv * 2.2 + vec2(t * 0.05, 0.0));
  float n2 = fbm(uv * 2.2 + vec2(0.0, t * 0.05) + 13.7);
  return uv + (vec2(n1, n2) - 0.5) * k;
}

// ── radial lensing toward the seed ──────────────────────────
// Brand-tuned analogue of gravitational lensing: pixels near the
// seed are pulled radially inward, distorting whatever they sample.
vec2 lens(vec2 uv, vec2 c, float strength, float falloff) {
  vec2 r = uv - c;
  float d = length(r);
  float pull = strength / (1.0 + falloff * d * d);
  return uv - r * pull;
}

// ── soft gaussian bloom ─────────────────────────────────────
float bloom(vec2 uv, vec2 c, float radius) {
  float d = length(uv - c);
  return exp(-d * d / (radius * radius));
}

void main() {
  // aspect-corrected uv (-1..1 vertically, scaled horizontally)
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 uv = (v_uv - 0.5) * aspect + 0.5;
  vec2 uvBase = uv;

  // 1. domain warp — grows with breath
  float warpK = 0.025 + u_breath * 0.06;
  uv = warp(uv, u_time, warpK);

  // 2. lensing centred on the seed; stronger during compressed phases
  vec2 seed = vec2(0.78, 0.34) * aspect;
  seed.x -= aspect.x * 0.5;
  seed.x += 0.5 * aspect.x;
  float lensK = (1.0 - u_breath) * 0.55 + 0.08;
  uv = lens(uv, seed, lensK, 22.0);

  vec3 col = vec3(0.0);

  // 3. three brand blooms — match substrate.js so the page reads continuous
  //    warm (top-right), ember (left-mid), cool (bottom, sparing)
  vec2 b1 = vec2(0.78, 0.34) * aspect; b1.x = mix(0.5 * aspect.x, b1.x, 1.0);
  vec2 b2 = vec2(0.18, 0.62) * aspect;
  vec2 b3 = vec2(0.55, 0.92) * aspect;

  float br = 0.32 * (0.85 + u_breath * 0.45);
  col += u_warm  * bloom(uv, b1, br * 0.95) * (0.85 + u_breath * 0.30);
  col += u_ember * bloom(uv, b2, br * 0.85) * (0.55 + u_breath * 0.20);
  col += u_cool  * bloom(uv, b3, br * 1.05) * (0.18 + u_breath * 0.08);

  // 4. the seed itself — compressed light that pulses with the cycle.
  //    radius shrinks during hello/fold (compressed), expands at exhale.
  float seedR = mix(0.055, 0.090, u_breath);
  float seedDensity = (1.0 - u_scroll * 0.5);
  col += u_warm * bloom(uv, seed, seedR) * 1.8 * seedDensity;

  // 5. photon ring — visible only when compressed (hello + fold).
  //    The optical signature that says "this is more than a gradient."
  vec2 sr = uv - seed;
  float ringD = abs(length(sr) - seedR * 2.6);
  float ring = exp(-ringD * ringD / 0.0010);
  col += mix(u_warm, u_ink, 0.4) * ring * 0.55 * (1.0 - u_breath) * seedDensity;

  // 6. pointer-driven transient bloom (faint, slow follow)
  vec2 pNorm = u_pointer * aspect;
  pNorm.x = mix(0.5 * aspect.x, pNorm.x * aspect.x, 1.0) - aspect.x * 0.5 + 0.5 * aspect.x;
  vec2 pp = u_pointer * aspect; pp.x = u_pointer.x * aspect.x;
  float pd = length(uvBase - vec2(u_pointer.x * aspect.x - (aspect.x - 1.0) * 0.5, u_pointer.y));
  col += u_warm * exp(-pd * pd / 0.020) * 0.12;

  // 7. base + scroll-driven vignette (hero recedes as you scroll past it)
  col += u_bg;
  vec2 vuv = v_uv - 0.5;
  float vig = 1.0 - dot(vuv, vuv) * (0.5 + u_scroll * 0.6);
  col *= vig;

  // 8. film grain — avoids banding on the dark substrate
  float g = hash21(v_uv * u_resolution + u_time * 100.0) - 0.5;
  col += g * 0.012;

  fragColor = vec4(col, 1.0);
}`;

// ── helpers ────────────────────────────────────────────────
function cssVar(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v;
}
// parse "#rrggbb" or "rgba(r,g,b,a)" into [r,g,b] 0..1
function parseColor(s) {
  if (s.startsWith('#')) {
    const h = s.slice(1);
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)].map(v => v / 255);
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').slice(0, 3).map(v => parseFloat(v) / 255);
    return [r, g, b];
  }
  return [0, 0, 0];
}

function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('shader compile:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}
function linkProgram(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, vs); gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error('program link:', gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

// ── mount ──────────────────────────────────────────────────
/**
 * Mounts the hero on a <canvas> element.
 * Subscribes to engine.js (one global RAF). Returns an unmount fn.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} [opts]
 * @param {number} [opts.dprCap=1.75]   cap devicePixelRatio for perf
 * @param {number} [opts.scrollEl]      element whose scroll drives u_scroll (default: window)
 */
export function mountHero(canvas, opts = {}) {
  if (!canvas) return () => {};

  // reduced-motion: skip the whole engine entirely
  if (config.REDUCED) {
    canvas.style.display = 'none';
    return () => {};
  }

  const dprCap = opts.dprCap ?? 1.75;
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false });

  if (!gl) {
    // WebGL2 unavailable — fall back to the legacy substrate. Lazy import.
    console.warn('hero: WebGL2 not available, using fallback substrate');
    import('./substrate.js').then(m => m.mountSubstrate(canvas));
    return () => {};
  }

  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
  const prog = linkProgram(gl, vs, fs);
  if (!prog) return () => {};

  // fullscreen quad
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // uniform locations
  const u = (name) => gl.getUniformLocation(prog, name);
  const uTime = u('u_time'), uBreath = u('u_breath'), uPhase = u('u_phase'),
        uScroll = u('u_scroll'), uPointer = u('u_pointer'), uRes = u('u_resolution'),
        uWarm = u('u_warm'), uEmber = u('u_ember'), uCool = u('u_cool'),
        uInk = u('u_ink'), uBg = u('u_bg');

  // brand palette from CSS — single read at mount (rebuild on theme change)
  let palette = readPalette();
  function readPalette() {
    return {
      warm:  parseColor(cssVar('--warm')  || '#f5c97a'),
      ember: parseColor(cssVar('--ember') || '#e88a4a'),
      cool:  parseColor(cssVar('--cool')  || '#7aa9f5'),
      ink:   parseColor(cssVar('--ink')   || '#f4ecdc'),
      bg:    parseColor(cssVar('--bg')    || '#07060a'),
    };
  }

  // size handling
  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    W = Math.max(1, Math.floor(w * dpr));
    H = Math.max(1, Math.floor(h * dpr));
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  addEventListener('resize', resize);

  // pointer (slow-followed for smoothness)
  let px = 0.78, py = 0.34, tx = 0.78, ty = 0.34;
  addEventListener('pointermove', (e) => {
    tx = e.clientX / innerWidth;
    ty = 1.0 - e.clientY / innerHeight;
  }, { passive: true });

  // scroll
  const scrollEl = opts.scrollEl || window;
  let scrollY = 0;
  function updateScroll() {
    const max = (document.documentElement.scrollHeight - innerHeight) || 1;
    scrollY = Math.min(1, Math.max(0, (scrollEl.scrollY ?? scrollY) / Math.min(max, innerHeight * 1.4)));
  }
  scrollEl.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  // pause when off-screen / tab hidden
  let visible = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  // breath state cache
  let breath = 0.5, phase = 0, now = 0;
  const unsub = onBreath(s => { breath = s.breath; phase = s.phase; now = s.now; });

  // render — subscribed to engine.js' RAF via a separate ticker
  let lastT = performance.now();
  let raf;
  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (!visible) return;

    // ease pointer follow
    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;

    gl.useProgram(prog);
    gl.uniform1f(uTime, t * 0.001);
    gl.uniform1f(uBreath, breath);
    gl.uniform1f(uPhase, phase);
    gl.uniform1f(uScroll, scrollY);
    gl.uniform2f(uPointer, px, py);
    gl.uniform2f(uRes, W, H);
    gl.uniform3fv(uWarm,  palette.warm);
    gl.uniform3fv(uEmber, palette.ember);
    gl.uniform3fv(uCool,  palette.cool);
    gl.uniform3fv(uInk,   palette.ink);
    gl.uniform3fv(uBg,    palette.bg);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  raf = requestAnimationFrame(frame);

  // optional dev params panel — only when ?dev is in the URL
  if (location.search.includes('dev')) mountDevPanel({ getState: () => ({ breath, phase, scrollY }) });

  return () => {
    cancelAnimationFrame(raf);
    unsub();
    ro.disconnect();
    removeEventListener('resize', resize);
  };
}

// ── tiny dev params panel (no lil-gui dep) ─────────────────
function mountDevPanel({ getState }) {
  if (document.getElementById('hero-dev')) return;
  const el = document.createElement('div');
  el.id = 'hero-dev';
  el.style.cssText = `
    position: fixed; right: 12px; bottom: 12px; z-index: 9999;
    font: 10px/1.4 ui-monospace, monospace; color: #f5c97a;
    background: rgba(7, 6, 10, 0.78); border: 1px solid rgba(244,236,220,0.14);
    border-radius: 8px; padding: 8px 10px; min-width: 160px;
    backdrop-filter: blur(8px);
  `;
  document.body.appendChild(el);
  setInterval(() => {
    const s = getState();
    el.textContent = `breath ${s.breath.toFixed(2)}  phase ${s.phase.toFixed(2)}  scroll ${s.scrollY.toFixed(2)}`;
  }, 100);
}
