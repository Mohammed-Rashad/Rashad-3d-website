// §8 — the explorable: aliasing → sinc reconstruction → sinc-Gauss → a tiny neural net.
import { icon } from './icons.mjs';
const trainLabel = (on, lang) => icon(on ? 'pause' : 'play') + ' ' + (on ? (lang() === 'ar' ? 'إيقاف' : 'Pause') : (lang() === 'ar' ? 'درّب' : 'Train'));
const sinc = (x) => (Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
const COL = { bg: '#12142e', grid: 'rgba(255,255,255,0.07)', axis: 'rgba(255,255,255,0.25)', gold: '#f2c66d', cyan: '#7fd8e6', red: '#ff7a6b', text: '#c9cbe8' };

function setupCanvas(cv) {
  const dpr = Math.min(2, devicePixelRatio); const ctx = cv.getContext('2d');
  const ratio = cv.height / cv.width;
  const o = { ctx, dpr, W: 0, H: 0 };
  const fit = () => { const w = cv.clientWidth || cv.width; cv.width = w * dpr; cv.height = w * ratio * dpr; o.W = cv.width; o.H = cv.height; };
  fit(); new ResizeObserver(() => { fit(); o.onresize && o.onresize(); }).observe(cv);
  return o;
}
const font = (o, px, style = '') => `${style} ${px * o.dpr}px "CMU Serif", Georgia, serif`;

/* ---------------- 1. aliasing wheel ---------------- */
function aliasing(root, { sfx, reduced, lang }) {
  const cv = root.querySelector('canvas'); const o = setupCanvas(cv); const { ctx } = o;
  const slider = root.querySelector('input'); const out = root.querySelector('output');
  const F0 = 5; const SLOW = 0.2; // the wheel turns 5 rev/s in "story time", shown at 1/5 speed
  let fs = +slider.value, t = 0, last = null, visible = false, lastSample = -1;
  slider.addEventListener('input', () => { fs = +slider.value; out.textContent = fs; sfx('blip', true); draw(); });
  const apparent = () => { const a = F0 - fs * Math.round(F0 / fs); return a; };
  function draw() {
    const { W, H, dpr } = o; ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
    const sampleIdx = Math.floor(t * fs); const ts = sampleIdx / fs;
    const ang = 2 * Math.PI * F0 * ts;
    // wheel
    const cx = W * 0.2, cy = H * 0.5, R = Math.min(W * 0.16, H * 0.38);
    ctx.strokeStyle = '#555c9a'; ctx.lineWidth = 6 * dpr; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 6; k++) { const a = ang + (k * Math.PI) / 3; ctx.strokeStyle = k === 0 ? COL.gold : '#3a4080'; ctx.lineWidth = (k === 0 ? 4 : 2) * dpr; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy - Math.sin(a) * R); ctx.stroke(); }
    ctx.fillStyle = COL.gold; ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * R, cy - Math.sin(ang) * R, 7 * dpr, 0, Math.PI * 2); ctx.fill();
    const ap = apparent();
    ctx.fillStyle = COL.text; ctx.font = font(o, 13); ctx.textAlign = 'center';
    const L = lang() === 'ar';
    const msg = Math.abs(ap) < 0.05 ? (L ? 'تبدو متوقفة!' : 'looks frozen!') : ap < 0 ? (L ? `تبدو كأنها تدور إلى الخلف: ${ap.toFixed(1)} دورة/ث` : `appears to spin backwards: ${ap.toFixed(1)} rev/s`) : (L ? `السرعة الظاهرة: ${ap.toFixed(1)} دورة/ث` : `appears: +${ap.toFixed(1)} rev/s`);
    ctx.fillStyle = ap < 0 || Math.abs(ap) < 0.05 ? COL.red : COL.cyan; ctx.fillText(msg, cx, H - 14 * dpr);
    ctx.fillStyle = COL.text; ctx.fillText(L ? `السرعة الحقيقية: ${F0} دورة/ث` : `truth: +${F0} rev/s`, cx, 20 * dpr);
    // signal plot: true sine (height of the marked spoke) + samples + alias
    const x0 = W * 0.42, x1 = W - 16 * dpr, yc = H * 0.5, A = H * 0.32; const span = 1; // one second
    ctx.strokeStyle = COL.axis; ctx.lineWidth = 1 * dpr; ctx.beginPath(); ctx.moveTo(x0, yc); ctx.lineTo(x1, yc); ctx.stroke();
    const X = (tt) => x0 + (tt / span) * (x1 - x0);
    ctx.strokeStyle = 'rgba(127,216,230,0.45)'; ctx.lineWidth = 1.5 * dpr; ctx.beginPath();
    for (let i = 0; i <= 400; i++) { const tt = (i / 400) * span; const y = yc - Math.sin(2 * Math.PI * F0 * tt) * A; i ? ctx.lineTo(X(tt), y) : ctx.moveTo(X(tt), y); } ctx.stroke();
    if (fs < 2 * F0) { ctx.strokeStyle = COL.red; ctx.setLineDash([6 * dpr, 4 * dpr]); ctx.beginPath(); for (let i = 0; i <= 400; i++) { const tt = (i / 400) * span; const y = yc - Math.sin(2 * Math.PI * ap * tt) * A; i ? ctx.lineTo(X(tt), y) : ctx.moveTo(X(tt), y); } ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = COL.gold; for (let n = 0; n <= fs * span; n++) { const tt = n / fs; const y = yc - Math.sin(2 * Math.PI * F0 * tt) * A; ctx.beginPath(); ctx.arc(X(tt), y, 3.5 * dpr, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = COL.text; ctx.textAlign = 'left'; ctx.font = font(o, 12);
    ctx.fillText(fs >= 2 * F0 ? (L ? 'العيّنات كافية (≥ ضعف التردد)' : 'enough samples (≥ 2× frequency)') : (L ? 'تعرّج: المنحنى الأحمر يمرّ بالعيّنات نفسها' : 'aliasing: the red curve fits the same samples'), x0, 20 * dpr);
    if (sampleIdx !== lastSample) { lastSample = sampleIdx; }
  }
  function loop(ts) { if (!visible) { last = null; return; } if (last != null) t += ((ts - last) / 1000) * SLOW; last = ts; draw(); requestAnimationFrame(loop); }
  o.onresize = draw; draw();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting && !reduced; if (visible) requestAnimationFrame(loop); }).observe(cv);
  if (reduced) { // calm mode: step on click instead of auto-animating
    cv.addEventListener('click', () => { t += 1 / fs; draw(); });
  }
}

