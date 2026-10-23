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
            <h2>أهلاً بك!</h2>
            <p>كيف أساعدك اليوم؟</p>
          </div>
        </div>
      </div>
      <div className="opts">
        <button type="button" className="opt" onClick={() => go('create')}>
          <span className="ic">✎</span>
          <span className="t">أنشئ سيرة ذاتية جديدة</span>
          <span className="d">املأ أقسامًا بسيطة واحصل على ملف PDF نظيف ومتوافق مع ATS لتحميله أو إرساله بالبريد.</span>
          <span className="go">ابدأ الآن ←</span>
        </button>
        <button type="button" className="opt b" onClick={() => go('analyze')}>
          <span className="ic"><img src={icon} alt="" /></span>
          <span className="t">حلّل سيرتي الذاتية</span>
          <span className="d">ارفع سيرتك الحالية واحصل على نسبة المطابقة والكلمات المفتاحية الناقصة واقتراحات لوظيفة محددة.</span>
          <span className="go">ارفع وحلّل ←</span>
        </button>
      </div>
      <div className="trust"><span>✓ متوافق مع ATS</span><span>✓ عربي وإنجليزي</span><span>✓ تصدير PDF</span></div>
    </section>
  )
}
