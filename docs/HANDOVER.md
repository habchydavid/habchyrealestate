# The Unique — handover

Real estate site for "The Unique", a G+4 residential building in Sarba, Lebanon.
Concept: the page opens on an AI-generated construction film that settles on the finished building; the visitor
touches a floor / apartment on the facade and enters that apartment's tour.

## Decisions taken so far

1. **The quality gap between the AI film and any real-time 3D is handled by not comparing them in one frame.**
   The film ends on a still we control (`site/poster.jpg`, the film's exact last frame), the hotspots sit on that still,
   and the click zooms into the facade and fades to black before the tour appears. Apartment visuals are generated with
   the same kind of model as the film (Higgsfield / GPT Image 2.6) instead of being modelled by hand.
2. **Navigation follows the real plan.** Each typical floor has three apartments (A, B, C) around a stair core.
   `site/plan.js` holds the plan traced from the architect's drawing (`references/floorplan-typical.jpg`), in centimetres,
   one rectangle per room, with doors. `site/plansvg.js` renders it as a vector plan. `tools/plan_debug.mjs` renders a
   check image (`references/plan-trace-check.png`).
3. **Facade hotspots** are polygons in the film's 1280x720 frame (`references/facade-hotspot-check.jpg` shows them).
   Floors on the facade: floor 1 (y 345-455 at the building corner), floor 2 (245-345), floor 3 (135-245), penthouse above.
   Which facade wing corresponds to apartment A, B or C is **not yet confirmed by the client**.
4. **Panorama test passed.** `renders/pano-C-sejour-test.jpg` is a 2048x1024 equirectangular 360° of apartment C's séjour
   (2.75 credits, GPT Image 2.6, quality high, size 2048x1024, references: floor plan + building frame). Walls bow slightly
   and the nadir is warped, so the viewer must clamp pitch to roughly -30°..+25° and use a ~65° field of view.

## State of the files

- `site/index.html` — working hero (film → still → hotspots → zoom transition), sections and the first tour wiring.
  Its hotspots are still the earlier West/East-per-floor model; they need to become floor bands → plan stage → apartment.
- `site/tour.js` — the placeholder procedural three.js apartment. To be replaced by a panorama viewer + stills.
- `site/plan.js`, `site/plansvg.js` — plan data and vector renderer, ready. Not yet wired into `index.html`.
- `tools/walkthrough.js` — Playwright walkthrough with screenshots (expects a static server on 127.0.0.1:8765 serving `site/`
  with three.js vendored at `vendor/three/` when the CDN is unreachable).
- `tools/pano.html`, `tools/pano_check.js` — minimal three.js sphere viewer used to verify panoramas.

## Render plan (Higgsfield, ~68 credits left after the test)

Model `gpt_image_2_6`, quality `high`, references: floor plan media + building frame media (re-upload them in a new
session with `media_upload`; the earlier media ids expire). Palette: pale limestone floor, warm plaster, dark basalt
feature wall, walnut, brass, warm LED cove, dusk sky over Sarba.

- 360° panoramas (size 2048x1024, resolution 2k): salon, master chambre, cuisine for each of A, B, C — 9 renders.
- Cinematic 16:9 stills (resolution 2k): balcony dusk view, second chambre, bathroom for each type — 9 renders.
- Rendered 3D cut-away plan per apartment type, from the drawing as reference — 3 renders.
- Reserve 3 for retries.

Each render prompt should name the apartment letter and the room's real dimensions from `plan.js`, the wall the
windows are on, and the sofa/bed/counter orientation (`view`, `bed`, `counter` fields).

## Site structure to finish

1. Hero: film → settle on still → floor bands → tap a floor.
2. Plan stage: vector plan of that floor (`plansvg.js`), apartments hover/click, cards with area / beds / price.
3. Apartment tour: panorama viewer (three.js sphere, pitch clamped) with room chips, stills with slow drift for
   rooms without panoramas, mini-plan showing the current room, back to plan / back to building.
4. Residences, Building (three frames from the film), Contact (numbers as text with copy buttons).

Listing prices, areas and availability in the page are **example data** until the client confirms the schedule.
Interior areas computed from the trace: A ≈ 67 m², B ≈ 74 m², C ≈ 78 m² (balconies excluded).
