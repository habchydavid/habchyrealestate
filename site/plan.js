// Typical floor of The Unique, traced from the architect's "Plans étages" drawing (scale 1/100).
// Units: centimetres. x grows east, y grows south. Three apartments around a central stair core.
// A room is a rectangle [x0, y0, x1, y1]; the wall solver derives every wall from shared edges.

export const BOUNDS = { x0: 40, y0: 35, x1: 1705, y1: 1865 };

export const APTS = {
  A: { id: 'A', name: 'Apartment A', tone: '#7f7fc4', hue: 'plum',  entrance: [760, 1200] },
  B: { id: 'B', name: 'Apartment B', tone: '#a8a068', hue: 'olive', entrance: [745, 790] },
  C: { id: 'C', name: 'Apartment C', tone: '#5fa3b8', hue: 'teal',  entrance: [820, 1010] },
};

// type: salon | chambre | cuisine | sdb | wc | entree | corridor | balcony | core
export const ROOMS = [
  /* ---- B: olive, north-west ---- */
  { apt: 'B', id: 'B-ch1', type: 'chambre', label: 'Chambre 1', rect: [160, 45, 445, 330], bed: 'W', closet: 'E' },
  { apt: 'B', id: 'B-ch2', type: 'chambre', label: 'Chambre 2', rect: [445, 45, 745, 500], bed: 'W' },
  { apt: 'B', id: 'B-sal', type: 'salon',   label: 'Salon',     rect: [745, 45, 1067, 500], view: 'E' },
  { apt: 'B', id: 'B-cui', type: 'cuisine', label: 'Cuisine',   rect: [815, 500, 1067, 790], counter: ['N', 'S'] },
  { apt: 'B', id: 'B-ent', type: 'entree',  label: 'Entrée',    rect: [370, 500, 815, 790] },
  { apt: 'B', id: 'B-cor', type: 'corridor', label: '',         rect: [370, 330, 445, 500] },
  { apt: 'B', id: 'B-cor2', type: 'corridor', label: '',        rect: [160, 330, 370, 400] },
  { apt: 'B', id: 'B-wc',  type: 'wc',      label: 'WC',        rect: [535, 615, 665, 730], inner: true },
  { apt: 'B', id: 'B-sdb1', type: 'sdb',    label: 'SDB',       rect: [160, 400, 370, 560] },
  { apt: 'B', id: 'B-ch3', type: 'chambre', label: 'Chambre 3', rect: [75, 560, 370, 840], bed: 'W' },
  { apt: 'B', id: 'B-sdb2', type: 'sdb',    label: 'SDB',       rect: [75, 840, 370, 950] },
  { apt: 'B', id: 'B-bal1', type: 'balcony', label: 'Balcon',   rect: [1067, 45, 1387, 375] },
  { apt: 'B', id: 'B-bal2', type: 'balcony', label: 'Balcon',   rect: [50, 330, 160, 560] },
  /* ---- C: teal, east ---- */
  { apt: 'C', id: 'C-sdb1', type: 'sdb',    label: 'SDB',       rect: [1067, 375, 1270, 580] },
  { apt: 'C', id: 'C-ch1', type: 'chambre', label: 'Chambre 1', rect: [1270, 375, 1600, 660], bed: 'N' },
  { apt: 'C', id: 'C-ch2', type: 'chambre', label: 'Chambre 2', rect: [1270, 660, 1600, 1000], bed: 'S' },
  { apt: 'C', id: 'C-cor', type: 'corridor', label: '',         rect: [1067, 580, 1270, 1000] },
  { apt: 'C', id: 'C-sdb2', type: 'sdb',    label: 'SDB',       rect: [1067, 760, 1180, 870], inner: true },
  { apt: 'C', id: 'C-ent', type: 'entree',  label: 'Entrée',    rect: [820, 790, 1067, 1000] },
  { apt: 'C', id: 'C-cui', type: 'cuisine', label: 'Cuisine',   rect: [820, 1000, 1040, 1282], counter: ['W', 'S'] },
  { apt: 'C', id: 'C-sal', type: 'salon',   label: 'Séjour',    rect: [1040, 1000, 1667, 1282], view: 'E' },
  { apt: 'C', id: 'C-sdb3', type: 'sdb',    label: 'SDB',       rect: [1090, 1282, 1240, 1552] },
  { apt: 'C', id: 'C-ch3', type: 'chambre', label: 'Chambre 3', rect: [1240, 1282, 1667, 1552], bed: 'E' },
  { apt: 'C', id: 'C-bal', type: 'balcony', label: 'Balcon',    rect: [1600, 375, 1692, 700] },
  /* ---- A: plum, south-west ---- */
  { apt: 'A', id: 'A-sdb1', type: 'sdb',    label: 'SDB',       rect: [75, 950, 370, 1060] },
  { apt: 'A', id: 'A-ch1', type: 'chambre', label: 'Chambre 1', rect: [75, 1060, 370, 1357], bed: 'W' },
  { apt: 'A', id: 'A-sdb2', type: 'sdb',    label: 'SDB',       rect: [170, 1357, 370, 1517] },
  { apt: 'A', id: 'A-ent', type: 'entree',  label: 'Entrée',    rect: [370, 1200, 820, 1482] },
  { apt: 'A', id: 'A-cor', type: 'corridor', label: '',         rect: [370, 1482, 445, 1517] },
  { apt: 'A', id: 'A-wc',  type: 'wc',      label: 'WC',        rect: [535, 1230, 665, 1350], inner: true },
  { apt: 'A', id: 'A-cui', type: 'cuisine', label: 'Cuisine',   rect: [820, 1282, 1090, 1482], counter: ['N', 'E'] },
  { apt: 'A', id: 'A-ch2', type: 'chambre', label: 'Chambre 2', rect: [170, 1517, 445, 1852], bed: 'W', closet: 'E' },
  { apt: 'A', id: 'A-ch3', type: 'chambre', label: 'Chambre 3', rect: [445, 1482, 745, 1852], bed: 'W' },
  { apt: 'A', id: 'A-sal', type: 'salon',   label: 'Salon',     rect: [745, 1482, 1090, 1852], view: 'E' },
  { apt: 'A', id: 'A-bal1', type: 'balcony', label: 'Balcon',   rect: [50, 1357, 170, 1632] },
  { apt: 'A', id: 'A-bal2', type: 'balcony', label: 'Balcon',   rect: [1090, 1552, 1377, 1852] },
  /* ---- core ---- */
  { apt: 'core', id: 'core', type: 'core', label: 'Ascenseur · Escalier', rect: [370, 790, 820, 1200] },
];

