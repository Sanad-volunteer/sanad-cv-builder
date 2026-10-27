import { useEffect, useRef, useState } from 'react'
import mammoth from 'mammoth/mammoth.browser'
import { post } from './api.js'
import Notice, { AI_TEXT } from './Notice.jsx'

// the back-office user (logged in at #admin in this tab) also sees which engine produced the result
const isAdmin = () => { try { return !!sessionStorage.getItem('sanad-admin-pw') } catch { return false } }

const MAX = 3 * 1024 * 1024 // keeps the request under Vercel's 4.5 MB body limit
const toB64 = (f) => new Promise((ok, no) => {
  const r = new FileReader()
  r.onload = () => ok(String(r.result).split(',')[1])
  r.onerror = no
  r.readAsDataURL(f)
})

const CHECK_TITLE = {
  contact: 'معلومات التواصل (Contact Information)', summary: 'النبذة المهنية (Summary)', sections: 'الأقسام (Sections)', title_match: 'مطابقة المسمى الوظيفي (Job Title Match)',
  dates: 'تنسيق التواريخ (Date Formatting)', metrics: 'النتائج القابلة للقياس (Measurable Results)', bullets: 'صياغة الإنجازات (Bullet Points)', skills: 'المهارات (Skills)',
  length: 'طول السيرة (Length)', gaps: 'الفجوات الزمنية (Employment Gaps)', linkedin: 'رابط لينكدإن (LinkedIn)', font: 'نوع الخط (Font)', file: 'نوع الملف واسمه (File)',
}
const ringColor = (n) => (n < 40 ? '#E5484D' : n < 60 ? '#FFC500' : 'var(--teal)') // red / yellow / teal by score
function Result({ r, go }) {
  const [onlyBad, setOnlyBad] = useState(false)
  const bad = r.checks.filter((c) => c.ok === false).length
  const list = onlyBad ? r.checks.filter((c) => c.ok === false) : r.checks
  return (
    <div className="card res" role="region" aria-label="نتيجة المراجعة" tabIndex={-1}>
      <div className="score">
        <div className="ring" style={{ '--pct': `${r.score}%`, '--rc': ringColor(r.score) }}><span>{r.score}</span></div>
        <div><b>{r.verdict}</b><p className="mut">{r.summary}</p></div>
      </div>
      {r.missingKeywords.length > 0 && (
        <>
          <h5>كلمات مفتاحية ناقصة (أضفها إن كانت صحيحة)</h5>
          <div className="chips">{r.missingKeywords.map((k) => <span className="chip miss" key={k}>{k}</span>)}</div>
        </>
      )}
      {r.checks.length > 0 && (
        <>
          <div className="chk-h">
            <h5>فحص السيرة بحسب معايير ATS</h5>
            {bad > 0 && (
              <div className="seg" role="group" aria-label="تصفية الفحوص">
                <button type="button" className={onlyBad ? '' : 'on'} aria-pressed={!onlyBad} onClick={() => setOnlyBad(false)}>الكل ({r.checks.length})</button>
                <button type="button" className={onlyBad ? 'on' : ''} aria-pressed={onlyBad} onClick={() => setOnlyBad(true)}>يحتاج تعديل ({bad})</button>
              </div>
            )}
          </div>
          {list.map((c) => (
            <div className={`chk ${c.ok === true ? 'ok' : c.ok === false ? 'no' : 'na'}`} key={c.id}>
              <span className="ic" aria-label={c.ok === true ? 'مناسب' : c.ok === false ? 'يحتاج تعديل' : 'غير محدد'}>{c.ok === true ? '✓' : c.ok === false ? '✗' : '–'}</span>
              <div><b>{CHECK_TITLE[c.id] || c.id}</b><p>{c.text}</p></div>
            </div>
          ))}
        </>
      )}
      <button type="button" className="btn p" onClick={() => go('create')}>✎ حسّنها في منشئ السيرة الذاتية</button>
    </div>
  )
}

