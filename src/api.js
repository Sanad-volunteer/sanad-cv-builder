// timeoutMs (optional): give up after this long (error.name 'TimeoutError') instead of waiting for the server forever
export async function post(path, body, timeoutMs = 0) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined })
  if (!r.ok) {
    let body = null
    try { body = await r.json() } catch { /* response was not JSON */ }
    const err = new Error((body && body.error) || `http_${r.status}`)
    err.status = r.status
    err.body = body
    throw err
  }
  return r
}
