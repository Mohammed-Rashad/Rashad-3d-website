// Procedural low-poly dioramas, one per chapter. Each returns a uniform interface:
// { group, cam:{pos,target}, sky:{top,bottom}, fog, sun:{color,intensity,dir}, hemi:{sky,ground,intensity},
//   clickables:[{obj, action}], drags:[{obj, onDrag(hit)}], actions:{}, anchors:[Vector3], cupSpot:Vector3, update(t,dt), onEnter() }
import * as THREE from 'three';
import { gsap } from 'gsap';
import { mat, glow, mesh, box, cyl, cone, sphere, rng, noise2, terrain, towerHouse, palm, coffeePlant, coffeeCup, canvasTex, burst, signpost } from './kit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const base = (o) => ({ clickables: [], drags: [], actions: {}, anchors: [], fx: [], update() {}, onEnter() {}, ...o });

function birds(parent, n = 5, center = V(0, 8, 0), radius = 6, color = '#2b2230') {
  const flock = [];
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group();
    const wingGeo = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(-0.35, 0.12, 0), V(0, 0, 0.12), V(0, 0, 0), V(0.35, 0.12, 0), V(0, 0, 0.12)]);
    const w = new THREE.Mesh(wingGeo, mat(color, { side: THREE.DoubleSide })); b.add(w); parent.add(b);
    flock.push({ b, w, ph: (i / n) * Math.PI * 2, r: radius * (0.7 + 0.3 * Math.sin(i)), h: center.y + (i % 3) * 0.6, sp: 0.18 + 0.05 * (i % 2) });
  }
  return (t) => { for (const f of flock) { const a = f.ph + t * f.sp; f.b.position.set(center.x + Math.cos(a) * f.r, f.h + Math.sin(t * 0.7 + f.ph) * 0.3, center.z + Math.sin(a) * f.r); f.b.rotation.y = -a; f.w.scale.y = 0.4 + 0.6 * Math.abs(Math.sin(t * 7 + f.ph)); } };
}

function stars(parent, n = 400, r = 60) {
  const g = new THREE.BufferGeometry(); const p = new Float32Array(n * 3); const rr = rng(99);
  for (let i = 0; i < n; i++) { const th = rr() * Math.PI * 2, ph = Math.acos(rr() * 0.9); p.set([Math.cos(th) * Math.sin(ph) * r, Math.cos(ph) * r * 0.8 + 5, Math.sin(th) * Math.sin(ph) * r], i * 3); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const s = new THREE.Points(g, new THREE.PointsMaterial({ color: '#fff6dc', size: 0.18, sizeAttenuation: true, transparent: true, opacity: 0.9, fog: false }));
  parent.add(s); return s;
}

async function placeGLB(ctx, url, parent, { pos = V(0, 0, 0), scale = 1, rotY = 0, noCup = false } = {}) {
  try {
    const g = await ctx.loadGLB(url); g.position.copy(pos); g.scale.setScalar(scale); g.rotation.y = rotY; parent.add(g);
    g.traverse((o) => { if (noCup && o.isMesh) o.userData.noCup = true; if (o.material?.name === 'clock_face') o.material.emissiveIntensity = 0.25; if (o.material?.name?.startsWith('qamariya')) o.material.emissiveIntensity = 0.8; });
    return g;
  } catch (e) { console.warn('model failed', url, e); return null; }
}

function photoFrame(ctx, parent, photos, pos, rotY) {
  const list = (photos || []).filter((p) => p.src && !String(p.src).includes('TODO'));
  if (!list.length) return null;
  const frame = new THREE.Group(); frame.position.copy(pos); frame.rotation.y = rotY; parent.add(frame);
  box(1.3, 1.5, 0.08, '#6b4a30', 0, 0, 0, frame);
  const pic = mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ color: '#ddd' }), 0, 0.82, 0.05, frame);
  const loader = new THREE.TextureLoader(); let i = 0;
  const show = () => loader.load(list[i % list.length].src, (t) => { t.colorSpace = THREE.SRGBColorSpace; pic.material.map = t; pic.material.color.set('#fff'); pic.material.needsUpdate = true; });
  show();
  let flipT = 0, flipping = 0;
  return (dt) => { if (list.length < 2) return; flipT += dt; if (flipT > 5) { flipT = 0; flipping = 1; } if (flipping) { flipping += dt * 2; frame.rotation.y = rotY + Math.sin(Math.min(1, flipping - 1) * Math.PI) * Math.PI; if (flipping > 1.5 && flipping - dt * 2 <= 1.5) { i++; show(); } if (flipping >= 2) { flipping = 0; frame.rotation.y = rotY; } } };
}

