// Sound is OFF until the visitor taps the toggle. Ambiences crossfade between chapters.
const CAPTIONS = {
  pour: { en: '[coffee pouring]', ar: '[صب القهوة]' }, clink: { en: '[cup clinks]', ar: '[رنين الفنجان]' },
  chalk: { en: '[chalk scratches]', ar: '[صرير الطباشير]' }, bell: { en: '[school bell rings]', ar: '[جرس المدرسة]' },
  keys: { en: '[keyboard clacking]', ar: '[نقر لوحة المفاتيح]' }, ding: { en: '[compile ding!]', ar: '[تنبيه: اكتمل الترجمة]' },
  churchbell: { en: '[church bells]', ar: '[أجراس الكنيسة]' }, tram: { en: '[tram bell]', ar: '[جرس الترام]' }, snow: { en: '[footsteps in snow]', ar: '[خطوات على الثلج]' },
  gull: { en: '[seagulls]', ar: '[نوارس]' }, applause: { en: '[applause]', ar: '[تصفيق]' }, page: { en: '[page turns]', ar: '[تقليب صفحة]' },
  radio: { en: '[radio tuning crackle]', ar: '[خشخشة ضبط الراديو]' }, rustle: { en: '[paper rustles]', ar: '[حفيف الورق]' }, scribble: { en: '[pen scribbles]', ar: '[خربشة القلم]' },
  pulse: { en: '[golden chime]', ar: '[رنين ذهبي]' }, found: { en: '[cup found!]', ar: '[وُجد فنجان!]' }, unlock: { en: '[everything converges]', ar: '[كل شيء يتقارب]' },
  wobble: { en: '[wobble]', ar: '[تمايل]' }, blip: null, hum: { en: '[network hums]', ar: '[طنين الشبكة]' },
};
const AMB_DESC = {
  'amb-intro': { en: 'a single tone', ar: 'نغمة واحدة' }, 'amb-taiz': { en: 'mountain wind, birds', ar: 'رياح الجبال، طيور' }, 'amb-sanaa': { en: 'evening wind, crickets', ar: 'رياح المساء، صراصير الليل' },
  'amb-cairo': { en: 'river water, street hum', ar: 'ماء النهر، ضجيج الشارع' }, 'amb-lubeck': { en: 'Baltic waves, seagulls', ar: 'أمواج البلطيق، نوارس' }, 'amb-najran': { en: 'warm desert wind', ar: 'رياح الصحراء الدافئة' },
  'amb-library': { en: 'clock ticking, radio crackle', ar: 'دقات الساعة، خشخشة الراديو' }, 'amb-writer': { en: 'quiet room, paper', ar: 'غرفة هادئة، ورق' }, 'amb-ai': { en: 'soft synth pad', ar: 'نغمات إلكترونية هادئة' }, 'amb-end': { en: 'warm chord', ar: 'نغمة دافئة' },
};

export function createAudio({ lang, captionsEl }) {
  let Howl = null, Howler = null, on = false, vol = 0.7, ambName = null, amb = null;
  const cache = {};
  try { vol = parseFloat(localStorage.getItem('vol') ?? '0.7'); } catch (e) {}
  const src = (n) => [`/audio/${n}.ogg`, `/audio/${n}.mp3`];
  async function load() { if (!Howl) ({ Howl, Howler } = await import('howler')); Howler.volume(vol); }
  function caption(name) {
    const c = CAPTIONS[name]; if (!c || !captionsEl) return;
    const s = document.createElement('span'); s.textContent = c[lang()] || c.en; captionsEl.appendChild(s); setTimeout(() => s.remove(), 2700);
  }
  function get(n, opts = {}) { if (!cache[n]) cache[n] = new Howl({ src: src(n), ...opts }); return cache[n]; }
  async function setAmbience(name) {
    if (name === ambName && amb) return; ambName = name;
    if (!on) return;
    const old = amb; amb = get(name, { loop: true, volume: 0 }); amb.play(); amb.fade(0, 0.55, 1500);
    if (old && old !== amb) { old.fade(old.volume(), 0, 1500); setTimeout(() => old.stop(), 1600); }
  }
  return {
    get enabled() { return on; },
    ambienceLabel() { const d = AMB_DESC[ambName]; return d ? d[lang()] : ''; },
    async enable(v) {
      on = v; try { localStorage.setItem('sound', v ? '1' : '0'); } catch (e) {}
      if (v) { await load(); const n = ambName; ambName = null; if (n) setAmbience(n); }
      else if (amb) { amb.fade(amb.volume(), 0, 400); const a = amb; setTimeout(() => a.stop(), 450); amb = null; }
    },
    setVolume(v) { vol = v; Howler && Howler.volume(v); try { localStorage.setItem('vol', String(v)); } catch (e) {} },
    volume: () => vol,
    setAmbience,
    sfx(name, quiet) { if (!quiet) caption(name); if (!on || !Howl) return; const h = get('sfx-' + name, { volume: 0.8 }); h.play(); },
    loop(name, play) { if (!on || !Howl) return; const h = get('sfx-' + name, { loop: true, volume: 0.25 }); if (play && !h.playing()) h.play(); if (!play) h.stop(); },
  };
}
