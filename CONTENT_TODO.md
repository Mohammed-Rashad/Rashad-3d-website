# Content the family needs to fill

Everything below is optional: the site already looks finished with these empty and gets richer as they fill. Edit the JSON in `content/`, run `npm run dev` to preview, then push (Netlify rebuilds).
Any value equal to `TODO_FROM_FAMILY` (or empty) is hidden on the live site.

## Links (`content/profile.json → links`)
- [ ] `scholar`: his own Google Scholar profile URL (the two Scholar links on the CV belong to his referees, so they are not used)
- [ ] `facebook`: link to his Facebook profile or page, used for "Read his posts" in §6 (only if he's happy with it being public)

## Per-chapter stories & photos (`content/chapters.json`)
For each of `taiz`, `sanaa`, `cairo`, `lubeck`, `najran`, `library`, `writer`, `ai`, `conclusion`:
- [ ] `stories`: short anecdotes `{ "title": {en, ar}, "text": {en, ar} }`
- [ ] `photos`: approved photos only. Put files in `public/photos/` and reference them as `"photos/name.jpg"` with `alt` + `caption` (+ `year`). Taiz photos also flip inside the 3D picture frame.
- [ ] §1 Taiz: childhood, school, old photos
- [ ] §4 Lübeck `germanyLife`: family life in Germany, food missed/discovered, travels
- [ ] §5 Najran: anything about teaching, students, the professorship

## Co-author constellation (`content/constellation.json`)
- [ ] `students`: which co-authors were his six M.Sc. students (names exactly as written in `papers`). They will glow violet as "newer stars".

## History he loves (`content/history.json`)
- [ ] Confirm or replace the four candidate topics (Kingdom of Saba, Ma'rib Dam, Queen Arwa, the Rasulids of Taiz). Set `"confirmed": true` for each one he actually loves. Unconfirmed topics are hidden on the live site (they show with a DRAFT badge in `npm run dev`).

## His posts (`content/posts.json`)
- [ ] Copy in a few posts he's happy to share: `{ "text": "...", "date": "2024-05-01", "lang": "ar", "url": "https://..." }`. Never scraped; empty = "Posts coming soon…" in handwriting.

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
- [ ] **Arabic text**: all Arabic was drafted by Claude. Please have a native speaker in the family review it (`content/*.json` and `src/render/page.mjs`)
- [ ] Call-to-prayer ambience for Taiz: **not added**. Say if you want it.

## Sound & models (optional upgrades)
- [ ] Real recordings to replace the synthesised placeholders in `public/audio/` (same file names, `.ogg` + `.mp3`, under ~200 KB). Log each one in `CREDITS.md`.
- [ ] If the family records his real voice, it can be used (no voice cloning).
