import { useState } from 'react'
import { post } from './api.js'

const REQUIRED_MSG = 'أكمل الحقول المطلوبة المعلّمة بنجمة حمراء *'

export default function Export({ cv, onValidate }) {
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
    if (!onValidate()) return setMsg({ ok: false, t: REQUIRED_MSG })
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
    if (!onValidate()) return setMsg({ ok: false, t: REQUIRED_MSG })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return setMsg({ ok: false, t: 'أدخل بريدًا إلكترونيًا صحيحًا' })
    setBusy('mail'); setMsg(null)
    try {
      await post('/api/send-email', { cv, to })
      setMsg({ ok: true, t: 'تم إرسال السيرة الذاتية ✓' })
    } catch (e) {
      console.error(e)
      const reasons = {
        rate_limited: 'تجاوزت عدد المحاولات المسموح، حاول بعد قليل',
        missing_mail_config: 'خدمة البريد غير مُعدّة بعد على الخادم',
        auth_failed: 'تعذّر تسجيل الدخول إلى حساب البريد المرسِل',
        smtp_unreachable: 'تعذّر الاتصال بخدمة البريد، حاول لاحقاً',
      }
      setMsg({ ok: false, t: reasons[e.message] || (e.status === 404 ? 'خدمة البريد غير متاحة هنا (تعمل على Vercel فقط)' : `تعذّر الإرسال، حاول مرة أخرى (${e.message})`) })
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
    </div>
  )
}
