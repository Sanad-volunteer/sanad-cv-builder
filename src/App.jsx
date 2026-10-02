import { useEffect, useState } from 'react'
import logo from './assets/sanad-logo.svg'
import Preview, { MONTHS } from './Preview.jsx'
import Home from './Home.jsx'
import Analyze from './Analyze.jsx'
import Export from './Export.jsx'

const KEY = 'sanad-cv-v1'
const uid = () => Math.random().toString(36).slice(2, 9)
const nd = () => ({ m: '', y: '' })
const empty = (v) => !String(v ?? '').trim()
const dEmpty = (d) => !d.y || (d.y !== 'now' && !d.m) // a date needs a year, and a month unless "until now"
const blankEdu = () => ({ id: uid(), school: '', major: '', start: nd(), end: nd() })
const blankJob = () => ({ id: uid(), title: '', company: '', start: nd(), end: nd(), bullets: '' })
const initial = () => ({
  lang: 'ar',
  p: { name: '', title: '', email: '', phone: '', city: '', link: '', summary: '' },
  tech: [], soft: [], edu: [blankEdu()], exp: [], vol: [],
})
const load = () => {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : initial() } catch { return initial() }
}

const Card = ({ n, title, opt, children }) => (
  <div className="card"><h2><span className="n">{n}</span>{title}{opt && <span className="opt-tag">اختياري</span>}</h2>{children}</div>
)
const Field = ({ label, full, err, children }) => (
  <div className={[full && 'full', err && 'invalid'].filter(Boolean).join(' ')}>
    <label>{label}{err && <span className="star"> *</span>}</label>{children}
  </div>
)
const Txt = ({ label, full, err, value, onChange, ...rest }) => (
  <Field label={label} full={full} err={err}>
    <input dir="auto" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
  </Field>
)

