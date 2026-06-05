# changelog

Each entry is a **checkpoint**. Before merging an implementation, add an entry and tick the checkboxes against `CLAUDE.md` §6.

Format: reverse-chronological. Keep entries terse. Link commits where useful.

---

## v0.1.0 · the breath made one — 2026-06-04

Full visual rebuild. Six phases shipped: shared design system, anime.js motion, living typography, scroll choreography, prototypes brought into one material, polish layer.

### added
- `CLAUDE.md` — the godfile (this is the brain).
- `CHANGELOG.md` — this file.
- `assets/css/system.css` — design tokens, `.glass` primitive, type ramp, motion vars, reduced-motion, view-transitions, focus styles, scrollbar, ::selection.
- `assets/js/engine.js` — **one global breath clock** (18s, hello → between → harvest → fold). Pub/sub via `onBreath(fn)`. Reduced-motion aware.
- `assets/js/glass.js` — cursor-tracked specular sheen on every `.glass`; IntersectionObserver reveal; splitText helper.
- `assets/js/substrate.js` — particle orb + drifting color blooms; subscribes to engine.
- `assets/favicon.svg` — animated breathing orb (SMIL).
- `404.html` — *"the goodbye, slightly heavier than expected."*
- `_redirects` — `/wzxa`, `/lockscreen`, `/endlessly`, `/hello`.
- `_headers` — security + immutable caching on `/assets/*`.
- `manifest.json` — PWA install.
- **Fraunces** variable font added as breathing companion to Cormorant Garamond.
- `.github/workflows/quality.yml` — automated CI: structure + html + brand + links + lighthouse.
- `.htmlhintrc` + `.editorconfig`.

### changed
- `index.html` — anime.js drives hero splitText reveal; reveal-on-scroll; breath-driven nav dot + creed verse rotation; view-transition-name on substrate; full glass treatment.
- `welcome/wzxa.html` — links to shared system; glass onboarding panel + flow steps; `8 of 14` → `8 of 8`; codename slur replaced.
- `welcome/wzxa-lockscreen.html` — links to shared system; real `new Date().getDay()` (was always WED); ARIA label on slider.
- `welcome/endlessly.html` — links to shared system; dead meter code replaced with CSS-var-driven `--p`.
- `welcome/hello-goodbye.html` — broken `@import` moved to `<link>`; `O(N²)` connection loop capped to 16 neighbours.

### removed
- `welcome/ios-frame.jsx` — couldn't execute on a static host; its glass recipe lives in `system.css` now.

### checkpoint
Reviewed against `CLAUDE.md` §6:
- [x] No `@import` inside `<style>` (hello-goodbye fixed).
- [x] Dead meter code removed (endlessly fixed).
- [x] Connection loops capped (hello-goodbye, endlessly both at 16).
- [x] `prefers-reduced-motion` hides canvases, snaps transitions, kills loops.
- [x] All canvases `aria-hidden` or labelled.
- [x] Focus-visible outline shipped in system.css.
- [x] No new accents outside palette.
- [x] No SaaS copy.
- [x] Slur removed from wzxa.html.

---

## v0.0.x · earlier — pre-godfile

Pre-system commits. Landing page + welcome/ prototypes shipped without a shared system. See git log for detail; this file starts the discipline at v0.1.0.
