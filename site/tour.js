// The Unique: real-time apartment tour. Built procedurally so the whole thing ships as code.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ---------------- procedural textures ---------------- */
function canvasTex(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
function noise(ctx, w, h, alpha, n = 2500, size = 2) {
  for (let i = 0; i < n; i++) { ctx.fillStyle = `rgba(${rnd() > .5 ? 255 : 0},${rnd() > .5 ? 255 : 0},${rnd() > .5 ? 255 : 0},${alpha})`; ctx.fillRect(rnd() * w, rnd() * h, size, size); }
}
const TEX = {};
function makeTextures() {
  TEX.wood = canvasTex(1024, 1024, (ctx, w, h) => {
    const rows = 7, ph = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * 400;
      while (x < w) {
        const len = 350 + rnd() * 500;
        const hue = 26 + rnd() * 6, sat = 32 + rnd() * 10, lig = 38 + rnd() * 12;
        ctx.fillStyle = `hsl(${hue} ${sat}% ${lig}%)`; ctx.fillRect(x, r * ph, len, ph);
        // grain
        for (let g = 0; g < 26; g++) {
          ctx.strokeStyle = `hsla(${hue - 4} ${sat}% ${lig - 14 - rnd() * 8}% / ${.12 + rnd() * .2})`; ctx.lineWidth = .6 + rnd() * 1.4;
          ctx.beginPath(); const y0 = r * ph + rnd() * ph; ctx.moveTo(x, y0);
          ctx.bezierCurveTo(x + len * .3, y0 + (rnd() - .5) * 10, x + len * .6, y0 + (rnd() - .5) * 10, x + len, y0 + (rnd() - .5) * 6); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(20,12,6,.55)'; ctx.fillRect(x + len - 2, r * ph, 2, ph);
        x += len;
      }
      ctx.fillStyle = 'rgba(20,12,6,.5)'; ctx.fillRect(0, r * ph, w, 2);
    }
    noise(ctx, w, h, .04, 4000);
  }, { repeat: [3, 3] });
  TEX.stone = canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#d8cfbf'; ctx.fillRect(0, 0, w, h);
    const n = 2, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      ctx.fillStyle = `hsl(${36 + rnd() * 6} ${18 + rnd() * 8}% ${74 + rnd() * 7}%)`; ctx.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
      for (let k = 0; k < 60; k++) { ctx.fillStyle = `hsla(34 20% ${55 + rnd() * 30}% / .25)`; ctx.beginPath(); ctx.ellipse(i * s + rnd() * s, j * s + rnd() * s, 6 + rnd() * 40, 2 + rnd() * 8, rnd() * 3, 0, 7); ctx.fill(); }
    }
    ctx.strokeStyle = 'rgba(90,80,65,.5)'; ctx.lineWidth = 3; for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(w, i * s); ctx.stroke(); }
    noise(ctx, w, h, .05, 5000);
  }, { repeat: [4, 2] });
  TEX.marble = canvasTex(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#efece6'; ctx.fillRect(0, 0, w, h);
    for (let v = 0; v < 14; v++) {
      ctx.strokeStyle = `rgba(120,118,112,${.12 + rnd() * .22})`; ctx.lineWidth = .8 + rnd() * 2.2; ctx.beginPath();
      let x = rnd() * w, y = rnd() * h; ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) { ctx.bezierCurveTo(x + (rnd() - .5) * 300, y + (rnd() - .5) * 200, x + (rnd() - .5) * 300, y + (rnd() - .5) * 200, x += (rnd() - .3) * 260, y += (rnd() - .5) * 160); }
      ctx.stroke();
    }
    ctx.filter = 'blur(1px)'; ctx.drawImage(ctx.canvas, 0, 0); ctx.filter = 'none';
    noise(ctx, w, h, .03, 2500);
  }, { repeat: [1, 1] });
  TEX.basalt = canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#2b2825'; ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 900; k++) { ctx.fillStyle = `hsla(${25 + rnd() * 15} 8% ${12 + rnd() * 18}% / .5)`; ctx.beginPath(); ctx.ellipse(rnd() * w, rnd() * h, 20 + rnd() * 120, 2 + rnd() * 6, 0, 0, 7); ctx.fill(); }
    const rows = 6; for (let r = 1; r < rows; r++) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, r * h / rows, w, 3); }
    for (let r = 0; r < rows; r++) { let x = (r % 2) * 170; while (x < w) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x, r * h / rows, 3, h / rows); x += 340 + rnd() * 120; } }
    noise(ctx, w, h, .06, 7000);
  }, { repeat: [2, 1.5] });
  TEX.plaster = canvasTex(512, 512, (ctx, w, h) => { ctx.fillStyle = '#e9e2d6'; ctx.fillRect(0, 0, w, h); noise(ctx, w, h, .035, 7000, 1); }, { repeat: [4, 4] });
  TEX.rug = canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#9d8d78'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) { ctx.fillStyle = `hsla(34 ${12 + rnd() * 10}% ${48 + rnd() * 14}% / .9)`; ctx.fillRect(0, y, w, 3); }
    for (let x = 0; x < w; x += 6) { ctx.fillStyle = `hsla(30 10% ${40 + rnd() * 12}% / .35)`; ctx.fillRect(x, 0, 2, h); }
    ctx.strokeStyle = 'rgba(70,58,44,.8)'; ctx.lineWidth = 26; ctx.strokeRect(60, 60, w - 120, h - 120);
    ctx.strokeStyle = 'rgba(230,220,200,.6)'; ctx.lineWidth = 6; ctx.strokeRect(120, 120, w - 240, h - 240);
  });
  TEX.fabric = canvasTex(256, 256, (ctx, w, h) => { ctx.fillStyle = '#b9ad98'; ctx.fillRect(0, 0, w, h); noise(ctx, w, h, .08, 5000, 1); }, { repeat: [3, 3] });
  TEX.art = [
    canvasTex(512, 640, (ctx, w, h) => { ctx.fillStyle = '#e8dcc8'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#2a2724'; ctx.beginPath(); ctx.arc(w * .5, h * .42, 150, 0, 7); ctx.fill(); ctx.fillStyle = '#d7a862'; ctx.fillRect(60, h * .7, w - 120, 22); ctx.fillStyle = '#b5553a'; ctx.beginPath(); ctx.arc(w * .68, h * .36, 44, 0, 7); ctx.fill(); }),
    canvasTex(640, 480, (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8aa0b6'); g.addColorStop(.55, '#f1c7a2'); g.addColorStop(.56, '#4d4a46'); g.addColorStop(1, '#2a2724'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }),
  ];
}

/* ---------------- sky ---------------- */
function makeSky() {
  const geo = new THREE.SphereGeometry(400, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#5f7fa6') }, mid: { value: new THREE.Color('#c9c3c4') }, hor: { value: new THREE.Color('#f1c7a2') }, low: { value: new THREE.Color('#6e6a66') } },
    vertexShader: `varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.)).xyz - cameraPosition; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top, mid, hor, low; varying vec3 vP;
      void main(){ float y = normalize(vP).y; vec3 c;
        if (y > 0.) { c = mix(hor, mid, smoothstep(0., .12, y)); c = mix(c, top, smoothstep(.12, .7, y)); }
        else { c = mix(hor, low, smoothstep(0., -.25, y)); }
        gl_FragColor = vec4(c, 1.); }`
  });
  return new THREE.Mesh(geo, mat);
}

/* ---------------- helpers ---------------- */
const M = {};
function makeMaterials() {
  M.wood = new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: .42, metalness: 0, envMapIntensity: .9 });
  M.stone = new THREE.MeshStandardMaterial({ map: TEX.stone, roughness: .8, metalness: 0 });
  M.plaster = new THREE.MeshStandardMaterial({ map: TEX.plaster, roughness: .92, metalness: 0, color: '#f3ede3' });
  M.ceiling = new THREE.MeshStandardMaterial({ color: '#f6f1e8', roughness: .95 });
  M.basalt = new THREE.MeshStandardMaterial({ map: TEX.basalt, roughness: .85, metalness: .05 });
  M.marble = new THREE.MeshStandardMaterial({ map: TEX.marble, roughness: .18, metalness: 0, envMapIntensity: 1.2 });
  M.walnut = new THREE.MeshStandardMaterial({ color: '#4a2f1d', roughness: .45, metalness: 0, envMapIntensity: .8 });
  M.oak = new THREE.MeshStandardMaterial({ color: '#b08a5c', roughness: .55 });
  M.dark = new THREE.MeshStandardMaterial({ color: '#1e1c1a', roughness: .5, metalness: .2 });
  M.brass = new THREE.MeshStandardMaterial({ color: '#c9a062', roughness: .3, metalness: .9 });
  M.frame = new THREE.MeshStandardMaterial({ color: '#2a2724', roughness: .6, metalness: .3 });
  M.fabric = new THREE.MeshStandardMaterial({ map: TEX.fabric, color: '#cfc3ae', roughness: 1 });
  M.fabricDark = new THREE.MeshStandardMaterial({ color: '#5e584f', roughness: 1 });
  M.linen = new THREE.MeshStandardMaterial({ color: '#efe8dc', roughness: 1 });
  M.leaf = new THREE.MeshStandardMaterial({ color: '#4f6b3f', roughness: .9 });
  M.leafLight = new THREE.MeshStandardMaterial({ color: '#7f9a5e', roughness: .9 });
  M.pot = new THREE.MeshStandardMaterial({ color: '#8b7f6c', roughness: .9 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: '#dfeaf0', roughness: .05, metalness: 0, transparent: true, opacity: .14, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
  M.rug = new THREE.MeshStandardMaterial({ map: TEX.rug, roughness: 1 });
  M.bulb = new THREE.MeshStandardMaterial({ color: '#fff2dc', emissive: '#ffd9a0', emissiveIntensity: 4, roughness: 1 });
  M.strip = new THREE.MeshStandardMaterial({ color: '#fff4e2', emissive: '#ffd7a4', emissiveIntensity: 2.6, roughness: 1 });
  M.screen = new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: .15, metalness: .4, envMapIntensity: 1.5 });
  M.ground = new THREE.MeshStandardMaterial({ color: '#6b7a5a', roughness: 1 });
  M.road = new THREE.MeshStandardMaterial({ color: '#4a4845', roughness: .9 });
  M.house = new THREE.MeshStandardMaterial({ color: '#d9cfbd', roughness: .9 });
  M.hill = new THREE.MeshStandardMaterial({ color: '#8f9aa8', roughness: 1, fog: true });
  M.ring = new THREE.MeshBasicMaterial({ color: '#f1c7a2', transparent: true, opacity: .85, side: THREE.DoubleSide, depthWrite: false });
  M.ringCore = new THREE.MeshBasicMaterial({ color: '#f1c7a2', transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false });
}
function box(w, h, d, mat, x = 0, y = 0, z = 0, { shadow = true, radius = 0 } = {}) {
  const g = radius ? new RoundedBoxGeometry(w, h, d, 3, radius) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = shadow; return m;
}
function cyl(r1, r2, h, mat, x = 0, y = 0, z = 0, seg = 20) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }

