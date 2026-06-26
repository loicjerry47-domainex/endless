/* ============================================================
   endless — the breathing seed (hero)
   WebGL2 fragment shader. Domain-warped multi-bloom + radial
   lensing + photon ring + chromatic aberration + cycle pulse
   + idle deepening + hero text gravity + ACES tonemap.
   Subscribes to engine.js (no private RAF loop, see CLAUDE.md §3).
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
uniform float u_breath;
uniform float u_phase;
uniform float u_scroll;
uniform float u_idle;       // 0..1; 1 = meditative, no recent activity
uniform float u_pulse;      // 0..1; ramps after each cycle start, decays
uniform vec2  u_pointer;
uniform vec2  u_textAmp;    // ampersand glyph centre in 0..1 viewport coords
uniform vec2  u_resolution;

uniform vec3 u_warm;
uniform vec3 u_ember;
uniform vec3 u_cool;
uniform vec3 u_ink;
uniform vec3 u_bg;

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

// Curl noise: divergence-free 2D flow from the perpendicular gradient of fbm.
// Reads as fluid (orbits, eddies) rather than the random shake of plain fbm.
vec2 fbmGrad(vec2 p) {
  float eps = 0.012;
  float gx = fbm(p + vec2(eps, 0.0)) - fbm(p - vec2(eps, 0.0));
  float gy = fbm(p + vec2(0.0, eps)) - fbm(p - vec2(0.0, eps));
  return vec2(gx, gy) / (2.0 * eps);
}
vec2 curlWarp(vec2 uv, float t, float k) {
  vec2 g = fbmGrad(uv * 2.0 + vec2(t * 0.045, t * 0.03));
  return uv + vec2(g.y, -g.x) * k;
}

vec2 lens(vec2 uv, vec2 c, float strength, float falloff) {
  vec2 r = uv - c;
  float d = length(r);
  float pull = strength / (1.0 + falloff * d * d);
  return uv - r * pull;
}

float bloom(vec2 uv, vec2 c, float radius) {
  float d = length(uv - c);
  return exp(-d * d / (radius * radius));
}

// ACES filmic tonemap (Narkowicz approximation). Maps HDR additive light to
// LDR display response with a real shoulder. The single biggest visual lift.
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

// Interleaved Gradient Noise (Jorge Jimenez). Cheap blue-noise-like dither.
// Replaces a random-hash grain; less twitchy, kills banding more elegantly.
float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

void main() {
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 uvAR = (v_uv - 0.5) * aspect + 0.5;
  vec2 baseUV = uvAR;

  // Idle slows the apparent flow.
  float idleSlow = mix(1.0, 0.55, u_idle);
  float warpTime = u_time * idleSlow;

  // 1. Curl warp; grows with breath, eases off when idle.
  float warpK = (0.022 + u_breath * 0.05) * mix(1.0, 0.78, u_idle);
  vec2 uv = curlWarp(uvAR, warpTime, warpK);

  // 2. Seed centre: brand anchor lerped 10% toward the live ampersand.
  vec2 seedAnchor = vec2(0.78, 0.34);
  seedAnchor.x = seedAnchor.x * aspect.x - aspect.x * 0.5 + 0.5 * aspect.x;
  vec2 textTarget = vec2(u_textAmp.x * aspect.x - (aspect.x - 1.0) * 0.5, u_textAmp.y);
  vec2 seed = mix(seedAnchor, textTarget, 0.10);

  // 3. Lensing: stronger during compressed phases.
  float lensK = (1.0 - u_breath) * 0.55 + 0.08;
  uv = lens(uv, seed, lensK, 22.0);

  vec3 col = vec3(0.0);

  // 4. Three brand blooms.
  vec2 b1 = seedAnchor;
  vec2 b2 = vec2(0.18, 0.62) * aspect;
  vec2 b3 = vec2(0.55, 0.92) * aspect;
  float br = 0.32 * (0.85 + u_breath * 0.45);
  float energy = 0.85 + u_breath * 0.30;
  col += u_warm  * bloom(uv, b1, br * 0.95) * energy;
  col += u_ember * bloom(uv, b2, br * 0.85) * (0.55 + u_breath * 0.20);
  col += u_cool  * bloom(uv, b3, br * 1.05) * (0.18 + u_breath * 0.08);

  // 5. The seed itself, with lateral chromatic aberration during compressed
  //    phases. Per-channel offsets give a faint rainbow rim; real-lens tell.
  float seedR = mix(0.055, 0.090, u_breath);
  float seedDensity = 1.0 - u_scroll * 0.5;
  float caAmt = (1.0 - u_breath) * 0.008;
  vec2 sr = uv - seed;
  vec2 caDir = normalize(sr + 1e-5);
  vec3 seedCol = u_warm * 1.8 * seedDensity;
  col.r += seedCol.r * bloom(uv + caDir * caAmt, seed, seedR);
  col.g += seedCol.g * bloom(uv,                 seed, seedR);
  col.b += seedCol.b * bloom(uv - caDir * caAmt, seed, seedR);

  // 6. Photon ring; brightens with idle so the seed sharpens when you stop.
  float sd = length(sr);
  float ringD = abs(sd - seedR * 2.6);
  float ring = exp(-ringD * ringD / 0.0010);
  float ringBoost = (1.0 - u_breath) * (1.0 + u_idle * 0.7);
  col += mix(u_warm, u_ink, 0.4) * ring * 0.55 * ringBoost * seedDensity;

  // 7. Cycle pulse: a soft radial wave that expands from the seed at each
  //    cycle reset. Decays over the 2s pulse window. The site's heartbeat.
  float pulseR = u_pulse * 0.6;
  float pulseD = abs(sd - pulseR);
  float pulseW = exp(-pulseD * pulseD / 0.0040);
  col += u_warm * pulseW * 0.45 * (1.0 - u_pulse);

  // 8. Pointer transient bloom.
  vec2 pp = vec2(u_pointer.x * aspect.x - (aspect.x - 1.0) * 0.5, u_pointer.y);
  float pd = length(baseUV - pp);
  col += u_warm * exp(-pd * pd / 0.020) * 0.12;

  // 9. Base + scroll vignette.
  col += u_bg;
  vec2 vuv = v_uv - 0.5;
  float vig = 1.0 - dot(vuv, vuv) * (0.5 + u_scroll * 0.6);
  col *= vig;

  // 10. ACES tonemap, then ordered dither.
  col = aces(col);
  col += vec3(ign(gl_FragCoord.xy + u_time * 60.0) - 0.5) / 255.0;

  fragColor = vec4(col, 1.0);
}`;

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function parseColor(s) {
  if (s.startsWith('#')) {
    const h = s.slice(1);
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)].map(v => v / 255);
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) return m[1].split(',').slice(0, 3).map(v => parseFloat(v) / 255);
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

/**
 * Mount the hero on a <canvas>. Subscribes to engine.js. Returns an unmount fn.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} [opts]
 * @param {number} [opts.dprCap=1.75]
 * @param {Element|Window} [opts.scrollEl=window]
 * @param {string} [opts.ampSelector='#heroAmp']
 */
