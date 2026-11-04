import 'computer-modern/cmu-serif.css';
import 'computer-modern/cmu-typewriter-text.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/amiri/400.css';
import '@fontsource/amiri/700.css';
import '@fontsource/caveat/500.css';
import '@fontsource/aref-ruqaa/400.css';
import 'katex/dist/katex.min.css';
import './style.css';
import { CHAPTERS } from './chapters.mjs';
import { createAudio } from './audio.js';
import { lifeCurve, finalCurve } from './curve.js';
import { playIntro } from './intro.js';
import { icon } from './icons.mjs';
import { createChalk } from './chalk.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const data = JSON.parse($('#site-data').textContent);
const TODO = 'TODO_FROM_FAMILY';
const ok = (v) => v && v !== TODO;
const lang = () => (html.dataset.lang === 'ar' ? 'ar' : 'en');
const tr = (o) => (o ? (ok(o[lang()]) ? o[lang()] : ok(o.en) ? o.en : ok(o.ar) ? o.ar : '') : '');
const store = { get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
const calm = reduced || !hasGL;
if (calm) html.classList.add('calm');

/* ---------------- modal ---------------- */
const modal = $('#modal'); let lastFocus = null;
function openModal(inner) { lastFocus = document.activeElement; $('.modal-body', modal).innerHTML = inner; modal.hidden = false; $('.modal-x', modal).focus(); }
function closeModal() { modal.hidden = true; lastFocus && lastFocus.focus(); }
modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('.modal-x')) closeModal(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------------- audio ---------------- */
const audio = createAudio({ lang, captionsEl: $('#captions') });
const sfx = (n, quiet) => audio.sfx(n, quiet);
const btnSound = $('#btn-sound'), vol = $('#vol');
vol.value = audio.volume();
function paintSound() { const on = audio.enabled; btnSound.setAttribute('aria-pressed', on); $('.ico-slot', btnSound).innerHTML = icon(on ? 'volumeOn' : 'volumeOff'); vol.hidden = !on; btnSound.title = on ? audio.ambienceLabel() : ''; }
btnSound.addEventListener('click', async () => { await audio.enable(!audio.enabled); paintSound(); });
vol.addEventListener('input', () => audio.setVolume(+vol.value));
// persistent preference: if the visitor turned sound on before, re-enable on their first gesture
if (store.get('sound') === '1') addEventListener('pointerdown', async function once() { removeEventListener('pointerdown', once); if (!audio.enabled) { await audio.enable(true); paintSound(); } }, { once: true });
paintSound();

/* ---------------- language ---------------- */
let world = null; const redrawers = [];
function setLang(l) {
  html.dataset.lang = l; html.lang = l; html.dir = l === 'ar' ? 'rtl' : 'ltr'; store.set('lang', l);
  world && world.relayout(); redrawers.forEach((f) => f()); renderWhisperLists();
}
$('#btn-lang').addEventListener('click', () => setLang(lang() === 'ar' ? 'en' : 'ar'));

/* ---------------- table of contents + keyboard nav ---------------- */
const toc = $('#toc'), btnToc = $('#btn-toc');
btnToc.addEventListener('click', () => { toc.hidden = !toc.hidden; btnToc.setAttribute('aria-expanded', !toc.hidden); if (!toc.hidden) $('a', toc).focus(); });
toc.addEventListener('click', (e) => { if (e.target.closest('a')) { toc.hidden = true; btnToc.setAttribute('aria-expanded', 'false'); } });
const sections = $$('.chapter');
function gotoIdx(i) { const s = sections[Math.max(0, Math.min(sections.length - 1, i))]; s.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); s.focus({ preventScroll: true }); }
addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
  const i = sections.findIndex((s) => s.dataset.chapter === currentId);
  if (e.key === 'n' || e.key === ']') gotoIdx(i + 1); else if (e.key === 'p' || e.key === '[') gotoIdx(i - 1);
});

