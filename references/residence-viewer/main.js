import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder as WasmMeshopt } from 'three/addons/libs/meshopt_decoder.module.js';
import { MeshoptDecoder as JsMeshopt } from '../node_modules/meshoptimizer/meshopt_decoder_reference.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { N8AOPass } from 'n8ao';
import { Reflector } from 'three/addons/objects/Reflector.js';

// ───────────── settings ─────────────
const ASSETS = { model: 'residence-floor.glb', lightmap: 'lightmap.webp', env: 'env_dusk_1k.hdr' };
const LOOK = {
  exposure: 1.06,
  lightmapIntensity: 8.0,                       // lightmap stores irradiance / 8, sRGB-encoded
  sun: { dir: [-0.55, 0.62, 0.42], color: 0xffcc94, intensity: 0.55 },   // same direction the bounce light was baked with
  envIntensity: 0.75,
  background: 0x07080b,
  bloom: { strength: 0.22, radius: 0.55, threshold: 1.0 },
  ao: { radius: 0.9, falloff: 1.2, intensity: 2.2 },
  vignette: { offset: 0.55, darkness: 0.62 },
  floorReflection: 0.7,                         // glossy stage (high tier only)
};
const q = new URLSearchParams(location.search);
let store = {}; try { store = JSON.parse(localStorage.getItem('residence-viewer') || '{}'); } catch (e) {}
const save = () => { try { localStorage.setItem('residence-viewer', JSON.stringify(store)); } catch (e) {} };

// ───────────── quality tier ─────────────
function detectLowEnd() {
  const ua = navigator.userAgent || '';
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 900);
  const weakCpu = (navigator.hardwareConcurrency || 4) <= 4;
  const weakMem = (navigator.deviceMemory || 8) <= 4;
  let weakGpu = false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const r = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
    weakGpu = /SwiftShader|llvmpipe|Mali-4|Mali-T|Adreno \(TM\) [3-5]|PowerVR|Intel\(R\) HD Graphics [2-5]/i.test(r);
  } catch (e) { return true; }
  return weakGpu || (mobile && (weakCpu || weakMem));
}
let qualityPref = q.get('q') || store.q || 'auto';          // auto | high | low
let tier = qualityPref === 'auto' ? (detectLowEnd() ? 'low' : 'high') : qualityPref;
let toneName = q.get('tone') || store.tone || 'aces';

// ───────────── renderer / scene ─────────────
const stageEl = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMappingExposure = LOOK.exposure;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;                 // soft PCF
stageEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(LOOK.background);
scene.fog = new THREE.Fog(LOOK.background, 38, 95);
scene.environmentIntensity = LOOK.envIntensity;

const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.07;
controls.minDistance = 5; controls.maxDistance = 55; controls.maxPolarAngle = Math.PI * 0.47;
controls.target.set(+(q.get('tx') || 0), +(q.get('ty') || 0.6), +(q.get('tz') || 0.4));
function placeCamera() {
  // frame the whole floor on any aspect ratio (phones in portrait need more distance)
  const aspect = (stageEl.clientWidth || innerWidth) / (stageEl.clientHeight || innerHeight);
  const az = THREE.MathUtils.degToRad(+(q.get('az') || 44)), el = THREE.MathUtils.degToRad(+(q.get('el') || 34));
  const d = +(q.get('d') || 0) || 31 * Math.max(1, 1.45 / aspect);
  controls.maxDistance = Math.max(55, d * 1.3);
  camera.position.set(controls.target.x + d * Math.cos(el) * Math.sin(az), controls.target.y + d * Math.sin(el), controls.target.z + d * Math.cos(el) * Math.cos(az));
}
placeCamera();
const still = q.has('still');
controls.autoRotate = !still && !q.has('norotate'); controls.autoRotateSpeed = 0.35;
const stopRotate = () => { controls.autoRotate = false; };
renderer.domElement.addEventListener('pointerdown', stopRotate); renderer.domElement.addEventListener('wheel', stopRotate, { passive: true });