/* ---------------------------- §1 Taiz ---------------------------- */
export async function taiz(ctx) {
  const g = new THREE.Group(); const N = noise2(11);
  const H = (x, z) => {
    const rise = Math.max(0, -z + 1) / 7 + Math.abs(x) / 11 - Math.max(0, z - 5) / 9;
    let raw = N(x * 0.12 + 10, z * 0.12 + 3) * 5 + N(x * 0.33, z * 0.33) * 1.2;
    raw *= Math.max(0.12, 0.25 + rise);
    raw += 5 * Math.exp(-((x - 5) ** 2 + (z + 6) ** 2) / 6); // fortress hill
    let h = Math.floor(raw / 0.55) * 0.55 + (raw % 0.55) * 0.18; // terraces
    const town = Math.exp(-((x + 0.5) ** 2 + (z - 0.5) ** 2) / 10);
    return h * (1 - town) + 1.6 * town;
  };
  g.add(terrain({ size: 40, seg: ctx.isMobile ? 40 : 60, height: H, color: (x, y) => (y < 1.2 ? '#6f8f4c' : y < 2.4 ? '#87914f' : y < 3.6 ? '#9b7a52' : '#b59673') }));
  const r = rng(5);
  const houses = [[-1.5, 0, 6], [0.6, -0.6, 7], [-0.2, 1.9, 4], [1.8, 1.2, 5], [-2.6, 1.6, 4], [0.4, 3.2, 3], [-3.2, -0.6, 5]];
  await Promise.all(houses.map(([x, z, f], i) => placeGLB(ctx, `/models/taiz/taiz_house_${f >= 5 ? 'b' : 'a'}.glb`, g, { pos: V(x, H(x, z) - 0.05, z), scale: 0.5 + (f % 2) * 0.05, rotY: r() * 0.6 - 0.3 + (i % 2) * Math.PI / 2 })));
  // hilltop fortress
  const fort = new THREE.Group(); const fy = H(5, -6); fort.position.set(5, fy - 0.2, -6); g.add(fort);
  box(3.2, 1.1, 2.2, '#c2a07a', 0, 0, 0, fort);
  for (const [x, z] of [[-1.6, -1.1], [1.6, -1.1], [-1.6, 1.1], [1.6, 1.1]]) { cyl(0.38, 0.45, 1.6, '#b8956e', x, 0, z, fort, 8); for (let k = 0; k < 6; k++) box(0.12, 0.18, 0.12, '#d3b48c', x + Math.cos(k) * 0.33, 1.6, z + Math.sin(k) * 0.33, fort); }
  box(1.2, 1.8, 1, '#c9a882', 0.4, 0, -0.2, fort);
  // coffee plant + brass pot (Poly Haven) + the pour cup
  const plantPos = V(-2.9, H(-2.9, 3.8), 3.8); // left-front of the houses, in clear view
  const plant = coffeePlant(4); plant.position.copy(plantPos); plant.scale.setScalar(1.3); g.add(plant);
  // the pour: a small finjan beside the plant, and the dallah that lifts, tilts its spout over it and pours
  const cupPos = V(plantPos.x + 1.0, 0, plantPos.z + 0.55); cupPos.y = H(cupPos.x, cupPos.z) + 0.01;
  const pourCup = coffeeCup(1.0); pourCup.position.copy(cupPos); g.add(pourCup);
  const coffee = pourCup.children.find((c) => c.userData.coffee); coffee.scale.setScalar(0.01); coffee.position.y = 0.06;
  const PIV_H = 0.28; // tilt around the pot's middle, not its base
  const potPivot = new THREE.Group(); potPivot.position.set(cupPos.x + 0.19, cupPos.y + PIV_H, cupPos.z); g.add(potPivot);
  const pot = await placeGLB(ctx, '/models/taiz/dallah.glb', potPivot, { pos: V(0, -PIV_H, 0), scale: 1.25, rotY: Math.PI / 2 }); // spout → towards the cup (−x)
  const spout = new THREE.Object3D(); spout.position.set(-0.23, 0.32 - PIV_H, 0); potPivot.add(spout);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.006, 1, 6, 1, true), mat('#3b1e0c', { roughness: 0.25 })); stream.visible = false; g.add(stream);
  const flipper = photoFrame(ctx, g, ctx.chapterData?.photos, V(3.2, H(3.2, 2.2), 2.2), -0.4);
  const fly = birds(g, 6, V(1, 7, -1), 7);
  let pouring = false; const sp = new THREE.Vector3();
  const pour = () => {
    if (pouring) return; pouring = true; coffee.scale.setScalar(0.01);
    const rest = potPivot.position.clone();
    const tl = gsap.timeline({ onComplete: () => (pouring = false) });
    tl.to(potPivot.position, { y: rest.y + 0.3, x: rest.x + 0.02, duration: 0.55, ease: 'sine.inOut' })
      .to(potPivot.rotation, { z: 0.9, duration: 0.6, ease: 'sine.inOut' })
      .add(() => { stream.visible = true; ctx.sfx('pour'); })
      .to(coffee.scale, { x: 1, y: 1, z: 1, duration: 1.3, ease: 'sine.out' })
      .add(() => (stream.visible = false))
      .to(potPivot.rotation, { z: 0, duration: 0.5, ease: 'sine.inOut' })
      .to(potPivot.position, { y: rest.y, x: rest.x, duration: 0.5, ease: 'sine.inOut' })
      .add(() => ctx.sfx('clink'));
  };
  return base({
    group: g, cam: { pos: V(4.4, 5.4, 12.4), target: V(-0.4, 2.3, 1.0) }, mobileZoom: 1.35,
    sky: { top: '#4a3560', bottom: '#e9a979' }, fog: 0.028, sun: { color: '#ffd2a0', intensity: 2.2, dir: V(-6, 8, 4) }, hemi: { sky: '#ffe0c0', ground: '#4b3a2a', intensity: 1.1 },
    clickables: [{ obj: plant, action: 'pour' }, { obj: pourCup, action: 'pour' }, { obj: potPivot, action: 'pour' }],
    actions: { pour },
    anchors: [V(-0.2, 6, 1.9), V(1.6, 4.4, 4.2), V(5, fy + 2.4, -6)],
    cupSpot: V(5.9, fy + 1.45, -4.95),
    update(t, dt) {
      fly(t); flipper && flipper(dt);
      if (stream.visible) { spout.getWorldPosition(sp); g.worldToLocal(sp); const to = new THREE.Vector3(cupPos.x, cupPos.y + 0.1, cupPos.z); const dir = to.clone().sub(sp); const len = Math.max(0.02, dir.length()); stream.scale.y = len; stream.position.copy(sp).addScaledVector(dir, 0.5); stream.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); }
    },
  });
}

