import { useState } from 'react'
import icon from './assets/analyze-icon.png'

const KEY = 'sanad-consent-v1'
const CHECK = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7'/%3E%3C/svg%3E\")"

export default function Home({ go }) {
  // Mandatory consent: the tools stay locked until it is ticked. The choice is remembered in this browser.
  const [ok, setOk] = useState(() => { try { return localStorage.getItem(KEY) === '1' } catch { return false } })
  const [nudge, setNudge] = useState(false)
  const agree = (v) => { setOk(v); setNudge(false); try { v ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY) } catch { /* private mode */ } }
  const open = (to) => () => (ok ? go(to) : setNudge(true))
  return (
    <section className="home">
      <h2>كيف تودّ أن تبدأ؟</h2>
      <p className="sub">أنشئ سيرة ذاتية احترافية متوافقة مع أنظمة ATS، أو راجع سيرتك الحالية لوظيفة محددة.</p>
      <label className={`consent${nudge ? ' nudge' : ''}`}>
        <input type="checkbox" checked={ok} onChange={(e) => agree(e.target.checked)}
          style={{ appearance: 'none', WebkitAppearance: 'none', width: 24, height: 24, padding: 0, margin: 0, flex: 'none', cursor: 'pointer', borderRadius: 8, border: `2px solid ${ok ? '#1A1464' : nudge ? '#b3261e' : '#cfd0e4'}`, background: ok ? '#1A1464' : '#fff', backgroundImage: ok ? CHECK : 'none', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: '16px', boxShadow: 'none' }} />
        <span>
          <b>أوافق على أن تحتفظ مؤسسة سند الشباب بنسخة من سيرتي الذاتية وبياناتي الواردة فيها عند تحميلها أو إرسالها بالبريد.</b>
          <small>الموافقة إلزامية لاستخدام الأدوات. وعند استخدام أداة التحليل يُرسَل ملفّك إلى خدمة ذكاء اصطناعي من Google.</small>
          {nudge && <em>يرجى الموافقة أولاً للمتابعة.</em>}
        </span>
      </label>
      <div className={`opts${ok ? '' : ' locked'}`}>
        <button type="button" className="opt" aria-disabled={!ok} onClick={open('create')}>
          <span className="ic">✎</span>
          <span className="t">أنشئ سيرة ذاتية جديدة</span>
          <span className="d">املأ أقسامًا بسيطة واحصل على ملف PDF نظيف ومتوافق مع ATS لتحميله أو إرساله بالبريد.</span>
          <span className="go">ابدأ الآن ←</span>
        </button>
        <button type="button" className="opt b" aria-disabled={!ok} onClick={open('analyze')}>
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
