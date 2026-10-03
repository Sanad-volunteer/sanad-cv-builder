// Open https://YOUR-SITE/api/health to check which settings the server can see (true/false only, never the values).
export default function handler(req, res) {
  res.status(200).json({
    gmailUser: !!process.env.GMAIL_USER,
    gmailPassword: !!process.env.GMAIL_APP_PASSWORD,
    geminiKey: !!process.env.GEMINI_API_KEY,
    siteUrl: !!(process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL),
  })
}
