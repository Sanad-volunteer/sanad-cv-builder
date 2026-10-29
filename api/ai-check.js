// Back-office check: is the AI (Gemini) really working?
//   GET /api/ai-check                       with "Authorization: Bearer <ADMIN_PASSWORD>"  (used by the admin page)
//   GET /api/ai-check?token=<AI_CHECK_TOKEN>  a separate read-only token, so you can open it as a plain link
//   -> { configured, model, fallback, ok, ms, reason }
import crypto from 'node:crypto'
import { callGemini } from './_gemini.js'
import { makeLimiter, makeFailGuard, clientIp } from './_limit.js'

const limited = makeLimiter('aicheck', 60)
const guard = makeFailGuard('aicheckfail', 10)
const hash = (v) => crypto.createHash('sha256').update(String(v)).digest()

export default async function handler(req, res) {
  const pass = process.env.ADMIN_PASSWORD
  const tok = process.env.AI_CHECK_TOKEN // optional; the link token never opens anything else
  if (!pass && !tok) return res.status(500).json({ error: 'not_configured' })
  const ip = clientIp(req)
  if ((await limited(ip)) || (await guard.blocked(ip))) return res.status(429).json({ error: 'rate_limited' })
  const same = (a, b) => !!b && crypto.timingSafeEqual(hash(a), hash(b))
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const query = String((req.query || {}).token || '')
  if (!same(bearer, pass) && !same(query, tok)) { await guard.fail(ip); return res.status(401).json({ error: 'unauthorized' }) }

  const out = { configured: !!process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-3.8-flash', fallback: process.env.GEMINI_FALLBACK_MODEL || '', ok: false, ms: 0, reason: '' }
  if (!out.configured) { out.reason = 'GEMINI_API_KEY غير مضبوط في Vercel'; return res.status(200).json(out) }
  const t = Date.now()
  try {
    await callGemini({ contents: [{ role: 'user', parts: [{ text: 'Reply with: ok' }] }], generationConfig: { maxOutputTokens: 200 } }, 1)
    out.ok = true
  } catch (e) {
    out.reason = e.status === 429 ? 'تم تجاوز الحصة (quota)' : e.status === 400 || e.status === 403 ? 'المفتاح غير صالح أو غير مسموح' : e.status === 404 ? 'النموذج غير موجود' : [500, 502, 503, 504].includes(e.status) ? 'الخدمة مزدحمة حالياً' : String(e.message || 'خطأ').slice(0, 120).replace(process.env.GEMINI_API_KEY, '***')
  }
  out.ms = Date.now() - t
  res.status(200).json(out)
}
