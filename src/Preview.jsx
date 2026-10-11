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
export const LEVELS = [['beginner', 'مبتدئ'], ['intermediate', 'متوسط'], ['upper', 'فوق المتوسط'], ['fluent', 'متمرس'], ['native', 'لغة أم']]
const LEVEL = {
  ar: Object.fromEntries(LEVELS),
  en: { beginner: 'Beginner', intermediate: 'Intermediate', upper: 'Upper-intermediate', fluent: 'Proficient', native: 'Native' },
}
// Education levels (basic education -> doctorate): the key is stored, the label depends on the CV language.
export const EDU_LEVELS = [['basic', 'تعليم أساسي'], ['secondary', 'تعليم ثانوي'], ['diploma', 'دبلوم'], ['bachelor', 'بكالوريوس'], ['master', 'ماجستير'], ['doctorate', 'دكتوراه']]
const EDU_LEVEL = {
  ar: Object.fromEntries(EDU_LEVELS),
  en: { basic: 'Basic Education', secondary: 'Secondary Education', diploma: 'Diploma', bachelor: "Bachelor's Degree", master: "Master's Degree", doctorate: 'Doctorate (PhD)' },
}
// Specializations offered in the education drop-down. The key is what is stored, so the CV prints the right language;
// anything else (typed through "غير ذلك") is stored and printed as typed.
export const MAJOR_GROUPS = [
  {
    ar: "الاختصاصات الطبية والصحية", en: "Medical & Health Sciences", items: [
      ["major:medicine", "الطب البشري", "Medicine"],
      ["major:dentistry", "طب الأسنان", "Dentistry"],
      ["major:pharmacy", "الصيدلة", "Pharmacy"],
      ["major:nursing", "التمريض", "Nursing"],
      ["major:midwifery", "القبالة", "Midwifery"],
      ["major:dental-prosthetics", "التعويضات السنية", "Dental Prosthetics"],
      ["major:laboratories", "المخابر", "Medical Laboratories"],
      ["major:physiotherapy", "المعالجة الفيزيائية", "Physical Therapy"],
      ["major:anesthesia", "التخدير", "Anesthesia"],
      ["major:nutrition-skincare", "التغذية", "Nutrition"],
      ["major:public-health", "العلوم الصحية", "Health Sciences"],
    ],
  },
  {
    ar: "الاختصاصات الهندسية والتكنولوجية", en: "Engineering & Technology", items: [
      ["major:architecture", "هندسة العمارة", "Architectural Engineering"],
      ["major:civil", "الهندسة المدنية", "Civil Engineering"],
      ["major:mech", "الهندسة الميكانيكية", "Mechanical"],
      ["major:elec", "الهندسة والكهربائية", "Electrical Engineering"],
      ["major:computer", "هندسة أتمتة وحواسيب", "Computer sucience & automation"],
      ["major:comms", "هندسة الاتصالات", "Communications"],
      ["major:software-it", "هندسة المعلوماتية", "Information Technology"],
      ["major:ai", "الذكاء الاصطناعي", "Artificial Intelligence"],
      ["major:cyber", "الأمن السيبراني", "Cybersecurity"],
      ["major:mechatronics-biomed", "الميكاترونكس", "Mechatronics"],
      ["major:petroleum", "هندسة البترول", "Petroleum Engineering"],
    ],
  },
  {
    ar: "الاختصاصات الإدارية والاقتصادية والقانونية", en: "Management, Economics & Law", items: [
      ["major:business-admin", "إدارة الأعمال", "Business Administration"],
      ["major:economics", "الاقتصاد", "Economics"],
      ["major:accounting-finance", "المحاسبة والتدقيق والتمويل", "Accounting, Auditing & Finance"],
      ["major:law", "الحقوق", "Law"],
      ["major:sharia", "الشريعة وأصول الدين", "Sharia & Fundamentals of Religion"],
    ],
  },
  {
    ar: "الآداب والعلوم الإنسانية والتربوية", en: "Arts, Humanities & Education", items: [
      ["major:languages", "اللغة العربية واللغة الإنكليزية", "Arabic & English Language"],
      ["major:translation", "الترجمة", "Translation"],
      ["major:history-archaeology", "التاريخ والآثار", "History & Archaeology"],
      ["major:psychology-sociology", "علم النفس وفلسفة الاجتماع", "Psychology & Philosophy of Sociology"],
    ],
  },
  {
    ar: "العلوم العامة", en: "General Sciences", items: [
      ["major:math", "الرياضيات", "Mathematics"],
      ["major:physics", "الفيزياء", "Physics"],
      ["major:chemistry", "الكيمياء", "Chemistry"],
    ],
  },
  {
    ar: "الإعلام والفنون", en: "Media & Arts", items: [
      ["major:media", "الإعلام", "Media"],
      ["major:fine-arts-design", "الفنون الجميلة والتصميم الداخلي", "Fine Arts & Interior Design"],
      ["major:drama-music-cinema", "المعهد العالي للفنون المسرحية والموسيقا والفنون السينمائية", "Higher Institute of Dramatic Arts, Music & Cinematic Arts"],
    ],
  },
]
const MAJOR = Object.fromEntries(MAJOR_GROUPS.flatMap((g) => g.items.map(([k, ar, en]) => [k, { ar, en }])))
export const isMajor = (v) => !!MAJOR[v]
export const majorLabel = (v, l) => (MAJOR[v] ? MAJOR[v][l] : v || '')
// The four language skills, rated one by one.
const SKILLS = ['read', 'write', 'listen', 'speak']
const SK = {
  ar: { read: 'القراءة', write: 'الكتابة', listen: 'الاستماع', speak: 'المحادثة' },
  en: { read: 'Reading', write: 'Writing', listen: 'Listening', speak: 'Speaking' },
}
// "English – Proficient" when all four skills are equal, otherwise "Reading: …, Writing: …"
const langLine = (x, l) => {
  const vals = SKILLS.map((k) => LEVEL[l][x[k]] || '')
  if (!vals.some(Boolean)) return ''
  if (vals.every((v) => v && v === vals[0])) return ` – ${vals[0]}`
  return ' – ' + SKILLS.filter((k, i) => vals[i]).map((k) => `${SK[l][k]}: ${LEVEL[l][x[k]]}`).join(l === 'ar' ? '، ' : ', ')
}

