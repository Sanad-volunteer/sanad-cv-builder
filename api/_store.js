// Keeps ONE CV per user (the e-mail written on the CV) in Supabase, through its REST API (no extra npm package).
// Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server only, never put it in the browser code).
import { makeLimiter, clientIp } from './_limit.js'

const base = () => String(process.env.SUPABASE_URL || '').trim().replace(/\/$/, '')
const key = () => String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
export const storeReady = () => !!(base() && key())

export async function sb(path, { method = 'GET', body, headers = {} } = {}) {
  const r = await fetch(`${base()}/rest/v1/${path}`, {
    method,
    headers: { apikey: key(), Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`supabase ${r.status} ${(await r.text().catch(() => '')).slice(0, 200)}`)
  return r
}

const limited = makeLimiter('save', 60) // stops someone from filling the table with junk (60 saves per hour per visitor)
const s = (v, n = 300) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n)

// Never throws: a failed save must not stop the user from getting their file. Returns true when saved.
export async function saveCv(req, cv) {
  try {
    if (!storeReady()) return false
    const p = (cv && cv.p) || {}
    const email = s(p.email, 200).toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false
    const json = JSON.stringify(cv)
    if (json.length > 1_500_000) return false
    if (await limited(clientIp(req))) return false
    const e = (Array.isArray(cv.edu) && cv.edu[0]) || {} // the form asks for newest first, so [0] is the latest education
    await sb('cvs?on_conflict=email', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: {
        email, name: s(p.name, 120), title: s(p.title, 160), phone: s(p.phone, 40), city: s(p.city, 80), residence: s(p.residence, 120),
        university: s(e.school, 160), major: s(e.major, 160), level: s(e.level, 20), lang: cv.lang === 'en' ? 'en' : 'ar',
        cv, updated_at: new Date().toISOString(),
      },
    })
    return true
  } catch (err) {
    console.error('saveCv failed', err.message)
    return false
  }
}
