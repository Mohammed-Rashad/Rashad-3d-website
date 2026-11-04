import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:4173/?debug', { waitUntil: 'networkidle' }); await p.waitForTimeout(4000);
// chalk pad
await p.evaluate(() => scrollTo(0, document.getElementById('sanaa').offsetTop)); await p.waitForTimeout(1500);
await p.locator('#chalk-pad').scrollIntoViewIfNeeded();
const bx = await p.locator('#chalk-pad').boundingBox();
const px = async (x, y) => p.evaluate(([x, y]) => { const c = document.getElementById('chalk-pad'); const d = c.getContext('2d').getImageData(x, y, 1, 1).data; return d[0]; }, [x, y]);
await p.mouse.move(bx.x + bx.width * 0.2, bx.y + bx.height * 0.85); await p.mouse.down();
for (let i = 0; i <= 10; i++) await p.mouse.move(bx.x + bx.width * (0.2 + i * 0.06), bx.y + bx.height * 0.85);
await p.mouse.up();
console.log('chalk drawn (red channel > 100):', await px(Math.round(1024 * 0.5), Math.round(560 * 0.85)));
// epilogue spin + pin click
await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(9000);
await p.mouse.move(700, 300); await p.mouse.down(); await p.mouse.move(900, 320, { steps: 8 }); await p.mouse.up();
await p.waitForTimeout(500);
const lab = p.locator('.pin-label[data-place=cairo]'); console.log('cairo label opacity', await lab.evaluate((e) => e.style.opacity));
await lab.click({ force: true }); await p.waitForTimeout(9000);
console.log('scrolled to cairo:', await p.evaluate(() => Math.abs(document.getElementById('cairo').getBoundingClientRect().top) < 200));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
