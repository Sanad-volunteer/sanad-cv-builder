import { createContext, useContext, useEffect, useRef, useState } from 'react'
import logo from './assets/sanad-logo.svg'
import Preview, { MONTH_NAMES, LEVELS, EDU_LEVELS, MAJOR_GROUPS, isMajor, majorLabel } from './Preview.jsx'
import Home from './Home.jsx'
import Analyze from './Analyze.jsx'
import Export from './Export.jsx'

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

const KEY = 'sanad-cv-v1'
const uid = () => Math.random().toString(36).slice(2, 9)
const nd = () => ({ m: '', y: '' })
const empty = (v) => !String(v ?? '').trim()
const dEmpty = (d) => !d.y || (d.y !== 'now' && !d.m) // a date needs a year, and a month unless "until now"
const blankEdu = () => ({ id: uid(), level: '', school: '', major: '', start: nd(), end: nd() })
const TODAY = new Date().toISOString().slice(0, 10)
const SKILLS = [['read', 'القراءة'], ['write', 'الكتابة'], ['listen', 'الاستماع'], ['speak', 'المحادثة']] // each language is rated on all four
const blankLang = () => ({ id: uid(), name: '', read: '', write: '', listen: '', speak: '' })
const blankCourse = () => ({ id: uid(), title: '', org: '', date: nd() })
const blankConf = () => ({ id: uid(), title: '', date: nd() })
const blankJob = () => ({ id: uid(), title: '', company: '', start: nd(), end: nd(), bullets: '' })
const initial = () => ({
  lang: 'ar',
  p: { name: '', title: '', email: '', phone: '', city: '', residence: '', link: '', photo: '', summary: '', dob: '', gender: '', marital: '' },
  tech: [], soft: [], courses: [], confs: [], langs: [blankLang()], edu: [blankEdu()], exp: [], vol: [],
})
const load = () => {
  try { const s = localStorage.getItem(KEY); if (!s) return initial()
    const d = { ...initial(), ...JSON.parse(s) }
    d.p = { ...initial().p, ...d.p } // fields added in newer versions
    d.langs = (d.langs || []).map((x) => (x.read === undefined ? { ...x, read: x.level || '', write: x.level || '', listen: x.level || '', speak: x.level || '' } : x)) // old single level -> four skills
    d.edu = (d.edu || []).map((e) => ({ level: '', ...e })) // education fields added in newer versions
    if (!d.langs.length) d.langs = [blankLang()] // languages are required: always show one row
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
const Area = ({ label, full, err, value, onChange, placeholder }) => {
  const guard = useGuard()
  return (
    <Field label={label} full={full} err={err}>
      <textarea dir={value ? 'auto' : 'rtl'} placeholder={placeholder} value={value} onChange={(e) => onChange(guard(e.target.value, value))} />
    </Field>
  )
}

const MIN_Y = 1980
const MAX_Y = new Date().getFullYear() + 6
const numeric = (y) => /^\d+$/.test(y)

const CHECK = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7'/%3E%3C/svg%3E\")" // white tick drawn inside the checked "until now" box
// Month + year picker (pop-up). Month names follow the CV language.
function DateSel({ label, value, onChange, now, err }) {
  const lang = useContext(LangCtx)
  const months = MONTH_NAMES[lang]
  const [open, setOpen] = useState(false)
  const [vy, setVy] = useState(() => (numeric(value.y) ? +value.y : new Date().getFullYear()))
  const [kb, setKb] = useState(false) // true only while the checkbox is focused with the keyboard
  const box = useRef(null)

  useEffect(() => {
    if (!open) return
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc) }
  }, [open])

  const off = !!now && value.y === 'now' // "until now" ticked: the end date is not chosen
  const toggle = () => { if (off) return; if (!open && numeric(value.y)) setVy(+value.y); setOpen(!open) }
  const text = value.y === 'now' ? 'حتى الآن' : value.y ? `${value.m ? months[value.m - 1] + ' ' : ''}${value.y}` : ''
  const pick = (i) => { onChange({ m: String(i + 1), y: String(vy) }); setOpen(false) }
  const clear = () => { onChange({ m: '', y: '' }); setOpen(false) }
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

  return (
    <Field label={label} err={err}>
      <div className="dp" ref={box}>
        <button type="button" className="dp-btn" aria-haspopup="dialog" aria-expanded={open} disabled={off} style={off ? { opacity: 0.55, cursor: 'not-allowed' } : undefined} onClick={toggle}>
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
            <div className="dp-grid" dir={lang === 'en' ? 'ltr' : 'rtl'}>
              {months.map((m, i) => (
                <button type="button" key={i} className={value.y === String(vy) && value.m === String(i + 1) ? 'on' : ''} onClick={() => pick(i)}>{m}</button>
              ))}
            </div>
            <div className="dp-foot">
              <button type="button" className="dp-done" onClick={() => setOpen(false)}>تم</button>
              <button type="button" className="dp-clear" onClick={clear}>مسح</button>
            </div>
          </div>
        )}
      </div>
      {now && (
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 10, fontWeight: 'normal', cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={value.y === 'now'}
            style={{
              appearance: 'none', WebkitAppearance: 'none', width: 24, height: 24, padding: 0, margin: 0, flex: 'none', cursor: 'pointer',
              borderRadius: 8, border: `2px solid ${value.y === 'now' ? '#1A1464' : '#cfd0e4'}`, background: value.y === 'now' ? '#1A1464' : '#fff',
              backgroundImage: value.y === 'now' ? CHECK : 'none', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: '16px',
              transition: 'background-color .15s, border-color .15s', boxShadow: 'none', outline: kb ? '2px solid #1A1464' : 'none', outlineOffset: 2,
            }}
            onFocus={(e) => setKb(e.target.matches(':focus-visible'))} onBlur={() => setKb(false)}
            onChange={(e) => { setOpen(false); onChange(e.target.checked ? { m: '', y: 'now' } : { m: '', y: '' }) }} />
          حتى الآن
        </label>
      )}
    </Field>
  )
}

