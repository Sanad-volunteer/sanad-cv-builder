import { useState } from 'react'
import mammoth from 'mammoth/mammoth.browser'
import { post } from './api.js'

const MAX = 3 * 1024 * 1024 // keeps the request under Vercel's 4.5 MB body limit
const toB64 = (f) => new Promise((ok, no) => {
  const r = new FileReader()
  r.onload = () => ok(String(r.result).split(',')[1])
  r.onerror = no
  r.readAsDataURL(f)
})

function Result({ r, go }) {
  return (
    <div className="card res">
      <div className="score">
        <div className="ring" style={{ '--pct': `${r.score}%` }}><span>{r.score}</span></div>
        <div><b>{r.verdict}</b><p className="mut">{r.summary}</p></div>
      </div>
      {r.missingKeywords.length > 0 && (
        <>
          <h5>كلمات مفتاحية ناقصة (أضفها إن كانت صحيحة)</h5>
          <div className="chips">{r.missingKeywords.map((k) => <span className="chip miss" key={k}>{k}</span>)}</div>
        </>
      )}
      {r.suggestions.length > 0 && (
        <>
          <h5>اقتراحات</h5>
          {r.suggestions.map((s, i) => <div className="sg" key={i}><p>{s.text}</p></div>)}
        </>
      )}
      {r.ats.length > 0 && (
        <>
          <h5>فحص ATS</h5>
          {r.ats.map((a, i) => <p className="ck" key={i}>{a.ok ? '✓' : '⚠'} {a.text}</p>)}
        </>
      )}
      <button type="button" className="btn p" onClick={() => go('create')}>✎ حسّنها في منشئ السيرة الذاتية</button>
    </div>
  )
}

export default function Analyze({ go }) {
  const [file, setFile] = useState(null)
  const [job, setJob] = useState({ title: '', company: '', desc: '' })
  const [st, setSt] = useState({ busy: false, err: '', res: null })
  const setJ = (k) => (e) => setJob((j) => ({ ...j, [k]: e.target.value }))
  const fail = (err) => setSt((s) => ({ ...s, err }))

  const pick = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['pdf', 'docx'].includes(ext)) return fail('الصيغ المدعومة: PDF أو DOCX')
    if (f.size > MAX) return fail('الحد الأقصى لحجم الملف 3 ميغابايت')
    try {
      const data = ext === 'pdf' ? await toB64(f) : (await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })).value
      if (!data.trim()) throw new Error('empty')
      setFile({ name: f.name, type: ext === 'pdf' ? 'pdf' : 'text', data })
      fail('')
    } catch { setFile(null); fail('تعذّرت قراءة الملف') }
  }
  const run = async () => {
    setSt({ busy: true, err: '', res: null })
    try {
      const r = await post('/api/analyze', { file: { type: file.type, data: file.data }, job })
      setSt({ busy: false, err: '', res: await r.json() })
    } catch { setSt({ busy: false, err: 'تعذّر تحليل السيرة، حاول مرة أخرى', res: null }) }
  }
  const ready = file && (job.title.trim() || job.desc.trim()) && !st.busy

  return (
    <main className="layout">
      <button type="button" className="back" onClick={() => go('home')}>→ رجوع</button>
      <section>
        <div className="card">
          <h2><span className="n">1</span>ارفع سيرتك الذاتية</h2>
          <label className="drop">
            <input type="file" accept=".pdf,.docx" onChange={pick} />
            <span className="big">⬆</span>
            <b>اضغط لاختيار الملف</b>
            <span className="note">PDF أو DOCX · الحد الأقصى 3 ميغابايت</span>
          </label>
          {file && <div className="fl"><span>{file.name}</span><span>✓</span></div>}
        </div>
        <div className="card ai">
          <h2><span className="n">2</span>الوظيفة المستهدفة</h2>
          <div className="g">
            <div><label>المسمى الوظيفي</label><input dir="auto" value={job.title} onChange={setJ('title')} /></div>
            <div><label>الشركة (اختياري)</label><input dir="auto" value={job.company} onChange={setJ('company')} /></div>
            <div className="full"><label>وصف الوظيفة</label><textarea dir="auto" placeholder="الصق وصف الوظيفة هنا…" value={job.desc} onChange={setJ('desc')} /></div>
          </div>
          <button type="button" className="btn s" style={{ marginTop: 14 }} disabled={!ready} onClick={run}>{st.busy ? 'جارٍ التحليل…' : '✦ حلّل سيرتي الذاتية'}</button>
          {st.err && <p className="err">{st.err}</p>}
          <p className="note start">🔒 يُرسل محتوى السيرة إلى خدمة ذكاء اصطناعي للمراجعة فقط. الاقتراحات لا تضيف خبرات أو مهارات غير موجودة.</p>
        </div>
      </section>
      <aside className="side">
        <div className="ph"><h2>نتيجة المراجعة</h2><span className="badge">✦ ذكاء اصطناعي</span></div>
        {st.res ? <Result r={st.res} go={go} /> : (
          <div className="card empty"><div className="big">✦</div><p>ارفع سيرتك وأضف الوظيفة المستهدفة ثم اضغط «حلّل» لترى نسبة المطابقة والاقتراحات.</p></div>
        )}
      </aside>
    </main>
  )
}