/* ---------------- shared samples for 2 & 4 ---------------- */
const NS = 15; // t = 0..14
export const store = { v: [null, 0.2, 0.6, 0.9, 0.55, null, -0.3, -0.5, null, 0.1, 0.7, 0.4, null, -0.2, null], listeners: new Set() };
const changed = () => store.listeners.forEach((f) => f());
const recon = (t) => { let s = 0; for (let n = 0; n < NS; n++) if (store.v[n] != null) s += store.v[n] * sinc(t - n); return s; };

/* ---------------- 2. click-to-sample reconstruction ---------------- */
function reconstruction(root, { sfx }) {
  const cv = root.querySelector('canvas'); const o = setupCanvas(cv); const { ctx } = o;
  const showTerms = root.querySelector('[data-w=terms]');
  const mx = () => 24 * o.dpr;
  const X = (t) => mx() + ((t + 0.5) / NS) * (o.W - 2 * mx());
  const T = (px) => ((px - mx()) / (o.W - 2 * mx())) * NS - 0.5;
  const Y = (v) => o.H * 0.5 - v * o.H * 0.36;
  const Vv = (py) => Math.max(-1.2, Math.min(1.2, (o.H * 0.5 - py) / (o.H * 0.36)));
  function draw() {
    const { W, H, dpr } = o; ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
    for (let n = 0; n < NS; n++) { ctx.strokeStyle = COL.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(n), 10 * dpr); ctx.lineTo(X(n), H - 10 * dpr); ctx.stroke(); }
    ctx.strokeStyle = COL.axis; ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.stroke();
    if (showTerms.checked) for (let n = 0; n < NS; n++) { const v = store.v[n]; if (v == null) continue; ctx.strokeStyle = 'rgba(127,216,230,0.3)'; ctx.lineWidth = 1 * dpr; ctx.beginPath(); for (let px = 0; px <= W; px += 3 * dpr) { const y = Y(v * sinc(T(px) - n)); px ? ctx.lineTo(px, y) : ctx.moveTo(px, y); } ctx.stroke(); }
    ctx.save(); ctx.shadowColor = COL.gold; ctx.shadowBlur = 8 * dpr; ctx.strokeStyle = COL.gold; ctx.lineWidth = 2.5 * dpr; ctx.beginPath();
    for (let px = 0; px <= W; px += 2 * dpr) { const y = Y(recon(T(px))); px ? ctx.lineTo(px, y) : ctx.moveTo(px, y); } ctx.stroke(); ctx.restore();
    for (let n = 0; n < NS; n++) { const v = store.v[n]; if (v == null) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(X(n), Y(0), 2.5 * dpr, 0, 7); ctx.fill(); continue; } ctx.strokeStyle = 'rgba(242,198,109,0.6)'; ctx.beginPath(); ctx.moveTo(X(n), Y(0)); ctx.lineTo(X(n), Y(v)); ctx.stroke(); ctx.fillStyle = '#fff1c4'; ctx.beginPath(); ctx.arc(X(n), Y(v), 5.5 * dpr, 0, 7); ctx.fill(); }
  }
  let drag = null;
  const at = (e) => { const r = cv.getBoundingClientRect(); return { px: (e.clientX - r.left) * o.dpr, py: (e.clientY - r.top) * o.dpr }; };
  cv.addEventListener('pointerdown', (e) => { const { px, py } = at(e); const n = Math.round(T(px)); if (n < 0 || n >= NS) return; if (store.v[n] != null && Math.abs(Y(store.v[n]) - py) < 14 * o.dpr && e.shiftKey) { store.v[n] = null; } else { store.v[n] = Vv(py); drag = n; cv.setPointerCapture(e.pointerId); } sfx('blip', true); changed(); });
  cv.addEventListener('pointermove', (e) => { if (drag == null) return; store.v[drag] = Vv(at(e).py); changed(); });
  cv.addEventListener('pointerup', () => (drag = null));
  cv.addEventListener('dblclick', (e) => { const n = Math.round(T(at(e).px)); if (n >= 0 && n < NS) { store.v[n] = null; changed(); } });
  root.querySelector('[data-w=clear]').addEventListener('click', () => { store.v.fill(null); changed(); });
  root.querySelector('[data-w=random]').addEventListener('click', () => { for (let n = 0; n < NS; n++) store.v[n] = Math.random() < 0.75 ? +(Math.random() * 1.8 - 0.9).toFixed(2) : null; sfx('blip', true); changed(); });
  showTerms.addEventListener('change', draw);
  store.listeners.add(draw); o.onresize = draw; draw();
}

