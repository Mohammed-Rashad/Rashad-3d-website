# CLAUDE.md — "On the Convergence of a Yemeni Mathematician"
### A playful 3D portfolio for Prof. Rashad M. Asharabi (رشاد مدهش الشرعبي)

You are building a warm, nerdy, slightly funny 3D website about **Prof. Rashad M. Asharabi**, a mathematician, made by his son as a gift. It is **not** a CV site. His formal CV lives at https://rashad1974.netlify.app/ and stays the source of truth for academic details; this site tells the *human* story and links there.

Tone: an affectionate family album that happens to understand Fourier analysis. Elegant first, jokes second, never cringe.

---

## 0. Implementation notes (how this repo is built — keep in sync)

- **Stack:** Vite + vanilla Three.js + GSAP + KaTeX + Howler. One canvas (`#world`), chapters = diorama groups switched by scroll.
- **Content → HTML at build time:** `vite.config.js` plugin calls `src/render/page.mjs`, which renders `content/*.json` + `CREDITS.md` into static bilingual HTML (`.l-en` / `.l-ar` spans; `html[data-lang]` hides one). Text and KaTeX are readable without JS. Strings equal to `TODO_FROM_FAMILY` are hidden. In `npm run dev`, unapproved jokes / unconfirmed history topics show a DRAFT badge; in production unconfirmed history topics are hidden.
- **Chapter config:** `src/chapters.mjs` (ids, titles EN/AR, accents, ambience, lat/lon, life-curve sample values).
- **3D:** `src/scene/world.js` (renderer, bloom on desktop, sky dome, globe at y=80, dioramas at origin; `go(id)` = rise → fly along arc → dive; camera never moves otherwise). `dioramas.js` builders return `{group, cam, sky, fog, sun, hemi, clickables, drags, actions, anchors, cupSpot, update, onEnter}`. `kit.js` = shared flat-shaded palette materials and props. Card buttons mirror every 3D interaction (keyboard access).
- **Layout:** cards sit on the start side; the 3D view is shifted with `camera.setViewOffset` (right in LTR, left in RTL, up on mobile).
- **Calm mode:** `prefers-reduced-motion` or no WebGL → `html.calm` (no canvas, side timeline, static final curve, cups as tiny card buttons).
- **Assets:** Poly Haven CC0 GLBs in `public/models/<chapter>/` (pipeline in `ASSETS.md`, downloader `tools/polyhaven.mjs`). Everything else is procedural.
- **Audio:** placeholder sounds are synthesised by `tools/synth-audio.mjs` (CC0). Replace files in `public/audio/` with real recordings of the same name.
- **QA:** `npm run preview` then `npm run shots` (Playwright; desktop+mobile × EN+AR). Headless uses SwiftShader (~2 fps) so it waits longer per chapter (`WAIT=9000`). `gsap.ticker.lagSmoothing(0)` keeps transitions time-based on slow devices.
- **Coffee cups:** the hunt resets on every page load (not persisted, by family request). Placed at runtime (`positionCup` in world.js) by raycasting through `CUP_AT[id]` inside the screen area not covered by the card (`freeRect` in main.js), only on up-facing surfaces, never on water (`userData.noCup`). Halo + steam, brighter after ~10 s. QA: `node tools/qa-cups.mjs desktop|mobile` (needs `npm run preview`).
- **Chalkboard:** `src/chalk.js`. The `#chalk-pad` canvas in the §2 card is also the 3D board's texture.
- **Ending:** `epilogue` chapter (Appendix A) = interactive globe; the visitor rotates the *globe* (the camera stays still), and pins/labels scroll to their chapter.
- **Sky:** shader in world.js with per-chapter `SKIES`. The five places use Poly Haven pure-sky panoramas (`public/skies/<id>.jpg`, `-1k` on phones), crossfaded and rotated (`yaw`) so the sun sits behind the scene; the same panorama is PMREM'd into `scene.environment` to light the PBR models. Globe/AI/interiors use the painted procedural sky (gradient, sun glow, fbm clouds, stars).
- **Performance:** `?debug=1` shows an fps/draw-call/triangle/texture/heap overlay. Phones are capped at 30 fps and render at DPR ≤ 1.5 without bloom. The 3D world starts only after the intro, on idle. CMU fonts are self-hosted in `src/fonts.css` with `font-display: swap`. Lighthouse mobile: 94 performance, 95 accessibility (2026-11-05).
- **Buildings:** made live in Blender. `tools/blender/lib.py` (Builder: primitives + box-UV + join + recentre + export), `06_holstentor.py`, `08_yemen_houses.py`, `09_cairo_univ.py`. Sketchfab models: `01_lineup.py` → `02_clean.py` → `04_export.py`. Run with `node tools/blender/live.mjs <script.py>` (Blender add-on socket :9876), then gltf-transform resize 512 + webp + meshopt.
- **Icons:** `src/icons.mjs` (inline SVG, no emoji). In index.html use `<!--ICON:name-->` (replaced by the Vite plugin).
- **Gotcha:** the pyenv `python3` shim on this machine prints nothing; use node for scripts.

