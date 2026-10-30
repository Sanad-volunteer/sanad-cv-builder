// CV templates. ONE stylesheet used by the live preview (src/Preview.jsx) and the PDF (api/_cv.js); the Word file (api/_docx.js) mirrors it.
// Both templates keep the same sections and the same single-column, plain markup (ATS friendly): only the look changes.
//   classic: centred sans-serif header, thin grey rule, bold upper-case section titles, company on top / job title in italics below
//   exec   : spaced serif name, headline, contact line between two rules, centred section titles between rules, justified text, triangle bullets
export const TEMPLATES = ['classic', 'exec']
export const tplOf = (cv) => (cv && TEMPLATES.includes(cv.tpl) ? cv.tpl : 'classic')

const SERIF = 'Lora,Cairo,Georgia,serif'
export const TPL_CSS = `
.cv{font-family:Cairo,Arial,sans-serif;font-size:12.5px;line-height:1.6;color:#000}
.cv p,.cv h1,.cv h2{margin:0}.cv a{color:inherit;text-decoration:underline}
.cv .hd{display:flex;align-items:center;gap:14px}
.cv .hd-c{flex:1;min-width:0;text-align:center}
.cv .hd img{width:96px;height:128px;object-fit:cover;flex:none}
.cv .hd.ph::before{content:'';width:96px;flex:none}
.cv .ct>p>span{white-space:nowrap}
.cv .ct>p>span:not(:last-child)::after{content:'•';margin:0 .3em 0 .7em}
.cv .r{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.cv .r>span{white-space:nowrap}.cv .r>.l{white-space:normal}
.cv section>div+div{margin-top:8px}
.cv ul{margin:2px 0 4px;padding-inline-start:18px}
.cv:lang(ar) .jt{font-style:normal}

.tpl-classic .hd{padding-bottom:10px;margin-bottom:4px;border-bottom:1px solid #c8c8c8}
.tpl-classic h1{font-size:21px;font-weight:700;line-height:1.3}
.tpl-classic .ttl{font-size:13px}
.tpl-classic .ct{font-size:12px;margin-top:2px}
.tpl-classic h2{font-size:14px;font-weight:700;text-transform:uppercase;margin:18px 0 6px}
.tpl-classic .r{align-items:flex-end}
.tpl-classic .l{display:flex;flex-direction:column}
.tpl-classic .jt{font-style:italic}

.tpl-exec h1{font-family:${SERIF};font-size:24px;font-weight:700;line-height:1.3}
.tpl-exec h1::before{content:'- '}.tpl-exec h1::after{content:' -'}
.tpl-exec:lang(en) h1{text-transform:uppercase;letter-spacing:.3em}
.tpl-exec .ttl{font-family:${SERIF};font-weight:700;font-size:14.5px;margin:10px 0 12px}
.tpl-exec .ct{border-top:1px solid #000;border-bottom:1px solid #000;padding:7px 0;font-size:12px}
.tpl-exec h2{font-family:${SERIF};font-size:13px;font-weight:700;text-align:center;text-transform:uppercase;border-top:1px solid #000;border-bottom:1px solid #000;padding:5px 0;margin:20px 0 10px}
.tpl-exec:lang(en) h2{letter-spacing:.22em}
.tpl-exec p,.tpl-exec li{text-align:justify}
.tpl-exec .ttl,.tpl-exec .ct>p{text-align:center}
.tpl-exec .jt::before{content:'•';margin:0 .55em}
.tpl-exec ul{list-style:none;padding-inline-start:20px}
.tpl-exec li{position:relative}
.tpl-exec li::before{content:'';position:absolute;inset-inline-start:-16px;top:.62em;width:0;height:0;border-style:solid;border-width:4px 0 4px 7px;border-color:transparent transparent transparent #000}
.tpl-exec:lang(ar) li::before{border-width:4px 7px 4px 0;border-color:transparent #000 transparent transparent}
`
