// Browser-side CV review (no AI). Used quietly when the AI service is busy or unavailable.
// It returns the same shape as /api/analyze:
//   { score, verdict, summary, missingKeywords: [], checks: [{ id, ok: true | false | null, text }] }
// `checks` has one item per CV part (contact, summary, sections, title_match, dates, metrics, skills, font, file); ok === null means "cannot be checked here".
// It compares the CV with the job words, checks the structure of the CV and gives rule-based advice.
// It never invents anything: advice about missing keywords always says "if it is true".

// ---------- text helpers (Arabic + English) ----------
const DIACRITICS = /[\u064B-\u065F\u0670\u0640]/g // tashkeel + tatweel
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/
const ARABIC_ALL = new RegExp(ARABIC.source, 'g')
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
  summary: ['نبذه', 'نبذه مختصره', 'ملخص', 'ملخص مهني', 'summary', 'professional summary', 'profile', 'objective', 'career objective', 'about me'],
  skills: ['المهارات', 'مهارات', 'المهارات التقنيه', 'skills', 'technical skills', 'core skills', 'key skills'],
  education: ['التعليم', 'المؤهلات', 'المؤهلات العلميه', 'education', 'academic background', 'qualifications'],
  experience: ['الخبرات', 'الخبره', 'الخبره العمليه', 'الخبرات العمليه', 'experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history', 'internships'],
  volunteer: ['العمل التطوعي', 'التطوع', 'volunteer', 'volunteering', 'volunteer work'],
  languages: ['اللغات', 'languages'],
  courses: ['الدورات', 'الدورات وورش العمل', 'courses', 'certifications', 'certificates', 'training'],
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

