// Second screen of "create CV" (after the language): the CV template. Each card shows the real template with sample data.
import Preview from './Preview.jsx'

const SAMPLE = {
  en: {
    p: { name: 'Jackie Romano', title: 'Software Engineer', email: 'jackie@email.com', phone: '+1 555 555 1234', city: 'Amman, Jordan', residence: '', link: 'linkedin.com/in/jackie', summary: 'Software engineer with 5 years of experience building reliable web products.', dob: '', gender: '', marital: '', photo: '' },
    exp: [{ id: 'a', title: 'Senior Engineer', company: 'Acme Corp', start: { m: 3, y: '2021' }, end: { y: 'now' }, bullets: 'Led a team of 5 engineers\nCut report time by 40%' }, { id: 'b', title: 'Engineer', company: 'Beta Ltd', start: { m: 1, y: '2018' }, end: { m: 2, y: '2021' }, bullets: 'Built internal tools for 200 staff' }],
    edu: [{ id: 'e', school: 'University of Jordan', major: 'Computer Science', level: 'bachelor', start: { y: '2013' }, end: { y: '2017' } }],
    tech: ['React', 'Node.js', 'SQL'], soft: ['Leadership'],
  },
  ar: {
    p: { name: 'محمد أحمد', title: 'مهندس برمجيات', email: 'mohammad@email.com', phone: '0791234567', city: 'عمّان', residence: '', link: 'linkedin.com/in/mohammad', summary: 'مهندس برمجيات بخبرة 5 سنوات في بناء منتجات ويب موثوقة.', dob: '', gender: '', marital: '', photo: '' },
    exp: [{ id: 'a', title: 'مهندس أول', company: 'شركة المثال', start: { m: 3, y: '2021' }, end: { y: 'now' }, bullets: 'قدت فريقاً من 5 مهندسين\nقللت زمن التقارير 40%' }, { id: 'b', title: 'مهندس', company: 'شركة بيتا', start: { m: 1, y: '2018' }, end: { m: 2, y: '2021' }, bullets: 'بنيت أدوات داخلية لـ 200 موظف' }],
    edu: [{ id: 'e', school: 'الجامعة الأردنية', major: 'علوم الحاسوب', level: 'bachelor', start: { y: '2013' }, end: { y: '2017' } }],
    tech: ['React', 'Node.js', 'SQL'], soft: ['القيادة'],
  },
}
const OPTS = [
  { k: 'classic', name: 'كلاسيكي', sub: 'بسيط ونظيف، عناوين واضحة وتنسيق مريح للقراءة' },
  { k: 'exec', name: 'تنفيذي', sub: 'رسمي وأنيق، خطوط فاصلة وعناوين في المنتصف' },
]

export default function TplPick({ lang, tpl, onPick, onBack }) {
  const s = SAMPLE[lang === 'en' ? 'en' : 'ar']
  return (
    <main className="layout lp-wrap">
      <div className="topbar no-print">
        <button type="button" className="back analyze-back" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          <span>تغيير اللغة</span>
        </button>
      </div>
      <section className="lp tp">
        <h2 className="lp-h">اختر قالب سيرتك الذاتية</h2>
        <p className="lp-p">الأقسام نفسها في القالبين، والفرق في الشكل فقط. يمكنك تغيير القالب لاحقاً.</p>
        <div className="lp-grid" role="group" aria-label="قالب السيرة الذاتية">
          {OPTS.map((o) => (
            <button key={o.k} type="button" className={`lp-card tp-card${tpl === o.k ? ' on' : ''}`} onClick={() => onPick(o.k)} aria-pressed={tpl === o.k}>
              <span className="tp-prev" aria-hidden="true">
                <span className="tp-sc"><Preview cv={{ lang, tpl: o.k, ...s, soft: s.soft, lvl: {}, langs: [], courses: [], confs: [], vol: [] }} /></span>
              </span>
              <span className="lp-n">{o.name}</span>
              <span className="lp-s">{o.sub}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