/* ---------------- coffee-cup hunt ---------------- */
const CUP_CHAPTERS = ['taiz', 'sanaa', 'cairo', 'lubeck', 'najran', 'library', 'writer', 'ai'];
const found = new Set(JSON.parse(store.get('cups', '[]')).filter((c) => CUP_CHAPTERS.includes(c)));
$('#cups-t').textContent = CUP_CHAPTERS.length;
const paintCups = () => { $('#cups-n').textContent = found.size; };
paintCups();
const hunt = {
  has: (id) => found.has(id),
  find(id) {
    if (found.has(id)) return; found.add(id); store.set('cups', JSON.stringify([...found])); paintCups(); sfx('found');
    const left = CUP_CHAPTERS.length - found.size;
    if (left) toast(icon('cup') + ' ' + (lang() === 'ar' ? `أحسنت! بقي ${left} ${left === 1 ? 'فنجان' : 'فناجين'}.` : `Nice! ${left} cup${left === 1 ? '' : 's'} to go.`));
    const c = $('#cups'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    if (found.size === CUP_CHAPTERS.length) setTimeout(finalMessage, 900);
  },
};
function finalMessage() {
  sfx('unlock');
  const m = data.messages?.final; const text = tr(m?.text); const from = tr(m?.from);
  const L = lang() === 'ar';
  openModal(`<h3>${icon('cup')} ${L ? 'وجدتَ الفناجين الثمانية كلها!' : 'You found all 8 cups!'}</h3>
    ${text ? `<p class="handwritten">${esc(text)}</p>${from ? `<p>— ${esc(from)}</p>` : ''}` : `<p class="handwritten">${L ? 'رسالة الأبناء الأخيرة قيد الكتابة… عُد قريبًا.' : 'The kids are still writing the final message… come back soon.'}</p>`}`);
}
// calm / no-WebGL: hide a tiny cup button in each card instead
if (calm) for (const id of CUP_CHAPTERS) {
  const card = $(`#${id} .card`); if (!card || found.has(id)) continue;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'calm-cup'; b.innerHTML = icon('cup'); b.setAttribute('aria-label', 'A hidden coffee cup');
  b.style.cssText = 'position:absolute;bottom:8px;inset-inline-end:10px;background:none;border:0;font-size:18px;color:#7a3d14;opacity:.6;cursor:pointer';
  b.addEventListener('click', () => { hunt.find(id); b.remove(); }); card.appendChild(b);
}

/* ---------------- toasts + the hunt's progress panel ---------------- */
const toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl);
let toastT = 0;
function toast(htmlStr, ms = 4200) { toastEl.innerHTML = htmlStr; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.add('hide-now') || toastEl.classList.toggle('show', false), ms); }
function huntPanel() {
  const L = lang() === 'ar';
  const rows = CUP_CHAPTERS.map((id) => { const ch = CHAPTERS.find((c) => c.id === id); const got = found.has(id); return `<li class="${got ? 'got' : ''}">${icon(got ? 'check' : 'cup')} <a href="#${id}">§${ch.n} ${esc(ch.title[lang()].split(':')[0])}</a>${got ? '' : ` <span class="muted">${L ? 'لم تجده بعد' : 'not found yet'}</span>`}</li>`; }).join('');
  openModal(`<h3>${icon('cup')} ${L ? 'البحث عن فناجين القهوة' : 'The coffee-cup hunt'}</h3>
    <p>${L ? 'في كل مشهد ثلاثي الأبعاد فنجان قهوة يمني صغير مخبّأ. يتوهّج قليلًا ويتصاعد منه البخار، ويزداد توهّجه كلما أطلت النظر. انقر عليه لتجمعه.' : 'Every 3D scene hides one small Yemeni coffee cup. It glows a little and steams, and glows brighter the longer you look. Click it to collect it.'}</p>
    <ul class="hunt-list">${rows}</ul><p class="muted">${found.size}/${CUP_CHAPTERS.length}</p>`);
  $$('.hunt-list a', modal).forEach((a) => a.addEventListener('click', closeModal));
}
$('#cups').addEventListener('click', huntPanel);
if (!found.size && !calm) html.classList.add('hunt-new');
const seenHint = new Set();
function chapterHint(id) {
  if (calm || !CUP_CHAPTERS.includes(id) || found.has(id) || seenHint.has(id)) return; seenHint.add(id);
  const first = seenHint.size === 1; const L = lang() === 'ar';
  setTimeout(() => currentId === id && toast(icon('cup') + ' ' + (first ? (L ? 'فنجان قهوة مخبّأ في هذا المشهد. هل تراه؟ انقر عليه لتجمعه.' : 'A coffee cup is hidden in this scene. Can you spot it? Click it to collect it.') : (L ? 'فنجان آخر مخبّأ هنا…' : 'Another cup is hidden here…')), first ? 6000 : 3500), 2600);
}

