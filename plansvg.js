// Vector floor plan drawn from plan.js. Returns an SVG string; coordinates are centimetres.
import { ROOMS, APTS, DOORS, BOUNDS, THICK, solveWalls, center, aptBounds } from './plan.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fmt = cm => (cm / 100).toFixed(2).replace(/\.?0+$/, '');

export function planSVG({ apts = ['A', 'B', 'C', 'core'], fit = 'all', labels = true, furniture = true, interactive = false, dims = true, pad = 60, letters = true, cls = '' } = {}) {
  const rooms = ROOMS.filter(r => apts.includes(r.apt));
  const walls = solveWalls().filter(w => w.apts.some(a => apts.includes(a)));
  let vb;
  if (fit === 'all') vb = [BOUNDS.x0, BOUNDS.y0, BOUNDS.x1 - BOUNDS.x0, BOUNDS.y1 - BOUNDS.y0];
  else { const b = aptBounds(fit); vb = [b[0] - pad, b[1] - pad, b[2] - b[0] + 2 * pad, b[3] - b[1] + 2 * pad]; }
  let s = `<svg class="plan ${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" role="img" aria-label="Floor plan">`;
  s += `<defs><pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(90)"><line x1="0" y1="0" x2="0" y2="14" stroke="currentColor" stroke-width="2" opacity=".35"/></pattern></defs>`;
  // floors grouped per apartment
  const byApt = {};
  for (const r of rooms) (byApt[r.apt] ||= []).push(r);
  for (const [apt, rs] of Object.entries(byApt)) {
    const tone = APTS[apt]?.tone || '#8a8378';
    s += `<g class="apt apt-${apt}" data-apt="${apt}" style="--tone:${tone}"${interactive && apt !== 'core' ? ' tabindex="0" role="button"' : ''}>`;
    for (const r of rs) {
      const [x0, y0, x1, y1] = r.rect;
      s += `<rect class="floor ${r.type}" data-room="${r.id}" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"/>`;
      if (r.type === 'balcony') s += `<rect class="hatch" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="url(#hatch)"/>`;
    }
    if (furniture) for (const r of rs) s += fixtures(r);
    if (labels) for (const r of rs) {
      if (!r.label || r.type === 'corridor') continue;
      const [cx, cy] = center(r.rect); const w = r.rect[2] - r.rect[0], h = r.rect[3] - r.rect[1];
      const small = r.type === 'wc' || r.type === 'sdb' || r.type === 'balcony';
      const vertical = h > w * 1.5 && r.type !== 'core';
      const rot = vertical ? ` transform="rotate(-90 ${cx} ${cy})"` : '';
      s += `<g class="lbl${small ? ' small' : ''}"${rot}><text x="${cx}" y="${cy - (dims && !small ? 10 : 0)}" text-anchor="middle">${esc(r.label)}</text>`;
      if (dims && !small && r.type !== 'core') s += `<text class="dim" x="${cx}" y="${cy + 30}" text-anchor="middle">${fmt(w)} × ${fmt(h)}</text>`;
      s += `</g>`;
    }
    if (letters && apt !== 'core') {
      const sal = rs.find(r => r.type === 'salon'); if (sal) { const [cx, cy] = center(sal.rect); s += `<text class="letter" x="${sal.rect[2] - 40}" y="${sal.rect[1] + 95}" text-anchor="end">${apt}</text>`; }
    }
    s += `</g>`;
  }
  // walls
  s += `<g class="walls">`;
  for (const w of walls) {
    const t = THICK[w.kind] ?? 10;
    if (w.kind === 'door') { s += doorArc(w); continue; }
    if (w.kind === 'glass' || w.kind === 'railing') { s += line(w, 'glass', 1) ; s += line(w, 'glassline', 3, 5); continue; }
    s += rectWall(w, t, w.kind);
    if (w.kind === 'window' && w.len > 110) s += line({ ...w, a: w.a + 30, b: w.b - 30, x0: w.horiz ? w.a + 30 : w.c, x1: w.horiz ? w.b - 30 : w.c, y0: w.horiz ? w.c : w.a + 30, y1: w.horiz ? w.c : w.b - 30 }, 'sill', 2);
  }
  s += `</g>`;
  // entrance markers
  for (const apt of apts) if (APTS[apt]) { const [x, y] = APTS[apt].entrance; s += `<g class="entry"><circle cx="${x}" cy="${y}" r="16"/><text x="${x}" y="${y + 6}" text-anchor="middle">${apt}</text></g>`; }
  s += `</svg>`;
  return { svg: s, vb };
}
function rectWall(w, t, kind) {
  if (w.horiz) return `<rect class="w ${kind}" x="${w.a - t / 2}" y="${w.c - t / 2}" width="${w.len + t}" height="${t}"/>`;
  return `<rect class="w ${kind}" x="${w.c - t / 2}" y="${w.a - t / 2}" width="${t}" height="${w.len + t}"/>`;
}
function line(w, cls, sw, off = 0) {
  const o = off ? (w.horiz ? `translate(0 ${off})` : `translate(${off} 0)`) : '';
  return `<line class="${cls}" x1="${w.x0}" y1="${w.y0}" x2="${w.x1}" y2="${w.y1}" stroke-width="${sw}"${o ? ` transform="${o}"` : ''}/>`;
}
function doorArc(w) {
  if (w.base === 'glass' || w.len > 150) {
    // sliding / open: two thin leaves
    return line(w, 'slide', 3);
  }
  // swing into the room that is not a corridor / hall when possible
  const rooms = w.rooms.map(id => ROOMS.find(r => r.id === id));
  const into = rooms.find(r => !['corridor', 'entree', 'core'].includes(r.type)) || rooms[0];
  const len = w.len;
  let hx = w.x0, hy = w.y0; // hinge at the segment start
  let dir; // unit vector into the room
  if (w.horiz) dir = into.rect[1] >= w.c - 1 ? [0, 1] : [0, -1]; else dir = into.rect[0] >= w.c - 1 ? [1, 0] : [-1, 0];
  const ex = w.x1, ey = w.y1; // leaf end on the wall line (closed position)
  const tx = hx + dir[0] * len, ty = hy + dir[1] * len; // leaf end (open position)
  // sweep flag depends on orientation
  const cross = (ex - hx) * (ty - hy) - (ey - hy) * (tx - hx);
  const sweep = cross > 0 ? 1 : 0;
  return `<path class="door" d="M${tx} ${ty} A${len} ${len} 0 0 ${sweep} ${ex} ${ey}"/><line class="leaf" x1="${hx}" y1="${hy}" x2="${tx}" y2="${ty}"/>`;
}
const DIRV = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
function fixtures(r) {
  const [x0, y0, x1, y1] = r.rect; const w = x1 - x0, h = y1 - y0; const [cx, cy] = center(r.rect);
  let s = '';
  const R = (x, y, ww, hh, cls = 'fx') => `<rect class="${cls}" x="${x}" y="${y}" width="${ww}" height="${hh}"/>`;
  if (r.type === 'chambre') {
    // bed 200 long (into room) x 160 wide, headboard on wall r.bed
    const d = DIRV[r.bed || 'W']; const along = [-d[0], -d[1]];
    const L = 200, W = 160, gap = 8;
    // start point on the headboard wall at the room centre of that wall
    let hx = cx, hy = cy;
    if (d[0] !== 0) hx = d[0] < 0 ? x0 + gap : x1 - gap; else hy = d[1] < 0 ? y0 + gap : y1 - gap;
    const bx = d[0] !== 0 ? (d[0] < 0 ? hx : hx - L) : hx - W / 2;
    const by = d[0] !== 0 ? hy - W / 2 : (d[1] < 0 ? hy : hy - L);
    const bw = d[0] !== 0 ? L : W, bh = d[0] !== 0 ? W : L;
    s += R(bx, by, bw, bh, 'fx bed');
    // pillows
    const pw = d[0] !== 0 ? 40 : 60, ph = d[0] !== 0 ? 60 : 40;
    for (let i = 0; i < 2; i++) {
      const px = d[0] !== 0 ? (d[0] < 0 ? bx + 12 : bx + bw - 12 - pw) : bx + 14 + i * (pw + 12);
      const py = d[0] !== 0 ? by + 14 + i * (ph + 12) : (d[1] < 0 ? by + 12 : by + bh - 12 - ph);
      s += R(px, py, pw, ph, 'fx pillow');
    }
    // nightstands
    const ns = 45;
    if (d[0] !== 0) { const nx = d[0] < 0 ? bx : bx + bw - ns; s += R(nx, by - ns - 6, ns, ns) + R(nx, by + bh + 6, ns, ns); }
    else { const ny = d[1] < 0 ? by : by + bh - ns; s += R(bx - ns - 6, ny, ns, ns) + R(bx + bw + 6, ny, ns, ns); }
    if (r.closet) { const c = DIRV[r.closet]; if (c[0] !== 0) s += R(c[0] < 0 ? x0 + 4 : x1 - 64, y0 + 10, 60, h - 20, 'fx closet'); else s += R(x0 + 10, c[1] < 0 ? y0 + 4 : y1 - 64, w - 20, 60, 'fx closet'); }
  } else if (r.type === 'salon') {
    const v = DIRV[r.view || 'E'];
    // sofa 240x90 facing the view, set back from the view wall by ~45% of depth
    const depth = v[0] !== 0 ? w : h;
    const back = 0.62 * depth; // distance from the view wall to the sofa back
    const sx = v[0] !== 0 ? (v[0] > 0 ? x1 - back : x0 + back - 90) : cx - 120;
    const sy = v[0] !== 0 ? cy - 120 + (h > 400 ? 60 : 0) : (v[1] > 0 ? y1 - back : y0 + back - 90);
    s += R(sx, sy, v[0] !== 0 ? 90 : 240, v[0] !== 0 ? 240 : 90, 'fx sofa');
    const tx = v[0] !== 0 ? sx + (v[0] > 0 ? 130 : -90) : sx + 70, ty = v[0] !== 0 ? sy + 70 : sy + (v[1] > 0 ? 130 : -90);
    s += `<circle class="fx table" cx="${tx + 50}" cy="${ty + 50}" r="45"/>`;
    // dining table 180x90 near the opposite end
    const dx = v[0] !== 0 ? (v[0] > 0 ? x0 + 70 : x1 - 250) : cx - 90, dy = v[0] !== 0 ? cy - 45 - (h > 400 ? 120 : 0) : (v[1] > 0 ? y0 + 70 : y1 - 160);
    if ((v[0] !== 0 ? w : h) > 380) { s += R(dx, dy, v[0] !== 0 ? 180 : 180, 90, 'fx dining'); for (let i = 0; i < 3; i++) { s += R(dx + 15 + i * 55, dy - 45, 40, 36) + R(dx + 15 + i * 55, dy + 100, 40, 36); } }
  } else if (r.type === 'cuisine') {
    for (const side of r.counter || []) {
      const d = DIRV[side];
      if (d[0] !== 0) s += R(d[0] < 0 ? x0 + 3 : x1 - 63, y0 + 3, 60, h - 6, 'fx counter'); else s += R(x0 + 3, d[1] < 0 ? y0 + 3 : y1 - 63, w - 6, 60, 'fx counter');
    }
    s += `<circle class="fx sink" cx="${cx}" cy="${cy}" r="0"/>`;
  } else if (r.type === 'sdb') {
    const long = w >= h;
    if (long) { s += R(x0 + 6, y0 + 6, Math.min(170, w - 12), 72, 'fx tub'); s += `<circle class="fx basin" cx="${x1 - 40}" cy="${y1 - 36}" r="22"/>`; s += R(x0 + 14, y1 - 60, 42, 54, 'fx wc'); }
    else { s += R(x0 + 6, y0 + 6, 72, Math.min(170, h - 12), 'fx tub'); s += `<circle class="fx basin" cx="${x1 - 36}" cy="${y1 - 40}" r="22"/>`; s += R(x1 - 60, y0 + 14, 54, 42, 'fx wc'); }
  } else if (r.type === 'wc') {
    s += R(x0 + 10, y0 + 10, 40, 54, 'fx wc'); s += `<circle class="fx basin" cx="${x1 - 32}" cy="${y1 - 30}" r="18"/>`;
  } else if (r.type === 'balcony') {
    const n = Math.max(1, Math.floor(Math.max(w, h) / 160));
    for (let i = 0; i < n; i++) { const px = w >= h ? x0 + 40 + i * 160 : cx - 25, py = w >= h ? cy - 25 : y0 + 40 + i * 160; s += R(px, py, 50, 50, 'fx planter'); }
  } else if (r.type === 'core') {
    s += R(cx - 95, cy - 70, 190, 140, 'fx lift'); s += `<line class="fx liftx" x1="${cx - 95}" y1="${cy - 70}" x2="${cx + 95}" y2="${cy + 70}"/><line class="fx liftx" x1="${cx + 95}" y1="${cy - 70}" x2="${cx - 95}" y2="${cy + 70}"/>`;
    for (let i = 0; i < 9; i++) s += `<line class="fx step" x1="${x0 + 20}" y1="${y1 - 30 - i * 26}" x2="${cx - 110}" y2="${y1 - 30 - i * 26}"/>`;
  }
  return s;
}