/* ---------------- 3. Gaussian multiplier: polynomial vs exponential ---------------- */
function gauss(root, { sfx, lang }) {
  const cv = root.querySelector('canvas'); const o = setupCanvas(cv); const { ctx } = o;
  const slider = root.querySelector('input[type=range]'); const out = root.querySelector('output'); const tog = root.querySelector('[data-w=gauss]');
  // f(t) = sinc^2(t/3): bandlimited with sigma = 2π/3 < π (h = 1)
  const f = (t) => sinc(t / 3) ** 2; const sigma = (2 * Math.PI) / 3; const alpha = (Math.PI - sigma) / 2;
  const approx = (t, N, useG) => { const n0 = Math.floor(t); let s = 0; for (let n = n0 - N + 1; n <= n0 + N; n++) { let term = f(n) * sinc(t - n); if (useG) term *= Math.exp((-alpha * (t - n) ** 2) / N); s += term; } return s; };
  const errCache = {};
  const maxErr = (N, useG) => { const k = N + (useG ? 'g' : 'c'); if (errCache[k] != null) return errCache[k]; let m = 0; for (let i = 0; i <= 48; i++) { const t = 0.5 + i / 48 * 0.999; m = Math.max(m, Math.abs(f(t) - approx(t, N, useG))); } return (errCache[k] = m); };
  function draw() {
    const { W, H, dpr } = o; const N = +slider.value; const useG = tog.checked; const L = lang() === 'ar';
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
    // left: function + reconstruction on [-9, 9]
    const lx0 = 14 * dpr, lx1 = W * 0.56, ly0 = 26 * dpr, ly1 = H - 30 * dpr;
    const X = (t) => lx0 + ((t + 9) / 18) * (lx1 - lx0), Y = (v) => ly1 - (v + 0.15) / 1.3 * (ly1 - ly0);
    ctx.strokeStyle = COL.axis; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx0, Y(0)); ctx.lineTo(lx1, Y(0)); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); for (let i = 0; i <= 300; i++) { const t = -9 + (i / 300) * 18; i ? ctx.lineTo(X(t), Y(f(t))) : ctx.moveTo(X(t), Y(f(t))); } ctx.stroke();
    ctx.strokeStyle = useG ? COL.gold : COL.cyan; ctx.lineWidth = 2.2 * dpr; ctx.beginPath(); for (let i = 0; i <= 300; i++) { const t = -9 + (i / 300) * 18; const v = approx(t, N, useG); i ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v)); } ctx.stroke();
    // error band magnified
    ctx.fillStyle = useG ? 'rgba(242,198,109,0.35)' : 'rgba(127,216,230,0.35)';
    for (let i = 0; i <= 150; i++) { const t = -9 + (i / 150) * 18; const e = (approx(t, N, useG) - f(t)) * 200; ctx.fillRect(X(t), ly1 + 14 * dpr, 2 * dpr, -Math.max(-12 * dpr, Math.min(12 * dpr, e * dpr))); }
    ctx.fillStyle = COL.text; ctx.font = font(o, 12); ctx.textAlign = 'left';
    ctx.fillText(L ? `إعادة البناء من 2N = ${2 * N} عيّنة` : `reconstruction from 2N = ${2 * N} samples`, lx0, 16 * dpr);
    ctx.fillText(L ? 'الخطأ ×٢٠٠' : 'error ×200', lx0, H - 4 * dpr);
    // right: log error vs N
    const rx0 = W * 0.63, rx1 = W - 12 * dpr, ry0 = 26 * dpr, ry1 = H - 30 * dpr;
    const lo = -9, hi = 0; const RX = (n) => rx0 + ((n - 2) / 22) * (rx1 - rx0); const RY = (e) => ry0 + ((hi - Math.log10(Math.max(1e-12, e))) / (hi - lo)) * (ry1 - ry0);
    ctx.strokeStyle = COL.axis; ctx.beginPath(); ctx.moveTo(rx0, ry0); ctx.lineTo(rx0, ry1); ctx.lineTo(rx1, ry1); ctx.stroke();
    ctx.fillStyle = COL.text; ctx.font = font(o, 10); ctx.textAlign = 'right'; for (let p = 0; p >= lo; p -= 3) { ctx.fillText(`1e${p}`, rx0 - 4 * dpr, RY(10 ** p) + 3 * dpr); ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(rx0, RY(10 ** p)); ctx.lineTo(rx1, RY(10 ** p)); ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.fillText('N', (rx0 + rx1) / 2, H - 8 * dpr);
    for (const [g, c, label] of [[false, COL.cyan, L ? 'التقليدي (حدودي)' : 'classical (polynomial)'], [true, COL.gold, L ? 'sinc-Gauss (أُسّي)' : 'sinc-Gauss (exponential)']]) {
      ctx.strokeStyle = c; ctx.lineWidth = 2 * dpr; ctx.beginPath(); for (let n = 2; n <= 24; n++) { const y = RY(maxErr(n, g)); n === 2 ? ctx.moveTo(RX(n), y) : ctx.lineTo(RX(n), y); } ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(RX(N), RY(maxErr(N, g)), (g === useG ? 5 : 3) * dpr, 0, 7); ctx.fill();
      ctx.textAlign = 'right'; ctx.font = font(o, 11); ctx.fillText(label, rx1, (g ? RY(maxErr(20, true)) + 16 * dpr : RY(maxErr(20, false)) - 8 * dpr));
    }
    ctx.fillStyle = COL.text; ctx.textAlign = 'left'; ctx.font = font(o, 12);
    ctx.fillText((L ? 'أقصى خطأ: ' : 'max error: ') + maxErr(N, useG).toExponential(1), rx0 + 6 * dpr, 16 * dpr);
  }
  slider.addEventListener('input', () => { out.textContent = slider.value; sfx('blip', true); draw(); });
  tog.addEventListener('change', draw); o.onresize = draw; draw();
  return { redraw: draw };
}

