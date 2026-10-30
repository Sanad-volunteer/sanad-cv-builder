// Server-side ATS markup for the PDF. Mirrors src/Preview.jsx; every value is escaped.
const M = {
  ar: ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}
const T = {
  ar: { summary: 'نبذة', skills: 'المهارات', tech: 'المهارات التقنية', soft: 'المهارات الناعمة', langs: 'اللغات', courses: 'الدورات وورش العمل', edu: 'التعليم', exp: 'الخبرات', vol: 'العمل التطوعي', confs: 'المؤتمرات', now: 'حتى الآن' },
  en: { summary: 'Summary', skills: 'Skills', tech: 'Technical', soft: 'Soft', langs: 'Languages', courses: 'Courses & Workshops', edu: 'Education', exp: 'Work Experience', vol: 'Volunteer Work', confs: 'Conferences', now: 'Present' },
}
import { TPL_CSS, tplOf } from './_tpl.js'
import serifCss from './_font_serif.js'
import { EDU_LEVEL as EL, langParts, langName, skillText, cvFileName } from './_lists.js'
const FULL = { ar: M.ar, en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] }
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
  const month = m && FULL[l][+m[2] - 1]
  return month ? `${+m[3]} ${month} ${m[1]}` : ''
}
// Only a small inline JPEG/PNG/WebP data URL is accepted as the photo (no external URLs reach the PDF renderer).
const PHOTO = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/
const CSS = `body{margin:0}${TPL_CSS}`

