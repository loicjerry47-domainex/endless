/* ============================================================
   DDUP · DOMAINEX — global breath engine
   One RAF loop. Every visual surface subscribes.
   Drives: breath (0..1), phase (0..1), cycleIndex, hour-of-day.
============================================================ */

const PERIOD_MS = 18000;          // one full breath cycle
const REDUCED   = matchMedia('(prefers-reduced-motion: reduce)').matches;

const subs = new Set();
let started   = false;
let startTime = 0;
let lastCycle = -1;
let pausedAt  = null;
let pauseOff  = 0;

// ── eased breath curve (matches the welcome/endlessly.html phases) ──
function breathOf(phase, now) {
  if (phase < 0.18)        return 0.04 + Math.sin(now * 0.002) * 0.02;       // hello — held
  else if (phase < 0.55) { const u = (phase - 0.18) / 0.37; return ease(u); } // exhale
  else if (phase < 0.85) { const u = (phase - 0.55) / 0.30; return 1.0 - ease(u) * 0.55; } // gather
  else                   { const u = (phase - 0.85) / 0.15; return 0.45 - ease(u) * 0.41; } // fold
}
function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function broadcast(state) {
  for (const fn of subs) { try { fn(state); } catch (e) { /* ignore subscriber errors */ } }
}

function tick(now) {
  const t = (pausedAt ?? now) - startTime - pauseOff;
  const phase = ((t % PERIOD_MS) / PERIOD_MS + 1) % 1;
  const cycleIndex = Math.floor(t / PERIOD_MS) + 1;
  const breath = breathOf(phase, now);

  const d = new Date();
  const hour = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;

  broadcast({ breath, phase, cycleIndex, now, hour, paused: pausedAt != null });

  if (cycleIndex !== lastCycle) {
    lastCycle = cycleIndex;
    broadcast({ breath, phase, cycleIndex, now, hour, paused: false, cycleStart: true });
  }

  if (started) requestAnimationFrame(tick);
}

function ensureStarted() {
  if (started) return;
  started = true;
  startTime = performance.now();
  if (!REDUCED) requestAnimationFrame(tick);
  else broadcast({ breath: 0.5, phase: 0, cycleIndex: 1, now: 0, hour: 12, paused: false });
}

/** Subscribe to the global breath state. Returns an unsubscribe fn. */
export function onBreath(fn) {
  subs.add(fn);
  ensureStarted();
  return () => subs.delete(fn);
}

/** Pause / resume the breath (used by long-hold interactions). */
export function pause() { if (!pausedAt) pausedAt = performance.now(); }
export function resume() {
  if (pausedAt != null) { pauseOff += performance.now() - pausedAt; pausedAt = null; }
}

/** Drive the page-level <div class="breath-bloom"> from the breath. */
export function bindBloom(el) {
  if (!el || REDUCED) return () => {};
  return onBreath(s => el.style.setProperty('--b', s.breath.toFixed(3)));
}

/** Drive any element's CSS var --b from the breath (for .breathe-wt etc). */
export function bindBreathVar(el, name = '--b') {
  if (!el) return () => {};
  return onBreath(s => el.style.setProperty(name, s.breath.toFixed(3)));
}

export const config = { PERIOD_MS, REDUCED };