// Door openings: [x, y, width]. The solver clears the wall around the point.
export const DOORS = [
  // B
  [745, 790, 100], [330, 330, 85], [445, 440, 85], [260, 400, 75], [370, 640, 85], [300, 840, 75], [540, 680, 70],
  [780, 500, 70], [815, 680, 200], [940, 500, 250], [410, 500, 70], [120, 560, 80],
  // C
  [820, 1010, 100], [1270, 520, 85], [1270, 830, 85], [1170, 580, 75], [1180, 815, 70], [1160, 1000, 110],
  [1040, 1140, 220], [1290, 1282, 85], [1165, 1282, 75], [1600, 520, 90],
  // A
  [760, 1200, 100], [370, 1290, 85], [220, 1060, 75], [370, 1440, 75], [600, 1350, 70], [820, 1380, 160],
  [960, 1482, 220], [790, 1482, 90], [400, 1517, 85], [600, 1482, 90], [170, 1600, 80], [1090, 1700, 230],
  // B balcony door from salon, C balcony from chambre 1 (listed above), B small balcony from chambre 3
  [1067, 210, 240],
];

export const LIVING = new Set(['salon', 'chambre', 'cuisine', 'entree']);
export const WET = new Set(['sdb', 'wc']);

/* ---------- geometry helpers ---------- */
export function area(r) { return (r[2] - r[0]) * (r[3] - r[1]) / 10000; }
export function center(r) { return [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2]; }
export function roomsOf(apt) { return ROOMS.filter(r => r.apt === apt); }
export function aptArea(apt) { return roomsOf(apt).filter(r => r.type !== 'balcony' && !r.inner).reduce((s, r) => s + area(r.rect), 0); }
export function aptBalcony(apt) { return roomsOf(apt).filter(r => r.type === 'balcony').reduce((s, r) => s + area(r.rect), 0); }
export function aptBeds(apt) { return roomsOf(apt).filter(r => r.type === 'chambre').length; }
export function aptBaths(apt) { return roomsOf(apt).filter(r => r.type === 'sdb' || r.type === 'wc').length; }
export function aptBounds(apt) {
  const rs = roomsOf(apt); return [Math.min(...rs.map(r => r.rect[0])), Math.min(...rs.map(r => r.rect[1])), Math.max(...rs.map(r => r.rect[2])), Math.max(...rs.map(r => r.rect[3]))];
}
export function aptOutline(apt) {
  // union of rectangles as a set of boundary edges (axis-aligned). Returns [[x0,y0,x1,y1],...]
  const edges = [];
  for (const w of solveWalls()) if (w.apts.includes(apt) && (w.kind === 'exterior' || w.kind === 'party' || w.kind === 'railing' || w.kind === 'glass' && w.apts.length === 1)) edges.push(w);
  return edges;
}

