// One place that talks to DeepSeek (OpenAI-compatible API). Retries when the service is busy.
// DEEPSEEK_API_KEY  required (set it only as an environment variable on Vercel)
// DEEPSEEK_MODEL    optional, default "deepseek-chat"
// deadlineMs (optional): total time allowed for ALL attempts. When it runs out the call fails with status 504 and no more retries are made.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const BUSY = [429, 500, 502, 503, 504] // temporary problems (429 = DeepSeek asks to slow down)
const fail = (status, msg) => { const e = new Error(msg); e.status = status; return e }

// Returns { text, finish } where finish is "stop" or "length" (answer cut off).
export async function callAI({ system, user, temperature = 0.3, maxTokens = 4000, json = true }, tries = 3, deadlineMs = 0) {
  const end = deadlineMs ? Date.now() + deadlineMs : 0
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  const body = JSON.stringify({
    model, temperature, max_tokens: maxTokens, stream: false,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  })
  let last
  for (let i = 0; i < tries; i++) {
    const left = end ? end - Date.now() : 0
    if (end && left < 1500) throw fail(504, 'timeout')
    let r
    try {
      r = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
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
