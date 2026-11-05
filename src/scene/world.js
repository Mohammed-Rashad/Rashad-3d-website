// The single WebGL canvas: globe + one diorama per chapter. The camera only moves when the chapter changes.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CHAPTERS, PLACES, chapterPlace } from '../chapters.mjs';
import { buildGlobe, latLonToVec } from './globe.js';
import { BUILDERS } from './dioramas.js';
import { coffeeCup, burst } from './kit.js';

gsap.ticker.lagSmoothing(0); // transitions are time-based: never stall on slow frames
const G = new THREE.Vector3(0, 80, 0); // globe centre, far above the dioramas
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const GLOBE_IDS = ['intro', 'conclusion', 'epilogue'];

// Painted skies: zenith → horizon glow → ground, a sun/moon glow, drifting clouds, twinkling stars.
const SKIES = {
  globe: { top: '#02030f', horizon: '#121a52', bottom: '#04051a', glow: '#8fa4ff', sun: V(-0.4, 0.5, 0.8), stars: 1, clouds: 0, sunSize: 0 },
  taiz: { top: '#3d4f94', horizon: '#b9b7b0', bottom: '#c98a5e', glow: '#ffd59a', sun: V(-0.55, 0.16, -0.82), stars: 0, clouds: 0.55, sunSize: 1, tex: 'taiz', yaw: 0.32 },
  sanaa: { top: '#15153f', horizon: '#a0849a', bottom: '#5e3552', glow: '#ffb08a', sun: V(0.75, 0.05, -0.66), stars: 0.55, clouds: 0.35, sunSize: 0.8, tex: 'sanaa', yaw: 0.27 },
  cairo: { top: '#030d1a', horizon: '#3f6f8a', bottom: '#0a2a30', glow: '#d9f3ff', sun: V(0.45, 0.42, -0.78), stars: 0.9, clouds: 0.18, sunSize: 0.45, tex: 'cairo', yaw: 0.3 },
  lubeck: { top: '#56667e', horizon: '#9a9ea6', bottom: '#9ba6af', glow: '#ffffff', sun: V(-0.4, 0.3, -0.86), stars: 0, clouds: 0.95, sunSize: 0.25, tex: 'lubeck', yaw: 0.3 },
  najran: { top: '#2b2558', horizon: '#d4b48e', bottom: '#c47a3a', glow: '#ffcf7a', sun: V(0.7, 0.08, -0.7), stars: 0.15, clouds: 0.28, sunSize: 1.2, tex: 'najran', yaw: 0.25 },
  library: { top: '#1c130f', horizon: '#3a261a', bottom: '#1a100c', glow: '#ffbf80', sun: V(0, 1, 0), stars: 0, clouds: 0, sunSize: 0 },
  writer: { top: '#1d1713', horizon: '#3a2b21', bottom: '#1a120e', glow: '#ffbf80', sun: V(0, 1, 0), stars: 0, clouds: 0, sunSize: 0 },
  ai: { top: '#01040c', horizon: '#0b3a4c', bottom: '#020a12', glow: '#7fd8e6', sun: V(0, 1, 0), stars: 0.6, clouds: 0, sunSize: 0 },
};
const GLOBE_ENV = { id: 'globe', fog: 0.004, sun: { color: '#fff1d6', intensity: 2.2, dir: V(-6, 4, 8) }, hemi: { sky: '#9fb2ff', ground: '#1a1530', intensity: 0.7 } };

