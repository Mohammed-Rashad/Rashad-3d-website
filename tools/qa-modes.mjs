// QA: no-JS and reduced-motion renderings + basic interaction checks.
import { chromium } from 'playwright';
const out = process.argv[2] || 'screenshots';
const b = await chromium.launch();
// 1) no JS
let ctx = await b.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
let p = await ctx.newPage(); await p.goto('http://localhost:4173/');
await p.screenshot({ path: out + '/nojs-top.png' });
await p.evaluate(() => 0).catch(() => {});
await p.locator('#ai').scrollIntoViewIfNeeded(); await p.screenshot({ path: out + '/nojs-ai.png' });
console.log('nojs text sample:', (await p.locator('#ai h3').allTextContents()).slice(0, 4).join(' | '));
await ctx.close();
// 2) reduced motion
ctx = await b.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
console.log('calm class:', await p.evaluate(() => document.documentElement.className));
await p.evaluate(() => scrollTo(0, document.getElementById('cairo').offsetTop)); await p.waitForTimeout(600);
await p.screenshot({ path: out + '/calm-cairo.png' });
// interactions: compile, calm cup, mma, explorable
await p.click('[data-action=compile]'); await p.waitForTimeout(1500);
console.log('pdf shown:', await p.isVisible('.tex-pdf'));
await p.click('#cairo .calm-cup'); console.log('cups:', await p.textContent('#cups-n'));
await p.evaluate(() => scrollTo(0, document.getElementById('ai').offsetTop)); await p.waitForTimeout(800);
const box = await p.locator('#w-recon canvas').boundingBox(); await p.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.3);
await p.click('#w-mlp [data-w=train]'); await p.waitForTimeout(2500); console.log('mlp:', await p.textContent('#w-mlp .loss'));
await p.locator('#w-gauss').scrollIntoViewIfNeeded(); await p.screenshot({ path: out + '/calm-gauss.png' });
await p.locator('#w-mlp').scrollIntoViewIfNeeded(); await p.screenshot({ path: out + '/calm-mlp.png' });
await p.evaluate(() => scrollTo(0, document.getElementById('conclusion').offsetTop)); await p.waitForTimeout(500);
await p.fill('.mma input', 'Rashad[]'); await p.press('.mma input', 'Enter'); console.log('mma:', await p.textContent('.mma-res'));
for (let i = 0; i < 17; i++) await p.evaluate(() => document.getElementById('his-name').click());
console.log('birthday modal:', await p.isVisible('#modal'), (await p.textContent('#modal .modal-body')).trim().slice(0, 60));
await p.keyboard.press('Escape');
for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await p.keyboard.press(k);
console.log('latex mode:', await p.evaluate(() => document.documentElement.classList.contains('latex')));
await p.evaluate(() => scrollTo(0, document.getElementById('lubeck').offsetTop)); await p.waitForTimeout(300); await p.screenshot({ path: out + '/latex-lubeck.png' });
console.log('errors:', errs.join(' / ') || 'none');
await b.close();
