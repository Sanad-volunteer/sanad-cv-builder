import { makePdf } from './_pdf.js'
import { cvFileName } from './_cv.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  const cv = req.body && req.body.cv
  if (!cv || typeof cv !== 'object') return res.status(400).json({ error: 'bad_request' })
  try {
    const pdf = await makePdf(cv)
    res.setHeader('Content-Type', 'application/pdf')
    const fn = `${cvFileName(cv.p && cv.p.name)}.pdf`
    res.setHeader('Content-Disposition', `attachment; filename="cv.pdf"; filename*=UTF-8''${encodeURIComponent(fn)}`)
    res.status(200).send(pdf)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'pdf_failed' })
  }
}
