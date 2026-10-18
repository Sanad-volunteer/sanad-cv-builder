// Plain-text version of the CV built in the browser: handed to the CV analyzer so the user does not have to upload a file.
import { MONTHS } from './Preview.jsx'
const CONTACT = {
  ar: { residence: 'مكان السكن', city: 'المدينة', email: 'البريد الإلكتروني', phone: 'الهاتف', link: 'لينكدإن' },
  en: { residence: 'Residence', city: 'City', email: 'Email', phone: 'Phone', link: 'LinkedIn' },
}
import { EDU_LEVEL, langParts, langName, skillText } from '../api/_lists.js'

const H = {
  ar: { summary: 'نبذة', skills: 'المهارات', tech: 'المهارات التقنية', soft: 'المهارات الناعمة', langs: 'اللغات', courses: 'الدورات وورش العمل', edu: 'التعليم', exp: 'الخبرات', vol: 'العمل التطوعي', confs: 'المؤتمرات', now: 'حتى الآن' },
  en: { summary: 'Summary', skills: 'Skills', tech: 'Technical', soft: 'Soft', langs: 'Languages', courses: 'Courses & Workshops', edu: 'Education', exp: 'Work Experience', vol: 'Volunteer Work', confs: 'Conferences', now: 'Present' },
}
export function cvToText(cv) {
  const l = cv.lang === 'en' ? 'en' : 'ar'
  const h = H[l], p = cv.p || {}, lv = cv.lvl || {}
  const fmt = (d) => (!d || !d.y ? '' : d.y === 'now' ? h.now : (d.m ? `${MONTHS[l][d.m - 1]} ` : '') + d.y)
  const range = (a, b) => [fmt(a), fmt(b)].filter(Boolean).join(' - ')
  const out = []
  const sec = (title, lines) => { const f = lines.filter(Boolean); if (f.length) out.push('', title, ...f) }
  out.push(p.name, p.title, ...['residence', 'city', 'email', 'phone', 'link'].filter((k) => p[k]).map((k) => `${CONTACT[l][k]}: ${p[k]}`))
  sec(h.summary, [p.summary])
  sec(h.edu, (cv.edu || []).flatMap((e) => [[e.school, e.major].filter(Boolean).join(' - ') + ` ${range(e.start, e.end)}`, EDU_LEVEL[l][e.level]]))
  const jobs = (items) => (items || []).flatMap((i) => [`${[i.title, i.company].filter(Boolean).join(' - ')} ${range(i.start, i.end)}`, ...String(i.bullets || '').split('\n').map((s) => s.trim()).filter(Boolean).map((s) => `- ${s}`)])
  sec(h.exp, jobs(cv.exp))
  const tech = (cv.tech || []).map((s) => skillText(s, lv[s], l)), soft = (cv.soft || []).map((s) => skillText(s, lv[s], l))
  sec(h.skills, [tech.length && `${h.tech}: ${tech.join(', ')}`, soft.length && `${h.soft}: ${soft.join(', ')}`])
  sec(h.langs, (cv.langs || []).filter((x) => x.name).map((x) => langName(x.name, l) + langParts(x, l).map(([t]) => t).join('')))
  sec(h.courses, (cv.courses || []).map((c) => `- ${[c.title, c.org].filter(Boolean).join(' - ')} ${fmt(c.date)}`))
  sec(h.vol, jobs(cv.vol))
  sec(h.confs, (cv.confs || []).map((c) => `- ${c.title} ${fmt(c.date)}`))
  return out.filter((x) => x !== undefined && x !== false).join('\n')
}
