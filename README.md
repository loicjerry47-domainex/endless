# endless

**WZXA — a background companion.**
He lives & so do you.

A theme that breathes. An autonomous companion living quietly in the background of your device — aging when you age, vibing when you vibe, doing the thing you should be doing when you aren't.

---

## structure

```
index.html                  ← main landing site
404.html                    ← in-world not-found page
manifest.json               ← PWA manifest
_headers                    ← Cloudflare Pages cache + security policy
_redirects                  ← clean URLs (/wzxa, /endlessly, /hello, /lockscreen)

assets/
├── favicon.svg              ← animated breathing orb
├── css/system.css           ← design tokens, glass primitive, type, motion, a11y
└── js/
    ├── engine.js            ← global breath clock (one RAF, pub/sub)
    ├── glass.js             ← cursor specular, reveal-on-scroll, splitText
    └── substrate.js         ← particle orb + color blooms

welcome/
├── wzxa.html                ← full concept treatment
├── wzxa-lockscreen.html     ← interactive lockscreen prototype
├── endlessly.html           ← generative breath loop
└── hello-goodbye.html       ← three-scene meditation
```

## design language

- **Type:** Cormorant Garamond (display italic) + Fraunces (variable, breathes with the orb) + JetBrains Mono.
- **Palette:** warm ember on near-black. Hairline borders, golden specular hovers.
- **Glass primitive:** `backdrop-filter` + inset shine + cursor-tracked sheen. Applied to nav, cards, flow steps, creed, panels.
- **Motion:** one global breath clock (18s cycle: hello → between → harvest → fold). Every visual surface — nav dot, hero ampersand, particle field, color blooms — subscribes to the same rhythm.
- **Animation:** Anime.js (vendored via jsDelivr ESM) drives the hero splitText reveal.
- **A11y:** `prefers-reduced-motion` hides canvases and snaps transitions; focus-visible outlines; skip-to-content link.

## deploy

Cloudflare Pages — no build step:

- Framework preset: **None**
- Build command: *(empty)*
- Output directory: `/`

## run locally

```sh
python3 -m http.server 8000
# → http://localhost:8000/
```

---

*ddup · domainex · no doubt*