/* ---------------- apartment ---------------- */
// Plan (metres): x -8..8 (west..east), z -4.5 (back wall) .. 4.5 (glass wall), ceiling 3.0. Balcony z 4.5..6.6.
// West of x=-2 is the main bedroom; east is the open living / dining / kitchen.
function buildApartment(scene) {
  const g = new THREE.Group(); scene.add(g);
  const W = 16, D = 9, H = 3;
  // floor & ceiling
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M.wood); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  TEX.wood.repeat.set(4, 2.2);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M.ceiling); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; g.add(ceil);
  // walls
  g.add(box(W, H, .2, M.plaster, 0, H / 2, -D / 2 - .1));            // back wall
  g.add(box(.2, H, D, M.plaster, -W / 2 - .1, H / 2, 0));            // west wall
  g.add(box(.2, H, D, M.plaster, W / 2 + .1, H / 2, 0));             // east wall
  // feature wall in basalt behind the TV (east living), 5m wide
  g.add(box(5.2, H, .08, M.basalt, 2.2, H / 2, -D / 2 + .04));
  // bedroom partition at x=-2 with a door opening z -1.2..0 (toward the glass side it is open plan via the door only)
  g.add(box(.18, H, 3.3, M.plaster, -2, H / 2, -2.85));              // z -4.5..-1.2
  g.add(box(.18, H, 4.5, M.plaster, -2, H / 2, 2.25));               // z 0..4.5
  g.add(box(.18, .4, 1.2, M.plaster, -2, H - .2, -.6));              // header above door
  g.add(box(.24, 2.6, .06, M.walnut, -2, 1.3, -1.17)); g.add(box(.24, 2.6, .06, M.walnut, -2, 1.3, -.03)); // door jambs
  const door = box(.05, 2.55, 1.1, M.walnut, -2.02 - .5, 1.28, -.6 - .5); door.rotation.y = -1.1; door.position.set(-2.4, 1.28, -1.3); g.add(door); // door ajar
  // cove light strip along the back wall ceiling edge
  g.add(box(W - .4, .04, .05, M.strip, 0, H - .08, -D / 2 + .3, { shadow: false }));
  g.add(box(.05, .04, D - .4, M.strip, -W / 2 + .3, H - .08, 0, { shadow: false }));
  g.add(box(.05, .04, D - .4, M.strip, W / 2 - .3, H - .08, 0, { shadow: false }));
  // ceiling spots
  for (const [x, z] of [[-5, -2], [-5, 2], [0, -2], [0, 2], [3.5, -2.2], [3.5, 1.8], [6.5, -2.2], [6.5, 1.8]]) {
    g.add(cyl(.07, .07, .02, M.bulb, x, H - .01, z, 12));
  }
  // glass wall: slim frames, 8 panels, two of them 'open' (slid) near the living room
  const glassGroup = new THREE.Group(); g.add(glassGroup);
  const panelW = W / 8;
  glassGroup.add(box(W, .12, .12, M.frame, 0, H - .06, D / 2));
  glassGroup.add(box(W, .06, .14, M.frame, 0, .03, D / 2));
  for (let i = 0; i <= 8; i++) glassGroup.add(box(.06, H, .1, M.frame, -W / 2 + i * panelW, H / 2, D / 2));
  for (let i = 0; i < 8; i++) {
    if (i === 4) continue; // the open sliding door panel in front of the living room
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(panelW - .08, H - .2), M.glass); gl.position.set(-W / 2 + (i + .5) * panelW, H / 2, D / 2); glassGroup.add(gl);
  }
  // balcony slab, side walls, glass railing
  const bal = new THREE.Group(); g.add(bal);
  const balFloor = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.1), M.stone); balFloor.rotation.x = -Math.PI / 2; balFloor.position.set(0, .005, D / 2 + 1.05); balFloor.receiveShadow = true; bal.add(balFloor);
  bal.add(box(W + .6, .35, 2.4, M.stone, 0, -.175, D / 2 + 1.05, { shadow: true }));          // slab
  bal.add(box(W + .6, .3, .5, M.stone, 0, 3.15, D / 2 + 1.1));                               // slab above (next floor)
  bal.add(box(.3, H + .4, 2.3, M.stone, -W / 2 - .15, H / 2, D / 2 + 1.15));
  bal.add(box(.3, H + .4, 2.3, M.stone, W / 2 + .15, H / 2, D / 2 + 1.15));
  const rail = new THREE.Mesh(new THREE.PlaneGeometry(W, 1.1), M.glass); rail.position.set(0, .55, D / 2 + 2.08); bal.add(rail);
  bal.add(box(W, .05, .06, M.frame, 0, 1.1, D / 2 + 2.08)); bal.add(box(W, .06, .08, M.frame, 0, .03, D / 2 + 2.08));
  for (let i = 0; i <= 8; i++) bal.add(box(.04, 1.1, .04, M.frame, -W / 2 + i * panelW, .55, D / 2 + 2.08));
  // balcony LED strip under the slab above (the signature light from the facade)
  bal.add(box(W - .4, .04, .05, M.strip, 0, 2.98, D / 2 + 2.0, { shadow: false }));
  // planters & lounge chairs
  for (const x of [-7, -3.4, 5.5, 7.2]) { bal.add(plant(x, D / 2 + 1.6, .9)); }
  bal.add(loungeChair(1.4, D / 2 + 1.2)); bal.add(loungeChair(2.5, D / 2 + 1.2));
  bal.add(cyl(.25, .22, .45, M.walnut, 1.95, .225, D / 2 + 1.75, 16));

  /* living room (x 0..8) */
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.4), M.rug); rug.rotation.x = -Math.PI / 2; rug.position.set(3, .006, 1.2); rug.receiveShadow = true; g.add(rug);
  g.add(sofa(3, 1.3));
  g.add(coffeeTable(3, 1.3));
  // tv wall
  g.add(box(2.6, .45, .5, M.walnut, 2.2, .225, -D / 2 + .35, { radius: .01 }));
  g.add(box(1.9, 1.05, .04, M.screen, 2.2, 1.45, -D / 2 + .14));
  g.add(box(.05, 1.4, .05, M.brass, .3, .7, -D / 2 + .6)); g.add(cyl(.22, .22, .06, M.linen, .3, 1.5, -D / 2 + .6, 24)); // floor lamp
  const lampBulb = cyl(.1, .1, .05, M.bulb, .3, 1.45, -D / 2 + .6, 12); g.add(lampBulb);
  // bookshelf east wall
  const shelf = new THREE.Group(); shelf.position.set(W / 2 - .18, 0, -1.5); g.add(shelf);
  for (let i = 0; i < 5; i++) shelf.add(box(.34, .03, 2.4, M.walnut, 0, .35 + i * .55, 0));
  shelf.add(box(.34, 2.6, .03, M.walnut, 0, 1.3, -1.2)); shelf.add(box(.34, 2.6, .03, M.walnut, 0, 1.3, 1.2));
  for (let i = 0; i < 5; i++) { let z = -1.1; while (z < 1.0) { const h = .18 + rnd() * .22, w = .03 + rnd() * .04; const b = box(.22, h, w, new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(.05 + rnd() * .12, .25 + rnd() * .3, .3 + rnd() * .35), roughness: .8 }), 0, .37 + i * .55 + h / 2, z); shelf.add(b); z += w + .01 + (rnd() < .2 ? .12 : 0); } }
  // art
  const art1 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.25), new THREE.MeshStandardMaterial({ map: TEX.art[0], roughness: .9 })); art1.position.set(6.4, 1.6, -D / 2 + .13); g.add(art1); g.add(box(1.08, 1.33, .04, M.walnut, 6.4, 1.6, -D / 2 + .1));
  g.add(plant(7.2, -3.6, 1.6));

  /* dining (x -1.5..1.5, z -3) */
  g.add(diningSet(-.2, -2.6));
  // pendant over dining
  g.add(pendant(-.2, -2.6, .5));

  /* kitchen along back wall x 4..8 */
  const kit = new THREE.Group(); g.add(kit);
  kit.add(box(3.6, .9, .62, M.dark, 6.2, .45, -D / 2 + .36, { radius: .005 }));     // base cabinets
  kit.add(box(3.64, .04, .66, M.marble, 6.2, .92, -D / 2 + .36));                   // counter
  kit.add(box(3.6, .9, .36, M.oak, 6.2, 2.3, -D / 2 + .23));                        // upper cabinets
  kit.add(box(3.6, .03, .05, M.strip, 6.2, 1.84, -D / 2 + .42, { shadow: false }));  // under-cabinet light
  kit.add(box(3.6, .9, .02, M.marble, 6.2, 1.38, -D / 2 + .07));                    // splashback
  kit.add(box(.5, .7, .55, M.screen, 7.6, .55, -D / 2 + .36));                      // oven door
  kit.add(cyl(.02, .02, .35, M.brass, 5.4, 1.1, -D / 2 + .5, 10));                    // tap
  // island
  kit.add(box(2.4, .9, 1.0, M.basalt, 5.0, .45, -1.4, { radius: .005 }));
  kit.add(box(2.5, .05, 1.1, M.marble, 5.0, .925, -1.4));
  for (const x of [4.3, 5.0, 5.7]) { kit.add(stool(x, -.55)); kit.add(pendant(x, -1.4, .28)); }
  kit.add(cyl(.17, .14, .2, M.pot, 4.3, 1.05, -1.5, 16)); kit.add(sphereCluster(4.3, 1.3, -1.5, .22, 6, M.leafLight));
  kit.add(box(.3, .3, .3, M.linen, 5.9, 1.1, -1.3, { radius: .04 })); // bowl-ish object

  /* bedroom (x -8..-2) */
  const bed = new THREE.Group(); g.add(bed);
  bed.add(box(2.1, .3, 2.2, M.walnut, -5, .15, -2.4, { radius: .01 }));
  bed.add(box(2.0, .28, 2.05, M.linen, -5, .44, -2.4, { radius: .06 }));
  bed.add(box(2.0, .1, 1.1, M.fabricDark, -5, .62, -1.9, { radius: .04 }));   // throw
  bed.add(box(2.4, 1.3, .12, M.fabric, -5, .75, -3.52, { radius: .02 }));     // headboard
  for (const x of [-5.5, -4.5]) bed.add(box(.7, .18, .45, M.linen, x, .68, -3.1, { radius: .07 }));
  for (const x of [-6.45, -3.55]) { bed.add(box(.55, .5, .45, M.walnut, x, .25, -3.1, { radius: .01 })); bed.add(cyl(.02, .02, .3, M.brass, x, .65, -3.1, 8)); bed.add(cyl(.14, .16, .16, M.linen, x, .85, -3.1, 16)); bed.add(cyl(.05, .05, .05, M.bulb, x, .82, -3.1, 8)); }
  const rug2 = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.6), M.rug); rug2.rotation.x = -Math.PI / 2; rug2.position.set(-5, .006, -1.0); rug2.receiveShadow = true; bed.add(rug2);
  bed.add(box(.9, .42, .42, M.fabric, -5, .21, .4, { radius: .08 })); // bench
  bed.add(box(2.6, 2.3, .6, M.oak, -6.7, 1.15, 2.5, { radius: .005 })); bed.add(box(.02, 2.2, 2.5, M.screen, -5.36, 1.15, 2.5)); // wardrobe with mirror front
  const art2 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshStandardMaterial({ map: TEX.art[1], roughness: .9 })); art2.position.set(-7.86, 1.65, -1.0); art2.rotation.y = Math.PI / 2; bed.add(art2);
  bed.add(plant(-2.6, 3.6, 1.4));
  bed.add(pendant(-5, -2.4, .3, 2.2));

  return g;
}
function sofa(x, z) {
  const s = new THREE.Group(); s.position.set(x, 0, z);
  s.add(box(2.9, .25, .95, M.fabric, 0, .3, 0, { radius: .04 }));            // seat base
  s.add(box(2.9, .5, .25, M.fabric, 0, .6, -.45, { radius: .05 }));          // back
  s.add(box(.25, .5, .95, M.fabric, -1.45, .55, 0, { radius: .05 })); s.add(box(.25, .5, .95, M.fabric, 1.45, .55, 0, { radius: .05 }));
  s.add(box(.95, .25, 1.6, M.fabric, 1.9, .3, .7, { radius: .04 }));         // chaise
  s.add(box(.25, .5, 1.6, M.fabric, 2.4, .55, .7, { radius: .05 }));
  for (const cx of [-.9, 0, .9]) s.add(box(.75, .18, .7, M.fabric, cx, .5, .05, { radius: .07 }));
  s.add(box(.45, .45, .14, M.fabricDark, -.6, .62, -.25, { radius: .05 })); s.add(box(.45, .45, .14, M.fabricDark, .8, .62, -.25, { radius: .05 }));
  s.add(box(2.9, .08, .95, M.walnut, 0, .13, 0)); for (const [lx, lz] of [[-1.3, -.35], [1.3, -.35], [-1.3, .35], [1.3, .35]]) s.add(cyl(.02, .02, .12, M.brass, lx, .06, lz, 8));
  s.rotation.y = Math.PI; return s;
}
function coffeeTable(x, z) {
  const t = new THREE.Group(); t.position.set(x, 0, z - 1.25);
  t.add(cyl(.55, .55, .04, M.marble, 0, .4, 0, 40)); t.add(cyl(.12, .16, .38, M.dark, 0, .19, 0, 24));
  t.add(cyl(.3, .3, .04, M.walnut, .9, .32, .2, 32)); t.add(cyl(.02, .02, .3, M.brass, .9, .15, .2, 8));
  t.add(box(.28, .04, .2, M.linen, -.15, .44, .1)); t.add(box(.22, .03, .16, M.fabricDark, -.12, .475, .12));
  t.add(cyl(.08, .06, .12, M.pot, .25, .48, -.15, 12)); t.add(sphereCluster(.25, .62, -.15, .12, 5, M.leafLight));
  return t;
}
function diningSet(x, z) {
  const d = new THREE.Group(); d.position.set(x, 0, z);
  d.add(box(2.2, .05, .95, M.walnut, 0, .74, 0, { radius: .01 }));
  for (const [lx, lz] of [[-1.0, -.4], [1.0, -.4], [-1.0, .4], [1.0, .4]]) d.add(box(.06, .72, .06, M.dark, lx, .36, lz));
  for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
    const c = new THREE.Group(); c.position.set(-.7 + i * .7, 0, side * .65); c.rotation.y = side > 0 ? Math.PI : 0;
    c.add(box(.44, .04, .44, M.fabric, 0, .46, 0, { radius: .02 })); c.add(box(.44, .45, .04, M.oak, 0, .72, -.2, { radius: .01 }));
    for (const [lx, lz] of [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]]) c.add(cyl(.015, .015, .45, M.dark, lx, .22, lz, 8));
    d.add(c);
  }
  d.add(cyl(.12, .1, .28, M.pot, .3, .9, 0, 16)); d.add(sphereCluster(.3, 1.2, 0, .2, 7, M.leaf));
  return d;
}
function pendant(x, z, r, y = 2.1) {
  const p = new THREE.Group(); p.position.set(x, 0, z);
  p.add(cyl(.004, .004, 3 - y, M.dark, 0, (3 + y) / 2, 0, 6));
  const shade = new THREE.Mesh(new THREE.ConeGeometry(r, r * .9, 32, 1, true), M.dark); shade.position.y = y; shade.castShadow = false; p.add(shade);
  const inner = new THREE.Mesh(new THREE.ConeGeometry(r * .97, r * .88, 32, 1, true), M.brass); inner.position.y = y - .005; inner.material = M.brass.clone(); inner.material.side = THREE.BackSide; p.add(inner);
  p.add(cyl(.04, .04, .08, M.bulb, 0, y - r * .25, 0, 10));
  const light = new THREE.PointLight('#ffd3a0', 3.0, 7, 2); light.position.set(0, y - r * .3, 0); p.add(light);
  return p;
}
function stool(x, z) { const s = new THREE.Group(); s.position.set(x, 0, z); s.add(cyl(.18, .18, .05, M.walnut, 0, .68, 0, 20)); s.add(cyl(.02, .02, .66, M.dark, 0, .33, 0, 8)); s.add(cyl(.17, .17, .02, M.dark, 0, .01, 0, 20)); return s; }
function loungeChair(x, z) { const c = new THREE.Group(); c.position.set(x, 0, z); c.add(box(.65, .08, .7, M.fabricDark, 0, .35, 0, { radius: .03 })); c.add(box(.65, .6, .08, M.fabricDark, 0, .65, -.33, { radius: .03 })); c.rotation.y = Math.PI; for (const [lx, lz] of [[-.28, -.28], [.28, -.28], [-.28, .28], [.28, .28]]) c.add(cyl(.015, .015, .32, M.brass, lx, .16, lz, 8)); return c; }
function sphereCluster(x, y, z, r, n, mat) { const g = new THREE.Group(); g.position.set(x, y, z); for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * (.6 + rnd() * .6), 1), mat); m.position.set((rnd() - .5) * r * 1.6, (rnd() - .3) * r * 1.4, (rnd() - .5) * r * 1.6); m.castShadow = true; g.add(m); } return g; }
function plant(x, z, h) { const p = new THREE.Group(); p.position.set(x, 0, z); p.add(cyl(.22, .18, .45, M.pot, 0, .225, 0, 20)); p.add(cyl(.03, .04, h * .55, M.walnut, 0, .45 + h * .27, 0, 8)); p.add(sphereCluster(0, .45 + h * .6, 0, h * .32, 7, M.leaf)); return p; }

