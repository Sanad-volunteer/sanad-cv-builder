import { useState } from 'react'
import emailjs from '@emailjs/browser'
import { post } from './api.js'
import { EMAILJS, emailReady } from './config.js'

const toDataUri = (blob) => new Promise((ok, no) => {
  const r = new FileReader()
  r.onload = () => ok(r.result)
  r.onerror = no
  r.readAsDataURL(blob)
})

export default function Export({ cv, onReset }) {
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)

  const print = () => {
    const old = document.title
    document.title = `CV - ${cv.p.name || 'Sanad'}`
    window.print()
    document.title = old
  }
  const download = async () => {
    setBusy('pdf'); setMsg(null)
    try {
      const r = await post('/api/pdf', { cv })
      const url = URL.createObjectURL(await r.blob())
      const a = document.createElement('a')
      a.href = url; a.download = `CV - ${cv.p.name || 'Sanad'}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch {
      print() // fallback: browser print dialog -> "Save as PDF"
    } finally { setBusy('') }
  }
  const send = async () => {
    if (!emailReady) return setMsg({ ok: false, t: 'خدمة البريد غير مُعدّة بعد، راجع ملف EMAILJS_SETUP.md' })
    if (!cv.p.name.trim()) return setMsg({ ok: false, t: 'أضف اسمك في السيرة الذاتية أولاً' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return setMsg({ ok: false, t: 'أدخل بريدًا إلكترونيًا صحيحًا' })
    setBusy('mail'); setMsg(null)
    try {
      // Template variables: {{to_email}}, {{cv_name}}, {{{cv_html}}}, and {{cv_pdf}} (only when attachPdf is on)
      const params = {
        to_email: to,
        cv_name: cv.p.name,
        cv_html: `<div dir="${cv.lang === 'ar' ? 'rtl' : 'ltr'}">${document.querySelector('.paper')?.innerHTML || ''}</div>`,
      }
      if (EMAILJS.attachPdf) {
        const r = await post('/api/pdf', { cv })
        params.cv_pdf = await toDataUri(await r.blob())
      }
      await emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, params, { publicKey: EMAILJS.publicKey })
      setMsg({ ok: true, t: 'تم إرسال السيرة الذاتية ✓' })
    } catch (e) {
      console.error(e)
      setMsg({ ok: false, t: 'تعذّر الإرسال، حاول مرة أخرى' })
    } finally { setBusy('') }
  }

  return (
    <div className="exp no-print">
      <button type="button" className="btn p" onClick={download} disabled={!!busy}>{busy === 'pdf' ? 'جارٍ التجهيز…' : '⬇ تحميل PDF'}</button>
      <div className="mail">
        <input type="email" dir="ltr" placeholder="recipient@email.com" value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" className="btn s" onClick={send} disabled={!!busy}>{busy === 'mail' ? 'جارٍ الإرسال…' : '✉ إرسال بالبريد'}</button>
      </div>
      {msg && <p className={msg.ok ? 'ok' : 'err'}>{msg.t}</p>}
      <p className="note">ملف PDF نصي بسيط، بدون ألوان أو جداول، ليقرأه نظام ATS بسهولة.</p>
      <button type="button" className="link" onClick={onReset}>مسح جميع البيانات</button>
    </div>
  )
}
