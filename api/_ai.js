// One place that talks to the AI through OpenRouter (OpenAI-compatible API). Retries when the service is busy.
// OPENROUTER_API_KEY  required (set it only as an environment variable on Vercel)
// OPENROUTER_MODEL    optional, default "nvidia/nemotron-3.5-super-vl:free". Any model id from openrouter.ai/models works, e.g. "deepseek/deepseek-chat-v3.1:free"
// deadlineMs (optional): total time allowed for ALL attempts. When it runs out the call fails with status 504 and no more retries are made.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const BUSY = [429, 500, 502, 503, 504] // temporary problems (429 = free models are rate limited)
const fail = (status, msg) => { const e = new Error(msg); e.status = status; return e }

// Returns { text, finish } where finish is "stop" or "length" (answer cut off).
export async function callAI({ system, user, temperature = 0.3, maxTokens = 4000, json = true }, tries = 3, deadlineMs = 0) {
  const end = deadlineMs ? Date.now() + deadlineMs : 0
  const model = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3.5-super-vl:free'
  const body = JSON.stringify({
    model, temperature, max_tokens: maxTokens, stream: false,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  })
  let last
  for (let i = 0; i < tries; i++) {
    const left = end ? end - Date.now() : 0
    if (end && left < 1500) throw fail(504, 'timeout')
    let r
    try {
      r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'x-title': 'Sanad CV' },
        body,
        signal: end ? AbortSignal.timeout(left) : undefined,
      })
    } catch (err) {
      if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) throw fail(504, 'timeout')
      throw err
    }
    if (r.ok) {
      const d = await r.json()
      const c = d.choices && d.choices[0]
      return { text: (c && c.message && c.message.content) || '', finish: (c && c.finish_reason) || 'no_choices' }
    }
    const j = await r.json().catch(() => ({}))
    last = fail(r.status, (j.error && j.error.message) || `HTTP ${r.status}`)
    if (!BUSY.includes(r.status)) throw last // bad key, no balance (402), bad request... retrying will not help
    if (i < tries - 1) await sleep(1000 * 2 ** i)
  }
  throw last
}
