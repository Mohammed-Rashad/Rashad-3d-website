// Co-author constellation: every paper is a star; lines join it to its co-authors. Public CV data only.
export function constellation(canvas, data, { reduced, lang }) {
  const ctx = canvas.getContext('2d'); const dpr = Math.min(2, devicePixelRatio);
  const ratio = canvas.height / canvas.width;
  let W, H;
  const authors = new Map(); // name -> {count}
  for (const p of data.papers) for (const a of p.a) authors.set(a, (authors.get(a) || 0) + 1);
  const students = new Set(data.students || []);
  const names = [...authors.keys()];
  // hubs: him in the centre, co-authors around
  const hubs = new Map(); hubs.set('ME', { x: 0.5, y: 0.5, r: 7, label: { en: 'R. M. Asharabi', ar: 'رشاد الشرعبي' }, color: '#f2c66d' });
  const big = names.filter((n) => authors.get(n) >= 4).sort((a, b) => authors.get(b) - authors.get(a));
  const small = names.filter((n) => authors.get(n) < 4);
  const label = (n) => ({ 'M. H. Annaby': { en: 'Annaby', ar: 'عنّابي' }, 'J. Prestin': { en: 'Prestin', ar: 'بريستين' } }[n] || null);
  big.forEach((n, i) => { const a = i === 0 ? Math.PI * 0.95 : 0.15; hubs.set(n, { x: 0.5 + Math.cos(a) * 0.34, y: 0.5 + Math.sin(a) * 0.3, r: 3 + authors.get(n) * 0.4, label: label(n), color: i === 0 ? '#3bb3a3' : '#c4564a' }); });
  small.forEach((n, i) => { const a = -Math.PI / 2 + ((i + 0.5) / small.length) * Math.PI * 1.2 - 0.1; hubs.set(n, { x: 0.5 + Math.cos(a) * 0.33, y: 0.48 + Math.sin(a) * 0.36, r: 2.5 + authors.get(n) * 0.5, label: null, color: students.has(n) ? '#9a7ad0' : '#8090c0' }); });
  // stars: near the mean of their hubs, jittered; year controls a slight drift outward
  let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const stars = data.papers.map((p) => {
    const hs = [hubs.get('ME'), ...p.a.map((a) => hubs.get(a))]; let x = 0, y = 0; hs.forEach((h, i) => { const w = i === 0 ? 0.6 : 1; x += h.x * w; y += h.y * w; }); const tw = 0.6 + p.a.length;
    const ang = rnd() * Math.PI * 2, rad = 0.03 + rnd() * 0.07;
    return { x: x / tw + Math.cos(ang) * rad, y: y / tw + Math.sin(ang) * rad * 1.2, p, tw: rnd() * 6 };
  });
  let t = 0, raf = 0, visible = false, hover = null;
  const fit = () => { W = canvas.width = canvas.clientWidth * dpr; H = canvas.height = canvas.clientWidth * ratio * dpr; };
  fit(); new ResizeObserver(() => { fit(); draw(); }).observe(canvas);
  function draw() {
    ctx.fillStyle = '#12142e'; ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      const me = hubs.get('ME'); ctx.strokeStyle = 'rgba(242,198,109,0.08)'; ctx.lineWidth = 1 * dpr; ctx.beginPath(); ctx.moveTo(s.x * W, s.y * H); ctx.lineTo(me.x * W, me.y * H); ctx.stroke();
      for (const a of s.p.a) { const h = hubs.get(a); ctx.strokeStyle = h.color + '55'; ctx.beginPath(); ctx.moveTo(s.x * W, s.y * H); ctx.lineTo(h.x * W, h.y * H); ctx.stroke(); }
    }
    for (const s of stars) { const tw = 0.6 + 0.4 * Math.sin(t * 2 + s.tw); const r = (2 + (s.p.y - 2007) * 0.07) * dpr; ctx.fillStyle = `rgba(255,246,220,${tw})`; ctx.shadowColor = '#fff1c4'; ctx.shadowBlur = 8 * dpr; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s === hover ? r * 1.8 : r, 0, 7); ctx.fill(); }
    ctx.shadowBlur = 0;
    for (const [, h] of hubs) { ctx.fillStyle = h.color; ctx.beginPath(); ctx.arc(h.x * W, h.y * H, h.r * dpr, 0, 7); ctx.fill(); if (h.label) { ctx.fillStyle = '#f6efe0'; ctx.font = `${12 * dpr}px "CMU Serif", Georgia, serif`; ctx.textAlign = 'center'; ctx.fillText(h.label[lang()] || h.label.en, h.x * W, h.y * H - (h.r + 6) * dpr); } }
    if (hover) { ctx.fillStyle = '#fff1c4'; ctx.font = `${12 * dpr}px "CMU Serif", Georgia, serif`; ctx.textAlign = 'left'; const txt = `${hover.p.y}${hover.p.t ? ' · ' + hover.p.t : ''}${hover.p.a.length ? ' · with ' + hover.p.a.join(', ') : ' · solo'}`; ctx.fillText(txt, 10 * dpr, H - 10 * dpr); }
    ctx.fillStyle = 'rgba(246,239,224,0.6)'; ctx.font = `${11 * dpr}px "CMU Serif", Georgia, serif`; ctx.textAlign = 'right'; ctx.fillText(`${data.papers.length} ${lang() === 'ar' ? 'بحثًا' : 'papers'}`, W - 10 * dpr, 18 * dpr);
  }
  canvas.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; let best = null, bd = 0.03; for (const s of stars) { const d = Math.hypot(s.x - x, (s.y - y) * ratio); if (d < bd) { bd = d; best = s; } } if (best !== hover) { hover = best; draw(); } });
  const loop = () => { if (!visible) return; t += 0.016; draw(); raf = requestAnimationFrame(loop); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting && !reduced; if (visible) loop(); }).observe(canvas);
  draw();
  return { redraw: draw };
}
