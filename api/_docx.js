// Word (.docx) version of the CV. Mirrors api/_cv.js: same sections, same order, same wording.
import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, HeadingLevel, ImageRun, LevelFormat, LineRuleType,
  Packer, Paragraph, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from 'docx'
import { skillText } from './_lists.js'
import { tplOf } from './_tpl.js'
import { T, EL, DETAILS, CONTACT, dobText, langParts, langName, range, fmt, list, href } from './_cv.js'

const FONT = 'Arial' // Cairo is not installed on most computers; Arial exists everywhere and has Arabic glyphs
const SERIF = 'Palatino Linotype' // the executive template's serif (Lora in the PDF); Word has Palatino on every Windows/Mac install
const MARGIN = 794 // 14 mm, same as the PDF
const TEXT_W = 11906 - 2 * MARGIN // A4 width minus both margins, in twips
const PHOTO_CELL = 1800
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE }
const CELL_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE }
const NO_MARGINS = { top: 0, bottom: 0, left: 0, right: 0 }

// Only a small inline JPEG/PNG data URL is accepted as the photo (Word cannot embed WebP).
const photoOf = (s) => {
  if (typeof s !== 'string' || s.length > 400000) return null
  const m = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(s)
  return m ? { type: m[1] === 'png' ? 'png' : 'jpg', data: Buffer.from(m[2], 'base64') } : null
}