/* ---------------- whispers (accessible list in each card) ---------------- */
function renderWhisperLists() {
  for (const box of $$('[data-whispers]')) {
    const list = (data.whispers || []).filter((w) => w.chapter === box.dataset.whispers);
    box.innerHTML = list.length ? `<h3 class="whispers-h">${lang() === 'ar' ? 'همسات' : 'Whispers'}</h3>` + list.map((w) => `<p class="handwritten">“${esc(tr(w.text))}”${tr(w.from) ? ` <small>— ${esc(tr(w.from))}</small>` : ''}</p>`).join('') : '';
  }
}
renderWhisperLists();
const showWhisper = (w) => openModal(`<p class="handwritten">“${esc(tr(w.text))}”</p>${tr(w.from) ? `<p>— ${esc(tr(w.from))}</p>` : ''}`);

/* ---------------- scroll → chapter + life-curve progress ---------------- */
const curve = lifeCurve($('#life-curve'), lang);
redrawers.push(() => curve.redraw());
let currentId = null;
function onChapter(id) {
  if (id === currentId) return; currentId = id;
  const ch = CHAPTERS.find((c) => c.id === id);
  html.style.setProperty('--chapter-accent', ch.accent);
  audio.setAmbience(ch.amb); paintSound();
  $$('.toc a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  $$('.calm-timeline li').forEach((li) => li.classList.toggle('on', li.dataset.p === id || (['library', 'writer', 'ai', 'conclusion', 'epilogue'].includes(id) && li.dataset.p === 'najran')));
  $('#life-curve-wrap').classList.toggle('hide', id === 'conclusion' || id === 'intro' || id === 'epilogue');
  chapterHint(id);
  if (id === 'najran') { const l = $('.levelup'); l.classList.remove('pulse'); void l.offsetWidth; l.classList.add('pulse'); }
  world && world.go(id);
}
function onScroll() {
  const mid = innerHeight * 0.5; let best = sections[0], prog = 0;
  for (let i = 0; i < sections.length; i++) {
    const r = sections[i].getBoundingClientRect();
    if (r.top <= mid) { best = sections[i]; prog = i + Math.min(1, (mid - r.top) / r.height); }
  }
  onChapter(best.dataset.chapter);
  curve.set(prog - 0.3);
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);

/* ---------------- actions (buttons in cards; mirrored in 3D) ---------------- */
function compileHTML(sound = true) { const pdf = $('.tex-pdf'); const btn = $('[data-action=compile]'); btn.disabled = true; btn.textContent = 'pdflatex …'; if (sound) sfx('keys'); setTimeout(() => { pdf.hidden = false; btn.textContent = 'pdflatex ✓'; btn.disabled = false; if (sound) sfx('ding'); }, 1300); }
function openBook(id) { const d = $(`#book-${CSS.escape(id)}`); if (!d) { sfx('page'); return; } $$('.book').forEach((b) => (b.open = b === d)); d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); sfx('page'); }
function openLetter(i) {
  sfx('rustle');
  const posts = $$('.letter');
  const fb = $('.fb-link'); if (!posts.length && fb) { window.open(fb.href, '_blank', 'noopener'); return; }
  if (!posts.length) return openModal(`<p class="handwritten soon">${lang() === 'ar' ? 'رابط صفحته على فيسبوك قريبًا…' : 'The link to his Facebook page is coming soon…'}</p>`);
  const p = posts[i % posts.length]; openModal(`<article class="letter" lang="${p.lang}" dir="${p.dir}" style="--r:0deg">${p.innerHTML}</article>`);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-action]'); if (!b) return;
  const a = b.dataset.action;
  if (a === 'compile') { compileHTML(!(world && world.action('compile'))); return; }
  if (a === 'snow') { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); world && world.action('snow', on); if (!world) sfx('snow'); return; }
  if (a === 'mma') return evalMma();
  if (a === 'chalk-tool') { chalk.setTool(b.dataset.tool); $$('[data-action=chalk-tool]').forEach((x) => x.setAttribute('aria-pressed', x === b)); return; }
  if (a === 'chalk-clear') { chalk.clear(); sfx('rustle'); return; }
  if (a === 'chalk' && !world) { chalk.writeFormula(1); sfx('chalk'); return; }
  if (a === 'radio') { if (!(world && world.action('radio'))) sfx('radio'); return; }
  if (!(world && world.action(a))) sfx({ pour: 'pour', chalk: 'chalk', bell: 'bell', marzipan: 'blip' }[a] || 'blip');
});
$$('.book').forEach((d) => d.addEventListener('toggle', () => d.open && sfx('page', true)));
function emit(type, detail) {
  if (type === 'compiled') { const pdf = $('.tex-pdf'); if (pdf.hidden) setTimeout(() => (pdf.hidden = false), 1300); }
  if (type === 'book') openBook(detail);
  if (type === 'letter') openLetter(detail);
  if (type === 'whisper') showWhisper(detail);
  if (type === 'goto') document.getElementById(detail)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  if (type === 'snow') $('[data-action=snow]')?.setAttribute('aria-pressed', detail);
  if (type === 'levelup') { const l = $('.levelup'); l.classList.remove('pulse'); void l.offsetWidth; l.classList.add('pulse'); }
}

