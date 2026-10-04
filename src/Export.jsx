import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { post } from './api.js'

const fileName = (n) => (String(n || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'CV') + '-cv'
const REQUIRED_MSG = 'أكمل الحقول المطلوبة المعلّمة بنجمة حمراء *'

function Success({ email, onClose }) {
  const btn = useRef(null)
  useEffect(() => {
    btn.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="modal-bg no-print" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ok-title" onClick={(e) => e.stopPropagation()}>
        <svg className="tick" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="M14 27l8 8 16-17" /></svg>
        <h3 id="ok-title">تم الإرسال بنجاح</h3>
        <p>أُرسلت سيرتك الذاتية إلى <bdi dir="ltr">{email}</bdi></p>
        <button ref={btn} type="button" className="btn p" onClick={onClose}>حسناً</button>
      </div>
    </div>
  )
}

export default function Export({ cv, onValidate }) {
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)
  const [sentTo, setSentTo] = useState('')

  const print = () => {
    const old = document.title
    document.title = fileName(cv.p.name)
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
      a.href = url; a.download = `${fileName(cv.p.name)}.pdf`; a.click()
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
      setSentTo(to)
    } catch (e) {
      console.error(e)
      const reasons = {
        rate_limited: 'تجاوزت عدد المحاولات المسموح، حاول بعد قليل',
        missing_mail_config: 'خدمة البريد غير مُعدّة بعد على الخادم',
        app_password_required: 'يجب استخدام «كلمة مرور التطبيق» (App password) وليس كلمة مرور الحساب',
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
        <input type="email" name="recipient" autoComplete="email" dir="ltr" placeholder="recipient@email.com" value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" className="btn s" onClick={send} disabled={!!busy}>{busy === 'mail' ? 'جارٍ الإرسال…' : '✉ إرسال بالبريد'}</button>
      </div>
      {msg && <p className={msg.ok ? 'ok' : 'err'}>{msg.t}</p>}
      {sentTo && createPortal(<Success email={sentTo} onClose={() => setSentTo('')} />, document.body)}
    </div>
  )
}
