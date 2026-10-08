export const MONTHS = {
  ar: ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}
// Full month names for the date pickers (the CV itself prints the short English names).
export const MONTH_NAMES = {
  ar: MONTHS.ar,
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}

// Language levels: the key is stored, the label depends on the CV language.
export const LEVELS = [['beginner', 'مبتدئ'], ['intermediate', 'متوسط'], ['upper', 'فوق المتوسط'], ['fluent', 'طليق'], ['native', 'لغة أم']]
const LEVEL = {
  ar: Object.fromEntries(LEVELS),
  en: { beginner: 'Beginner', intermediate: 'Intermediate', upper: 'Upper-intermediate', fluent: 'Fluent', native: 'Native' },
}
const T = {
  ar: { summary: 'نبذة', skills: 'المهارات', tech: 'المهارات التقنية', soft: 'المهارات الناعمة', langs: 'اللغات', courses: 'الدورات وورش العمل', edu: 'التعليم', exp: 'الخبرة العملية', vol: 'العمل التطوعي', now: 'حتى الآن' },
  en: { summary: 'Summary', skills: 'Skills', tech: 'Technical', soft: 'Soft', langs: 'Languages', courses: 'Courses & Workshops', edu: 'Education', exp: 'Work Experience', vol: 'Volunteer Work', now: 'Present' },
}

const fmt = (d, l) => (!d || !d.y ? '' : d.y === 'now' ? T[l].now : (d.m ? MONTHS[l][d.m - 1] + ' ' : '') + d.y)
const range = (s, e, l) => [fmt(s, l), fmt(e, l)].filter(Boolean).join(' – ')

const href = (u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`) // add https:// when the user omitted it
const Sec = ({ h, children }) => <section><h2>{h}</h2>{children}</section>
const Row = ({ a, b }) => <div className="r"><b>{a}</b><span>{b}</span></div>
const Bullets = ({ text }) => {
  const l = text.split('\n').map((s) => s.trim()).filter(Boolean)
  return l.length ? <ul>{l.map((s, i) => <li key={i}>{s}</li>)}</ul> : null
}
const Jobs = ({ items, h, l }) => {
  const f = items.filter((i) => i.title || i.company)
  if (!f.length) return null
  return (
    <Sec h={h}>
      {f.map((i) => (
        <div key={i.id}>
          <Row a={[i.title, i.company].filter(Boolean).join(' – ')} b={range(i.start, i.end, l)} />
          <Bullets text={i.bullets} />
        </div>
      ))}
    </Sec>
  )
}

// Plain, single-column, black-on-white markup so ATS parsers read it cleanly.
export default function Preview({ cv }) {
  const { lang, p, tech, soft, edu, exp, vol } = cv
  const courseF = (cv.courses || []).filter((c) => c.title || c.org)
  const langF = (cv.langs || []).filter((x) => x.name && x.name.trim())
  const t = T[lang]
  const sep = lang === 'ar' ? '، ' : ', '
  const contact = [[p.city], [p.email], [p.phone], [p.link, true]].filter(([v]) => v) // [text, isLink]
  const eduF = edu.filter((e) => e.school || e.major)
  const hasJobs = [...exp, ...vol].some((i) => i.title || i.company)
  const empty = !p.name && !p.title && !contact.length && !p.summary && !tech.length && !soft.length && !langF.length && !courseF.length && !eduF.length && !hasJobs

  return (
    <div className="paper" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
      {empty ? (
        <p className="hint">ابدأ بتعبئة النموذج لتظهر سيرتك الذاتية هنا</p>
      ) : (
        <>
          {p.name && <h1>{p.name}</h1>}
          {p.title && <p>{p.title}</p>}
          {contact.length > 0 && (
            <p>{contact.map(([v, isLink], i) => (
                <span key={i}>{i > 0 && ' · '}<bdi>{isLink ? <a href={href(v)} target="_blank" rel="noreferrer">{v}</a> : v}</bdi></span>
              ))}</p>
          )}
          {p.summary && <Sec h={t.summary}><p>{p.summary}</p></Sec>}
          {(tech.length > 0 || soft.length > 0) && (
            <Sec h={t.skills}>
              {tech.length > 0 && <p><b>{t.tech}:</b> {tech.join(sep)}</p>}
              {soft.length > 0 && <p><b>{t.soft}:</b> {soft.join(sep)}</p>}
            </Sec>
          )}
          {langF.length > 0 && (
            <Sec h={t.langs}>
              {langF.map((x) => <p key={x.id}><b>{x.name}</b>{LEVEL[lang][x.level] ? ` – ${LEVEL[lang][x.level]}` : ''}</p>)}
            </Sec>
          )}
          {eduF.length > 0 && (
            <Sec h={t.edu}>
              {eduF.map((e) => (
                <div key={e.id}>
                  <Row a={e.school} b={range(e.start, e.end, lang)} />
                  {e.major && <p>{e.major}</p>}
                </div>
              ))}
            </Sec>
          )}
          <Jobs items={exp} h={t.exp} l={lang} />
          {courseF.length > 0 && (
            <Sec h={t.courses}>
              {courseF.map((c) => <div key={c.id}><Row a={[c.title, c.org].filter(Boolean).join(' – ')} b={fmt(c.date, lang)} /></div>)}
            </Sec>
          )}
          <Jobs items={vol} h={t.vol} l={lang} />
        </>
      )}
    </div>
  )
}
