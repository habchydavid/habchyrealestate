import * as P from '../plan.js';
import fs from 'fs';
const walls = P.solveWalls();
const col = { exterior:'#222', party:'#444', interior:'#666', glass:'#2aa', window:'#28c', railing:'#c84', door:'#e22' };
let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${P.BOUNDS.x0} ${P.BOUNDS.y0} ${P.BOUNDS.x1-P.BOUNDS.x0} ${P.BOUNDS.y1-P.BOUNDS.y0}" width="1200" style="background:#fff">`;
for (const r of P.ROOMS) { const [x0,y0,x1,y1]=r.rect; const t = P.APTS[r.apt]?.tone || '#ddd'; s += `<rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="${t}" fill-opacity="${r.type==='balcony'?.25:.45}" stroke="none"/>`; const [cx,cy]=P.center(r.rect); s += `<text x="${cx}" y="${cy}" font-size="28" text-anchor="middle" fill="#000">${r.label||r.type}</text>`; }
for (const w of walls) { const t = w.kind==='door'? 3 : (P.THICK[w.kind]||10); s += `<line x1="${w.x0}" y1="${w.y0}" x2="${w.x1}" y2="${w.y1}" stroke="${col[w.kind]}" stroke-width="${Math.max(t,4)}" stroke-dasharray="${w.kind==='door'?'8 8':''}"/>`; }
s += '</svg>';
fs.writeFileSync('test/plan_debug.svg', s);
const kinds = {}; for (const w of walls) kinds[w.kind]=(kinds[w.kind]||0)+1; console.log(kinds, 'walls', walls.length);
for (const a of ['A','B','C']) console.log(a, 'area', P.aptArea(a).toFixed(1), 'balcony', P.aptBalcony(a).toFixed(1), 'beds', P.aptBeds(a), 'baths', P.aptBaths(a));