export function mountHero(canvas, opts = {}) {
  if (!canvas) return () => {};

  if (config.REDUCED) {
    canvas.style.display = 'none';
    return () => {};
  }

  // Defer heavy WebGL2 init past first paint to preserve LCP/FCP.
  let unmount = () => {};
  const start = () => { unmount = _mount(canvas, opts); };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(start, { timeout: 1200 });
  } else {
    setTimeout(start, 200);
  }
  return () => unmount();
}

function _mount(canvas, opts) {
  const dprCap = opts.dprCap ?? 1.75;
  const ampSelector = opts.ampSelector ?? '#heroAmp';
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false });

  if (!gl) {
    console.warn('hero: WebGL2 unavailable; falling back to substrate');
    import('./substrate.js').then(m => m.mountSubstrate(canvas));
    return () => {};
  }

  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
  const prog = linkProgram(gl, vs, fs);
  if (!prog) return () => {};

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (n) => gl.getUniformLocation(prog, n);
  const uTime    = u('u_time'),    uBreath  = u('u_breath'),  uPhase   = u('u_phase'),
        uScroll  = u('u_scroll'),  uIdle    = u('u_idle'),    uPulse   = u('u_pulse'),
        uPointer = u('u_pointer'), uTextAmp = u('u_textAmp'), uRes     = u('u_resolution'),
        uWarm    = u('u_warm'),    uEmber   = u('u_ember'),   uCool    = u('u_cool'),
        uInk     = u('u_ink'),     uBg      = u('u_bg');

  const palette = {
    warm:  parseColor(cssVar('--warm')  || '#f5c97a'),
    ember: parseColor(cssVar('--ember') || '#e88a4a'),
    cool:  parseColor(cssVar('--cool')  || '#7aa9f5'),
    ink:   parseColor(cssVar('--ink')   || '#f4ecdc'),
    bg:    parseColor(cssVar('--bg')    || '#07060a'),
  };

  // sizing
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
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  addEventListener('resize', resize);

  // idle tracking (defined first so handlers can call bumpActivity)
  const IDLE_AFTER_MS = 18000;
  let lastActivity = performance.now();
  let idleValue = 0;
  function bumpActivity() { lastActivity = performance.now(); }
  addEventListener('keydown', bumpActivity);
  addEventListener('touchstart', bumpActivity, { passive: true });

  // pointer with eased follow
  let px = 0.78, py = 0.34, tx = 0.78, ty = 0.34;
  addEventListener('pointermove', (e) => {
    tx = e.clientX / innerWidth;
    ty = 1.0 - e.clientY / innerHeight;
    bumpActivity();
  }, { passive: true });

  // scroll
  const scrollEl = opts.scrollEl || window;
  let scrollY = 0;
  function updateScroll() {
    const max = (document.documentElement.scrollHeight - innerHeight) || 1;
    scrollY = Math.min(1, Math.max(0, (scrollEl.scrollY ?? scrollY) / Math.min(max, innerHeight * 1.4)));
    bumpActivity();
  }
  scrollEl.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  // tab visibility pauses the loop
  let visible = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  // ampersand gravity target
  let textAmpX = 0.78, textAmpY = 0.66;
  const ampEl = document.querySelector(ampSelector);
  function readAmp() {
    if (!ampEl) return;
    const r = ampEl.getBoundingClientRect();
    if (r.width === 0) return;
    textAmpX = (r.left + r.width / 2) / innerWidth;
    textAmpY = 1.0 - (r.top + r.height / 2) / innerHeight;
  }
  readAmp();
  addEventListener('resize', readAmp);
  scrollEl.addEventListener('scroll', readAmp, { passive: true });

  // breath + cycle pulse
  let breath = 0.5, phase = 0;
  let pulseStartT = -1e6;
  const unsub = onBreath(s => {
    breath = s.breath; phase = s.phase;
    if (s.cycleStart) pulseStartT = performance.now();
  });

  // mount fade-in
  canvas.style.opacity = '0';
  canvas.style.transition = 'opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)';
  requestAnimationFrame(() => requestAnimationFrame(() => { canvas.style.opacity = '1'; }));

  // render loop
  let raf;
  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (!visible) return;

    // eased pointer follow
    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;

    // idle ease
    const sinceActive = t - lastActivity;
    const idleTarget = sinceActive > IDLE_AFTER_MS ? 1 : 0;
    idleValue += (idleTarget - idleValue) * 0.02;

    // pulse ramp + decay over 2s after each cycle start
    const pulseT = Math.max(0, Math.min(1, (t - pulseStartT) / 2000));

    gl.useProgram(prog);
    gl.uniform1f(uTime, t * 0.001);
    gl.uniform1f(uBreath, breath);
    gl.uniform1f(uPhase, phase);
    gl.uniform1f(uScroll, scrollY);
    gl.uniform1f(uIdle, idleValue);
    gl.uniform1f(uPulse, pulseT);
    gl.uniform2f(uPointer, px, py);
    gl.uniform2f(uTextAmp, textAmpX, textAmpY);
    gl.uniform2f(uRes, W, H);
    gl.uniform3fv(uWarm,  palette.warm);
    gl.uniform3fv(uEmber, palette.ember);
    gl.uniform3fv(uCool,  palette.cool);
    gl.uniform3fv(uInk,   palette.ink);
    gl.uniform3fv(uBg,    palette.bg);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  raf = requestAnimationFrame(frame);

  if (location.search.includes('dev')) {
    mountDevPanel({ getState: () => ({
      breath, phase, scrollY,
      idle: idleValue,
      pulse: Math.max(0, Math.min(1, (performance.now() - pulseStartT) / 2000)),
    }) });
  }

  return () => {
    cancelAnimationFrame(raf);
    unsub();
    ro.disconnect();
    removeEventListener('resize', resize);
    removeEventListener('resize', readAmp);
  };
}

function mountDevPanel({ getState }) {
  if (document.getElementById('hero-dev')) return;
  const el = document.createElement('div');
  el.id = 'hero-dev';
  el.style.cssText = `
    position: fixed; right: 12px; bottom: 12px; z-index: 9999;
    font: 10px/1.4 ui-monospace, monospace; color: #f5c97a;
    background: rgba(7, 6, 10, 0.78); border: 1px solid rgba(244,236,220,0.14);
    border-radius: 8px; padding: 8px 10px; min-width: 200px;
    backdrop-filter: blur(8px); pointer-events: none; white-space: pre;
  `;
  document.body.appendChild(el);
  setInterval(() => {
    const s = getState();
    el.textContent =
      `breath ${s.breath.toFixed(2)}  phase ${s.phase.toFixed(2)}  scroll ${s.scrollY.toFixed(2)}\n` +
      `idle   ${s.idle.toFixed(2)}  pulse ${s.pulse.toFixed(2)}`;
  }, 100);
}