// Optional personal details line (date of birth, gender, marital status)
const DETAILS = {
  ar: { dob: 'تاريخ الميلاد', gender: 'الجنس', marital: 'الحالة الاجتماعية', male: 'ذكر', female: 'أنثى', single: 'أعزب', singleF: 'عزباء', married: 'متزوج', marriedF: 'متزوجة' },
  en: { dob: 'Date of birth', gender: 'Gender', marital: 'Marital status', male: 'Male', female: 'Female', single: 'Single', singleF: 'Single', married: 'Married', marriedF: 'Married' },
}
// Labels printed (in bold) before each contact line
const CONTACT = {
  ar: { residence: 'مكان السكن', city: 'المدينة', email: 'البريد الإلكتروني', phone: 'الهاتف', link: 'لينكدإن' },
  en: { residence: 'Residence', city: 'City', email: 'Email', phone: 'Phone', link: 'LinkedIn' },
}
const dobText = (iso, l) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''))
  const month = m && MONTH_NAMES[l][+m[2] - 1]
  return month ? `${+m[3]} ${month} ${m[1]}` : ''
}
const T = {
  ar: { summary: 'نبذة', skills: 'المهارات', tech: 'المهارات التقنية', soft: 'المهارات الناعمة', langs: 'اللغات', courses: 'الدورات وورش العمل', edu: 'التعليم', exp: 'الخبرات', vol: 'العمل التطوعي', confs: 'المؤتمرات', now: 'حتى الآن' },
  en: { summary: 'Summary', skills: 'Skills', tech: 'Technical', soft: 'Soft', langs: 'Languages', courses: 'Courses & Workshops', edu: 'Education', exp: 'Work Experience', vol: 'Volunteer Work', confs: 'Conferences', now: 'Present' },
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
  const confF = (cv.confs || []).filter((c) => c.title)
  const langF = (cv.langs || []).filter((x) => x.name && x.name.trim())
  const t = T[lang]
  const d = DETAILS[lang]
  const genderLine = (p.gender === 'male' || p.gender === 'female') && [d.gender, d[p.gender]] // [label, value]
  const details = [
    dobText(p.dob, lang) && [d.dob, dobText(p.dob, lang)],
    (p.marital === 'single' || p.marital === 'married') && [d.marital, d[p.marital + (p.gender === 'female' ? 'F' : '')]],
  ].filter(Boolean)
  const sep = lang === 'ar' ? '، ' : ', '
  const contact = [['residence', p.residence], ['city', p.city], ['email', p.email], ['phone', p.phone], ['link', p.link, true]].filter(([, v]) => v) // [key, text, isLink]
  const eduF = edu.filter((e) => e.school || e.major || e.level)
  const hasJobs = [...exp, ...vol].some((i) => i.title || i.company)
  const empty = !p.name && !p.title && !contact.length && !p.summary && !p.photo && !genderLine && !details.length && !tech.length && !soft.length && !langF.length && !courseF.length && !confF.length && !eduF.length && !hasJobs

  const head = (
    <>
    {p.name && <h1 style={{ lineHeight: 1.25 }}>{p.name}</h1>}
    {p.title && <p style={{ fontSize: '1.3em', lineHeight: 1.3, marginBottom: 6 }}>{p.title}</p>}
    {contact.map(([k, v, isLink]) => (
      <p key={k}><b>{CONTACT[lang][k]}:</b> <bdi>{isLink ? <a href={href(v)} target="_blank" rel="noreferrer">{v}</a> : v}</bdi></p>
    ))}
    {genderLine && <p><b>{genderLine[0]}:</b> {genderLine[1]}</p>}
    {details.length > 0 && <p>{details.map(([k, v], i) => <span key={k}>{i > 0 && ' · '}<b>{k}:</b> {v}</span>)}</p>}
    </>
  )

  return (
    <div className="paper" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
      {empty ? (
        <p className="hint">ابدأ بتعبئة النموذج لتظهر سيرتك الذاتية هنا</p>
      ) : (
        <>
          {p.photo && /^data:image\//.test(p.photo) ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>{head}</div>
              <img src={p.photo} alt="" style={{ width: 96, height: 128, objectFit: 'cover', flex: 'none' }} />
            </div>
          ) : head}
          {p.summary && <Sec h={t.summary}><p>{p.summary}</p></Sec>}
          {eduF.length > 0 && (
            <Sec h={t.edu}>
              {eduF.map((e) => {
                const line = EDU_LEVEL[lang][e.level] || '' // "Bachelor's Degree"
                return (
                  <div key={e.id}>
                    <Row a={[e.school, majorLabel(e.major, lang)].filter(Boolean).join(' - ')} b={range(e.start, e.end, lang)} />
                    {line && <p>{line}</p>}
                  </div>
                )
              })}
            </Sec>
          )}
          <Jobs items={exp} h={t.exp} l={lang} />
          {(tech.length > 0 || soft.length > 0) && (
            <Sec h={t.skills}>
              {tech.length > 0 && <p><b>{t.tech}:</b> {tech.join(sep)}</p>}
              {soft.length > 0 && <p><b>{t.soft}:</b> {soft.join(sep)}</p>}
            </Sec>
          )}
          {langF.length > 0 && (
            <Sec h={t.langs}>
              {langF.map((x) => <p key={x.id}><b>{x.name}</b>{langLine(x, lang)}</p>)}
            </Sec>
          )}
          {courseF.length > 0 && (
            <Sec h={t.courses}>
              {courseF.map((c) => <div key={c.id}><Row a={[c.title, c.org].filter(Boolean).join(' – ')} b={fmt(c.date, lang)} /></div>)}
            </Sec>
          )}
          <Jobs items={vol} h={t.vol} l={lang} />
          {confF.length > 0 && (
            <Sec h={t.confs}>
              {confF.map((c) => <div key={c.id}><Row a={c.title} b={fmt(c.date, lang)} /></div>)}
            </Sec>
          )}
        </>
      )}
    </div>
  )
}
