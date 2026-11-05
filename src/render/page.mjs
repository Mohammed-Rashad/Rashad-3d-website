// Build-time renderer: turns content/*.json into static, bilingual HTML.
// Everything here is readable without JavaScript; the runtime only adds 3D, sound and widgets.
import fs from 'fs';
import path from 'path';
import katex from 'katex';
import { CHAPTERS, UI, secLabel } from '../chapters.mjs';
import { icon } from '../icons.mjs';

const TODO = 'TODO_FROM_FAMILY';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ok = (v) => v != null && v !== '' && v !== TODO && !(typeof v === 'string' && v.includes(TODO));
const okL = (o) => o && (ok(o.en) || ok(o.ar));
const tex = (s, display = false) => katex.renderToString(s, { displayMode: display, throwOnError: false, output: 'html' });

// bilingual inline text; falls back to the other language when one is missing
function L(o, tag = 'span', cls = '') {
  if (!okL(o)) return '';
  const en = ok(o.en) ? o.en : o.ar;
  const ar = ok(o.ar) ? o.ar : o.en;
  const c = cls ? ` ${cls}` : '';
  return `<${tag} class="l-en${c}" lang="en">${esc(en)}</${tag}><${tag} class="l-ar${c}" lang="ar" dir="rtl">${esc(ar)}</${tag}>`;
}
// bilingual with raw HTML (trusted, authored in this file)
const LH = (en, ar, tag = 'span', cls = '') => `<${tag} class="l-en ${cls}" lang="en">${en}</${tag}><${tag} class="l-ar ${cls}" lang="ar" dir="rtl">${ar}</${tag}>`;

export function loadContent(root) {
  const dir = path.join(root, 'content');
  const c = {};
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) c[f.replace('.json', '')] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  c.credits = fs.existsSync(path.join(root, 'CREDITS.md')) ? fs.readFileSync(path.join(root, 'CREDITS.md'), 'utf8') : '';
  return c;
}

function thm(j, { dev }) {
  if (!j || !j.enabled) return '';
  const kind = UI.kinds[j.kind] || { en: j.kind, ar: j.kind };
  const num = j.number ? ' ' + j.number : '';
  const title = okL(j.title) ? ` <span class="thm-title">(${L(j.title)})</span>` : '';
  const draft = dev && !j.approved ? `<span class="badge-draft" title="approved:false in jokes.json">draft</span>` : '';
  const proof = okL(j.proof) ? `<p class="proof"><em>${L(UI.proof)}</em> ${L(j.proof)} <span class="qed">∎</span></p>` : '';
  return `<div class="thm thm-${j.kind}" data-joke="${j.id}"><p><span class="thm-head">${LH(kind.en + num + '.', kind.ar + num + '.')}</span>${title}${draft} <em>${L(j.body)}</em></p>${proof}</div>`;
}

function stories(ch) {
  if (!ch) return '';
  let h = '';
  for (const s of ch.stories || []) if (okL(s.text)) h += `<div class="story">${okL(s.title) ? `<h3>${L(s.title)}</h3>` : ''}<p>${L(s.text)}</p></div>`;
  const photos = (ch.photos || []).filter((p) => ok(p.src));
  if (photos.length) {
    h += `<div class="polaroids">` + photos.map((p, i) => `<figure class="polaroid" style="--r:${(i % 2 ? 1 : -1) * (2 + (i % 3))}deg"><img src="${esc(p.src)}" alt="${esc(ok(p.alt?.en) ? p.alt.en : '')}" loading="lazy" decoding="async"><figcaption>${L(p.caption)}${ok(p.year) ? ` <span class="year">${esc(p.year)}</span>` : ''}</figcaption></figure>`).join('') + `</div>`;
  }
  return h;
}

const hint = (en, ar) => `<p class="hint" aria-hidden="true">${LH(en, ar)}</p>`;

