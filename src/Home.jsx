import icon from './assets/analyze-icon.png'
import mascot from './assets/sanad-mascot.svg'

export default function Home({ go }) {
  return (
    <section className="home">
      <div className="hello">
        <img className="mascot" src={mascot} alt="شخصية سند الشباب" />
        <div className="cloud" role="status">
          <svg viewBox="0 0 350 130" preserveAspectRatio="none" aria-hidden="true">
            <path d="M50 112A28 28 0 0 1 28 66A30 30 0 0 1 62 28A34 34 0 0 1 130 20A36 36 0 0 1 200 20A32 32 0 0 1 266 30A30 30 0 0 1 296 70A28 28 0 0 1 262 112Z" />
            <circle cx="318" cy="106" r="6" /><circle cx="336" cy="118" r="3.5" />
          </svg>
          <div className="cloud-txt">
            <h2>!مرحبا</h2>
            <p>!يلا نعمل احلى سيرة ذاتية</p>
          </div>
        </div>
      </div>
      <div className="opts">
        <button type="button" className="opt" onClick={() => go('create')}>
          <span className="ic">✎</span>
          <span className="t">أنشئ سيرة ذاتية جديدة</span>
          <span className="d">املأ أقسام السيرة الذاتية واحصل عليها كملف PDF أو Word</span>
        </button>
        <button type="button" className="opt b" onClick={() => go('analyze')}>
          <span className="ic"><img src={icon} alt="" /></span>
          <span className="t">حلّل سيرتي الذاتية</span>
          <span className="d">عندك CV جاهزة ؟ ارفعها وحاول تحسنها</span>
        </button>
      </div>
      <ul className="feats" aria-label="مزايا الأداة">
        <li className="f1"><span className="fi"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg></span><b>متوافقة مع ATS</b><span>تمرّ من أنظمة الفرز الآلي</span></li>
        <li className="f2"><span className="fi"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></svg></span><b>عربي وإنجليزي</b><span>اكتب سيرتك بلغتك</span></li>
        <li className="f3"><span className="fi"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 20h14" /></svg></span><b><bdi>PDF</bdi> / <bdi>Word</bdi></b><span>حمّل أو أرسل بالبريد</span></li>
      </ul>
    </section>
  )
}
