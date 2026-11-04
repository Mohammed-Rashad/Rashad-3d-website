// Low-poly kit: one shared material style for every diorama.
import * as THREE from 'three';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.92, metalness: opts.metalness ?? 0, flatShading: opts.flat ?? true, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.ei ?? 1, transparent: !!opts.opacity, opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide, vertexColors: !!opts.vc });
  matCache.set(key, m);
  return m;
}
export const glow = (color, ei = 2) => mat(color, { emissive: color, ei, roughness: 0.5 });

export function mesh(geo, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, typeof material === 'object' && material.isMaterial ? material : mat(material));
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
export const box = (w, h, d, c, x, y, z, p) => mesh(new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z, p);
export const cyl = (rt, rb, h, c, x, y, z, p, seg = 8) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z, p);
export const cone = (r, h, c, x, y, z, p, seg = 6) => mesh(new THREE.ConeGeometry(r, h, seg), c, x, y + h / 2, z, p);
export const sphere = (r, c, x, y, z, p, d = 1) => mesh(new THREE.IcosahedronGeometry(r, d), c, x, y, z, p);

// seeded random
export function rng(seed = 1) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// value noise for terrain
export function noise2(seed = 7) {
  const r = rng(seed); const P = new Float32Array(256 * 256); for (let i = 0; i < P.length; i++) P[i] = r();
  const g = (x, y) => P[((y & 255) << 8) | (x & 255)];
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = s(x - xi), yf = s(y - yi); const a = g(xi, yi), b = g(xi + 1, yi), c = g(xi, yi + 1), d = g(xi + 1, yi + 1); return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; };
}

// faceted terrain with vertex colours
export function terrain({ size = 30, seg = 40, height, color }) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)));
  const g = geo.toNonIndexed(); g.computeVertexNormals();
  const p = g.attributes.position; const cols = new Float32Array(p.count * 3); const c = new THREE.Color();
  for (let i = 0; i < p.count; i += 3) {
    const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3; const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3; const z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    c.set(color(x, y, z)); for (let k = 0; k < 3; k++) c.toArray(cols, (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return new THREE.Mesh(g, mat('#ffffff', { vc: true }));
}

// Yemeni tower house: stacked storeys, white gypsum trim, qamariya half-circle windows
export function towerHouse({ w = 1.6, d = 1.6, floors = 5, fh = 0.8, wall = '#8a5a3c', trim = '#f3eee2', glowWin = false, seed = 1 } = {}) {
  const g = new THREE.Group(); const r = rng(seed);
  const H = floors * fh;
  box(w, H, d, wall, 0, 0, 0, g);
  for (let f = 1; f < floors; f++) box(w + 0.04, 0.07, d + 0.04, trim, 0, f * fh, 0, g); // gypsum bands
  box(w + 0.08, 0.12, d + 0.08, trim, 0, H, 0, g);
  // crenellation
  for (let i = 0; i < 4; i++) box(0.18, 0.2, 0.18, trim, -w / 2 + 0.1 + i * ((w - 0.2) / 3), H + 0.12, d / 2 - 0.08, g);
  const winMat = glowWin ? glow('#ffcf7a', 1.4) : mat('#2b211c');
  for (let f = 1; f < floors; f++) for (const side of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      if (r() < 0.25) continue;
      const x = (k - 0.5) * w * 0.45;
      const win = box(0.26, 0.36, 0.02, winMat, x, f * fh + 0.18, (side * d) / 2 + side * 0.01, g);
      box(0.34, 0.04, 0.03, trim, x, f * fh + 0.56, (side * d) / 2 + side * 0.015, g);
      const q = new THREE.Mesh(new THREE.CircleGeometry(0.13, 8, 0, Math.PI), glowWin ? glow('#ffd9a0', 1.8) : mat(trim));
      q.position.set(x, f * fh + 0.6, (side * d) / 2 + side * 0.02); if (side < 0) q.rotation.y = Math.PI; g.add(q);
      win.userData.win = true;
    }
  }
  return g;
}

export function palm(h = 3, seed = 2) {
  const g = new THREE.Group(); const r = rng(seed);
  const segs = 6; let x = 0, y = 0; const lean = (r() - 0.5) * 0.12;
  for (let i = 0; i < segs; i++) { const s = cyl(0.11, 0.14, h / segs, '#7a5a3a', x, y, 0, g, 6); s.rotation.z = lean; x += Math.sin(-lean) * (h / segs); y += h / segs; }
  const crown = new THREE.Group(); crown.position.set(x, y, 0); g.add(crown);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.6, 3), mat(i % 2 ? '#4f7a3a' : '#5f8c42'));
    leaf.geometry.translate(0, 0.8, 0); leaf.rotation.z = 1.9; leaf.rotation.y = (i / 7) * Math.PI * 2; leaf.scale.set(1, 1, 0.25);
    const piv = new THREE.Group(); piv.rotation.y = (i / 7) * Math.PI * 2; piv.add(leaf); leaf.rotation.set(0, 0, -1.25 - r() * 0.3); crown.add(piv);
  }
  g.userData.crown = crown;
  return g;
}