const href = (u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const list = (x) => (Array.isArray(x) ? x : [])
const fmt = (d, l) => (!d || !d.y ? '' : d.y === 'now' ? T[l].now : ((d.m && M[l][d.m - 1]) ? M[l][d.m - 1] + ' ' : '') + esc(d.y))
const range = (s, e, l) => [fmt(s, l), fmt(e, l)].filter(Boolean).join(' – ')
const row = (a, b) => `<div class="r"><b>${esc(a)}</b><span>${b}</span></div>`
const sec = (h, inner) => `<section><h2>${h}</h2>${inner}</section>`
const bullets = (t) => {
  const l = String(t || '').split('\n').map((s) => s.trim()).filter(Boolean)
  return l.length ? `<ul>${l.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''
}
// company on top (bold), job title below it (the template decides whether it sits on a second line or after a bullet)
const jobRow = (i, l) => `<div class="r"><span class="l">${i.company ? `<b>${esc(i.company)}</b>${i.title ? `<i class="jt">${esc(i.title)}</i>` : ''}` : `<b>${esc(i.title)}</b>`}</span><span>${range(i.start, i.end, l)}</span></div>`
const jobs = (items, h, l) => {
  const f = list(items).filter((i) => i.title || i.company)
  return f.length ? sec(h, f.map((i) => `<div>${jobRow(i, l)}${bullets(i.bullets)}</div>`).join('')) : ''
}

// "Mouayad alkassas" -> "Mouayad alkassas-cv" (illegal file-name characters removed)
export { cvFileName } // one definition in _lists.js, shared with the React app

export function cvHtml(cv, opts = {}) {
  const l = cv.lang === 'en' ? 'en' : 'ar'
  const t = T[l]
  const p = cv.p || {}
  const sep = l === 'ar' ? '، ' : ', '
  const lv = cv.lvl || {}
  const tech = list(cv.tech).map((s) => skillText(s, lv[s], l)), soft = list(cv.soft).map((s) => skillText(s, lv[s], l))
  const courses = list(cv.courses).filter((c) => c && (c.title || c.org))
  const confs = list(cv.confs).filter((c) => c && c.title)
  const d = DETAILS[l]
  const genderLine = (p.gender === 'male' || p.gender === 'female') ? [d.gender, d[p.gender]] : null // [label, value]
  const details = [
    dobText(p.dob, l) && [d.dob, dobText(p.dob, l)],
    (p.marital === 'single' || p.marital === 'married') && [d.marital, d[p.marital + (p.gender === 'female' ? 'F' : '')]],
  ].filter(Boolean)
  const langs = list(cv.langs).filter((x) => x && String(x.name || '').trim())
  const edu = list(cv.edu).filter((e) => e && (e.school || e.major || e.level))
  const contact = [ // line 1: how to reach the person
    p.residence && `<span><b>${CONTACT[l].residence}:</b> <bdi>${esc(p.residence)}</bdi></span>`,
    p.city && `<span><b>${CONTACT[l].city}:</b> <bdi>${esc(p.city)}</bdi></span>`,
    p.email && `<span><bdi>${esc(p.email)}</bdi></span>`,
    p.phone && `<span><bdi>${esc(p.phone)}</bdi></span>`,
    p.link && `<span><bdi><a href="${esc(href(p.link))}">${esc(p.link)}</a></bdi></span>`,
  ].filter(Boolean)
  const personal = [ // line 2: gender, date of birth, marital status
    genderLine && `<span><b>${esc(genderLine[0])}:</b> ${esc(genderLine[1])}</span>`,
    ...details.map(([k, v]) => `<span><b>${esc(k)}:</b> ${esc(v)}</span>`),
  ].filter(Boolean)
  const ctLines = [contact, personal].filter((x) => x.length).map((x) => `<p>${x.join(' ')}</p>`).join('')
  const photo = typeof p.photo === 'string' && p.photo.length <= 400000 && PHOTO.test(p.photo) ? p.photo : ''
  const hasHead = p.name || p.title || ctLines || photo
  const body = [
    hasHead
      ? `<header class="hd${photo ? ' ph' : ''}"><div class="hd-c">${p.name ? `<h1>${esc(p.name)}</h1>` : ''}${p.title ? `<p class="ttl">${esc(p.title)}</p>` : ''}${ctLines ? `<div class="ct">${ctLines}</div>` : ''}</div>${photo ? `<img src="${photo}" alt="">` : ''}</header>`
      : '',
    p.summary ? sec(t.summary, `<p>${esc(p.summary)}</p>`) : '',
    edu.length
      ? sec(t.edu, edu.map((e) => {
          const line = EL[l][e.level] || '' // "Bachelor's Degree"
          return `<div>${row([e.school, e.major].filter(Boolean).join(' - '), range(e.start, e.end, l))}${line ? `<p>${esc(line)}</p>` : ''}</div>`
        }).join(''))
      : '',
    jobs(cv.exp, t.exp, l),
    tech.length || soft.length
      ? sec(t.skills, (tech.length ? `<p><b>${t.tech}:</b> ${esc(tech.join(sep))}</p>` : '') + (soft.length ? `<p><b>${t.soft}:</b> ${esc(soft.join(sep))}</p>` : ''))
      : '',
    langs.length ? sec(t.langs, langs.map((x) => `<p><b>${esc(langName(x.name, l))}</b>${langParts(x, l).map(([tx, b]) => (b ? `<b>${esc(tx)}</b>` : esc(tx))).join('')}</p>`).join('')) : '',
    courses.length ? sec(t.courses, `<ul>${courses.map((c) => `<li>${esc([[c.title, c.org].filter(Boolean).join(' – '), fmt(c.date, l) && `(${fmt(c.date, l)})`].filter(Boolean).join(' '))}</li>`).join('')}</ul>`) : '',
    jobs(cv.vol, t.vol, l),
    confs.length ? sec(t.confs, confs.map((c) => `<div>${row(c.title, fmt(c.date, l))}</div>`).join('')) : '',
  ].join('')
  return `<!doctype html><html lang="${l}" dir="${l === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>${opts.fontCss || ''}${tplOf(cv) === 'exec' ? serifCss : ''}${CSS}</style></head><body><div class="cv tpl-${tplOf(cv)}">${opts.wrap ? opts.wrap(body) : body}</div></body></html>`
}

// Shared with api/_docx.js so the Word file uses exactly the same wording as the PDF.
export { T, EL, DETAILS, CONTACT, dobText, langParts, langName, range, fmt, list, href }
