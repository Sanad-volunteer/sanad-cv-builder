// Single source of truth for the education levels and language proficiency wording.
// Imported by the React app (src/Preview.jsx) AND by the server (api/_cv.js -> PDF, Word, email), so they can never drift apart.
// The leading underscore keeps Vercel from exposing this file as an API route.
// Education levels (secondary -> doctorate): the key is stored, the label depends on the CV language.
export const EDU_LEVELS = [['secondary', 'تعليم ثانوي'], ['diploma', 'دبلوم/معهد متوسط'], ['bachelor', 'بكالوريوس'], ['master', 'ماجستير'], ['doctorate', 'دكتوراه']]
export const EDU_LEVEL = {
  ar: Object.fromEntries(EDU_LEVELS),
  en: { secondary: 'Secondary Education', diploma: 'Diploma', bachelor: "Bachelor's Degree", master: "Master's Degree", doctorate: 'Doctorate (PhD)' },
}
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

// Languages offered in the drop-down: the key is stored and printed in the CV language ("العربية" / "Arabic").
// Any other language is typed by the user ("غير ذلك") and printed exactly as typed.
export const LANG_OPTIONS = [['lang:ar', 'Arabic'], ['lang:en', 'English'], ['lang:fr', 'French']]
const LNAME = {
  ar: { 'lang:ar': 'العربية', 'lang:en': 'الإنجليزية', 'lang:fr': 'الفرنسية' },
  en: { 'lang:ar': 'Arabic', 'lang:en': 'English', 'lang:fr': 'French' },
}
export const isLangKey = (v) => !!LNAME.ar[v]
export const langName = (v, l) => LNAME[l][v] || v || ''
// Old drafts stored the name as plain text: map the common spellings to the keys.
const OLD = { arabic: 'lang:ar', 'العربية': 'lang:ar', english: 'lang:en', 'الإنجليزية': 'lang:en', 'الانجليزية': 'lang:en', 'الإنكليزية': 'lang:en', french: 'lang:fr', 'الفرنسية': 'lang:fr' }
export const langKeyFromText = (t) => OLD[String(t || '').trim().toLowerCase()] || t