/* ---------------------------- §2 Sana'a ---------------------------- */
export async function sanaa(ctx) {
  const g = new THREE.Group(); const N = noise2(21);
  g.add(terrain({ size: 40, seg: 30, height: (x, z) => N(x * 0.2, z * 0.2) * 0.35 + Math.max(0, -z - 6) * 0.15, color: (x, y) => (y > 0.3 ? '#8d6a52' : '#a07c5f') }));
  stars(g, 300, 50);
  sphere(1.1, glow('#fff2d6', 1.6), -9, 13, -22, g, 2);
  const r = rng(8);
  const row = [[-6, -5, 7], [-4.1, -6, 8], [-2.2, -5.3, 6], [-0.3, -6.4, 9], [1.7, -5.5, 7], [3.6, -6.2, 8], [5.5, -5, 6], [7, -3.5, 7], [-7.5, -3.2, 6]];
  await Promise.all(row.map(([x, z, f], i) => placeGLB(ctx, `/models/sanaa/sanaa_house_${f >= 7 ? 'b' : 'a'}.glb`, g, { pos: V(x, 0, z), scale: 0.6 + (f % 3) * 0.06, rotY: Math.atan2(-x, -z - 8) * 0.4 + (i % 2) * Math.PI / 2 })));
  // chalkboard on an easel
  const board = new THREE.Group(); board.position.set(0.2, 0, 2.4); board.rotation.y = 0.18; g.add(board);
  for (const x of [-1.3, 1.3]) { const leg = box(0.1, 2.6, 0.1, '#5b3d27', x, 0, 0, board); leg.rotation.z = x > 0 ? -0.05 : 0.05; }
  box(2.9, 1.7, 0.1, '#5b3d27', 0, 0.85, -0.02, board);
  // the board's texture is the shared chalk canvas from the §2 card (src/chalk.js)
  const chalk = ctx.chalk; const tex = new THREE.CanvasTexture(chalk.canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  chalk.onChange(() => (tex.needsUpdate = true));
  const face = mesh(new THREE.PlaneGeometry(2.7, 1.5), new THREE.MeshBasicMaterial({ map: tex, color: '#e4e4e4' }), 0, 1.7, 0.06, board);
  box(2.7, 0.06, 0.18, '#5b3d27', 0, 0.9, 0.08, board);
  const desk = await placeGLB(ctx, '/models/sanaa/SchoolDesk_01.glb', g, { pos: V(2.4, 0, 4.2), scale: 1.6, rotY: Math.PI + 0.25 });

  let wrote = false;
  let lastChalk = 0;
  const actions = {
    chalk() { chalk.animateFormula(1600); ctx.sfx('chalk'); },
  };
  return base({
    group: g, cam: { pos: V(5, 4.2, 13), target: V(0.6, 2.4, 0) },
    sky: { top: '#1d1844', bottom: '#b4708a' }, fog: 0.03, sun: { color: '#ff9f86', intensity: 1.2, dir: V(8, 3, -6) }, hemi: { sky: '#9b86d6', ground: '#3b2a2a', intensity: 1.0 },
    clickables: [...(desk ? [{ obj: desk, action: 'chalk' }] : [])],
    drags: [{ obj: face, onDrag(hit, now, start) {
      const uv = hit.uv; if (!uv) return; chalk.stroke(uv.x * chalk.canvas.width, (1 - uv.y) * chalk.canvas.height, start);
      if (now - lastChalk > 180) { lastChalk = now; g.userData.fx.push(burst(g, hit.point, { color: '#ffffff', n: 10, speed: 0.5, size: 0.035, life: 0.8, gravity: -2 })); }
    }, onEnd() { chalk.end(); } }],
    actions, anchors: [V(-4, 6, -5), V(3.6, 6.5, -6), V(0.2, 3.4, 2.4)],
    cupSpot: V(0.3, 0.02, -4.9),
    onEnter() { if (!wrote) { wrote = true; setTimeout(() => actions.chalk(), 900); } },
    update(t, dt) {
    },
  });
}

/* ---------------------------- §3 Cairo ---------------------------- */
export async function cairo(ctx) {
  const g = new THREE.Group(); const N = noise2(31);
  const river = (x) => Math.sin(x * 0.12) * 1.5 - 1.5;
  g.add(terrain({ size: 44, seg: 44, height: (x, z) => { const d = Math.abs(z - river(x)); return d < 2.6 ? -0.6 : Math.min(0.6, (d - 2.6) * 0.5) + N(x * 0.3, z * 0.3) * 0.25; }, color: (x, y) => (y < -0.2 ? '#6d6047' : y < 0.35 ? '#7f8f55' : '#d9c29a') }));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(44, 6, 60, 8).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1f7f86', roughness: 0.25, metalness: 0.1, flatShading: true }));
  water.position.y = -0.25; water.userData.noCup = true; g.add(water);
  const wp = water.geometry.attributes.position; const wx = Float32Array.from({ length: wp.count }, (_, i) => wp.getX(i)); const wz = Float32Array.from({ length: wp.count }, (_, i) => wp.getZ(i));
  for (let i = 0; i < wp.count; i++) wp.setZ(i, wz[i] + river(wx[i]));
  stars(g, 350, 55);
  // far bank: Cairo University dome + clock tower silhouette
  const uni = new THREE.Group(); uni.position.set(-1.6, 0.4, -8.4); g.add(uni);
  await placeGLB(ctx, '/models/cairo/cairo_university.glb', uni, { pos: V(0, 0, 0), scale: 0.62, rotY: 0 });
  await placeGLB(ctx, '/models/cairo/cairo_clock_tower.glb', uni, { pos: V(5.6, 0, 0.6), scale: 0.62, rotY: 0.2 });
  await Promise.all([[-6, -6.5], [-8, -5.8], [6.5, -6.2], [8.5, -5.5], [-9, 4.2], [9, 4.5], [5.5, 4.8]].map(([x, z], i) => placeGLB(ctx, '/models/najran/date_palm.glb', g, { pos: V(x, 0.2, z), scale: 0.42 + (i % 3) * 0.05, rotY: i * 1.9, noCup: true })));
  // felucca
  const fel = new THREE.Group(); fel.position.set(3, -0.2, river(3)); g.add(fel);
  await placeGLB(ctx, '/models/cairo/dhow.glb', fel, { pos: V(0, -0.05, 0), scale: 0.5, rotY: Math.PI / 2 });
  // the desk on the near bank
  const desk = new THREE.Group(); desk.position.set(1.2, 0.55, 4.4); desk.rotation.y = 0.2; g.add(desk);
  box(2.6, 0.12, 1.3, '#6b4423', 0, 0.9, 0, desk);
  for (const [x, z] of [[-1.2, -0.55], [1.2, -0.55], [-1.2, 0.55], [1.2, 0.55]]) box(0.1, 0.9, 0.1, '#55361c', x, 0, z, desk);
  const papers = new THREE.Group(); papers.position.set(-0.45, 1.02, 0); desk.add(papers);
  for (let i = 0; i < 14; i++) { const s = box(0.62, 0.012, 0.86, i % 3 ? '#f4efe2' : '#e9e1cd', 0, i * 0.018, 0, papers); s.rotation.y = (Math.random() - 0.5) * 0.25; }
  const pdfTex = canvasTex(512, 720, (c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.textAlign = 'center';
    c.font = 'bold 26px "CMU Serif", Georgia, serif'; ['ON SINC-BASED METHOD IN', 'COMPUTING EIGENVALUES OF', 'BOUNDARY-VALUE PROBLEMS'].forEach((l, i) => c.fillText(l, w / 2, 90 + i * 34));
    c.font = '20px "CMU Serif", Georgia, serif'; c.fillText('M. H. ANNABY AND R. M. ASHARABI', w / 2, 220);
    c.font = 'italic 17px "CMU Serif", Georgia, serif'; c.fillText('SIAM J. Numer. Anal. 46 (2008), 671–690', w / 2, 255);
    c.fillStyle = '#999'; for (let i = 0; i < 16; i++) c.fillRect(60, 300 + i * 24, (i % 5 === 4 ? 260 : 392), 7);
  });
  const sheet = mesh(new THREE.PlaneGeometry(0.62, 0.86).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: pdfTex, roughness: 0.9 }), -0.45, 1.3, 0, desk);
  const lamp = await placeGLB(ctx, '/models/cairo/vintage_oil_lamp.glb', desk, { pos: V(0.85, 0.96, -0.25), scale: 1.6 });
  await placeGLB(ctx, '/models/cairo/round_spectacles.glb', desk, { pos: V(0.25, 0.97, 0.3), scale: 1.4, rotY: 0.6 });
  const lampLight = new THREE.PointLight('#ffb760', 6, 6, 1.6); lampLight.position.set(0.85, 1.5, -0.25); desk.add(lampLight);
  sphere(0.06, glow('#ffcc77', 3), 0.85, 1.32, -0.25, desk, 1);
  let compileT = -1;
  return base({
    group: g, cam: { pos: V(5, 4.4, 12.5), target: V(0.4, 1.6, 0.5) },
    sky: { top: '#071d2a', bottom: '#2b6d72' }, fog: 0.032, sun: { color: '#bfe8ff', intensity: 0.9, dir: V(6, 9, -4) }, hemi: { sky: '#6fd0c8', ground: '#3b3020', intensity: 0.9 },
    clickables: [{ obj: papers, action: 'compile' }, { obj: sheet, action: 'compile' }, ...(lamp ? [{ obj: lamp, action: 'compile' }] : [])],
    actions: { compile() { if (compileT >= 0) return; compileT = 0; ctx.sfx('keys'); setTimeout(() => ctx.sfx('ding'), 1300); ctx.emit('compiled'); } },
    anchors: [V(-1, 5.2, -8), V(4.6, 6, -8), V(1.2, 3, 4.4)],
    cupSpot: V(8.6, 0.55, 4.9),
    update(t, dt) {
      for (let i = 0; i < wp.count; i++) wp.setY(i, Math.sin(wx[i] * 0.9 + t * 1.3) * 0.05 + Math.cos(wz[i] * 1.7 + t) * 0.04);
      wp.needsUpdate = true;
      fel.position.x = 3 + Math.sin(t * 0.08) * 4; fel.position.z = river(fel.position.x); fel.rotation.z = Math.sin(t * 1.2) * 0.04; fel.position.y = -0.2 + Math.sin(t * 1.5) * 0.03;
      lampLight.intensity = 6 + Math.sin(t * 13) * 0.4 + Math.sin(t * 7.3) * 0.3;
      if (compileT >= 0) { compileT += dt; const p = Math.min(1, Math.max(0, (compileT - 1.2) / 0.8)); sheet.position.y = 1.3 + Math.sin(p * Math.PI) * 0.0 + p * 0.55; sheet.rotation.x = -p * 1.1; if (compileT > 8) { compileT = -1; sheet.position.y = 1.3; sheet.rotation.x = 0; } }
    },
  });
}

