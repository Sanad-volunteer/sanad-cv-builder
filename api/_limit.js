import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Upstash settings: added by hand (UPSTASH_REDIS_REST_*) or by the Vercel Marketplace integration (KV_REST_API_*).
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
const redis = url && token ? new Redis({ url, token }) : null
const memory = new Map() // fallback when Upstash is not configured (per warm server instance only)

export const clientIp = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'

// makeLimiter('mail', 5) -> async (ip) => true when this caller exceeded 5 requests in the last hour
export function makeLimiter(name, max) {
  const upstash = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(max, '1 h'), prefix: `cv:${name}` }) : null
  return async (ip) => {
    if (upstash) {
      try { return !(await upstash.limit(ip)).success } catch (e) { console.error('ratelimit error', e) }
    }
    const now = Date.now()
    const recent = (memory.get(name + ip) || []).filter((t) => now - t < 3600e3)
    if (recent.length >= max) return true
    recent.push(now)
    memory.set(name + ip, recent)
    return false
  }
}