function DateSel({ label, value, onChange, now, err }) {
  const years = []
  for (let y = new Date().getFullYear() + 6; y >= 1980; y--) years.push(y)
  return (
    <Field label={label} err={err}>
      <div className="dates">
        <select value={value.m} disabled={value.y === 'now'} onChange={(e) => onChange({ ...value, m: e.target.value })}>
          <option value="">الشهر</option>
          {MONTHS.ar.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
        </select>
        <select value={value.y} onChange={(e) => onChange(e.target.value === 'now' ? { m: '', y: 'now' } : { ...value, y: e.target.value })}>
          <option value="">السنة</option>
          {now && <option value="now">حتى الآن</option>}
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </Field>
  )
}

function Chips({ label, items, onChange, placeholder, err }) {
  const [v, setV] = useState('')
  const add = () => {
    const t = v.trim()
    if (t && !items.includes(t)) onChange([...items, t])
    setV('')
  }
  return (
    <Field label={label} full err={err}>
      <input dir="auto" value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={add}
        onKeyDown={(e) => { if (['Enter', ',', '،'].includes(e.key)) { e.preventDefault(); add() } }} />
      <div className="chips">
        {items.map((s) => (
          <span className="chip" key={s}>{s}
            <button type="button" aria-label="حذف" onClick={() => onChange(items.filter((x) => x !== s))}>×</button>
          </span>
        ))}
      </div>
    </Field>
  )
}

function List({ items, onChange, blank, title, addLabel, render, optional }) {
  const upd = (id, patch) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  return (
    <>
      {items.map((it, i) => (
        <div className="entry" key={it.id}>
          <div className="entry-h">
            <span>{title} {i + 1}</span>
            {(optional || items.length > 1) && <button type="button" className="link" onClick={() => onChange(items.filter((x) => x.id !== it.id))}>حذف</button>}
          </div>
          <div className="g">{render(it, (patch) => upd(it.id, patch))}</div>
        </div>
      ))}
      {!items.length && <p className="note start">قسم اختياري — أضفه عند الحاجة فقط.</p>}
      <button type="button" className="add" onClick={() => onChange([...items, blank()])}>+ {addLabel}</button>
    </>
  )
}

const eduFields = (tried) => (it, up) => (
  <>
    <Txt full label="اسم الجامعة" value={it.school} err={tried && empty(it.school)} onChange={(v) => up({ school: v })} />
    <Txt full label="التخصص" value={it.major} err={tried && empty(it.major)} onChange={(v) => up({ major: v })} />
    <DateSel label="تاريخ البدء" value={it.start} err={tried && dEmpty(it.start)} onChange={(v) => up({ start: v })} />
    <DateSel label="تاريخ الانتهاء" value={it.end} now err={tried && dEmpty(it.end)} onChange={(v) => up({ end: v })} />
  </>
)
const jobFields = (a, b) => (it, up) => (
  <>
    <Txt label={a} value={it.title} onChange={(v) => up({ title: v })} />
    <Txt label={b} value={it.company} onChange={(v) => up({ company: v })} />
    <DateSel label="تاريخ البدء" value={it.start} onChange={(v) => up({ start: v })} />
    <DateSel label="تاريخ الانتهاء" value={it.end} now onChange={(v) => up({ end: v })} />
    <Field full label="الإنجازات (كل سطر نقطة)">
      <textarea dir="auto" value={it.bullets} onChange={(e) => up({ bullets: e.target.value })} />
    </Field>
  </>
)

export default function App() {
  const [cv, setCv] = useState(load)
  const [view, setView] = useState('home')
  const [tried, setTried] = useState(false) // red asterisks appear only after the first export attempt
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(cv)) } catch { /* storage unavailable */ } }, [cv])

  const set = (k, v) => setCv((c) => ({ ...c, [k]: v }))
  const setP = (k) => (v) => setCv((c) => ({ ...c, p: { ...c.p, [k]: v } }))
  // Required: everything except the optional sections (experience, volunteer)
  const { p } = cv
  const bad = {
    name: empty(p.name), title: empty(p.title), email: empty(p.email), phone: empty(p.phone),
    city: empty(p.city), link: empty(p.link), summary: empty(p.summary),
    tech: !cv.tech.length, soft: !cv.soft.length,
  }
  const valid = !Object.values(bad).some(Boolean) && !cv.edu.some((e) => empty(e.school) || empty(e.major) || dEmpty(e.start) || dEmpty(e.end))
  const ev = (b) => tried && b
  const validate = () => {
    setTried(true)
    if (!valid) setTimeout(() => document.querySelector('.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
    return valid
  }
  const reset = () => { if (window.confirm('سيتم حذف جميع البيانات. هل أنت متأكد؟')) { setCv(initial()); setTried(false) } }

  return (
    <>
      <header className="top no-print">
        <div className="logo" role="button" tabIndex={0} onClick={() => setView('home')}><img src={logo} alt="Sanad Youth for Development" /></div>
        <h1>منشئ السيرة الذاتية</h1>
        <span className="cp">© 2026 جميع الحقوق محفوظة</span>
      </header>

      {view === 'home' && <Home go={setView} />}
      {view === 'analyze' && <Analyze go={setView} />}
      {view === 'create' && (
      <main className="layout">
        <div className="topbar no-print">
          <button type="button" className="back" onClick={() => setView('home')}>→ رجوع</button>
          <button type="button" className="link" onClick={reset}>مسح جميع البيانات</button>
        </div>
        <section className="no-print">
          <div className="card">
            <h2><span className="n">🌐</span>لغة السيرة الذاتية</h2>
            <div className="tabs">
              {[['ar', 'العربية'], ['en', 'English']].map(([k, t]) => (
                <button key={k} type="button" className={cv.lang === k ? 'on' : ''} onClick={() => set('lang', k)}>{t}</button>
              ))}
            </div>
            <p className="note start">تؤثر على المعاينة وملف PDF فقط. واجهة الموقع تبقى بالعربية.</p>
          </div>

          <Card n="1" title="المعلومات الشخصية">
            <div className="g">
              <Txt label="الاسم الكامل" value={cv.p.name} err={ev(bad.name)} onChange={setP('name')} />
              <Txt label="المسمى الوظيفي" value={cv.p.title} err={ev(bad.title)} onChange={setP('title')} />
              <Txt label="البريد الإلكتروني" type="email" dir="ltr" value={cv.p.email} err={ev(bad.email)} onChange={setP('email')} />
              <Txt label="رقم الهاتف" type="tel" dir="ltr" value={cv.p.phone} err={ev(bad.phone)} onChange={setP('phone')} />
              <Txt label="المدينة، الدولة" value={cv.p.city} err={ev(bad.city)} onChange={setP('city')} />
              <Txt label="رابط لينكدإن" dir="ltr" value={cv.p.link} err={ev(bad.link)} onChange={setP('link')} />
              <Field full label="نبذة مختصرة" err={ev(bad.summary)}>
                <textarea dir="auto" value={cv.p.summary} onChange={(e) => setP('summary')(e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card n="2" title="المهارات">
            <Chips label="المهارات التقنية" items={cv.tech} err={ev(bad.tech)} onChange={(v) => set('tech', v)} placeholder="اكتب مهارة واضغط Enter" />
            <div className="gap" />
            <Chips label="المهارات الناعمة" items={cv.soft} err={ev(bad.soft)} onChange={(v) => set('soft', v)} placeholder="اكتب مهارة واضغط Enter" />
          </Card>

          <Card n="3" title="التعليم">
            <List items={cv.edu} onChange={(v) => set('edu', v)} blank={blankEdu} title="التعليم" addLabel="إضافة تعليم" render={eduFields(tried)} />
          </Card>
          <Card n="4" title="الخبرة العملية" opt>
            <List items={cv.exp} onChange={(v) => set('exp', v)} blank={blankJob} optional title="خبرة" addLabel="إضافة خبرة" render={jobFields('المسمى الوظيفي', 'الشركة')} />
          </Card>
          <Card n="5" title="العمل التطوعي" opt>
            <List items={cv.vol} onChange={(v) => set('vol', v)} blank={blankJob} optional title="عمل تطوعي" addLabel="إضافة عمل تطوعي" render={jobFields('الدور', 'المنظمة')} />
          </Card>
        </section>

        <aside className="side">
          <div className="ph no-print"><h2>معاينة مباشرة</h2><span className="badge">✓ متوافق مع ATS</span></div>
          <Preview cv={cv} />
          <Export cv={cv} onValidate={validate} />
        </aside>
      </main>
      )}
    </>
  )
}
