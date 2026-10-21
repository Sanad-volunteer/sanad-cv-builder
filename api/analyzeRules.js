// Editable dictionaries for the browser-side CV analyzer (src/localAnalyze.js). No code knowledge needed:
// every entry is a list of ways to write the same thing (English first, then Arabic and other spellings).
// A skill counts as "present" when ANY of its spellings appears in the CV, so Arabic and English CVs match job texts in either language.

// ----- fields: recognised from the job title / description (words in `match`); `skills` are what that job usually needs.
// When the job description is short or missing, the first 8 skills of the recognised field are used as the expected keywords.
export const FIELDS = [
  { id: 'it', name: 'الدعم التقني وتقنية المعلومات',
    match: ['it support', 'help desk', 'helpdesk', 'technical support', 'system administrator', 'sysadmin', 'network', 'دعم تقني', 'دعم فني', 'الدعم الفني', 'الدعم التقني', 'تقنية المعلومات', 'فني حاسوب', 'فني شبكات'],
    skills: [['Troubleshooting', 'حل المشكلات التقنية', 'استكشاف الاخطاء', 'استكشاف الأخطاء'], ['Windows', 'ويندوز'], ['Networking', 'الشبكات', 'شبكات'], ['Active Directory', 'اكتيف دايركتوري'], ['Help Desk', 'Service Desk', 'مكتب المساعدة', 'الدعم الفني'], ['Microsoft 365', 'Office 365', 'مايكروسوفت 365'], ['Ticketing', 'Jira', 'ServiceNow', 'نظام التذاكر'], ['Hardware', 'صيانة الحاسوب', 'صيانة الاجهزة'], ['Remote Support', 'الدعم عن بعد'], ['Technical Documentation', 'التوثيق التقني'], ['Linux', 'لينكس'], ['ITIL'], ['Virtualization', 'VMware', 'Hyper-V'], ['Cybersecurity', 'الامن السيبراني', 'أمن المعلومات']] },
  { id: 'dev', name: 'تطوير البرمجيات',
    match: ['developer', 'software engineer', 'programmer', 'frontend', 'front-end', 'backend', 'back-end', 'full stack', 'fullstack', 'web developer', 'mobile developer', 'مطور', 'مبرمج', 'مهندس برمجيات', 'تطوير البرمجيات'],
    skills: [['JavaScript', 'جافاسكريبت'], ['Python', 'بايثون'], ['Git', 'GitHub'], ['SQL', 'قواعد البيانات', 'Databases'], ['HTML'], ['CSS'], ['React'], ['Node.js', 'NodeJS'], ['REST API', 'APIs', 'API'], ['Java', 'جافا'], ['C#', '.NET'], ['Flutter', 'فلاتر'], ['Agile', 'Scrum', 'اجايل'], ['Testing', 'Unit Testing', 'اختبار البرمجيات'], ['Object-Oriented Programming', 'OOP', 'البرمجة الكائنية']] },
  { id: 'acc', name: 'المحاسبة والمالية',
    match: ['accountant', 'accounting', 'finance', 'financial', 'auditor', 'bookkeeper', 'محاسب', 'محاسبة', 'مالية', 'مدقق', 'مراجع حسابات'],
    skills: [['Excel', 'اكسل', 'إكسل'], ['Accounting', 'المحاسبة'], ['Financial Reporting', 'التقارير المالية'], ['IFRS', 'المعايير الدولية للتقارير المالية'], ['Accounts Payable', 'الحسابات الدائنة'], ['Accounts Receivable', 'الحسابات المدينة'], ['Reconciliation', 'التسويات', 'مطابقة الحسابات'], ['Budgeting', 'الميزانية', 'اعداد الموازنات'], ['QuickBooks'], ['SAP'], ['Payroll', 'الرواتب'], ['Auditing', 'التدقيق'], ['Taxation', 'الضرائب'], ['Data Entry', 'ادخال البيانات', 'إدخال البيانات']] },
  { id: 'mkt', name: 'التسويق ووسائل التواصل',
    match: ['marketing', 'social media', 'digital marketing', 'content creator', 'community manager', 'seo', 'تسويق', 'التسويق', 'وسائل التواصل', 'السوشال ميديا', 'ادارة المحتوى', 'كاتب محتوى'],
    skills: [['Social Media Management', 'ادارة وسائل التواصل الاجتماعي', 'إدارة وسائل التواصل'], ['Content Writing', 'كتابة المحتوى'], ['SEO', 'تحسين محركات البحث'], ['Digital Marketing', 'التسويق الرقمي'], ['Google Analytics'], ['Canva', 'كانفا'], ['Email Marketing', 'التسويق عبر البريد'], ['Facebook Ads', 'Meta Ads', 'الاعلانات الممولة', 'الإعلانات الممولة'], ['Copywriting', 'كتابة الاعلانات'], ['Content Strategy', 'استراتيجية المحتوى'], ['Video Editing', 'تحرير الفيديو', 'مونتاج'], ['Market Research', 'بحوث السوق', 'دراسة السوق'], ['Campaign Management', 'ادارة الحملات', 'إدارة الحملات'], ['Brand Management', 'ادارة العلامة التجارية']] },
  { id: 'design', name: 'التصميم والإعلام',
    match: ['graphic design', 'designer', 'ui/ux', 'ux designer', 'ui designer', 'motion', 'مصمم', 'تصميم', 'جرافيك', 'تصميم جرافيك'],
    skills: [['Photoshop', 'فوتوشوب'], ['Illustrator', 'اليستريتور', 'إليستريتور'], ['Figma', 'فيجما'], ['Adobe XD'], ['InDesign', 'انديزاين'], ['Canva', 'كانفا'], ['After Effects', 'افتر افكتس'], ['Typography', 'الخطوط', 'الطباعة'], ['Branding', 'الهوية البصرية', 'العلامة التجارية'], ['Wireframing', 'Prototyping', 'النماذج الاولية'], ['UI Design', 'تصميم واجهات المستخدم'], ['UX Research', 'تجربة المستخدم'], ['Video Editing', 'تحرير الفيديو', 'مونتاج'], ['Color Theory', 'نظرية الالوان']] },
  { id: 'hr', name: 'الموارد البشرية والإدارة',
    match: ['human resources', 'hr ', 'recruiter', 'recruitment', 'administrative', 'office manager', 'secretary', 'assistant', 'موارد بشرية', 'الموارد البشرية', 'استقطاب', 'سكرتير', 'سكرتيرة', 'اداري', 'إداري', 'مساعد اداري'],
    skills: [['Recruitment', 'الاستقطاب', 'التوظيف'], ['Interviewing', 'المقابلات الوظيفية'], ['Onboarding', 'تهيئة الموظفين'], ['Payroll', 'الرواتب'], ['Employee Relations', 'علاقات الموظفين'], ['HRIS', 'نظام الموارد البشرية'], ['Performance Management', 'تقييم الاداء', 'تقييم الأداء'], ['Training and Development', 'التدريب والتطوير'], ['Microsoft Office', 'MS Office', 'مايكروسوفت اوفيس', 'مايكروسوفت أوفيس'], ['Excel', 'اكسل', 'إكسل'], ['Filing', 'الارشفة', 'الأرشفة'], ['Scheduling', 'جدولة المواعيد'], ['Correspondence', 'المراسلات'], ['Data Entry', 'ادخال البيانات', 'إدخال البيانات']] },
  { id: 'cs', name: 'خدمة العملاء والمبيعات',
    match: ['customer service', 'customer support', 'call center', 'sales', 'sales representative', 'cashier', 'خدمة العملاء', 'خدمه العملاء', 'مركز اتصال', 'مبيعات', 'مندوب مبيعات', 'امين صندوق', 'أمين صندوق'],
    skills: [['Customer Service', 'خدمة العملاء'], ['Communication', 'التواصل', 'مهارات التواصل'], ['Complaint Handling', 'معالجة الشكاوى', 'حل الشكاوى'], ['CRM', 'ادارة علاقات العملاء'], ['Sales', 'المبيعات'], ['Negotiation', 'التفاوض'], ['Upselling', 'البيع الاضافي'], ['Call Handling', 'الرد على المكالمات'], ['Product Knowledge', 'المعرفة بالمنتج'], ['Lead Generation', 'جذب العملاء'], ['Order Processing', 'معالجة الطلبات'], ['POS', 'نقاط البيع']] },
  { id: 'data', name: 'تحليل البيانات',
    match: ['data analyst', 'data analysis', 'business analyst', 'bi analyst', 'data scientist', 'محلل بيانات', 'تحليل البيانات', 'تحليل بيانات', 'محلل اعمال', 'محلل أعمال'],
    skills: [['Excel', 'اكسل', 'إكسل'], ['SQL'], ['Power BI'], ['Tableau'], ['Python', 'بايثون'], ['Data Visualization', 'تصور البيانات', 'عرض البيانات'], ['Data Cleaning', 'تنظيف البيانات'], ['Statistics', 'الاحصاء', 'الإحصاء'], ['Dashboards', 'لوحات المعلومات'], ['Reporting', 'اعداد التقارير', 'إعداد التقارير'], ['ETL'], ['R Programming', 'لغة R'], ['A/B Testing'], ['Pivot Tables', 'الجداول المحورية']] },
  { id: 'edu', name: 'التعليم والتدريب',
    match: ['teacher', 'tutor', 'trainer', 'instructor', 'teaching', 'معلم', 'معلمة', 'مدرس', 'مدرب', 'تدريس', 'مدرّب'],
    skills: [['Lesson Planning', 'اعداد الدروس', 'إعداد الدروس', 'تخطيط الدروس'], ['Classroom Management', 'ادارة الصف', 'إدارة الصف'], ['Curriculum Development', 'تطوير المناهج'], ['Assessment', 'التقييم'], ['E-Learning', 'التعليم عن بعد', 'التعليم الالكتروني'], ['Public Speaking', 'الالقاء', 'الإلقاء'], ['Presentation', 'العروض التقديمية', 'مهارات العرض والتقديم'], ['Mentoring', 'الارشاد', 'الإرشاد'], ['Differentiated Instruction', 'التعليم المتمايز'], ['Google Classroom'], ['Zoom'], ['Child Development', 'نمو الطفل']] },
]

