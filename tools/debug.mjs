import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('console', (m) => console.log('console', m.type(), m.text()));
p.on('pageerror', (e) => console.log('pageerror', e.message, e.stack));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(3000);
const fps = await p.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
console.log('fps', fps);
for (const id of process.argv.slice(2)) {
  await p.evaluate((id) => window.scrollTo(0, document.getElementById(id).offsetTop), id);
  await p.waitForTimeout(9000);
  await p.screenshot({ path: process.env.S + '/dbg-' + id + '.png' });
  console.log(id, await p.evaluate(() => [...document.querySelectorAll('.pin-label')].map((e) => e.style.opacity).join(',')));
}
await b.close();
