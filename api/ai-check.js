// Public status check: is the AI (OpenRouter) working?  GET /api/ai-check -> { ok, ms, reason, checkedAt }
// No password. To stop anyone from draining the AI quota, the result is cached for 5 seconds
// (many visitors in the same moment share one real AI call)
// and each visitor is rate limited. Nothing sensitive (keys, model names) is returned.
import { callAI } from './_ai.js'
import { makeLimiter, clientIp } from './_limit.js'

const limited = makeLimiter('aicheck', 30)
const TTL = 5e3
let cache = null // { at, out }
let running = null // a check already in flight is shared by everyone who asks meanwhile

const check = async () => {
  if (!process.env.OPENROUTER_API_KEY) return { ok: false, ms: 0, reason: 'مفتاح الذكاء الاصطناعي غير مضبوط' }
  const t = Date.now()
  try {
    await callAI({ system: 'Reply with the word ok.', user: 'ok', maxTokens: 20, json: false }, 1)
    return { ok: true, ms: Date.now() - t, reason: '' }
  } catch (e) {
    const reason = e.status === 402 ? 'رصيد الحساب غير كافٍ' : e.status === 404 ? 'النموذج غير موجود (غيّر OPENROUTER_MODEL)' : e.status === 429 ? 'تم تجاوز الحصة (quota)' : e.status === 401 || e.status === 403 ? 'المفتاح غير صالح أو غير مسموح' : e.status === 404 ? 'النموذج غير موجود' : [500, 502, 503, 504].includes(e.status) ? 'الخدمة مزدحمة حالياً' : 'خطأ غير متوقع'
    return { ok: false, ms: Date.now() - t, reason }
  }
}

export default async function handler(req, res) {
  if (await limited(clientIp(req))) return res.status(429).json({ error: 'rate_limited' })
  if (!cache || Date.now() - cache.at > TTL) {
    running = running || check().finally(() => { running = null })
    cache = { at: Date.now(), out: await running }
  }
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ ...cache.out, checkedAt: new Date(cache.at).toISOString() })
}
