// Free walk through the residence floor model (GLB + baked lightmap + dusk environment).
// Model-agnostic: collisions and floor height are read from the meshes, so a new GLB drops straight in.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const ASSETS = { model: 'residence-floor.glb', lightmap: 'lightmap.webp', env: 'env_dusk_1k.hdr' };
const EYE = 1.6, RADIUS = 0.32, SPEED = 1.9, RUN = 3.4;
const COLLIDERS = new Set(['walls_plaster', 'joinery', 'glazing', 'railings_appliances_lift', 'wall_caps_planters', 'countertops', 'upholstery', 'sanitary', 'frames_fixtures', 'bedding_cushions']);
const FLOORS = new Set(['floors_oak_stairs', 'floors_stone', 'rugs']);

function makeSky() {
  const geo = new THREE.SphereGeometry(300, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#3f5478') }, mid: { value: new THREE.Color('#b9a7b0') }, hor: { value: new THREE.Color('#f1b58f') }, low: { value: new THREE.Color('#3a3634') } },
    vertexShader: `varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.)).xyz - cameraPosition; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top, mid, hor, low; varying vec3 vP; void main(){ float y = normalize(vP).y; vec3 c; if (y > 0.) { c = mix(hor, mid, smoothstep(0., .10, y)); c = mix(c, top, smoothstep(.10, .6, y)); } else { c = mix(hor, low, smoothstep(0., -.2, y)); } gl_FragColor = vec4(c, 1.); }`
  });
  return new THREE.Mesh(geo, mat);
}
function makeOutside(scene, floorY) {
  const g = new THREE.Group(); scene.add(g);
  const drop = 3.3 * 2 + 0.6; // the walkable floor sits two storeys above the street
  const groundY = floorY - drop;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#3b4434', roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = groundY; g.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 7), new THREE.MeshStandardMaterial({ color: '#2b2b2c', roughness: .9 })); road.rotation.x = -Math.PI / 2; road.position.set(0, groundY + .02, 18); g.add(road);
  const leaf = new THREE.MeshStandardMaterial({ color: '#2f4a2b', roughness: 1 }), trunk = new THREE.MeshStandardMaterial({ color: '#3a2a1c', roughness: 1 });
  const house = new THREE.MeshStandardMaterial({ color: '#8d8578', roughness: .9 }), win = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb860', emissiveIntensity: 1.6 });
  let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 60; i++) {
    const a = rnd() * Math.PI * 2, d = 16 + rnd() * 50; const x = Math.cos(a) * d, z = Math.sin(a) * d; const h = 4 + rnd() * 7;
    const t = new THREE.Group(); t.position.set(x, groundY, z);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(.15, .22, h * .45, 6), trunk); tr.position.y = h * .22; t.add(tr);
    const c = new THREE.Mesh(rnd() < .4 ? new THREE.ConeGeometry(h * .2, h * .9, 8) : new THREE.IcosahedronGeometry(h * .32, 1), leaf); c.position.y = h * .68; t.add(c); g.add(t);
  }
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, d = 32 + rnd() * 60; const x = Math.cos(a) * d, z = Math.sin(a) * d; const w = 8 + rnd() * 8, h = 7 + rnd() * 9;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * .8), house); b.position.set(x, groundY + h / 2, z); b.rotation.y = rnd() * 3; g.add(b);
    for (let k = 0; k < 6; k++) { const wn = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .9), win); wn.position.set(x + (rnd() - .5) * w * .8, groundY + 1.5 + rnd() * (h - 2), z + w * .4 + .02); wn.rotation.y = b.rotation.y; wn.position.sub(new THREE.Vector3(x, 0, z)).applyAxisAngle(new THREE.Vector3(0, 1, 0), b.rotation.y).add(new THREE.Vector3(x, 0, z)); g.add(wn); }
  }
  const hill = new THREE.MeshStandardMaterial({ color: '#5a5c6a', roughness: 1 });
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + rnd() * .3, r = 50 + rnd() * 50; const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10), hill); m.scale.set(1.8, .32, 1); m.position.set(Math.cos(a) * 150, groundY - r * .12, Math.sin(a) * 150); g.add(m); }
  return g;
}

