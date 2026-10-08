import { createContext, useContext, useEffect, useRef, useState } from 'react'
import logo from './assets/sanad-logo.svg'
import Preview, { MONTH_NAMES, LEVELS } from './Preview.jsx'
import Home from './Home.jsx'
import Analyze from './Analyze.jsx'
import Export from './Export.jsx'
import { post } from './api.js'

const LangCtx = createContext('ar') // language of the CV being written; the date pickers follow it
const WarnCtx = createContext(() => {}) // shows the "wrong language" toast

// English CV: refuse input that would ADD Arabic letters (text that is already there is never touched).
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g
const arCount = (s) => (String(s).match(ARABIC) || []).length
function useGuard() {
  const lang = useContext(LangCtx)
  const warn = useContext(WarnCtx)
  return (next, prev) => {
    if (lang === 'en' && arCount(next) > arCount(prev)) { warn(); return prev }
    return next
  }
}

// Applies fn to every translatable text of the CV (email, phone and links are never touched).
function walk(cv, fn) {
  const f = (t) => fn(t ?? '')
  return {
    ...cv,
    p: { ...cv.p, name: f(cv.p.name), title: f(cv.p.title), city: f(cv.p.city), summary: f(cv.p.summary) },
    tech: cv.tech.map(f),
    soft: cv.soft.map(f),
    langs: cv.langs.map((x) => ({ ...x, name: f(x.name) })),
    edu: cv.edu.map((e) => ({ ...e, school: f(e.school), major: f(e.major) })),
    exp: cv.exp.map((j) => ({ ...j, title: f(j.title), company: f(j.company), bullets: f(j.bullets) })),
    vol: cv.vol.map((j) => ({ ...j, title: f(j.title), company: f(j.company), bullets: f(j.bullets) })),
    courses: (cv.courses || []).map((c) => ({ ...c, title: f(c.title), org: f(c.org) })),
  }
}
const textsOf = (cv) => { const out = []; walk(cv, (t) => { out.push(t); return t }); return out }
const KEY = 'sanad-cv-v1'
const uid = () => Math.random().toString(36).slice(2, 9)
const nd = () => ({ m: '', y: '' })
const empty = (v) => !String(v ?? '').trim()
const dEmpty = (d) => !d.y || (d.y !== 'now' && !d.m) // a date needs a year, and a month unless "until now"
const blankEdu = () => ({ id: uid(), school: '', major: '', start: nd(), end: nd() })
const blankLang = () => ({ id: uid(), name: '', level: '' })
const blankCourse = () => ({ id: uid(), title: '', org: '', date: nd() })
const blankJob = () => ({ id: uid(), title: '', company: '', start: nd(), end: nd(), bullets: '' })
const initial = () => ({
  lang: 'ar',
  p: { name: '', title: '', email: '', phone: '', city: '', link: '', summary: '' },
  tech: [], soft: [], courses: [], langs: [blankLang()], edu: [blankEdu()], exp: [], vol: [],
})
const load = () => {
  try { const s = localStorage.getItem(KEY); if (!s) return initial()
    const d = { ...initial(), ...JSON.parse(s) }
    if (!d.langs || !d.langs.length) d.langs = [blankLang()] // languages are required: always show one row
    return d } catch { return initial() }
}

const Card = ({ n, title, opt, children }) => (
  <div className="card"><h2><span className="n">{n}</span>{title}{opt && <span className="opt-tag">اختياري</span>}</h2>{children}</div>
)
const Field = ({ label, full, err, htmlFor, children }) => (
  <div className={[full && 'full', err && 'invalid'].filter(Boolean).join(' ')}>
    <label htmlFor={htmlFor}>{label}{err && <span className="star"> *</span>}</label>{children}
  </div>
)
const Txt = ({ label, full, err, name, value, onChange, ...rest }) => {
  const guard = useGuard()
  return (
    <Field label={label} full={full} err={err} htmlFor={name}>
      <input id={name} name={name} autoComplete="off" dir={value ? 'auto' : 'rtl'} value={value} onChange={(e) => onChange(guard(e.target.value, value))} {...rest} />
    </Field>
  )
}
const Area = ({ label, full, err, value, onChange }) => {
  const guard = useGuard()
  return (
    <Field label={label} full={full} err={err}>
      <textarea dir={value ? 'auto' : 'rtl'} value={value} onChange={(e) => onChange(guard(e.target.value, value))} />
    </Field>
  )
}

const MIN_Y = 1980
const MAX_Y = new Date().getFullYear() + 6
const numeric = (y) => /^\d+$/.test(y)

