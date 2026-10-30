import { describe, it, expect } from 'vitest'
import { analyzeText } from '../src/localAnalyze.js'

const GOOD_EN = `John Smith
Software Engineer
john.smith@example.com | +962 79 123 4567 | Amman, Jordan | linkedin.com/in/johnsmith

Summary
Software engineer with 4 years of experience building web applications with React and Node.js.

Experience
Software Engineer - Acme Corp (2021 - 2025)
- Built a React dashboard used by 5,000 users, cutting report time by 40%
- Led a team of 3 developers and delivered 12 releases
- Improved API response time by 35%

Education
BSc Computer Science - University of Jordan (2017 - 2021)

Skills
React, Node.js, JavaScript, SQL, Git, Docker
`

const GOOD_AR = `محمد أحمد
مهندس برمجيات
mohammad@example.com | 0791234567 | عمّان، الأردن

نبذة
مهندس برمجيات لديه خبرة 4 سنوات في تطوير تطبيقات الويب باستخدام React.

الخبرات
مهندس برمجيات - شركة المثال (2021 - 2025)
- طورت لوحة تحكم يستخدمها 5000 مستخدم وقللت زمن التقارير بنسبة 40%
- قدت فريقاً من 3 مطورين

التعليم
بكالوريوس علوم الحاسوب - الجامعة الأردنية (2017 - 2021)

المهارات
React, JavaScript, SQL
`

const byId = (r, id) => r.checks.find((c) => c.id === id)

describe('analyzeText: result shape', () => {
  it('returns a score between 0 and 100 and the known fields', () => {
    const r = analyzeText(GOOD_EN, {}, { source: 'pdf' })
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
    expect(typeof r.verdict).toBe('string')
    expect(Array.isArray(r.missingKeywords)).toBe(true)
    expect(Array.isArray(r.checks)).toBe(true)
    for (const c of r.checks) {
      expect(typeof c.id).toBe('string')
      expect([true, false, null]).toContain(c.ok)
      expect(typeof c.text).toBe('string')
    }
  })

  it('never reports the same check twice', () => {
    const ids = analyzeText(GOOD_EN, {}, { source: 'pdf' }).checks.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('analyzeText: robustness', () => {
  it('does not crash on empty, null or undefined input', () => {
    expect(() => analyzeText('', {}, {})).not.toThrow()
    expect(() => analyzeText(null, null, null)).not.toThrow()
    expect(() => analyzeText(undefined)).not.toThrow()
  })

  it('stays fast on a huge single token (no quadratic regex)', () => {
    const t = Date.now()
    analyzeText('a'.repeat(60000), {}, {})
    expect(Date.now() - t).toBeLessThan(3000)
  })

  it('stays fast on a very long text', () => {
    const t = Date.now()
    analyzeText(GOOD_EN.repeat(300), { title: 'Software Engineer', desc: 'React Node.js SQL' }, {})
    expect(Date.now() - t).toBeLessThan(5000)
  })
})

describe('analyzeText: scoring', () => {
  it('scores a complete CV higher than a nearly empty one', () => {
    const good = analyzeText(GOOD_EN, {}, { source: 'pdf' }).score
    const bad = analyzeText('John\nI like work', {}, { source: 'pdf' }).score
    expect(good).toBeGreaterThan(bad)
  })

  it('accepts contact details written with an Arabic comma', () => {
    const r = analyzeText(GOOD_AR, {}, { source: 'pdf' })
    expect(byId(r, 'contact').ok).toBe(true)
  })

  it('detects a missing e-mail and phone', () => {
    const r = analyzeText('Name Only\nSoftware Engineer\nExperience\nWorked somewhere', {}, { source: 'pdf' })
    expect(byId(r, 'contact').ok).toBe(false)
  })
})

describe('analyzeText: job matching', () => {
  const job = { title: 'Frontend Developer', desc: 'We need React, TypeScript and GraphQL experience. Docker is a plus.' }

  it('lists job keywords that are missing from the CV', () => {
    const r = analyzeText(GOOD_EN, job, { source: 'pdf' })
    const missing = r.missingKeywords.join(' ').toLowerCase()
    expect(missing).toContain('typescript')
    expect(missing).toContain('graphql')
  })

  it('does not list a keyword the CV already has', () => {
    const r = analyzeText(GOOD_EN, job, { source: 'pdf' })
    expect(r.missingKeywords.join(' ').toLowerCase()).not.toContain('react')
  })

  it('returns no missing keywords when no job is given', () => {
    expect(analyzeText(GOOD_EN, {}, { source: 'pdf' }).missingKeywords).toEqual([])
  })
})