export default function Analyze({ go, seed }) { // seed: the CV just built in the builder ({ file, title })
  const [file, setFile] = useState(seed ? seed.file : null)
  const [job, setJob] = useState({ title: seed ? seed.title : '', desc: '' })
  const [st, setSt] = useState({ busy: false, err: '', res: null })
  const [notice, setNotice] = useState(false) // information pop-up shown after an analysis
  const setJ = (k) => (e) => setJob((j) => ({ ...j, [k]: e.target.value }))
  const fail = (err) => setSt((s) => ({ ...s, err }))

  const pick = (e) => {
    const f = e.target.files[0]
    e.target.value = '' // lets the same file (or a new one) be chosen again after an analysis
    take(f)
  }
  const [over, setOver] = useState(false) // a file is being dragged over the drop zone
  const drop = (e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files && e.dataTransfer.files[0]) }
  const take = async (f) => {
    if (!f) return
    setSt({ busy: false, err: '', res: null }) // a new file starts a fresh analysis: the old result is cleared
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['pdf', 'docx'].includes(ext)) return fail('الصيغ المدعومة: PDF أو DOCX')
    if (f.size > MAX) return fail('الحد الأقصى لحجم الملف 3 ميغابايت')
    try {
      const data = ext === 'pdf' ? await toB64(f) : (await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })).value
      if (!data.trim()) throw new Error('empty')
      setFile({ name: f.name, type: ext === 'pdf' ? 'pdf' : 'text', data, ext })
      fail('')
    } catch { setFile(null); fail('تعذّرت قراءة الملف') }
  }
  const run = async () => {
    setSt({ busy: true, err: '', res: null })
    try {
      const r = await post('/api/analyze', { file: { type: file.type, data: file.data, name: file.name }, source: file.builder ? 'builder' : file.ext, job })
      setSt({ busy: false, err: '', res: { ...(await r.json()), source: 'ai' } })
      setNotice(true)
    } catch (e) {
      // The AI is busy or unavailable: quietly review the CV in the browser instead (no message to the user).
      try {
        const { localAnalyze } = await import('./localAnalyze.js')
        setSt({ busy: false, err: '', res: { ...(await localAnalyze(file, job)), source: 'local' } })
      } catch (e2) {
        // the browser review could not read the file either: say why when we know it
        setSt({ busy: false, err: e2 && e2.message === 'no_text' ? 'لا يحتوي الملف على نص قابل للقراءة (يبدو صورة أو ملفاً ممسوحاً ضوئياً). صدّر سيرتك من Word أو منشئ السيرة كملف PDF نصي ثم أعد المحاولة.' : e.status === 429 ? 'تجاوزت عدد المحاولات المسموح، حاول بعد قليل' : e.body && e.body.status === 503 ? 'الذكاء الاصطناعي مزدحم حالياً، حاول بعد دقيقة' : `تعذّر تحليل السيرة، حاول مرة أخرى${e.body && e.body.reason ? ` (${e.body.status || ''} ${e.body.reason})` : ''}`, res: null })
      }
    }
  }
  const asideRef = useRef(null)
  useEffect(() => {
    if (st.res && window.matchMedia('(max-width:900px)').matches) asideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [st.res])
  const ready = file && !st.busy // job title and description are both optional

  return (
    <main className="layout analyze-layout">
      <div className="analyze-toolbar no-print">
        <button type="button" className="back analyze-back" onClick={() => go('home')}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5.5 9.5V21h13V9.5M9.5 21v-6h5v6" />
          </svg>
          <span>الصفحة الرئيسية</span>
        </button>
      </div>
      <section>
        <div className="card">
          <h2><span className="n">1</span>ارفع سيرتك الذاتية</h2>
          <label className={`drop${over ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={drop}>
            <input type="file" accept=".pdf,.docx" onChange={pick} />
            <span className="big">⬆</span>
            <b>اضغط لاختيار الملف</b>
            <span className="note">PDF أو DOCX · الحد الأقصى 3 ميغابايت · أو اسحب الملف وأفلته هنا</span>
          </label>
          {file && (
            <div className="fl">
              <span>{file.name}</span>
              <button type="button" className="fl-x" aria-label="إزالة الملف" onClick={() => { setFile(null); setSt({ busy: false, err: '', res: null }) }}>
                <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
              </button>
            </div>
          )}
        </div>
        <div className="card ai">
          <h2><span className="n">2</span>الوظيفة المستهدفة<span className="opt-tag">اختياري</span></h2>
          <div className="g">
            <div className="full"><label>المسمى الوظيفي</label><input dir={job.title ? 'auto' : 'rtl'} value={job.title} onChange={setJ('title')} /></div>
            <div className="full"><label>وصف الوظيفة</label><textarea dir={job.desc ? 'auto' : 'rtl'} placeholder="الصق وصف الوظيفة هنا…" value={job.desc} onChange={setJ('desc')} /></div>
          </div>
          {st.err && <p className="err">{st.err}</p>}
          <p className="note start">❗ ملاحظة: الاقتراحات لا تضيف خبرات أو مهارات غير موجودة.</p>
        </div>
      </section>
      <aside className="side" ref={asideRef} aria-live="polite">
        <div className="ph"><h2>نتيجة المراجعة</h2>
          {st.res && st.res.source === 'ai' && <span className="badge">✦ ذكاء اصطناعي</span>}
          {st.res && st.res.source !== 'ai' && isAdmin() && <span className="badge local">⚙ تحليل المتصفح (للأدمن فقط)</span>}
        </div>
        {st.res ? <Result r={st.res} go={go} /> : (
          <div className="card empty"><div className="big">✦</div><p>ارفع سيرتك وأضف الوظيفة المستهدفة ثم اضغط «حلّل» لترى نسبة المطابقة والاقتراحات.</p></div>
        )}
        <button type="button" className="btn s" style={{ marginTop: 14 }} disabled={!ready} onClick={run}>{st.busy ? <><span className="spin" aria-hidden="true" /> جارٍ التحليل…</> : '✦ حلّل سيرتي الذاتية'}</button>
      </aside>
      {notice && <Notice text={AI_TEXT} onClose={() => setNotice(false)} />}
    </main>
  )
}
