import { createContext, useContext, useEffect, useRef, useState } from 'react'
import logo from './assets/sanad-logo.svg'
import Preview, { MONTH_NAMES, LEVELS, EDU_LEVELS } from './Preview.jsx'
import Home from './Home.jsx'
import Analyze from './Analyze.jsx'
import Admin from './Admin.jsx'
import { LANG_OPTIONS, isLangKey, langKeyFromText, SKILL_LEVELS, SKILL_LEVEL, cvFileName } from '../api/_lists.js'
import Export from './Export.jsx'
import { post } from './api.js'
import { cvToText } from './cvText.js'
import { DropMenu, Select, OTHER } from './Select.jsx'

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
const blankLang = () => ({ id: uid(), name: '', native: false, read: '', write: '', listen: '', speak: '' })
const blankCourse = () => ({ id: uid(), title: '', org: '', date: nd() })
const blankConf = () => ({ id: uid(), title: '', date: nd() })
const blankJob = () => ({ id: uid(), title: '', company: '', start: nd(), end: nd(), bullets: '' })
const initial = () => ({
  lang: 'ar',
  p: { name: '', title: '', email: '', phone: '', city: '', residence: '', link: '', photo: '', summary: '', dob: '', gender: '', marital: '' },
  tech: [], soft: [], lvl: {}, courses: [], confs: [], langs: [blankLang()], edu: [blankEdu()], exp: [], vol: [],
})
const load = () => {
  try { const s = localStorage.getItem(KEY); if (!s) return initial()
    const d = { ...initial(), ...JSON.parse(s) }
    d.p = { ...initial().p, ...d.p } // fields added in newer versions
    d.langs = (d.langs || []).map((x) => (x.read === undefined ? { ...x, read: x.level || '', write: x.level || '', listen: x.level || '', speak: x.level || '' } : x)) // old single level -> four skills
    d.langs = d.langs.map((x) => { // "native" used to be a level: four natives -> the checkbox, a single native skill -> proficient
      const all = SKILLS.every(([k]) => x[k] === 'native')
      const fix = Object.fromEntries(SKILLS.map(([k]) => [k, x[k] === 'native' ? 'fluent' : x[k]]))
      return all ? { ...x, native: true, read: '', write: '', listen: '', speak: '' } : { ...x, native: !!x.native, ...fix }
    })
    d.langs = d.langs.map((x) => ({ ...x, name: langKeyFromText(x.name) })) // plain "English" etc. -> the drop-down keys
    d.edu = (d.edu || []).map((e) => ({ level: '', ...e, ...(e.level === 'basic' ? { level: '' } : {}), ...(e.level === 'secondary' ? { major: '' } : {}), ...(String(e.major || '').startsWith('major:') ? { major: '' } : {}) })) // the old specialization list is gone: its saved keys are cleared // education fields added in newer versions
    if (!d.langs.length) d.langs = [blankLang()] // languages are required: always show one row
    return d } catch { return initial() }
}

