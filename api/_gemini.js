// One place that talks to Gemini. It retries when Google is busy and can fall back to a second model.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const BUSY = [500, 502, 503, 504] // temporary problems on Google's side

// GEMINI_MODEL          main model (default below)
// GEMINI_FALLBACK_MODEL optional: used when the main model is overloaded for several attempts or no longer exists
export async function callGemini(body, tries = 3) {
  const models = [process.env.GEMINI_MODEL || 'gemini-3.8-flash']
  if (process.env.GEMINI_FALLBACK_MODEL) models.push(process.env.GEMINI_FALLBACK_MODEL)
  let last
  for (const model of models) {
    for (let i = 0; i < tries; i++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify(body),
      })
      if (r.ok) return r.json()
      const j = await r.json().catch(() => ({}))
      last = new Error((j.error && j.error.message) || `HTTP ${r.status}`)
      last.status = r.status
      if (r.status === 404) break // this model is gone: go straight to the fallback
      if (!BUSY.includes(r.status)) throw last // bad key, quota, bad request... retrying will not help
      if (i < tries - 1) await sleep(1000 * 2 ** i) // wait 1s, then 2s
    }
  }
  throw last
}