// Most common skills offered in the drop-down (shown in the CV language). "غير ذلك" lets the user type their own.
const OTHER = '__other__'
const SKILL_OPTS = {
  ar: {
    tech: ['مايكروسوفت أوفيس', 'مايكروسوفت وورد', 'مايكروسوفت إكسل', 'مايكروسوفت باوربوينت', 'جوجل وورك سبيس', 'كانفا (Canva)', 'فوتوشوب', 'إليستريتور', 'تحرير الفيديو', 'التصميم الجرافيكي', 'إدارة وسائل التواصل الاجتماعي', 'التسويق الرقمي', 'تحسين محركات البحث (SEO)', 'كتابة المحتوى', 'تحليل البيانات', 'إدخال البيانات', 'الكتابة السريعة على الكمبيوتر', 'البرمجة', 'تطوير المواقع', 'قواعد البيانات (SQL)', 'إدارة المشاريع', 'المحاسبة', 'استخدام أدوات الذكاء الاصطناعي'],
    soft: ['التواصل الفعّال', 'العمل ضمن فريق', 'القيادة', 'حل المشكلات', 'إدارة الوقت', 'التفكير النقدي', 'الإبداع', 'المرونة والتكيّف', 'الذكاء العاطفي', 'اتخاذ القرار', 'التفاوض', 'العمل تحت الضغط', 'الالتزام وتحمّل المسؤولية', 'التنظيم', 'سرعة التعلّم', 'خدمة العملاء', 'مهارات العرض والتقديم'],
  },
  en: {
    tech: ['Microsoft Office', 'Microsoft Word', 'Microsoft Excel', 'Microsoft PowerPoint', 'Google Workspace', 'Canva', 'Photoshop', 'Illustrator', 'Video Editing', 'Graphic Design', 'Social Media Management', 'Digital Marketing', 'SEO', 'Content Writing', 'Data Analysis', 'Data Entry', 'Fast Typing', 'Programming', 'Web Development', 'SQL Databases', 'Project Management', 'Accounting', 'Using AI Tools'],
    soft: ['Effective Communication', 'Teamwork', 'Leadership', 'Problem Solving', 'Time Management', 'Critical Thinking', 'Creativity', 'Adaptability', 'Emotional Intelligence', 'Decision Making', 'Negotiation', 'Working Under Pressure', 'Responsibility & Commitment', 'Organization', 'Fast Learning', 'Customer Service', 'Presentation Skills'],
  },
}