export async function createWalk(container, { onProgress, onInteract, onPose } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  // Baked lighting already holds the sky term, so lightmapped surfaces skip the environment's diffuse light.
  if (!THREE.ShaderChunk.lights_fragment_maps.includes('USE_LIGHTMAP_SKIP')) {
    THREE.ShaderChunk.lights_fragment_maps = THREE.ShaderChunk.lights_fragment_maps.replace('iblIrradiance += getIBLIrradiance( geometryNormal );', '/* USE_LIGHTMAP_SKIP */\n#ifndef USE_LIGHTMAP\n\t\t\tiblIrradiance += getIBLIrradiance( geometryNormal );\n\t\t\t#endif');
  }
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#d9b6a6', 45, 230);
  scene.add(makeSky());
  const camera = new THREE.PerspectiveCamera(72, 1, .05, 400);
  const sun = new THREE.DirectionalLight('#ffcc94', .55); sun.position.set(-0.55, 0.62, 0.42).multiplyScalar(45); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 5, far: 90 }); sun.shadow.mapSize.setScalar(1024); sun.shadow.bias = -0.0003; sun.shadow.normalBias = .035;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight('#c9b8c8', '#4a4036', .25));

  let done = 0; const tick = () => { done++; onProgress && onProgress(done / 3); };
  // Hosts that cannot serve .glb/.hdr can define window.__EMBEDDED = { model: <base64>, env: <base64> } before this module runs.
  const EMB = globalThis.__EMBEDDED || null;
  const fromB64 = str => { const bin = atob(str); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  const loadModel = () => EMB && EMB.model
    ? new Promise((res, rej) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(fromB64(EMB.model), './', res, rej))
    : new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(ASSETS.model);
  const loadEnv = async () => {
    if (!(EMB && EMB.env)) return new RGBELoader().loadAsync(ASSETS.env);
    const d = new RGBELoader().parse(fromB64(EMB.env));
    const t = new THREE.DataTexture(d.data, d.width, d.height, THREE.RGBAFormat, d.type); t.colorSpace = THREE.LinearSRGBColorSpace; t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.flipY = true; t.needsUpdate = true; return t;
  };
  const [gltf, lightmap, envTex] = await Promise.all([
    loadModel().then(g => (tick(), g)),
    new THREE.TextureLoader().loadAsync(ASSETS.lightmap).then(t => (tick(), t)),
    loadEnv().then(t => (tick(), t)),
  ]);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromEquirectangular(envTex).texture; scene.environmentIntensity = .75; envTex.dispose(); pmrem.dispose();
  lightmap.flipY = false; lightmap.colorSpace = THREE.SRGBColorSpace; lightmap.channel = 1; lightmap.generateMipmaps = false; lightmap.minFilter = lightmap.magFilter = THREE.LinearFilter;
  const colliders = [], floors = []; let stage = null;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  gltf.scene.traverse(o => {
    if (!o.isMesh) return; const m = o.material;
    o.castShadow = true; o.receiveShadow = true; m.shadowSide = THREE.DoubleSide;
    for (const k of ['map', 'normalMap', 'roughnessMap']) if (m[k]) m[k].anisotropy = Math.min(8, maxAniso);
    if (o.geometry.attributes.uv1) { m.lightMap = lightmap; m.lightMapIntensity = 8; }
    if (m.name === 'lamp') { o.castShadow = false; o.receiveShadow = false; }
    if (m.name === 'stage') { stage = o; o.visible = false; }
    if (m.name === 'glass') { o.castShadow = false; o.receiveShadow = false; o.renderOrder = 2; m.transparent = true; m.depthWrite = false; m.envMapIntensity = 1.6; m.opacity = .18; }
    if (COLLIDERS.has(o.name)) colliders.push(o);
    if (FLOORS.has(o.name)) floors.push(o);
  });
  scene.add(gltf.scene); gltf.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3(); for (const f of floors) bounds.expandByObject(f);
  const floorY = bounds.min.y;
  makeOutside(scene, floorY);
  // The model is a cut-away (no ceilings). Add one plaster ceiling at wall height over the whole footprint,
  // with a soft warm glow so the baked wall lighting and the ceiling read as one room.
  const wallsTop = Math.max(...colliders.filter(c => c.name === 'walls_plaster').map(c => new THREE.Box3().setFromObject(c).max.y), floorY + 2.8);
  const fb = new THREE.Box3(); for (const c of colliders) if (c.name === 'walls_plaster') fb.expandByObject(c);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(fb.max.x - fb.min.x, fb.max.z - fb.min.z), new THREE.MeshStandardMaterial({ color: '#efe8dc', roughness: .96, metalness: 0, emissive: '#e6dccb', emissiveIntensity: .78, side: THREE.DoubleSide }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set((fb.min.x + fb.max.x) / 2, wallsTop - .01, (fb.min.z + fb.max.z) / 2); ceil.receiveShadow = false; scene.add(ceil);
  const fillLight = new THREE.PointLight('#ffe0bf', 18, 60, 1.6); fillLight.position.set(0, wallsTop - .3, 0); scene.add(fillLight);

  // ---- movement state ----
  const pos = new THREE.Vector3(0, floorY + EYE, 0.9); let yaw = Math.PI, pitch = -.04;
  const target = { yaw, pitch }; const keys = new Set(); const joy = { x: 0, y: 0 }; let walkTo = null, running = false, raf = 0, lastT = 0;
  const ray = new THREE.Raycaster(); const tmp = new THREE.Vector3(), dir = new THREE.Vector3();
  function groundAt(x, z) {
    ray.set(tmp.set(x, floorY + 2.4, z), new THREE.Vector3(0, -1, 0)); ray.far = 4;
    const h = ray.intersectObjects(floors, false); return h.length ? h[0].point.y : null;
  }
  function blocked(from, dx, dz) {
    const len = Math.hypot(dx, dz); if (len < 1e-5) return false; dir.set(dx / len, 0, dz / len);
    for (const h of [0.35, 1.05, 1.55]) {
      ray.set(tmp.set(from.x, floorY + h, from.z), dir); ray.far = len + RADIUS;
      if (ray.intersectObjects(colliders, false).length) return true;
    }
    return false;
  }
  function tryMove(dx, dz) {
    // slide along walls by testing each axis separately
    if (!blocked(pos, dx, dz)) { pos.x += dx; pos.z += dz; }
    else { if (!blocked(pos, dx, 0)) pos.x += dx; if (!blocked(pos, 0, dz)) pos.z += dz; }
    const g = groundAt(pos.x, pos.z); if (g !== null) pos.y += ((g + EYE) - pos.y) * .35;
  }
  function teleport(x, z, y2, p2) { const g = groundAt(x, z); pos.set(x, (g ?? floorY) + EYE, z); if (y2 !== undefined) { target.yaw = yaw = y2; } if (p2 !== undefined) { target.pitch = pitch = p2; } walkTo = null; }

  // ---- input ----
  addEventListener('keydown', e => { if (!running) return; keys.add(e.code); if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault(); onInteract && onInteract(); });
  addEventListener('keyup', e => keys.delete(e.code));
  let look = null, moveTouch = null;
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId); onInteract && onInteract();
    const r = canvas.getBoundingClientRect();
    if (e.pointerType === 'touch' && e.clientX - r.left < r.width * .42 && e.clientY - r.top > r.height * .45 && !moveTouch) { moveTouch = { id: e.pointerId, x0: e.clientX, y0: e.clientY }; joy.x = joy.y = 0; return; }
    if (!look) look = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
  });
  canvas.addEventListener('pointermove', e => {
    if (moveTouch && e.pointerId === moveTouch.id) { joy.x = Math.max(-1, Math.min(1, (e.clientX - moveTouch.x0) / 60)); joy.y = Math.max(-1, Math.min(1, (e.clientY - moveTouch.y0) / 60)); return; }
    if (look && e.pointerId === look.id) { const dx = e.clientX - look.x, dy = e.clientY - look.y; look.x = e.clientX; look.y = e.clientY; look.moved += Math.abs(dx) + Math.abs(dy); const k = e.pointerType === 'touch' ? .0045 : .0032; target.yaw -= dx * k; target.pitch = Math.max(-1.1, Math.min(.9, target.pitch - dy * k)); walkTo = null; }
  });
  const up = e => {
    if (moveTouch && e.pointerId === moveTouch.id) { moveTouch = null; joy.x = joy.y = 0; return; }
    if (look && e.pointerId === look.id) {
      if (look.moved < 8) { // tap: walk to that floor point
        const r = canvas.getBoundingClientRect(); const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera); ray.far = 30; const h = ray.intersectObjects(floors, false);
        if (h.length) walkTo = new THREE.Vector3(h[0].point.x, 0, h[0].point.z);
      }
      look = null;
    }
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); camera.fov = Math.max(50, Math.min(85, camera.fov + e.deltaY * .02)); camera.updateProjectionMatrix(); }, { passive: false });

  function resize() { const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = camera.aspect < 1 ? 80 : 72; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  const marker = new THREE.Mesh(new THREE.RingGeometry(.16, .22, 40), new THREE.MeshBasicMaterial({ color: '#f1c7a2', transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false })); marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);

  function frame(t) {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min((t - lastT) / 1000 || 0, .05); lastT = t;
    yaw += (target.yaw - yaw) * Math.min(1, dt * 14); pitch += (target.pitch - pitch) * Math.min(1, dt * 14);
    let f = 0, s = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) s += 1; if (keys.has('KeyA') || keys.has('ArrowLeft')) s -= 1;
    f += -joy.y; s += joy.x;
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : SPEED) * dt;
    if (f || s) { walkTo = null; const n = Math.hypot(f, s); f /= n; s /= n; const fx = Math.sin(yaw), fz = Math.cos(yaw); tryMove((fx * f + fz * s) * sp, (fz * f - fx * s) * sp); }
    if (walkTo) {
      const dx = walkTo.x - pos.x, dz = walkTo.z - pos.z, d = Math.hypot(dx, dz);
      if (d < .15) walkTo = null; else { const st = Math.min(d, RUN * .8 * dt); const bx = pos.x, bz = pos.z; tryMove(dx / d * st, dz / d * st); if (Math.hypot(pos.x - bx, pos.z - bz) < st * .2) walkTo = null; }
      marker.visible = !!walkTo; if (walkTo) { marker.position.set(walkTo.x, (groundAt(walkTo.x, walkTo.z) ?? floorY) + .01, walkTo.z); }
    } else marker.visible = false;
    camera.position.copy(pos); camera.position.y += Math.sin(t * .0022) * .006;
    camera.lookAt(camera.position.x + Math.sin(yaw) * Math.cos(pitch), camera.position.y + Math.sin(pitch), camera.position.z + Math.cos(yaw) * Math.cos(pitch));
    renderer.render(scene, camera);
    onPose && onPose({ x: pos.x, z: pos.z, yaw });
  }
  return {
    teleport, bounds,
    start() { if (running) return; running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); keys.clear(); },
    resize,
  };
}