// Month + year picker (pop-up). Month names follow the CV language.
function DateSel({ label, value, onChange, now, err }) {
  const lang = useContext(LangCtx)
  const months = MONTH_NAMES[lang]
  const [open, setOpen] = useState(false)
  const [vy, setVy] = useState(() => (numeric(value.y) ? +value.y : new Date().getFullYear()))
  const box = useRef(null)

  useEffect(() => {
    if (!open) return
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc) }
  }, [open])

  const toggle = () => { if (!open && numeric(value.y)) setVy(+value.y); setOpen(!open) }
  const text = value.y === 'now' ? 'حتى الآن' : value.y ? `${value.m ? months[value.m - 1] + ' ' : ''}${value.y}` : ''
  const pick = (i) => { onChange({ m: String(i + 1), y: String(vy) }); setOpen(false) }
  const clear = () => { onChange({ m: '', y: '' }); setOpen(false) }
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

  return (
    <Field label={label} err={err}>
      <div className="dp" ref={box}>
        <button type="button" className="dp-btn" aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" {...stroke} /><path d="M3 10h18M8 3v4M16 3v4" {...stroke} /></svg>
          <span className={text ? '' : 'ph'}>{text || 'اختر التاريخ'}</span>
          <svg viewBox="0 0 12 8" width="12" height="8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" {...stroke} /></svg>
        </button>
        {open && (
          <div className="dp-pop" role="dialog" aria-label={label}>
            <div className="dp-head">
              <button type="button" aria-label="السنة التالية" disabled={vy >= MAX_Y} onClick={() => setVy(vy + 1)}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" {...stroke} strokeWidth={2.6} /></svg></button>
              <b>{vy}</b>
              <button type="button" aria-label="السنة السابقة" disabled={vy <= MIN_Y} onClick={() => setVy(vy - 1)}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" {...stroke} strokeWidth={2.6} /></svg></button>
            </div>
            <div className={`dp-grid${value.y === 'now' ? ' off' : ''}`} dir={lang === 'en' ? 'ltr' : 'rtl'}>
              {months.map((m, i) => (
                <button type="button" key={i} className={value.y === String(vy) && value.m === String(i + 1) ? 'on' : ''} onClick={() => pick(i)}>{m}</button>
              ))}
            </div>
            {now && (
              <button type="button" className={`dp-now${value.y === 'now' ? ' on' : ''}`}
                onClick={() => { onChange(value.y === 'now' ? { m: '', y: '' } : { m: '', y: 'now' }); setOpen(false) }}>حتى الآن</button>
            )}
            <div className="dp-foot">
              <button type="button" className="dp-done" onClick={() => setOpen(false)}>تم</button>
              <button type="button" className="dp-clear" onClick={clear}>مسح</button>
            </div>
          </div>
        )}
      </div>
    </Field>
  )
}