// Baked lighting already contains the sky/ambient term (with occlusion), so lightmapped
// surfaces must not also receive unoccluded diffuse light from the environment map.
THREE.ShaderChunk.lights_fragment_maps = THREE.ShaderChunk.lights_fragment_maps.replace(
  'iblIrradiance += getIBLIrradiance( geometryNormal );',
  '#ifndef USE_LIGHTMAP\n\t\t\tiblIrradiance += getIBLIrradiance( geometryNormal );\n\t\t\t#endif');

const sun = new THREE.DirectionalLight(LOOK.sun.color, LOOK.sun.intensity);
sun.position.set(...LOOK.sun.dir).multiplyScalar(45); sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 5, far: 90 });
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.035; sun.shadow.radius = 5;
scene.add(sun, sun.target);

// ───────────── glossy stage: planar reflection of the building (high tier only) ─────────────
const STAGE_Y = -0.3; let stageMesh = null;
const mirror = new Reflector(new THREE.PlaneGeometry(1, 1), { textureWidth: 768, textureHeight: 432, multisample: 0 });
mirror.rotation.x = -Math.PI / 2; mirror.position.y = STAGE_Y; mirror.updateMatrixWorld(true);
const mirrorInv = mirror.matrixWorld.clone().invert();
const reflUniforms = { tReflect: { value: mirror.getRenderTarget().texture }, reflMatrix: { value: new THREE.Matrix4() }, reflStrength: { value: 0 }, stageEdge: { value: new THREE.Color(LOOK.background) } };
function updateReflection() {
  if (reflUniforms.reflStrength.value <= 0) return;
  mirror.forceUpdate = true;
  if (stageMesh) stageMesh.visible = false;                  // never sample the reflection while drawing into it
  mirror.onBeforeRender(renderer, scene, camera);
  if (stageMesh) stageMesh.visible = true;
  reflUniforms.reflMatrix.value.copy(mirror.material.uniforms.textureMatrix.value).multiply(mirrorInv);
}
function patchStage(m) {
  m.onBeforeCompile = s => {
    Object.assign(s.uniforms, reflUniforms);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform mat4 reflMatrix; varying vec4 vReflUv; varying vec2 vStageXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvec4 stageW = modelMatrix * vec4(transformed, 1.0); vReflUv = reflMatrix * stageW; vStageXZ = stageW.xz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tReflect; uniform float reflStrength; uniform vec3 stageEdge; varying vec4 vReflUv; varying vec2 vStageXZ;')
      .replace('#include <opaque_fragment>', `
      if (reflStrength > 0.0) {
        vec2 ruv = vReflUv.xy / vReflUv.w; vec3 refl = vec3(0.0);
        // soft, vertically stretched blur: what a satin floor does to a reflection
        float wsum = 0.0;
        for (int i = -5; i <= 5; i++) {
          for (int j = -1; j <= 1; j++) {
            float w = exp(-float(i * i) / 12.0 - float(j * j) / 1.2);
            refl += texture2D(tReflect, ruv + vec2(float(j) * 0.0022, float(i) * 0.0042)).rgb * w; wsum += w;
          }
        }
        refl /= wsum;
        float fres = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 4.0);
        outgoingLight += refl * reflStrength * mix(0.35, 1.0, fres);
      }
      outgoingLight = mix(outgoingLight, stageEdge, smoothstep(17.0, 30.0, length(vStageXZ)));   // the stage dissolves into the backdrop
      #include <opaque_fragment>`);
  };
}