// Skills drop-down. A native <select> opens upwards whenever the browser decides there is more room above,
// so this is a small custom menu that always opens downwards (and scrolls itself into view).
function MenuItem({ children, onClick, last }) {
  const [hot, setHot] = useState(false)
  return (
    <button type="button" role="option" onClick={onClick} onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      style={{ display: 'block', width: '100%', textAlign: 'start', background: hot ? 'rgba(0,0,0,.06)' : 'none', border: 0, borderTop: last ? '1px solid rgba(0,0,0,.12)' : 0, padding: '8px 10px', font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
      {children}
    </button>
  )
}
// Drop-down that always opens downwards (a native <select> opens upwards whenever the browser sees more room above).
// groups: [{ label?, items: [{ value, label }] }]. text: what the button shows (empty = placeholder).
function DropMenu({ placeholder, text, groups, onChoose, other, dir }) {
  const lang = useContext(LangCtx)
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const pop = useRef(null)
  useEffect(() => {
    if (!open) return
    pop.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc) }
  }, [open])
  const choose = (v) => { setOpen(false); onChoose(v) }
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  return (
    <div className="dp" ref={box}>
      <button type="button" className="dp-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className={text ? '' : 'ph'}>{text || placeholder}</span>
        <svg viewBox="0 0 12 8" width="12" height="8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" {...stroke} /></svg>
      </button>
      {open && (
        <div className="dp-pop" ref={pop} role="listbox" dir={dir || (lang === 'en' ? 'ltr' : 'rtl')}
          style={{ width: '100%', maxHeight: 280, overflowY: 'auto', boxSizing: 'border-box' }}>
          {groups.map((g, i) => (
            <div key={i}>
              {g.label && <div style={{ padding: '10px 10px 4px', fontSize: 12, fontWeight: 700, color: 'var(--mut)' }}>{g.label}</div>}
              {g.items.map((o) => <MenuItem key={o.value} onClick={() => choose(o.value)}>{o.label}</MenuItem>)}
            </div>
          ))}
          {other && <MenuItem last onClick={() => choose(OTHER)}>{other}</MenuItem>}
        </div>
      )}
    </div>
  )
}
function SkillMenu({ options, onChoose }) {
  const lang = useContext(LangCtx)
  return <DropMenu placeholder="اختر مهارة" dir={lang === 'en' ? 'ltr' : 'rtl'} groups={[{ items: options.map((o) => ({ value: o, label: o })) }]} other="غير ذلك" onChoose={onChoose} />
}
// Specialization: pick from the list (stored as a key, printed in the CV language) or choose "غير ذلك" and type it.
const MAJOR_MENU = MAJOR_GROUPS.map((g) => ({ label: g.ar, items: g.items.map(([k, ar]) => ({ value: k, label: ar })) }))
function MajorField({ value, onChange, err }) {
  const guard = useGuard()
  const known = isMajor(value)
  const [other, setOther] = useState(!!value && !known)
  const choose = (v) => {
    if (v === OTHER) { setOther(true); if (known) onChange('') }
    else { setOther(false); onChange(v) }
  }
  return (
    <Field full label="اسم التخصص" err={err}>
      <DropMenu placeholder="اختر التخصص" dir="rtl" text={known ? majorLabel(value, 'ar') : other ? 'غير ذلك' : ''} groups={MAJOR_MENU} other="غير ذلك" onChoose={choose} />
      {other && (
        <>
          <div className="gap" />
          <input value={known ? '' : value || ''} placeholder="اكتب اسم التخصص" onChange={(e) => onChange(guard(e.target.value, value || ''))} />
        </>
      )}
    </Field>
  )
}

