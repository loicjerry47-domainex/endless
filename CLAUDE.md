# CLAUDE.md — the godfile

> Auto-loaded by Claude Code when working in this repo. Keep this short, dense, and **prescriptive** — if something is allowed to drift, it will.

---

## 1. What this is

**DDUP · DOMAINEX → `endless`** is the public face of **WZXA**, a background companion concept:

> *He lives & so do you.*
> A theme that breathes. An autonomous companion living quietly in the background of your device — aging when you age, vibing when you vibe, doing the thing you should be doing when you aren't.

**Not an app. The wallpaper.** Every design and code choice serves that thesis. If a change makes the site feel more like a typical SaaS landing page (cards in a grid, CTA buttons, hero with screenshots), **it is wrong**.

---

## 2. Brand identity — non-negotiable

### Palette
```css
--bg:       #07060a   /* near-black */
--bg-soft:  #0e0c14
--ink:      #f4ecdc   /* warm cream — primary text */
--warm:     #f5c97a   /* amber — accent */
--ember:    #e88a4a   /* deeper amber — secondary accent */
--cool:     #7aa9f5   /* blue — used sparingly in blooms */
--dim:      rgba(244, 236, 220, 0.50)
--faint:    rgba(244, 236, 220, 0.14)
--hairline: rgba(244, 236, 220, 0.10)
```
**Do not introduce new accent colors.** If you need a tint, mix from the above.

### Type
| family | role |
|---|---|
| **Cormorant Garamond** italic 300 | display serif (h1/h2 hero titles) |
| **Fraunces** variable italic | running serif body + breathing letterforms (the `&`) |
| **JetBrains Mono** 300/400/500 | labels, captions, code, all uppercase tracking |

Type sizes use `clamp(min, fluid, max)`. No magic px sizes on display type.

### Voice
- lowercase by default except brand marks (DDUP · DOMAINEX, WZXA, M · E · B).
- italic for thesis lines, mono uppercase for labels/captions.
- writing is **terse, declarative, slightly cryptic.** Compare:
  - ✅ "he ages with you."
  - ❌ "Watch as your companion grows alongside you over time."
- profanity is permitted *in the WZXA stage data* (it's the character's voice). It is **forbidden** in product copy, page chrome, error states.
- **Banned words/phrases:** slurs of any kind, "SaaS", "product", "platform", "users" (use "you"), buzz like "revolutionary" or "AI-powered".

---

## 3. The breath — the one rhythm

There is **one global breath clock** in `assets/js/engine.js`. Period: **18000 ms**.
Phases (matches the prototype `endlessly.html`):

| phase | range | state |
|---|---|---|
| hello | 0.00 – 0.18 | held compressed seed |
| exhale (between) | 0.18 – 0.55 | expand |
| gather (harvest) | 0.55 – 0.85 | wide but condensing |
| fold | 0.85 – 1.00 | collapse back to seed |

**Every visual surface that moves must subscribe to this clock.** No private RAF loops for new features. Use `onBreath(fn)` from `engine.js`.

---

## 4. Liquid glass — the material

The `.glass` primitive is defined once in `assets/css/system.css`. Recipe:
- `backdrop-filter: blur(18px) saturate(165%)`
- dark tint `rgba(18, 16, 26, 0.38)`
- hairline border `0.5px solid rgba(244, 236, 220, 0.14)`
- inset shine + outer drop shadow
- **cursor-tracked specular sheen** via `::before` driven by `--mx/--my` (set by `glass.js`)
- edge refraction via `::after` (top-left light catch)

Frosted glass needs **something living behind it to refract** — never put `.glass` directly on solid color. Use the substrate (`<canvas class="substrate">` + `<div class="breath-bloom">`) or color blooms.

---

## 5. Architecture

```
/
├── index.html                  hub
├── 404.html                    in-world not-found
├── manifest.json               PWA
├── _headers                    Cloudflare cache + security
├── _redirects                  clean URLs
├── CLAUDE.md                   THIS FILE
├── CHANGELOG.md                per-cycle ship log
├── README.md                   public face
├── .editorconfig
├── .github/workflows/          CI quality
│
├── assets/
│   ├── favicon.svg             animated breathing orb
│   ├── css/system.css          tokens, glass, type, motion, a11y
│   └── js/
│       ├── engine.js           global breath clock (pub/sub)
│       ├── glass.js            cursor sheen + reveal + splitText
│       └── substrate.js        particle orb + color blooms
│
└── welcome/
    ├── wzxa.html               full concept treatment
    ├── wzxa-lockscreen.html    interactive lockscreen
    ├── endlessly.html          generative breath loop
    └── hello-goodbye.html      three-scene meditation
```

**Rules:**
- All pages **must** `<link rel="stylesheet" href="/assets/css/system.css">`.
- All pages that move **must** subscribe to `engine.js`. No private RAF loops.
- All glass surfaces use the `.glass` class (don't reinvent the recipe).
- No build step. ESM imports via jsDelivr CDN when needed (`anime.js`).
- Vendored libraries go in `assets/lib/` and use `Cache-Control: immutable`.

---

## 6. Code review checklist — gates, not suggestions

Every PR (or implementation step) must clear these gates. If you can't honestly check the box, fix it before merging.

### Correctness
- [ ] No new `@import url(...)` *inside* a `<style>` block — must precede every other rule (use `<link>` instead).
- [ ] No dead code (`x ? null : null`, unused variables, placeholder no-ops).
- [ ] `O(N²)` particle loops capped to ~16 neighbours.
- [ ] Canvas resize cleanups not leaking RAF or listeners on navigation.
- [ ] Variable fonts: don't claim `wght` animation on non-variable faces.

### Accessibility
- [ ] `prefers-reduced-motion`: canvases hide, transitions snap, no infinite animations.
- [ ] Every `<canvas>` has `aria-hidden="true"` or a `role="img"` + `aria-label`.
- [ ] All interactive controls are `<button>` or have `tabindex="0"` + keyboard handlers.
- [ ] `:focus-visible` outline present (system.css provides this — don't override).
- [ ] Text contrast ≥ 4.5:1 against the substrate at idle.

### Performance
- [ ] Particle counts scale by viewport (`innerWidth < 720 → halve`).
- [ ] `Math.min(devicePixelRatio, 2)` on every canvas.
- [ ] No O(N²) work without a neighbour cap.
- [ ] Listeners use `{ passive: true }` where possible.

### Brand
- [ ] No new accent colors outside the palette.
- [ ] No SaaS-y copy ("revolutionary", "AI-powered", "users", "platform").
- [ ] No slurs anywhere in copy, comments, commit messages.
- [ ] All h1/h2 use Cormorant Garamond display italic 300.

### Hygiene
- [ ] No vendor lock-in (no React, no Tailwind, no framework — this is intentionally a no-build site).
- [ ] No analytics, no third-party scripts beyond `cdn.jsdelivr.net/npm/animejs`.
- [ ] No tracking pixels, no fingerprinting.
- [ ] Commits sign-off as Claude when AI-authored: `noreply@anthropic.com`.

---

## 7. Deploy

Cloudflare Pages, `main` branch, **no build step**:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | *(empty)* |
| Output directory | `/` |
| Production branch | `main` |

Project name: `endless-bjy` · domain: `endless-bjy.pages.dev`.

---

## 8. The North Star

If you're ever unsure whether a change belongs: ask whether it makes the site feel more **like a quiet companion that breathes** or more **like a portfolio page**. Companion → ship. Portfolio → don't.

*to be perfect is to be what is: past, present, future = perfect.*
