# 3D assets

Every model used on the site. Skip anything with unclear licensing.

| Name | File | Source | Author | License | Edits |
|---|---|---|---|---|---|
| Brass Pot 01 (the jamana / coffee pot) | `public/models/taiz/brass_pot_01.glb` | https://polyhaven.com/a/brass_pot_01 | Poly Haven | CC0 | 1k glTF → textures resized to 512px, WebP, 50% simplify, meshopt (gltf-transform) |
| Standing Picture Frame 01 | `public/models/taiz/standing_picture_frame_01.glb` | https://polyhaven.com/a/standing_picture_frame_01 | Poly Haven | CC0 | same pipeline (reserved for family photos; the procedural frame is used today) |
| School Desk 01 | `public/models/sanaa/SchoolDesk_01.glb` | https://polyhaven.com/a/SchoolDesk_01 | Poly Haven | CC0 | same pipeline |
| Vintage Oil Lamp | `public/models/cairo/vintage_oil_lamp.glb` | https://polyhaven.com/a/vintage_oil_lamp | Poly Haven | CC0 | same pipeline |
| Round Spectacles | `public/models/cairo/round_spectacles.glb` | https://polyhaven.com/a/round_spectacles | Poly Haven | CC0 | same pipeline |
| Wooden Bookshelf (worn) | `public/models/library/wooden_bookshelf_worn.glb` | https://polyhaven.com/a/wooden_bookshelf_worn | Poly Haven | CC0 | same pipeline |
| Holstentor (Lübeck) | `public/models/lubeck/holstentor.glb` | built in Blender by `tools/blender/06_holstentor.py` with Poly Haven textures medieval_red_brick, roof_slates_02 (tinted), white_plaster_02, dark_brick_wall | this site + Rob Tuytel, Dario Barresi & Dimitrios Savva (Poly Haven) | CC0 | 1.2k faces, textures 512 px WebP, meshopt |
| Lübeck gable houses | `public/models/lubeck/lubeck_house.glb` | "Dutch Canals House Amsterdam #1", https://sketchfab.com/3d-models/e81a1b1f7fa54214983fa884fde76b46 | ustoopia | CC-BY | joined, 74k → 9k faces, 512 px WebP, meshopt; instanced ×6 |
| Najran kasbah | `public/models/najran/najran_kasbah.glb` | "Stylized Kasbah – Tier I", https://sketchfab.com/3d-models/aaba649d4bed4b5a9208d47789298192 | Mrigua Mohamed | CC-BY | 498k → 40k faces (photogrammetry tears below ~30k), 512 px WebP |
| Date palm (Najran, Cairo) | `public/models/najran/date_palm.glb` | "Date Palm", https://sketchfab.com/3d-models/11acf710e6c149daa8d6fb8cdc5d087f | evolveduk | CC-BY | 10k → 6k faces; instanced |
| Dhow (Cairo, replaces the felucca) | `public/models/cairo/dhow.glb` | "Low Poly Ancient Dhow Ship", https://sketchfab.com/3d-models/f25b4552dce24d379833160dd217db84 | Nisa Nurul Azizah | CC-BY | 512 px WebP |
| Dallah (Taiz, replaces the brass pot) | `public/models/taiz/dallah.glb` | "Dallah – Arabian Coffee pot", https://sketchfab.com/3d-models/1aa080b38eb142688b14e49dc8701ae0 | CGDELUXE | CC-BY | display base removed, 25k → 4k faces |
| Globe (low-poly, coarse continents) | `src/scene/globe.js` | procedural | this site | CC0 | — |
| Taiz terraces, tower houses, fortress, coffee plant | `src/scene/dioramas.js`, `src/scene/kit.js` | procedural | this site | CC0 | — |
| Old Sana'a facades, chalkboard, bell | `src/scene/dioramas.js` | procedural | this site | CC0 | chalkboard is a live CanvasTexture |
| Nile, felucca, Cairo University dome & clock tower, desk & papers | `src/scene/dioramas.js` | procedural | this site | CC0 | — |
| Holstentor, gabled houses, St. Mary's spires, marzipan loaf, snow | `src/scene/dioramas.js` | procedural | this site | CC0 | — |
| Najran mud-brick towers, palms, lecture hall | `src/scene/dioramas.js` | procedural | this site | CC0 | — |
| Library room, books, globe, radio, newspaper | `src/scene/dioramas.js` | procedural | this site | CC0 | — |
| Writer's corkboard, letters, envelope | `src/scene/dioramas.js` | procedural | this site | CC0 | — |
| Yemeni coffee cups (finjan, hunt) | `src/scene/kit.js` | procedural | this site | CC0 | — |