export function coffeePlant(seed = 3) {
  const g = new THREE.Group(); const r = rng(seed);
  cyl(0.05, 0.07, 0.6, '#5b4030', 0, 0, 0, g, 5);
  for (let i = 0; i < 9; i++) { const s = sphere(0.28 + r() * 0.12, i % 2 ? '#2f6b3a' : '#3c7d44', (r() - 0.5) * 0.7, 0.6 + r() * 0.7, (r() - 0.5) * 0.7, g, 0); s.scale.y = 0.8; }
  for (let i = 0; i < 14; i++) sphere(0.055, '#c0283a', (r() - 0.5) * 0.9, 0.5 + r() * 0.9, (r() - 0.5) * 0.9, g, 0);
  return g;
}

// the hidden Yemeni coffee cup (finjan, no handle) on a small saucer
export function coffeeCup(scale = 1) {
  const g = new THREE.Group();
  const prof = [[0, 0], [0.07, 0], [0.09, 0.02], [0.12, 0.14], [0.125, 0.16], [0.11, 0.16], [0.1, 0.03], [0, 0.03]].map(([x, y]) => new THREE.Vector2(x, y));
  const cup = new THREE.Mesh(new THREE.LatheGeometry(prof, 10), mat('#f5f1e6', { roughness: 0.4 }));
  cup.position.y = 0.02; g.add(cup);
  const coffee = mesh(new THREE.CircleGeometry(0.1, 10).rotateX(-Math.PI / 2), mat('#4a2814', { roughness: 0.3 }), 0, 0.165, 0, g);
  coffee.userData.coffee = true;
  mesh(new THREE.TorusGeometry(0.122, 0.008, 4, 14).rotateX(Math.PI / 2), glow('#e9b949', 0.6), 0, 0.18, 0, g); // gold rim
  mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.02, 12), mat('#f5f1e6', { roughness: 0.4 }), 0, 0.01, 0, g);
  g.scale.setScalar(scale);
  return g;
}

// canvas texture helper
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d'); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData = { canvas: c, ctx };
  return t;
}

// simple particle burst (sparkles, chalk dust)
export function burst(parent, at, { color = '#ffe9a8', n = 40, speed = 1.5, life = 1.2, size = 0.06, gravity = -1 } = {}) {
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3); const vel = [];
  for (let i = 0; i < n; i++) { pos.set([at.x, at.y, at.z], i * 3); const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random())); vel.push(v); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, m); parent.add(pts);
  let t = 0;
  pts.userData.update = (dt) => {
    t += dt; const p = geo.attributes.position;
    for (let i = 0; i < n; i++) { vel[i].y += gravity * dt; p.setXYZ(i, p.getX(i) + vel[i].x * dt, p.getY(i) + vel[i].y * dt, p.getZ(i) + vel[i].z * dt); }
    p.needsUpdate = true; m.opacity = Math.max(0, 1 - t / life);
    if (t > life) { parent.remove(pts); geo.dispose(); m.dispose(); return false; }
    return true;
  };
  return pts;
}
