# إعداد البريد عبر EmailJS

## 1) الخدمة (Service)
1. من لوحة EmailJS افتح **Email Services** ثم **Add New Service** واربط بريدك (Gmail أو Outlook أو غيرهما).
2. انسخ **Service ID** → `VITE_EMAILJS_SERVICE_ID`.

## 2) القالب (Template)
1. افتح **Email Templates** ثم **Create New Template**.
2. اضبط الحقول:
   - **To Email:** `{{to_email}}`
   - **Subject:** `السيرة الذاتية – {{cv_name}}`
   - **Content:** اختر وضع الكود (`</>`) والصق محتوى ملف `emailjs-template.html`.
     المتغير `{{{cv_html}}}` بثلاث أقواس لأنه يحتوي HTML.
3. احفظ وانسخ **Template ID** → `VITE_EMAILJS_TEMPLATE_ID`.

## 3) المفتاح العام
من **Account → General** انسخ **Public Key** → `VITE_EMAILJS_PUBLIC_KEY`.
(المفتاح العام مصمّم ليظهر في المتصفح، لكن قيّد استخدامه من **Security → Allowed Domains** بعنوان موقعك.)

## 4) المتغيرات
- محلياً: انسخ `.env.example` إلى `.env.local` واملأ القيم، ثم أعد تشغيل `npm run dev`.
- على Vercel: Settings → Environment Variables ثم **Redeploy** (متغيرات `VITE_` تُدمج وقت البناء).

## 5) إرفاق PDF (اختياري)
افتراضياً (`VITE_EMAILJS_ATTACH_PDF=false`) تصل السيرة داخل نص الرسالة.
لإرفاق ملف PDF:
1. في القالب: **Attachments → Add Attachment → Variable Attachment**.
2. **Parameter name:** `cv_pdf` و **Filename:** `CV.pdf`.
3. اجعل `VITE_EMAILJS_ATTACH_PDF=true`.

الإرفاق يستخدم `/api/pdf` (دالة Vercel)، وحجم الطلب المسموح يعتمد على خطة EmailJS؛ إن فشل الإرسال جرّب إيقاف الإرفاق.

## المتغيرات التي يرسلها التطبيق
| المتغير | المحتوى |
|---|---|
| `to_email` | بريد المستلم |
| `cv_name` | اسم صاحب السيرة |
| `cv_html` | السيرة بصيغة HTML بسيطة |
| `cv_pdf` | ملف PDF (فقط عند تفعيل الإرفاق) |
