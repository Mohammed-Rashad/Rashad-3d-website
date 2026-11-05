// QA: for every chapter, is the hidden cup on screen, outside the text card, and not hidden behind geometry?
import { chromium } from 'playwright';
const [vpName = 'desktop'] = process.argv.slice(2);
const vp = vpName === 'mobile' ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : { width: 1440, height: 900 };
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.goto('http://localhost:4173/?debug', { waitUntil: 'networkidle' }); await p.waitForTimeout(3500);
for (const id of (process.env.ONLY || 'taiz,sanaa,cairo,lubeck,najran,library,writer,ai').split(',')) {
  await p.evaluate((id) => scrollTo(0, document.getElementById(id).offsetTop + innerHeight * 0.05), id);
  await p.waitForTimeout(+(process.env.WAIT || 7000));
  const r = await p.evaluate((id) => { const info = window.__world?.cupInfo(); const c = document.querySelector('#' + id + ' .card').getBoundingClientRect();
    const underCard = info && info.x > c.left && info.x < c.right && info.y > c.top && info.y < c.bottom;
    const onScreen = info && info.x > 10 && info.x < innerWidth - 10 && info.y > 60 && info.y < innerHeight - 95;
    return { ...info, onScreen, underCard }; }, id);
  const okk = r && r.onScreen && !r.underCard && !r.occluded && r.px >= 18 && r.px <= 50;
  console.log((okk ? 'OK  ' : 'BAD ') + id, JSON.stringify(r));
  if (process.env.SHOT) await p.screenshot({ path: `${process.env.SHOT}/cup-${vpName}-${id}.png`, timeout: 180000 });
}
await b.close();
