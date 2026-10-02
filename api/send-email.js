import { makePdf } from './_pdf.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  const { cv, to } = req.body || {}
  if (!cv || typeof cv !== 'object' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to || '')) || String(to).length > 200)
    return res.status(400).json({ error: 'bad_request' })
  try {
    const pdf = await makePdf(cv)
    const name = String((cv.p && cv.p.name) || '').replace(/[\r\n]+/g, ' ').slice(0, 80).trim()
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL,
        to: [to],
        subject: name ? `السيرة الذاتية – ${name}` : 'السيرة الذاتية',
        html: '<p dir="rtl">مرفق ملف السيرة الذاتية بصيغة PDF، تم إنشاؤه عبر منشئ السيرة الذاتية – سند الشباب.</p>',
        attachments: [{ filename: 'CV.pdf', content: pdf.toString('base64') }],
      }),
    })
    if (!r.ok) throw new Error(await r.text())
    res.status(200).json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'send_failed' })
  }
}