/* ---------------------------- §4 Lübeck ---------------------------- */
export async function lubeck(ctx) {
  const g = new THREE.Group();
  const ground = terrain({ size: 44, seg: 30, height: (x, z) => (z < -7 ? -0.5 : 0.02 * Math.sin(x * 3) * Math.cos(z * 3)), color: (x, y) => (y < -0.2 ? '#4d5560' : '#8d877d') });
  g.add(ground);
  const sea = mesh(new THREE.PlaneGeometry(60, 30, 40, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#5f7585', roughness: 0.3, flatShading: true }), 0, -0.3, -22, g);
  sea.userData.noCup = true;
  const sp = sea.geometry.attributes.position; const sx = Float32Array.from({ length: sp.count }, (_, i) => sp.getX(i)); const sz = Float32Array.from({ length: sp.count }, (_, i) => sp.getZ(i));
  const brick = '#9c3b2e', brick2 = '#86322a', roof = '#4f6157';
  // Holstentor: built in Blender with Poly Haven brick/slate/plaster (tools/blender/06_holstentor.py)
  const ht = new THREE.Group(); ht.position.set(0.5, 0, -1.5); g.add(ht);
  await placeGLB(ctx, '/models/lubeck/holstentor.glb', ht, { pos: V(0, 0, 0), scale: 1, rotY: 0 });
  // the gate's real inscription on its white band, and a little name sign in front
  const insc = canvasTex(1024, 96, (c, w, h) => { c.fillStyle = '#ece6d8'; c.fillRect(0, 0, w, h); c.fillStyle = '#2b2723'; c.font = '600 58px "CMU Serif", Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CONCORDIA DOMI FORIS PAX', w / 2, h / 2 + 2); });
  mesh(new THREE.PlaneGeometry(2.1, 0.2), new THREE.MeshStandardMaterial({ map: insc, roughness: 0.9 }), 0, 2.55, 1.035, ht);
  ht.add(signpost('HOLSTENTOR', 'Lübeck', V(-2.35, 0, 2.9), 0.3));
  // gabled houses along the quay
  const r = rng(44);
  await Promise.all([-9.6, -7.1, -4.6, 4.3, 6.8, 9.3].map((x, i) => placeGLB(ctx, '/models/lubeck/lubeck_house.glb', g, { pos: V(x, 0, -5.8), scale: 0.42 + (i % 3) * 0.03, rotY: 0 })));
  // St. Mary's spires far behind
  for (const x of [-4.2, -2.8]) { box(1.1, 6.5, 1.1, brick2, x, 0, -11, g); cone(0.8, 3.5, roof, x, 6.5, -11, g, 4); }
  // marzipan loaf on a crate
  const crate = box(1.1, 0.7, 0.8, '#7a5a3a', 3.4, 0, 2.6, g);
  const loaf = new THREE.Group(); loaf.position.set(3.4, 0.7, 2.6); g.add(loaf);
  const slices = [];
  for (let i = 0; i < 8; i++) { const s = new THREE.Group(); s.position.x = -0.42 + i * 0.12; loaf.add(s); box(0.115, 0.22, 0.34, '#e8d39a', 0, 0, 0, s); box(0.118, 0.04, 0.35, '#5a3018', 0, 0.22, 0, s); slices.push(s); }
  // seagulls
  const fly = birds(g, 5, V(0, 7.5, -10), 6, '#f0f0f0');
  // snow
  const SN = ctx.isMobile ? 700 : 1800; const sg = new THREE.BufferGeometry(); const spos = new Float32Array(SN * 3); const rr = rng(4);
  for (let i = 0; i < SN; i++) spos.set([(rr() - 0.5) * 30, rr() * 14, (rr() - 0.5) * 24], i * 3);
  sg.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  const snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 0.08, transparent: true, opacity: 0.9, depthWrite: false })); snow.visible = false; g.add(snow);
  let marzT = -1;
  const actions = {
    snow(on) { snow.visible = on ?? !snow.visible; ground.material = snow.visible ? mat('#ffffff', { vc: true, emissive: '#3a3f4a', ei: 0.6 }) : mat('#ffffff', { vc: true }); if (snow.visible) ctx.sfx('snow'); ctx.emit('snow', snow.visible); },
    marzipan() { if (marzT >= 0) return; marzT = 0; slices.forEach((_, i) => setTimeout(() => ctx.sfx('blip', true), i * 90)); },
    gull() { ctx.sfx('gull'); },
  };
  return base({
    group: g, cam: { pos: V(5.5, 4, 11.5), target: V(0.4, 2.6, -1) },
    sky: { top: '#2f3a4c', bottom: '#aab5bf' }, fog: 0.03, sun: { color: '#e6eeff', intensity: 1.5, dir: V(-5, 7, 6) }, hemi: { sky: '#c9d6e6', ground: '#4b4440', intensity: 1.1 },
    clickables: [{ obj: loaf, action: 'marzipan' }, { obj: crate, action: 'marzipan' }, { obj: ht, action: 'gull' }],
    actions, anchors: [V(-1.05, 7.2, -1.5), V(-6, 5, -5.4), V(6, 5.5, -5.4)],
    cupSpot: V(-7.7, 0.02, -4.45),
    onEnter() { setTimeout(() => ctx.sfx('churchbell'), 1200); setTimeout(() => ctx.sfx('tram'), 6500); },
    update(t, dt) {
      fly(t);
      for (let i = 0; i < sp.count; i++) sp.setY(i, Math.sin(sx[i] * 0.5 + t) * 0.12 + Math.cos(sz[i] * 0.7 + t * 0.8) * 0.1);
      sp.needsUpdate = true;
      if (snow.visible) { const p = sg.attributes.position; for (let i = 0; i < SN; i++) { let y = p.getY(i) - dt * (0.8 + (i % 5) * 0.12); if (y < 0) y += 14; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t + i) * dt * 0.15); } p.needsUpdate = true; }
      if (marzT >= 0) { marzT += dt; const open = marzT < 3 ? Math.min(1, marzT / 0.6) : Math.max(0, 1 - (marzT - 3) / 0.6); slices.forEach((s, i) => { s.position.x = (-0.42 + i * 0.12) * (1 + open * 1.6); s.position.y = open * 0.15 * Math.abs(Math.sin(Math.PI * (i + 0.5) / 2.5)) ; }); if (marzT > 3.7) marzT = -1; }
    },
  });
}

