// The life curve: chapters are sample points; sinc lobes bloom as you scroll and the curve reconstructs.
import { CHAPTERS } from './chapters.mjs';

export const SAMPLES = CHAPTERS.filter((c) => c.sample != null).map((c) => ({ id: c.id, n: c.n, y: c.sample, accent: c.accent, label: c.title }));
const sinc = (x) => (Math.abs(x) < 1e-6 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));

// draw the curve into ctx. progress = continuous chapter index (1 = §1 ... 8 = §8, 9 = conclusion)
export function drawCurve(ctx, W, H, progress, { lang = 'en', envelope = 0, dpr = 1, labels = true, annaby = true, pad = 28 } = {}) {
  ctx.clearRect(0, 0, W, H);
  const K = SAMPLES.length; const m = pad * dpr; const top = 12 * dpr, bot = H - (labels ? 22 : 8) * dpr;
  const X = (k) => m + (k / (K - 1)) * (W - 2 * m); // k in sample index space (0..K-1)
  const Y = (v) => bot - (v * 0.78 + 0.08) * (bot - top);
  const bloom = SAMPLES.map((s, k) => Math.max(0, Math.min(1, progress - s.n + 1)));
  const head = Math.min(K - 1 + 0.6, Math.max(-0.6, progress - 1));
  const sigma = 2.2; // Gaussian multiplier width (in samples)
  const f = (u) => { let s = 0; for (let k = 0; k < K; k++) { const w = envelope > 0 ? 1 - envelope + envelope * Math.exp(-((u - k) ** 2) / (2 * sigma * sigma)) : 1; s += bloom[k] * SAMPLES[k].y * sinc(u - k) * w; } return s; };
  // baseline
  ctx.strokeStyle = 'rgba(242,198,109,0.18)'; ctx.lineWidth = 1 * dpr; ctx.beginPath(); ctx.moveTo(m * 0.4, Y(0)); ctx.lineTo(W - m * 0.4, Y(0)); ctx.stroke();
  // individual sinc lobes
  for (let k = 0; k < K; k++) {
    if (!bloom[k]) continue;
    ctx.strokeStyle = SAMPLES[k].accent; ctx.globalAlpha = 0.28 * bloom[k] * (1 - envelope * 0.6); ctx.lineWidth = 1.2 * dpr; ctx.beginPath();
    for (let px = 0; px <= W; px += 3 * dpr) { const u = ((px - m) / (W - 2 * m)) * (K - 1); const v = SAMPLES[k].y * sinc(u - k) * bloom[k]; px ? ctx.lineTo(px, Y(v)) : ctx.moveTo(px, Y(v)); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // gaussian envelope "family"
  if (envelope > 0) {
    ctx.save(); ctx.globalAlpha = envelope; ctx.setLineDash([5 * dpr, 5 * dpr]); ctx.strokeStyle = '#fff1c4'; ctx.lineWidth = 1.4 * dpr; ctx.beginPath();
    const c = (K - 1) / 2; const amp = 1.0;
    for (let px = 0; px <= W; px += 3 * dpr) { const u = ((px - m) / (W - 2 * m)) * (K - 1); const v = amp * Math.exp(-((u - c) ** 2) / (2 * 2.6 * 2.6)); px ? ctx.lineTo(px, Y(v)) : ctx.moveTo(px, Y(v)); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#fff1c4'; ctx.font = `italic ${15 * dpr}px "CMU Serif", Georgia, serif`; ctx.textAlign = 'center';
    ctx.fillText(lang === 'ar' ? 'العائلة' : 'family', X(c), Y(1.0) - 6 * dpr); ctx.restore();
  }
  // the reconstructed curve, drawn up to the head
  const headPx = X(head);
  ctx.save(); ctx.shadowColor = '#f2c66d'; ctx.shadowBlur = 12 * dpr; ctx.strokeStyle = '#f2c66d'; ctx.lineWidth = 2.4 * dpr; ctx.beginPath();
  let first = true;
  for (let px = 0; px <= Math.min(W, headPx); px += 2 * dpr) { const u = ((px - m) / (W - 2 * m)) * (K - 1); const v = f(u); first ? ctx.moveTo(px, Y(v)) : ctx.lineTo(px, Y(v)); first = false; }
  ctx.stroke(); ctx.restore();
  // head
  const hv = f(head);
  ctx.fillStyle = '#fff1c4'; ctx.shadowColor = '#f2c66d'; ctx.shadowBlur = 16 * dpr; ctx.beginPath(); ctx.arc(headPx, Y(hv), 3.6 * dpr, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  // Annaby — a faint co-author dot that follows from §3 on
  if (annaby && progress > 2.6) {
    const a = Math.min(1, (progress - 2.6) * 2) * (0.55 + 0.25 * Math.sin(progress * 5));
    const u = Math.max(2, head - 0.45); const av = f(u);
    ctx.globalAlpha = a; ctx.fillStyle = '#3bb3a3'; ctx.beginPath(); ctx.arc(X(u), Y(av) - 7 * dpr, 2.6 * dpr, 0, Math.PI * 2); ctx.fill();
    ctx.font = `${10 * dpr}px "CMU Serif", Georgia, serif`; ctx.textAlign = 'center'; ctx.fillText(lang === 'ar' ? 'عنّابي' : 'Annaby', X(u), Y(av) - 13 * dpr); ctx.globalAlpha = 1;
  }
  // sample points + labels
  for (let k = 0; k < K; k++) {
    const b = bloom[k]; const x = X(k), y = Y(SAMPLES[k].y);
    ctx.strokeStyle = `rgba(242,198,109,${0.25 + 0.5 * b})`; ctx.lineWidth = 1 * dpr; ctx.beginPath(); ctx.moveTo(x, Y(0)); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = b > 0 ? SAMPLES[k].accent : 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.arc(x, y, (2.5 + 2 * b) * dpr, 0, Math.PI * 2); ctx.fill();
    if (labels) { ctx.fillStyle = `rgba(246,239,224,${0.35 + 0.55 * b})`; ctx.font = `${10.5 * dpr}px "CMU Serif", Georgia, serif`; ctx.textAlign = 'center'; const t = SAMPLES[k].label[lang].split(':')[0]; ctx.fillText(`§${SAMPLES[k].n} ${W < 700 * dpr ? '' : t}`, x, H - 6 * dpr); }
  }
}

export function lifeCurve(canvas, getLang) {
  const ctx = canvas.getContext('2d'); let progress = 0, raf = 0, W = 0, H = 0, dpr = 1;
  const size = () => { dpr = Math.min(2, devicePixelRatio); W = canvas.width = canvas.clientWidth * dpr; H = canvas.height = canvas.clientHeight * dpr; draw(); };
  const draw = () => { raf = 0; drawCurve(ctx, W, H, progress, { lang: getLang(), dpr }); };
  addEventListener('resize', size); size();
  return { set(p) { if (Math.abs(p - progress) < 0.002) return; progress = p; if (!raf) raf = requestAnimationFrame(draw); }, redraw: draw };
}

// §9: everything lights up and converges under the "family" envelope
export function finalCurve(canvas, getLang, { calm, onLit }) {
  const ctx = canvas.getContext('2d'); let t0 = null, done = false;
  const dpr = Math.min(2, devicePixelRatio);
  const fit = () => { canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientWidth * dpr * (320 / 900); };
  fit(); addEventListener('resize', () => { fit(); render(done ? 1 : 0); });
  function render(p) {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#12142e'; ctx.fillRect(0, 0, W, H);
    drawCurve(ctx, W, H, 1 + p * 8.6, { lang: getLang(), envelope: Math.max(0, (p - 0.65) / 0.35), dpr, pad: 40, annaby: false });
    if (p >= 1) { ctx.fillStyle = '#f2c66d'; ctx.font = `italic ${14 * dpr}px "CMU Serif", Georgia, serif`; ctx.textAlign = 'right'; ctx.fillText(getLang() === 'ar' ? 'الخطأ يؤول إلى الصفر أُسّيًا' : 'error → 0, exponentially', W - 14 * dpr, 22 * dpr); }
  }
  render(calm ? 1 : 0);
  if (calm) { done = true; onLit && onLit(); }
  const step = (ts) => { if (t0 == null) t0 = ts; const p = Math.min(1, (ts - t0) / 4200); render(p); if (p < 1) requestAnimationFrame(step); else { done = true; onLit && onLit(); } };
  return { play() { if (done || t0 != null) return; requestAnimationFrame(step); }, redraw() { render(done ? 1 : 0); } };
}
