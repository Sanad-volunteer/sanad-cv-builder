import { makeDocx } from './_docx.js'
import { cvFileName } from './_cv.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  const cv = req.body && req.body.cv
  if (!cv || typeof cv !== 'object') return res.status(400).json({ error: 'bad_request' })
  try {
    const file = await makeDocx(cv)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    const fn = `${cvFileName(cv.p && cv.p.name)}.docx`
    res.setHeader('Content-Disposition', `attachment; filename="cv.docx"; filename*=UTF-8''${encodeURIComponent(fn)}`)
    res.status(200).send(file)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'docx_failed' })
  }
}
