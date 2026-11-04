// Screenshot every chapter on desktop + mobile, in English + Arabic.
// Usage: node tools/screenshots.mjs [baseUrl] [outDir]
import { chromium } from 'playwright';
import fs from 'fs';
const base = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3] || 'screenshots';
fs.mkdirSync(out, { recursive: true });
const ids = ['intro', 'taiz', 'sanaa', 'cairo', 'lubeck', 'najran', 'library', 'writer', 'ai', 'conclusion'];
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 }]]) {
  if (process.env.VP && process.env.VP !== name) continue;
  for (const lang of (process.env.LANGS || 'en,ar').split(',')) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, deviceScaleFactor: vp.deviceScaleFactor || 1, hasTouch: !!vp.isMobile });
    await ctx.addInitScript((l) => { try { localStorage.setItem('lang', l); } catch (e) {} }, lang);
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${name}/${lang}] ${m.type()}: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`[${name}/${lang}] pageerror: ${e.message}`));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4200);
    for (const id of ids) {
      if (only && !only.includes(id)) continue;
      await page.evaluate((id) => { const s = document.getElementById(id); window.scrollTo(0, s.offsetTop + (id === 'intro' ? 0 : innerHeight * 0.05)); }, id);
      await page.waitForTimeout(id === 'intro' ? 800 : +(process.env.WAIT || 4800));
      await page.screenshot({ path: `${out}/${name}-${lang}-${id}.png`, timeout: 180000 });
    }
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(`${out}/console.txt`, errors.join('\n'));
console.log(errors.length ? errors.slice(0, 40).join('\n') : 'no console errors');