function Chips({ label, items, onChange, placeholder, err, options }) {
  const guard = useGuard()
  const [v, setV] = useState('')
  const [other, setOther] = useState(!options) // without a list, typing is always available
  const add = () => {
    const t = v.trim()
    if (t && !items.includes(t)) onChange([...items, t])
    setV('')
  }
  const pick = (s) => {
    if (s === OTHER) setOther(true)
    else if (s && !items.includes(s)) onChange([...items, s])
  }
  return (
    <Field label={label} full err={err}>
      {options && <SkillMenu options={options.filter((o) => !items.includes(o))} onChoose={pick} />}
      {options && other && <div className="gap" />}
      {other && (
        <input dir={v ? 'auto' : 'rtl'} value={v} placeholder={placeholder} onChange={(e) => setV(guard(e.target.value, v))} onBlur={add}
          onKeyDown={(e) => { if (['Enter', ',', '،'].includes(e.key)) { e.preventDefault(); add() } }} />
      )}
      <div className="chips">
        {items.map((s) => (
          <span className="chip" key={s}>{s}
            <button type="button" aria-label="حذف" onClick={() => onChange(items.filter((x) => x !== s))}>
              <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
            </button>
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
    <Field full label="المرحلة الدراسية" err={tried && empty(it.level)}>
      <select value={it.level || ''} onChange={(e) => up({ level: e.target.value })}>
        <option value="">اختر المرحلة</option>
        {EDU_LEVELS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
      </select>
    </Field>
    <Txt full label="اسم الجامعة" value={it.school} err={tried && empty(it.school)} onChange={(v) => up({ school: v })} />
    <MajorField value={it.major} err={tried && empty(it.major)} onChange={(v) => up({ major: v })} />
    <DateSel label="تاريخ البدء" value={it.start} err={tried && dEmpty(it.start)} onChange={(v) => up({ start: v })} />
    <DateSel label="تاريخ الانتهاء" value={it.end} now err={tried && dEmpty(it.end)} onChange={(v) => up({ end: v })} />
  </>
)
const langFields = (tried) => (it, up) => (
  <>
    <Txt full label="اللغة" placeholder="مثال: الإنجليزية" value={it.name} err={tried && empty(it.name)} onChange={(v) => up({ name: v })} />
    {SKILLS.map(([k, label]) => (
      <Field key={k} label={label} err={tried && empty(it[k])}>
        <select value={it[k] || ''} onChange={(e) => up({ [k]: e.target.value })}>
          <option value="">اختر المستوى</option>
          {LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
    ))}
  </>
)
const confFields = (it, up) => (
  <>
    <Txt full label="اسم المؤتمر" value={it.title} onChange={(v) => up({ title: v })} />
    <DateSel label="التاريخ" value={it.date} onChange={(v) => up({ date: v })} />
  </>
)
const courseFields = (it, up) => (
  <>
    <Txt full label="اسم الدورة أو الورشة" value={it.title} onChange={(v) => up({ title: v })} />
    <Txt label="المعهد أو المؤسسة" value={it.org} onChange={(v) => up({ org: v })} />
    <DateSel label="تاريخ الإنجاز" value={it.date} onChange={(v) => up({ date: v })} />
  </>
)
// Reads the chosen image, crops it to 3:4 and shrinks it to a small JPEG (keeps storage and the PDF request light).
const readPhoto = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    const W = 300, H = 400
    const k = Math.max(W / img.width, H / img.height)
    const w = img.width * k, h = img.height * k
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const g = c.getContext('2d')
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H)
    g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
    URL.revokeObjectURL(url)
    resolve(c.toDataURL('image/jpeg', 0.85))
  }
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')) }
  img.src = url
})
function PhotoField({ value, onChange, flash }) {
  const input = useRef(null)
  const choose = async (e) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (!/^image\//.test(file.type)) return flash('اختر ملف صورة (JPG أو PNG)')
    try { onChange(await readPhoto(file)) } catch { flash('تعذّر قراءة الصورة، جرّب صورة أخرى') }
  }
  return (
    <Field full label="الصورة الشخصية (اختياري)">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={choose} />
      {value ? (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <img src={value} alt="الصورة الشخصية" style={{ width: 120, height: 160, objectFit: 'cover', display: 'block', borderRadius: 12, border: '1.5px solid var(--line)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <button type="button" className="link" onClick={() => input.current.click()}>تغيير الصورة</button>
            <button type="button" className="link" onClick={() => onChange('')}>حذف الصورة</button>
          </div>
        </div>
      ) : (
        <button type="button" className="drop" onClick={() => input.current.click()}
          style={{ width: '100%', height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 0, color: 'var(--navy)', font: 'inherit' }}>
          <svg viewBox="0 0 24 24" width="46" height="46" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
          </svg>
          <b style={{ fontSize: 13, margin: 0 }}>اختر صورة من جهازك</b>
        </button>
      )}
      <p className="note start">أضف صورة شخصية فقط إذا طلبت الجهة المتقدَّم إليها ذلك صراحةً، أو إذا كانت طبيعة الوظيفة يهمّ فيها المظهر الخارجي.</p>
    </Field>
  )
}

const jobFields = (a, b, c = 'الإنجازات (كل سطر نقطة)') => (it, up) => (
  <>
    <Txt label={a} value={it.title} onChange={(v) => up({ title: v })} />
    <Txt label={b} value={it.company} onChange={(v) => up({ company: v })} />
    <DateSel label="تاريخ البدء" value={it.start} onChange={(v) => up({ start: v })} />
    <DateSel label="تاريخ الانتهاء" value={it.end} now onChange={(v) => up({ end: v })} />
    <Area full label={c} value={it.bullets} onChange={(v) => up({ bullets: v })} />
  </>
)

export default function App() {
  const [cv, setCv] = useState(load)
  const [view, setView] = useState('home')
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const flash = (msg) => { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 3000) }
  const warn = () => flash('لغة السيرة الحالية هي الإنجليزية، اكتب بالأحرف الإنجليزية فقط')
  const [tried, setTried] = useState(false) // red asterisks appear only after the first export attempt
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(cv)) } catch { /* storage unavailable */ } }, [cv])

  const set = (k, v) => setCv((c) => ({ ...c, [k]: v }))
  const setP = (k) => (v) => setCv((c) => ({ ...c, p: { ...c.p, [k]: v } }))
  // Required: everything except the optional sections (experience, volunteer)
  const { p } = cv
  const bad = {
    name: empty(p.name), title: empty(p.title), email: empty(p.email), phone: empty(p.phone),
    city: empty(p.city), residence: empty(p.residence), summary: empty(p.summary), // LinkedIn is optional
    tech: !cv.tech.length, soft: !cv.soft.length,
  }
  const valid = !Object.values(bad).some(Boolean) && !cv.edu.some((e) => empty(e.level) || empty(e.school) || empty(e.major) || dEmpty(e.start) || dEmpty(e.end)) && !cv.langs.some((x) => empty(x.name) || SKILLS.some(([k]) => empty(x[k])))
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
                <button key={k} type="button" className={cv.lang === k ? 'on' : ''} onClick={() => set('lang', k)}>{t}</button>
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
              <Txt name="residence" autoComplete="off" label="مكان السكن الحالي" value={cv.p.residence} err={ev(bad.residence)} onChange={setP('residence')} />
              <Txt name="linkedin" autoComplete="url" label="رابط لينكدإن (اختياري)" dir="ltr" placeholder="linkedin.com/in/username" value={cv.p.link} onChange={setP('link')} />
              <Field label="تاريخ الميلاد (اختياري)">
                <input type="date" name="bday" autoComplete="bday" dir="ltr" min="1940-01-01" max={TODAY} value={cv.p.dob} onChange={(e) => setP('dob')(e.target.value)} />
              </Field>
              <Field label="الجنس (اختياري)">
                <select value={cv.p.gender} onChange={(e) => setP('gender')(e.target.value)}>
                  <option value="">اختر</option>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </Field>
              <Field label="الحالة الاجتماعية (اختياري)">
                <select value={cv.p.marital} onChange={(e) => setP('marital')(e.target.value)}>
                  <option value="">اختر</option>
                  <option value="single">{cv.p.gender === 'female' ? 'عزباء' : 'أعزب'}</option>
                  <option value="married">{cv.p.gender === 'female' ? 'متزوجة' : 'متزوج'}</option>
                </select>
              </Field>
              <Area full label="نبذة مختصرة (تعريف قصير بك وبهدفك المهني في جملتين أو ثلاث)" placeholder="مثال: طالب هندسة برمجيات مهتم بتطوير تطبيقات الجوال، أبحث عن فرصة تدريب أنمّي فيها مهاراتي." err={ev(bad.summary)} value={cv.p.summary} onChange={setP('summary')} />
              <PhotoField value={cv.p.photo} onChange={setP('photo')} flash={flash} />
            </div>
          </Card>

          <Card n="2" title="التعليم">
            <List items={cv.edu} onChange={(v) => set('edu', v)} blank={blankEdu} title="التعليم" addLabel="إضافة تعليم" render={eduFields(tried)} />
          </Card>
          <Card n="3" title="الخبرات" opt>
            <List items={cv.exp} onChange={(v) => set('exp', v)} blank={blankJob} optional title="خبرة" addLabel="إضافة خبرة" render={jobFields('المسمى الوظيفي', 'الشركة', 'المسؤوليات والإنجازات (كل سطر نقطة)')} />
          </Card>
          <Card n="4" title="المهارات">
            <Chips label="المهارات التقنية" items={cv.tech} options={SKILL_OPTS[cv.lang].tech} err={ev(bad.tech)} onChange={(v) => set('tech', v)} placeholder="اكتب مهارة واضغط Enter" />
            <div className="gap" />
            <Chips label="المهارات الناعمة" items={cv.soft} options={SKILL_OPTS[cv.lang].soft} err={ev(bad.soft)} onChange={(v) => set('soft', v)} placeholder="اكتب مهارة واضغط Enter" />
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
          <Card n="8" title="المؤتمرات" opt>
            <List items={cv.confs || []} onChange={(v) => set('confs', v)} blank={blankConf} optional title="مؤتمر" addLabel="إضافة مؤتمر" render={confFields} />
          </Card>
        </section>

        <aside className="side">
          <div className="ph no-print"><h2>معاينة مباشرة</h2></div>
          <Preview cv={cv} />
          <Export cv={cv} onValidate={validate} />
        </aside>
      </main>
      {toast && <div className="toast no-print" role="status">{toast}</div>}
      </WarnCtx.Provider>
      </LangCtx.Provider>
      )}
    </>
  )
}
