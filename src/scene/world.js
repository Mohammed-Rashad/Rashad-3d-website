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
const GLOBE_ENV = { sky: { top: '#04051a', bottom: '#151b52' }, fog: 0.004, sun: { color: '#fff1d6', intensity: 2.2, dir: new THREE.Vector3(-6, 4, 8) }, hemi: { sky: '#9fb2ff', ground: '#1a1530', intensity: 0.7 } };

export async function createWorld({ canvas, labelsEl, hunt, sfx, emit, data, isRTL, lang }) {
  const isMobile = matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#151b52', 0.004);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);

  // sky dome that follows the camera
  const skyU = { top: { value: new THREE.Color('#04051a') }, bottom: { value: new THREE.Color('#151b52') } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying float h; void main(){ h=normalize(position).y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying float h; void main(){ gl_FragColor=vec4(mix(bottom,top,smoothstep(-0.15,0.6,h)),1.); }' }));
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
  const loadGLB = (url) => new Promise((res, rej) => gltf.load(url, (g) => res(g.scene), undefined, rej));

  // dioramas (built lazily)
  const built = {}; const building = {};
  const ctxFor = (id) => ({ isMobile, loadGLB, sfx, emit, history: data.history, postsCount: data.postsCount, chapterData: data.chapters?.[id] });
  function ensure(id) {
    if (!BUILDERS[id]) return Promise.resolve(null);
    if (built[id]) return Promise.resolve(built[id]);
    if (!building[id]) building[id] = BUILDERS[id](ctxFor(id)).then((d) => { d.id = id; d.group.visible = false; d.group.userData.fx = []; scene.add(d.group); built[id] = d; placeCup(d); return d; });
    return building[id];
  }
  function placeCup(d) {
    if (hunt.has(d.id) || !d.cupSpot) return;
    const cup = coffeeCup(1.25); cup.position.copy(d.cupSpot); cup.rotation.y = Math.random() * 6; d.group.add(cup); d.cup = cup;
  }

  // ------- camera state & transitions -------
  const cam = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  const shift = { x: 0, y: 0 };
  let active = null; // diorama currently shown
  let current = null; let tl = null; let tls = []; let atGlobe = true;
  const sunDir = new THREE.Vector3(-6, 4, 8);

  function globePose(place, dist = 12.5) {
    let dir;
    if (place === 'all') dir = latLonToVec(34, 28, 1).normalize();
    else { const ch = CHAPTERS.find((c) => c.id === place); dir = latLonToVec(ch.place.lat - 6, ch.place.lon, 1).normalize(); }
    return { pos: G.clone().add(dir.multiplyScalar(dist)), target: G.clone() };
  }
  const tweenColor = (c, hex, d, t) => { const to = new THREE.Color(hex); t.to(c, { r: to.r, g: to.g, b: to.b, duration: d, ease: 'sine.inOut' }, '<'); };
  function tweenEnv(env, t, d = 0.9) {
    tweenColor(skyU.top.value, env.sky.top, d, t); tweenColor(skyU.bottom.value, env.sky.bottom, d, t); tweenColor(scene.fog.color, env.sky.bottom, d, t);
    t.to(scene.fog, { density: env.fog, duration: d }, '<');
    tweenColor(sun.color, env.sun.color, d, t); t.to(sun, { intensity: env.sun.intensity, duration: d }, '<');
    t.to(sunDir, { x: env.sun.dir.x, y: env.sun.dir.y, z: env.sun.dir.z, duration: d }, '<');
    tweenColor(hemi.color, env.hemi.sky, d, t); tweenColor(hemi.groundColor, env.hemi.ground, d, t); t.to(hemi, { intensity: env.hemi.intensity, duration: d }, '<');
  }
  function arcsFor(chId) {
    const idx = chId === 'intro' ? 0 : chId === 'conclusion' ? PLACES.length - 1 : Math.max(0, PLACES.indexOf(chapterPlace(chId)));
    const ci = CHAPTERS.findIndex((c) => c.id === chId);
    return { upto: ci > 5 ? PLACES.length - 1 : idx };
  }
  function setArcsInstant(upto) { globe.arcs.forEach((a, i) => globe.setArc(a, i < upto ? 1 : 0)); }
  function layoutShift(chId) {
    const centered = chId === 'intro' || chId === 'ai' || chId === 'conclusion';
    const mobile = innerWidth < 760;
    if (mobile) return { x: 0, y: centered ? 0 : -0.2 };
    return { x: centered ? 0 : isRTL() ? -0.2 : 0.2, y: 0 };
  }
  function show(d) {
    if (active && active !== d) active.group.visible = false;
    active = d; if (d) { d.group.visible = true; }
    globe.group.visible = !d; gStars.visible = !d;
  }

  async function go(id) {
    if (id === current) return;
    const from = current; current = id;
    const fromPlace = from ? (from === 'conclusion' ? 'all' : chapterPlace(from)) : null;
    const toGlobe = id === 'intro' || id === 'conclusion';
    const toPlace = id === 'conclusion' ? 'all' : chapterPlace(id);
    const nextIdx = CHAPTERS.findIndex((c) => c.id === id);
    [CHAPTERS[nextIdx + 1], CHAPTERS[nextIdx - 1]].forEach((c) => c && ensure(c.id)); // prefetch neighbours
    const dPromise = toGlobe ? Promise.resolve(null) : ensure(id);
    tls.forEach((x) => x.kill()); tl = gsap.timeline(); tls = [tl];
    const later = (at) => { const t2 = gsap.timeline({ delay: Math.max(0, at - tl.time()) }); tls.push(t2); return t2; };
    const s = layoutShift(id); tl.to(shift, { x: s.x, y: s.y, duration: 1.2, ease: 'sine.inOut' }, 0);
    const { upto } = arcsFor(id);

    if (!from) { // first paint
      const d = await dPromise; show(d);
      const pose = d ? d.cam : globePose(toPlace, id === 'conclusion' ? 15 : 12.5);
      cam.pos.copy(pose.pos); cam.target.copy(pose.target); applyEnvNow(d ? d : GLOBE_ENV); setArcsInstant(upto); atGlobe = !d; if (d) d.onEnter(); return;
    }
    const samePlace = fromPlace === toPlace && !toGlobe && from !== 'intro' && from !== 'conclusion';
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
    const p1 = globePose(fromPlace || 'taiz');
    const p2 = globePose(toPlace, id === 'conclusion' ? 15.5 : 12.5);
    let t0 = 0;
    if (!atGlobe) {
      tl.to(cam.pos, { x: cam.pos.x * 0.6, y: cam.pos.y + 14, z: cam.pos.z * 0.6, duration: 0.45, ease: 'power2.in' }, 0)
        .add(() => { show(null); cam.pos.copy(p1.pos).add(new THREE.Vector3(0, -6, 0)); cam.target.copy(p1.target); atGlobe = true; }, 0.45)
        .to(cam.pos, { x: p1.pos.x, y: p1.pos.y, z: p1.pos.z, duration: 0.55, ease: 'power2.out' }, 0.46);
      const e = gsap.timeline(); tweenEnv(GLOBE_ENV, e, 0.5); tl.add(e, 0.4);
      t0 = 1.0;
    } else { const e = gsap.timeline(); tweenEnv(GLOBE_ENV, e, 0.6); tl.add(e, 0); }
    // 2) fly along the arc
    const dirA = p1.pos.clone().sub(G), dirB = p2.pos.clone().sub(G); const lenA = dirA.length(), lenB = dirB.length(); dirA.normalize(); dirB.normalize();
    const q = { s: 0 }; const startPos = cam.pos.clone();
    const fi = PLACES.indexOf(fromPlace), ti = PLACES.indexOf(toPlace);
    const arcAnim = ti > fi && fi >= 0 ? globe.arcs[ti - 1] : null;
    globe.arcs.forEach((a, i) => { if (a !== arcAnim) globe.setArc(a, i < upto ? 1 : 0); });
    tl.to(q, { s: 1, duration: 1.4, ease: 'sine.inOut', onStart() { startPos.copy(cam.pos); if (arcAnim) globe.setArc(arcAnim, 0); }, onUpdate() {
      const dir = dirA.clone().lerp(dirB, q.s).normalize(); const len = lenA + (lenB - lenA) * q.s + Math.sin(q.s * Math.PI) * 2.5;
      const p = G.clone().add(dir.multiplyScalar(len)); cam.pos.copy(atGlobe && q.s < 1 ? p : p); cam.target.copy(G);
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
  function applyEnvNow(env) {
    skyU.top.value.set(env.sky.top); skyU.bottom.value.set(env.sky.bottom); scene.fog.color.set(env.sky.bottom); scene.fog.density = env.fog;
    sun.color.set(env.sun.color); sun.intensity = env.sun.intensity; sunDir.copy(env.sun.dir); hemi.color.set(env.hemi.sky); hemi.groundColor.set(env.hemi.ground); hemi.intensity = env.hemi.intensity;
  }

  // ------- HTML labels: globe pins + whispers -------
  const pinLabels = PLACES.map((id) => { const el = document.createElement('div'); el.className = 'pin-label'; el.dataset.place = id; labelsEl.appendChild(el); return { id, el }; });
  const setLabelText = () => pinLabels.forEach(({ id, el }) => { const ch = CHAPTERS.find((c) => c.id === id); el.textContent = ch.title[lang()].split(':')[0]; });
  setLabelText();
  const whisperEls = [];
  function buildWhispers() {
    whisperEls.forEach((w) => w.el.remove()); whisperEls.length = 0;
    for (const [i, w] of (data.whispers || []).entries()) {
      const el = document.createElement('button'); el.className = 'whisper-pin'; el.type = 'button';
      el.textContent = (w.from && (w.from[lang()] || w.from.en)) || '…';
      el.addEventListener('click', () => emit('whisper', w)); labelsEl.appendChild(el);
      whisperEls.push({ el, w, i });
    }
  }
  buildWhispers();
  const tmp = new THREE.Vector3();
  const LABEL_OFF = { taiz: [-34, 26], sanaa: [42, 12], najran: [10, -10] };
  function project(v, el, extraCheck = true, off = [0, 0]) {
    tmp.copy(v).project(camera);
    const vis = extraCheck && tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
    el.style.opacity = vis ? '1' : '0'; el.style.pointerEvents = vis ? 'auto' : 'none';
    if (vis) el.style.transform = `translate(${((tmp.x + 1) / 2) * innerWidth + off[0]}px, ${((1 - tmp.y) / 2) * innerHeight + off[1]}px) translate(-50%, -100%)`;
  }
  function updateLabels() {
    const showPins = !active;
    for (const { id, el } of pinLabels) {
      const p = globe.pins[id].pos.clone().add(G);
      const facing = p.clone().sub(G).normalize().dot(cam.pos.clone().sub(G).normalize()) > 0.35;
      project(p.add(p.clone().sub(G).normalize().multiplyScalar(0.25)), el, showPins && facing, LABEL_OFF[id]);
    }
    // whispers for the current chapter
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
  function pick(e) {
    if (!active) return null; setNdc(e);
    const targets = [...active.clickables.map((c) => c.obj), ...(active.cup ? [active.cup] : []), ...active.drags.map((d) => d.obj)];
    const hits = ray.intersectObjects(targets, true); if (!hits.length) return null;
    const h = hits[0];
    if (active.cup && within(h.object, active.cup)) return { type: 'cup', hit: h };
    const drag = active.drags.find((d) => within(h.object, d.obj)); if (drag) return { type: 'drag', drag, hit: h };
    const c = active.clickables.find((c) => within(h.object, c.obj)); return c ? { type: 'click', action: c.action, hit: h } : null;
  }
  let down = null, dragging = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; const p = pick(e); if (p?.type === 'drag') { dragging = p.drag; p.drag.onDrag(p.hit, performance.now()); } });
  canvas.addEventListener('pointermove', (e) => {
    if (dragging) { setNdc(e); const h = ray.intersectObject(dragging.obj, true)[0]; if (h) dragging.onDrag(h, performance.now()); return; }
    if (e.pointerType === 'mouse') { const p = pick(e); canvas.style.cursor = p ? (p.type === 'drag' ? 'crosshair' : 'pointer') : 'default'; }
  });
  addEventListener('pointerup', (e) => {
    const wasDrag = dragging; dragging = null;
    if (!down || e.target !== canvas) { down = null; return; }
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
    if (moved > 8 || wasDrag) return;
    const p = pick(e); if (!p) return;
    if (p.type === 'cup') {
      const d = active; d.group.userData.fx.push(burst(d.group, d.cup.position.clone().add(new THREE.Vector3(0, 0.2, 0)), { n: 50, speed: 1.6 }));
      gsap.to(d.cup.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.45, ease: 'back.in', onComplete: () => { d.group.remove(d.cup); d.cup = null; } });
      gsap.to(d.cup.position, { y: d.cup.position.y + 0.6, duration: 0.45 });
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
  function loop() {
    if (!running) return; requestAnimationFrame(loop);
    const now = performance.now(); const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; elapsed += dt; const t = elapsed;
    const w = innerWidth, h = innerHeight; const sx = Math.abs(shift.x), sy = Math.abs(shift.y);
    camera.setViewOffset(w * (1 + 2 * sx), h * (1 + 2 * sy), shift.x >= 0 ? 0 : 2 * sx * w, shift.y >= 0 ? 0 : 2 * sy * h, w, h);
    const k = active && camera.aspect < 1 ? 1.75 : 1; camera.position.copy(cam.pos).sub(cam.target).multiplyScalar(k).add(cam.target); camera.lookAt(cam.target); sky.position.copy(camera.position);
    sun.target.position.copy(active ? new THREE.Vector3() : G); sun.position.copy(sun.target.position).add(sunDir);
    if (active) { active.update(t, dt); active.group.userData.fx = active.group.userData.fx.filter((p) => p.userData.update(dt)); if (active.cup) { active.cup.rotation.y += dt * 0.4; } }
    else globe.update(dt);
    updateLabels();
    composer ? composer.render() : renderer.render(scene, camera);
  }
  loop();

  return {
    go, action,
    relayout() { if (current) { const s = layoutShift(current); gsap.to(shift, { x: s.x, y: s.y, duration: 0.6 }); } setLabelText(); buildWhispers(); },
    removeCup(id) { const d = built[id]; if (d && d.cup) { d.group.remove(d.cup); d.cup = null; } },
  };
}
