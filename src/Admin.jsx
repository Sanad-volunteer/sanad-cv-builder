import { useEffect, useMemo, useState } from 'react'
import { EDU_LEVELS } from './Preview.jsx'

// Back office: #admin at the end of the site address. Not linked from anywhere; the password is checked by the server.
const LEVEL = Object.fromEntries(EDU_LEVELS)
const ACTION = { pdf: 'PDF', docx: 'Word', email: 'بريد' }
const KEY = 'sanad-admin-pw'
const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' }) }
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

async function call(pw, qs, opts = {}) {
  const r = await fetch(`/api/admin?${qs}`, { ...opts, headers: { Authorization: `Bearer ${pw}` } })
  if (!r.ok) { const e = new Error(`http_${r.status}`); e.status = r.status; throw e }
  return r
}

export default function Admin() {
  const [pw, setPw] = useState(() => { try { return sessionStorage.getItem(KEY) || '' } catch { return '' } })
  const [input, setInput] = useState('')
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [level, setLevel] = useState('')

  const load = async (password) => {
    setErr('')
    try {
      const r = await call(password, 'action=list')
      setRows((await r.json()).rows)
      setPw(password)
      try { sessionStorage.setItem(KEY, password) } catch { /* private mode */ }
    } catch (e) {
      setRows(null); setPw('')
      try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
      setErr(e.status === 401 ? 'كلمة المرور غير صحيحة' : e.status === 429 ? 'محاولات كثيرة، حاول لاحقاً' : e.status === 500 ? 'اللوحة غير مضبوطة بعد (راجع متغيرات Vercel)' : 'تعذّر الاتصال')
    }
  }
  useEffect(() => { if (pw) load(pw) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const download = async (row, fmt) => {
    setBusy(row.id + fmt)
    try {
      const blob = await (await call(pw, `action=file&id=${row.id}&fmt=${fmt}`)).blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${(row.name || 'cv').replace(/[\\/:*?"<>|]+/g, ' ').trim()}-cv.${fmt}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    } catch { setErr('تعذّر تنزيل الملف') }
    setBusy('')
  }
  const remove = async (row) => {
    if (!window.confirm(`حذف سيرة ${row.name || row.email} نهائياً؟`)) return
    try { await call(pw, `action=delete&id=${row.id}`, { method: 'POST' }); setRows((r) => r.filter((x) => x.id !== row.id)) } catch { setErr('تعذّر الحذف') }
  }

  const cities = useMemo(() => [...new Set((rows || []).map((r) => (r.city || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar')), [rows])
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase()
    return (rows || []).filter((r) =>
      (!city || (r.city || '').trim() === city) && (!level || r.level === level) &&
      (!n || [r.name, r.email, r.phone, r.city, r.school, r.major, r.title].some((v) => String(v || '').toLowerCase().includes(n))))
  }, [rows, q, city, level])

  const exportCsv = () => {
    const head = ['الاسم', 'المسمى', 'البريد', 'الهاتف', 'المدينة', 'السكن', 'المرحلة', 'الجامعة/المؤسسة', 'التخصص', 'لغة السيرة', 'آخر إجراء', 'أول حفظ', 'آخر تحديث']
    const lines = shown.map((r) => [r.name, r.title, r.email, r.phone, r.city, r.residence, LEVEL[r.level] || '', r.school, r.major, r.lang === 'en' ? 'EN' : 'AR', ACTION[r.last_action] || '', r.created_at, r.updated_at].map(csvCell).join(','))
    const blob = new Blob(['﻿' + [head.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'sanad-cvs.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }

  if (!rows) {
    return (
      <main className="adm">
        <form className="card adm-login" onSubmit={(e) => { e.preventDefault(); input && load(input) }}>
          <h2>لوحة السير الذاتية</h2>
          <label htmlFor="admpw">كلمة المرور</label>
          <input id="admpw" type="password" autoComplete="current-password" value={input} onChange={(e) => setInput(e.target.value)} />
          {err && <p className="adm-err">{err}</p>}
          <button type="submit" className="btn p" disabled={!input}>دخول</button>
        </form>
      </main>
    )
  }
  return (
    <main className="adm">
      <div className="adm-bar">
        <h2>السير الذاتية المحفوظة <span className="adm-n">{shown.length}{shown.length !== rows.length ? ` / ${rows.length}` : ''}</span></h2>
        <div className="adm-tools">
          <input type="search" placeholder="بحث بالاسم أو البريد أو الهاتف…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={city} onChange={(e) => setCity(e.target.value)}><option value="">كل المدن</option>{cities.map((c) => <option key={c}>{c}</option>)}</select>
          <select value={level} onChange={(e) => setLevel(e.target.value)}><option value="">كل المراحل</option>{EDU_LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <button type="button" className="btn" onClick={exportCsv} disabled={!shown.length}>تصدير CSV</button>
          <button type="button" className="btn" onClick={() => load(pw)}>تحديث</button>
          <button type="button" className="btn" onClick={() => { try { sessionStorage.removeItem(KEY) } catch { /* ignore */ } setRows(null); setPw(''); setInput('') }}>خروج</button>
        </div>
      </div>
      {err && <p className="adm-err">{err}</p>}
      <div className="adm-wrap">
        <table className="adm-t">
          <thead><tr><th>الاسم</th><th>البريد</th><th>الهاتف</th><th>المدينة</th><th>التعليم</th><th>آخر إجراء</th><th>آخر تحديث</th><th></th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td><b>{r.name}</b><small>{r.title}</small></td>
                <td dir="ltr">{r.email}</td>
                <td dir="ltr">{r.phone}</td>
                <td>{r.city}</td>
                <td>{[LEVEL[r.level], r.school, r.major].filter(Boolean).join(' · ')}</td>
                <td>{ACTION[r.last_action] || ''}</td>
                <td>{fmtDate(r.updated_at)}</td>
                <td className="adm-act">
                  <button type="button" onClick={() => download(r, 'pdf')} disabled={busy === r.id + 'pdf'}>{busy === r.id + 'pdf' ? '…' : 'PDF'}</button>
                  <button type="button" onClick={() => download(r, 'docx')} disabled={busy === r.id + 'docx'}>{busy === r.id + 'docx' ? '…' : 'Word'}</button>
                  <button type="button" className="del" onClick={() => remove(r)}>حذف</button>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan="8" className="adm-empty">{rows.length ? 'لا نتائج مطابقة' : 'لم تُحفظ أي سيرة بعد'}</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  )
}
