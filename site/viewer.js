// 360° panorama viewer for the apartment tours. Two spheres crossfade between rooms; pitch is clamped
// because the renders are AI panoramas whose geometry is only approximately spherical.
import * as THREE from 'three';

export function createPanoViewer(container, { onInteract } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(66, 1, .1, 100);
  const loader = new THREE.TextureLoader();
  const geo = new THREE.SphereGeometry(20, 96, 48); geo.scale(-1, 1, 1);
  const mk = () => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); scene.add(m); return m; };
  const A = mk(), B = mk(); let front = A, back = B;
  const cache = new Map();
  const PITCH_MIN = -0.52, PITCH_MAX = 0.40;
  const st = { yaw: 0, pitch: -0.02, vyaw: 0, vpitch: 0, tyaw: 0, tpitch: -0.02, idle: 0, fade: 1, fadeFrom: null };
  let running = false, raf = 0, last = 0, down = false, lx = 0, ly = 0, moved = 0;

  function load(url) {
    if (cache.has(url)) return Promise.resolve(cache.get(url));
    return new Promise((res, rej) => loader.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); cache.set(url, t); res(t); }, undefined, rej));
  }
  async function show(url, { yaw = 0, pitch = -0.02 } = {}) {
    const tex = await load(url);
    [front, back] = [back, front];
    front.material.map = tex; front.material.needsUpdate = true; front.renderOrder = 2; back.renderOrder = 1;
    st.fade = 0; st.fadeFrom = back;
    st.tyaw = st.yaw = yaw; st.tpitch = st.pitch = pitch; st.vyaw = st.vpitch = 0; st.idle = 0;
    return tex;
  }
  function preload(urls) { for (const u of urls) load(u).catch(() => {}); }

  canvas.addEventListener('pointerdown', e => { down = true; moved = 0; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); st.vyaw = st.vpitch = 0; st.idle = 0; });
  canvas.addEventListener('pointermove', e => {
    if (!down) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    const k = (camera.fov / 66) * (e.pointerType === 'touch' ? .0042 : .0032);
    st.tyaw -= dx * k; st.tpitch = clamp(st.tpitch + dy * k); st.yaw = st.tyaw; st.pitch = st.tpitch; st.vyaw = -dx * k; st.vpitch = dy * k; st.idle = 0;
    if (moved > 6 && onInteract) onInteract();
  });
  const up = () => { down = false; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); camera.fov = Math.max(48, Math.min(camera.aspect < 1 ? 92 : 76, camera.fov + e.deltaY * .02)); camera.updateProjectionMatrix(); st.idle = 0; }, { passive: false });
  // pinch zoom
  let pinch = 0; canvas.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch = dist(e.touches); }, { passive: true });
  canvas.addEventListener('touchmove', e => { if (e.touches.length === 2 && pinch) { const d = dist(e.touches); camera.fov = Math.max(48, Math.min(camera.aspect < 1 ? 92 : 76, camera.fov * (pinch / d))); camera.updateProjectionMatrix(); pinch = d; } }, { passive: true });
  function dist(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }
  const clamp = p => Math.max(PITCH_MIN, Math.min(PITCH_MAX, p));

  function resize() { const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = camera.aspect < 1 ? 86 : 66; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  const dir = new THREE.Vector3();
  function frame(t) {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min((t - last) / 1000 || 0, .05); last = t;
    if (!down) {
      // inertia then a slow idle drift so the room never looks frozen
      st.yaw += st.vyaw; st.pitch = clamp(st.pitch + st.vpitch); st.vyaw *= .92; st.vpitch *= .9;
      st.idle += dt; if (st.idle > 2.5) st.yaw += dt * 0.025;
    }
    if (st.fade < 1) { st.fade = Math.min(1, st.fade + dt * 1.6); front.material.opacity = st.fade; if (st.fadeFrom) st.fadeFrom.material.opacity = 1; } else { front.material.opacity = 1; back.material.opacity = 0; }
    dir.set(Math.sin(st.yaw) * Math.cos(st.pitch), Math.sin(st.pitch), Math.cos(st.yaw) * Math.cos(st.pitch));
    camera.lookAt(dir);
    renderer.render(scene, camera);
  }
  return {
    show, preload,
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    pose() { return { yaw: st.yaw, pitch: st.pitch, fov: camera.fov }; },
    resize,
  };
}