// ----- skills that matter in many jobs (tools and general abilities)
export const COMMON_SKILLS = [
  ['Microsoft Office', 'MS Office', 'مايكروسوفت اوفيس', 'مايكروسوفت أوفيس'], ['Microsoft Word', 'Word', 'مايكروسوفت وورد'], ['Microsoft Excel', 'Excel', 'اكسل', 'إكسل'], ['PowerPoint', 'باوربوينت'],
  ['Google Workspace', 'جوجل وورك سبيس', 'G Suite'], ['Data Entry', 'ادخال البيانات', 'إدخال البيانات'], ['Data Analysis', 'تحليل البيانات', 'تحليل بيانات'], ['Project Management', 'ادارة المشاريع', 'إدارة المشاريع'],
  ['Report Writing', 'كتابة التقارير', 'اعداد التقارير'], ['English', 'اللغة الانجليزية', 'اللغة الإنجليزية', 'الانجليزية'], ['Arabic', 'اللغة العربية'], ['Fast Typing', 'الكتابة السريعة'], ['Artificial Intelligence', 'AI', 'الذكاء الاصطناعي'],
]

// ----- soft skills (also used to tell hard skills from soft skills in the skills section)
export const SOFT_SKILLS = [
  ['Communication', 'التواصل', 'مهارات التواصل', 'التواصل الفعال', 'التواصل الفعّال', 'Effective Communication'], ['Teamwork', 'العمل ضمن فريق', 'العمل الجماعي', 'العمل بروح الفريق', 'Team Player'],
  ['Leadership', 'القيادة'], ['Problem Solving', 'حل المشكلات', 'حل المشاكل'], ['Time Management', 'ادارة الوقت', 'إدارة الوقت'], ['Critical Thinking', 'التفكير النقدي'], ['Creativity', 'الابداع', 'الإبداع'],
  ['Adaptability', 'المرونة', 'المرونة والتكيف', 'التكيف'], ['Emotional Intelligence', 'الذكاء العاطفي'], ['Decision Making', 'اتخاذ القرار', 'اتخاذ القرارات'], ['Negotiation', 'التفاوض'],
  ['Working Under Pressure', 'العمل تحت الضغط'], ['Responsibility', 'تحمل المسؤولية', 'تحمّل المسؤولية', 'الالتزام', 'Commitment'], ['Organization', 'التنظيم', 'Organizational Skills'],
  ['Fast Learning', 'سرعة التعلم', 'سرعة التعلّم', 'Quick Learner'], ['Customer Service', 'خدمة العملاء'], ['Presentation Skills', 'مهارات العرض والتقديم', 'العرض والتقديم', 'Public Speaking'], ['Attention to Detail', 'الاهتمام بالتفاصيل', 'الدقة'],
]

