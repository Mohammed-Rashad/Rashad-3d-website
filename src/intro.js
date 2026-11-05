// Starts on black: a single point of light oscillates, then unfolds into a sinc wave. Then the title page fades in.
export function playIntro(canvas, done) {
  const ctx = canvas.getContext('2d'); const dpr = 1; // cheap: the glow is soft anyway
  const W = (canvas.width = innerWidth * dpr), H = (canvas.height = innerHeight * dpr);
  let t0 = null, finished = false;
  const sinc = (x) => (Math.abs(x) < 1e-6 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
  const finish = () => { if (finished) return; finished = true; canvas.classList.add('gone'); setTimeout(() => (canvas.style.display = 'none'), 1500); done(); };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((e) => addEventListener(e, finish, { once: true, passive: true }));
  function frame(ts) {
    if (finished) return; if (t0 == null) t0 = ts; const t = (ts - t0) / 1000;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, A = Math.min(W, H) * 0.18;
    ctx.fillStyle = '#fff1c4'; ctx.strokeStyle = '#f2c66d'; ctx.lineWidth = 2.5;
    if (t < 1.4) { // oscillating point
      const y = cy - Math.sin(t * 9) * A * 0.5 * Math.min(1, t * 1.5);
      ctx.beginPath(); ctx.arc(cx, y, 4 * dpr, 0, Math.PI * 2); ctx.fill();
    } else { // unfold into a sinc wave, from the centre outward
      const p = Math.min(1, (t - 1.4) / 1.4); const half = (W / 2) * p; const k = 9 / W;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
      ctx.beginPath();
      for (let x = cx - half; x <= cx + half; x += 2 * dpr) { const u = (x - cx) * k * 10; const y = cy - sinc(u / 4) * A; x === cx - half ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.globalAlpha = 0.18; ctx.lineWidth = 12; ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 2.5; ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy - A, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    if (t > 3.3) return finish();
    requestAnimationFrame(frame);
  }
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  requestAnimationFrame(frame);
}