/* ---------------- outside ---------------- */
function buildOutside(scene) {
  const o = new THREE.Group(); scene.add(o);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M.ground); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; o.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 7), M.road); road.rotation.x = -Math.PI / 2; road.position.set(0, .02, 14); o.add(road);
  // trees
  for (let i = 0; i < 34; i++) {
    const x = (rnd() - .5) * 90, z = 9 + rnd() * 45; if (Math.abs(z - 14) < 4.5) continue;
    const h = 3 + rnd() * 5; const t = new THREE.Group(); t.position.set(x, 0, z);
    t.add(cyl(.12, .18, h * .45, M.walnut, 0, h * .22, 0, 8));
    if (rnd() < .4) { const c = new THREE.Mesh(new THREE.ConeGeometry(h * .22, h * .9, 10), M.leaf); c.position.y = h * .75; c.castShadow = true; t.add(c); }
    else t.add(sphereCluster(0, h * .65, 0, h * .3, 6, rnd() < .5 ? M.leaf : M.leafLight));
    o.add(t);
  }
  // neighbouring houses (simple blocks)
  for (let i = 0; i < 16; i++) {
    const x = -70 + i * 9 + (rnd() - .5) * 4, z = 26 + rnd() * 30, w = 7 + rnd() * 6, h = 6 + rnd() * 8;
    const hm = box(w, h, w * .8, M.house, x, h / 2, z); hm.castShadow = false; o.add(hm);
    o.add(box(w + .4, .3, w * .8 + .4, M.frame, x, h, z, { shadow: false }));
  }
  // distant hills
  for (let i = 0; i < 9; i++) { const r = 40 + rnd() * 50; const hmesh = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10), M.hill); hmesh.scale.set(1.8, .35, 1); hmesh.position.set(-150 + i * 40, -r * .12, 110 + rnd() * 40); hmesh.castShadow = false; o.add(hmesh); }
  return o;
}

