// Single source of truth for the education level and specialization lists.
// Imported by the React app (src/Preview.jsx) AND by the server (api/_cv.js -> PDF, Word, email), so they can never drift apart.
// The leading underscore keeps Vercel from exposing this file as an API route.
// Education levels (secondary -> doctorate): the key is stored, the label depends on the CV language.
export const EDU_LEVELS = [['secondary', 'تعليم ثانوي'], ['diploma', 'دبلوم/معهد متوسط'], ['bachelor', 'بكالوريوس'], ['master', 'ماجستير'], ['doctorate', 'دكتوراه']]
export const EDU_LEVEL = {
  ar: Object.fromEntries(EDU_LEVELS),
  en: { secondary: 'Secondary Education', diploma: 'Diploma', bachelor: "Bachelor's Degree", master: "Master's Degree", doctorate: 'Doctorate (PhD)' },
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
      ["major:elec", "الهندسة الكهربائية", "Electrical Engineering"],
      ["major:computer", "هندسة أتمتة وحواسيب", "Computer & Automation Engineering"],
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

// Language proficiency, rated per skill. langParts() returns [text, bold] pieces printed after the language name:
// all four equal -> "English - Native"; otherwise "English - **Reading**: Native, **Writing**: Fluent, ..."
const LV = {
  ar: { beginner: 'مبتدئ', intermediate: 'متوسط', upper: 'فوق المتوسط', fluent: 'متمرس', native: 'لغة أم' },
  en: { beginner: 'Beginner', intermediate: 'Intermediate', upper: 'Upper-intermediate', fluent: 'Proficient', native: 'Native' },
}
const SKILL_KEYS = ['read', 'write', 'listen', 'speak']
const SK = {
  ar: { read: 'القراءة', write: 'الكتابة', listen: 'الاستماع', speak: 'المحادثة' },
  en: { read: 'Reading', write: 'Writing', listen: 'Listening', speak: 'Speaking' },
}
export const langParts = (x, l) => {
  if (x.native) return [[` - ${LV[l].native}`, false]] // native speaker: no per-skill levels
  const vals = SKILL_KEYS.map((k) => LV[l][x[k]] || '')
  if (!vals.some(Boolean)) return []
  if (vals.every((v) => v && v === vals[0])) return [[` - ${vals[0]}`, false]]
  const out = [[' - ', false]]
  SKILL_KEYS.forEach((k, i) => {
    if (!vals[i]) return
    if (out.length > 1) out.push([l === 'ar' ? '، ' : ', ', false])
    out.push([SK[l][k], true], [`: ${vals[i]}`, false])
  })
  return out
}