const STEPS = ['المعلومات الشخصية', 'التعليم', 'الخبرات', 'المهارات', 'اللغات', 'إضافات', 'التصدير']
const Stepper = ({ step, max, bad, go }) => (
  <ol className="steps no-print">
    {STEPS.map((t, i) => (
      <li key={t} className={[i === step && 'cur', i < step && !bad[i] && 'done'].filter(Boolean).join(' ')}>
        <button type="button" disabled={i > max} onClick={() => go(i)} aria-current={i === step ? 'step' : undefined}>
          <span className="dot">{i < step && !bad[i] ? '✓' : i + 1}</span><span className="lbl">{t}</span>
        </button>
      </li>
    ))}
  </ol>
)
const Card = ({ n, title, opt, children }) => (
  <div className="card"><h2>{n && <span className="n">{n}</span>}{title}{opt && <span className="opt-tag">اختياري</span>}</h2>{children}</div>
)
const Field = ({ label, full, err, htmlFor, children }) => (
  <div className={[full && 'full', err && 'invalid'].filter(Boolean).join(' ')}>
    <label htmlFor={htmlFor}>{label}{err && <span className="star"> *</span>}</label>{children}
  </div>
)
const Txt = ({ label, full, err, name, value, onChange, free, ...rest }) => { // free: skip the English-only guard
  const guard = useGuard()
  return (
    <Field label={label} full={full} err={err} htmlFor={name}>
      <input id={name} name={name} autoComplete="off" dir={value ? 'auto' : 'rtl'} value={value} onChange={(e) => onChange(free ? e.target.value : guard(e.target.value, value))} {...rest} />
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
// The date of birth is stored as "YYYY-MM-DD" (what the CV files expect); the picker works with {y, m, d}.
const dobParts = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? { y: m[1], m: String(+m[2]), d: String(+m[3]) } : { y: '', m: '', d: '' } }

const CHECK = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7'/%3E%3C/svg%3E\")" // white tick drawn inside the checked "until now" box
// Month + year picker (pop-up). Month names follow the CV language.
function DateSel({ label, value, onChange, now, err, day, minY = MIN_Y, maxY = MAX_Y }) { // day: also pick the day (date of birth)
  const lang = useContext(LangCtx)
  const months = MONTH_NAMES[lang]
  const [open, setOpen] = useState(false)
  const [vy, setVy] = useState(() => (numeric(value.y) ? +value.y : day ? Math.min(2000, maxY) : new Date().getFullYear()))
  const [vm, setVm] = useState(value.m || '') // month chosen so far while the day is still to be picked
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
  const toggle = () => { if (off) return; if (!open && numeric(value.y)) { setVy(+value.y); setVm(value.m || '') } setOpen(!open) }
  const text = value.y === 'now' ? 'حتى الآن' : value.y ? `${day && value.d ? value.d + ' ' : ''}${value.m ? months[value.m - 1] + ' ' : ''}${value.y}` : ''
  const pick = (i) => { if (day) { setVm(String(i + 1)); return } onChange({ m: String(i + 1), y: String(vy) }); setOpen(false) }
  const pickDay = (d) => { onChange({ y: String(vy), m: vm, d: String(d) }); setOpen(false) }
  const clear = () => { onChange({ m: '', y: '', d: '' }); setVm(''); setOpen(false) }
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

  return (
    <Field label={label} err={err}>
      <div className="dp" ref={box}>
        <button type="button" className="dp-btn" aria-haspopup="dialog" aria-expanded={open} disabled={off} style={off ? { opacity: 0.55, cursor: 'not-allowed' } : undefined} onClick={toggle}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" {...stroke} /><path d="M3 10h18M8 3v4M16 3v4" {...stroke} /></svg>
          <span className={text ? '' : 'dp-ph'}>{text || 'اختر التاريخ'}</span>
          <svg viewBox="0 0 12 8" width="12" height="8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" {...stroke} /></svg>
        </button>
        {open && (
          <div className="dp-pop" role="dialog" aria-label={label}>
            <div className="dp-head">
              <button type="button" aria-label="السنة التالية" disabled={vy >= maxY} onClick={() => setVy(vy + 1)}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" {...stroke} strokeWidth={2.6} /></svg></button>
              <b>{vy}</b>
              <button type="button" aria-label="السنة السابقة" disabled={vy <= minY} onClick={() => setVy(vy - 1)}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" {...stroke} strokeWidth={2.6} /></svg></button>
            </div>
            <div className="dp-grid" dir={lang === 'en' ? 'ltr' : 'rtl'}>
              {months.map((m, i) => (
                <button type="button" key={i} className={(day ? vm === String(i + 1) : value.y === String(vy) && value.m === String(i + 1)) ? 'on' : ''} onClick={() => pick(i)}>{m}</button>
              ))}
            </div>
            {day && vm && (
              <>
                <div className="dp-sub">اختر اليوم</div>
                <div className="dp-grid days" dir="ltr">
                  {Array.from({ length: new Date(vy, +vm, 0).getDate() }, (_, k) => k + 1).map((d) => (
                    <button type="button" key={d} disabled={new Date(vy, +vm - 1, d) > new Date()} className={value.y === String(vy) && value.m === vm && value.d === String(d) ? 'on' : ''} onClick={() => pickDay(d)}>{d}</button>
                  ))}
                </div>
              </>
            )}
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

function SkillMenu({ options, onChoose }) {
  const lang = useContext(LangCtx)
  return <DropMenu placeholder="اختر مهارة" dir={lang === 'en' ? 'ltr' : 'rtl'} groups={[{ items: options.map((o) => ({ value: o, label: o })) }]} other="غير ذلك" onChoose={onChoose} />
}
// Specialization: pick from the list (stored as a key, printed in the CV language) or choose "غير ذلك" and type it.
const NO_MAJOR = ['secondary'] // no specialization at all for secondary school

function Chips({ label, items, onChange, placeholder, err, options, lvl = {}, onLevel, suggest = [], showLvl = false }) {
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
      {(() => {
        const chip = (s) => (
          <span className="chip" key={s}>{s}
            <button type="button" aria-label="حذف" onClick={() => { onChange(items.filter((x) => x !== s)); if (onLevel) onLevel(s, '') }}>
              <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
            </button>
          </span>
        )
        return showLvl && items.length > 0 ? (
          <div className="lvl-list">
            {items.map((s) => (
              <div className="lvl-row" key={s}>
                {chip(s)}
                <Select label={`مستوى ${s}`} value={lvl[s] || ''} onChange={(v) => onLevel(s, v)} placeholder="اختر المستوى" clear="بدون مستوى" options={SKILL_LEVELS.map((k) => [k, SKILL_LEVEL.ar[k]])} />
              </div>
            ))}
          </div>
        ) : <div className="chips">{items.map(chip)}</div>
      })()}
      {suggest.length > 0 && (
        <div className="sugg">
          <span>مقترحة لوظيفتك:</span>
          {suggest.map((s) => <button type="button" key={s} className="chip pick" onClick={() => onChange([...items, s])}>+ {s}</button>)}
        </div>
      )}
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
      <Select label="المرحلة الدراسية" value={it.level || ''} placeholder="اختر المرحلة" options={EDU_LEVELS} onChange={(v) => up(NO_MAJOR.includes(v) ? { level: v, major: '' } : { level: v })} />
    </Field>
    <Txt full label={it.level === 'secondary' ? 'اسم المدرسة' : it.level === 'diploma' ? 'اسم المعهد' : 'اسم الجامعة'} placeholder={it.level === 'secondary' ? 'اكتب اسم المدرسة' : it.level === 'diploma' ? 'اكتب اسم المعهد' : 'اكتب اسم الجامعة'} value={it.school} err={tried && empty(it.school)} onChange={(v) => up({ school: v })} />
    {!NO_MAJOR.includes(it.level) && <Txt full label="اسم التخصص" placeholder="اكتب اسم التخصص" value={it.major} err={tried && empty(it.major)} onChange={(v) => up({ major: v })} />}
    <DateSel label="تاريخ البدء" value={it.start} err={tried && dEmpty(it.start)} onChange={(v) => up({ start: v })} />
    <DateSel label="تاريخ الانتهاء" value={it.end} now err={tried && dEmpty(it.end)} onChange={(v) => up({ end: v })} />
  </>
)
// Language name: pick Arabic / English / French (stored as a key, printed in the CV language) or "غير ذلك" and type it.
const LANG_MENU = [{ items: LANG_OPTIONS.map(([k, label]) => ({ value: k, label })) }]
function LangNameField({ value, onChange, err }) {
  const known = isLangKey(value)
  const [other, setOther] = useState(!!value && !known)
  const choose = (v) => {
    if (v === OTHER) { setOther(true); if (known) onChange('') }
    else { setOther(false); onChange(v) }
  }
  return (
    <Field full label="اللغة" err={err}>
      <DropMenu placeholder="اختر اللغة" dir="ltr" text={known ? LANG_OPTIONS.find(([k]) => k === value)[1] : other ? 'غير ذلك' : ''} groups={LANG_MENU} other="غير ذلك" onChoose={choose} />
      {other && (
        <>
          <div className="gap" />
          <LangOther value={known ? '' : value || ''} onChange={onChange} />
        </>
      )}
    </Field>
  )
}
function LangOther({ value, onChange }) {
  const guard = useGuard()
  return <input dir={value ? 'auto' : 'rtl'} autoComplete="off" placeholder="اكتب اسم اللغة" value={value} onChange={(e) => onChange(guard(e.target.value, value))} />
}
const langFields = (tried) => (it, up) => (
  <>
    <LangNameField value={it.name} err={tried && empty(it.name)} onChange={(v) => up({ name: v })} />
    <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 'normal', cursor: 'pointer', userSelect: 'none' }}>
      <input type="checkbox" checked={!!it.native}
        style={{
          appearance: 'none', WebkitAppearance: 'none', width: 24, height: 24, padding: 0, margin: 0, flex: 'none', cursor: 'pointer',
          borderRadius: 8, border: `2px solid ${it.native ? '#1A1464' : '#cfd0e4'}`, background: it.native ? '#1A1464' : '#fff',
          backgroundImage: it.native ? CHECK : 'none', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: '16px',
          transition: 'background-color .15s, border-color .15s', boxShadow: 'none',
        }}
        onChange={(e) => up(e.target.checked ? { native: true, read: '', write: '', listen: '', speak: '' } : { native: false })} />
      لغة أم
    </label>
    {SKILLS.map(([k, label]) => (
      <Field key={k} label={label} err={tried && !it.native && empty(it[k])}>
        <Select label={label} value={it[k] || ''} disabled={!!it.native} placeholder="اختر المستوى" options={LEVELS} onChange={(v) => up({ [k]: v })} />
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
const courseFields = (tried) => (it, up) => (
  <>
    <Txt free full label="اسم الدورة أو الورشة" value={it.title} onChange={(v) => up({ title: v })} />
    <Txt free label="المعهد أو المؤسسة" value={it.org} err={tried && empty(it.org)} onChange={(v) => up({ org: v })} />
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
      <p className="note start"><strong>أضف صورة شخصية فقط إذا طلبت الجهة المتقدَّم إليها ذلك صراحةً، أو إذا كانت طبيعة الوظيفة يهمّ فيها المظهر الخارجي.</strong></p>
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

const ADMIN_TITLE = 'لوحة تحكم السير الذاتية'
export default function App() {
  const [cv, setCv] = useState(load)
  const [view, setView] = useState(() => (location.hash === '#admin' ? 'admin' : 'home')) // #admin = back office
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const flash = (msg) => { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 3000) }
  const warn = () => flash('لغة السيرة الحالية هي الإنجليزية، اكتب بالأحرف الإنجليزية فقط')
  const [step, setStep] = useState(0) // wizard position
  const [maxStep, setMaxStep] = useState(0) // furthest step reached so far
  const [shown, setShown] = useState([]) // steps where the user tried to continue: only those show red asterisks
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(cv)) } catch { /* storage unavailable */ } }, [cv])

  const [lvlOn, setLvlOn] = useState(() => Object.keys(cv.lvl || {}).length > 0) // "skill levels" switch
  const toggleLvl = (on) => { setLvlOn(on); if (!on) setCv((c) => ({ ...c, lvl: {} })) } // switching off removes the levels from the CV
  const [seed, setSeed] = useState(null) // the CV handed to the analyzer from the last step
  const [sugg, setSugg] = useState({ key: '', tech: [], soft: [] })
  const set = (k, v) => setCv((c) => ({ ...c, [k]: v }))
  const setLvl = (skill, k) => setCv((c) => { const lvl = { ...(c.lvl || {}) }; if (k) lvl[skill] = k; else delete lvl[skill]; return { ...c, lvl } })
  const goView = (v) => { setSeed(null); setView(v) }
  const analyzeMine = () => { setSeed({ file: { name: cvFileName(cv.p.name), type: 'text', data: cvToText(cv), builder: true }, title: cv.p.title }); setView('analyze') }
  // AI skill suggestions for the job title: shown only when they arrive; any failure (busy, limit...) is silent
  const skillKey = cv.p.title.trim() ? `${cv.lang}|${cv.p.title.trim().toLowerCase()}` : ''
  useEffect(() => {
    if (step !== 3 || !skillKey || sugg.key === skillKey) return
    let live = true
    post('/api/skills', { title: cv.p.title.trim(), lang: cv.lang }).then((r) => r.json())
      .then((j) => { if (live) setSugg({ key: skillKey, tech: j.tech || [], soft: j.soft || [] }) })
      .catch(() => {})
    return () => { live = false }
  }, [step, skillKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const sg = sugg.key === skillKey ? sugg : { tech: [], soft: [] }
  const setP = (k) => (v) => setCv((c) => ({ ...c, p: { ...c.p, [k]: v } }))
  // Required: everything except the optional sections (experience, volunteer)
  const { p } = cv
  const bad = {
    name: empty(p.name), title: empty(p.title), email: empty(p.email), phone: empty(p.phone),
    city: empty(p.city), residence: empty(p.residence), summary: empty(p.summary), // LinkedIn is optional
    tech: !cv.tech.length, soft: !cv.soft.length,
  }
  const eduBad = cv.edu.some((e) => empty(e.level) || empty(e.school) || (!NO_MAJOR.includes(e.level) && empty(e.major)) || dEmpty(e.start) || dEmpty(e.end))
  const langBad = cv.langs.some((x) => empty(x.name) || (!x.native && SKILLS.some(([k]) => empty(x[k]))))
  const courseBad = (cv.courses || []).some((c) => empty(c.org))
  // Which wizard steps still have missing required data (optional steps always pass)
  const stepBad = [
    ['name', 'email', 'phone', 'city', 'residence', 'summary'].some((k) => bad[k]),
    eduBad, false, bad.tech || bad.soft, langBad, courseBad, false,
  ]
  const ev = (b, i) => shown.includes(i) && b
  const scrollInvalid = () => setTimeout(() => document.querySelector('.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
  const goTo = (i) => { setStep(i); setMaxStep((m) => Math.max(m, i)); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const next = () => {
    if (stepBad[step]) { setShown((a) => (a.includes(step) ? a : [...a, step])); scrollInvalid(); return }
    goTo(step + 1)
  }
  const validate = () => { // used by the export buttons
    const i = stepBad.findIndex(Boolean)
    if (i < 0) return true
    setShown((a) => [...new Set([...a, i])]); setStep(i); scrollInvalid()
    return false
  }
  useEffect(() => { document.title = view === 'admin' ? `${ADMIN_TITLE} – سند الشباب` : 'منشئ السيرة الذاتية – سند الشباب' }, [view]) // browser tab title
  const reset = () => { if (window.confirm('سيتم حذف جميع البيانات. هل أنت متأكد؟')) { setCv(initial()); setShown([]); setStep(0); setMaxStep(0) } }

  return (
    <>
      <header className="top no-print">
        <div className="logo" role="button" tabIndex={0} onClick={() => goView('home')}><img src={logo} alt="Sanad Youth for Development" /></div>
        <h1>{view === 'admin' ? ADMIN_TITLE : 'منشئ السيرة الذاتية'}</h1>
        <span className="cp">© 2026 جميع الحقوق محفوظة</span>
      </header>

      {view === 'home' && <Home go={goView} />}
      {view === 'analyze' && <Analyze go={goView} seed={seed} />}
      {view === 'admin' && <Admin />}
      {view === 'create' && (
      <LangCtx.Provider value={cv.lang}>
      <WarnCtx.Provider value={warn}>
      <main className="layout">
        <div className="topbar no-print">
          <button type="button" className="back" onClick={() => setView('home')}>→ رجوع</button>
        </div>
        <section className="no-print">
          <div className="clear-row"><button type="button" className="link" onClick={reset}>مسح جميع البيانات</button></div>
          <Stepper step={step} max={maxStep} bad={stepBad} go={goTo} />
          <div key={step} className="step-in">
          {step === 0 && (<>
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
              <Txt name="name" autoComplete="name" label="الاسم الكامل" value={cv.p.name} err={ev(bad.name, 0)} onChange={setP('name')} />
              <Txt name="job-title" autoComplete="organization-title" label="المسمى الوظيفي (اختياري)" value={cv.p.title} onChange={setP('title')} />
              <Txt name="email" autoComplete="email" label="البريد الإلكتروني" type="email" dir="ltr" value={cv.p.email} err={ev(bad.email, 0)} onChange={setP('email')} />
              <Txt name="phone" autoComplete="tel" label="رقم الهاتف" type="tel" dir="ltr" value={cv.p.phone} err={ev(bad.phone, 0)} onChange={setP('phone')} />
              <Txt name="city" autoComplete="address-level2" label="المدينة، الدولة" value={cv.p.city} err={ev(bad.city, 0)} onChange={setP('city')} />
              <Txt name="residence" autoComplete="off" label="مكان السكن الحالي" value={cv.p.residence} err={ev(bad.residence, 0)} onChange={setP('residence')} />
              <Txt name="linkedin" autoComplete="url" label="رابط لينكدإن (اختياري)" dir="ltr" placeholder="linkedin.com/in/username" value={cv.p.link} onChange={setP('link')} />
              <DateSel day minY={1940} maxY={new Date().getFullYear()} label="تاريخ الميلاد (اختياري)" value={dobParts(cv.p.dob)}
                onChange={(v) => setP('dob')(v.y && v.m && v.d ? `${v.y}-${String(v.m).padStart(2, '0')}-${String(v.d).padStart(2, '0')}` : '')} />
              <Field label="الجنس (اختياري)">
                <Select label="الجنس" value={cv.p.gender} placeholder="اختر" clear="بدون تحديد" options={[['male', 'ذكر'], ['female', 'أنثى']]} onChange={setP('gender')} />
              </Field>
              <Field label="الحالة الاجتماعية (اختياري)">
                <Select label="الحالة الاجتماعية" value={cv.p.marital} placeholder="اختر" clear="بدون تحديد" options={[['single', cv.p.gender === 'female' ? 'عزباء' : 'أعزب'], ['married', cv.p.gender === 'female' ? 'متزوجة' : 'متزوج']]} onChange={setP('marital')} />
              </Field>
              <Area full label="نبذة مختصرة (تعريف قصير بك وبهدفك المهني في جملتين أو ثلاث)" placeholder="مثال: طالب هندسة برمجيات مهتم بتطوير تطبيقات الجوال، أبحث عن فرصة تدريب أنمّي فيها مهاراتي." err={ev(bad.summary, 0)} value={cv.p.summary} onChange={setP('summary')} />
              <PhotoField value={cv.p.photo} onChange={setP('photo')} flash={flash} />
            </div>
          </Card>

          </>)}
          {step === 1 && (
          <Card n="2" title="التعليم">
            <p className="note start">رتّب إدخالاتك من الأحدث إلى الأقدم.</p>
            <List items={cv.edu} onChange={(v) => set('edu', v)} blank={blankEdu} title="التعليم" addLabel="إضافة تعليم" render={eduFields(shown.includes(1))} />
          </Card>
          )}
          {step === 2 && (
          <Card n="3" title="الخبرات" opt>
            <p className="note start">رتّب إدخالاتك من الأحدث إلى الأقدم.</p>
            <List items={cv.exp} onChange={(v) => set('exp', v)} blank={blankJob} optional title="خبرة" addLabel="إضافة خبرة" render={jobFields('المسمى الوظيفي', 'الشركة', 'المسؤوليات والإنجازات (كل سطر نقطة)')} />
          </Card>
          )}
          {step === 3 && (
          <Card n="4" title="المهارات">
            <label className="sw">
              <input type="checkbox" role="switch" checked={lvlOn} onChange={(e) => toggleLvl(e.target.checked)} />
              <span className="track" aria-hidden="true" />
              <span>مستويات المهارات</span>
            </label>
            <Chips label="المهارات التقنية" items={cv.tech} options={SKILL_OPTS[cv.lang].tech} err={ev(bad.tech, 3)} onChange={(v) => set('tech', v)} placeholder="اكتب مهارة واضغط Enter" lvl={cv.lvl} onLevel={setLvl} showLvl={lvlOn} suggest={sg.tech.filter((s) => !cv.tech.includes(s))} />
            <div className="gap" />
            <Chips label="المهارات الناعمة" items={cv.soft} options={SKILL_OPTS[cv.lang].soft} err={ev(bad.soft, 3)} onChange={(v) => set('soft', v)} placeholder="اكتب مهارة واضغط Enter" lvl={cv.lvl} onLevel={setLvl} showLvl={lvlOn} suggest={sg.soft.filter((s) => !cv.soft.includes(s))} />
          </Card>
          )}
          {step === 4 && (
          <Card n="5" title="اللغات">
            <List items={cv.langs} onChange={(v) => set('langs', v)} blank={blankLang} title="لغة" addLabel="إضافة لغة" render={langFields(shown.includes(4))} />
          </Card>
          )}
          {step === 5 && (<>
          <Card title="العمل التطوعي" opt>
            <List items={cv.vol} onChange={(v) => set('vol', v)} blank={blankJob} optional title="عمل تطوعي" addLabel="إضافة عمل تطوعي" render={jobFields('الدور', 'المنظمة')} />
          </Card>
          <Card title="الدورات وورش العمل" opt>
            <List items={cv.courses} onChange={(v) => set('courses', v)} blank={blankCourse} optional title="دورة" addLabel="إضافة دورة أو ورشة" render={courseFields(shown.includes(5))} />
          </Card>
          <Card title="المؤتمرات" opt>
            <List items={cv.confs || []} onChange={(v) => set('confs', v)} blank={blankConf} optional title="مؤتمر" addLabel="إضافة مؤتمر" render={confFields} />
          </Card>
          </>)}
          {step === 6 && (
          <Card n={<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M12 11v6M9.5 14.5L12 17l2.5-2.5" /></svg>} title="المراجعة والتصدير">
            <p className="note start">راجع المعاينة ثم حمّل سيرتك أو أرسلها إلى بريدك.</p>
            <Export cv={cv} onValidate={validate} />
            <div className="go-an">
              <b>هل سيرتك جاهزة للتقديم؟</b>
              <p>حلّل سيرتك الذاتية بالذكاء الاصطناعي ليقارنها بالوظيفة التي تستهدفها ويقترح عليك تحسينات.</p>
              <button type="button" className="btn s" onClick={analyzeMine}>✦ حلّل سيرتي الذاتية</button>
            </div>
          </Card>
          )}
          </div>
          <div className="wiz-nav">
            {step > 0 && <button type="button" className="btn ghost" onClick={() => goTo(step - 1)}>السابق</button>}
            {step < STEPS.length - 1 && <button type="button" className="btn" onClick={next}>التالي</button>}
          </div>
        </section>

        <aside className="side">
          <div className="ph no-print"><h2>معاينة</h2></div>
          <Preview cv={cv} />
        </aside>
      </main>
      {toast && <div className="toast no-print" role="status">{toast}</div>}
      </WarnCtx.Provider>
      </LangCtx.Provider>
      )}
    </>
  )
}