---

## 1. The five ideas we are building (and nothing more)

These were chosen from research into playful 3D portfolios (Bruno Simon), interactive science essays (Bartosz Ciechanowski), and biography story-maps. Build these well; don't add other gimmicks.

1. **His life as a research paper** (the framing). The whole site is styled as a math paper: title page, abstract, numbered sections (= life chapters), theorems, footnotes, and a reference list (= credits). Every chapter header looks like `§3 Cairo: Convergence Under Supervision`.
2. **The life curve** (the visual spine). A glowing signal line runs through the whole site. Each chapter is a *sample point*; as you scroll, sinc lobes bloom from each point and the continuous curve reconstructs between them. At the end a Gaussian envelope appears, labeled *family*, and the series converges.
3. **A story-map globe** (the transitions). A stylized low-poly globe with glowing arcs Taiz → Sana'a → Cairo → Lübeck → Najran. The camera flies **only when the chapter changes**, never continuously. Only the five main places get pins; no conference-by-conference clutter.
4. **One real explorable** (the showpiece, Ciechanowski-style). A playable version of his actual research: aliasing → sinc reconstruction → sinc-Gauss → a tiny neural net. Text must be readable without JS; interactivity is layered on top.
5. **Whispers + coffee cups** (the charm, Bruno-Simon-style). Short notes from family, students and colleagues pinned in the 3D world, plus a hidden Yemeni coffee cup in each chapter. Finding all of them shows a short "You found all 8 cups!" celebration (no message, family decision 2026-11-06).

Explicitly **not** doing: a drivable car, leaderboards, a full publications list, constant camera motion, a badge wall.

---

## 2. Facts you may use (do not invent beyond these)

