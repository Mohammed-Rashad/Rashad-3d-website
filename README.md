# On the Convergence of a Yemeni Mathematician

A playful 3D story of Prof. Rashad M. Asharabi, told as a research paper. Made by his son.
The spec lives in `CLAUDE.md`, and the content the family should fill is in `CONTENT_TODO.md`.

```bash
npm install
npm run dev        # http://localhost:5173 (draft jokes/topics show with a DRAFT badge)
npm run build      # → dist/ (deploy to Netlify; netlify.toml included)
npm run preview    # serve dist/ on :4173
npm run shots      # screenshots of every chapter, desktop+mobile, EN+AR (needs `npm run preview`)
npm run audio      # regenerate the synthesised placeholder sounds
```

## How it fits together

- `content/*.json`: everything the family edits. It is rendered **at build time** into static bilingual HTML (`src/render/page.mjs`), so the text reads without JavaScript.
- `src/main.js`: scroll → chapter, language toggle (RTL), sound, coffee-cup hunt, easter eggs, lazy widgets.
- `src/scene/`: the single WebGL canvas: `globe.js`, `dioramas.js` (one per chapter), `kit.js` (shared low-poly style), and `world.js` (camera flights only on chapter change).
- `src/curve.js`: the life curve (bottom strip + §9 finale). `src/explorable.js`: §8 widgets. `src/constellation.js`: §5 co-author stars.
- `prefers-reduced-motion` or no WebGL → calm 2D mode (no 3D, static curve, side timeline, cups become tiny buttons in the cards).

## Easter eggs
Type `sinc` · Konami code (LaTeX mode) · click his name 17 times · `In[1]:= Rashad[]` in §9 · find 8 coffee cups.
Keys: `n` / `p` (or `]` / `[`) jump between sections.
