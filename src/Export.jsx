import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { post } from './api.js'
import Notice, { InfoIcon, SHARE_TEXT } from './Notice.jsx'

import { cvFileName as fileName } from '../api/_lists.js'
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
        <p style={{ marginBottom: 12 }}>أُرسلت سيرتك الذاتية إلى <bdi dir="ltr">{email}</bdi></p>
        <p className="share-note"><InfoIcon />{SHARE_TEXT}</p>
        <button ref={btn} type="button" className="btn p" onClick={onClose}>حسناً</button>
      </div>
    </div>
  )
}

// Small inline icons (same stroke style everywhere)
const Ico = ({ children }) => <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
const FileDown = () => <Ico><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M12 11v6M9.5 14.5L12 17l2.5-2.5" /></Ico>
const MailIco = () => <Ico><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Ico>
const Spin = () => <span className="spin" aria-hidden="true" />

export default function Export({ cv, onValidate }) {
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)
  const [sentTo, setSentTo] = useState('')
  const [notice, setNotice] = useState(false) // information pop-up shown after a successful download

  const print = () => {
    const old = document.title
    document.title = fileName(cv.p.name)
    window.print()
    document.title = old
  }
  // kind: 'pdf' or 'docx' (the file extension is also the name of the /api endpoint)
  const save = async (kind) => {
    if (!onValidate()) return setMsg({ ok: false, t: REQUIRED_MSG })
    setBusy(kind); setMsg(null)
    try {
      const r = await post(`/api/${kind}`, { cv })
      const url = URL.createObjectURL(await r.blob())
      const a = document.createElement('a')
      a.href = url; a.download = `${fileName(cv.p.name)}.${kind}`; a.click()
      URL.revokeObjectURL(url)
      setNotice(true)
    } catch (e) {
      console.error(e)
      if (kind === 'pdf') print() // fallback: browser print dialog -> "Save as PDF"
      else setMsg({ ok: false, t: 'تعذّر تجهيز ملف Word، حاول مرة أخرى' })
    } finally { setBusy('') }
  }
  const download = () => save('pdf')
  const downloadWord = () => save('docx')
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
      <div className="exp-dl">
        <button type="button" className="btn p exp-btn" onClick={download} disabled={!!busy}>{busy === 'pdf' ? <Spin /> : <FileDown />}{busy === 'pdf' ? 'جارٍ التجهيز…' : 'تحميل PDF'}</button>
        <button type="button" className="btn out exp-btn" onClick={downloadWord} disabled={!!busy}>{busy === 'docx' ? <Spin /> : <FileDown />}{busy === 'docx' ? 'جارٍ التجهيز…' : 'تحميل Word'}</button>
      </div>
      <div className="exp-or">أو أرسلها إلى بريدك</div>
      <div className="exp-mail">
        <input type="email" name="recipient" autoComplete="email" dir="ltr" placeholder="recipient@email.com" value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" className="btn exp-send" onClick={send} disabled={!!busy}>{busy === 'mail' ? <Spin /> : <MailIco />}{busy === 'mail' ? 'جارٍ الإرسال…' : 'إرسال'}</button>
      </div>
      {msg && <p className={msg.ok ? 'ok' : 'err'}>{msg.t}</p>}
      {notice && <Notice text={SHARE_TEXT} onClose={() => setNotice(false)} />}
      {sentTo && createPortal(<Success email={sentTo} onClose={() => setSentTo('')} />, document.body)}
    </div>
  )
}
