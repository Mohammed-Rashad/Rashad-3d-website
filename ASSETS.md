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
