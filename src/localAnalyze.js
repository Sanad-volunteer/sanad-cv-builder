// Browser-side CV review (no AI). Used quietly when the AI service is busy or unavailable.
// It returns the same shape as /api/analyze:
//   { score, verdict, summary, missingKeywords: [], checks: [{ id, ok: true | false | null, text }] }
// `checks` has one item per CV part (contact, summary, sections, title_match, dates, metrics, skills, font, file); ok === null means "cannot be checked here".
// It compares the CV with the job words, checks the structure of the CV and gives rule-based advice.
// It never invents anything: advice about missing keywords always says "if it is true".

import { FIELDS, COMMON_SKILLS, SOFT_SKILLS, TITLE_GROUPS, ACTION_VERBS } from './analyzeRules.js'

// ---------- text helpers (Arabic + English) ----------
const DIACRITICS = /[\u064B-\u065F\u0670\u0640]/g // tashkeel + tatweel
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/
const INDIC_DIGITS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' }

// NFKC turns Arabic presentation forms (what many PDFs contain) back into normal letters.
const clean = (s) => String(s || '').normalize('NFKC').replace(/[٠-٩۰-۹]/g, (d) => INDIC_DIGITS[d]).replace(DIACRITICS, '')
const norm = (w) => clean(w).toLowerCase().replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
const flip = (s) => Array.from(s).reverse().join('') // PDFs sometimes store Arabic in visual (reversed) order

