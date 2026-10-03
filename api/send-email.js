import nodemailer from 'nodemailer'
import { makePdf } from './_pdf.js'
import { cvHtml } from './_cv.js'

// ---------- Edit the email wording here ----------
const SENDER_NAME = 'Sanad Youth' // the name recipients see as the sender
const SUBJECT = (name) => (name ? `السيرة الذاتية – ${name}` : 'السيرة الذاتية')
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
// The logo is public/logo.png of this site. SITE_URL is optional (Vercel's production URL is used when it is not set).
const SITE = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
const LOGO_URL = SITE ? `${SITE.replace(/\/$/, '')}/logo.png` : ''
const BODY_HTML = (name) => `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:15px;line-height:1.8;color:#1A1A2E">
  ${LOGO_URL ? `<img src="${LOGO_URL}" width="170" alt="Sanad Youth" style="display:block;margin:0 0 18px">` : ''}
  <p>مرحباً،</p>
  <p>مرفق ملف السيرة الذاتية${name ? ` الخاصة بـ <b>${esc(name)}</b>` : ''} بصيغة PDF.</p>
  <p style="color:#5d6079;font-size:13px">تم إنشاؤها عبر منشئ السيرة الذاتية – سند الشباب.</p>
</div>`
// -------------------------------------------------

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

  const user = (process.env.GMAIL_USER || '').trim()
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '') // Google shows the app password in groups with spaces
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
      from: `"${SENDER_NAME}" <${user}>`,
      to,
      subject: SUBJECT(name),
      html: pdf ? BODY_HTML(name) : cvHtml(cv),
      attachments: pdf ? [{ filename: 'CV.pdf', content: pdf, contentType: 'application/pdf' }] : [],
    })
    res.status(200).json({ ok: true, attached: !!pdf })
  } catch (e) {
    console.error('send failed:', e.code, e.message)
    const code = e.code === 'EAUTH' ? 'auth_failed' : ['ESOCKET', 'ECONNECTION', 'ETIMEDOUT', 'EDNS'].includes(e.code) ? 'smtp_unreachable' : 'send_failed'
    res.status(500).json({ error: code })
  }
}
