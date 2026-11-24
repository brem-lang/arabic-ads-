export type Option = { value: string; label: string };
export type Question = { key: string; label: string; options: Option[] };

// Each answer is sent to the CRM as { key, value }. `value` stays in English so the CRM
// keeps receiving the same values; `label` is the Arabic text shown to the visitor.
export const QUESTIONS: Question[] = [
  {
    key: 'is_saudi_citizen',
    label: 'هل أنت مواطن سعودي؟',
    options: [
      { value: 'Yes, I am a Saudi citizen.', label: 'نعم، أنا مواطن سعودي.' },
      { value: 'No', label: 'لا' },
    ],
  },
  {
    key: 'investment_amount',
    label: 'ما المبلغ الذي تخطط لتخصيصه للاستثمار؟',
    options: [
      { value: 'SAR 1,000–4,999', label: '1,000–4,999 ريال سعودي' },
      { value: 'SAR 5,000–9,999', label: '5,000–9,999 ريال سعودي' },
      { value: 'SAR 10,000–49,999', label: '10,000–49,999 ريال سعودي' },
      { value: 'SAR 50,000 or more', label: '50,000 ريال سعودي أو أكثر' },
      { value: "I haven't decided yet.", label: 'لم أقرر بعد.' },
    ],
  },
  {
    key: 'investment_start_time',
    label: 'متى تخطط لبدء الاستثمار؟',
    options: [
      { value: 'Within the next 7 days', label: 'خلال الأيام السبعة القادمة' },
      { value: 'Within the next 30 days', label: 'خلال الثلاثين يومًا القادمة' },
      { value: 'Within 1–3 months', label: 'خلال 1–3 أشهر' },
      { value: 'I am just looking for now', label: 'أتصفح فقط في الوقت الحالي' },
    ],
  },
  {
    key: 'experience_level',
    label: 'ما مستوى خبرتك في التداول والاستثمار؟',
    options: [
      { value: 'Beginner — I am ready to learn', label: 'مبتدئ — مستعد للتعلّم' },
      { value: 'I have some experience', label: 'لدي بعض الخبرة' },
      { value: 'Experienced investor', label: 'مستثمر ذو خبرة' },
      {
        value: 'I am actively involved in trading in the financial markets',
        label: 'أتداول بنشاط في الأسواق المالية',
      },
    ],
  },
  {
    key: 'wants_contact',
    label:
      'هل ترغب في أن نتواصل معك لمناقشة خيارات الاستثمار ومخاطر التداول ومتطلبات فتح الحساب؟',
    options: [
      {
        value: 'Yes, I am ready to discuss the next steps.',
        label: 'نعم، أنا مستعد لمناقشة الخطوات التالية.',
      },
      {
        value: 'Yes, but I need more information first.',
        label: 'نعم، لكنني أحتاج إلى مزيد من المعلومات أولًا.',
      },
    ],
  },
];

export type Answers = Record<string, string>;