## Pipeline

```
node tools/polyhaven.mjs <out-dir> <asset_id>...      # downloads the 1k glTF (in your scratch dir)
gltf-transform resize in.gltf a.glb --width 512 --height 512
gltf-transform webp a.glb b.glb && gltf-transform simplify b.glb c.glb --ratio 0.5 --error 0.001
gltf-transform meshopt c.glb public/models/<chapter>/<name>.glb
```

## Upgrades (need tokens or the Blender MCP)

- Sketchfab landmarks (CC0 / CC-BY only): a real Holstentor, feluccas, Yemeni tower houses. Needs a Sketchfab API token.
- Generated props via Blender MCP + Hyper3D Rodin / Hunyuan3D: a dallah/jamana, a marzipan loaf, a Najran mud tower. Needs Blender running with the MCP add-on (and a Hyper3D key for Rodin).

## Upgrade plan: real models for some (not all) low-poly objects

Searched Sketchfab on 2026-11-05 (`node tools/sketchfab-search.mjs "<query>"`). Downloadable models with a licence we can use on a public site:

| Replace | Candidate | Licence | Notes |
|---|---|---|---|
| Najran / Cairo palms | Low Poly Palms Pack (Rusoski), https://sketchfab.com/3d-models/bf1cadd21a704739bc19d535ae741728 | CC-BY | 8k faces for the pack; same low-poly look. Easiest win. |
| Najran palms (alt) | Arabic Palmtree (gelmi.com.br), https://sketchfab.com/3d-models/d76f0654b92d4cf994b528555525219b | CC-BY | 1.8k faces |
| Cairo felucca | Low Poly Ancient Dhow Ship (Nisa Nurul Azizah), https://sketchfab.com/3d-models/f25b4552dce24d379833160dd217db84 | CC-BY | 1.5k faces, lateen sail like a felucca |
| Taiz coffee pot | Dallah – Arabian Coffee pot (CGDELUXE), https://sketchfab.com/3d-models/1aa080b38eb142688b14e49dc8701ae0 | CC-BY | 25k faces → decimate to ~3k |
| Sana'a / Taiz tower houses | Tower House Model (The British Museum), https://sketchfab.com/3d-models/5b166476f4274496a01ccb80747992ae | CC-BY-**NC** | A real Yemeni tower house. NC is acceptable only because this family site is non-commercial; credit the museum. 132k faces → decimate hard and use as the hero house, keep procedural ones around it. |

Nothing usable was found for the **Holstentor**, **Najran mud-brick towers**, **Old Sana'a facades** or the **Cairo University dome** (results were statues, photogrammetry scans with NC/ND licences, or unrelated). For those, the plan is:

1. **Real materials, same geometry (biggest visual jump, zero licence risk):** apply Poly Haven CC0 PBR textures (`red_brick`, `brick_wall`, `plastered_wall`, `sandstone`, `clay_floor`, `mud_cracked`) at 512 px WebP to the procedural buildings, with proper UVs. Brick Holstentor and Lübeck gables, plaster-and-stone Taiz houses, mud plaster for Najran.
2. **Generate the landmarks in Blender** (needs the Blender MCP connected, plus a Hyper3D Rodin key): Holstentor, a Najran *qasr* tower and an Old Sana'a facade from reference photos, then decimate to under 5k faces, unify palette, export meshopt GLB to `public/models/<chapter>/`.
3. Keep procedural: terrain, globe, chalkboard, desks, books, marzipan, cups (they're interactive or already fit the style).

Needed from you to do this: a **Sketchfab API token** (free account → Settings → Password & API) to download, and the **Blender MCP running** (open Blender, BlenderMCP panel → Connect) with an optional **Hyper3D Rodin key**.

### Live Blender pipeline (2026-11-05)
Models are processed in the user's open Blender ("Blender (MCP)" launcher, add-on socket :9876) with `node tools/blender/live.mjs <script.py>`:
`01_lineup.py` import → `02_clean.py` join/scale/decimate → `04_export.py` GLB → gltf-transform resize 512 + webp + meshopt. `look.py` screenshots the viewport.
Hyper3D Rodin's free-trial key is out of credit; generating landmarks needs a paid key.
Still procedural and next in line: the Taiz and Sana'a tower houses (build like the Holstentor with Poly Haven stone/plaster + white gypsum trim), Cairo University dome.
