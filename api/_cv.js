// Server-side ATS markup for the PDF. Mirrors src/Preview.jsx; every value is escaped.
const M = {
  ar: ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}
const T = {
  ar: { summary: 'نبذة', skills: 'المهارات', tech: 'المهارات التقنية', soft: 'المهارات الناعمة', langs: 'اللغات', courses: 'الدورات وورش العمل', edu: 'التعليم', exp: 'الخبرة العملية', vol: 'العمل التطوعي', now: 'حتى الآن' },
  en: { summary: 'Summary', skills: 'Skills', tech: 'Technical', soft: 'Soft', langs: 'Languages', courses: 'Courses & Workshops', edu: 'Education', exp: 'Work Experience', vol: 'Volunteer Work', now: 'Present' },
}
const LV = {
  ar: { beginner: 'مبتدئ', intermediate: 'متوسط', upper: 'فوق المتوسط', fluent: 'طليق', native: 'لغة أم' },
  en: { beginner: 'Beginner', intermediate: 'Intermediate', upper: 'Upper-intermediate', fluent: 'Fluent', native: 'Native' },
}
const CSS = `body{margin:0;font-family:Cairo,Arial,sans-serif;font-size:12.5px;line-height:1.6;color:#000}
a{color:inherit;text-decoration:underline}h1{font-size:21px;margin:0;color:#1A1464}p{margin:0}
h2{font-size:12px;letter-spacing:.06em;text-transform:uppercase;border-bottom:1px solid #000;margin:14px 0 5px;padding-bottom:1px}
.r{display:flex;justify-content:space-between;gap:12px}.r span{white-space:nowrap}
section>div+div{margin-top:6px}ul{margin:2px 0 4px;padding-inline-start:18px}`

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
const jobs = (items, h, l) => {
  const f = list(items).filter((i) => i.title || i.company)
  return f.length ? sec(h, f.map((i) => `<div>${row([i.title, i.company].filter(Boolean).join(' – '), range(i.start, i.end, l))}${bullets(i.bullets)}</div>`).join('')) : ''
}

// "Mouayad alkassas" -> "Mouayad alkassas-cv" (illegal file-name characters removed)
export const cvFileName = (name) =>
  (String(name ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'CV') + '-cv'

export function cvHtml(cv, opts = {}) {
  const l = cv.lang === 'en' ? 'en' : 'ar'
  const t = T[l]
  const p = cv.p || {}
  const sep = l === 'ar' ? '، ' : ', '
  const tech = list(cv.tech), soft = list(cv.soft)
  const contact = [[p.city], [p.email], [p.phone], [p.link, true]]
    .filter(([v]) => v)
    .map(([v, isLink]) => `<bdi>${isLink ? `<a href="${esc(href(v))}">${esc(v)}</a>` : esc(v)}</bdi>`)
    .join(' · ')
  const courses = list(cv.courses).filter((c) => c && (c.title || c.org))
  const langs = list(cv.langs).filter((x) => x && String(x.name || '').trim())
  const edu = list(cv.edu).filter((e) => e.school || e.major)
  const body = [
    p.name ? `<h1>${esc(p.name)}</h1>` : '',
    p.title ? `<p>${esc(p.title)}</p>` : '',
    contact ? `<p>${contact}</p>` : '',
    p.summary ? sec(t.summary, `<p>${esc(p.summary)}</p>`) : '',
    tech.length || soft.length
      ? sec(t.skills, (tech.length ? `<p><b>${t.tech}:</b> ${esc(tech.join(sep))}</p>` : '') + (soft.length ? `<p><b>${t.soft}:</b> ${esc(soft.join(sep))}</p>` : ''))
      : '',
    langs.length ? sec(t.langs, langs.map((x) => `<p><b>${esc(x.name)}</b>${LV[l][x.level] ? ` – ${LV[l][x.level]}` : ''}</p>`).join('')) : '',
    edu.length ? sec(t.edu, edu.map((e) => `<div>${row(e.school, range(e.start, e.end, l))}${e.major ? `<p>${esc(e.major)}</p>` : ''}</div>`).join('')) : '',
    jobs(cv.exp, t.exp, l),
    courses.length ? sec(t.courses, courses.map((c) => `<div>${row([c.title, c.org].filter(Boolean).join(' – '), fmt(c.date, l))}</div>`).join('')) : '',
    jobs(cv.vol, t.vol, l),
  ].join('')
  return `<!doctype html><html lang="${l}" dir="${l === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>${opts.fontCss || ''}${CSS}</style></head><body>${opts.wrap ? opts.wrap(body) : body}</body></html>`
}