/* ---------------------------- §5 Najran ---------------------------- */
export async function najran(ctx) {
  const g = new THREE.Group(); const N = noise2(51);
  g.add(terrain({ size: 46, seg: 44, height: (x, z) => N(x * 0.15, z * 0.1) * 1.2 * Math.min(1, Math.hypot(x, z) / 8) + Math.sin(x * 0.4 + z * 0.2) * 0.25, color: (x, y) => (y > 0.7 ? '#d9a35a' : y > 0.3 ? '#c98b3c' : '#b97d38') }));
  const r = rng(52);
  const mud = (x, z, h, w) => {
    const t = new THREE.Group(); t.position.set(x, 0, z); g.add(t);
    const body = mesh(new THREE.CylinderGeometry(w * 0.62, w * 0.78, h, 4), mat('#a8743f'), 0, h / 2, 0, t); body.rotation.y = Math.PI / 4;
    for (let k = 1; k < 5; k++) { const b = mesh(new THREE.CylinderGeometry(w * (0.78 - 0.16 * (k / 5)) + 0.03, w * (0.78 - 0.16 * (k / 5)) + 0.03, 0.06, 4), mat('#8a5a2e'), 0, (k * h) / 5, 0, t); b.rotation.y = Math.PI / 4; }
    const top = mesh(new THREE.CylinderGeometry(w * 0.64, w * 0.64, 0.25, 4), mat('#f1e7d2'), 0, h + 0.05, 0, t); top.rotation.y = Math.PI / 4;
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; box(0.16, 0.3, 0.16, '#f1e7d2', Math.cos(a) * w * 0.4, h + 0.15, Math.sin(a) * w * 0.4, t); }
    for (let f = 1; f < 5; f++) { const y = (f * h) / 5 - 0.35; box(0.22, 0.3, 0.03, '#f1e7d2', 0, y, w * 0.55 - f * 0.02, t); box(0.12, 0.2, 0.04, '#2a1d14', 0, y + 0.04, w * 0.56 - f * 0.02, t); }
    return t;
  };
  [[-7.6, -7.5, 5, 1.9], [6.8, -9.5, 6.6, 2.2]].forEach(([x, z, h, w]) => mud(x, z, h, w));
  await placeGLB(ctx, '/models/najran/najran_kasbah.glb', g, { pos: V(-3.2, 0, -5.2), scale: 0.95, rotY: 0.35 });
  await placeGLB(ctx, '/models/najran/najran_kasbah.glb', g, { pos: V(2.6, 0, -8.6), scale: 0.8, rotY: -0.5 });
  await Promise.all(Array.from({ length: 10 }, (_, i) => { let x = -9 + r() * 18; const z = 1 + r() * 6 + (i % 2 ? 0 : 2); if (Math.abs(x - 3.5) < 2.2 && z < 4) x += 4; return placeGLB(ctx, '/models/najran/date_palm.glb', g, { pos: V(x, 0, z), scale: 0.38 + r() * 0.2, rotY: r() * 6.28, noCup: true }); }));
  // lecture hall
  const hall = new THREE.Group(); hall.position.set(4.8, 0, -1.2); hall.rotation.y = -0.45; g.add(hall);
  box(5.2, 2.4, 3.2, '#e6d3b0', 0, 0, 0, hall);
  box(5.6, 0.25, 3.6, '#cdb48b', 0, 2.4, 0, hall);
  for (let i = -2; i <= 2; i++) box(0.22, 2.4, 0.22, '#f4ead6', i * 1.15, 0, 1.75, hall);
  box(4.4, 1.6, 0.05, glow('#ffd38a', 0.5), 0, 0.3, 1.61, hall);
  // gold sinc pulse (Full Professor)
  const pulsePts = []; for (let i = 0; i <= 160; i++) { const x = (i / 160 - 0.5) * 10; pulsePts.push(V(x, Math.abs(x) < 1e-6 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x), 0)); }
  const pulse = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pulsePts), new THREE.LineBasicMaterial({ color: new THREE.Color('#f2c66d').multiplyScalar(3), transparent: true, opacity: 0 }));
  pulse.position.set(0, 3.2, 1.9); pulse.scale.set(0.5, 1.6, 1); hall.add(pulse);
  let pulseT = -1;
  return base({
    group: g, cam: { pos: V(3, 4.2, 13), target: V(0.6, 2.8, -2) },
    sky: { top: '#3a2440', bottom: '#eeaa5c' }, fog: 0.026, sun: { color: '#ffcf8a', intensity: 2.3, dir: V(8, 5, 3) }, hemi: { sky: '#ffd9a8', ground: '#6a4220', intensity: 1.1 },
    clickables: [{ obj: hall, action: 'levelup' }],
    actions: { levelup() { pulseT = 0; ctx.sfx('pulse'); setTimeout(() => ctx.sfx('applause'), 700); ctx.emit('levelup'); } },
    anchors: [V(-2.4, 8.6, -5), V(4.8, 4.2, -1.2), V(-7.4, 6, -6)],
    cupSpot: V(-6.95, 0.75, -4.2),
    onEnter() { setTimeout(() => this.actions.levelup(), 1400); },
    update(t, dt) {
      if (pulseT >= 0) { pulseT += dt; const p = pulseT / 2.6; pulse.material.opacity = Math.sin(Math.min(1, p) * Math.PI); pulse.scale.set(0.3 + p * 0.5, 1.6 * (1 - p * 0.3), 1); if (p >= 1) { pulseT = -1; pulse.material.opacity = 0; } }
    },
  });
}

