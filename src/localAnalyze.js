// Browser-side CV review (no AI). Used quietly when the AI service is busy or unavailable.
// It returns the same shape as /api/analyze:
//   { score, verdict, summary, missingKeywords: [], suggestions: [{ section, text }], ats: [{ ok, text }] }
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

function findSections(lines) {
  const found = new Set()
  for (const raw of lines) {
    // each line is checked as written and flipped (visual-order PDFs)
    for (const cand of [raw, ARABIC.test(raw) ? flip(raw) : '']) {
      const l = norm(cand).replace(/[:\-–|•·●▪]/g, ' ').replace(/\s+/g, ' ').trim()
      if (!l || l.length > 40) continue
      const key = letters(l.replace(/\s/g, ''))
      for (const [k, names] of Object.entries(SECTIONS)) {
        if (names.some((n) => l === n || l.startsWith(`${n} `) || (ARABIC.test(l) && key.length >= 4 && key === letters(n.replace(/\s/g, ''))))) found.add(k)
      }
    }
  }
  return found
}

const countMetrics = (text) => {
  const t = text.replace(/\S+@\S+/g, ' ').replace(/\+?\d[\d\s().-]{6,}\d/g, ' ').replace(/\b(?:19|20)\d{2}\b/g, ' ')
  return (t.match(/\d+(?:[.,]\d+)?\s?%|\b\d{2,}\+?(?![\d.])/g) || []).length
}

const SECTION_TXT = { summary: 'نبذة', skills: 'مهارات', education: 'تعليم', experience: 'خبرات' }

// ---------- main ----------
export function analyzeText(rawText, job = {}) {
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

  // advice (most useful first, 3 to 6 items)
  const tips = []
  const miss = missing.slice(0, 6).map(([, e]) => label(e))
  if (miss.length) tips.push({ section: 'skills', text: `فكّر في إضافة هذه الكلمات المفتاحية إن كانت تنطبق عليك فعلاً: ${miss.join('، ')}.` })
  if (!sections.has('summary')) tips.push({ section: 'summary', text: `أضف نبذة مختصرة (جملتان أو ثلاث) تربط خلفيتك بالوظيفة${title ? ` «${title}»` : ''}.` })
  if (title && titleStems.size && titleHit === 0) tips.push({ section: 'general', text: `اجعل المسمى الوظيفي أو النبذة أقرب إلى عنوان الوظيفة المستهدفة «${title}» إن كان ذلك صحيحاً.` })
  if (hasExp && metrics < 2) tips.push({ section: 'experience', text: 'أضف أرقاماً ونتائج قابلة للقياس لإنجازاتك (عدد المشاريع، النسب، حجم العمل) إن كانت متوفرة لديك.' })
  if (!sections.has('skills')) tips.push({ section: 'skills', text: 'أضف قسماً واضحاً للمهارات يجمع المهارات التقنية والناعمة المرتبطة بالوظيفة.' })
  if (!hasExp) tips.push({ section: 'experience', text: 'أضف قسماً للخبرات أو التدريب أو العمل التطوعي أو المشاريع ليظهر تطبيقك العملي لمهاراتك.' })
  if (!hasEdu) tips.push({ section: 'education', text: 'أضف قسم التعليم مع اسم الجامعة أو المعهد والتخصص وسنوات الدراسة.' })
  if (!email || !phone) tips.push({ section: 'general', text: 'أضف وسائل تواصل واضحة في أعلى السيرة: بريد إلكتروني ورقم هاتف.' })
  if (words > 900) tips.push({ section: 'general', text: 'السيرة طويلة نسبياً؛ اختصرها لتكون صفحة إلى صفحتين وأبقِ الأهم لهذه الوظيفة.' })
  if (words < 120) tips.push({ section: 'general', text: 'السيرة مختصرة جداً؛ وسّع وصف خبراتك ومشاريعك بنقاط واضحة عن مهامك ومسؤولياتك.' })
  const filler = [
    { section: 'experience', text: 'رتّب الخبرات من الأحدث إلى الأقدم، وابدأ كل نقطة بفعل قوي يصف ما قمت به فعلاً.' },
    { section: 'general', text: 'اجعل الصياغة موجزة وواضحة، وراجع السيرة لغوياً وإملائياً قبل التقديم.' },
    { section: 'skills', text: 'رتّب المهارات بحيث تأتي الأقرب لهذه الوظيفة أولاً.' },
  ]
  for (const f of filler) if (tips.length < 3) tips.push(f)

  const checks = [
    mainSections >= 3
      ? { ok: true, text: 'عناوين الأقسام واضحة وقياسية' }
      : { ok: false, text: 'استخدم عناوين قياسية واضحة مثل: التعليم، الخبرات، المهارات' },
    email && phone
      ? { ok: true, text: 'بيانات التواصل (البريد والهاتف) موجودة' }
      : { ok: false, text: `بيانات التواصل ناقصة: ${[!email && 'البريد الإلكتروني', !phone && 'رقم الهاتف'].filter(Boolean).join('، ')}` },
    years >= 2
      ? { ok: true, text: 'التواريخ مذكورة بوضوح' }
      : { ok: false, text: 'أضف سنوات التعليم والخبرات بوضوح' },
    words >= 150 && words <= 900
      ? { ok: true, text: 'طول السيرة مناسب' }
      : { ok: false, text: words < 150 ? 'السيرة قصيرة؛ المطلوب غالباً صفحة واحدة مليئة بالمعلومات المهمة' : 'السيرة طويلة؛ يفضّل ألا تتجاوز صفحتين' },
    text.length >= 200
      ? { ok: true, text: 'المحتوى قابل للقراءة كنص عادي' }
      : { ok: false, text: 'يصعب قراءة نص الملف؛ تجنّب الصور والجداول المعقدة وتأكد أن النص قابل للتحديد' },
  ]

  return {
    score,
    verdict,
    summary,
    missingKeywords: missing.slice(0, 12).map(([, e]) => label(e)),
    suggestions: tips.slice(0, 6),
    ats: checks,
  }
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
  for (let i = 1; i <= Math.min(doc.numPages, 8); i++) {
    const content = await (await doc.getPage(i)).getTextContent()
    for (const it of content.items) { out += it.str; if (it.hasEOL) out += '\n' }
    out += '\n'
  }
  return out
}

// file: { type: 'pdf' | 'text', data } exactly as Analyze.jsx keeps it. job: { title, company, desc }
export async function localAnalyze(file, job) {
  const text = file.type === 'pdf' ? await pdfText(file.data) : String(file.data || '')
  if (clean(text).trim().length < 40) throw new Error('no_text') // scanned or empty file: nothing to review
  return analyzeText(text, job)
}