/* ---------- wall solver ----------
   Every room edge lies on an axis line. We rasterise each line at 1 cm, note which rooms touch each cell from
   either side, cut the doors out, and run-length encode the result into typed segments. */
let _walls = null;
export function solveWalls() {
  if (_walls) return _walls;
  const byLine = new Map(); // key "v:x" or "h:y" -> array of {a,b,room,side}
  const add = (key, a, b, room, side) => { if (!byLine.has(key)) byLine.set(key, []); byLine.get(key).push({ a: Math.min(a, b), b: Math.max(a, b), room, side }); };
  for (const r of ROOMS) {
    const [x0, y0, x1, y1] = r.rect;
    add('h:' + y0, x0, x1, r, 'S'); add('h:' + y1, x0, x1, r, 'N');  // room lies south of its top edge, north of its bottom edge
    add('v:' + x0, y0, y1, r, 'E'); add('v:' + x1, y0, y1, r, 'W');
  }
  const out = [];
  for (const [key, segs] of byLine) {
    const horiz = key[0] === 'h'; const c = +key.slice(2);
    const lo = Math.min(...segs.map(s => s.a)), hi = Math.max(...segs.map(s => s.b));
    const n = hi - lo; const cells = new Array(n);
    for (let i = 0; i < n; i++) cells[i] = null;
    for (let i = 0; i < n; i++) {
      const p = lo + i + .5; const here = segs.filter(s => p > s.a && p < s.b);
      if (!here.length) continue;
      const sideA = here.filter(s => s.side === (horiz ? 'S' : 'E')).map(s => s.room); // rooms on +side
      const sideB = here.filter(s => s.side === (horiz ? 'N' : 'W')).map(s => s.room); // rooms on -side
      // pick one room per side; inner rooms (wc boxes) override the hall they sit in
      const pick = arr => arr.find(r => r.inner) || arr[0] || null;
      const A = pick(sideA), B = pick(sideB);
      // an inner room's edge that coincides with nothing on the other side still has the hall around it
      cells[i] = classify(A, B);
    }
    // doors
    for (const [dx, dy, w] of DOORS) {
      const onLine = horiz ? Math.abs(dy - c) < 1 : Math.abs(dx - c) < 1; if (!onLine) continue;
      const pos = horiz ? dx : dy;
      for (let i = Math.max(0, Math.round(pos - w / 2 - lo)); i < Math.min(n, Math.round(pos + w / 2 - lo)); i++) {
        if (cells[i] && cells[i].kind !== 'none') cells[i] = { ...cells[i], kind: 'door', base: cells[i].kind };
      }
    }
    // run-length encode
    let i = 0;
    while (i < n) {
      const k = cells[i]; if (!k || k.kind === 'none') { i++; continue; }
      let j = i; while (j < n && cells[j] && cells[j].kind === k.kind && cells[j].sig === k.sig) j++;
      const a = lo + i, b = lo + j;
      out.push({ kind: k.kind, base: k.base, apts: k.apts, horiz, c, a, b, x0: horiz ? a : c, y0: horiz ? c : a, x1: horiz ? b : c, y1: horiz ? c : b, len: b - a, rooms: k.rooms });
      i = j;
    }
  }
  _walls = out; return out;
}
function classify(A, B) {
  const rooms = [A, B].filter(Boolean); const apts = [...new Set(rooms.map(r => r.apt))];
  const sig = rooms.map(r => r.id).sort().join('|');
  const base = { apts, rooms: rooms.map(r => r.id), sig };
  if (rooms.length === 1) {
    const r = rooms[0];
    if (r.type === 'balcony') return { ...base, kind: 'railing' };
    if (r.type === 'core') return { ...base, kind: 'exterior' };
    if (LIVING.has(r.type)) return { ...base, kind: 'window' };
    return { ...base, kind: 'exterior' };
  }
  const [r1, r2] = rooms;
  if (r1 === r2) return { ...base, kind: 'none' };
  const bal = r1.type === 'balcony' ? r1 : r2.type === 'balcony' ? r2 : null;
  const other = bal === r1 ? r2 : r1;
  if (bal) {
    if (other.type === 'balcony') return { ...base, kind: 'none' };
    if (other.apt === bal.apt && (other.type === 'salon' || other.type === 'chambre' || other.type === 'cuisine')) return { ...base, kind: 'glass' };
    return { ...base, kind: 'exterior' };
  }
  if (r1.apt !== r2.apt) return { ...base, kind: 'party' };
  return { ...base, kind: 'interior' };
}
export const THICK = { exterior: 25, party: 22, interior: 12, glass: 6, window: 25, railing: 4, door: 0 };
