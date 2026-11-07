import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Wording of the two questions (edit here).
export const KEEP_ASK = 'هل تسمح لمؤسسة سند الشباب بالاحتفاظ بنسخة من سيرتك الذاتية وبياناتك الواردة فيها؟ سيصلك ملفك في الحالتين.'
export const AI_ASK = 'هل تسمح بإرسال سيرتك الذاتية إلى خدمة ذكاء اصطناعي خارجية لتحليلها، وبأن تحتفظ مؤسسة سند الشباب بنسخة منها وبالبيانات الواردة فيها؟ إن اخترت «لا» فسيجري تحليلها داخل متصفحك فقط دون إرسالها أو حفظها.'

export const InfoIcon = () => (
  <span className="info-ic" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 11v6" /><circle cx="12" cy="7" r="1.3" fill="currentColor" stroke="none" /></svg>
  </span>
)

// A question with two answers (yes / no). Closing it (Esc, click outside or "إلغاء") answers nothing: the action is not carried out.
export default function Consent({ text, yes, no, onChoose, onCancel }) {
  const btn = useRef(null)
  useEffect(() => {
    btn.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return createPortal(
    <div className="modal-bg no-print" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="cs-title" onClick={(e) => e.stopPropagation()}>
        <InfoIcon />
        <h3 id="cs-title">خيارك</h3>
        <p>{text}</p>
        <button ref={btn} type="button" className="btn p" onClick={() => onChoose(true)}>{yes}</button>
        <button type="button" className="btn out" onClick={() => onChoose(false)}>{no}</button>
        <button type="button" className="link" onClick={onCancel}>إلغاء</button>
      </div>
    </div>,
    document.body,
  )
}
