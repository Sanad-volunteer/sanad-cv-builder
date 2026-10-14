// Back office for the saved CVs. Every request needs the ADMIN_PASSWORD (header "Authorization: Bearer <password>").
//   GET  /api/admin?action=list                       -> all saved CVs (summary columns only)
//   GET  /api/admin?action=file&id=<uuid>&fmt=pdf|docx|json
//   POST /api/admin?action=delete&id=<uuid>           -> removes one user's CV (e.g. a deletion request)
//   POST /api/admin?action=delete&ids=<uuid>,<uuid>   -> removes several at once (max 100)
import crypto from 'node:crypto'
import { sb, storeReady } from './_store.js'
import { makePdf } from './_pdf.js'
import { makeDocx } from './_docx.js'
import { cvFileName } from './_cv.js'
import { makeLimiter, clientIp } from './_limit.js'

const limited = makeLimiter('admin', 600) // also slows down anyone guessing the password (use a long one)
const hash = (v) => crypto.createHash('sha256').update(String(v)).digest()
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const COLS = 'id,email,name,title,phone,city,residence,university,major,level,lang,created_at,updated_at'

export default async function handler(req, res) {
  const pass = process.env.ADMIN_PASSWORD
  if (!pass || !storeReady()) return res.status(500).json({ error: 'not_configured' })
  if (await limited(clientIp(req))) return res.status(429).json({ error: 'rate_limited' })
  const given = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!crypto.timingSafeEqual(hash(given), hash(pass))) return res.status(401).json({ error: 'unauthorized' })

  const { action, id, fmt } = req.query || {}
  try {
    if (action === 'list' && req.method === 'GET') {
      const r = await sb(`cvs?select=${COLS}&order=updated_at.desc&limit=5000`)
      return res.status(200).json({ rows: await r.json() })
    }
    if (action === 'file' && req.method === 'GET') {
      if (!UUID.test(String(id))) return res.status(400).json({ error: 'bad_request' })
      const rows = await (await sb(`cvs?id=eq.${id}&select=cv`)).json()
      if (!rows.length) return res.status(404).json({ error: 'not_found' })
      const cv = rows[0].cv
      const base = cvFileName(cv.p && cv.p.name)
      const send = (type, ext, body) => {
        res.setHeader('Content-Type', type)
        res.setHeader('Content-Disposition', `attachment; filename="cv.${ext}"; filename*=UTF-8''${encodeURIComponent(`${base}.${ext}`)}`)
        res.status(200).send(body)
      }
      if (fmt === 'docx') return send('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx', await makeDocx(cv))
      if (fmt === 'json') return send('application/json', 'json', JSON.stringify(cv, null, 2))
      return send('application/pdf', 'pdf', await makePdf(cv))
    }
    if (action === 'delete' && req.method === 'POST') {
      const ids = String((req.query || {}).ids || id || '').split(',')
      if (!ids.length || ids.length > 100 || !ids.every((x) => UUID.test(x))) return res.status(400).json({ error: 'bad_request' })
      await sb(`cvs?id=in.(${ids.join(',')})`, { method: 'DELETE' })
      return res.status(200).json({ ok: true, deleted: ids.length })
    }
    return res.status(400).json({ error: 'bad_request' })
  } catch (e) {
    console.error('admin failed', e.message)
    return res.status(500).json({ error: 'admin_failed' })
  }
}