/* ---------------------------- §6 Library ---------------------------- */
export async function library(ctx) {
  const g = new THREE.Group();
  box(16, 0.2, 12, '#5a3a26', 0, -0.2, 0, g);
  box(16, 8, 0.3, '#3b2a22', 0, 0, -4.2, g);
  box(0.3, 8, 12, '#33241d', -6.5, 0, 0, g);
  // wallpaper stripes
  for (let i = -7; i <= 7; i++) box(0.05, 8, 0.02, '#46322a', i, 0, -4.04, g);
  const shelf = await placeGLB(ctx, '/models/library/wooden_bookshelf_worn.glb', g, { pos: V(-3.2, 0, -3.6), scale: 2.2 });
  // a long shelf of procedural books (also clickable topics)
  const books = new THREE.Group(); books.position.set(2, 0, -3.5); g.add(books);
  box(4.6, 0.12, 0.8, '#6b4423', 0, 1.6, 0, books); box(4.6, 0.12, 0.8, '#6b4423', 0, 3, 0, books); box(0.12, 3.2, 0.8, '#6b4423', -2.3, 0, 0, books); box(0.12, 3.2, 0.8, '#6b4423', 2.3, 0, 0, books);
  const r = rng(61); const topicBooks = []; const ids = ctx.history || [];
  const palette = ['#7b2d26', '#2f4f6b', '#6b5a2a', '#3e5d3a', '#5c3a5e', '#8a5a3b', '#2b2b3c'];
  for (const shelfY of [1.72, 3.12]) { let x = -2.15; while (x < 2.1) { const w = 0.12 + r() * 0.1, h = 0.8 + r() * 0.45; const b = box(w, h, 0.6, palette[Math.floor(r() * palette.length)], x + w / 2, shelfY, 0, books); b.rotation.z = r() < 0.08 ? 0.12 : 0; x += w + 0.01; if (topicBooks.length < ids.length && r() < 0.18) { b.material = glow('#d9a441', 0.25); b.scale.y = 1.08; topicBooks.push(b); } } }
  // reading table, globe, radio, newspaper
  const table = new THREE.Group(); table.position.set(1.2, 0, 1); g.add(table);
  box(3, 0.12, 1.6, '#6b4423', 0, 1.2, 0, table); for (const [x, z] of [[-1.35, -0.7], [1.35, -0.7], [-1.35, 0.7], [1.35, 0.7]]) box(0.12, 1.2, 0.12, '#55361c', x, 0, z, table);
  const gl = new THREE.Group(); gl.position.set(-0.9, 1.32, -0.2); table.add(gl);
  cyl(0.18, 0.25, 0.08, '#4a3424', 0, 0, 0, gl); cyl(0.03, 0.03, 0.35, '#c9a050', 0, 0.08, 0, gl);
  const gs = mesh(new THREE.IcosahedronGeometry(0.38, 2), mat('#2f5d8a'), 0, 0.8, 0, gl); gs.rotation.z = 0.4;
  const gp = gs.geometry.attributes.position; const gc = new Float32Array(gp.count * 3); const cc = new THREE.Color(); for (let i = 0; i < gp.count; i += 3) { cc.set(r() < 0.35 ? '#c9a46a' : '#2f5d8a'); for (let k = 0; k < 3; k++) cc.toArray(gc, (i + k) * 3); } gs.geometry.setAttribute('color', new THREE.BufferAttribute(gc, 3)); gs.material = mat('#ffffff', { vc: true });
  const radio = new THREE.Group(); radio.position.set(0.7, 1.26, -0.3); radio.rotation.y = -0.3; table.add(radio);
  box(0.9, 0.55, 0.38, '#7a4b2a', 0, 0, 0, radio); mesh(new THREE.CircleGeometry(0.16, 16), mat('#2a1d14'), -0.2, 0.28, 0.2, radio); mesh(new THREE.CircleGeometry(0.07, 12), glow('#ffcf7a', 1), 0.25, 0.32, 0.2, radio);
  for (let i = 0; i < 5; i++) box(0.3, 0.015, 0.01, '#c9a050', -0.2, 0.14 + i * 0.06, 0.2, radio);
  const paperTex = canvasTex(512, 360, (c, w, h) => { c.fillStyle = '#e9e2d0'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; c.font = 'bold 40px "CMU Serif", Georgia, serif'; c.textAlign = 'center'; c.fillText('THE DAILY SAMPLE', w / 2, 52); c.fillRect(20, 66, w - 40, 3); c.fillStyle = '#888'; for (let col = 0; col < 3; col++) for (let i = 0; i < 11; i++) c.fillRect(24 + col * 160, 90 + i * 24, 140, 8); });
  const news = mesh(new THREE.PlaneGeometry(0.95, 0.67).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: paperTex, roughness: 1 }), 0.1, 1.27, 0.35, table); news.rotation.y = 0.2;
  const lampL = new THREE.PointLight('#ffbf70', 10, 9, 1.5); lampL.position.set(2.2, 3.2, 1.5); g.add(lampL);
  const shade = cone(0.45, 0.4, glow('#ffd59a', 0.6), 2.2, 3.1, 1.5, g, 10); cyl(0.03, 0.03, 3.1, '#3a2a1a', 2.2, 0, 1.5, g);
  // window with night outside
  box(2.4, 2.6, 0.05, glow('#26305e', 0.6), 4.6, 2.4, -4.0, g);
  let radioT = -1;
  return base({
    group: g, cam: { pos: V(4.5, 3.6, 8.5), target: V(0.2, 2.1, -1.4) },
    sky: { top: '#1e1410', bottom: '#2c1d16' }, fog: 0.035, sun: { color: '#ffd8a8', intensity: 0.8, dir: V(4, 6, 6) }, hemi: { sky: '#ffcf9c', ground: '#2a1a10', intensity: 0.75 },
    clickables: [...topicBooks.map((b, i) => ({ obj: b, action: 'book:' + ids[i] })), { obj: radio, action: 'radio' }, ...(shelf ? [{ obj: shelf, action: 'book:' + (ids[0] || '') }] : [])],
    actions: { radio() { radioT = 0; ctx.sfx('radio'); } },
    anchors: [V(-3.2, 5.6, -3.4), V(2, 4.4, -3.4), V(1.2, 2.6, 1)],
    cupSpot: V(3.9, 3.06, -3.4),
    update(t, dt) { gs.rotation.y += dt * 0.3; if (radioT >= 0) { radioT += dt; radio.position.y = 1.26 + Math.abs(Math.sin(radioT * 30)) * 0.01; if (radioT > 1.4) radioT = -1; } lampL.intensity = 10 + Math.sin(t * 3) * 0.3; },
  });
}

