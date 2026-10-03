import { cvHtml } from './_cv.js'

export async function makePdf(cv) {
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([import('@sparticuz/chromium'), import('puppeteer-core')])
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  })
  try {
    const page = await browser.newPage()
    await page.setContent(cvHtml(cv), { waitUntil: 'networkidle0', timeout: 15000 })
    const pdf = await page.pdf({ format: 'A4', margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' } })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
