/* ============================================================
   DDUP · DOMAINEX — glass + reveal utilities
============================================================ */

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

let cached = [];
function refreshCache() { cached = [...document.querySelectorAll('.glass')]; }

function trackLight(e) {
  const x = e.clientX, y = e.clientY;
  for (const el of cached) {
    const r = el.getBoundingClientRect();
    if (x < r.left - 60 || x > r.right + 60 || y < r.top - 60 || y > r.bottom + 60) continue;
    el.style.setProperty('--mx', (x - r.left) + 'px');
    el.style.setProperty('--my', (y - r.top) + 'px');
  }
}

export function initGlass() {
  refreshCache();
  if (REDUCED) return;
  addEventListener('pointermove', trackLight, { passive: true });
  new MutationObserver(() => {
    clearTimeout(initGlass._t);
    initGlass._t = setTimeout(refreshCache, 80);
  }).observe(document.body, { childList: true, subtree: true });
}

export function initReveal(selector = '.reveal', threshold = 0.12) {
  const els = document.querySelectorAll(selector);
  if (REDUCED) { els.forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const idx = [...e.target.parentNode.children].indexOf(e.target);
      e.target.style.transitionDelay = Math.min(idx, 5) * 80 + 'ms';
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  }, { threshold, rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => io.observe(el));
}

export function splitChars(el) {
  if (!el || el.dataset.split === 'done') return [...el.querySelectorAll('.split-char')];
  const text = el.textContent;
  el.textContent = '';
  const spans = [];
  for (const ch of text) {
    const span = document.createElement('span');
    span.className = 'split-char';
    span.textContent = ch === ' ' ? ' ' : ch;
    if (ch === ' ') span.style.marginLeft = '0.04em';
    el.appendChild(span);
    spans.push(span);
  }
  el.dataset.split = 'done';
  el.setAttribute('aria-label', text);
  return spans;
}

export function revealChars(spans, { from = 'start', stagger = 32, delay = 0 } = {}) {
  if (REDUCED) { spans.forEach(s => s.classList.add('in')); return; }
  const order = computeOrder(spans, from);
  order.forEach((idx, i) => {
    setTimeout(() => spans[idx].classList.add('in'), delay + i * stagger);
  });
}

function computeOrder(spans, from) {
  const n = spans.length;
  const arr = [...Array(n).keys()];
  if (from === 'start')  return arr;
  if (from === 'end')    return arr.reverse();
  if (from === 'center') {
    const c = (n - 1) / 2;
    return arr.sort((a, b) => Math.abs(a - c) - Math.abs(b - c));
  }
  if (from === 'random') return arr.sort(() => Math.random() - 0.5);
  return arr;
}

export const config = { REDUCED };
