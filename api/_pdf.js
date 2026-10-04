import { cvHtml } from './_cv.js'
import fontCss from './_fonts.js'

export async function makePdf(cv) {
  if (process.env.VERCEL) {
    // Chromium chooses its system-library pack from these variables, and only knows the "20.x"/"22.x" values.
    // Vercel runs Amazon Linux 2023 (what that pack is built for) whatever Node version the project uses.
    process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs22.x'
    process.env.AWS_LAMBDA_JS_RUNTIME = 'nodejs22.x'
  }
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([import('@sparticuz/chromium'), import('puppeteer-core')])
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  })
  try {
    const page = await browser.newPage()
    await page.setContent(cvHtml(cv, { fontCss }), { waitUntil: 'load', timeout: 15000 })
    await page.evaluate(() => document.fonts.ready)
    const pdf = await page.pdf({ format: 'A4', margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' } })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
