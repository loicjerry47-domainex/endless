# welcome

Standalone prototypes — design / motion treatments.

## Files

- `endlessly.html` — single-breath generative loop; click/drag interactions, verse cycling
- `hello-goodbye.html` — three-scene meditation: hello / in between / goodbye
- `wzxa.html` — treatment doc for the WZXA background companion
- `wzxa-lockscreen.html` — lockscreen prototype: stage x hour-of-day explorer
- `ios-frame.jsx` — iOS 26 ("Liquid Glass") device frame component kit

## Run

Each HTML file is self-contained — open directly in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000/welcome/
```

`ios-frame.jsx` is a component module; it expects React to be available on `window`.