export const PLAN_CSS = `
.plan { width: 100%; height: 100%; display: block; font-family: var(--body); color: var(--fg); }
.plan .floor { fill: var(--tone); fill-opacity: .14; transition: fill-opacity .3s; }
.plan .floor.balcony { fill-opacity: .06; }
.plan .floor.core { fill: #8a8378; fill-opacity: .10; }
.plan .hatch { color: var(--tone); pointer-events: none; }
.plan .apt.hot .floor, .plan .apt:hover .floor, .plan .apt:focus-visible .floor { fill-opacity: .42; }
.plan .apt.hot .floor.balcony, .plan .apt:hover .floor.balcony { fill-opacity: .22; }
.plan .apt.dim .floor { fill-opacity: .05; }
.plan.interactive .apt:not(.apt-core) { cursor: pointer; outline: none; }
.plan .w { fill: #e9e1d2; } .plan .w.interior { fill: #cfc6b5; } .plan .w.party { fill: #e9e1d2; }
.plan .glass { stroke: #9fd3df; } .plan .glassline { stroke: #9fd3df; opacity: .55; }
.plan .sill { stroke: #10100e; opacity: .6; }
.plan .door { fill: none; stroke: #d7a862; stroke-width: 2.5; opacity: .8; } .plan .leaf { stroke: #d7a862; stroke-width: 4; opacity: .9; }
.plan .slide { stroke: #d7a862; stroke-dasharray: 10 8; opacity: .8; }
.plan .fx { fill: none; stroke: currentColor; stroke-width: 2.2; opacity: .55; vector-effect: non-scaling-stroke; }
.plan .fx.bed { opacity: .7; } .plan .fx.pillow { fill: currentColor; fill-opacity: .18; }
.plan .fx.sofa, .plan .fx.counter, .plan .fx.closet, .plan .fx.tub { fill: currentColor; fill-opacity: .08; }
.plan .fx.lift { opacity: .5; } .plan .fx.step, .plan .fx.liftx { opacity: .35; }
.plan .lbl text { fill: var(--fg); font-size: 30px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; opacity: .85; }
.plan .lbl.small text { font-size: 22px; opacity: .6; }
.plan .lbl .dim { font-size: 24px; letter-spacing: .02em; text-transform: none; font-weight: 500; opacity: .55; font-variant-numeric: tabular-nums; }
.plan .letter { fill: var(--peach); font-family: var(--display); font-size: 110px; font-style: italic; opacity: .9; }
.plan .entry circle { fill: var(--brass); } .plan .entry text { fill: #16130e; font-size: 20px; font-weight: 700; }
.plan.mini .lbl, .plan.mini .entry, .plan.mini .letter { display: none; }
.plan.mini .fx { opacity: .35; }
.plan .floor.now { fill: var(--peach); fill-opacity: .55; }
.plan.mini .floor { fill-opacity: .10; } .plan.mini .floor.now { fill-opacity: .6; }
.plan.thumb .lbl .dim, .plan.thumb .entry { display: none; }
.plan.thumb .lbl text { font-size: 40px; }
`;