// ----- job titles that mean the same thing (so "Software Engineer" matches a CV that says "Developer")
export const TITLE_GROUPS = [
  ['developer', 'software engineer', 'programmer', 'software developer', 'مطور', 'مبرمج', 'مهندس برمجيات'],
  ['it support', 'help desk', 'technical support', 'service desk', 'desktop support', 'دعم فني', 'دعم تقني', 'الدعم الفني', 'الدعم التقني', 'فني دعم'],
  ['accountant', 'accounting', 'محاسب', 'محاسبة'], ['marketing', 'marketer', 'تسويق', 'مسوق', 'مسؤول تسويق'], ['designer', 'graphic designer', 'مصمم', 'مصمم جرافيك'],
  ['human resources', 'hr', 'الموارد البشرية', 'موارد بشرية'], ['customer service', 'customer support', 'خدمة العملاء', 'دعم العملاء'], ['data analyst', 'محلل بيانات', 'محلل البيانات'],
  ['teacher', 'instructor', 'معلم', 'مدرس'], ['administrative assistant', 'office assistant', 'secretary', 'مساعد اداري', 'مساعد إداري', 'سكرتير', 'سكرتيرة'],
]

// ----- strong action verbs a bullet should start with (past tense). English words ending in "ed" and Arabic first-person verbs (ending in ت) are also accepted.
export const ACTION_VERBS = ['led', 'built', 'ran', 'wrote', 'taught', 'grew', 'drove', 'won', 'made', 'began', 'brought', 'spearheaded', 'oversaw', 'chaired', 'steered', 'قمت', 'عملت', 'ساهمت', 'شاركت', 'تعاملت', 'تولّيت', 'توليت', 'اشرفت', 'أشرفت']