/* ---------------- 4. a tiny MLP (hand-rolled, Adam) ---------------- */
function mlp(root, { sfx, loopSfx, lang }) {
  const cv = root.querySelector('canvas'); const o = setupCanvas(cv); const { ctx } = o;
  const lossEl = root.querySelector('.loss'); const trainBtn = root.querySelector('[data-w=train]');
  const H1 = 20, H2 = 20;
  let net, adam, step = 0, training = false;
  const randn = () => Math.sqrt(-2 * Math.log(Math.random() + 1e-12)) * Math.cos(2 * Math.PI * Math.random());
  function init() {
    const P = (n, s) => Float64Array.from({ length: n }, () => randn() * s);
    net = { W1: P(H1, 2.5), b1: P(H1, 0.5), W2: P(H1 * H2, 1 / Math.sqrt(H1)), b2: new Float64Array(H2), W3: P(H2, 1 / Math.sqrt(H2)), b3: new Float64Array(1) };
    adam = {}; for (const k in net) adam[k] = { m: new Float64Array(net[k].length), v: new Float64Array(net[k].length) };
    step = 0;
  }
  const xin = (t) => (t / (NS - 1)) * 2 - 1;
  function forward(x, cache) {
    const a1 = new Float64Array(H1), a2 = new Float64Array(H2);
    for (let i = 0; i < H1; i++) a1[i] = Math.tanh(net.W1[i] * x + net.b1[i]);
    for (let j = 0; j < H2; j++) { let s = net.b2[j]; for (let i = 0; i < H1; i++) s += net.W2[j * H1 + i] * a1[i]; a2[j] = Math.tanh(s); }
    let y = net.b3[0]; for (let j = 0; j < H2; j++) y += net.W3[j] * a2[j];
    if (cache) { cache.a1 = a1; cache.a2 = a2; }
    return y;
  }
  function trainStep(data, lr = 0.01) {
    const g = {}; for (const k in net) g[k] = new Float64Array(net[k].length); let loss = 0;
    for (const [x, t] of data) {
      const c = {}; const y = forward(x, c); const d = (2 * (y - t)) / data.length; loss += (y - t) ** 2 / data.length;
      g.b3[0] += d; const d2 = new Float64Array(H2);
      for (let j = 0; j < H2; j++) { g.W3[j] += d * c.a2[j]; d2[j] = d * net.W3[j] * (1 - c.a2[j] ** 2); }
      const d1 = new Float64Array(H1);
      for (let j = 0; j < H2; j++) { g.b2[j] += d2[j]; for (let i = 0; i < H1; i++) { g.W2[j * H1 + i] += d2[j] * c.a1[i]; d1[i] += d2[j] * net.W2[j * H1 + i]; } }
      for (let i = 0; i < H1; i++) { const di = d1[i] * (1 - c.a1[i] ** 2); g.W1[i] += di * x; g.b1[i] += di; }
    }
    step++; const b1 = 0.9, b2 = 0.999;
    for (const k in net) { const p = net[k], m = adam[k].m, v = adam[k].v, gr = g[k]; for (let i = 0; i < p.length; i++) { m[i] = b1 * m[i] + (1 - b1) * gr[i]; v[i] = b2 * v[i] + (1 - b2) * gr[i] ** 2; p[i] -= (lr * (m[i] / (1 - b1 ** step))) / (Math.sqrt(v[i] / (1 - b2 ** step)) + 1e-8); } }
    return loss;
  }
  const data = () => store.v.map((v, n) => (v == null ? null : [xin(n), v])).filter(Boolean);
  const mx = () => 24 * o.dpr; const X = (t) => mx() + ((t + 0.5) / NS) * (o.W - 2 * mx()); const T = (px) => ((px - mx()) / (o.W - 2 * mx())) * NS - 0.5; const Y = (v) => o.H * 0.5 - v * o.H * 0.36;
  let lastLoss = null;
  function draw() {
    const { W, H, dpr } = o; const L = lang() === 'ar'; ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = COL.axis; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.stroke();
    ctx.strokeStyle = COL.gold; ctx.lineWidth = 2 * dpr; ctx.globalAlpha = 0.85; ctx.beginPath(); for (let px = 0; px <= W; px += 2 * dpr) { const y = Y(recon(T(px))); px ? ctx.lineTo(px, y) : ctx.moveTo(px, y); } ctx.stroke(); ctx.globalAlpha = 1;
    if (step > 0) { ctx.strokeStyle = COL.cyan; ctx.lineWidth = 2.4 * dpr; ctx.setLineDash([7 * dpr, 4 * dpr]); ctx.beginPath(); for (let px = 0; px <= W; px += 2 * dpr) { const y = Y(Math.max(-2, Math.min(2, forward(xin(T(px)))))); px ? ctx.lineTo(px, y) : ctx.moveTo(px, y); } ctx.stroke(); ctx.setLineDash([]); }
    for (let n = 0; n < NS; n++) { const v = store.v[n]; if (v == null) continue; ctx.fillStyle = '#fff1c4'; ctx.beginPath(); ctx.arc(X(n), Y(v), 5 * dpr, 0, 7); ctx.fill(); }
    ctx.font = font(o, 12); ctx.textAlign = 'left'; ctx.fillStyle = COL.gold; ctx.fillText(L ? '— sinc (المبرهنة)' : '— sinc (the theorem)', 12 * dpr, 18 * dpr); ctx.fillStyle = COL.cyan; ctx.fillText(L ? '- - الشبكة العصبية' : '- - neural network', 12 * dpr, 34 * dpr);
  }
  function loop() {
    if (!training) return;
    const d = data(); if (d.length < 2) { training = false; trainBtn.innerHTML = trainLabel(false, lang); return; }
    let loss = 0; for (let k = 0; k < 25; k++) loss = trainStep(d);
    lastLoss = loss; lossEl.textContent = `step ${step} · loss ${loss.toExponential(2)}`;
    draw(); if (step > 6000 || loss < 2e-5) { training = false; loopSfx('hum', false); trainBtn.innerHTML = trainLabel(false, lang); return; }
    requestAnimationFrame(loop);
  }
  trainBtn.addEventListener('click', () => { training = !training; trainBtn.innerHTML = trainLabel(training, lang); loopSfx('hum', training); if (training) loop(); });
  root.querySelector('[data-w=reset]').addEventListener('click', () => { init(); lossEl.textContent = ''; draw(); });
  init(); store.listeners.add(draw); o.onresize = draw; draw();
}

export function initExplorable(opts) {
  const q = (id) => document.getElementById(id);
  aliasing(q('w-alias'), opts); reconstruction(q('w-recon'), opts); const g = gauss(q('w-gauss'), opts); mlp(q('w-mlp'), opts);
  return { redraw() { g.redraw(); store.listeners.forEach((f) => f()); } };
}
