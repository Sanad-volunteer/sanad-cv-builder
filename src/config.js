// EmailJS settings come from environment variables (see .env.example and EMAILJS_SETUP.md).
const e = import.meta.env

export const EMAILJS = {
  serviceId: e.VITE_EMAILJS_SERVICE_ID,
  templateId: e.VITE_EMAILJS_TEMPLATE_ID,
  publicKey: e.VITE_EMAILJS_PUBLIC_KEY,
  attachPdf: e.VITE_EMAILJS_ATTACH_PDF === 'true', // true = also attach the PDF (needs /api/pdf and a plan that allows the size)
}
// 'smtp' = send from the server through Gmail (free, supports the PDF attachment). 'emailjs' = EmailJS (attachments are paid).
export const EMAIL_PROVIDER = e.VITE_EMAIL_PROVIDER === 'emailjs' ? 'emailjs' : 'smtp'
export const emailReady = Boolean(EMAILJS.serviceId && EMAILJS.templateId && EMAILJS.publicKey)
