// Shared chapter config (build-time renderer + runtime).
export const CHAPTERS = [
  { id: 'intro', n: 0, title: { en: 'Title page', ar: 'صفحة العنوان' }, accent: '#f2c66d', amb: 'amb-intro', globe: 'taiz' },
  { id: 'taiz', n: 1, title: { en: 'Taiz: Initial Conditions', ar: 'تعز: الشروط الابتدائية' }, accent: '#c8704a', amb: 'amb-taiz', place: { lat: 13.58, lon: 44.02 }, sample: 0.35 },
  { id: 'sanaa', n: 2, title: { en: "Sana'a: The First Samples", ar: 'صنعاء: العينات الأولى' }, accent: '#9a7ad0', amb: 'amb-sanaa', place: { lat: 15.37, lon: 44.19 }, sample: 0.8 },
  { id: 'cairo', n: 3, title: { en: 'Cairo: Convergence Under Supervision', ar: 'القاهرة: تقارب تحت الإشراف' }, accent: '#3bb3a3', amb: 'amb-cairo', place: { lat: 30.03, lon: 31.21 }, sample: 0.15 },
  { id: 'lubeck', n: 4, title: { en: 'Lübeck: Periodic Nonuniform Sampling', ar: 'لوبيك: معاينة دورية غير منتظمة' }, accent: '#c4564a', amb: 'amb-lubeck', place: { lat: 53.87, lon: 10.69 }, sample: 0.95 },
  { id: 'najran', n: 5, title: { en: 'Najran: The Professor', ar: 'نجران: الأستاذ' }, accent: '#d69a48', amb: 'amb-najran', place: { lat: 17.49, lon: 44.13 }, sample: 0.55 },
  { id: 'library', n: 6, title: { en: 'The Library: History & Politics', ar: 'المكتبة: التاريخ والسياسة' }, accent: '#b07a52', amb: 'amb-library', sample: 0.7 },
  { id: 'writer', n: 7, title: { en: 'The Writer: Facebook Posts', ar: 'الكاتب: منشورات فيسبوك' }, accent: '#c9a27c', amb: 'amb-writer', sample: 0.4 },
  { id: 'ai', n: 8, title: { en: 'AI: Two Ways to Fill the Gaps', ar: 'الذكاء الاصطناعي: طريقتان لملء الفراغات' }, accent: '#7fd8e6', amb: 'amb-ai', sample: 0.85 },
  { id: 'conclusion', n: 9, title: { en: 'Conclusion: Convergence', ar: 'الخاتمة: التقارب' }, accent: '#f2c66d', amb: 'amb-end', globe: 'all' },
];

export const PLACES = ['taiz', 'sanaa', 'cairo', 'lubeck', 'najran'];
// chapters that are not places live in Najran (where he is now)
export const chapterPlace = (id) => (PLACES.includes(id) ? id : id === 'intro' ? 'taiz' : 'najran');

export const UI = {
  contents: { en: 'Contents', ar: 'المحتويات' },
  sound: { en: 'Sound', ar: 'الصوت' },
  soundOn: { en: 'Tap to enable sound', ar: 'اضغط لتفعيل الصوت' },
  volume: { en: 'Volume', ar: 'مستوى الصوت' },
  lang: { en: 'العربية', ar: 'English' },
  cups: { en: 'coffee cups found', ar: 'فناجين قهوة' },
  close: { en: 'Close', ar: 'إغلاق' },
  scroll: { en: 'Scroll to read', ar: 'مرّر للقراءة' },
  postsSoon: { en: 'Posts coming soon…', ar: 'المنشورات قريبًا…' },
  shelfStocking: { en: 'The family is still choosing which history books go on this shelf.', ar: 'ما زالت العائلة تختار كتب التاريخ التي ستوضع على هذا الرف.' },
  draft: { en: 'DRAFT: not yet confirmed by the family', ar: 'مسودة: لم تؤكدها العائلة بعد' },
  readPost: { en: 'Read the original', ar: 'اقرأ المنشور الأصلي' },
  hisPosts: { en: 'Read his posts', ar: 'اقرأ منشوراته' },
  proof: { en: 'Proof.', ar: 'البرهان.' },
  references: { en: 'References', ar: 'المراجع' },
  whispers: { en: 'Whispers', ar: 'همسات' },
  kinds: {
    lemma: { en: 'Lemma', ar: 'تمهيدية' }, remark: { en: 'Remark', ar: 'ملاحظة' }, theorem: { en: 'Theorem', ar: 'مبرهنة' },
    definition: { en: 'Definition', ar: 'تعريف' }, problem: { en: 'Problem', ar: 'مسألة' }, corollary: { en: 'Corollary', ar: 'نتيجة' },
    footnote: { en: 'Footnote', ar: 'حاشية' },
  },
};