const letters = (s) => Array.from(s).filter((c) => /\p{L}/u.test(c)).sort().join('')
const dropOnce = (s, c) => { const i = s.indexOf(c); return i < 0 ? s : s.slice(0, i) + s.slice(i + 1) }
const TOKEN = /[\p{L}\p{N}](?:[\p{L}\p{N}+#.]*[\p{L}\p{N}+#])?/gu
const SHORT_OK = new Set(['ui', 'ux', 'hr', 'qa', 'ai', 'bi', 'it', 'c#', 'c++', 'r', 'go', 'ml'])

function stem(w) {
  if (ARABIC.test(w)) {
    let s = w.replace(/^(وال|بال|كال|فال|لل|ال)(?=.{3,})/, '')
    if (s.length >= 5 && s[0] === 'و') s = s.slice(1)
    s = s.replace(/(ات|ون|ين|ان)$/, (m, x, i) => (i >= 3 ? '' : m)).replace(/ه$/, (m, i) => (i >= 3 ? '' : m))
    return s
  }
  if (w.length > 3 && w.endsWith('ies')) return `${w.slice(0, -3)}y`
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

const STOP_EN = `a an and are as at be been but by can for from has have in into is it its of on or our per such that the their them then there these they this to was we were will with you your who which within whom also any all more most other than too very use using used work working works job role position company team candidate candidates ability able strong excellent good great knowledge experience experienced years year required requirement requirements responsibilities responsibility preferred plus including include includes etc must should would could may might looking seeking join opportunity apply applicants applicant skills skill qualifications qualification duties responsible ensure about across after again against both each few how if just like make new not now only own same so some such what when where while why up out over under well best high highly based related relevant ideal minimum least least needed need needs provide providing perform performing`.split(/\s+/)
const STOP_AR = `في من على الى إلى عن مع او أو و ثم هذا هذه ذلك تلك التي الذي الذين ان أن إن كان يكون تكون لدي لدى لديه ما لا لم لن قد كل بعض غير بين حتى عند بعد قبل خلال حول ضمن هو هي نحن انت وظيفه الوظيفه وظيفة الوظيفة مطلوب مطلوبه يجب ينبغي خبره الخبره خبرة الخبرة سنوات سنه سنة شركه الشركه شركة الشركة نبحث ابحث القدره قدره القدرة قدرة مهارات المهارات مسؤوليات المسؤوليات متطلبات المتطلبات مؤهلات المؤهلات وصف مهام المهام امتلاك معرفه معرفة جيده جيدة جيد ممتاز ممتازه ممتازة قوي قويه قوية فريق ايضا أيضا كما اي أي حيث مثل عمل العمل سيتم يتم ويتم لدينا لديها نوع كافه كافة تقديم المتقدم المتقدمين فرصه فرصة يفضل يفضّل مفضل مفضله المفضل`.split(/\s+/)
const STOP = new Set([...STOP_EN, ...STOP_AR].flatMap((w) => [norm(w), stem(norm(w))]))

const tokens = (text) => (clean(text).match(TOKEN) || [])
const isKeywordToken = (orig) => {
  const w = norm(orig)
  if (/^\d+$/.test(w) || STOP.has(w) || STOP.has(stem(w))) return false
  if (w.length >= 3) return true
  return SHORT_OK.has(w) && orig === orig.toUpperCase() && orig.length >= 2 // "IT", "UI", "HR" written in capitals
}

// ---------- CV facts ----------
const SECTIONS = {
  summary: ['نبذه', 'نبذه مختصره', 'نبذه عني', 'ملخص', 'ملخص مهني', 'ملخص السيره', 'الملف الشخصي', 'summary', 'professional summary', 'profile', 'professional profile', 'objective', 'career objective', 'about me', 'about', 'personal statement'],
  skills: ['المهارات', 'مهارات', 'المهارات التقنيه', 'المهارات الاساسيه', 'المهارات الشخصيه', 'skills', 'technical skills', 'core skills', 'key skills', 'core competencies', 'competencies', 'soft skills'],
  education: ['التعليم', 'المؤهلات', 'المؤهلات العلميه', 'المؤهلات الاكاديميه', 'التعليم والمؤهلات', 'التحصيل العلمي', 'education', 'education and training', 'academic background', 'qualifications'],
  experience: ['الخبرات', 'الخبره', 'الخبره العمليه', 'الخبرات العمليه', 'الخبره المهنيه', 'الخبرات المهنيه', 'التجربه المهنيه', 'experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history', 'career history', 'internships'],
  volunteer: ['العمل التطوعي', 'التطوع', 'الاعمال التطوعيه', 'volunteer', 'volunteering', 'volunteer work', 'volunteer experience'],
  languages: ['اللغات', 'اللغه', 'languages', 'language skills'],
  courses: ['الدورات', 'الدورات وورش العمل', 'الدورات التدريبيه', 'التدريب', 'courses', 'certifications', 'certificates', 'training', 'workshops'],
}
const DEGREE = /bachelor|master|ph\.?d|diploma|university|college|بكالوريوس|ماجستير|دكتوراه|دبلوم|جامعه|الجامعه|معهد/

function findSections(lines) { // Map: section key -> index of its heading line
  const found = new Map()
  lines.forEach((raw, idx) => {
    // each line is checked as written and flipped (visual-order PDFs)
    for (const cand of [raw, ARABIC.test(raw) ? flip(raw) : '']) {
      const l = norm(cand).replace(/[:\-–|•·●▪]/g, ' ').replace(/\s+/g, ' ').trim()
      if (!l || l.length > 40) continue
      const key = letters(l.replace(/\s/g, ''))
      for (const [k, names] of Object.entries(SECTIONS)) {
        if (!found.has(k) && names.some((n) => l === n || l.startsWith(`${n} `) || (ARABIC.test(l) && key.length >= 4 && key === letters(n.replace(/\s/g, ''))))) found.set(k, idx)
      }
    }
  })
  return found
}
// Lines under a section heading, up to the next heading
function sectionLines(lines, sections, key) {
  if (!sections.has(key)) return []
  const start = sections.get(key)
  const next = [...sections.values()].filter((i) => i > start).sort((a, b) => a - b)[0]
  return lines.slice(start + 1, next === undefined ? lines.length : next)
}

const countMetrics = (text) => {
  const t = text.replace(/\S+@\S+/g, ' ').replace(/\+?\d[\d\s().-]{6,}\d/g, ' ').replace(/\b(?:19|20)\d{2}\b/g, ' ')
  return (t.match(/\d+(?:[.,]\d+)?\s?%|\b\d{2,}\+?(?![\d.])/g) || []).length
}

const SECTION_AR = { summary: 'النبذة', skills: 'المهارات', education: 'التعليم', experience: 'الخبرات', volunteer: 'العمل التطوعي', languages: 'اللغات', courses: 'الدورات' }

// ---- the rules (the same rules are given to the AI in api/analyze.js) ----
const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|كانون الثاني|كانون الاول|شباط|اذار|نيسان|ايار|حزيران|تموز|اب|ايلول|تشرين الاول|تشرين الثاني|يناير|فبراير|مارس|ابريل|مايو|يونيو|يوليو|اغسطس|سبتمبر|اكتوبر|نوفمبر|ديسمبر)'
const GOOD_DATE = new RegExp(`(?<![\\d/])(?:0?[1-9]|1[0-2])\\s?[/.-]\\s?(?:\\d{4}|\\d{2})(?![\\d/])|(?<![\\p{L}])${MONTH}\\.?\\s*,?\\s*(?:19|20)\\d{2}`, 'gu')
const BAD_DATE = /(?<![\d/])\d{1,2}\s?[/.-]\s?\d{1,2}\s?[/.-]\s?\d{2,4}(?![\d/])/g // 25/03/2021: day-first dates confuse ATS parsers
const SEEKING = /looking for|seeking|i want|أبحث|ابحث|أسعى|اسعى|أطمح|اطمح|أتطلع|اتطلع|أريد|اريد|أتمنى|اتمنى|أرغب|ارغب/i
const SILLY_EMAIL = /cool|sexy|baby|boss|king|queen|love|lover|angel|crazy|princess|hot|ninja|killer|gamer|xxx|\d{5,}/i
const DECORATIVE_FONT = /script|brush|comic|papyrus|curlz|chancery|handwrit|blackadder|bradley|jokerman|kristen|segoe print|lucida hand/i
const wordCount = (t) => (t.match(TOKEN) || []).length
const list = (a) => a.join('، ')

// ---------- dictionary matching ----------
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const reCache = new Map()
// One spelling -> regex over normalized text. Arabic: allows the usual prefixes (ال، و، ب، ل...) and plural/feminine endings; Latin: allows a plural "s".
function termRe(alias) {
  const n = norm(alias).trim()
  if (reCache.has(n)) return reCache.get(n)
  const ar = ARABIC.test(n)
  const body = escRe(n).replace(/\s+/g, '\\s+')
  const re = new RegExp(`(?<![\\p{L}\\p{N}+#])${ar ? '(?:وال|بال|لل|ال|و|ب|ل|ف|ك)?' : ''}${body}${ar ? '(?:ات|ون|ين|ان|ه)?' : '(?:s|es)?'}(?![\\p{L}\\p{N}+#])`, 'giu')
  reCache.set(n, re)
  return re
}
const countAlias = (hay, aliases) => aliases.reduce((n, a) => n + (hay.match(termRe(a)) || []).length, 0)
const hasAlias = (hay, aliases) => aliases.some((a) => { termRe(a).lastIndex = 0; return termRe(a).test(hay) })
const GLOSSARY = [...FIELDS.flatMap((f) => f.skills), ...COMMON_SKILLS, ...SOFT_SKILLS]
const GLOSSARY_ALIASES = new Set(GLOSSARY.flat().map((a) => norm(a)))
const MONTHS_NUM = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  'كانون الثاني': 1, يناير: 1, شباط: 2, فبراير: 2, اذار: 3, مارس: 3, نيسان: 4, ابريل: 4, ايار: 5, مايو: 5, حزيران: 6, يونيو: 6, تموز: 7, يوليو: 7, اب: 8, اغسطس: 8, ايلول: 9, سبتمبر: 9, 'تشرين الاول': 10, اكتوبر: 10, 'تشرين الثاني': 11, نوفمبر: 11, 'كانون الاول': 12, ديسمبر: 12 }
const D = `(?:(0?[1-9]|1[0-2])\\s?[/.-]\\s?(\\d{4}|\\d{2})|(${MONTH.slice(3, -1)})\\.?\\s*,?\\s*((?:19|20)\\d{2})|((?:19|20)\\d{2}))`
const RANGE = new RegExp(`${D}\\s*(?:-|–|—|to|الي|حتي)\\s*(?:${D}|(present|now|current|حتي الان|الان|الحاضر|اليوم))`, 'giu')
const toMonth = (m1, y1, name, y2, y3, end) => { // month index, or null
  if (m1) { const y = +y1 < 100 ? 2000 + +y1 : +y1; return y * 12 + +m1 }
  if (name) return +y2 * 12 + (MONTHS_NUM[name.toLowerCase().replace(/\s+/g, ' ')] || 1)
  if (y3) return +y3 * 12 + (end ? 12 : 1)
  return null
}
const nowMonth = () => { const d = new Date(); return d.getFullYear() * 12 + d.getMonth() + 1 }
const BULLET = /^[-–—•·●▪*◦►✓]\s*\S/
const startsWithVerb = (line) => {
  const w = norm(line.replace(/^[-–—•·●▪*◦►✓\s]+/, '').split(/\s+/)[0] || '').replace(/^و(?=.{3,})/, '')
  if (!w) return false
  if (ACTION_VERBS.some((v) => norm(v) === w)) return true
  return ARABIC.test(w) ? w.length >= 4 && w.endsWith('ت') : w.length > 3 && w.endsWith('ed')
}
// weight of each check inside the score (a check that cannot be judged is left out)
const WEIGHTS = { contact: 8, summary: 8, sections: 8, title_match: 6, dates: 6, metrics: 7, bullets: 6, skills: 7, length: 4, gaps: 3, linkedin: 2, font: 2, file: 3 }

// ---------- main ----------
export function analyzeText(rawText, jobIn, metaIn) { // meta: { source: 'pdf' | 'docx' | 'builder', name, fonts, pages }
  const job = jobIn || {}, meta = metaIn || {}
  // a single 'word' longer than 200 characters is never a real word/e-mail/link: cut it so the e-mail and phone patterns below cannot go quadratic
  const text = clean(rawText).slice(0, 60000).replace(/\S{200,}/g, (m) => m.slice(0, 200))
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const title = String(job.title || '').trim()
  const desc = String(job.desc || '').slice(0, 8000)
  const jobText = `${title}\n${desc}`

  // CV vocabulary: every word as written plus the flipped form of Arabic words (covers visual-order PDFs)
  const cvWords = tokens(text)
  const cv = new Set()
  for (const w of cvWords) {
    const n = norm(w)
    cv.add(stem(n))
    if (ARABIC.test(n)) {
      cv.add(stem(flip(n)))
      if (n.length >= 5) { // same letters in any order, without the article "ال" (handles scrambled PDF text)
        cv.add(`~${letters(stem(n))}`); cv.add(`~${letters(stem(flip(n)))}`); cv.add(`~${letters(dropOnce(dropOnce(n, 'ا'), 'ل'))}`)
      }
    }
  }
  const cvPrefix = new Set([...cv].filter((s) => s.length >= 6).map((s) => s.slice(0, 5)))
  const inCv = (stemmed) => cv.has(stemmed) || (ARABIC.test(stemmed) ? stemmed.length >= 4 && cv.has(`~${letters(stemmed)}`) : stemmed.length >= 6 && cvPrefix.has(stemmed.slice(0, 5)))
  // the CV as normalized text (plus the flipped Arabic lines) for phrase matching
  const cvHay = `${norm(text)}\n${lines.filter((l) => ARABIC.test(l)).map((l) => norm(flip(l))).join('\n')}`
  const jobHay = norm(jobText)
  const arabicJob = ARABIC.test(jobText)

  // ---- expected keywords: known skills (phrases + spellings in both languages) first, then the other frequent words
  const cands = [] // { n, label, present, implied? }
  const covered = new Set() // word stems already explained by a known skill
  const titleHay = norm(title)
  const fieldScore = FIELDS.map((f) => ({ f, s: f.match.reduce((n, m) => n + (hasAlias(jobHay, [m]) ? 1 + (hasAlias(titleHay, [m]) ? 2 : 0) : 0), 0) })).sort((a, b) => b.s - a.s)[0]
  const field = fieldScore && fieldScore.s > 0 ? fieldScore.f : null
  const seenSkill = new Set()
  const showName = (aliases, text) => (aliases.find((a) => hasAlias(norm(text), [a])) || (ARABIC.test(text) ? aliases.find((a) => ARABIC.test(a)) : '') || aliases[0])
  const addSkill = (aliases, n, implied) => {
    const key = norm(aliases[0])
    if (seenSkill.has(key)) return
    seenSkill.add(key)
    aliases.forEach((a) => tokens(a).forEach((t) => covered.add(stem(norm(t)))))
    cands.push({ n, label: implied ? (arabicJob ? aliases.find((a) => ARABIC.test(a)) || aliases[0] : aliases[0]) : showName(aliases, jobText), present: hasAlias(cvHay, aliases), implied })
  }
  // names written with capitals ("IT Asset Management", "Microsoft 365 Admin Center") count as one keyword
  const phrases = new Map()
  for (const m of desc.matchAll(/(?<![\p{L}\p{N}])[A-Z][\w+#&/-]*(?:\.[\w+#&/-]+)*(?:[ \t]+[A-Z0-9][\w+#&/-]*(?:\.[\w+#&/-]+)*){1,3}(?![\w])/gu)) {
    const okWord = (w) => /^\d+$/.test(w) || /^[A-Z]{2,5}$/.test(w) || isKeywordToken(w)
    const ws = m[0].replace(/[.,;:]+$/, '').split(/\s+/)
    while (ws.length && !okWord(ws[0])) ws.shift() // a capital letter at the start of a sentence ("Also ...")
    while (ws.length && !okWord(ws[ws.length - 1])) ws.pop()
    const ph = ws.join(' ')
    if (ws.length < 2 || !ws.every(okWord) || GLOSSARY_ALIASES.has(norm(ph))) continue
    const e = phrases.get(norm(ph)) || { text: ph, n: 0 }
    e.n += 1
    phrases.set(norm(ph), e)
  }
  for (const [key, e] of [...phrases].sort((a, b) => b[1].n - a[1].n).slice(0, 8)) {
    e.text.split(/\s+/).forEach((w) => covered.add(stem(norm(w))))
    seenSkill.add(key)
    const ws = e.text.split(/\s+/).filter((w) => !/^\d+$/.test(w))
    cands.push({ n: e.n * 2, label: e.text, present: hasAlias(cvHay, [e.text]) || ws.filter((w) => inCv(stem(norm(w)))).length / ws.length >= 0.75 })
  }
  const phraseKeys = [...phrases.keys()]
  for (const aliases of GLOSSARY) {
    if (aliases.some((a) => phraseKeys.some((k) => k !== norm(a) && k.includes(norm(a))))) continue // a longer phrase already covers it
    const n = countAlias(norm(desc), aliases) + 3 * countAlias(titleHay, aliases)
    if (n > 0) addSkill(aliases, n, false)
  }
  if (field && cands.filter((c) => !c.implied).length < 6) field.skills.slice(0, 8).filter((a) => !a.some((x) => phraseKeys.some((k) => k !== norm(x) && k.includes(norm(x))))).forEach((a) => addSkill(a, 1, true)) // short or missing description: expect what the field usually needs

  const freq = new Map() // stem -> { n, forms: Map(original -> count) }
  const add = (orig, weight) => {
    if (!isKeywordToken(orig)) return
    const st = stem(norm(orig))
    if (covered.has(st)) return
    const e = freq.get(st) || { n: 0, forms: new Map() }
    e.n += weight
    e.forms.set(orig, (e.forms.get(orig) || 0) + weight)
    freq.set(st, e)
  }
  tokens(desc).forEach((w) => add(w, 1))
  const titleStems = new Set()
  tokens(title).forEach((w) => { add(w, 3); if (isKeywordToken(w)) titleStems.add(stem(norm(w))) })
  for (const [st, e] of freq) cands.push({ n: e.n, label: [...e.forms.entries()].sort((a, b) => b[1] - a[1])[0][0], present: inCv(st) })
  const ranked = cands.sort((a, b) => b.n - a.n).slice(0, 20)
  const matched = ranked.filter((c) => c.present)
  const missing = ranked.filter((c) => !c.present)
  // job title: equal titles count too ("Software Engineer" = "Developer")
  const groupCovered = new Set()
  for (const g of TITLE_GROUPS) if (hasAlias(titleHay, g) && hasAlias(cvHay, g)) g.forEach((a) => tokens(a).forEach((t) => groupCovered.add(stem(norm(t)))))
  const titleHit = [...titleStems].filter((s) => inCv(s) || groupCovered.has(s)).length

  // structure
  const sections = findSections(lines)
  const hasEdu = sections.has('education') || DEGREE.test(norm(text)) || DEGREE.test(norm(flip(text)))
  const email = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text)
  const phone = /\+?\d[\d\s().-]{7,}\d/.test(text.replace(/\S+@\S+/g, ' '))
  const words = cvWords.length
  const metrics = countMetrics(text)

  // ---------- the checks: one verdict per CV part (ok true = green tick, false = red cross, null = cannot be checked) ----------
  const checks = []
  const earned = {} // id -> share of the weight earned (0..1); null = not judged
  const chk = (id, ok, text, part) => { checks.push({ id, ok, text }); earned[id] = ok === null ? null : ok ? 1 : part || 0 }
  const flat = text.replace(/\S+@\S+/g, ' ')

  // 1. contact information
  const head = lines.slice(0, 15).join(' ')
  const hasName = !!lines[0] && lines[0].length <= 60 && !/[@\d]/.test(lines[0])
  const emailAddr = (text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [''])[0]
  const place = /(مكان السكن|المدينة|المدينه|العنوان|الموقع|location|address|city|residence)\s*[:：]/i.test(head) || /[A-Za-z؀-ۿ][\w؀-ۿ ]{1,30}[,،]\s*[A-Za-z؀-ۿ][\w؀-ۿ ]{1,30}/.test(head)
  const sillyEmail = !!emailAddr && SILLY_EMAIL.test(emailAddr.split('@')[0])
  const cMiss = [!hasName && 'الاسم', !phone && 'رقم الهاتف', !email && 'البريد الإلكتروني', !place && 'الموقع (المدينة والدولة)'].filter(Boolean)
  chk('contact', !cMiss.length && !sillyEmail,
    cMiss.length ? `ينقص في أعلى السيرة: ${list(cMiss)}. أضف الاسم والهاتف والبريد والموقع.`
      : sillyEmail ? 'البريد الإلكتروني لا يبدو مهنياً؛ استخدم بريداً بسيطاً مبنياً على اسمك مثل name.lastname@gmail.com.'
        : 'الاسم والهاتف والبريد والموقع موجودة والبريد مهني.', 1 - cMiss.length / 4)

  // 2. summary (50 to 150 words, what you offer - not what you want). A paragraph under the contact lines counts even without a heading.
  const sumBody = sectionLines(lines, sections, 'summary').join(' ')
  let implicit = ''
  if (!sections.has('summary')) {
    const stop = Math.min(...sections.values(), lines.length)
    let i = 1
    while (i < stop && wordCount(lines[i]) < 12) i++
    const para = []
    while (i < stop && wordCount(lines[i]) >= 6 && !/@/.test(lines[i])) para.push(lines[i++])
    implicit = para.join(' ')
  }
  const sumText = sumBody || implicit
  const sumWords = wordCount(sumText)
  const FORMULA = 'الصيغة المقترحة: [المسمى المهني] بخبرة [عدد] سنوات، أنجزت [إنجاز 1] و[إنجاز 2]، ماهر في [مهارة 1] و[مهارة 2] و[مهارة 3]، ويتميز بـ [نقطة قوة].'
  chk('summary', sections.has('summary') && sumWords >= 50 && sumWords <= 150 && !SEEKING.test(sumText),
    !sumText ? `لم نجد نبذة مهنية. أضف نبذة من 50 إلى 150 كلمة تبرز قيمتك ومهاراتك وما تقدمه لصاحب العمل وليس ما تريده منه. ${FORMULA}`
      : !sections.has('summary') ? `وجدنا فقرة تعريفية (${sumWords} كلمة) بدون عنوان؛ أضف لها عنوان «نبذة» أو Summary ليتعرف عليها نظام ATS.`
        : sumWords < 50 ? `النبذة قصيرة (${sumWords} كلمة)؛ اجعلها بين 50 و150 كلمة. ${FORMULA}`
          : sumWords > 150 ? `النبذة طويلة (${sumWords} كلمة)؛ اختصرها إلى 150 كلمة كحد أقصى مع إبقاء أهم إنجازاتك.`
            : SEEKING.test(sumText) ? `النبذة تركّز على ما تريده؛ أعد صياغتها لتبرز ما تقدمه لصاحب العمل. ${FORMULA}`
              : `النبذة بطول مناسب (${sumWords} كلمة) وتركّز على قيمتك.`, sumText ? 0.5 : 0)

  // 3. sections
  const has = (k) => sections.has(k) || (k === 'education' && hasEdu)
  const present = ['summary', 'skills', 'education', 'experience', 'volunteer', 'languages', 'courses'].filter((k) => has(k) || (k === 'summary' && implicit))
  const absent = ['summary', 'skills', 'education', 'experience'].filter((k) => !has(k) && !(k === 'summary' && implicit))
  const must = ['education', 'skills'].filter((k) => !has(k)).length + (has('experience') || has('volunteer') ? 0 : 1)
  chk('sections', has('education') && has('skills') && (has('experience') || has('volunteer')),
    `${present.length ? `الأقسام الموجودة: ${list(present.map((k) => SECTION_AR[k] + (k === 'summary' && !sections.has('summary') ? ' (بدون عنوان)' : '')))}.` : 'لم نتعرف على أي عنوان قسم.'} ${absent.length ? `غير موجودة: ${list(absent.map((k) => SECTION_AR[k]))}؛ أضفها بعناوين قياسية.` : 'كل الأقسام الأساسية موجودة.'}${!has('experience') && has('volunteer') ? ' (العمل التطوعي يعوّض غياب الخبرات).' : ''}`, 1 - must / 3)

  // 4. job title match
  if (!title) chk('title_match', null, 'لم يُكتب مسمى وظيفي مستهدف للمقارنة.')
  else {
    const ratio = titleStems.size ? titleHit / titleStems.size : 0
    const top = tokens(lines.slice(0, 8).join(' ')).some((w) => titleStems.has(stem(norm(w))))
    chk('title_match', ratio >= 0.5,
      ratio >= 0.5 ? `المسمى المستهدف «${title}» موجود في السيرة${top ? ' وفي أعلاها' : '؛ ويفضّل ذكره في أعلى السيرة أو النبذة'}.`
        : `المسمى المستهدف «${title}» غير موجود في سيرتك. اذكره في أعلى السيرة أو النبذة إن كان يصف ما أنت عليه فعلاً.`, ratio)
  }

  // 5. date formatting (MM/YY, MM/YYYY or Month YYYY)
  const nt = norm(flat)
  const good = (nt.match(GOOD_DATE) || []).length, bad = (nt.match(BAD_DATE) || []).length
  chk('dates', good >= 2 && bad === 0,
    bad ? 'بعض التواريخ مكتوبة بصيغة يوم/شهر/سنة؛ استخدم MM/YY أو MM/YYYY أو Month YYYY مثل 03/2022 أو March 2022.'
      : good >= 2 ? `التواريخ بصيغة مناسبة (وجدنا ${good}).`
        : 'لم نجد تواريخ بصيغة واضحة. اكتب التواريخ بإحدى الصيغ: MM/YY أو MM/YYYY أو Month YYYY (مثل 03/2022 أو March 2022) وليس السنة وحدها.', good ? 0.5 : 0)

  // 6. measurable results
  chk('metrics', metrics >= 2,
    metrics >= 2 ? `وجدنا ${metrics} أرقام ونتائج قابلة للقياس في إنجازاتك.`
      : 'أضف نتائج قابلة للقياس إن توفرت: أرقام ونسب وأحجام، مثل «زيادة التفاعل بنسبة 30%» أو «تدريب 40 متدرباً» أو «إدارة فريق من 6 أشخاص».', metrics ? 0.5 : 0)

  // 7. achievement bullets: short and starting with a strong action verb
  const expLines = [...sectionLines(lines, sections, 'experience'), ...sectionLines(lines, sections, 'volunteer')]
  if (!expLines.length) chk('bullets', null, 'لا يوجد قسم خبرات أو عمل تطوعي لفحص صياغة الإنجازات.')
  else {
    const marked = expLines.filter((l) => BULLET.test(l))
    const pts = marked.length ? marked : expLines.filter((l) => wordCount(l) >= 6) // no bullet signs found: use the sentence-like lines
    const verbs = pts.filter(startsWithVerb).length
    const long = pts.filter((l) => wordCount(l) > 30).length
    chk('bullets', pts.length >= 3 && verbs / pts.length >= 0.6 && !long,
      !pts.length ? 'لم نجد إنجازات مكتوبة في نقاط. اكتب كل إنجاز في نقطة قصيرة تبدأ بفعل قوي مثل «طوّرت» أو «أدرت» أو Led / Built.'
        : pts.length < 3 ? `وجدنا ${pts.length} نقطة فقط؛ اكتب من 3 نقاط على الأقل تحت كل خبرة، كل نقطة تبدأ بفعل قوي.`
          : verbs / pts.length < 0.6 ? `${verbs} من ${pts.length} نقطة فقط تبدأ بفعل قوي؛ ابدأ كل نقطة بفعل مثل «طوّرت» أو «أدرت» أو Led / Developed.`
            : long ? `${long} من النقاط طويلة (أكثر من 30 كلمة)؛ اجعل كل نقطة سطراً أو سطرين.`
              : `نقاط الإنجازات (${pts.length}) قصيرة وتبدأ بأفعال قوية.`, pts.length ? Math.min(0.5, verbs / pts.length / 2) : 0)
  }

  // 8. skills (10 to 20 hard and soft skills)
  const skillRaw = sectionLines(lines, sections, 'skills')
  const kind = (l) => (/^(المهارات التقنيه|المهارات التقنية|technical|hard skills|tools|التقنيه)/i.test(norm(l)) ? 'hard' : /^(المهارات الناعمه|soft|المهارات الشخصيه|interpersonal)/i.test(norm(l)) ? 'soft' : '')
  const items = new Map() // item -> 'hard' | 'soft'
  for (const l of skillRaw) {
    const k = kind(l)
    for (const x of l.replace(/^[^:：]{1,30}[:：]/, '').split(/[,،;•·●▪|]+/).map((s) => s.replace(/^[-–\s]+/, '').trim()).filter((s) => s.length >= 2 && s.length <= 40)) {
      if (!items.has(x)) items.set(x, k || (hasAlias(norm(x), SOFT_SKILLS.flat()) ? 'soft' : 'hard'))
    }
  }
  const nSkills = items.size
  const nSoft = [...items.values()].filter((v) => v === 'soft').length, nHard = nSkills - nSoft
  const kwNote = missing.length && ranked.length >= 3 ? ` لم نجد في سيرتك بعض مهارات الوظيفة مثل: ${list(missing.slice(0, 4).map((x) => x.label))}؛ أضفها إن كانت صحيحة.` : ''
  const mixOk = nSkills < 10 || (nSoft > 0 && nHard > 0)
  chk('skills', nSkills >= 10 && nSkills <= 20 && mixOk && !(ranked.length >= 3 && missing.length > ranked.length / 2),
    !sections.has('skills') ? `لم نجد قسم مهارات. أضف قسماً يضم من 10 إلى 20 مهارة تقنية وناعمة مرتبطة بالوظيفة.${kwNote}`
      : nSkills < 10 ? `عدد المهارات ${nSkills}؛ اجعلها من 10 إلى 20 مهارة تقنية وناعمة مرتبطة بالوظيفة.${kwNote}`
        : nSkills > 20 ? `عدد المهارات ${nSkills} كبير؛ اختصرها إلى 20 كحد أقصى وأبقِ الأقرب للوظيفة.${kwNote}`
          : !mixOk ? `المهارات (${nSkills}) من نوع واحد فقط؛ أضف ${nSoft ? 'مهارات تقنية' : 'مهارات ناعمة'} أيضاً.${kwNote}`
            : `عدد المهارات مناسب (${nSkills}: ${nHard} تقنية و${nSoft} ناعمة).${kwNote}`, nSkills ? 0.5 : 0)

  // 9. length (one to two pages)
  const pages = meta.pages || Math.max(1, Math.ceil(words / 500))
  const approx = meta.pages ? '' : ' تقريباً'
  chk('length', pages <= 2,
    pages <= 2 ? `طول السيرة${approx} ${pages === 1 ? 'صفحة واحدة' : 'صفحتان'}، وهو مناسب.` : `طول السيرة${approx} ${pages} صفحات؛ اختصرها إلى صفحة أو صفحتين وأبقِ الأهم للوظيفة.`, 0.3)

  // 10. gaps between jobs (more than 6 months)
  const expText = norm(sectionLines(lines, sections, 'experience').join('\n'))
  const spans = []
  for (const m of expText.matchAll(RANGE)) {
    const s = toMonth(m[1], m[2], m[3], m[4], m[5], false)
    const e = m[11] ? nowMonth() : toMonth(m[6], m[7], m[8], m[9], m[10], true)
    if (s && e && e >= s) spans.push([s, e])
  }
  if (spans.length < 2) chk('gaps', null, 'لم نجد فترات خبرة كافية (فترتان على الأقل) لفحص الفجوات الزمنية.')
  else {
    spans.sort((a, b) => a[0] - b[0])
    let end = spans[0][1], worst = 0
    for (const [s, e] of spans.slice(1)) { worst = Math.max(worst, s - end - 1); end = Math.max(end, e) }
    chk('gaps', worst <= 6, worst <= 6 ? 'لا توجد فجوات زمنية طويلة بين خبراتك.' : `توجد فجوة نحو ${worst} شهراً بين خبراتك؛ إن كانت لدراسة أو دورات أو عمل تطوعي فاذكر ذلك في السيرة.`, 0.3)
  }

  // 11. LinkedIn
  chk('linkedin', /linkedin\.com\/\S+/i.test(text), /linkedin\.com\/\S+/i.test(text) ? 'رابط لينكدإن موجود.' : 'أضف رابط ملفك على لينكدإن في أعلى السيرة؛ يطلبه كثير من أصحاب العمل.')

  // 12. font
  const fonts = meta.fonts || []
  if (meta.source === 'builder') chk('font', true, 'ملفات منشئ السيرة تستخدم خطاً واضحاً قابلاً للقراءة من أنظمة ATS.')
  else if (fonts.length) {
    const deco = fonts.filter((f) => DECORATIVE_FONT.test(f))
    chk('font', !deco.length, deco.length ? `الخط (${list(deco)}) زخرفي؛ استخدم خطاً قياسياً مثل Arial أو Calibri أو Times New Roman بحجم 10 إلى 12.` : `الخط المستخدم (${list(fonts.slice(0, 3))}) قياسي وواضح. حافظ على حجم 10 إلى 12.`)
  } else chk('font', null, 'تعذّر تحديد نوع الخط من الملف. استخدم خطاً قياسياً مثل Arial أو Calibri أو Times New Roman بحجم 10 إلى 12.')

  // 13. file type and name
  const fname = String(meta.name || '').replace(/\.[^.]+$/, '')
  if (meta.source === 'builder') chk('file', true, 'سيرتك ستُصدَّر بصيغة PDF أو Word وهما مناسبتان لـ ATS. اسم الملف سيكون باسمك مثل Ali_Ahmad_cv.')
  else {
    const ext = meta.source === 'pdf' ? 'pdf' : meta.source === 'docx' ? 'docx' : String(meta.name || '').split('.').pop().toLowerCase()
    const okType = ext === 'pdf' || ext === 'docx'
    const okName = /cv|resume|سيره|السيره/i.test(norm(fname)) && !/(^|[\s_-])(new|final|copy|untitled|document|doc)(?=$|[\s_-])|\(\d+\)/i.test(fname) && fname.length <= 50
    chk('file', okType && okName,
      !okType ? 'استخدم صيغة PDF أو DOCX فقط.'
        : !okName ? `اسم الملف «${meta.name}» غير مناسب؛ سمِّه باسمك مع كلمة CV مثل Ali_Ahmad_cv.pdf وتجنّب كلمات مثل final أو new أو copy.`
          : `نوع الملف (${ext.toUpperCase()}) واسمه مناسبان.`, okType ? 0.5 : 0)
  }

  // ---------- score: the checks (weighted) decide 60%, the job keywords 40% (all checks when there is no job to compare with) ----------
  let got = 0, total = 0
  for (const [id, w] of Object.entries(WEIGHTS)) if (earned[id] !== null && earned[id] !== undefined) { got += w * earned[id]; total += w }
  const checksPct = total ? got / total : 0
  const kw = ranked.length >= 3 ? matched.length / ranked.length : titleStems.size ? titleHit / titleStems.size : null
  const score = Math.max(0, Math.min(100, Math.round((kw === null ? checksPct : 0.4 * kw + 0.6 * checksPct) * 100)))
  const verdict = score >= 80 ? 'مطابقة قوية' : score >= 60 ? 'مطابقة جيدة مع مجال للتحسين' : score >= 40 ? 'مطابقة متوسطة' : 'مطابقة ضعيفة'
  const okN = checks.filter((c) => c.ok === true).length, judged = checks.filter((c) => c.ok !== null).length
  const summary = `اجتازت سيرتك ${okN} من ${judged} فحصاً.${field ? ` المجال المتوقع للوظيفة: ${field.name}.` : ''} ${
    ranked.length >= 3 ? `وتطابقت ${matched.length} من ${ranked.length} كلمة ومهارة متوقعة للوظيفة مع سيرتك.` : 'أضف المسمى الوظيفي أو وصف الوظيفة للحصول على مقارنة أدق للكلمات المفتاحية.'}`

  return { score, verdict, summary, missingKeywords: missing.slice(0, 12).map((x) => x.label), checks }
}

// ---------- reading the CV file in the browser ----------
async function pdfText(b64) {
  const bin = atob(b64)
  const data = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i)
  // loaded only when needed, so the normal page stays light
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.min.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise
  let out = ''
  const fonts = new Set()
  for (let i = 1; i <= Math.min(doc.numPages, 8); i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    for (const it of content.items) { out += it.str; if (it.hasEOL) out += '\n' }
    out += '\n'
    try { // real font names (best effort)
      await page.getOperatorList()
      for (const id of new Set(content.items.map((it) => it.fontName))) {
        if (page.commonObjs.has(id)) { const f = page.commonObjs.get(id); if (f && f.name) fonts.add(String(f.name).replace(/^[A-Z]{6}\+/, '')) }
      }
    } catch { /* font names stay unknown */ }
  }
  return { text: out, fonts: [...fonts], pages: doc.numPages }
}

// file: { name, type: 'pdf' | 'text', data, builder? } exactly as Analyze.jsx keeps it. job: { title, company, desc }
export async function localAnalyze(file, job) {
  const pdf = file.type === 'pdf' ? await pdfText(file.data) : { text: String(file.data || ''), fonts: [], pages: 0 }
  if (clean(pdf.text).trim().length < 40) throw new Error('no_text') // scanned or empty file: nothing to review
  const source = file.builder ? 'builder' : file.type === 'pdf' ? 'pdf' : String(file.name || '').toLowerCase().endsWith('.docx') ? 'docx' : 'text'
  return analyzeText(pdf.text, job, { source, name: file.name, fonts: pdf.fonts, pages: pdf.pages })
}
