// First screen of "create CV": the CV language is chosen here (big cards) instead of inside the form.
const OPTS = [
  { k: 'ar', glyph: 'ع', name: 'العربية', sub: 'سيرة ذاتية بالعربية، تُعرض من اليمين إلى اليسار', dir: 'rtl' },
  { k: 'en', glyph: 'Aa', name: 'English', sub: 'English CV, laid out left to right', dir: 'ltr' },
]

export default function LangPick({ lang, onPick, onBack }) {
  return (
    <main className="layout lp-wrap">
      <div className="topbar no-print">
        <button type="button" className="back analyze-back" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5.5 9.5V21h13V9.5M9.5 21v-6h5v6" />
          </svg>
          <span>الصفحة الرئيسية</span>
        </button>
      </div>
      <section className="lp">
        <h2 className="lp-h">بأي لغة تريد كتابة سيرتك الذاتية؟</h2>
        <p className="lp-p">اختر لغة السيرة. تؤثر على المعاينة وملف PDF فقط، وواجهة الموقع تبقى بالعربية.</p>
        <div className="lp-grid" role="group" aria-label="لغة السيرة الذاتية">
          {OPTS.map((o) => (
            <button key={o.k} type="button" className={`lp-card${lang === o.k ? ' on' : ''}`} dir={o.dir} onClick={() => onPick(o.k)} aria-pressed={lang === o.k}>
              <span className="lp-g" aria-hidden="true">{o.glyph}</span>
              <span className="lp-n">{o.name}</span>
              <span className="lp-s">{o.sub}</span>
            </button>
          ))}
        </div>
        <p className="lp-note">يمكنك تغيير اللغة لاحقاً من أعلى النموذج.</p>
      </section>
    </main>
  )
}
