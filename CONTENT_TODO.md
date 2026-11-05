# Content the family needs to fill

Everything below is optional: the site already looks finished with these empty and gets richer as they fill. Edit the JSON in `content/`, run `npm run dev` to preview, then push (Netlify rebuilds).
Any value equal to `TODO_FROM_FAMILY` (or empty) is hidden on the live site.

## Links (`content/profile.json → links`)
- [ ] `scholar`: his own Google Scholar profile URL (the two Scholar links on the CV belong to his referees, so they are not used)
- [x] `facebook`: https://www.facebook.com/rashad197 (§7 and §6 link to his page; no individual posts on the site)

## Per-chapter stories & photos (`content/chapters.json`)
For each of `taiz`, `sanaa`, `cairo`, `lubeck`, `najran`, `library`, `writer`, `ai`, `conclusion`:
- [ ] `stories`: short anecdotes `{ "title": {en, ar}, "text": {en, ar} }`
- [ ] `photos`: approved photos only. Put files in `public/photos/` and reference them as `"photos/name.jpg"` with `alt` + `caption` (+ `year`). Taiz photos also flip inside the 3D picture frame.
- [ ] §1 Taiz: childhood, school, old photos
- [ ] §4 Lübeck `germanyLife`: family life in Germany, food missed/discovered, travels
- [ ] §5 Najran: anything about teaching, students, the professorship

## Photos added (2026-11-05)
- [x] Title-page portrait: `public/photos/rashad-portrait.jpg` (set in `profile.json → photo`)
- [x] Lübeck: `public/photos/lubeck/{institute-of-mathematics,niederegger,winter-arcades,lake}.jpg` (in `chapters.json → lubeck.photos`)
- [ ] Confirm or improve the captions and add years. "Winter in Germany" and "By the lake" are placeholders: where were they taken?

## Co-author constellation (`content/constellation.json`)
- [ ] `students`: which co-authors were his six M.Sc. students (names exactly as written in `papers`). They will glow violet as "newer stars".

## History he loves (`content/history.json`)
- [ ] Optional: if you ever want specific history books on the shelf, set `"confirmed": true` on topics he loves. Until then §6 just states his interest.

## His thoughts on AI (`content/ai.json`)
- [ ] In his own words (or a paraphrase he approved): `{ "text": { "en": "...", "ar": "..." } }`

## Whispers (`content/whispers.json`)
- [ ] Short notes from family, students and colleagues: `{ "from": {en, ar}, "text": {en, ar}, "chapter": "taiz" }`. They're pinned as notes in that chapter's 3D scene and appear around the final curve in §9.

## Hidden messages from the kids (`content/messages.json`)
- [ ] `birthday`: shown after clicking his name on the title page 17 times
- [ ] `final`: shown after finding all 8 coffee cups

## Approvals
- [ ] Every joke in `content/jokes.json`: set `"approved": true` after the family reviews it, or `"enabled": false` to remove it
- [ ] `footer-status` ("Status: Under review (Referee 2: Mom)") is **disabled** until the family approves it
- [ ] `profile.json → dedication` ("A Festschrift in honor of Baba, from his four co-authors."): set `"confirmed": true` to show it
- [ ] Chapter headers (`profile.json → short`: one line + chips) and the body text below them are written not to repeat each other. Check that they still read well together.
- [ ] **Arabic text**: drafted by Claude and revised once (grammar, academic terms; النابي for Annaby confirmed by the family). Please still have a native speaker in the family review it (`content/*.json`, `src/render/page.mjs`, `src/chapters.mjs`). Still to check: the Arabic spelling of Prof. Prestin (بريستين).
- [ ] Call-to-prayer ambience for Taiz: **not added**. Say if you want it.

## Sound & models (optional upgrades)
- [ ] Real recordings to replace the synthesised placeholders in `public/audio/` (same file names, `.ogg` + `.mp3`, under ~200 KB). Log each one in `CREDITS.md`.
- [ ] If the family records his real voice, it can be used (no voice cloning).
