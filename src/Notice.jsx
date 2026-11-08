import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Wording of the two questions (edit here).
export const KEEP_ASK ='هل توافق أن تحتفظ «سند» بملف سيرتك الذاتية؟'
export const AI_ASK = 'هل توافق أن تحتفظ «سند» بملف سيرتك الذاتية؟'

// Smooth closing for pop-ups: leave(fn) plays the fade-out (class "out") and calls fn when it ends. A second call while closing is ignored.
export function useLeave(ms = 220) {
  const [closing, setClosing] = useState(false)
  const leave = (fn) => {
    if (closing) return
    setClosing(true)
    const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setTimeout(() => fn && fn(), still ? 0 : ms)
  }
  return [closing, leave]
}

export const InfoIcon = () => (
  <span className="info-ic" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 11v6" /><circle cx="12" cy="7" r="1.3" fill="currentColor" stroke="none" /></svg>
  </span>
)

// A question with two answers (yes / no). Closing it (Esc, click outside or "إلغاء") answers nothing: the action is not carried out.
export default function Consent({ text, yes, no, onChoose, onCancel }) {
  const btn = useRef(null)
  const [closing, leave] = useLeave()
  const cancel = () => leave(onCancel)
  useEffect(() => {
    btn.current?.focus()
    const onKey = (e) => e.key === 'Escape' && cancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return createPortal(
    <div className={`modal-bg no-print${closing ? ' out' : ''}`} onClick={cancel}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="cs-title" onClick={(e) => e.stopPropagation()}>
        <InfoIcon />
        <h3 id="cs-title">خيارك</h3>
        <p>{text}</p>
        <button ref={btn} type="button" className="btn p" onClick={() => leave(() => onChoose(true))}>{yes}</button>
        <button type="button" className="btn out" onClick={() => leave(() => onChoose(false))}>{no}</button>
        <button type="button" className="link" onClick={cancel}>إلغاء</button>
      </div>
    </div>,
    document.body,
  )
}