/* ---------------------------- §7 Writer ---------------------------- */
export async function writer(ctx) {
  const g = new THREE.Group();
  box(14, 0.2, 10, '#4c3424', 0, -0.2, 0, g);
  box(14, 8, 0.3, '#5b4a3e', 0, 0, -3.5, g);
  // corkboard
  const cork = new THREE.Group(); cork.position.set(-0.6, 2.1, -3.3); g.add(cork);
  box(4.6, 2.9, 0.12, '#6b4423', 0, 0, 0, cork); box(4.3, 2.6, 0.14, '#b8895a', 0, 0.15, 0, cork);
  const n = Math.max(3, Math.min(7, ctx.postsCount || 0)); const letters = []; const r = rng(71);
  for (let i = 0; i < n; i++) {
    const L = new THREE.Group(); const x = -1.6 + (i % 4) * 1.05 + r() * 0.2, y = 0.6 + (i < 4 ? 1.3 : 0.1) + r() * 0.2; L.position.set(x, y, 0.1); L.rotation.z = (r() - 0.5) * 0.25; cork.add(L);
    box(0.78, 0.95, 0.01, ctx.postsCount ? '#fffdf2' : '#efe6d0', 0, -0.47, 0, L);
    for (let k = 0; k < 6; k++) box(0.55 - (k === 5 ? 0.25 : 0), 0.025, 0.012, '#7d8aa6', -0.02, -0.18 - k * 0.1, 0.005, L);
    sphere(0.05, '#c0392b', 0, 0, 0.04, L, 0);
    letters.push(L);
  }
  // desk with envelope + lamp
  const desk = new THREE.Group(); desk.position.set(0.6, 0, 1.2); g.add(desk);
  box(3.6, 0.12, 1.6, '#6b4423', 0, 1.15, 0, desk); for (const [x, z] of [[-1.7, -0.7], [1.7, -0.7], [-1.7, 0.7], [1.7, 0.7]]) box(0.12, 1.15, 0.12, '#55361c', x, 0, z, desk);
  const env = new THREE.Group(); env.position.set(-0.4, 1.28, 0.1); env.rotation.y = 0.3; desk.add(env);
  box(1, 0.03, 0.62, '#efe0bd', 0, 0, 0, env);
  const flap = mesh(new THREE.BufferGeometry().setFromPoints([V(-0.5, 0, -0.31), V(0.5, 0, -0.31), V(0, 0, 0.05)]), mat('#e3d2aa', { side: THREE.DoubleSide }), 0, 0.035, 0, env); flap.geometry.computeVertexNormals();
  sphere(0.06, '#a8322a', 0, 0.04, 0.04, env, 0);
  const pen = cyl(0.025, 0.025, 0.8, '#1d1d28', 0.9, 1.3, 0.2, desk); pen.rotation.z = Math.PI / 2.2;
  const lampL = new THREE.PointLight('#ffc27a', 9, 8, 1.5); lampL.position.set(1.8, 2.6, 0.9); g.add(lampL);
  cone(0.4, 0.35, glow('#ffd59a', 0.6), 1.8, 2.5, 0.9, g, 10); cyl(0.03, 0.03, 1.4, '#2a1d14', 1.8, 1.2, 0.9, g);
  return base({
    group: g, cam: { pos: V(3.6, 3.2, 7.5), target: V(-0.3, 2.1, -1.5) },
    sky: { top: '#1f1915', bottom: '#2b2320' }, fog: 0.04, sun: { color: '#ffd8a8', intensity: 0.7, dir: V(4, 6, 6) }, hemi: { sky: '#ffd7a8', ground: '#2a1a10', intensity: 0.8 },
    clickables: [...letters.map((L, i) => ({ obj: L, action: 'letter:' + i })), { obj: env, action: 'letter:0' }],
    actions: {}, anchors: [V(-2.6, 4.2, -3.2), V(1.6, 4.4, -3.2), V(0.6, 2.4, 1.2)],
    cupSpot: V(1.5, 5.02, -3.3),
    onEnter() { setTimeout(() => ctx.sfx('scribble'), 900); },
    update() {},
  });
}

