# The Unique — real estate site

Cinematic listing site for "The Unique", Sarba. The page opens on the construction film, settles on the finished
building, and lets a visitor touch a floor and apartment to enter its tour.

- `site/` — the static site (open `site/index.html` through any static server; it loads three.js from jsDelivr).
- `site/plan.js` — the typical floor plan traced from the architect's drawing, in centimetres. Single source of truth
  for the vector plan and the 3D geometry.
- `renders/` — generated apartment visuals (Higgsfield). `pano-C-sejour-test.jpg` is the approved 360° test.
- `references/` — the drawing, the film's final frame, and trace/hotspot check images.
- `tools/` — Playwright walkthrough and plan/panorama check scripts.
- `docs/HANDOVER.md` — decisions, current state, and the render plan. Start there.