/* ---------------- Mathematica cell ---------------- */
function evalMma() {
  const inp = $('.mma input'); const out = $('.mma-out'); const res = $('.mma-res'); const v = inp.value.replace(/\s/g, '');
  let r;
  if (/^Rashad\[\]$/i.test(v)) r = lang() === 'ar' ? '"بابا"' : '"Baba"';
  else if (/^N\[Rashad\[\]\]$/i.test(v)) r = '"Baba" (to 16 significant digits)';
  else if (/^Limit\[/i.test(v)) r = 'family';
  else if (/^Integrate\[/i.test(v)) r = 'coffee + C';
  else r = '$Failed  (try Rashad[])';
  res.textContent = r; out.hidden = false; sfx('blip', true);
}
$('.mma input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); evalMma(); } });

/* ---------------- easter eggs ---------------- */
let typed = '';
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let kon = 0;
addEventListener('keydown', (e) => {
  kon = e.key === KONAMI[kon] || e.key.toLowerCase() === KONAMI[kon] ? kon + 1 : e.key === KONAMI[0] ? 1 : 0;
  if (kon === KONAMI.length) { kon = 0; html.classList.toggle('latex'); sfx('page'); }
  if (e.target.closest('input, textarea')) return;
  typed = (typed + e.key.toLowerCase()).slice(-4);
  if (typed === 'sinc') wobble();
});
function wobble() {
  if (reduced) return; sfx('wobble');
  const els = $$('.card > *').filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
  const t0 = performance.now(); const sinc = (x) => (Math.abs(x) < 1e-6 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
  const step = (ts) => { const t = (ts - t0) / 1000; els.forEach((el, i) => { const u = (t - i * 0.07) * 4 - 3; el.style.transform = `translateY(${(-14 * sinc(u)).toFixed(2)}px)`; }); if (t < 2.4) requestAnimationFrame(step); else els.forEach((el) => (el.style.transform = '')); };
  requestAnimationFrame(step);
}
let nameClicks = 0;
$('#his-name')?.addEventListener('click', () => {
  nameClicks++;
  if (nameClicks === 17) {
    nameClicks = 0; sfx('unlock');
    const m = data.messages?.birthday; const text = tr(m?.text), from = tr(m?.from); const L = lang() === 'ar';
    openModal(`<h3>${icon('cake')} ${L ? '١٧ ديسمبر' : '17 December'}</h3>${text ? `<p class="handwritten">${esc(text)}</p>${from ? `<p>— ${esc(from)}</p>` : ''}` : `<p class="handwritten">${L ? 'الأبناء ما زالوا يكتبون هذه الرسالة.' : 'The kids are still writing this one.'}</p>`}`);
  }
});

/* ---------------- lazy widgets ---------------- */
const chalk = createChalk($('#chalk-pad'), { sfx });
function whenNear(el, fn, margin = '600px') { if (!el) return; const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: margin }); io.observe(el); }
whenNear($('#constellation'), async () => { const { constellation } = await import('./constellation.js'); const c = constellation($('#constellation'), data.constellation, { reduced, lang }); redrawers.push(c.redraw); });
whenNear($('#ai'), async () => { const { initExplorable } = await import('./explorable.js'); const ex = initExplorable({ sfx, loopSfx: (n, p) => audio.loop(n, p), reduced, lang }); redrawers.push(ex.redraw); });
const fc = $('#final-curve');
if (fc) { const f = finalCurve(fc, lang, { calm, onLit: () => $('.final-curve').classList.add('lit') }); redrawers.push(f.redraw); new IntersectionObserver(([e]) => e.isIntersecting && f.play(), { threshold: 0.4 }).observe(fc); }

/* ---------------- intro + 3D world ---------------- */
const titlepage = $('.titlepage');
if (calm) { $('#intro-canvas').remove(); titlepage.classList.add('shown'); }
else playIntro($('#intro-canvas'), () => titlepage.classList.add('shown'));

// the part of the screen not covered by the chapter's text card (cups are placed there)
function freeRect(id) {
  const w = innerWidth, h = innerHeight; const c = document.querySelector('#' + id + ' .card');
  const r = c ? c.getBoundingClientRect() : { left: 0, right: 0, top: h, bottom: h };
  const top = 70, bot = h - 100;
  const opts = [
    { x0: r.right + 20, x1: w - 12, y0: top, y1: bot },
    { x0: 12, x1: r.left - 20, y0: top, y1: bot },
    { x0: 12, x1: w - 12, y0: top, y1: Math.min(bot, r.top - 20) },
  ].map((o) => ({ ...o, a: Math.max(0, o.x1 - o.x0) * Math.max(0, o.y1 - o.y0) }));
  return opts.sort((a, b) => b.a - a.a)[0];
}
async function startWorld() {
  if (calm) return;
  try {
    const { createWorld } = await import('./scene/world.js');
    world = await createWorld({ canvas: $('#world'), labelsEl: $('#labels'), hunt, sfx, emit, lang, isRTL: () => html.dir === 'rtl',
      data: { freeRect, whispers: data.whispers, history: data.history, postsCount: $$('.letter').length, chalk, pinIcon: icon('pin') } });
    if (location.search.includes('debug')) window.__goto = (id) => onChapter(id);
    const id = currentId; currentId = null; onChapter(id || 'intro');
  } catch (e) { console.error('3D failed, falling back to calm mode', e); html.classList.add('calm'); }
}
onScroll();
('requestIdleCallback' in window ? requestIdleCallback : (f) => setTimeout(f, 200))(startWorld, { timeout: 1500 });
