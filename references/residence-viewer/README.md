# Residence floor — photoreal web build

Open `index.html` from any static web server (not file://).

| File | What it is |
|---|---|
| `residence-floor.glb` | Rebuilt model: PBR materials, 512px WebP texture sets (wood, stone tile, fabric, plaster normal), detail geometry, meshopt-compressed |
| `lightmap.webp` | 2048px baked lighting (47 warm lamps, dusk sky fill, bounce light, contact shadows). Uses the model's second UV set |
| `env_dusk_1k.hdr` | 1K procedural dusk-studio environment, used for reflections only |
| `viewer.js` | Bundled viewer (three.js r187 + N8AO). Source: `src/main.js` |

## Using the model in your own three.js scene
1. Load the GLB with `GLTFLoader` + `MeshoptDecoder`.
2. Load `lightmap.webp`, set `flipY = false`, `colorSpace = SRGBColorSpace`, `channel = 1`, no mipmaps.
3. On every mesh that has a `uv1` attribute: `material.lightMap = lightmap; material.lightMapIntensity = 8`.
4. Keep the sun at direction `(-0.55, 0.62, 0.42)`, intensity 0.55 — the baked bounce light assumes it.
5. Copy the small `ShaderChunk.lights_fragment_maps` patch from `src/main.js`: lightmapped surfaces must not also get diffuse light from the HDRI.

All look settings (exposure, sun, bloom, AO, vignette, floor reflection) are in the `LOOK` object at the top of `src/main.js`.
URL options: `?q=high|low` forces a quality tier, `?tone=agx|aces`, `?norotate`.

## Quality tiers
- **High**: N8AO, light bloom, vignette, glossy floor reflection, 2048 soft PCF sun shadows.
- **Low** (phones / weak GPUs, or automatically if the frame rate drops): no post-processing; the baked lightmap supplies all ambient occlusion and lamp light. 1024 shadows, CSS vignette.

To rebuild `viewer.js`: `npm i three n8ao meshoptimizer esbuild` then
`npx esbuild src/main.js --bundle --format=esm --minify --outfile=viewer.js`
