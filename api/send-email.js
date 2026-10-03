import nodemailer from 'nodemailer'
import { makePdf } from './_pdf.js'
import { cvHtml } from './_cv.js'

// Best-effort limiter (per warm server instance): max 5 emails per hour per IP.
const hits = new Map()
const limited = (ip) => {
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600e3)
  if (recent.length >= 5) return true
  recent.push(now)
  hits.set(ip, recent)
  return false
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  const { cv, to } = req.body || {}
  if (!cv || typeof cv !== 'object' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to || '')) || String(to).length > 200)
    return res.status(400).json({ error: 'bad_request' })

  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return res.status(500).json({ error: 'missing_mail_config' })

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (limited(ip)) return res.status(429).json({ error: 'rate_limited' })

  try {
    // Preferred: the CV as a PDF attachment. If PDF generation fails, send the CV inside the email body instead.
    let pdf = null
    try { pdf = await makePdf(cv) } catch (e) { console.error('pdf failed', e) }

    const name = String((cv.p && cv.p.name) || '').replace(/[\r\n]+/g, ' ').slice(0, 80).trim()
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
    await transporter.sendMail({
      from: `"سند الشباب – منشئ السيرة الذاتية" <${user}>`,
      to,
      subject: name ? `السيرة الذاتية – ${name}` : 'السيرة الذاتية',
      html: pdf
        ? '<p dir="rtl">مرفق ملف السيرة الذاتية بصيغة PDF، تم إنشاؤه عبر منشئ السيرة الذاتية – سند الشباب.</p>'
        : cvHtml(cv),
      attachments: pdf ? [{ filename: 'CV.pdf', content: pdf, contentType: 'application/pdf' }] : [],
    })
    res.status(200).json({ ok: true, attached: !!pdf })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'send_failed' })
  }
}
