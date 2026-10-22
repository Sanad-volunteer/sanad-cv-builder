import icon from './assets/analyze-icon.png'
import mascot from './assets/sanad-mascot.svg'

export default function Home({ go }) {
  return (
    <section className="home">
      <div className="hello">
        <img className="mascot" src={mascot} alt="شخصية سند الشباب" />
        <div className="bubble" role="status">
          <h2>كيف تودّ أن تبدأ؟</h2>
          <p>أنشئ سيرة ذاتية احترافية متوافقة مع أنظمة ATS، أو راجع سيرتك الحالية لوظيفة محددة.</p>
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