function Chips({ label, items, onChange, placeholder, err }) {
  const guard = useGuard()
  const [v, setV] = useState('')
  const add = () => {
    const t = v.trim()
    if (t && !items.includes(t)) onChange([...items, t])
    setV('')
  }
  return (
    <Field label={label} full err={err}>
      <input dir={v ? 'auto' : 'rtl'} value={v} placeholder={placeholder} onChange={(e) => setV(guard(e.target.value, v))} onBlur={add}
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
            {(optional || items.length > 1) && <button type="button" className="del" onClick={() => onChange(items.filter((x) => x.id !== it.id))}>حذف</button>}
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
const langFields = (tried) => (it, up) => (
  <>
    <Txt label="اللغة" placeholder="مثال: الإنجليزية" value={it.name} err={tried && empty(it.name)} onChange={(v) => up({ name: v })} />
    <Field label="المستوى" err={tried && empty(it.level)}>
      <select value={it.level} onChange={(e) => up({ level: e.target.value })}>
        <option value="">اختر المستوى</option>
        {LEVELS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
      </select>
    </Field>
  </>
)
const courseFields = (it, up) => (
  <>
    <Txt full label="اسم الدورة أو الورشة" value={it.title} onChange={(v) => up({ title: v })} />
    <Txt label="الجهة المنظِّمة" value={it.org} onChange={(v) => up({ org: v })} />
    <DateSel label="تاريخ الإنجاز" value={it.date} onChange={(v) => up({ date: v })} />
  </>
)
const jobFields = (a, b) => (it, up) => (
  <>
    <Txt label={a} value={it.title} onChange={(v) => up({ title: v })} />
    <Txt label={b} value={it.company} onChange={(v) => up({ company: v })} />
    <DateSel label="تاريخ البدء" value={it.start} onChange={(v) => up({ start: v })} />
    <DateSel label="تاريخ الانتهاء" value={it.end} now onChange={(v) => up({ end: v })} />
    <Area full label="الإنجازات (كل سطر نقطة)" value={it.bullets} onChange={(v) => up({ bullets: v })} />
  </>
)

export default function App() {
  const [cv, setCv] = useState(load)
  const [view, setView] = useState('home')
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const flash = (msg) => { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 3000) }
  const warn = () => flash('لغة السيرة الحالية هي الإنجليزية، اكتب بالأحرف الإنجليزية فقط')
  const [translating, setTranslating] = useState(false)
  const [tried, setTried] = useState(false) // red asterisks appear only after the first export attempt
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(cv)) } catch { /* storage unavailable */ } }, [cv])

  const set = (k, v) => setCv((c) => ({ ...c, [k]: v }))
  const setP = (k) => (v) => setCv((c) => ({ ...c, p: { ...c.p, [k]: v } }))
  // Required: everything except the optional sections (experience, volunteer)
  const { p } = cv
  const bad = {
    name: empty(p.name), title: empty(p.title), email: empty(p.email), phone: empty(p.phone),
    city: empty(p.city), summary: empty(p.summary), // LinkedIn is optional
    tech: !cv.tech.length, soft: !cv.soft.length,
  }
  const valid = !Object.values(bad).some(Boolean) && !cv.edu.some((e) => empty(e.school) || empty(e.major) || dEmpty(e.start) || dEmpty(e.end)) && !cv.langs.some((x) => empty(x.name) || empty(x.level))
  const ev = (b) => tried && b
  const validate = () => {
    setTried(true)
    if (!valid) setTimeout(() => document.querySelector('.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
    return valid
  }
  // Changing the CV language translates what is already written (if anything), without asking.
  const switchLang = async (k) => {
    if (k === cv.lang || translating) return
    const texts = textsOf(cv)
    if (texts.every((t) => !String(t).trim())) return set('lang', k)
    setTranslating(true)
    try {
      const r = await post('/api/translate', { to: k, items: texts })
      const { items } = await r.json()
      let i = 0
      setCv((c) => ({ ...walk(c, (t) => items[i++] ?? t), lang: k }))
    } catch (e) {
      set('lang', k) // translation failed: still switch the language, keep the text as it is
      flash(e.status === 429 ? 'تجاوزت عدد الترجمات المسموح، تم تغيير اللغة فقط' : `تعذّرت الترجمة، تم تغيير اللغة فقط${e.body && e.body.reason ? ` (${e.body.status || ''} ${e.body.reason})` : ''}`)
    } finally { setTranslating(false) }
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
      <LangCtx.Provider value={cv.lang}>
      <WarnCtx.Provider value={warn}>
      <main className="layout">
        <div className="topbar no-print">
          <button type="button" className="back" onClick={() => setView('home')}>→ رجوع</button>
        </div>
        <section className="no-print">
          <div className="clear-row"><button type="button" className="link" onClick={reset}>مسح جميع البيانات</button></div>
          <div className="card">
            <h2><span className="n">🌐</span>لغة السيرة الذاتية</h2>
            <div className="tabs">
              {[['ar', 'العربية'], ['en', 'English']].map(([k, t]) => (
                <button key={k} type="button" className={cv.lang === k ? 'on' : ''} onClick={() => switchLang(k)}>{t}</button>
              ))}
            </div>
            <p className="note start">تؤثر على المعاينة وملف PDF فقط. واجهة الموقع تبقى بالعربية.</p>
          </div>

          <Card n="1" title="المعلومات الشخصية">
            <div className="g">
              <Txt name="name" autoComplete="name" label="الاسم الكامل" value={cv.p.name} err={ev(bad.name)} onChange={setP('name')} />
              <Txt name="job-title" autoComplete="organization-title" label="المسمى الوظيفي" value={cv.p.title} err={ev(bad.title)} onChange={setP('title')} />
              <Txt name="email" autoComplete="email" label="البريد الإلكتروني" type="email" dir="ltr" value={cv.p.email} err={ev(bad.email)} onChange={setP('email')} />
              <Txt name="phone" autoComplete="tel" label="رقم الهاتف" type="tel" dir="ltr" value={cv.p.phone} err={ev(bad.phone)} onChange={setP('phone')} />
              <Txt name="city" autoComplete="address-level2" label="المدينة، الدولة" value={cv.p.city} err={ev(bad.city)} onChange={setP('city')} />
              <Txt name="linkedin" autoComplete="url" label="رابط لينكدإن (اختياري)" dir="ltr" placeholder="linkedin.com/in/username" value={cv.p.link} onChange={setP('link')} />
              <Area full label="نبذة مختصرة" err={ev(bad.summary)} value={cv.p.summary} onChange={setP('summary')} />
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
          <Card n="6" title="اللغات">
            <List items={cv.langs} onChange={(v) => set('langs', v)} blank={blankLang} title="لغة" addLabel="إضافة لغة" render={langFields(tried)} />
          </Card>
          <Card n="7" title="الدورات وورش العمل" opt>
            <List items={cv.courses} onChange={(v) => set('courses', v)} blank={blankCourse} optional title="دورة" addLabel="إضافة دورة أو ورشة" render={courseFields} />
          </Card>
        </section>

        <aside className="side">
          <div className="ph no-print"><h2>معاينة مباشرة</h2></div>
          <Preview cv={cv} />
          <Export cv={cv} onValidate={validate} />
        </aside>
      </main>
      {translating && <div className="busy-bg no-print" />}
      {(translating || toast) && <div className="toast no-print" role="status">{translating ? 'جارٍ ترجمة المحتوى…' : toast}</div>}
      </WarnCtx.Provider>
      </LangCtx.Provider>
      )}
    </>
  )
}