const SKY_VERT = 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const SKY_FRAG = `
uniform vec3 top, horizon, bottom, glow, sunDir; uniform float stars, clouds, sunSize, time;
uniform sampler2D skyA, skyB; uniform float abMix, texAmt, yawA, yawB;
vec2 eq(vec3 d, float yaw){ return vec2(fract(atan(d.z, d.x) / 6.2831853 + 0.5 + yaw), asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5); }
varying vec3 vDir;
float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 col = h > 0.0 ? mix(horizon, top, pow(smoothstep(0.0, 0.8, h), 0.7)) : mix(horizon, bottom, smoothstep(0.0, -0.3, h));
  col += horizon * 0.22 * exp(-abs(h) * 16.0);
  float sd = max(dot(d, normalize(sunDir)), 0.0);
  col += glow * (pow(sd, 1400.0) * 3.0 * step(0.01, sunSize) + pow(sd, 18.0) * 0.45 * sunSize + pow(sd, 3.0) * 0.12 * sunSize);
  if (h > 0.0 && clouds > 0.0) {
    vec2 uv = d.xz / (h + 0.18);
    float c = fbm(vec3(uv * 1.3 + vec2(time * 0.012, 0.0), time * 0.01));
    c = smoothstep(0.52, 0.86, c) * clouds * smoothstep(0.0, 0.22, h);
    vec3 cc = mix(horizon * 1.05 + 0.04, glow, pow(sd, 5.0) * 0.7);
    col = mix(col, cc, c * 0.8);
  }
  if (stars > 0.0 && h > 0.02) {
    vec3 q = d * 280.0; vec3 p = floor(q); float s = hash(p);
    float dotv = smoothstep(0.22, 0.0, length(fract(q) - 0.5)); // round points, not cells
    float tw = 0.55 + 0.45 * sin(time * 1.7 + s * 60.0);
    col += vec3(1.0, 0.96, 0.86) * step(0.9972, s) * dotv * stars * tw * 1.6 * smoothstep(0.02, 0.35, h);
  }
  if (texAmt > 0.001) {
    vec3 ta = texture2D(skyA, eq(d, yawA)).rgb, tb = texture2D(skyB, eq(d, yawB)).rgb;
    col = mix(col, mix(ta, tb, abMix), texAmt);
  }
  col += (hash(vec3(gl_FragCoord.xy, time)) - 0.5) / 180.0; // dither: no banding
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,236,170,1)'); gr.addColorStop(0.25, 'rgba(255,210,120,0.55)'); gr.addColorStop(1, 'rgba(255,200,100,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function createWorld({ canvas, labelsEl, hunt, sfx, emit, data, isRTL, lang }) {
  const isMobile = matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#121a52', 0.004);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);

  // sky dome that follows the camera
  const S0 = SKIES.globe;
  const skyU = { top: { value: new THREE.Color(S0.top) }, horizon: { value: new THREE.Color(S0.horizon) }, bottom: { value: new THREE.Color(S0.bottom) }, glow: { value: new THREE.Color(S0.glow) },
    sunDir: { value: S0.sun.clone() }, stars: { value: S0.stars }, clouds: { value: S0.clouds }, sunSize: { value: S0.sunSize }, time: { value: 0 },
    skyA: { value: null }, skyB: { value: null }, abMix: { value: 0 }, texAmt: { value: 0 }, yawA: { value: 0 }, yawB: { value: 0 } };
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); blank.needsUpdate = true; skyU.skyA.value = skyU.skyB.value = blank;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG }));
  sky.renderOrder = -1; scene.add(sky);

  const hemi = new THREE.HemisphereLight('#9fb2ff', '#1a1530', 0.7); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d6', 2.2); scene.add(sun); scene.add(sun.target);

  // globe
  const globe = buildGlobe(isMobile); globe.group.position.copy(G); scene.add(globe.group);
  const gStars = (() => { const n = 900, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(60 + Math.random() * 40); p.set([v.x + G.x, v.y + G.y, v.z + G.z], i * 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const s = new THREE.Points(g, new THREE.PointsMaterial({ color: '#fff6dc', size: 0.25, fog: false })); scene.add(s); return s; })();

  // post-processing
  let composer = null;
  if (!isMobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.5, 0.86));
    composer.addPass(new OutputPass());
  }

  // loaders
  const gltf = new GLTFLoader(); gltf.setMeshoptDecoder(MeshoptDecoder);
  const glbCache = {};
  const loadGLB = (url) => (glbCache[url] ||= new Promise((res, rej) => gltf.load(url, (g) => res(g.scene), undefined, rej))).then((s) => s.clone(true));

  // photographic skies, loaded per chapter; the same panorama lights PBR models (PMREM)
  const pmrem = new THREE.PMREMGenerator(renderer); const texLoader = new THREE.TextureLoader(); const skyCache = {};
  function loadSky(name) {
    return (skyCache[name] ||= new Promise((res) => texLoader.load(`/skies/${name}${isMobile ? '-1k' : ''}.jpg`, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.mapping = THREE.EquirectangularReflectionMapping;
      res({ tex, env: pmrem.fromEquirectangular(tex).texture });
    }, undefined, () => res(null))));
  }
  scene.environmentIntensity = 0.55;
  let skyToken = 0;
  function setSky(k, d) {
    const token = ++skyToken;
    if (!k.tex) { gsap.to(skyU.texAmt, { value: 0, duration: d }); scene.environment = null; return; }
    loadSky(k.tex).then((s) => {
      if (!s || token !== skyToken) return;
      scene.environment = s.env;
      if (skyU.texAmt.value < 0.01 || d === 0) { skyU.skyA.value = s.tex; skyU.yawA.value = k.yaw || 0; skyU.abMix.value = 0; gsap.to(skyU.texAmt, { value: 1, duration: d }); return; }
      skyU.skyB.value = s.tex; skyU.yawB.value = k.yaw || 0; skyU.abMix.value = 0;
      gsap.to(skyU.texAmt, { value: 1, duration: d });
      gsap.to(skyU.abMix, { value: 1, duration: d, onComplete() { skyU.skyA.value = s.tex; skyU.yawA.value = k.yaw || 0; skyU.abMix.value = 0; } });
    });
  }

  // dioramas (built lazily)
  const built = {}; const building = {};
  const ctxFor = (id) => ({ isMobile, loadGLB, sfx, emit, history: data.history, postsCount: data.postsCount, chapterData: data.chapters?.[id], chalk: data.chalk });
  function ensure(id) {
    if (!BUILDERS[id]) return Promise.resolve(null);
    if (built[id]) return Promise.resolve(built[id]);
    if (SKIES[id]?.tex) loadSky(SKIES[id].tex);
    if (!building[id]) building[id] = BUILDERS[id](ctxFor(id)).then((d) => { d.id = id; d.group.visible = false; d.group.userData.fx = []; scene.add(d.group); built[id] = d; placeCup(d); return d; });
    return building[id];
  }
  // the hidden cups glow softly and steam, and glow brighter the longer you've been looking
  const glowTex = glowTexture();
  function placeCup(d) {
    if (hunt.has(d.id) || !d.cupSpot) return;
    const cup = coffeeCup(1.9); cup.position.copy(d.cupSpot); cup.rotation.y = Math.random() * 6; cup.visible = false; d.group.add(cup); d.cup = cup;
    const enter = d.onEnter; d.onEnter = function () { positionCup(d); return enter.call(d); };
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5, fog: false }));
    halo.scale.setScalar(1.3); halo.position.y = 0.18; cup.add(halo); cup.userData.halo = halo;
    const steam = []; for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffffff', transparent: true, depthWrite: false, opacity: 0, fog: false })); s.scale.setScalar(0.12); cup.add(s); steam.push({ s, ph: i / 3 }); }
    cup.userData.steam = steam;
  }
  // where, inside the free part of the screen (0..1, 0..1), each chapter tucks its cup
  const CUP_PX = innerWidth < 760 ? 20 : 22; // target on-screen height of a hidden cup, in CSS px
  const CUP_AT = { taiz: [0.78, 0.7], sanaa: [0.2, 0.8], cairo: [0.8, 0.72], lubeck: [0.22, 0.8], najran: [0.82, 0.78], library: [0.8, 0.62], writer: [0.22, 0.66], ai: [0.62, 0.9] };
  function positionCup(d) {
    const cup = d.cup; if (!cup) return;
    const free = data.freeRect ? data.freeRect(d.id) : { x0: innerWidth * 0.5, y0: 80, x1: innerWidth - 10, y1: innerHeight - 100 };
    // evaluate with the chapter's final camera pose
    const saved = { p: cam.pos.clone(), t: cam.target.clone(), sx: shift.x, sy: shift.y };
    cam.pos.copy(d.cam.pos); cam.target.copy(d.cam.target); const s = layoutShift(d.id); shift.x = s.x; shift.y = s.y; applyCamera();
    const r = new THREE.Raycaster(); r.camera = camera; const nd = new THREE.Vector2(); const nrm = new THREE.Vector3(); const clr = new THREE.Raycaster();
    const [u0, v0] = CUP_AT[d.id] || [0.75, 0.7]; let placed = false;
    const meshes = []; d.group.traverse((o) => { if (o.isMesh && !within(o, cup)) meshes.push(o); });
    outer: for (let ring = 0; ring <= 9; ring++) for (let k = 0; k < Math.max(1, ring * 8); k++) {
      const a = (k / Math.max(1, ring * 8)) * Math.PI * 2; const u = u0 + Math.cos(a) * ring * 0.05, v = v0 + Math.sin(a) * ring * 0.05;
      if (u < 0.04 || u > 0.96 || v < 0.04 || v > 0.96) continue;
      const px = free.x0 + u * (free.x1 - free.x0), py = free.y0 + v * (free.y1 - free.y0);
      nd.set((px / innerWidth) * 2 - 1, -(py / innerHeight) * 2 + 1); r.setFromCamera(nd, camera);
      const h = r.intersectObjects(meshes, false)[0]; if (!h || !h.face || h.distance > 45 || h.object.userData.noCup) continue;
      nrm.copy(h.face.normal).transformDirection(h.object.matrixWorld);
      if (nrm.y < 0.6) continue; // only on floors, roofs, tables, shelves
      // the cup should look about the same small size everywhere: scale it by its distance from the camera
      const dist = camera.position.distanceTo(h.point);
      const worldH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * (CUP_PX / innerHeight);
      const sc = THREE.MathUtils.clamp(worldH / 0.18, 0.45, innerWidth < 760 ? 2.2 : 1.05), rad = 0.17 * sc + 0.04, top = 0.2 * sc + 0.05;
      // clearance: nothing within the cup's radius around it, nothing just above it (no cups cutting into walls)
      const base = h.point.clone().add(new THREE.Vector3(0, 0.05 * sc, 0)); let blocked = false;
      for (let a = 0; a < 8 && !blocked; a++) { clr.set(base, new THREE.Vector3(Math.cos(a * Math.PI / 4), 0, Math.sin(a * Math.PI / 4))); clr.far = rad; blocked = clr.intersectObjects(meshes, false).length > 0; }
      if (!blocked) { clr.set(base, new THREE.Vector3(0, 1, 0)); clr.far = top + 0.3; blocked = clr.intersectObjects(meshes, false).length > 0; }
      if (!blocked) { // the top of the cup must be visible too (not tucked behind a board or a wall)
        const topP = h.point.clone().add(new THREE.Vector3(0, 0.19 * sc, 0)); const dir = topP.clone().sub(camera.position); const dTop = dir.length();
        clr.set(camera.position, dir.normalize()); clr.far = dTop - 0.05; blocked = clr.intersectObjects(meshes, false).length > 0;
      }
      if (blocked) continue;
      cup.userData.size = sc;
      cup.position.copy(d.group.worldToLocal(h.point.clone())); placed = true; break outer;
    }
    cam.pos.copy(saved.p); cam.target.copy(saved.t); shift.x = saved.sx; shift.y = saved.sy;
    const sc = cup.userData.size || 1.2; cup.visible = true; cup.scale.setScalar(0.01); gsap.to(cup.scale, { x: sc, y: sc, z: sc, duration: 0.6, ease: 'back.out' });
    if (!placed) cup.position.copy(d.cupSpot);
  }
  let chapterTime = 0;
  function updateCup(cup, t, dt) {
    cup.rotation.y += dt * 0.4;
    const boost = Math.min(1, Math.max(0, (chapterTime - 10) / 12)); // after ~10 s, help a little more
    cup.userData.halo.material.opacity = (0.35 + 0.5 * boost) * (0.75 + 0.25 * Math.sin(t * 3));
    cup.userData.halo.scale.setScalar(1.1 + boost * 0.9);
    for (const st of cup.userData.steam) { const p = (t * 0.45 + st.ph) % 1; st.s.position.set(Math.sin(p * 9 + st.ph * 6) * 0.04, 0.22 + p * 0.45, 0); st.s.material.opacity = Math.sin(p * Math.PI) * 0.5; st.s.scale.setScalar(0.08 + p * 0.16); }
  }

  // ------- camera state & transitions -------
  const cam = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  const shift = { x: 0, y: 0 };
  let active = null; // diorama currently shown
  let current = null; let tl = null; let tls = []; let atGlobe = true;
  const sunDir = new THREE.Vector3(-6, 4, 8);
  const spin = { x: 0, y: 0, vx: 0, vy: 0, idle: 0 }; // epilogue: the visitor turns the globe (the camera stays put)

  function globePose(place, dist = 12.5) {
    let dir;
    if (place === 'all') dir = latLonToVec(34, 28, 1).normalize();
    else { const ch = CHAPTERS.find((c) => c.id === place); dir = latLonToVec(ch.place.lat - 6, ch.place.lon, 1).normalize(); }
    return { pos: G.clone().add(dir.multiplyScalar(dist)), target: G.clone() };
  }
  const tweenColor = (c, hex, d, t) => { const to = new THREE.Color(hex); t.to(c, { r: to.r, g: to.g, b: to.b, duration: d, ease: 'sine.inOut' }, '<'); };
  const skyOf = (env) => SKIES[env.id] || { ...SKIES.globe, top: env.sky?.top || SKIES.globe.top, horizon: env.sky?.bottom || SKIES.globe.horizon };
  function tweenEnv(env, t, d = 0.9) {
    const k = skyOf(env);
    for (const c of ['top', 'horizon', 'bottom', 'glow']) tweenColor(skyU[c].value, k[c], d, t);
    t.to(skyU.sunDir.value, { x: k.sun.x, y: k.sun.y, z: k.sun.z, duration: d }, '<');
    t.to(skyU.stars, { value: k.stars, duration: d }, '<'); t.to(skyU.clouds, { value: k.clouds, duration: d }, '<'); t.to(skyU.sunSize, { value: k.sunSize, duration: d }, '<');
    tweenColor(scene.fog.color, k.horizon, d, t); t.to(scene.fog, { density: env.fog, duration: d }, '<');
    t.add(() => setSky(k, d), '<');
    tweenColor(sun.color, env.sun.color, d, t); t.to(sun, { intensity: env.sun.intensity, duration: d }, '<');
    t.to(sunDir, { x: env.sun.dir.x, y: env.sun.dir.y, z: env.sun.dir.z, duration: d }, '<');
    tweenColor(hemi.color, env.hemi.sky, d, t); tweenColor(hemi.groundColor, env.hemi.ground, d, t); t.to(hemi, { intensity: env.hemi.intensity, duration: d }, '<');
  }
  function applyEnvNow(env) {
    const k = skyOf(env);
    for (const c of ['top', 'horizon', 'bottom', 'glow']) skyU[c].value.set(k[c]);
    skyU.sunDir.value.copy(k.sun); skyU.stars.value = k.stars; skyU.clouds.value = k.clouds; skyU.sunSize.value = k.sunSize;
    scene.fog.color.set(k.horizon); scene.fog.density = env.fog; setSky(k, 0);
    sun.color.set(env.sun.color); sun.intensity = env.sun.intensity; sunDir.copy(env.sun.dir); hemi.color.set(env.hemi.sky); hemi.groundColor.set(env.hemi.ground); hemi.intensity = env.hemi.intensity;
  }
  function arcsFor(chId) {
    const idx = chId === 'intro' ? 0 : GLOBE_IDS.includes(chId) ? PLACES.length - 1 : Math.max(0, PLACES.indexOf(chapterPlace(chId)));
    const ci = CHAPTERS.findIndex((c) => c.id === chId);
    return { upto: ci > 5 ? PLACES.length - 1 : idx };
  }
  function setArcsInstant(upto) { globe.arcs.forEach((a, i) => globe.setArc(a, i < upto ? 1 : 0)); }
  function layoutShift(chId) {
    const mobile = innerWidth < 760;
    if (chId === 'epilogue') return { x: 0, y: mobile ? -0.2 : -0.14 };
    const centered = chId === 'intro' || chId === 'ai' || chId === 'conclusion';
    if (mobile) return { x: 0, y: centered ? 0 : -0.2 };
    return { x: centered ? 0 : isRTL() ? -0.2 : 0.2, y: 0 };
  }
  function show(d) {
    if (active && active !== d) active.group.visible = false;
    active = d; if (d) { d.group.visible = true; }
    globe.group.visible = !d; gStars.visible = !d;
  }
  const placeOf = (id) => (id === 'conclusion' || id === 'epilogue' ? 'all' : chapterPlace(id));

  async function go(id) {
    if (id === current) return;
    const from = current; current = id; chapterTime = 0;
    if (id !== 'epilogue') { gsap.to(spin, { x: 0, y: 0, duration: 0.9, ease: 'sine.inOut' }); spin.vx = spin.vy = 0; }
    const fromPlace = from ? placeOf(from) : null;
    const toGlobe = GLOBE_IDS.includes(id);
    const toPlace = placeOf(id);
    const nextIdx = CHAPTERS.findIndex((c) => c.id === id);
    [CHAPTERS[nextIdx + 1], CHAPTERS[nextIdx - 1]].forEach((c) => c && ensure(c.id)); // prefetch neighbours
    const dPromise = toGlobe ? Promise.resolve(null) : ensure(id);
    tls.forEach((x) => x.kill()); tl = gsap.timeline(); tls = [tl];
    const later = (at) => { const t2 = gsap.timeline({ delay: Math.max(0, at - tl.time()) }); tls.push(t2); return t2; };
    const s = layoutShift(id); tl.to(shift, { x: s.x, y: s.y, duration: 1.2, ease: 'sine.inOut' }, 0);
    const { upto } = arcsFor(id);
    const globeDist = id === 'epilogue' ? 17 : id === 'conclusion' ? 15.5 : 12.5;

    if (!from) { // first paint
      const d = await dPromise; show(d);
      const pose = d ? d.cam : globePose(toPlace, globeDist);
      cam.pos.copy(pose.pos); cam.target.copy(pose.target); applyEnvNow(d ? d : GLOBE_ENV); setArcsInstant(upto); atGlobe = !d; if (d) d.onEnter(); return;
    }
    const samePlace = fromPlace === toPlace && !toGlobe && !GLOBE_IDS.includes(from);
    if (samePlace) {
      const back = cam.pos.clone().sub(cam.target).multiplyScalar(1.6).add(cam.target);
      tl.to(cam.pos, { x: back.x, y: back.y + 2, z: back.z, duration: 0.55, ease: 'power2.in' }, 0);
      const d = await dPromise; if (current !== id) return;
      const tb = later(0.55); tb.add(() => show(d), 0);
      const t2 = gsap.timeline(); tweenEnv(d, t2, 0.8); tb.add(t2, 0);
      tb.fromTo(cam.pos, { x: d.cam.pos.x * 1.5, y: d.cam.pos.y + 3, z: d.cam.pos.z * 1.5 }, { x: d.cam.pos.x, y: d.cam.pos.y, z: d.cam.pos.z, duration: 1, ease: 'power2.out', immediateRender: false }, 0.01)
        .to(cam.target, { x: d.cam.target.x, y: d.cam.target.y, z: d.cam.target.z, duration: 1, ease: 'power2.out' }, 0.01)
        .add(() => d.onEnter(), 0.7);
      return;
    }
    // 1) rise to the globe above the old place
    const p1 = globePose(fromPlace || 'taiz', GLOBE_IDS.includes(from) ? cam.pos.distanceTo(G) : 12.5);
    const p2 = globePose(toPlace, globeDist);
    let t0 = 0;
    if (!atGlobe) {
      tl.to(cam.pos, { x: cam.pos.x * 0.6, y: cam.pos.y + 14, z: cam.pos.z * 0.6, duration: 0.45, ease: 'power2.in' }, 0)
        .add(() => { show(null); cam.pos.copy(p1.pos).add(new THREE.Vector3(0, -6, 0)); cam.target.copy(p1.target); atGlobe = true; }, 0.45)
        .to(cam.pos, { x: p1.pos.x, y: p1.pos.y, z: p1.pos.z, duration: 0.55, ease: 'power2.out' }, 0.46);
      const e = gsap.timeline(); tweenEnv(GLOBE_ENV, e, 0.5); tl.add(e, 0.4);
      t0 = 1.0;
    } else { const e = gsap.timeline(); tweenEnv(GLOBE_ENV, e, 0.6); tl.add(e, 0); }
    // 2) fly along the arc
    const startDir = cam.pos.clone().sub(G);
    const dirA = (atGlobe ? startDir : p1.pos.clone().sub(G)), dirB = p2.pos.clone().sub(G); const lenA = dirA.length(), lenB = dirB.length(); dirA.normalize(); dirB.normalize();
    const q = { s: 0 };
    const fi = PLACES.indexOf(fromPlace), ti = PLACES.indexOf(toPlace);
    const arcAnim = ti > fi && fi >= 0 ? globe.arcs[ti - 1] : null;
    globe.arcs.forEach((a, i) => { if (a !== arcAnim) globe.setArc(a, i < upto ? 1 : 0); });
    tl.to(q, { s: 1, duration: 1.4, ease: 'sine.inOut', onStart() { if (arcAnim) globe.setArc(arcAnim, 0); }, onUpdate() {
      const dir = dirA.clone().lerp(dirB, q.s).normalize(); const len = lenA + (lenB - lenA) * q.s + Math.sin(q.s * Math.PI) * (toGlobe && GLOBE_IDS.includes(from) ? 0.5 : 2.5);
      cam.pos.copy(G.clone().add(dir.multiplyScalar(len))); cam.target.copy(G);
      if (arcAnim) globe.setArc(arcAnim, q.s);
    } }, t0);
    if (id === 'conclusion') tl.add(() => { globe.arcs.forEach((a) => globe.setArc(a, 1)); sfx('unlock', true); }, t0 + 1.4);
    if (toGlobe) return;
    // 3) dive into the new diorama
    const d = await dPromise; if (current !== id) return;
    const td = later(t0 + 1.4); const T = 0;
    td.to(cam.pos, { x: p2.pos.x * 0.85 + G.x * 0.15, y: p2.pos.y * 0.85 + G.y * 0.15, z: p2.pos.z * 0.85 + G.z * 0.15, duration: 0.35, ease: 'power2.in' }, T)
      .add(() => { show(d); atGlobe = false; cam.pos.copy(d.cam.pos).add(new THREE.Vector3(0, 10, 0)); cam.target.copy(d.cam.target); }, T + 0.35);
    const e2 = gsap.timeline(); tweenEnv(d, e2, 0.6); td.add(e2, T + 0.3);
    td.to(cam.pos, { x: d.cam.pos.x, y: d.cam.pos.y, z: d.cam.pos.z, duration: 0.9, ease: 'power3.out' }, T + 0.36).add(() => d.onEnter(), T + 1);
  }

  // ------- HTML labels: globe pins + whispers -------
  const pinLabels = PLACES.map((id) => { const el = document.createElement('button'); el.type = 'button'; el.className = 'pin-label'; el.dataset.place = id; el.addEventListener('click', () => current === 'epilogue' && emit('goto', id)); labelsEl.appendChild(el); return { id, el }; });
  const setLabelText = () => pinLabels.forEach(({ id, el }) => { const ch = CHAPTERS.find((c) => c.id === id); el.textContent = ch.title[lang()].split(':')[0]; });
  setLabelText();
  const whisperEls = [];
  function buildWhispers() {
    whisperEls.forEach((w) => w.el.remove()); whisperEls.length = 0;
    for (const [i, w] of (data.whispers || []).entries()) {
      const el = document.createElement('button'); el.className = 'whisper-pin'; el.type = 'button';
      el.innerHTML = data.pinIcon + ' '; el.append((w.from && (w.from[lang()] || w.from.en)) || '…');
      el.addEventListener('click', () => emit('whisper', w)); labelsEl.appendChild(el);
      whisperEls.push({ el, w, i });
    }
  }
  buildWhispers();
  const tmp = new THREE.Vector3(), wp = new THREE.Vector3();
  const LABEL_OFF = { taiz: [-34, 26], sanaa: [42, 12], najran: [10, -10] };
  function project(v, el, extraCheck = true, off = [0, 0]) {
    tmp.copy(v).project(camera);
    const vis = extraCheck && tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
    el.style.opacity = vis ? '1' : '0'; el.style.pointerEvents = vis && (el.classList.contains('whisper-pin') || current === 'epilogue') ? 'auto' : 'none';
    if (vis) el.style.transform = `translate(${((tmp.x + 1) / 2) * innerWidth + off[0]}px, ${((1 - tmp.y) / 2) * innerHeight + off[1]}px) translate(-50%, -100%)`;
  }
  function updateLabels() {
    const showPins = !active; const camDir = cam.pos.clone().sub(G).normalize();
    labelsEl.classList.toggle('interactive', current === 'epilogue');
    for (const { id, el } of pinLabels) {
      globe.pins[id].pin.getWorldPosition(wp); const n = wp.clone().sub(G).normalize();
      const facing = n.dot(camDir) > 0.35;
      project(wp.clone().add(n.multiplyScalar(0.25)), el, showPins && facing, LABEL_OFF[id]);
    }
    let k = 0;
    for (const w of whisperEls) {
      const mine = active && w.w.chapter === active.id;
      if (!mine) { w.el.style.opacity = '0'; w.el.style.pointerEvents = 'none'; continue; }
      const a = active.anchors[k++ % active.anchors.length]; project(a, w.el, true);
    }
  }

  // ------- picking -------
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  const setNdc = (e) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
  const within = (obj, root) => { for (let o = obj; o; o = o.parent) if (o === root) return true; return false; };
  const pinTargets = () => PLACES.flatMap((id) => [globe.pins[id].pin, globe.pins[id].ring].map((o) => ({ o, id })));
  function pick(e) {
    setNdc(e);
    if (!active) {
      if (current !== 'epilogue') return null;
      const pt = pinTargets(); const hits = ray.intersectObjects(pt.map((x) => x.o), false);
      if (hits.length) return { type: 'pin', id: pt.find((x) => x.o === hits[0].object).id };
      return ray.intersectObject(globe.group.children[0], false).length ? { type: 'globe' } : null;
    }
    const targets = [...active.clickables.map((c) => c.obj), ...(active.cup ? [active.cup] : []), ...active.drags.map((d) => d.obj)];
    const hits = ray.intersectObjects(targets, true).filter((h) => !h.object.isSprite); if (!hits.length) return null;
    const h = hits[0];
    if (active.cup && within(h.object, active.cup)) return { type: 'cup', hit: h };
    const drag = active.drags.find((d) => within(h.object, d.obj)); if (drag) return { type: 'drag', drag, hit: h };
    const c = active.clickables.find((c) => within(h.object, c.obj)); return c ? { type: 'click', action: c.action, hit: h } : null;
  }
  let down = null, dragging = null, spinning = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY }; const p = pick(e);
    if (p?.type === 'drag') { dragging = p.drag; p.drag.onDrag(p.hit, performance.now(), true); }
    else if (current === 'epilogue' && !active) { spinning = { x: e.clientX, y: e.clientY, t: performance.now() }; spin.vx = spin.vy = 0; canvas.style.cursor = 'grabbing'; }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragging) { setNdc(e); const h = ray.intersectObject(dragging.obj, true)[0]; if (h) dragging.onDrag(h, performance.now(), false); return; }
    if (spinning) {
      const dx = e.clientX - spinning.x, dy = e.clientY - spinning.y; const now = performance.now(); const dtm = Math.max(1, now - spinning.t);
      spin.y += dx * 0.006; spin.x = Math.max(-0.9, Math.min(0.9, spin.x + dy * 0.004)); spin.vx = (dy * 0.004) / dtm * 16; spin.vy = (dx * 0.006) / dtm * 16;
      spinning = { x: e.clientX, y: e.clientY, t: now }; spin.idle = 0; return;
    }
    if (e.pointerType === 'mouse') { const p = pick(e); canvas.style.cursor = p ? (p.type === 'drag' ? 'crosshair' : p.type === 'globe' ? 'grab' : 'pointer') : 'default'; }
  });
  addEventListener('pointerup', (e) => {
    const wasDrag = dragging; if (dragging?.onEnd) dragging.onEnd(); dragging = null;
    if (spinning) { spinning = null; canvas.style.cursor = 'grab'; }
    if (!down || e.target !== canvas) { down = null; return; }
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
    if (moved > 8 || wasDrag) return;
    const p = pick(e); if (!p) return;
    if (p.type === 'pin') return emit('goto', p.id);
    if (p.type === 'globe') return;
    if (p.type === 'cup') {
      const d = active; d.group.userData.fx.push(burst(d.group, d.cup.position.clone().add(new THREE.Vector3(0, 0.2, 0)), { n: 60, speed: 1.8 }));
      const cup = d.cup; d.cup = null;
      gsap.to(cup.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.5, ease: 'back.in', onComplete: () => d.group.remove(cup) });
      gsap.to(cup.position, { y: cup.position.y + 0.8, duration: 0.5 });
      hunt.find(d.id);
    } else action(p.action);
  });

  function action(name, arg) {
    if (name.startsWith('book:')) { emit('book', name.slice(5)); return true; }
    if (name.startsWith('letter:')) { emit('letter', +name.slice(7)); return true; }
    const d = active && active.actions[name] ? active : Object.values(built).find((x) => x.actions[name]);
    if (d && d.actions[name]) { d.actions[name].call(d, arg); return true; }
    return false;
  }

  // ------- loop -------
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 760 ? 52 : 40; camera.updateProjectionMatrix();
    composer && composer.setSize(w, h);
  }
  addEventListener('resize', resize); resize();
  let lastT = performance.now(), elapsed = 0; let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { lastT = performance.now(); loop(); } });
  function applyCamera() {
    const w = innerWidth, h = innerHeight; const sx = Math.abs(shift.x), sy = Math.abs(shift.y);
    camera.setViewOffset(w * (1 + 2 * sx), h * (1 + 2 * sy), shift.x >= 0 ? 0 : 2 * sx * w, shift.y >= 0 ? 0 : 2 * sy * h, w, h);
    const k = active && camera.aspect < 1 ? (active.mobileZoom ?? 1.75) : 1; camera.position.copy(cam.pos).sub(cam.target).multiplyScalar(k).add(cam.target); camera.lookAt(cam.target); sky.position.copy(camera.position);
    camera.updateMatrixWorld();
  }
  const perf = /[?&]debug=1\b/.test(location.search) ? (() => {
    const el = document.createElement('pre'); el.className = 'perf-hud'; document.body.appendChild(el);
    renderer.info.autoReset = false;
    let frames = 0, acc = 0, worst = 0, last = performance.now();
    return {
      begin() { renderer.info.reset(); },
      end(ms) {
        frames++; acc += ms; worst = Math.max(worst, ms); const now = performance.now();
        if (now - last < 500) return;
        const fps = (frames * 1000) / (now - last), i = renderer.info, mem = performance.memory;
        el.textContent = [
          `fps ${fps.toFixed(0).padStart(3)}   frame ${(1000 / fps).toFixed(1)} ms (worst ${worst.toFixed(1)})`,
          `cpu/frame ${(acc / frames).toFixed(1)} ms`,
          `draw calls ${i.render.calls}   tris ${(i.render.triangles / 1000).toFixed(1)}k`,
          `geometries ${i.memory.geometries}   textures ${i.memory.textures}   programs ${i.programs?.length ?? '?'}`,
          `chapter ${current}   dioramas built ${Object.keys(built).length}`,
          `dpr ${renderer.getPixelRatio().toFixed(2)}   canvas ${renderer.domElement.width}×${renderer.domElement.height}   bloom ${composer ? 'on' : 'off'}`,
          mem ? `js heap ${(mem.usedJSHeapSize / 1048576).toFixed(0)} / ${(mem.jsHeapSizeLimit / 1048576).toFixed(0)} MB` : 'js heap n/a',
        ].join('\n');
        frames = 0; acc = 0; worst = 0; last = now;
      },
    };
  })() : null;
  // phones: 30 fps cap (halves GPU work and battery; the scenes are slow-moving)
  const minFrame = isMobile ? 1000 / 31 : 0; let lastDraw = 0;
  function loop() {
    if (!running) return; requestAnimationFrame(loop);
    if (minFrame && performance.now() - lastDraw < minFrame) return; lastDraw = performance.now();
    const t0 = performance.now(); perf && perf.begin();
    const now = performance.now(); const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; elapsed += dt; chapterTime += dt; const t = elapsed;
    skyU.time.value = t;
    applyCamera();
    sun.target.position.copy(active ? new THREE.Vector3() : G);
    if (active) sun.position.copy(sun.target.position).add(sunDir);
    else { const cd = camera.position.clone().sub(G).normalize(); const side = new THREE.Vector3(0, 1, 0).cross(cd).normalize(); sun.position.copy(G).addScaledVector(cd, 10).addScaledVector(side, -5).add(new THREE.Vector3(0, 6, 0)); }
    if (active) { active.update(t, dt); active.group.userData.fx = active.group.userData.fx.filter((p) => p.userData.update(dt)); if (active.cup) updateCup(active.cup, t, dt); }
    else {
      globe.update(dt);
      if (current === 'epilogue' && !spinning) { spin.idle += dt; spin.y += spin.vy; spin.x = Math.max(-0.9, Math.min(0.9, spin.x + spin.vx)); spin.vx *= 0.94; spin.vy *= 0.94; if (spin.idle > 2.5) spin.y += dt * 0.08; }
      globe.group.rotation.set(spin.x, spin.y, 0, 'XYZ');
    }
    updateLabels();
    composer ? composer.render() : renderer.render(scene, camera);
    perf && perf.end(performance.now() - t0);
  }
  loop();

  const api = {
    go, action,
    relayout() { if (current) { const s = layoutShift(current); gsap.to(shift, { x: s.x, y: s.y, duration: 0.6 }); } setLabelText(); buildWhispers(); },
    removeCup(id) { const d = built[id]; if (d && d.cup) { d.group.remove(d.cup); d.cup = null; } },
    state: () => ({ current, active: active?.id || null, atGlobe, timelines: tls.map((t) => [t.isActive(), +t.progress().toFixed(2), +t.duration().toFixed(2), +(t.delay?.() || 0).toFixed(2)]), cam: cam.pos.toArray().map((v) => +v.toFixed(1)) }),
    // QA helper: where is the active cup on screen, and is anything in front of it?
    cupInfo() {
      if (!active || !active.cup) return null; applyCamera();
      const p = new THREE.Vector3(); active.cup.getWorldPosition(p); p.y += 0.15;
      const s = p.clone().project(camera); const x = ((s.x + 1) / 2) * innerWidth, y = ((1 - s.y) / 2) * innerHeight;
      const r = new THREE.Raycaster(camera.position.clone(), p.clone().sub(camera.position).normalize()); r.camera = camera;
      const hits = r.intersectObjects(active.group.children, true).filter((h) => !h.object.isSprite && !h.object.isPoints && !h.object.isLine);
      const occluded = hits.length && !within(hits[0].object, active.cup);
      const tp = p.clone().add(new THREE.Vector3(0, 0.2 * active.cup.scale.y, 0)).project(camera), bt = p.clone().add(new THREE.Vector3(0, -0.15, 0)).project(camera);
      const px = Math.round(Math.abs(tp.y - bt.y) / 2 * innerHeight);
      return { id: active.id, x: Math.round(x), y: Math.round(y), px, scale: +active.cup.scale.x.toFixed(2), occluded: !!occluded, by: occluded ? hits[0].object.type : null };
    },
  };
  if (location.search.includes('debug')) window.__world = api;
  return api;
}
