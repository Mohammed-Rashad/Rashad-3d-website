// Adds the English term after Arabic scientific/mathematical terms (first occurrence per string).
// Re-runnable: already-annotated terms are skipped. Usage: node tools/arabic-terms.cjs
const fs = require('fs');
// longest phrases first so a generic term never double-annotates a longer one
const TERMS = [
  ['مسألة التوصيل الحراري العكسية', 'inverse heat conduction problem'],
  ['الدوال متعددة المتغيرات', 'multivariate functions'],
  ['العيّنات غير المنتظمة', 'nonuniform samples'],
  ['المعادلات الدالّية', 'functional equations'],
  ['للمعادلات الدالّية', 'functional equations'],
  ['مبرهنة المعاينة', 'sampling theorem'],
  ['معدّل المعاينة', 'sampling rate'],
  ['المضاعِف الغاوسي', 'Gaussian multiplier'],
  ['مضاعِفٍ غاوسي', 'Gaussian multiplier'],
  ['الشبكة العصبية', 'neural network'],
  ['خطأ الارتعاش', 'jitter error'],
  ['أخطاء الارتعاش', 'jitter errors'],
  ['خطأ التعرّج', 'aliasing error'],
  ['الاستقرار الفائق', 'hyperstability'],
  ['القيم الذاتية', 'eigenvalues'],
  ['التحليل العددي', 'numerical analysis'],
  ['الشروط الابتدائية', 'initial conditions'],
  ['القطع التقليدي', 'truncation'],
  ['إعادةُ البناء', 'reconstruction'],
  ['إعادة البناء', 'reconstruction'],
  ['هيرميت–غاوس', 'Hermite-Gauss'],
  ['المشتقات', 'derivatives'],
  ['التعرّج', 'aliasing'],
  ['المعاينة', 'sampling'],
  ['التقارب', 'convergence'],
  ['الزمكان', 'spacetime'],
  ['مؤثّر', 'operator'],
  ['حدودي', 'polynomial'],
  ['أُسّيًا', 'exponentially'],
  ['أُسّي', 'exponential'],
  ['تردد العجلة', 'frequency'],
  ['دالةً', 'function'],
];
const AR = /[؀-ۿ]/;
function annotate(str) {
  if (!AR.test(str)) return str;
  const done = new Set(); let out = str;
  for (const [ar, en] of TERMS) {
    if (done.has(en)) continue;
    const i = out.indexOf(ar); if (i < 0) continue;
    const after = out.slice(i + ar.length, i + ar.length + en.length + 4);
    if (after.includes('(' + en)) { done.add(en); continue; } // already annotated
    // don't annotate inside a longer phrase that was already annotated (e.g. "مبرهنة المعاينة (sampling theorem)")
    const ctx = out.slice(Math.max(0, i - 12), i + ar.length + 40);
    if (/^\s?\(/.test(out.slice(i + ar.length, i + ar.length + 3))) continue; // already followed by an annotation
    out = out.slice(0, i + ar.length) + ` (${en})` + out.slice(i + ar.length); done.add(en);
  }
  return out;
}
// JSON content: every "ar" string
for (const f of ['content/profile.json', 'content/jokes.json', 'content/history.json', 'content/chapters.json']) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const walk = (o) => { for (const k in o) { if (typeof o[k] === 'string' && k === 'ar') o[k] = annotate(o[k]); else if (o[k] && typeof o[k] === 'object') walk(o[k]); } };
  walk(j); fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
}
// page.mjs + chapters.mjs: the Arabic argument of each LH('en', 'ar') / { ar: '...' } literal
for (const f of ['src/render/page.mjs', 'src/chapters.mjs']) {
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/'([^'\n]*[؀-ۿ][^'\n]*)'/g, (m, inner) => `'${annotate(inner)}'`);
  fs.writeFileSync(f, s);
}
console.log('arabic terms annotated');
