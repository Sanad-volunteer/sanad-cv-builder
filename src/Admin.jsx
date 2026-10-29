import { useEffect, useMemo, useState } from 'react'
import { EDU_LEVELS } from './Preview.jsx'
import { makeXlsx, makeZip } from './files.js'
import { Select } from './Select.jsx'

// Back office: #admin at the end of the site address. Not linked from anywhere; the password is checked by the server.
const LEVEL = Object.fromEntries(EDU_LEVELS)
const KEY = 'sanad-admin-pw'
const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' }) }
const safeName = (s) => String(s || 'cv').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'cv'
const stamp = () => new Date().toISOString().slice(0, 10)
const when = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
function saveBlob(blob, name) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

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
  const [sel, setSel] = useState(() => new Set()) // ids ticked in the table
  const [prog, setProg] = useState('') // progress text while a bulk action runs

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
      saveBlob(blob, `${safeName(row.name)}-cv.${fmt}`)
    } catch { setErr('تعذّر تنزيل الملف') }
    setBusy('')
  }
  const remove = async (row) => {
    if (!window.confirm(`حذف سيرة ${row.name || row.email} نهائياً؟`)) return
    try { await call(pw, `action=delete&id=${row.id}`, { method: 'POST' }); setRows((r) => r.filter((x) => x.id !== row.id)); setSel((s) => { const n = new Set(s); n.delete(row.id); return n }) } catch { setErr('تعذّر الحذف') }
  }

  const cities = useMemo(() => [...new Set((rows || []).map((r) => (r.city || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar')), [rows])
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase()
    return (rows || []).filter((r) =>
      (!city || (r.city || '').trim() === city) && (!level || r.level === level) &&
      (!n || [r.name, r.email, r.phone, r.city, r.university, r.major, r.title].some((v) => String(v || '').toLowerCase().includes(n))))
  }, [rows, q, city, level])

  const picked = useMemo(() => (rows || []).filter((r) => sel.has(r.id)), [rows, sel])
  const allShown = shown.length > 0 && shown.every((r) => sel.has(r.id))
  const someShown = shown.some((r) => sel.has(r.id))
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSel((s) => { const n = new Set(s); allShown ? shown.forEach((r) => n.delete(r.id)) : shown.forEach((r) => n.add(r.id)); return n })

  // Excel: the ticked rows when there are any, otherwise everything the filters show.
  const exportXlsx = () => {
    const list = picked.length ? picked : shown
    const head = ['الاسم', 'المسمى', 'البريد', 'الهاتف', 'المدينة', 'السكن', 'المرحلة', 'الجامعة/المؤسسة', 'التخصص', 'لغة السيرة', 'أول حفظ', 'آخر تحديث']
    const body = list.map((r) => [r.name, r.title, r.email, r.phone, r.city, r.residence, LEVEL[r.level] || '', r.university, r.major, r.lang === 'en' ? 'EN' : 'AR', when(r.created_at), when(r.updated_at)])
    saveBlob(makeXlsx(head, body, 'السير الذاتية'), `sanad-cvs-${stamp()}.xlsx`)
  }
  // Files are fetched one by one (each is its own server call), then packed into one ZIP.
  const bulkDownload = async (fmt) => {
    const files = [], used = new Set()
    let failed = 0
    for (let i = 0; i < picked.length; i++) {
      setProg(`جارٍ التجهيز ${i + 1} / ${picked.length}`)
      try {
        const data = new Uint8Array(await (await call(pw, `action=file&id=${picked[i].id}&fmt=${fmt}`)).arrayBuffer())
        let name = `${safeName(picked[i].name)}-cv`
        for (let n = 2; used.has(name); n++) name = `${safeName(picked[i].name)}-cv (${n})`
        used.add(name)
        files.push({ name: `${name}.${fmt}`, data })
      } catch { failed++ }
    }
    setProg('')
    if (files.length) saveBlob(makeZip(files), `sanad-cvs-${fmt}-${stamp()}.zip`)
    setErr(failed ? `تعذّر تجهيز ${failed} من ${picked.length} ملفاً` : '')
  }
  const bulkRemove = async () => {
    if (!window.confirm(`حذف ${picked.length} سيرة ذاتية نهائياً؟ لا يمكن التراجع.`)) return
    const ids = picked.map((r) => r.id)
    try {
      for (let i = 0; i < ids.length; i += 50) {
        setProg(`جارٍ الحذف ${Math.min(i + 50, ids.length)} / ${ids.length}`)
        await call(pw, `action=delete&ids=${ids.slice(i, i + 50).join(',')}`, { method: 'POST' })
      }
      setRows((r) => r.filter((x) => !ids.includes(x.id)))
      setSel(new Set())
      setErr('')
    } catch { setErr('تعذّر حذف بعض السجلات، حدّث الصفحة وتحقق') }
    setProg('')
  }

  if (!rows) {
    return (
      <main className="adm">
        <form className="card adm-login" onSubmit={(e) => { e.preventDefault(); input && load(input) }}>
          <h2>لوحة التحكم</h2>
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
      <div className="adm-top">
        <div className="adm-row">
          <div className="adm-id">
            <button type="button" className="adm-exit" onClick={() => { try { sessionStorage.removeItem(KEY) } catch { /* ignore */ } setRows(null); setPw(''); setInput('') }}>خروج</button>
            <div className="adm-count" aria-live="polite">
              <b>{shown.length}</b>
              {shown.length !== rows.length && <span>/ {rows.length}</span>}
              <small>ملف</small>
            </div>
          </div>
          <div className="adm-actions">
            <button type="button" className="btn" onClick={() => load(pw)}>تحديث</button>
            <button type="button" className="btn p" onClick={exportXlsx} disabled={!shown.length}>{picked.length ? `تصدير Excel (${picked.length})` : 'تصدير Excel'}</button>
          </div>
        </div>
        <div className="adm-filters">
          <input type="search" placeholder="بحث بالاسم أو البريد أو الهاتف…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select label="المدينة" value={city} onChange={setCity} placeholder="كل المدن" clear="كل المدن" options={cities.map((c) => [c, c])} />
          <Select label="المرحلة" value={level} onChange={setLevel} placeholder="كل المراحل" clear="كل المراحل" options={EDU_LEVELS} />
        </div>
      </div>
      
      {err && <p className="adm-err">{err}</p>}
      {picked.length > 0 && (
        <div className="adm-sel">
          <b>{prog || `تم تحديد ${picked.length}`}</b>
          <button type="button" onClick={() => bulkDownload('pdf')} disabled={!!prog}>تنزيل PDF (ZIP)</button>
          <button type="button" onClick={() => bulkDownload('docx')} disabled={!!prog}>تنزيل Word (ZIP)</button>
          <button type="button" onClick={exportXlsx} disabled={!!prog}>تصدير Excel</button>
          <button type="button" className="del" onClick={bulkRemove} disabled={!!prog}>حذف المحدد</button>
        </div>
      )}
      <div className="adm-wrap">
        <table className="adm-t">
          <thead><tr><th className="adm-ck"><label className="adm-box"><input type="checkbox" aria-label="تحديد الكل" checked={allShown} ref={(el) => { if (el) el.indeterminate = someShown && !allShown }} onChange={toggleAll} disabled={!shown.length} /></label></th><th>الاسم</th><th>البريد</th><th>الهاتف</th><th>المدينة</th><th>التعليم</th><th>آخر تحديث</th><th></th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className={sel.has(r.id) ? 'on' : ''}>
                <td className="adm-ck"><label className="adm-box"><input type="checkbox" aria-label="تحديد" checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></label></td>
                <td><b>{r.name}</b><small>{r.title}</small></td>
                <td dir="ltr">{r.email}</td>
                <td dir="ltr">{r.phone}</td>
                <td>{r.city}</td>
                <td>{[LEVEL[r.level], r.university, r.major].filter(Boolean).join(' · ')}</td>
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
