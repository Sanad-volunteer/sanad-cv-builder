export async function post(path, body) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) {
    let code = ''
    try { code = (await r.json()).error } catch { /* response was not JSON */ }
    const err = new Error(code || `http_${r.status}`)
    err.status = r.status
    throw err
  }
  return r
}
