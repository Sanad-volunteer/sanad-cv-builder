import { useEffect, useRef, useState } from 'react'

export const OTHER = '__other__'

// Drop-down that always opens downwards (a native <select> opens upwards whenever the browser sees more room above).
function MenuItem({ children, onClick, last, on }) {
  return <button type="button" role="option" aria-selected={!!on} className={['mi', on && 'on', last && 'last'].filter(Boolean).join(' ')} onClick={onClick}>{children}</button>
}
// groups: [{ label?, items: [{ value, label }] }]. text: what the button shows (empty = placeholder).
export function DropMenu({ placeholder, text, groups, onChoose, other, dir = 'rtl', disabled, value, label }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const pop = useRef(null)
  useEffect(() => {
    if (!open) return
    pop.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc) }
  }, [open])
  const choose = (v) => { setOpen(false); onChoose(v) }
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  return (
    <div className="dp" ref={box}>
      <button type="button" className="dp-btn" aria-label={label} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined} onClick={() => setOpen(!open)}>
        <span className={text ? '' : 'dp-ph'}>{text || placeholder}</span>
        <svg className="dp-arrow" viewBox="0 0 12 8" width="12" height="8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" {...stroke} /></svg>
      </button>
      {open && (
        <div className="dp-pop dp-list" ref={pop} role="listbox" dir={dir}>
          {groups.map((g, i) => (
            <div key={i}>
              {g.label && <div className="mi-group">{g.label}</div>}
              {g.items.map((o) => <MenuItem key={o.value} on={!!value && o.value === value} onClick={() => choose(o.value)}>{o.label}</MenuItem>)}
            </div>
          ))}
          {other && <MenuItem last onClick={() => choose(OTHER)}>{other}</MenuItem>}
        </div>
      )}
    </div>
  )
}

// Same look as the skills menu, used everywhere instead of the browser's <select>.
// options: [[value, label], ...]. clear: label of an extra "no value" item (optional fields / "all" filters).
export function Select({ value, onChange, options, placeholder = 'اختر', clear, disabled, label, dir }) {
  const cur = options.find(([v]) => v === value)
  const items = [...(clear ? [{ value: '', label: clear }] : []), ...options.map(([v, l]) => ({ value: v, label: l }))]
  return <DropMenu placeholder={placeholder} text={cur ? cur[1] : ''} groups={[{ items }]} onChoose={onChange} disabled={disabled} value={value || ''} label={label} dir={dir} />
}
