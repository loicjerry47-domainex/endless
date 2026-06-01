# endless

**WZXA — a background companion.**
He lives & so do you.

A theme that breathes. An autonomous companion living quietly in the background of your device — aging when you age, vibing when you vibe, doing the thing you should be doing when you aren't.

---

## structure

```
index.html                  ← main landing site
welcome/
├── wzxa.html               ← full concept treatment
├── wzxa-lockscreen.html    ← interactive lockscreen prototype
├── endlessly.html          ← generative breath loop
├── hello-goodbye.html      ← three-scene meditation
└── ios-frame.jsx           ← iOS 26 device frame component
```

## deploy

No build step. Point Cloudflare Pages (or any static host) at the repo root:

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
