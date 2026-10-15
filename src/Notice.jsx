import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Wording of the information notices (edit here).
export const SHARE_TEXT = 'نُحيطك علماً بأن مؤسسة سند الشباب تحتفظ بنسخة من سيرتك الذاتية وبياناتك الواردة فيها.'
export const AI_TEXT = 'نُحيطك علماً بأن ملف سيرتك أُرسل إلى خدمة ذكاء اصطناعي من Google ليجري تحليله.'

export const InfoIcon = () => (
  <span className="info-ic" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 11v6" /><circle cx="12" cy="7" r="1.3" fill="currentColor" stroke="none" /></svg>
  </span>
)

// Big green tick for the pop-up (the small "i" above stays for the note inside the e-mail success dialog).
const CheckIcon = () => (
  <span className="info-ic ok-ic" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 12.5l4.2 4.2L18.5 7.5" pathLength="1" /></svg>
  </span>
)

// A friendly pop-up that only informs (nothing to choose): closes with the button, Esc or a click outside.
export default function Notice({ text, onClose }) {
  const btn = useRef(null)
  useEffect(() => {
    btn.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return createPortal(
    <div className="modal-bg no-print" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="nt-title" onClick={(e) => e.stopPropagation()}>
        <CheckIcon />
        <h3 id="nt-title">إشعار</h3>
        <p>{text}</p>
        <button ref={btn} type="button" className="btn p" onClick={onClose}>حسناً</button>
      </div>
    </div>,
    document.body,
  )
}