export async function makeDocx(cv) {
  const l = cv.lang === 'en' ? 'en' : 'ar'
  const rtl = l === 'ar'
  const t = T[l]
  const d = DETAILS[l]
  const p = cv.p || {}
  const sep = rtl ? '، ' : ', '
  const exec = tplOf(cv) === 'exec'
  const RULE = { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 4 }

  // ---- small helpers ----
  const run = (text, { bold, italics, size, ltr, font } = {}) =>
    new TextRun({ text: String(text ?? ''), bold, italics, size, font, rightToLeft: rtl && !ltr ? true : undefined })
  const para = (children, o = {}) => new Paragraph({ children, bidirectional: rtl ? true : undefined, alignment: exec ? AlignmentType.JUSTIFIED : undefined, ...o })
  const labelled = (label, value, o) => para([run(`${label}: `, { bold: true }), ...(Array.isArray(value) ? value : [run(value)])], o)
  const spacer = () => new Paragraph({ children: [], spacing: { before: 0, after: 0, line: 100, lineRule: LineRuleType.EXACT } })
  const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, bidirectional: rtl ? true : undefined, alignment: exec ? AlignmentType.CENTER : undefined, keepNext: true, children: [run(text)] })

  // title on one side, dates on the other (a borderless 2-column table keeps this reliable in RTL and LTR)
  const LW = TEXT_W - 4300
  const RW = 4300
  const row = (left, right, bottom) => new Table({
    width: { size: TEXT_W, type: WidthType.DXA },
    columnWidths: [LW, RW],
    borders: NO_BORDERS,
    visuallyRightToLeft: rtl ? true : undefined,
    rows: [new TableRow({
      cantSplit: true,
      children: [
        new TableCell({ width: { size: LW, type: WidthType.DXA }, borders: CELL_BORDERS, margins: NO_MARGINS, children: typeof left === 'string' ? [para([run(left, { bold: true })], { keepNext: true })] : left }),
        new TableCell({ width: { size: RW, type: WidthType.DXA }, borders: CELL_BORDERS, margins: NO_MARGINS, verticalAlign: bottom ? VerticalAlign.BOTTOM : undefined, children: [para(right ? [run(right)] : [], { alignment: AlignmentType.END, keepNext: true })] }),
      ],
    })],
  })
  // job: company in bold, job title in italics (classic: on a second line, dates level with it; executive: "Company • Title" on one line)
  const jobRow = (i) => {
    if (!i.company) return row(i.title, range(i.start, i.end, l))
    if (!i.title) return row(i.company, range(i.start, i.end, l))
    if (exec) return row([para([run(i.company, { bold: true }), run('  •  '), run(i.title, { italics: !rtl })], { keepNext: true })], range(i.start, i.end, l))
    return row([para([run(i.company, { bold: true })], { keepNext: true }), para([run(i.title, { italics: !rtl })], { keepNext: true })], range(i.start, i.end, l), true)
  }
  const bullets = (text) =>
    String(text || '').split('\n').map((s) => s.trim()).filter(Boolean)
      .map((s) => para([run(s)], { numbering: { reference: exec ? 'tri' : 'bullets', level: 0 } }))
  // a list of entries, each = [rowTable, ...extra paragraphs]
  const entries = (items) => items.flatMap((e, i) => [...(i ? [spacer()] : []), ...e])

  // ---- header (name, title, contact lines, gender, date of birth / marital status) ----
  // ---- header: centred name + job title, then the contact lines (centred, joined with bullets) ----
  const top = []
  if (p.name) top.push(new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, bidirectional: rtl ? true : undefined, children: [run(p.name)] }))
  if (p.title) top.push(para([run(p.title, { size: exec ? 29 : 26, bold: exec, font: exec && !rtl ? SERIF : undefined })], { alignment: AlignmentType.CENTER, spacing: { before: 0, after: exec ? 140 : 40 } }))
  const lab = (k, v) => [run(`${k}: `, { bold: true }), run(v)]
  const line1 = [
    p.residence && lab(CONTACT[l].residence, p.residence),
    p.city && lab(CONTACT[l].city, p.city),
    p.email && [run(p.email, { ltr: true })],
    p.phone && [run(p.phone, { ltr: true })],
    p.link && [new ExternalHyperlink({ link: href(p.link), children: [new TextRun({ text: String(p.link) + (rtl ? '\u200E' : ''), underline: {} })] })], // trailing LRM keeps a final "/" from jumping to the wrong side in RTL
  ].filter(Boolean)
  const details = [
    dobText(p.dob, l) && [d.dob, dobText(p.dob, l)],
    (p.marital === 'single' || p.marital === 'married') && [d.marital, d[p.marital + (p.gender === 'female' ? 'F' : '')]],
  ].filter(Boolean)
  const line2 = [
    (p.gender === 'male' || p.gender === 'female') && lab(d.gender, d[p.gender]),
    ...details.map(([k, v]) => lab(k, v)),
  ].filter(Boolean)
  const lines = [line1, line2].filter((x) => x.length)
  lines.forEach((g, n) => {
    const first = n === 0, last = n === lines.length - 1
    const border = exec ? { ...(first ? { top: RULE } : {}), ...(last ? { bottom: RULE } : {}) } : last ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C8C8C8', space: 6 } } : undefined
    top.push(para(g.flatMap((x, i) => (i ? [run('  •  '), ...x] : x)), { alignment: AlignmentType.CENTER, border, spacing: { before: first && exec ? 60 : 0, after: last ? 60 : 0 } }))
  })
  const head = top

  const photo = photoOf(p.photo)
  const children = []
  if (photo) {
    children.push(new Table({
      width: { size: TEXT_W, type: WidthType.DXA },
      columnWidths: [TEXT_W - PHOTO_CELL, PHOTO_CELL],
      borders: NO_BORDERS,
      visuallyRightToLeft: rtl ? true : undefined,
      rows: [new TableRow({
        children: [
          new TableCell({ width: { size: TEXT_W - PHOTO_CELL, type: WidthType.DXA }, borders: CELL_BORDERS, margins: NO_MARGINS, children: head.length ? head : [para([])] }),
          new TableCell({
            width: { size: PHOTO_CELL, type: WidthType.DXA }, borders: CELL_BORDERS, margins: NO_MARGINS,
            children: [para([new ImageRun({ type: photo.type, data: photo.data, transformation: { width: 96, height: 128 }, altText: { title: 'Photo', description: 'Profile photo', name: 'photo' } })], { alignment: AlignmentType.END })],
          }),
        ],
      })],
    }))
  } else {
    children.push(...head)
  }

  // ---- sections (same order as the PDF) ----
  if (p.summary) children.push(h2(t.summary), para([run(p.summary)]))

  const edu = list(cv.edu).filter((e) => e && (e.school || e.major || e.level))
  if (edu.length) {
    children.push(h2(t.edu), ...entries(edu.map((e) => {
      const line = EL[l][e.level] || ''
      return [row([e.school, e.major].filter(Boolean).join(' - '), range(e.start, e.end, l)), ...(line ? [para([run(line)])] : [])]
    })))
  }

  const jobs = (items, h) => {
    const f = list(items).filter((i) => i && (i.title || i.company))
    if (f.length) children.push(h2(h), ...entries(f.map((i) => [jobRow(i), ...bullets(i.bullets)])))
  }
  jobs(cv.exp, t.exp)

  const lv = cv.lvl || {}
  const tech = list(cv.tech).map((s) => skillText(s, lv[s], l)), soft = list(cv.soft).map((s) => skillText(s, lv[s], l))
  if (tech.length || soft.length) {
    children.push(h2(t.skills))
    if (tech.length) children.push(labelled(t.tech, tech.join(sep)))
    if (soft.length) children.push(labelled(t.soft, soft.join(sep)))
  }

  const langs = list(cv.langs).filter((x) => x && String(x.name || '').trim())
  if (langs.length) children.push(h2(t.langs), ...langs.map((x) => para([run(langName(x.name, l), { bold: true }), ...langParts(x, l).map(([tx, b]) => run(tx, { bold: b }))])))

  const courses = list(cv.courses).filter((c) => c && (c.title || c.org))
  if (courses.length) children.push(h2(t.courses), ...courses.map((c) => para([run([[c.title, c.org].filter(Boolean).join(' – '), fmt(c.date, l) && `(${fmt(c.date, l)})`].filter(Boolean).join(' '))], { numbering: { reference: 'bullets', level: 0 } })))

  jobs(cv.vol, t.vol)

  const confs = list(cv.confs).filter((c) => c && c.title)
  if (confs.length) children.push(h2(t.confs), ...entries(confs.map((c) => [row(c.title, fmt(c.date, l))])))

  if (!children.length) children.push(para([]))

  const doc = new Document({
    title: p.name ? `${p.name} - CV` : 'CV',
    creator: 'Sanad Youth',
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 20, language: { value: 'en-US', bidirectional: 'ar-SA' } },
          paragraph: { spacing: { line: 276, lineRule: LineRuleType.AUTO, after: 0 } },
        },
      },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: exec ? { size: 36, bold: true, color: '000000', font: rtl ? undefined : SERIF, allCaps: !rtl, characterSpacing: rtl ? 0 : 120 } : { size: 36, bold: true, color: '000000' }, paragraph: { spacing: { before: 0, after: exec ? 60 : 0, line: 300 }, outlineLevel: 0 } },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: exec ? { size: 22, bold: true, allCaps: true, font: rtl ? undefined : SERIF, characterSpacing: rtl ? 0 : 60 } : { size: 24, bold: true, allCaps: true },
          paragraph: exec
            ? { spacing: { before: 280, after: 140 }, outlineLevel: 1, border: { top: RULE, bottom: RULE } }
            : { spacing: { before: 260, after: 90 }, outlineLevel: 1 },
        },
      ],
    },
    numbering: {
      config: [
        { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.START, style: { paragraph: { indent: { start: 540, hanging: 270 } } } }] },
        { reference: 'tri', levels: [{ level: 0, format: LevelFormat.BULLET, text: '►', alignment: AlignmentType.START, style: { run: { size: 12, font: 'Arial' }, paragraph: { indent: { start: 540, hanging: 270 } } } }] }, // executive template
      ],
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      children,
    }],
  })
  return Packer.toBuffer(doc)
}
