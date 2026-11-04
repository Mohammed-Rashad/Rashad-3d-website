// One shared chalkboard: the canvas in the §2 card IS the texture of the 3D board.
// Draw on either; both update.
const BOARD = '#24432f';
export function createChalk(canvas, { sfx } = {}) {
  const ctx = canvas.getContext('2d'); const W = canvas.width, H = canvas.height;
  const listeners = new Set(); const changed = () => listeners.forEach((f) => f());
  const state = { tool: 'chalk' }; let last = null, lastSfx = 0;
  function background() {
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = BOARD; ctx.fillRect(0, 0, W, H);
    // faint old chalk smudges so it reads as a real board
    for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(255,255,255,${0.015 + Math.random() * 0.03})`; ctx.beginPath(); ctx.ellipse(Math.random() * W, Math.random() * H, 60 + Math.random() * 140, 10 + Math.random() * 26, Math.random() * 0.4 - 0.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, W - 10, H - 10);
  }
  function seg(x0, y0, x1, y1) {
    if (state.tool === 'eraser') {
      ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = 'rgba(36,67,47,0.85)'; ctx.lineWidth = 46; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); return;
    }
    // chalk: a few jittered thin strokes give a grainy, dusty line
    ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      const j = () => (Math.random() - 0.5) * 3.2;
      ctx.strokeStyle = `rgba(246,246,236,${0.35 + Math.random() * 0.4})`; ctx.lineWidth = 2 + Math.random() * 3;
      ctx.beginPath(); ctx.moveTo(x0 + j(), y0 + j()); ctx.lineTo(x1 + j(), y1 + j()); ctx.stroke();
    }
  }
  // x, y in canvas pixels
  function stroke(x, y, start) {
    if (start || !last) last = { x, y };
    seg(last.x, last.y, x, y); last = { x, y }; changed();
    const now = performance.now(); if (sfx && now - lastSfx > 260) { lastSfx = now; sfx(state.tool === 'eraser' ? 'rustle' : 'chalk', true); }
  }
  const end = () => (last = null);
  function writeFormula(p) {
    // writes his formula progressively (p: 0..1) on top of whatever is there
    const text = 'f(t) = Σ f(n)·sinc(t − n)';
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = BOARD; ctx.fillRect(40, 150, W - 80, 260);
    ctx.font = 'italic 84px "CMU Serif", Georgia, serif'; ctx.fillStyle = '#f2f2e6'; ctx.textBaseline = 'middle';
    ctx.fillText(text.slice(0, Math.floor(text.length * p)), 60, 220);
    if (p >= 1) { ctx.font = '46px "Caveat", cursive'; ctx.fillStyle = '#ffe9a0'; ctx.fillText('the whole, from its samples', 300, 370); ctx.strokeStyle = '#f2f2e6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(60, 290); ctx.quadraticCurveTo(450, 300, 900, 285); ctx.stroke(); }
    changed();
  }
  // pointer drawing on the HTML pad
  canvas.style.touchAction = 'none';
  const at = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
  let down = false;
  canvas.addEventListener('pointerdown', (e) => { down = true; canvas.setPointerCapture(e.pointerId); const [x, y] = at(e); stroke(x, y, true); });
  canvas.addEventListener('pointermove', (e) => { if (down) { const [x, y] = at(e); stroke(x, y, false); } });
  const up = () => { down = false; end(); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  background();
  return {
    canvas, state, stroke, end, writeFormula,
    clear() { background(); changed(); },
    setTool(t) { state.tool = t; },
    onChange(f) { listeners.add(f); },
  };
}