// ---------- main ----------
export function analyzeText(rawText, job = {}, meta = {}) { // meta: { source: 'pdf' | 'docx' | 'builder', name, fonts }
  const text = clean(rawText).slice(0, 60000)
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const title = String(job.title || '').trim()
  const desc = String(job.desc || '').slice(0, 8000)

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

  // job keywords: frequency in the description, title words count extra
  const freq = new Map() // stem -> { n, forms: Map(original -> count) }
  const add = (orig, weight) => {
    if (!isKeywordToken(orig)) return
    const st = stem(norm(orig))
    const e = freq.get(st) || { n: 0, forms: new Map() }
    e.n += weight
    e.forms.set(orig, (e.forms.get(orig) || 0) + weight)
    freq.set(st, e)
  }
  tokens(desc).forEach((w) => add(w, 1))
  const titleStems = new Set()
  tokens(title).forEach((w) => { add(w, 3); if (isKeywordToken(w)) titleStems.add(stem(norm(w))) })
  const ranked = [...freq.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 20)
  const label = (e) => [...e.forms.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const matched = ranked.filter(([s]) => inCv(s))
  const missing = ranked.filter(([s]) => !inCv(s))
  const titleHit = [...titleStems].filter(inCv).length

  // structure
  const sections = findSections(lines)
  const hasEdu = sections.has('education') || DEGREE.test(norm(text)) || DEGREE.test(norm(flip(text)))
  const hasExp = sections.has('experience') || sections.has('volunteer')
  const email = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text)
  const phone = /\+?\d[\d\s().-]{7,}\d/.test(text.replace(/\S+@\S+/g, ' '))
  const years = (text.match(/\b(?:19|20)\d{2}\b/g) || []).length
  const words = cvWords.length
  const metrics = countMetrics(text)
  const mainSections = ['summary', 'skills', 'education', 'experience', 'languages'].filter((k) => sections.has(k) || (k === 'education' && hasEdu)).length

  // score: 40% keywords, 25% education/experience relevance, 20% clarity, 15% ATS-readiness
  const kw = ranked.length >= 3 ? matched.length / ranked.length : titleStems.size ? 0.75 * (titleHit / titleStems.size) : 0.4
  const relevance = (hasEdu ? 8 : 0) + (hasExp ? 10 : 0) + (titleStems.size ? 7 * (titleHit / titleStems.size) : 3.5)
  const clarity = mainSections * 3 + (words >= 150 && words <= 800 ? 5 : words >= 80 ? 2 : 0)
  const ats = (email ? 3 : 0) + (phone ? 3 : 0) + (years >= 2 ? 3 : 0) + (mainSections >= 3 ? 3 : 0) + (words >= 150 && words <= 900 ? 3 : 0)
  const score = Math.max(0, Math.min(100, Math.round(kw * 40 + relevance + clarity + ats)))
  const verdict = score >= 80 ? 'مطابقة قوية' : score >= 60 ? 'مطابقة جيدة مع مجال للتحسين' : score >= 40 ? 'مطابقة متوسطة' : 'مطابقة ضعيفة'

  const summary = ranked.length >= 3
    ? `تطابقت ${matched.length} من ${ranked.length} كلمة مفتاحية من الوظيفة مع سيرتك، وتظهر فيها ${mainSections} من 5 أقسام رئيسية بشكل واضح.`
    : 'قورنت سيرتك بالمسمى الوظيفي المستهدف وببنية السيرة العامة؛ أضف وصف الوظيفة كاملاً للحصول على مقارنة أدق للكلمات المفتاحية.'

  // ---------- the checks: one verdict per CV part (ok true = green tick, false = red cross, null = cannot be checked) ----------
  const checks = []
  const chk = (id, ok, text) => checks.push({ id, ok, text })
  const flat = text.replace(/\S+@\S+/g, ' ')

  // 1. contact information
  const head = lines.slice(0, 15).join(' ')
  const hasName = !!lines[0] && lines[0].length <= 60 && !/[@\d]/.test(lines[0])
  const emailAddr = (text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [''])[0]
  const place = /(مكان السكن|المدينة|المدينه|العنوان|الموقع|location|address|city|residence)\s*[:：]/i.test(head) || /[A-Za-z؀-ۿ][\w؀-ۿ ]{1,30},\s*[A-Za-z؀-ۿ][\w؀-ۿ ]{1,30}/.test(head)
  const sillyEmail = !!emailAddr && SILLY_EMAIL.test(emailAddr.split('@')[0])
  const cMiss = [!hasName && 'الاسم', !phone && 'رقم الهاتف', !email && 'البريد الإلكتروني', !place && 'الموقع (المدينة والدولة)'].filter(Boolean)
  chk('contact', !cMiss.length && !sillyEmail,
    cMiss.length ? `ينقص في أعلى السيرة: ${list(cMiss)}. أضف الاسم والهاتف والبريد والموقع.`
      : sillyEmail ? 'البريد الإلكتروني لا يبدو مهنياً؛ استخدم بريداً بسيطاً مبنياً على اسمك مثل name.lastname@gmail.com.'
        : 'الاسم والهاتف والبريد والموقع موجودة والبريد مهني.')

  // 2. summary (50 to 150 words, what you offer - not what you want)
  const sumBody = sectionLines(lines, sections, 'summary').join(' ')
  const sumWords = wordCount(sumBody)
  const FORMULA = 'الصيغة المقترحة: [المسمى المهني] بخبرة [عدد] سنوات، أنجزت [إنجاز 1] و[إنجاز 2]، ماهر في [مهارة 1] و[مهارة 2] و[مهارة 3]، ويتميز بـ [نقطة قوة].'
  chk('summary', sections.has('summary') && sumWords >= 50 && sumWords <= 150 && !SEEKING.test(sumBody),
    !sections.has('summary') ? `لم نجد نبذة مهنية. أضف نبذة من 50 إلى 150 كلمة تبرز قيمتك ومهاراتك وما تقدمه لصاحب العمل وليس ما تريده منه. ${FORMULA}`
      : sumWords < 50 ? `النبذة قصيرة (${sumWords} كلمة)؛ اجعلها بين 50 و150 كلمة. ${FORMULA}`
        : sumWords > 150 ? `النبذة طويلة (${sumWords} كلمة)؛ اختصرها إلى 150 كلمة كحد أقصى مع إبقاء أهم إنجازاتك.`
          : SEEKING.test(sumBody) ? `النبذة تركّز على ما تريده؛ أعد صياغتها لتبرز ما تقدمه لصاحب العمل. ${FORMULA}`
            : `النبذة بطول مناسب (${sumWords} كلمة) وتركّز على قيمتك.`)

  // 3. sections
  const has = (k) => sections.has(k) || (k === 'education' && hasEdu)
  const present = ['summary', 'skills', 'education', 'experience', 'volunteer', 'languages', 'courses'].filter(has)
  const absent = ['summary', 'skills', 'education', 'experience'].filter((k) => !has(k))
  chk('sections', has('education') && has('skills') && (has('experience') || has('volunteer')),
    `${present.length ? `الأقسام الموجودة: ${list(present.map((k) => SECTION_AR[k]))}.` : 'لم نتعرف على أي عنوان قسم.'} ${absent.length ? `غير موجودة: ${list(absent.map((k) => SECTION_AR[k]))}؛ أضفها بعناوين قياسية.` : 'كل الأقسام الأساسية موجودة.'}${!has('experience') && has('volunteer') ? ' (العمل التطوعي يعوّض غياب الخبرات).' : ''}`)

  // 4. job title match
  if (!title) chk('title_match', null, 'لم يُكتب مسمى وظيفي مستهدف للمقارنة.')
  else {
    const ratio = titleStems.size ? titleHit / titleStems.size : 0
    const top = tokens(lines.slice(0, 8).join(' ')).some((w) => titleStems.has(stem(norm(w))))
    chk('title_match', ratio >= 0.5,
      ratio >= 0.5 ? `المسمى المستهدف «${title}» موجود في السيرة${top ? ' وفي أعلاها' : '؛ ويفضّل ذكره في أعلى السيرة أو النبذة'}.`
        : `المسمى المستهدف «${title}» غير موجود في سيرتك. اذكره في أعلى السيرة أو النبذة إن كان يصف ما أنت عليه فعلاً.`)
  }

  // 5. date formatting (MM/YY, MM/YYYY or Month YYYY)
  const nt = norm(flat)
  const good = (nt.match(GOOD_DATE) || []).length, bad = (nt.match(BAD_DATE) || []).length
  chk('dates', good >= 2 && bad === 0,
    bad ? 'بعض التواريخ مكتوبة بصيغة يوم/شهر/سنة؛ استخدم MM/YY أو MM/YYYY أو Month YYYY مثل 03/2022 أو March 2022.'
      : good >= 2 ? `التواريخ بصيغة مناسبة (وجدنا ${good}).`
        : 'لم نجد تواريخ بصيغة واضحة. اكتب التواريخ بإحدى الصيغ: MM/YY أو MM/YYYY أو Month YYYY (مثل 03/2022 أو March 2022) وليس السنة وحدها.')

  // 6. measurable results
  chk('metrics', metrics >= 2,
    metrics >= 2 ? `وجدنا ${metrics} أرقام ونتائج قابلة للقياس في إنجازاتك.`
      : 'أضف نتائج قابلة للقياس إن توفرت: أرقام ونسب وأحجام، مثل «زيادة التفاعل بنسبة 30%» أو «تدريب 40 متدرباً» أو «إدارة فريق من 6 أشخاص».')

  // 7. skills (10 to 20 hard and soft skills)
  const skillItems = new Set(sectionLines(lines, sections, 'skills').flatMap((l) => l.replace(/^[^:：]{1,30}[:：]/, '').split(/[,،;•·●▪|]+/)).map((x) => x.replace(/^[-–\s]+/, '').trim()).filter((x) => x.length >= 2 && x.length <= 40))
  const nSkills = skillItems.size
  const kwNote = missing.length && ranked.length >= 3 ? ` لم نجد في سيرتك بعض مهارات الوظيفة مثل: ${list(missing.slice(0, 4).map(([, e]) => label(e)))}؛ أضفها إن كانت صحيحة.` : ''
  chk('skills', nSkills >= 10 && nSkills <= 20 && !(ranked.length >= 3 && missing.length > ranked.length / 2),
    !sections.has('skills') ? `لم نجد قسم مهارات. أضف قسماً يضم من 10 إلى 20 مهارة تقنية وناعمة مرتبطة بالوظيفة.${kwNote}`
      : nSkills < 10 ? `عدد المهارات ${nSkills}؛ اجعلها من 10 إلى 20 مهارة تقنية وناعمة مرتبطة بالوظيفة.${kwNote}`
        : nSkills > 20 ? `عدد المهارات ${nSkills} كبير؛ اختصرها إلى 20 كحد أقصى وأبقِ الأقرب للوظيفة.${kwNote}`
          : `عدد المهارات مناسب (${nSkills}).${kwNote}`)

  // 8. font
  const fonts = meta.fonts || []
  if (meta.source === 'builder') chk('font', true, 'ملفات منشئ السيرة تستخدم خطاً واضحاً قابلاً للقراءة من أنظمة ATS.')
  else if (fonts.length) {
    const deco = fonts.filter((f) => DECORATIVE_FONT.test(f))
    chk('font', !deco.length, deco.length ? `الخط (${list(deco)}) زخرفي؛ استخدم خطاً قياسياً مثل Arial أو Calibri أو Times New Roman بحجم 10 إلى 12.` : `الخط المستخدم (${list(fonts.slice(0, 3))}) قياسي وواضح. حافظ على حجم 10 إلى 12.`)
  } else chk('font', null, 'تعذّر تحديد نوع الخط من الملف. استخدم خطاً قياسياً مثل Arial أو Calibri أو Times New Roman بحجم 10 إلى 12.')

  // 9. file type and name
  const fname = String(meta.name || '').replace(/\.[^.]+$/, '')
  if (meta.source === 'builder') chk('file', true, 'سيرتك ستُصدَّر بصيغة PDF أو Word وهما مناسبتان لـ ATS. سمِّ الملف باسمك مثل Ali_Ahmad_CV.pdf.')
  else {
    const ext = meta.source === 'pdf' ? 'pdf' : meta.source === 'docx' ? 'docx' : String(meta.name || '').split('.').pop().toLowerCase()
    const okType = ext === 'pdf' || ext === 'docx'
    const okName = /cv|resume|سيره|السيره/i.test(norm(fname)) && !/(^|[\s_-])(new|final|copy|untitled|document|doc)(?=$|[\s_-])|\(\d+\)/i.test(fname) && fname.length <= 50
    chk('file', okType && okName,
      !okType ? 'استخدم صيغة PDF أو DOCX فقط.'
        : !okName ? `اسم الملف «${meta.name}» غير مناسب؛ سمِّه باسمك مع كلمة CV مثل Ali_Ahmad_CV.pdf وتجنّب كلمات مثل final أو new أو copy.`
          : `نوع الملف (${ext.toUpperCase()}) واسمه مناسبان.`)
  }

  return { score, verdict, summary, missingKeywords: missing.slice(0, 12).map(([, e]) => label(e)), checks }
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
  return { text: out, fonts: [...fonts] }
}

// file: { name, type: 'pdf' | 'text', data, builder? } exactly as Analyze.jsx keeps it. job: { title, company, desc }
export async function localAnalyze(file, job) {
  const pdf = file.type === 'pdf' ? await pdfText(file.data) : { text: String(file.data || ''), fonts: [] }
  if (clean(pdf.text).trim().length < 40) throw new Error('no_text') // scanned or empty file: nothing to review
  const source = file.builder ? 'builder' : file.type === 'pdf' ? 'pdf' : String(file.name || '').toLowerCase().endsWith('.docx') ? 'docx' : 'text'
  return analyzeText(pdf.text, job, { source, name: file.name, fonts: pdf.fonts })
}
