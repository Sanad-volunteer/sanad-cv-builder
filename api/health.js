import { makeLimiter, clientIp } from './_limit.js'
import { sb, storeReady } from './_store.js'

const limited = makeLimiter('health', 6) // the AI check calls Gemini, so keep it rare

// https://YOUR-SITE/api/health         -> which settings the server can see (true/false only, never the values)
// https://YOUR-SITE/api/health?ai=1    -> also sends one tiny request to Gemini and reports whether it answered
export default async function handler(req, res) {
  const out = {
    gmailUser: !!process.env.GMAIL_USER,
    gmailPassword: !!process.env.GMAIL_APP_PASSWORD,
    geminiKey: !!process.env.GEMINI_API_KEY,
    siteUrl: !!(process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL),
    supabaseUrl: !!process.env.SUPABASE_URL,
    supabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    adminPassword: !!process.env.ADMIN_PASSWORD,
  }
  if (req.query && req.query.db !== undefined) { // ?db=1 -> checks that the cvs table can be reached
    if (await limited(clientIp(req))) return res.status(429).json({ error: 'rate_limited' })
    try { await sb('cvs?select=id&limit=1'); out.db = { ok: true } } catch (e) { out.db = { ok: false, reason: storeReady() ? String(e.message).slice(0, 160) : 'missing_settings' } }
  }
  if (req.query && req.query.ai !== undefined) {
    if (await limited(clientIp(req))) return res.status(429).json({ error: 'rate_limited' })
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
    if (!process.env.GEMINI_API_KEY) {
      out.gemini = { ok: false, reason: 'missing_api_key' }
    } else {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with the single word OK' }] }], generationConfig: { maxOutputTokens: 32 } }),
        })
        const j = await r.json().catch(() => ({}))
        out.gemini = r.ok ? { ok: true, model } : { ok: false, model, status: r.status, reason: String(j.error?.message || '').slice(0, 200) }
      } catch {
        out.gemini = { ok: false, model, reason: 'network_error' }
      }
    }
  }
  res.status(200).json(out)
}
