// Stylized low-poly globe with glowing arcs Taiz → Sana'a → Cairo → Lübeck → Najran.
import * as THREE from 'three';
import { CHAPTERS, PLACES } from '../chapters.mjs';

export const R = 4;
// very coarse continent outlines [lon, lat]
const LAND = [
  [[-17, 21], [-16, 12], [-8, 5], [5, 5], [9, 4], [10, -2], [13, -8], [12, -17], [18, -34], [26, -34], [33, -26], [40, -15], [40, -5], [51, 11], [43, 12], [37, 18], [32, 31], [20, 32], [10, 37], [-6, 36], [-10, 30]],
  [[34, 29], [39, 22], [43, 13], [45, 13], [52, 16], [59, 22], [56, 26], [51, 24], [48, 30], [45, 30], [36, 32]],
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [5, 53], [8, 54], [8, 57], [10, 59], [5, 62], [15, 69], [25, 71], [40, 68], [60, 70], [60, 45], [40, 41], [28, 41], [26, 38], [22, 37], [19, 40], [13, 45], [12, 42], [16, 38], [8, 44], [3, 43], [-1, 37]],
  [[-5, 50], [2, 51], [0, 54], [-3, 58], [-6, 56]],
  [[26, 40], [36, 36], [44, 38], [48, 30], [56, 26], [62, 25], [67, 24], [72, 20], [77, 8], [80, 15], [88, 22], [92, 20], [98, 16], [104, 1], [106, 10], [109, 21], [122, 31], [122, 40], [130, 43], [142, 48], [140, 60], [160, 62], [180, 66], [180, 72], [110, 77], [60, 75], [60, 45], [40, 41]],
  [[-168, 66], [-160, 59], [-135, 58], [-124, 48], [-117, 32], [-105, 20], [-95, 16], [-83, 9], [-80, 8], [-81, 25], [-76, 35], [-70, 42], [-60, 46], [-55, 52], [-62, 58], [-75, 62], [-80, 73], [-120, 72], [-140, 70]],
  [[-80, 8], [-76, -5], [-81, -6], [-75, -15], [-70, -18], [-73, -40], [-75, -52], [-68, -55], [-65, -45], [-57, -37], [-48, -27], [-39, -16], [-35, -6], [-50, 0], [-60, 9], [-72, 12]],
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [140, -38], [132, -32], [115, -34]],
  [[-50, 60], [-42, 60], [-20, 70], [-18, 80], [-60, 82], [-68, 76], [-54, 68]],
  [[44, -25], [50, -15], [49, -12], [44, -17]],
  [[130, 31], [141, 36], [142, 44], [138, 40]],
  [[95, 5], [105, -6], [115, -8], [118, 0], [110, 2]],
];

export function latLonToVec(lat, lon, r = R) {
  const phi = ((90 - lat) * Math.PI) / 180, th = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}

function landMask() {
  const c = document.createElement('canvas'); c.width = 720; c.height = 360; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 720, 360); g.fillStyle = '#fff';
  for (const poly of LAND) { g.beginPath(); poly.forEach(([lo, la], i) => { const x = (lo + 180) * 2, y = (90 - la) * 2; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); }
  g.fillRect(0, 330, 720, 30); // antarctica
  const d = g.getImageData(0, 0, 720, 360).data;
  return (lat, lon) => { const x = Math.min(719, Math.max(0, Math.floor((lon + 180) * 2))), y = Math.min(359, Math.max(0, Math.floor((90 - lat) * 2))); return d[(y * 720 + x) * 4] > 128; };
}

export function buildGlobe(isMobile) {
  const group = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(R, isMobile ? 14 : 22);
  const pos = geo.attributes.position; const cols = new Float32Array(pos.count * 3);
  const isLand = landMask(); const v = new THREE.Vector3(); const c = new THREE.Color();
  const ocean = [new THREE.Color('#1b2a6b'), new THREE.Color('#22357e')], land = [new THREE.Color('#c9a46a'), new THREE.Color('#b88d55'), new THREE.Color('#8fa25f')];
  for (let i = 0; i < pos.count; i += 3) {
    v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(pos, i + k)); v.divideScalar(3).normalize();
    const lat = 90 - (Math.acos(v.y) * 180) / Math.PI; let lon = (Math.atan2(v.z, -v.x) * 180) / Math.PI - 180; if (lon < -180) lon += 360;
    const h = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    if (isLand(lat, lon)) { c.copy(lat < -65 || lat > 72 ? new THREE.Color('#e8ecf2') : Math.abs(lat) > 45 ? land[2] : land[h > 0.5 ? 0 : 1]); for (let k = 0; k < 3; k++) { const p = new THREE.Vector3().fromBufferAttribute(pos, i + k).multiplyScalar(1.012); pos.setXYZ(i + k, p.x, p.y, p.z); } }
    else c.copy(ocean[h > 0.5 ? 0 : 1]);
    for (let k = 0; k < 3; k++) c.toArray(cols, (i + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const globe = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
  group.add(globe);

  // atmosphere
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 48, 32), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { c: { value: new THREE.Color('#6f8cff') } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 c; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(vN,vV)),2.5); gl_FragColor=vec4(c*f*1.6, f); }',
  }));
  group.add(atmo);

  // pins
  const pins = {};
  for (const id of PLACES) {
    const ch = CHAPTERS.find((c) => c.id === id);
    const p = latLonToVec(ch.place.lat, ch.place.lon, R * 1.015);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(ch.accent).multiplyScalar(2.2) }));
    pin.position.copy(p); group.add(pin);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.12, 24), new THREE.MeshBasicMaterial({ color: '#ffe7a3', transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    ring.position.copy(p); ring.lookAt(p.clone().multiplyScalar(2)); group.add(ring);
    pins[id] = { pin, ring, pos: p, title: ch.title };
  }

  // arcs between consecutive places
  const arcs = [];
  for (let i = 0; i < PLACES.length - 1; i++) {
    const a = pins[PLACES[i]].pos, b = pins[PLACES[i + 1]].pos;
    const mid = a.clone().add(b).multiplyScalar(0.5); const dist = a.distanceTo(b);
    mid.normalize().multiplyScalar(R * (1.02 + Math.max(0.06, dist * 0.18)));
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const tube = new THREE.TubeGeometry(curve, 64, 0.018, 5, false);
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color('#f2c66d').multiplyScalar(2.4), transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(tube, m); mesh.geometry.setDrawRange(0, 0); group.add(mesh);
    arcs.push({ from: PLACES[i], to: PLACES[i + 1], mesh, count: tube.index.count, p: 0 });
  }
  const setArc = (arc, p) => { arc.p = p; const n = Math.floor((arc.count / 3) * p) * 3; arc.mesh.geometry.setDrawRange(0, n); };
  const arcBetween = (a, b) => arcs.find((x) => (x.from === a && x.to === b) || (x.from === b && x.to === a));

  let t = 0;
  return {
    group, pins, arcs, setArc, arcBetween,
    update(dt) { t += dt; for (const id in pins) { const s = 1 + 0.35 * Math.sin(t * 2.4 + id.length); pins[id].ring.scale.setScalar(s); pins[id].ring.material.opacity = 0.9 - 0.4 * (s - 0.65); } },
  };
}
