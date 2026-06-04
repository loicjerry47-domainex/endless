/* ============================================================
   DDUP · DOMAINEX — the living substrate
   Color blooms + breathing particle orb. Subscribes to engine.js.
============================================================ */

import { onBreath, config } from './engine.js';

const TWO_PI = Math.PI * 2;

export function mountSubstrate(canvas, opts = {}) {
  if (!canvas || config.REDUCED) return () => {};

  const ctx = canvas.getContext('2d');
  const orb = opts.orb ?? { cx: 0.80, cy: 0.24, rad: 0.30 };
  const N   = opts.particles ?? 110;
  const showBlooms = opts.blooms ?? true;

  let W, H, DPR = Math.min(devicePixelRatio || 1, 2);

  function resize() {
    W = innerWidth; H = innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  // scale particle count down on small screens
  const n = innerWidth < 720 ? Math.round(N * 0.5) : N;

  const blooms = [
    { hx: 0.80, hy: 0.22, rad: 0.55, col: [245, 201, 122], amp: 0.14, sp: 0.00041, ph: 0 },
    { hx: 0.18, hy: 0.62, rad: 0.50, col: [232, 138,  74], amp: 0.10, sp: 0.00033, ph: 2.1 },
    { hx: 0.55, hy: 0.92, rad: 0.62, col: [122, 169, 245], amp: 0.06, sp: 0.00027, ph: 4.2 },
  ];

  const ps = [];
  for (let i = 0; i < n; i++) {
    ps.push({
      a: Math.random() * TWO_PI,
      r: Math.random(),
      seed: Math.random(),
      phase: Math.random() * TWO_PI,
      size: 0.4 + Math.random() * 1.1,
    });
  }

  let lastNow = 0;
  let breathNow = 0.5;

  function frame() {
    ctx.fillStyle = 'rgba(7, 6, 10, 0.20)';
    ctx.fillRect(0, 0, W, H);

    const now = lastNow;
    const breath = breathNow;

    ctx.globalCompositeOperation = 'lighter';

    if (showBlooms) {
      for (const bl of blooms) {
        const pulse = 0.7 + Math.sin(now * bl.sp + bl.ph) * 0.3;
        const cx = (bl.hx + Math.sin(now * bl.sp * 0.6 + bl.ph) * 0.04) * W;
        const cy = (bl.hy + Math.cos(now * bl.sp * 0.5 + bl.ph) * 0.04) * H;
        const rad = bl.rad * Math.min(W, H) * (0.8 + breath * 0.4) * pulse;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        const [r, gg, b] = bl.col;
        g.addColorStop(0, `rgba(${r}, ${gg}, ${b}, ${bl.amp * pulse})`);
        g.addColorStop(1, `rgba(${r}, ${gg}, ${b}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, TWO_PI);
        ctx.fill();
      }
    }

    // particle orb
    const ocx = orb.cx * W;
    const ocy = orb.cy * H;
    const R   = orb.rad * Math.min(W, H);
    for (let i = 0; i < n; i++) {
      const p = ps[i];
      const a = p.a + now * 0.00005 * (p.seed - 0.5);
      const r = p.r * R * (0.3 + breath * 0.9);
      const wob = Math.sin(now * 0.00075 + p.phase) * 5;
      const x = ocx + Math.cos(a) * r + wob;
      const y = ocy + Math.sin(a) * r * 0.82;
      const warmth = 0.3 + p.seed * 0.5;
      const ri = 245, gi = Math.round(201 + 35 * (1 - warmth)), bi = Math.round(122 + 98 * (1 - warmth));
      ctx.fillStyle = `rgba(${ri}, ${gi}, ${bi}, ${0.30 + p.seed * 0.35})`;
      ctx.beginPath();
      ctx.arc(x, y, p.size * (0.8 + (1 - breath) * 0.6), 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }

  const unsub = onBreath(s => { lastNow = s.now; breathNow = s.breath; });
  requestAnimationFrame(frame);
  return () => { unsub(); removeEventListener('resize', resize); };
}