- Full name: **Rashad Mudhsh Ali Hezam Asharabi** — رشاد مدهش علي حزام الشرعبي. Born **17 Dec 1974, Taiz, Yemen**. Married, **4 children**.
- **B.S. Mathematics, Sana'a University** (1999). Demonstrator at the Higher Institute of Teachers, Taiz (1995–97), then Faculty of Education, Al-Mahweet.
- **Cairo University**: M.Sc. (2004), Ph.D. (2008), supervised by **Prof. Mahmoud Annaby**, his most frequent co-author. First big paper: *SIAM J. Numer. Anal.* (2008).
- Back in Yemen 2008–2011: Assistant Prof. and **Head of Mathematics, Al-Mahweet**.
- **Germany / Humboldt Foundation**, University of **Lübeck**, host **Prof. Jürgen Prestin**: 2011 (European-Islamic Cultural Dialogue fellowship), postdoc 2012–13, 2014, 2017, 2019. Also Berlin, Bremen, Karlsruhe.
- **Najran University, Saudi Arabia**: Assistant → Associate (2016) → **Full Professor (Dec 2020)**. Supervised six M.Sc. students. Editor at *Mathematical Problems in Engineering*. Expert in **Mathematica** and **LaTeX**.
- Research: sampling theory, sinc methods, sinc-Gaussian and Hermite-Gauss sampling, error analysis (truncation, amplitude, jitter, aliasing), eigenvalues of Sturm–Liouville and Dirac problems, linear canonical transforms. Co-authors include Annaby, Prestin, Tharwat, and his students.
- Key technical fact (use it, it's the best joke source): adding a **Gaussian multiplier** to classical sinc sampling changes the convergence rate from **polynomial** to **exponential**, roughly `O(e^{−(π−hσ)N/2} / √N)`. He later built the **Hermite-Gauss** version with Prestin (2015), which uses derivatives too.
- Two of his chapters appeared in a **Festschrift for Frank Stenger's 80th birthday** (2021).

Everything personal (childhood, hobbies, Facebook writing, his views on history, politics, AI) comes only from `content/*.json`, filled by the family. **Never fabricate anecdotes, quotes, opinions, or posts.** Empty fields hide gracefully (no lorem ipsum). Mark gaps as `TODO_FROM_FAMILY` and list them in `CONTENT_TODO.md`.

---

## 3. The paper, section by section

### Title page (intro)
```
On the Convergence of a Yemeni Mathematician
R. M. Asharabi¹ · Received: 17 December 1974 · Accepted: still under review
¹ Taiz → Sana'a → Cairo → Lübeck → Najran

Abstract. We study a function f(t), known locally as "Baba", sampled at
five points in space-time. Using a sinc-Gaussian operator with family as
the multiplier, we reconstruct the continuous life between samples and
show that convergence is exponential.

Keywords: sampling, coffee, chalk, Humboldt, Facebook, four children.
MSC 2020: 94A20, 41A25, 00-DAD
```
Starts on black; a single point of light oscillates into a sinc wave, then the title page fades in. A "tap to enable sound" toggle (off by default).

### §1 Taiz: Initial Conditions
- Diorama: terraced mountains, stone tower houses with white gypsum trim, a hilltop fortress, a coffee plant.
- Fact hook: **al-Mokha** (origin of "mocha") is in Taiz governorate. Clicking the coffee plant pours a tiny cup.
- **Joke — Lemma 1.1 (Jitter error).** *His 2011 paper studies "jitter errors" in sampling. We conjecture the source is Yemeni coffee.*
- Content slots: childhood stories, school, old photos in flipping frames.
- Sound: mountain wind, birds, coffee pour/clink.

### §2 Sana'a: The First Samples
- Diorama: Old Sana'a facades at dusk, a small classroom chalkboard.
- Interaction: chalkboard writes `f(t) = Σ f(n)·sinc(t − n)`; drag to erase with chalk dust.
- **Joke — Remark 2.1.** *He was teaching mathematics before finishing his degree. In sampling terms: output before input. Causality is overrated.*
- Sound: chalk scratch, school bell.

### §3 Cairo: Convergence Under Supervision
- Diorama: the Nile, a felucca, Cairo University's dome silhouette, a lamp-lit desk piled with papers.
- Interaction: a `.tex` file compiles into a PDF with a *ding*; the top sheet is the 2008 SIAM paper title.
- A second faint dot, **"Annaby"**, follows his on the life curve here and keeps reappearing later (co-author).
- **Joke — Theorem 3.1 (Eigenvalues of discontinuous problems).** *His early papers compute eigenvalues of problems with discontinuities. Moving countries four times is a discontinuity. Our result: the eigenvalues (his values) stayed the same.*
- Sound: river water, light street ambience, keyboard clacks, compile *ding*.

### §4 Lübeck: Periodic Nonuniform Sampling
- Diorama: Holstentor (two round towers), red-brick gabled houses, Baltic sea, toggleable snow.
- **Joke — Definition 4.1.** *His Humboldt visits to Germany (2011, 2012–13, 2014, 2017, 2019) are a textbook example of **periodic nonuniform sampling**, the title of his 2023 paper.* Show the years as samples on a mini axis.
- **Joke — Problem 4.2 (Inverse heat conduction).** *He has a paper on the inverse heat conduction problem. Applied version: go from Najran in August to Lübeck in January and reconstruct how you got there.*
- Easter egg: a **marzipan** block (Lübeck's specialty); click it and it "samples" itself into slices.
- Europe mini-map pins: Lübeck, Berlin, Bremen, Karlsruhe. Theme: the 2011 fellowship was literally *European-Islamic Cultural Dialogue*.
- Content slots: family life in Germany, food missed/discovered, travels (TODO_FROM_FAMILY).
- Sound: seagulls, church bells, tram bell, snow footsteps.

### §5 Najran: The Professor
- Diorama: Najran mud-brick towers, palms, a lecture hall.
- "Full Professor" as a tasteful level-up: a gold sinc pulse, nothing more.
- **Co-author constellation:** his papers as stars, lines between co-authors. Annaby and Prestin form the big clusters; his six M.Sc. students are newer stars. Built from public CV data only.
- **Joke — Corollary 5.1 (Hyperstability).** *He has a 2024 paper on hyperstability of functional equations. Anyone who survived supervising six theses and committee meetings is hyperstable.*
- Sound: warm desert wind, short applause, page turn.

### §6 The Library: History & Politics
- Cozy study: bookshelves, a globe, a radio, a newspaper.
- Books are clickable; each opens a history topic he loves (from `history.json`, only `confirmed: true`). For now §6 just states his interest; no placeholder text about the family choosing books.
- **Politics:** say only that he follows and writes about history and politics, and link his own posts. Never state or invent positions. No political imagery.
- **Joke — Remark 6.1 (Aliasing error).** *He wrote a paper on aliasing error. Real-world aliasing: Asharabi, Al-Sharabi, Ash-Sharabi, Alsharabi. Same signal, many reconstructions.*
- Sound: radio tuning crackle, page flips.

### §7 The Writer: Facebook Posts
- Posts appear as handwritten letters you pull from an envelope, or pinned on a corkboard.
- **Decided with the family (2026-11-05):** no posts on the site, only a link to his account https://www.facebook.com/rashad197 (`profile.json → links.facebook`).
- Never scrape Facebook. Never generate posts. Empty file → "Posts coming soon" in handwriting.
- **Joke — Footnote 7.1.** *Unlike his journal papers, these posts were not peer-reviewed. The comment section did that.*
- Sound: paper rustle, pen scribble.

### §8 AI: Two Ways to Fill the Gaps (the explorable)
Build this like a Ciechanowski essay: short text, then a widget, then more text.
1. **Aliasing:** a spinning wheel and a sample-rate slider; drop it too low and the wheel appears to spin backwards.
2. **Reconstruction:** visitors click to place samples; the curve reconstructs live with classical sinc.
3. **His contribution:** toggle the Gaussian multiplier; show the error plot dropping from polynomial to exponential. One line of KaTeX for the rate, with a "what does this mean?" tooltip.
4. **The machine's way:** "AI mode" trains a tiny MLP in the browser (hand-rolled or TensorFlow.js) on the same points and draws its curve beside his.
- Caption: "Before computers could hear or see, someone had to prove you could rebuild the whole from the samples."
- Content slot for his own views on AI (`ai.json`).
- Sound: soft synth blips per point, a low hum while training.

### §9 Conclusion: Convergence
- All five sample points light up; the curve fully reconstructs; the Gaussian envelope appears, labeled *family*.
- **Main Theorem.** *Let f be a life sampled at Taiz, Sana'a, Cairo, Lübeck and Najran. With a Gaussian multiplier G (one patient wife, four children), the reconstruction converges exponentially.* **Proof.** *Left as an exercise to the reader. ∎*
- Whispers from family/students fade in around the curve.
- **References** section = real links: Formal CV, ORCID, Google Scholar, plus `CREDITS.md` styled as a bibliography.
- **Acknowledgements:** "This work was supported by the Alexander von Humboldt Foundation, Cairo University, Najran University, and an unreasonable amount of coffee."
- Optional final line, like a Festschrift dedication: "A Festschrift in honor of Baba, from his four co-authors." (Confirm wording with the family.)

---

## 4. Small easter eggs (keep it to these)

- Type `sinc` → the page wobbles like a sinc wave.
- Konami code → "LaTeX mode": Computer Modern font, black on cream, numbered equations.
- Click his name 17 times → hidden birthday message from the kids (`messages.json`).
- A Mathematica-style cell: `In[1]:= Rashad[]` → `Out[1]= "Baba"`.
- Footer: "Status: Under review (Referee 2: Mom)." Only if the family approves.

All jokes above should be confirmed by the family before launch; keep them in `content/jokes.json` so they can be edited or removed without touching code.

---

## 5. 3D assets: search first, then generate

**Go find real assets online before modeling anything.** Search actively; don't settle for primitives.

Where to look (in this order):
1. **Poly Haven** — CC0 models, textures, HDRIs. Best default.
2. **Kenney.nl**, **Quaternius**, **Poly Pizza** — CC0 low-poly kits (buildings, nature, props).
3. **Sketchfab** — filter by downloadable + CC0 or CC-BY only. Good for landmarks (Holstentor, feluccas, Yemeni tower houses, mud-brick towers).
4. **Fab / other libraries** — only with a clear license that allows use on a public site.

Use the **Blender MCP** whenever it helps:
- Search/import from Poly Haven and Sketchfab directly into Blender.
- **Generate** anything you can't find (Hyper3D Rodin / Hunyuan3D): a marzipan block, a Yemeni coffee pot (dallah/jamana), a Najran mud tower.
- **Unify the kit:** retopo/decimate, apply one shared palette and material style, fix scale and pivots, bake lighting if useful.
- Export `.glb` per chapter into `public/models/<chapter>/`, compress with Draco or meshopt, textures as KTX2/WebP.
- Take viewport screenshots to verify scenes look consistent before exporting.

Log every model in `ASSETS.md`: name, source URL or generation prompt, author, license, edits made. Skip anything with unclear licensing.

---

## 6. Sound: search the internet, then generate

**Search for real recordings first.** Each chapter needs one looping ambience plus a few interaction sounds (listed in §3).

Where to look:
1. **Freesound.org** (use the Freesound MCP if available) — prefer CC0, CC-BY is fine with credit.
2. **Pixabay Sound Effects**, **Mixkit**, **Kenney audio packs**, **Sonniss GDC bundles** (royalty-free).

If a sound doesn't exist or doesn't fit, generate it with the **ElevenLabs MCP** (`text_to_sound_effects`), e.g. "chalk on an old blackboard, close mic" or "evening wind over stone houses in the Yemeni mountains". Use `compose_music` only for a subtle background score.

Rules:
- Download into `public/audio/`; **never hotlink**. Provide `.ogg` + `.mp3`, each under ~200 KB; loops must be seamless.
- Log everything in `CREDITS.md` (name, URL, author, license).
- Use Howler.js or Web Audio. Sound is **off until the visitor taps the toggle**. Crossfade ambiences between chapters, master volume, persistent mute.
- Ask before adding a call-to-prayer ambience to Taiz.
- No voice cloning of Prof. Rashad. If the family records his real voice, use that instead.

---

## 7. Visual & typography

- Palette: night indigo background, warm gold life curve. Chapter accents: Taiz terracotta/coffee, Sana'a dusk violet, Cairo Nile teal + sand, Lübeck brick red + Baltic grey, Najran ochre, AI soft cyan.
- Fonts: **Computer Modern / Latin Modern** (web version) for paper-style headings and theorems, **Amiri** or **Noto Naskh Arabic** for Arabic, a clean sans for body, a handwriting font for letters.
- Style: stylized low-poly, soft fog, bloom on the curve. Real photos appear as framed polaroids, not as textures on geometry.
- Bilingual **Arabic / English** toggle. Arabic UI is RTL (mirror the UI, not the 3D scene). Math stays LTR.

---

## 8. Tech

- **Vite + Three.js** (vanilla or React Three Fiber; pick one and stay consistent), GSAP ScrollTrigger for scroll choreography, KaTeX for formulas.
- One canvas; chapters are groups switched by scroll progress; lazy-load each chapter's assets.
- Deploy on **Netlify** (static).
- Budget: < 5 MB initial load, 60 fps desktop, 30+ fps mid-range phones.
- Accessibility: `prefers-reduced-motion` → calm 2D timeline version; keyboard navigation between sections; alt text everywhere; captions independent of sound.
- Mobile: simplified dioramas, fewer particles, bloom optional.
- If a browser-automation MCP (e.g. Playwright) is available, use it to screenshot every chapter on desktop and mobile, in both languages, before calling anything done.

---

## 9. Content files (filled by the family)

```
content/
  profile.json     # names (AR/EN), chapter intros
  chapters.json    # stories, photos, dates          (TODO_FROM_FAMILY)
  history.json     # history topics he loves
  ai.json          # his thoughts on AI
  whispers.json    # short notes from family/students: { from, text, chapter }
  messages.json    # hidden messages from the kids
  jokes.json       # every joke/theorem on the site, editable
public/photos/     # only photos the family approves
```
The site must look good with these mostly empty and get richer as they fill.

---

## 10. Don't

- Don't invent facts, anecdotes, quotes, opinions or posts.
- Don't take political sides or use political imagery.
- Don't publish his phone number or personal emails.
- Don't scrape Facebook, Google Scholar, or any private source.
- Don't list all publications; at most "40+ papers" plus a link.
- Don't move the camera unless the chapter changes.

---

## 11. Definition of done

- [ ] Paper framing: title page, §1–§9, theorems, references, acknowledgements.
- [ ] Life curve reconstructs across all chapters and converges at the end.
- [ ] Globe transitions between the five places.
- [ ] Explorable works on desktop and mobile (aliasing → sinc → sinc-Gauss → MLP).
- [ ] Whispers and coffee-cup hunt working.
- [ ] Arabic/English toggle with correct RTL.
- [ ] Ambience per chapter, sound toggle, `CREDITS.md` complete.
- [ ] `ASSETS.md` lists every model with source and license.
- [ ] Reduced-motion fallback; Lighthouse mobile performance ≥ 80.
- [ ] `CONTENT_TODO.md` lists every slot the family needs to fill.