/* ---------------- tour ---------------- */
const ROOMS = {
  living:  { id: 'living',  label: 'Living',  pos: [1.6, 1.6, -1.3], yaw: 0.55,  pitch: -0.03 },
  dining:  { id: 'dining',  label: 'Dining',  pos: [-0.3, 1.6, 0.6], yaw: Math.PI - 0.25, pitch: -0.04 },
  kitchen: { id: 'kitchen', label: 'Kitchen', pos: [5.0, 1.6, 0.6],  yaw: Math.PI, pitch: -0.05 },
  balcony: { id: 'balcony', label: 'Balcony', pos: [0.2, 1.6, 5.4],  yaw: 0.0,   pitch: -0.02 },
  bedroom: { id: 'bedroom', label: 'Bedroom', pos: [-4.0, 1.6, 1.4], yaw: Math.PI + 0.35, pitch: -0.04 },
};
const ORDER = { A: ['living', 'balcony', 'dining', 'kitchen', 'bedroom'], B: ['living', 'kitchen', 'balcony', 'bedroom'], PH: ['living', 'balcony', 'dining', 'kitchen', 'bedroom'] };

export async function createTour(container, { onMove, onInteract } = {}) {
  makeTextures(); makeMaterials();
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setSize(container.clientWidth || innerWidth, container.clientHeight || innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#e9d3c0', 60, 260);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .55;
  scene.add(makeSky());

  const camera = new THREE.PerspectiveCamera(68, 1, .05, 500);
  const sun = new THREE.DirectionalLight('#ffd4a6', 3.2);
  sun.position.set(-18, 7, 34); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = .02;
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 10, bottom: -6, near: 1, far: 80 });
  sun.target.position.set(0, 1, 0); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#c7d3e4', '#5a4a3a', .55); scene.add(hemi);
  const fill = new THREE.PointLight('#ffe2c0', 2.2, 14, 2); fill.position.set(2, 2.6, 0); scene.add(fill);
  const fill2 = new THREE.PointLight('#ffe2c0', 1.6, 12, 2); fill2.position.set(-5, 2.6, -1); scene.add(fill2);

  const apartment = buildApartment(scene);
  const outside = buildOutside(scene);

  // floor rings (waypoints)
  const rings = new Map();
  for (const r of Object.values(ROOMS)) {
    const grp = new THREE.Group(); grp.position.set(r.pos[0], .012, r.pos[2]); grp.rotation.x = -Math.PI / 2;
    const ring = new THREE.Mesh(new THREE.RingGeometry(.22, .27, 48), M.ring); const core = new THREE.Mesh(new THREE.CircleGeometry(.2, 48), M.ringCore);
    grp.add(ring, core); grp.userData.room = r.id; scene.add(grp); rings.set(r.id, grp);
  }

  // camera state
  const cur = { pos: new THREE.Vector3(), yaw: 0, pitch: 0 };
  const target = { pos: new THREE.Vector3(), yaw: 0, pitch: 0 };
  let activeRoom = 'living', moving = 0, unit = null, running = false, raf = 0, t0 = 0;
  const dir = new THREE.Vector3();
  function applyCamera() {
    camera.position.copy(cur.pos);
    dir.set(Math.sin(cur.yaw) * Math.cos(cur.pitch), Math.sin(cur.pitch), Math.cos(cur.yaw) * Math.cos(cur.pitch));
    camera.lookAt(camera.position.clone().add(dir));
  }
  function jumpTo(id) { const r = ROOMS[id]; target.pos.set(...r.pos); target.yaw = r.yaw; target.pitch = r.pitch; cur.pos.copy(target.pos); cur.yaw = r.yaw; cur.pitch = r.pitch; activeRoom = id; updateRings(); applyCamera(); }
  function goTo(id) {
    const r = ROOMS[id]; if (!r) return;
    target.pos.set(...r.pos);
    // turn the short way round
    let dy = r.yaw - cur.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    target.yaw = cur.yaw + dy; target.pitch = r.pitch; moving = 1; activeRoom = id; updateRings(); onMove && onMove(id);
  }
  function updateRings() { for (const [id, g] of rings) g.visible = id !== activeRoom && (!unit || ORDER[unit.id === 'PH' ? 'PH' : unit.id.endsWith('A') ? 'A' : 'B'].includes(id)); }

  // pointer look
  let down = false, moved = 0, lx = 0, ly = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener('pointerdown', e => { down = true; moved = 0; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging'); });
  canvas.addEventListener('pointermove', e => {
    if (!down) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    const k = (e.pointerType === 'touch' ? .0052 : .0038);
    target.yaw -= dx * k; target.pitch = Math.max(-.9, Math.min(.7, target.pitch - dy * k)); cur.yaw = target.yaw; cur.pitch = target.pitch;
    if (moved > 6) onInteract && onInteract();
  });
  canvas.addEventListener('pointerup', e => {
    canvas.classList.remove('dragging'); if (!down) return; down = false;
    if (moved > 8) return;
    const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera); ray.params.Line.threshold = .1;
    const hits = ray.intersectObjects([...rings.values()].filter(g => g.visible), true);
    if (hits.length) { goTo(hits[0].object.parent.userData.room); onInteract && onInteract(); return; }
    // otherwise: tap the floor to walk to the nearest ring in that direction
    const floorHits = ray.intersectObject(apartment, true).filter(h => Math.abs(h.point.y) < .05 && h.point.z < 6.4);
    if (floorHits.length) { const p = floorHits[0].point; let best = null, bd = 1e9; for (const [id, g] of rings) { if (!g.visible) continue; const d = g.position.distanceTo(p); if (d < bd) { bd = d; best = id; } } if (best && bd < 3.2) { goTo(best); onInteract && onInteract(); } }
  });
  canvas.addEventListener('pointercancel', () => { down = false; canvas.classList.remove('dragging'); });
  canvas.addEventListener('wheel', e => { e.preventDefault(); camera.fov = Math.max(48, Math.min(80, camera.fov + e.deltaY * .02)); camera.updateProjectionMatrix(); }, { passive: false });

  function resize() { const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  const clock = new THREE.Clock();
  function frame() {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), .05); t0 += dt;
    if (moving > 0) {
      const k = 1 - Math.exp(-dt * 3.2);
      cur.pos.lerp(target.pos, k); cur.yaw += (target.yaw - cur.yaw) * k; cur.pitch += (target.pitch - cur.pitch) * k;
      if (cur.pos.distanceTo(target.pos) < .01 && Math.abs(target.yaw - cur.yaw) < .002) { moving = 0; cur.pos.copy(target.pos); }
    }
    // gentle breathing so a still frame never feels frozen
    const breathe = Math.sin(t0 * .9) * .0025;
    camera.position.copy(cur.pos); camera.position.y += breathe;
    dir.set(Math.sin(cur.yaw) * Math.cos(cur.pitch), Math.sin(cur.pitch), Math.cos(cur.yaw) * Math.cos(cur.pitch));
    camera.lookAt(camera.position.clone().add(dir));
    for (const g of rings.values()) { g.children[0].scale.setScalar(1 + Math.sin(t0 * 2.2) * .06); }
    renderer.render(scene, camera);
  }

  const api = {
    rooms(u) { const key = u.id === 'PH' ? 'PH' : u.id.endsWith('A') ? 'A' : 'B'; return ORDER[key].map(id => ROOMS[id]); },
    setUnit(u) {
      unit = u;
      // higher floors: the street drops away and the sun sits lower in the glass
      const floorH = 3.3; outside.position.y = -(u.floor * floorH + .35);
      sun.position.set(-18, 5 + u.floor * .8, 34); sun.shadow.camera.updateProjectionMatrix();
      camera.fov = 68; camera.updateProjectionMatrix();
      const first = api.rooms(u)[0].id; jumpTo(first); moving = 0;
      // settle-in: start slightly behind and drift forward to the room's spot
      cur.pos.z -= .35; cur.yaw += .12; moving = 1;
    },
    goTo, start() { if (running) return; running = true; clock.start(); frame(); },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
  return api;
}
