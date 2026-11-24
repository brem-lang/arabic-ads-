import { z } from 'zod';
import { timingSchema } from './form-timing';
import { QUESTIONS, type Answers } from './questions';

// Lead validation shared by the browser and the server. Ported from arabic-trading-spark-arab-only,
// narrowed to this site: Saudi Arabia only, and every question must be answered.

/** Saudi Arabia only: +966 and a 9-digit mobile number starting with 5. */
export const SA = { code: '+966', iso: 'SA', pattern: /^5\d{8}$/, example: '5XXXXXXXX' } as const;

/** Convert Arabic-Indic / Persian digits to Latin and strip spaces, dashes, brackets. */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\s\-().]/g, '');
}

const dropTrunkZero = (n: string) => (n.startsWith('0') ? n.slice(1) : n);

/** Turn a locally typed number (e.g. 0501234567, 966501234567, +966 50…) into its local part. */
export function toLocalNumber(raw: string): string {
  let n = normalizeDigits(raw);
  const cc = SA.code.replace('+', '');
  let international = false;
  if (n.startsWith('+')) [n, international] = [n.slice(1), true];
  else if (n.startsWith('00')) [n, international] = [n.slice(2), true];
  if (n.startsWith(cc)) {
    // Without "+" a leading country code is ambiguous (a local number could start with the
    // same digits), so only strip it when the number isn't valid as typed but is without it.
    const rest = dropTrunkZero(n.slice(cc.length));
    const validAsTyped = SA.pattern.test(dropTrunkZero(n));
    if (international || (!validAsTyped && SA.pattern.test(rest))) n = n.slice(cc.length);
  }
  return dropTrunkZero(n);
}

export function isValidPhone(raw: string): boolean {
  return SA.pattern.test(toLocalNumber(raw));
}

export function toE164(phone: string): string {
  return `${SA.code}${toLocalNumber(phone)}`;
}

const COMMON_DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'yaho.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'outlok.com': 'outlook.com',
  'icloud.co': 'icloud.com',
};

export function suggestEmailFix(email: string): string | null {
  const [user, domain] = email.trim().toLowerCase().split('@');
  if (!user || !domain) return null;
  const fix = COMMON_DOMAIN_TYPOS[domain];
  return fix ? `${user}@${fix}` : null;
}

export const MESSAGES = {
  firstEmpty: 'الرجاء إدخال الاسم الأول',
  lastEmpty: 'الرجاء إدخال اسم العائلة',
  nameShort: 'حرفان على الأقل',
  nameLong: 'الاسم طويل جداً',
  nameChars: 'الحروف فقط بدون أرقام أو رموز',
  emailEmpty: 'الرجاء إدخال البريد الإلكتروني',
  emailLong: 'البريد الإلكتروني طويل جداً',
  emailFormat: 'صيغة البريد الإلكتروني غير صحيحة',
  emailTypo: 'يبدو أن هناك خطأ إملائي في البريد',
  phoneEmpty: 'الرجاء إدخال رقم الجوال',
  phoneInvalid: `رقم الجوال غير صحيح — مثال: ${SA.example}`,
  answersMissing: 'يرجى الإجابة على جميع الأسئلة.',
  failSave: 'تعذّر إرسال طلبك، حاول مرة أخرى',
  failCheck: 'تحقق من بياناتك وحاول مرة أخرى',
} as const;

// A single name part: Arabic or Latin letters (accents included), optional
// inner space/hyphen/apostrophe.
const LETTERS = '[\\p{Script=Arabic}\\p{Script=Latin}\\p{M}]+';
const NAME_PART_RE = new RegExp(`^${LETTERS}(?:[\\s'-]${LETTERS})*$`, 'u');
// Strict email: user@domain.tld with a 2+ letter TLD.
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

const namePart = (empty: string) =>
  z
    .string()
    .trim()
    .min(1, { message: empty })
    .min(2, { message: MESSAGES.nameShort })
    .max(50, { message: MESSAGES.nameLong })
    .transform((v) => v.replace(/\s+/g, ' '))
    .refine((v) => NAME_PART_RE.test(v), { message: MESSAGES.nameChars });

export const contactSchema = z.object({
  firstName: namePart(MESSAGES.firstEmpty),
  lastName: namePart(MESSAGES.lastEmpty),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { message: MESSAGES.emailEmpty })
    .max(255, { message: MESSAGES.emailLong })
    .refine((v) => EMAIL_RE.test(v), { message: MESSAGES.emailFormat })
    .refine((v) => !suggestEmailFix(v), { message: MESSAGES.emailTypo }),
  phone: z
    .string()
    .trim()
    .min(1, { message: MESSAGES.phoneEmpty })
    .max(20)
    .refine(isValidPhone, { message: MESSAGES.phoneInvalid }),
});

export type ContactInput = z.input<typeof contactSchema>;

/** Every question is required, and each answer must be one of its English option values. */
export const answerSchema = z
  .object(
    Object.fromEntries(
      QUESTIONS.map((q) => [
        q.key,
        z.enum(q.options.map((o) => o.value) as [string, ...string[]], {
          errorMap: () => ({ message: MESSAGES.answersMissing }),
        }),
      ]),
    ),
  )
  .strict();

/** A full lead as the browser posts it to /api/submit-lead. */
export const leadSubmissionSchema = z.object({
  contact: contactSchema,
  answers: answerSchema,
  /** Honeypot: hidden from people, usually filled by bots. Forwarded as-is to the CRM. */
  website: z.string().max(200).optional().default(''),
  /** Landing/field/click times, forwarded only to the leads log. Bad data is dropped, never rejects the lead. */
  timing: timingSchema.optional().catch(undefined),
});

export type LeadSubmission = z.output<typeof leadSubmissionSchema>;

/** The JSON body the CRM's submit-leads endpoint expects. */
export function toCrmPayload({ contact, answers, website }: LeadSubmission, ipAddress: string) {
  return {
    firstname: contact.firstName,
    lastname: contact.lastName,
    email: contact.email,
    mobile: toE164(contact.phone),
    country_code: SA.iso,
    ip_address: ipAddress,
    website,
    questions: QUESTIONS.map((q) => ({ key: q.key, value: (answers as Answers)[q.key]! })),
  };
}