// ───────────── post-processing (high tier only) ─────────────
const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, offset: { value: LOOK.vignette.offset }, darkness: { value: LOOK.vignette.darkness } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float offset; uniform float darkness; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = (vUv - 0.5) * 2.0;
      float v = smoothstep(offset, 1.45, length(d));
      c.rgb *= 1.0 - darkness * v;
      c.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;          // dither: keeps dark gradients free of banding
      gl_FragColor = c;
    }`,
};
let composer = null, aoPass = null, bloomPass = null;
function buildComposer() {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  aoPass = new N8AOPass(scene, camera, size.x, size.y);        // renders the scene, then applies AO
  Object.assign(aoPass.configuration, { aoRadius: LOOK.ao.radius, distanceFalloff: LOOK.ao.falloff, intensity: LOOK.ao.intensity, gammaCorrection: false, halfRes: true, color: new THREE.Color(0x05060a) });
  aoPass.setQualityMode('Medium');
  bloomPass = new UnrealBloomPass(size.clone().multiplyScalar(0.5), LOOK.bloom.strength, LOOK.bloom.radius, LOOK.bloom.threshold);
  composer.addPass(aoPass); composer.addPass(bloomPass); composer.addPass(new OutputPass()); composer.addPass(new ShaderPass(VignetteShader));
}
function disposeComposer() { if (composer) { composer.dispose(); composer = aoPass = bloomPass = null; } }

const TONES = { aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping };
function applyTier() {
  const high = tier === 'high';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, high ? 2 : 1.5));
  renderer.toneMapping = TONES[toneName] || THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = LOOK.exposure * (toneName === 'agx' ? 1.08 : 1.0);
  sun.shadow.mapSize.setScalar(high ? 2048 : 1024);
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  disposeComposer(); if (high) buildComposer();
  reflUniforms.reflStrength.value = high ? LOOK.floorReflection : 0;
  document.body.dataset.tier = tier;                           // low tier gets a free CSS vignette instead of a shader pass
  scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  resize(); updateUi();
}
function resize() {
  const w = stageEl.clientWidth || window.innerWidth, h = stageEl.clientHeight || window.innerHeight;
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
  dirty = true;
}
window.addEventListener('resize', resize);

// ───────────── UI ─────────────
const ui = { q: document.getElementById('btn-q'), tone: document.getElementById('btn-tone'), load: document.getElementById('loading'), bar: document.getElementById('bar') };
function updateUi() {
  ui.q.textContent = 'Quality · ' + (qualityPref === 'auto' ? 'Auto (' + tier + ')' : tier[0].toUpperCase() + tier.slice(1));
  ui.tone.textContent = 'Tone · ' + (toneName === 'agx' ? 'AgX' : 'ACES Filmic');
}
ui.q.addEventListener('click', () => {
  qualityPref = { auto: 'high', high: 'low', low: 'auto' }[qualityPref]; store.q = qualityPref; save();
  tier = qualityPref === 'auto' ? (detectLowEnd() ? 'low' : 'high') : qualityPref; applyTier();
});
ui.tone.addEventListener('click', () => { toneName = toneName === 'aces' ? 'agx' : 'aces'; store.tone = toneName; save(); applyTier(); });

// ───────────── assets ─────────────
// Files are normally fetched by URL. A host that cannot serve .glb/.hdr can instead define
// window.__EMBEDDED = { model: <base64>, env: <base64> } before this script runs.
const EMB = window.__EMBEDDED || null;
let loaded = 0; const step = () => { ui.bar.style.transform = `scaleX(${++loaded / 3})`; };
async function bytes(key) {
  if (EMB && EMB[key]) { const bin = atob(EMB[key]); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  const r = await fetch(ASSETS[key]); if (!r.ok) throw new Error(`${ASSETS[key]}: HTTP ${r.status}`); return r.arrayBuffer();
}
// Mesh decoder: WebAssembly when the page is allowed to run it, otherwise the plain-JS reference decoder.
let meshoptImpl = WasmMeshopt;
const meshoptReady = (WasmMeshopt.supported && !q.has('nowasm') ? WasmMeshopt.ready : Promise.reject()).catch(() => { meshoptImpl = JsMeshopt; });
const meshopt = { supported: true, ready: meshoptReady, decodeGltfBuffer: (...a) => meshoptImpl.decodeGltfBuffer(...a) };
function parseGlb(buffer) {
  return new Promise((resolve, reject) => {
    // In embedded mode decode the GLB's textures through <img> elements rather than fetch(blob:), which strict hosts may block.
    const cib = self.createImageBitmap, viaImg = !!EMB || q.has('imgtex');
    if (viaImg) self.createImageBitmap = undefined;
    try { new GLTFLoader().setMeshoptDecoder(meshopt).parse(buffer, './', resolve, reject); }
    finally { if (viaImg) self.createImageBitmap = cib; }
  });
}
function parseHdr(buffer) {
  const d = new HDRLoader().parse(buffer);
  const t = new THREE.DataTexture(d.data, d.width, d.height, THREE.RGBAFormat, d.type);
  t.colorSpace = THREE.LinearSRGBColorSpace; t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.flipY = true; t.needsUpdate = true;
  return t;
}
let gltf, lightmap, envTex;
try {
  [gltf, lightmap, envTex] = await Promise.all([
    bytes('model').then(parseGlb).then(g => (step(), g)),
    new THREE.TextureLoader().loadAsync(ASSETS.lightmap).then(t => (step(), t)),
    bytes('env').then(parseHdr).then(t => (step(), t)),
  ]);
} catch (err) {
  ui.load.innerHTML = '<p style="max-width:28em;padding:0 24px;text-align:center;opacity:.8">The model could not be loaded (' + String(err && err.message || err).replace(/[<>&]/g, '') + ').</p>';
  throw err;
}
envTex.mapping = THREE.EquirectangularReflectionMapping;
{ const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromEquirectangular(envTex).texture; envTex.dispose(); pmrem.dispose(); }

lightmap.flipY = false; lightmap.colorSpace = THREE.SRGBColorSpace; lightmap.channel = 1;
lightmap.generateMipmaps = false; lightmap.minFilter = lightmap.magFilter = THREE.LinearFilter;
const maxAniso = renderer.capabilities.getMaxAnisotropy();

gltf.scene.traverse(o => {
  if (!o.isMesh) return;
  const m = o.material;
  o.castShadow = true; o.receiveShadow = true;
  m.shadowSide = THREE.DoubleSide;            // walls cast from their lit face too: no light leaking along skirtings
  for (const k of ['map', 'normalMap', 'roughnessMap']) if (m[k]) m[k].anisotropy = Math.min(8, maxAniso);
  if (o.geometry.attributes.uv1) { m.lightMap = lightmap; m.lightMapIntensity = LOOK.lightmapIntensity; }
  if (m.name === 'lamp') { o.castShadow = false; o.receiveShadow = false; }
  if (m.name === 'stage') { o.castShadow = false; stageMesh = o; patchStage(m); }
  if (m.name === 'glass') {
    // glass: keep reflections at full strength while the body stays mostly see-through
    o.castShadow = false; o.receiveShadow = false; o.renderOrder = 2;
    m.transparent = true; m.depthWrite = false; m.envMapIntensity = 1.6;
    m.blending = THREE.CustomBlending; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
    m.onBeforeCompile = s => {
      s.fragmentShader = s.fragmentShader.replace('#include <opaque_fragment>',
        'float glassA = diffuseColor.a; float specL = clamp(dot(totalSpecular, vec3(0.3333)), 0.0, 1.0);\n' +
        'gl_FragColor = vec4(totalDiffuse * glassA + totalSpecular, clamp(glassA + specL * 0.6, 0.0, 1.0));');
    };
  }
});
scene.add(gltf.scene);

// ───────────── loop: render only when something changed ─────────────
let dirty = true, frames = 0, slowFrames = 0, last = performance.now();
controls.addEventListener('change', () => { dirty = true; });
function frame(now) {
  requestAnimationFrame(frame);
  controls.update();
  if (!dirty) { last = now; return; }
  const camDist = camera.position.distanceTo(controls.target);     // fog follows the zoom so only the far stage fades out
  scene.fog.near = camDist + 10; scene.fog.far = camDist + 46;
  dirty = false;
  updateReflection();
  if (composer) composer.render(); else renderer.render(scene, camera);
  // auto-fallback: if the full pipeline cannot hold ~24 fps on this device, drop to the baked-only tier
  const dt = now - last; last = now; frames++;
  if (tier === 'high' && qualityPref === 'auto' && frames > 20 && frames < 200) {
    if (dt > 42) slowFrames++;
    if (slowFrames > 45) { tier = 'low'; applyTier(); }
  }
  if (frames < 4) dirty = true;                               // let shadows / AO settle
  if (frames === 4) { ui.load.classList.add('done'); if (still) ui.load.style.display = 'none'; window.__done = true; }
}
applyTier();
requestAnimationFrame(frame);