/* ---------------------------- §8 AI ---------------------------- */
export async function ai(ctx) {
  const g = new THREE.Group();
  const S = ctx.isMobile ? 41 : 61; const span = 26;
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(S * S * 3); const col = new Float32Array(S * S * 3);
  for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) { const k = (i * S + j) * 3; pos[k] = (i / (S - 1) - 0.5) * span; pos[k + 2] = (j / (S - 1) - 0.5) * span; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  // invisible floor so the hidden cup has somewhere to sit
  mesh(new THREE.PlaneGeometry(30, 30).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), 0, 0, 0, g);
  const field = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(field);
  const samples = [[-4, -2, 1.6], [-1, 1, 2.6], [2, -1.5, 1.2], [4.5, 2, 2.2], [0.5, -4, 1.8], [-3, 3.5, 1.1], [3, 4.5, 1.4]];
  for (const [x, z, h] of samples) { cyl(0.04, 0.04, h, glow('#7fd8e6', 1.5), x, 0, z, g, 6); sphere(0.14, glow('#f2c66d', 3), x, h, z, g, 1); }
  const sinc = (x) => (Math.abs(x) < 1e-4 ? 1 : Math.sin(x) / x);
  const c1 = new THREE.Color('#1a3d66'), c2 = new THREE.Color('#7fd8e6'), c3 = new THREE.Color('#f2c66d'), tc = new THREE.Color();
  return base({
    group: g, cam: { pos: V(9, 7.5, 11), target: V(0, 0.8, 0) },
    sky: { top: '#02060f', bottom: '#0a2a38' }, fog: 0.035, sun: { color: '#bdefff', intensity: 0.8, dir: V(3, 8, 4) }, hemi: { sky: '#7fd8e6', ground: '#05101a', intensity: 0.6 },
    anchors: [V(-4, 3, -2), V(4.5, 3.6, 2), V(0, 4, -4)],
    cupSpot: V(4.9, 0.02, 2.4),
    update(t) {
      const p = geo.attributes.position, c = geo.attributes.color;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i); let y = 0;
        for (const [sx, sz, h] of samples) { const d = Math.hypot(x - sx, z - sz); y += h * sinc(d * 1.6 - Math.sin(t * 0.8) * 0.6) * Math.exp(-d * d * 0.02); }
        p.setY(i, y * 0.6); const a = Math.min(1, Math.abs(y) * 0.6); tc.copy(c1).lerp(y > 0 ? c2 : c3, a); c.setXYZ(i, tc.r, tc.g, tc.b);
      }
      p.needsUpdate = true; c.needsUpdate = true;
    },
  });
}

export const BUILDERS = { taiz, sanaa, cairo, lubeck, najran, library, writer, ai };
