// Rate limiting kept in server memory (no external service).
// Note: on Vercel each warm function instance has its own memory, so limits are per instance and reset on a cold start.
// That is enough to stop casual abuse; use long passwords for the admin area.
const memory = new Map() // key -> timestamps (ms) of recent hits
const HOUR = 3600e3

export const clientIp = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'

const recent = (key, now) => {
  const list = (memory.get(key) || []).filter((t) => now - t < HOUR)
  if (list.length) memory.set(key, list)
  else memory.delete(key) // keeps the map from growing forever
  return list
}

// makeLimiter('mail', 5) -> async (ip) => true when this caller exceeded 5 requests in the last hour
export function makeLimiter(name, max) {
  return async (ip) => {
    const now = Date.now()
    const list = recent(name + ip, now)
    if (list.length >= max) return true
    list.push(now)
    memory.set(name + ip, list)
    return false
  }
}

// makeFailGuard('adminfail', 10) -> { blocked(ip), fail(ip) }: counts only FAILED attempts (e.g. wrong passwords) per hour.
// blocked() only looks, fail() records one failure. Correct requests never use up the budget.
export function makeFailGuard(name, max) {
  return {
    async blocked(ip) { return recent(name + ip, Date.now()).length >= max },
    async fail(ip) { const now = Date.now(); const list = recent(name + ip, now); list.push(now); memory.set(name + ip, list) },
  }
}
