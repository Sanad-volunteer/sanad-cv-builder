import { useState } from 'react'

// Back office card: tests the AI service on demand (needs the admin password, same as the rest of the dashboard).
export default function AdminAi({ pw }) {
  const [st, setSt] = useState(null) // null | 'busy' | result | { fail }
  const run = async () => {
    setSt('busy')
    try {
      const r = await fetch('/api/ai-check', { headers: { Authorization: `Bearer ${pw}` } })
      setSt(r.ok ? await r.json() : { fail: r.status === 404 ? 'الخدمة تعمل على Vercel فقط' : `خطأ ${r.status}` })
    } catch { setSt({ fail: 'تعذّر الاتصال' }) }
  }
  const ok = st && st.ok
  return (
    <div className="adm-ai">
      <div className="adm-ai-h">
        <b>حالة الذكاء الاصطناعي</b>
        <button type="button" className="btn" onClick={run} disabled={st === 'busy'}>{st === 'busy' ? 'جارٍ الفحص…' : 'فحص الآن'}</button>
      </div>
      {st && st !== 'busy' && (
        st.fail ? <p className="adm-ai-r no">✗ {st.fail}</p> : (
          <p className={`adm-ai-r ${ok ? 'ok' : 'no'}`}>
            {ok ? `✓ يعمل (${st.ms} ملّي ثانية)` : `✗ لا يعمل: ${st.reason}`}
            <span> · النموذج: <bdi dir="ltr">{st.model}</bdi>{st.fallback ? <> · احتياطي: <bdi dir="ltr">{st.fallback}</bdi></> : null}</span>
          </p>
        )
      )}
      <p className="adm-ai-n">إن كان لا يعمل فالمستخدمون يحصلون تلقائياً على تحليل المتصفح، ولا تظهر لهم شارة «ذكاء اصطناعي».</p>
    </div>
  )
}