function chapterBody(id, c, dev) {
  const P = c.profile.chapters;
  const jokes = c.jokes.items.filter((j) => j.chapter === id);
  const J = jokes.map((j) => (j.kind === 'footnote' ? '' : thm(j, { dev }))).join('');
  const st = stories(c.chapters[id]);
  switch (id) {
    case 'taiz':
      return `<p class="lead">${L(P.taiz)}</p>${J}${st}
        <div class="actions"><button class="btn" data-action="pour">${icon('cup')} ${LH('Pour a cup', 'اسكب فنجانًا')}</button></div>
        ${hint('Click the coffee plant in the valley.', 'انقر على شجرة البنّ في الوادي.')}`;
    case 'sanaa':
      return `<p class="lead">${L(P.sanaa)}</p>${J}${st}
        <figure class="chalkpad"><canvas id="chalk-pad" width="1024" height="560" aria-label="Chalkboard: draw with your mouse or finger"></canvas>
          <figcaption>${LH('Your board. Whatever you write here also appears on the chalkboard in the scene, and you can draw on that one directly too.', 'سبورتك أنت. كل ما تكتبه هنا يظهر أيضًا على السبورة في المشهد، ويمكنك الكتابة عليها مباشرةً كذلك.')}</figcaption></figure>
        <div class="actions chalk-tools" role="group" aria-label="Chalk tools">
          <button class="btn" data-action="chalk-tool" data-tool="chalk" aria-pressed="true">${icon('chalk')} ${LH('Chalk', 'طباشير')}</button>
          <button class="btn" data-action="chalk-tool" data-tool="eraser" aria-pressed="false">${icon('eraser')} ${LH('Eraser', 'ممحاة')}</button>
          <button class="btn" data-action="chalk-clear">${icon('clear')} ${LH('Clean', 'امسح الكل')}</button>
          <button class="btn" data-action="chalk">${icon('sparkle')} ${LH('Write the sampling formula', 'اكتب معادلة المعاينة')}</button></div>
        <div class="chalk-fallback" dir="ltr">${tex('f(t) = \\sum_{n} f(n)\\,\\operatorname{sinc}(t-n)', true)}</div>`;
    case 'cairo':
      return `<p class="lead">${L(P.cairo)}</p>
        <div class="texbox" dir="ltr" aria-label="LaTeX compile demo">
          <pre class="tex-src">\\documentclass{siamart}\n\\title{On sinc-based method in computing\n  eigenvalues of boundary-value problems}\n\\author{M. H. Annaby \\and R. M. Asharabi}\n\\begin{document} \\maketitle ... \\end{document}</pre>
          <button class="btn" data-action="compile">pdflatex ▸</button>
          <div class="tex-pdf" hidden><strong>On sinc-based method in computing eigenvalues of boundary-value problems</strong><br>M. H. Annaby, R. M. Asharabi<br><em>SIAM J. Numer. Anal.</em> 46 (2008), no. 2, 671–690.</div>
        </div>
        ${J}<p>${L(P.cairoInterlude)}</p>${st}`;
    case 'lubeck': {
      const years = [2011, 2012, 2013, 2014, 2017, 2019];
      const X = (y) => 20 + ((y - 2010) / 10) * 260;
      const axis = `<svg class="mini-axis" viewBox="0 0 300 60" role="img" aria-label="Humboldt visits: 2011, 2012–13, 2014, 2017, 2019" dir="ltr">
        <line x1="10" y1="40" x2="290" y2="40" class="ax"/>
        ${[2010, 2012, 2014, 2016, 2018, 2020].map((y) => `<text x="${X(y)}" y="56" class="tick">${y}</text><line x1="${X(y)}" y1="37" x2="${X(y)}" y2="43" class="ax"/>`).join('')}
        ${years.map((y) => `<line x1="${X(y)}" y1="40" x2="${X(y)}" y2="12" class="stem"/><circle cx="${X(y)}" cy="12" r="4" class="dot"/>`).join('')}
      </svg>`;
      // simple equirectangular mini-map of Germany (lon 5.5–15.5, lat 47–55.2)
      const pins = [['Lübeck', 53.87, 10.69, true], ['Berlin', 52.52, 13.4], ['Bremen', 53.08, 8.8], ['Karlsruhe', 49.0, 8.4]];
      const mx = (lon) => ((lon - 5.5) / 10) * 160 + 10;
      const my = (lat) => ((55.2 - lat) / 8.2) * 180 + 10;
      const map = `<svg class="mini-map" viewBox="0 0 180 200" role="img" aria-label="Map pins: Lübeck, Berlin, Bremen, Karlsruhe" dir="ltr">
        <path class="land" d="M40 20 L70 12 L95 22 L120 14 L150 30 L160 60 L170 110 L150 140 L160 175 L120 192 L80 190 L45 180 L30 150 L22 110 L15 70 Z"/>
        ${pins.map(([n, la, lo, main]) => `<g class="pin${main ? ' main' : ''}"><circle cx="${mx(lo)}" cy="${my(la)}" r="${main ? 5 : 3.5}"/><text x="${mx(lo) + 7}" y="${my(la) + 4}">${n}</text></g>`).join('')}
      </svg>`;
      return `<p class="lead">${L(P.lubeck)}</p>
        <div class="figs one">${map}</div>${J}${st}
        ${(c.chapters.lubeck?.germanyLife || []).filter(okL).map((t) => `<p>${L(t)}</p>`).join('')}
        <div class="actions"><button class="btn" data-action="snow" aria-pressed="false">${icon('snow')} ${LH('Snow', 'تساقط الثلج')}</button><button class="btn" data-action="marzipan">${LH('Sample the marzipan', 'قطّع المرزبان إلى عيّنات')}</button></div>
        ${hint('Click the marzipan block on the quay.', 'انقر على قطعة المرزبان عند الرصيف.')}`;
    }
    case 'najran':
      return `<p class="lead">${L(P.najran)}</p>
        <figure class="constellation-fig"><canvas id="constellation" width="560" height="340" aria-label="Co-author constellation: each star is a paper, lines join co-authors"></canvas>
          <figcaption>${LH('Co-author constellation, from the public CV. Every star is a paper; the big clusters are Annaby and Prestin.', 'كوكبة المؤلفين المشاركين، مستخلصة من السيرة الذاتية المنشورة. كل نجمة بحثٌ منشور، والعنقودان الكبيران هما النابي وبريستين.')}
          <a href="${esc(c.profile.links.cv)}#publications" target="_blank" rel="noopener">${LH('All papers', 'كل الأبحاث') + ' ' + icon('external')}</a></figcaption></figure>
        ${J}${st}`;
    case 'library': {
      const items = c.history.items.filter((h) => h.confirmed);
      const books = items.length
        ? `<div class="books">` + items.map((h) => `<details class="book" id="book-${h.id}" data-book="${h.id}"><summary>${L(h.title)}</summary><p>${L(h.text)}</p></details>`).join('') + `</div>`
        : '';
      const fb = ok(c.profile.links.facebook) ? ` <a href="${esc(c.profile.links.facebook)}" target="_blank" rel="noopener">${LH('His Facebook page', 'صفحته على فيسبوك')} ${icon('external')}</a>` : '';
      return `${okL(P.library) ? `<p class="lead">${L(P.library)}</p>` : ''}${books}<p>${L(P.libraryPolitics)}${fb}</p>${J}${st}
        <div class="actions"><button class="btn" data-action="radio">${icon('radio')} ${LH('Tune the radio', 'اضبط الراديو')}</button></div>`;
    }
    case 'writer': {
      const fn = jokes.find((j) => j.kind === 'footnote' && j.enabled);
      const fbUrl = c.profile.links.facebook;
      const fbLink = ok(fbUrl)
        ? `<p class="fb-wrap"><a class="btn big fb-link" href="${esc(fbUrl)}" target="_blank" rel="noopener">${LH('His Facebook page', 'صفحته على فيسبوك')} ${icon('external')}</a></p>`
        : `<p class="handwritten soon">${LH('The link to his Facebook page is coming soon…', 'رابط صفحته على فيسبوك قريبًا…')}</p>`;
      const mark = fn ? `<sup class="fn-mark"><a href="#fn-7-1" id="fnref-7-1">7.1</a></sup>` : '';
      return `${okL(P.writer) ? `<p class="lead">${L(P.writer)}${mark}</p>` : ''}${fbLink}${st}
        ${fn ? `<ol class="footnotes"><li id="fn-7-1" value="7"><span class="fn-num">7.1</span> ${L(fn.body)} <a href="#fnref-7-1" aria-label="back">↑</a></li></ol>` : ''}`;
    }
    case 'ai': {
      const views = (c.ai.items || []).filter((v) => okL(v.text));
      return `<p class="lead">${L(P.ai)}</p>
        <h3>${LH('1 · Too few samples', '١ · حين تقلّ العيّنات')}</h3>
        <p>${LH('A wheel spins at a steady speed, but a camera only looks at it a few times per second. Slide the sample rate down. Below twice the wheel’s frequency, the samples cannot tell a fast forward spin from a slow backward one. That is <strong>aliasing</strong>, and it is why wheels in films seem to roll backwards.', 'تدور عجلة بسرعة ثابتة، لكن الكاميرا لا تلتقط لها إلا بضع صور في الثانية. حرّك شريط معدّل المعاينة إلى الأسفل: حين يقلّ عن ضعف تردد العجلة، تعجز العيّنات عن التمييز بين دوران سريع إلى الأمام ودوران بطيء إلى الخلف. هذا هو <strong>التعرّج</strong>، وهو سبب ظهور عجلات السيارات في الأفلام وكأنها تدور إلى الوراء.', 'p')}</p>
        <div class="widget" id="w-alias" dir="ltr"><canvas width="640" height="260" aria-label="Spinning wheel sampled at an adjustable rate"></canvas>
          <label>${LH('Sample rate', 'معدّل المعاينة')} <input type="range" min="1" max="40" step="0.5" value="24" aria-label="Sample rate"> <output>24</output> /s</label></div>
        <h3>${LH('2 · Rebuilding the whole from samples', '٢ · إعادة بناء الكل من العيّنات')}</h3>
        <p>${LH('The sampling theorem says that if a signal has no frequencies above some limit, its samples, taken fast enough, determine it completely. The recipe: place a <em>sinc</em> wave on every sample, scale it by the sample’s value, and add them all up. Click to place samples; drag to move them.', 'تنصّ مبرهنة المعاينة على أن الإشارة التي لا تحتوي تردداتٍ فوق حدٍّ معيّن تتحدّد تمامًا بعيّناتها، إذا أُخذت بسرعة كافية. والوصفة: ضع موجة <em>sinc</em> عند كل عيّنة، واضربها في قيمة تلك العيّنة، ثم اجمع الموجات كلها. انقر لوضع العيّنات، واسحبها لتحريكها.', 'p')}</p>
        <div class="eq" dir="ltr">${tex('f(t) = \\sum_{n\\in\\mathbb{Z}} f(n)\\,\\operatorname{sinc}(t-n), \\qquad \\operatorname{sinc}(x)=\\frac{\\sin \\pi x}{\\pi x}', true)}</div>
        <div class="widget" id="w-recon" dir="ltr"><canvas width="640" height="280" aria-label="Click to add samples; the sinc reconstruction is drawn live"></canvas>
          <div class="row"><button class="btn small" data-w="clear">${icon('clear')} ${LH('Clear', 'مسح')}</button><button class="btn small" data-w="random">${icon('dice')} ${LH('Random', 'عشوائي')}</button><label><input type="checkbox" data-w="terms" checked> ${LH('show each sinc', 'أظهر كل موجة sinc')}</label></div></div>
        <h3>${LH('3 · His contribution: a Gaussian multiplier', '٣ · إسهامه: المضاعِف الغاوسي')}</h3>
        <p>${LH('The catch is that a sinc wave fades away slowly, so you need a great many samples. In practice you stop after <em>N</em> of them, and the error shrinks only polynomially. Multiply each sinc by a Gaussian bell and the error falls <strong>exponentially</strong>. Much of Prof. Asharabi’s work extends this sinc-Gauss idea: to derivatives (Hermite-Gauss, with Prestin), to several variables, to nonuniform samples, and to computing eigenvalues.', 'المشكلة أن موجة sinc تخبو ببطء، فتحتاج إلى عدد هائل من العيّنات. وفي التطبيق تتوقف بعد <em>N</em> عيّنة، فلا يتناقص الخطأ إلا بمعدّل حدودي. أما إذا ضربتَ كل sinc في جرسٍ غاوسي، فإن الخطأ يهبط <strong>أُسّيًا</strong>. ويوسّع كثيرٌ من أعمال الأستاذ الدكتور الشرعبي فكرةَ sinc-غاوس هذه: إلى المشتقات (طريقة هيرميت–غاوس مع بريستين)، وإلى الدوال متعددة المتغيرات، وإلى العيّنات غير المنتظمة، وإلى حساب القيم الذاتية.', 'p')}</p>
        <div class="eq" dir="ltr">${tex('\\big|f(t) - G_{h,N}f(t)\\big| \\;\\le\\; C\\,\\frac{e^{-(\\pi - h\\sigma)N/2}}{\\sqrt{N}}', true)}
          <details class="whatmeans"><summary>${LH('What does this mean?', 'ماذا يعني هذا؟')}</summary><p>${LH('Every extra sample multiplies the error by a fixed factor smaller than one, like compound interest in reverse. Ten more samples can mean several more correct digits. Classical truncation only nibbles at the error.', 'كل عيّنة إضافية تضرب الخطأ في عاملٍ ثابت أصغر من الواحد، كالفائدة المركّبة ولكن بالعكس؛ فعشر عيّنات إضافية قد تعني بضع خانات عشرية صحيحة أخرى. أما القطع التقليدي فلا يقضم من الخطأ إلا القليل.')}</p></details></div>
        <div class="widget" id="w-gauss" dir="ltr"><canvas width="640" height="300" aria-label="Error of classical versus sinc-Gauss reconstruction as N grows"></canvas>
          <div class="row"><label>N <input type="range" min="2" max="24" step="1" value="6" aria-label="Number of terms N"> <output>6</output></label><label><input type="checkbox" data-w="gauss" checked> ${LH('Gaussian multiplier', 'المضاعِف الغاوسي')}</label></div></div>
        <h3>${LH('4 · The machine’s way', '٤ · طريقة الآلة')}</h3>
        <p>${LH('A neural network can fill the gaps too. It turns hundreds of little knobs until its curve passes near your points. Press <em>train</em> on the samples from widget 2 and compare. It often fits the points well, but nothing promises what happens between or beyond them. The theorem does.', 'تستطيع الشبكة العصبية أيضًا أن تسدّ الفجوات: فهي تضبط مئات المقابض الصغيرة حتى يمرّ منحناها قريبًا من نقاطك. اضغط <em>درّب</em> لتتعلّم من عيّنات الأداة ٢، ثم قارن. كثيرًا ما تطابق النقاطَ جيدًا، لكن لا شيء يضمن ما يحدث بينها أو خارجها. أما المبرهنة فتضمن ذلك.', 'p')}</p>
        <div class="widget" id="w-mlp" dir="ltr"><canvas width="640" height="280" aria-label="Neural network curve compared with sinc reconstruction"></canvas>
          <div class="row"><button class="btn small" data-w="train">${icon('play')} ${LH('Train', 'درّب')}</button><button class="btn small" data-w="reset">${icon('reset')} ${LH('Reset', 'إعادة ضبط')}</button><span class="loss" aria-live="polite"></span></div></div>
        <p class="caption-big">${LH('Before computers could hear or see, someone had to prove you could rebuild the whole from the samples.', 'قبل أن تتعلّم الحواسيب أن تسمع وترى، كان لا بدّ أن يُبرهن أحدٌ على أنك تستطيع إعادة بناء الكل من العيّنات.')}</p>
        ${views.length ? `<div class="his-views"><h3>${LH('In his words', 'بكلماته')}</h3>${views.map((v) => `<blockquote>${L(v.text)}</blockquote>`).join('')}</div>` : ''}
        ${J}${st}`;
    }
    case 'epilogue':
      return `<p class="lead hint-strong">${icon('globe')} <span>${L(P.epilogue)}</span></p>`;
    case 'conclusion': {
      const main = jokes.find((j) => j.id === 'main-theorem');
      const ack = jokes.find((j) => j.id === 'acknowledgements' && j.enabled);
      const links = c.profile.links;
      const refs = [];
      refs.push(`R. M. Asharabi. <em>Curriculum Vitae</em>. <a href="${esc(links.cv)}" target="_blank" rel="noopener">${esc(links.cv)}</a>`);
      if (ok(links.orcid)) refs.push(`ORCID iD 0000-0002-6616-2008. <a href="${esc(links.orcid)}" target="_blank" rel="noopener">${esc(links.orcid)}</a>`);
      if (ok(links.scholar)) refs.push(`Google Scholar profile. <a href="${esc(links.scholar)}" target="_blank" rel="noopener">scholar.google.com</a>`);
      if (ok(links.scopus)) refs.push(`Scopus Author ID 25637203500. <a href="${esc(links.scopus)}" target="_blank" rel="noopener">scopus.com</a>`);
      for (const line of c.credits.split('\n')) {
        const m = line.match(/^- (.+)$/);
        if (m) refs.push(esc(m[1]).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'));
      }
      const whispers = (c.whispers.items || []).filter((w) => okL(w.text));
      const ded = c.profile.dedication;
      return `<p class="lead">${L(P.conclusion)}</p>
        <div class="final-curve"><canvas id="final-curve" width="900" height="320" aria-label="All samples light up and the life curve converges under a Gaussian envelope labelled family"></canvas>
          ${whispers.length ? `<ul class="whispers-final">${whispers.map((w, i) => `<li style="--i:${i}"><q>${L(w.text)}</q>${okL(w.from) ? ` <cite>${L(w.from)}</cite>` : ''}</li>`).join('')}</ul>` : ''}</div>
        ${thm(main, { dev })}
        <div class="mma" dir="ltr"><label class="mma-in"><span class="mma-p">In[1]:=</span> <input value="Rashad[]" spellcheck="false" aria-label="Mathematica input"></label><button class="btn small" data-action="mma">⇧⏎</button><div class="mma-out" hidden><span class="mma-p">Out[1]=</span> <span class="mma-res"></span></div></div>
        ${ack ? `<h3>${L(ack.title)}</h3><p>${L(ack.body)}</p>` : ''}
        ${ded && ded.confirmed && okL(ded) ? `<p class="dedication">${L(ded)}</p>` : dev && okL(ded) ? `<p class="dedication">${L(ded)} <span class="badge-draft">draft</span></p>` : ''}
        <h3 id="references">${L(UI.references)}</h3>
        <ol class="refs" dir="ltr">${refs.map((r) => `<li>${r}</li>`).join('')}</ol>`;
    }
  }
  return '';
}

export function renderPage(c, { dev = false } = {}) {
  const p = c.profile;
  const intro = `
  <section class="chapter intro" id="intro" data-chapter="intro" tabindex="-1" aria-label="Title page">
    <div class="card paper titlepage">
      ${ok(p.photo?.src) ? `<figure class="polaroid title-polaroid" style="--r:-3deg"><img src="${esc(p.photo.src)}" alt="${esc(p.photo.alt?.en || '')}" width="600" height="326" decoding="async"><figcaption>${L(p.nickname)}</figcaption></figure>` : ''}
      <p class="journal">${LH('Journal of Family Analysis · Vol. 1 · Festschrift issue', 'مجلة التحليل العائلي · المجلد ١ · عدد تذكاري')}</p>
      <h1>${LH('On the Convergence of a Yemeni Mathematician', 'حول تقارُب عالِم رياضياتٍ يمني')}</h1>
      <p class="authors"><button class="name-btn" id="his-name" type="button">${L(p.name)}</button><sup>1</sup>
        · ${LH('Received: 17 December 1974', 'تاريخ الاستلام: ١٧ ديسمبر ١٩٧٤')} · ${LH('Accepted: still under review', 'تاريخ القبول: لا يزال قيد المراجعة')}</p>
      <p class="affil"><sup>1</sup> ${LH('Taiz → Sana’a → Cairo → Lübeck → Najran', 'تعز ← صنعاء ← القاهرة ← لوبيك ← نجران')}</p>
      <div class="abstract"><p>${LH('<strong>Abstract.</strong> We study a function <span dir="ltr">' + tex('f(t)') + '</span>, known locally as “Baba”, sampled at five points in space-time. Using a sinc-Gaussian operator with <em>family</em> as the multiplier, we reconstruct the continuous life between samples and show that convergence is exponential.', '<strong>الملخص.</strong> ندرس دالةً <span dir="ltr">' + tex('f(t)') + '</span>، تُعرف محليًا باسم «بابا»، أُخذت عيّناتها عند خمس نقاط في الزمكان. وباستخدام مؤثّر sinc-غاوس تكون فيه <em>العائلة</em> هي المضاعِف، نعيد بناء الحياة المتصلة بين العيّنات، ونُثبت أن التقارب أُسّي.')}</p>
      <p class="kw">${LH('<strong>Keywords:</strong> sampling, coffee, chalk, Humboldt, Facebook, four children.', '<strong>الكلمات المفتاحية:</strong> المعاينة، القهوة، الطباشير، هومبولت، فيسبوك، أربعة أبناء.')}</p>
      <p class="kw"><strong>MSC 2020:</strong> <span dir="ltr">94A20, 41A25, 00-DAD</span></p></div>
      <ul class="howto-mini">
        <li>${icon('scroll')}<span>${LH('Scroll: every chapter is one sample of his life.', 'مرّر: كل فصل عيّنة من حياته.')}</span></li>
        <li>${icon('hand')}<span>${LH('Click things in the scenes.', 'انقر على ما في المشاهد.')}</span></li>
        <li>${icon('volumeOn')}<span>${LH('Sound is off; switch it on at the top.', 'الصوت مُطفأ؛ شغّله من الأعلى.')}</span></li>
      </ul>
      <p class="cup-call">${icon('cup')} <span>${LH('<strong>8 Yemeni coffee cups</strong> are hidden in the scenes. Find them all to unlock a message from his children.', '<strong>٨ فناجين قهوة يمنية</strong> مخبّأة في المشاهد. اعثر عليها كلها لتفتح رسالة من أبنائه.')}</span></p>
      <a class="btn big start-btn" href="#taiz">${LH('Start', 'ابدأ')} ${icon('chevron')}</a>
    </div>
  </section>`;

  const part = (t, i) => ({ en: (t.en.split(':')[i] || '').trim(), ar: (t.ar.split(':')[i] || '').trim() });
  function compact(ch) {
    const sh = (c.profile.short || {})[ch.id];
    let body = chapterBody(ch.id, c, dev);
    // the buttons (and the Facebook link) sit right under the header
    const keep = [];
    body = body.replace(/<div class="actions">[\s\S]*?<\/div>/g, (m) => (keep.push(m), '')).replace(/<p class="fb-wrap">[\s\S]*?<\/p>/g, (m) => (keep.push(m), ''));
    const visible = body;
    const chips = sh && sh.chips && sh.chips.length ? `<ul class="chips">${sh.chips.map((x) => `<li>${L(x)}</li>`).join('')}</ul>` : '';
    const sub = part(ch.title, 1);
    return `
  <section class="chapter" id="${ch.id}" data-chapter="${ch.id}" style="--accent:${ch.accent}" tabindex="-1" aria-labelledby="h-${ch.id}">
    <div class="card paper compact">
      <h2 id="h-${ch.id}"><span class="sec">${LH(secLabel(ch, 'en'), secLabel(ch, 'ar'))}</span> <span class="place">${L(part(ch.title, 0))}</span>${sub.en ? `<span class="sub">${L(sub)}</span>` : ''}</h2>
      ${sh ? `<p class="short">${L(sh)}</p>` : ''}
      ${chips}
      ${keep.join('')}
      <div class="body">${visible}</div>
      <div class="whispers" data-whispers="${ch.id}"></div>
    </div>
  </section>`;
  }
  const secs = CHAPTERS.filter((ch) => ch.n > 0).map(compact).join('');

  const toc = `<nav class="toc" id="toc" aria-label="${UI.contents.en}" hidden><ol>${CHAPTERS.map((ch) => `<li><a href="#${ch.id}">${ch.n ? `<span class="sec">${LH(secLabel(ch, 'en'), secLabel(ch, 'ar'))}</span> ` : ''}${L(ch.title)}</a></li>`).join('')}</ol></nav>`;

  const footerJoke = c.jokes.items.find((j) => j.id === 'footer-status');
  const footer = `<footer class="site-footer"><p>${footerJoke && footerJoke.enabled ? L(footerJoke.body) : ''}</p>
    <p class="small">${LH('Made with love by his son. Formal CV: ', 'صُنع بحبّ من ابنه. السيرة الذاتية الرسمية: ')}<a href="${esc(p.links.cv)}" target="_blank" rel="noopener">rashad1974.netlify.app</a></p></footer>`;

  // runtime data (whispers etc.) – only what the widgets need
  const data = {
    whispers: (c.whispers.items || []).filter((w) => okL(w.text)),
    messages: c.messages,
    constellation: c.constellation,
    history: c.history.items.filter((h) => h.confirmed || dev).map((h) => h.id),
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  return `${toc}<main id="paper">${intro}${secs}</main>${footer}
<script type="application/json" id="site-data">${json}</script>`;
}
