# Sanad CV Builder

A simple Arabic/English ATS-friendly CV builder for students and graduates.

## Stack

- React + TypeScript + Vite
- Plain CSS
- LocalStorage for drafts
- @react-pdf/renderer for text-based PDF generation
- Vercel Functions + Resend for email delivery

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Vercel email setup

1. Create a Resend API key.
2. In Vercel project settings, add `RESEND_API_KEY`.
3. In `api/send-cv.ts`, change `FROM_EMAIL` to a verified sender/domain in Resend.
4. Deploy to Vercel.

The browser can download the PDF directly. The email endpoint receives the generated PDF as base64 and sends it as an attachment.

## ATS approach

The CV template is intentionally monochrome, single-column, text-based, with conventional headings and no icons, graphics, sidebars, tables, progress bars, or profile photos.
