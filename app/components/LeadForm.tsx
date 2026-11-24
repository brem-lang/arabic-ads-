'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { QUESTIONS, type Answers } from '../lib/questions';
import { trackPixel } from '../lib/pixel';
import { createFormTimer, type TimedField } from '../lib/form-timing';
import { MESSAGES, SA, contactSchema } from '../lib/lead-schema';
import { submitLead } from '../lib/submit-lead';

type Step = 'form' | 'questions' | 'preparing';

const GENERIC_ERROR = MESSAGES.failSave;

const inputClass =
  'h-11 short:h-10 rounded-lg border border-line bg-surface-2 px-3.5 text-[15px] text-fg placeholder:text-subtle outline-none transition-colors focus:border-accent/70 focus:ring-2 focus:ring-accent/20';

export default function LeadForm() {
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [showMissing, setShowMissing] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot
  const [request, setRequest] = useState<Promise<string | null> | null>(null);

  // Landing/field/answer/click times for the leads log (app/lib/form-timing.ts).
  const timer = useRef<ReturnType<typeof createFormTimer> | null>(null);
  const timed = () => (timer.current ??= createFormTimer());
  useEffect(() => {
    timed().formLoaded();
  }, []);
  useEffect(() => {
    if (step === 'questions') timed().questionsShown();
  }, [step]);
  /** Focus/blur/change handlers that record timing for a text field. */
  const track = (k: TimedField, setter: (v: string) => void) => ({
    onFocus: () => timed().focus(k),
    onBlur: () => timed().blur(k),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      timed().input(k);
      setter(e.target.value);
    },
  });

  const contact = { firstName: firstname, lastName: lastname, email, phone };

  const handleError = useCallback((message: string) => {
    setError(message);
    setStep('form');
  }, []);

  function continueToQuestions(e: React.FormEvent) {
    e.preventDefault();
    const res = contactSchema.safeParse(contact);
    if (!res.success) {
      setError(res.error.issues[0]?.message ?? MESSAGES.failCheck);
      return;
    }

    setError('');
    setStep('questions');
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Every click counts, including ones that fail validation.
    const timing = timed().submitClick();
    if (QUESTIONS.some((q) => !answers[q.key])) {
      setShowMissing(true);
      setError(MESSAGES.answersMissing);
      return;
    }

    setError('');
    setRequest(
      // submitLead throws only when the details fail the shared schema check.
      Promise.resolve()
        .then(() => submitLead({ contact, answers, website, timing }))
        .catch(() => {
          throw new Error(MESSAGES.failCheck);
        })
        .then((res) => {
          if (!res.ok) throw new Error(MESSAGES.failSave);
          trackPixel('Lead');
          return res.autologinUrl ?? null;
        }),
    );
    setStep('preparing');
  }

  if (step === 'preparing' && request) {
    return (
      <PreparingAccount
        email={email.trim()}
        request={request}
        onError={handleError}
        onCancel={() => setStep('form')}
      />
    );
  }

  if (step === 'questions') {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            setError('');
            setStep('form');
          }}
          className="text-[13px] font-semibold text-accent hover:underline"
        >
          → العودة إلى بياناتك
        </button>
        <h2 className="mt-2 font-display text-[22px] font-bold">
          بعض الأسئلة السريعة
        </h2>
        <p className="mt-1 text-[15px] text-muted xshort:hidden">
          يساعدنا ذلك في تجهيز الحساب المناسب لك.
        </p>

        <form onSubmit={submit} noValidate className="mt-4">
          <div className="-me-3 max-h-[calc(100dvh-420px)] space-y-4 overflow-y-auto pe-3 pb-5 [mask-image:linear-gradient(to_bottom,black_calc(100%-28px),transparent)] [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]">
            {QUESTIONS.map((q) => {
              const missing = showMissing && !answers[q.key];
              return (
                <fieldset key={q.key}>
                  <legend className="text-[14px] font-semibold leading-snug">
                    {q.label} <span className="text-danger">*</span>
                  </legend>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {q.options.map((option) => {
                      const checked = answers[q.key] === option.value;
                      return (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-[13.5px] leading-snug transition-colors ${
                            checked
                              ? 'border-accent/60 bg-accent/10 text-fg'
                              : missing
                                ? 'border-danger/40 text-muted hover:border-line-strong'
                                : 'border-line text-muted hover:border-line-strong hover:text-fg'
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.key}
                            value={option.value}
                            checked={checked}
                            onChange={() => {
                              timed().input(q.key as TimedField);
                              setAnswers((a) => ({ ...a, [q.key]: option.value }));
                            }}
                            className="peer sr-only"
                          />
                          <span
                            className={`grid size-4.5 shrink-0 place-items-center rounded border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 ${
                              checked
                                ? 'border-accent bg-accent text-accent-fg'
                                : 'border-line-strong'
                            }`}
                          >
                            {checked && (
                              <svg
                                viewBox="0 0 24 24"
                                className="size-3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M5 12.5l4.5 4.5L19 7.5" />
                              </svg>
                            )}
                          </span>
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
          <div className="mt-3">
            <ErrorText message={error} />
          </div>
          {/* Honeypot: invisible to people, bots tend to fill it. */}
          <div aria-hidden="true" className="sr-only">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <SubmitButton label="إرسال" />
        </form>
      </>
    );
  }

  return (
    <>
      <h2 className="font-display text-[22px] font-bold">
        المتابعة إلى حسابك
      </h2>
      <p className="mt-2 text-[15px] text-muted xshort:hidden">
        أدخل بياناتك للمتابعة بأمان.
      </p>

      <form
        onSubmit={continueToQuestions}
        noValidate
        className="mt-6 space-y-3.5 short:mt-4 short:space-y-2.5"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstname" className="text-[13px] font-semibold">
              الاسم الأول
            </label>
            <input
              id="firstname"
              autoComplete="given-name"
              placeholder="محمد"
              value={firstname}
              {...track('firstName', setFirstname)}
              className={`${inputClass} mt-1.5 w-full`}
            />
          </div>
          <div>
            <label htmlFor="lastname" className="text-[13px] font-semibold">
              اسم العائلة
            </label>
            <input
              id="lastname"
              autoComplete="family-name"
              placeholder="العتيبي"
              value={lastname}
              {...track('lastName', setLastname)}
              className={`${inputClass} mt-1.5 w-full`}
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="text-[13px] font-semibold">
            البريد الإلكتروني
          </label>
          <div className="relative mt-1.5">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            <input
              id="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              {...track('email', setEmail)}
              className={`${inputClass} w-full pr-10 text-right`}
            />
          </div>
        </div>
        <div>
          <label htmlFor="mobile" className="text-[13px] font-semibold">
            رقم الجوال
          </label>
          {/* Phone numbers read left-to-right, so the flag and +966 stay on the left. */}
          <div dir="ltr" className="relative mt-1.5">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-2 border-r border-line pl-3.5 pr-3 text-[15px]">
              <SaudiFlag />
              <span className="font-medium text-fg">{SA.code}</span>
            </span>
            <input
              id="mobile"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="5X XXX XXXX"
              value={phone}
              {...track('phone', setPhone)}
              className={`${inputClass} w-full pl-26`}
            />
          </div>
        </div>
        <ErrorText message={error} />
        <SubmitButton label="متابعة" />
      </form>

      <p className="mt-4 flex short:mt-3 items-center justify-center gap-1.5 text-xs text-subtle xshort:hidden">
        <svg
          viewBox="0 0 24 24"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        محمي بتشفير 256 بت
      </p>
      <p className="mt-4 text-xs short:mt-3 leading-relaxed text-subtle">
        بالمتابعة، فإنك توافق على{' '}
        <a href="#" className="text-muted hover:text-fg">
          الشروط
        </a>{' '}
        و{' '}
        <a href="#" className="text-muted hover:text-fg">
          سياسة الخصوصية
        </a>
        . قد نتواصل معك عبر البريد الإلكتروني أو الهاتف بخصوص حسابك.
      </p>
    </>
  );
}

const STAGES = [
  'جارٍ التحقق من بريدك الإلكتروني',
  'جارٍ تأمين اتصالك',
  'جارٍ التحقق من صلاحية الوصول إلى الحساب',
  'جارٍ تجهيز حسابك',
];

// Holds just short of 100% until the submission resolves.
const PENDING_CAP = 96;

function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  return `${user.slice(0, 1)}${'*'.repeat(Math.max(user.length - 1, 3))}@${domain}`;
}

function PreparingAccount({
  email,
  request,
  onError,
  onCancel,
}: {
  email: string;
  request: Promise<string | null>;
  onError: (message: string) => void;
  onCancel: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [settled, setSettled] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    request.then(
      (url) => {
        if (!active) return;
        setRedirectUrl(url);
        setSettled(true);
      },
      (err) =>
        active && onError(err instanceof Error ? err.message : GENERIC_ERROR),
    );
    return () => {
      active = false;
    };
  }, [request, onError]);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => Math.min(p + 1, settled ? 100 : PENDING_CAP));
    }, 55);
    return () => clearInterval(id);
  }, [settled]);

  // At 100%, send the visitor to their autologin link (or reload if the CRM didn't return one).
  useEffect(() => {
    if (progress < 100) return;
    const id = setTimeout(() => {
      if (redirectUrl) window.location.assign(redirectUrl);
      else window.location.reload();
    }, 700);
    return () => clearTimeout(id);
  }, [progress, redirectUrl]);

  const activeStage = Math.min(Math.floor(progress / 25), STAGES.length - 1);

  return (
    <div className="text-center" aria-live="polite">
      <div className="relative mx-auto size-16">
        <div className="absolute inset-0 grid place-items-center rounded-full bg-surface-2 text-accent shadow-[0_0_30px_-6px] shadow-accent/40">
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 16l5-5 3 3 6-6" />
          </svg>
        </div>
        <svg
          viewBox="0 0 64 64"
          className="absolute inset-0 size-16 animate-spin [animation-duration:1.4s]"
        >
          <circle
            cx="32"
            cy="32"
            r="30"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="40 200"
          />
        </svg>
      </div>

      <h2 className="mt-5 font-display short:mt-3 text-[22px] font-bold">
        جارٍ تجهيز حسابك
      </h2>
      <p className="mt-2 text-[15px] text-muted">
        جارٍ تسجيل الدخول باسم{' '}
        <span dir="ltr" className="font-mono font-semibold text-fg">
          {maskEmail(email)}
        </span>
        . يرجى إبقاء هذه الصفحة مفتوحة.
      </p>

      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-linear-to-l from-accent-2 to-accent transition-[width] duration-150 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[13px]">
        <span className="text-muted">
          {progress < 100 ? `${STAGES[activeStage]}…` : 'جارٍ التحويل…'}
        </span>
        <span dir="ltr" className="font-mono font-semibold text-accent">{progress}%</span>
      </div>

      <ul className="mt-5 space-y-3.5 short:mt-4 short:space-y-2.5 short:p-4 rounded-xl border border-line bg-surface-2/60 p-5 text-start text-[15px]">
        {STAGES.map((label, i) => {
          const complete = progress >= (i + 1) * 25;
          const current = !complete && i === activeStage;
          return (
            <li
              key={label}
              className={`flex items-center gap-3 ${complete || current ? 'text-fg' : 'text-subtle'}`}
            >
              <StageIcon
                state={complete ? 'complete' : current ? 'current' : 'pending'}
              />
              <span
                className={
                  current ? 'font-semibold' : complete ? 'font-medium' : ''
                }
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 short:mt-4 text-[13px] text-subtle">
        فروقات أسعار خام تبدأ من 0.0 نقطة
      </p>
      <button
        type="button"
        onClick={onCancel}
        className="mt-4 text-[15px] font-semibold text-accent hover:underline"
      >
        → استخدام بيانات مختلفة
      </button>
    </div>
  );
}

function StageIcon({ state }: { state: 'complete' | 'current' | 'pending' }) {
  if (state === 'complete') {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent/80 text-accent-fg">
        <svg
          viewBox="0 0 24 24"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-line-strong border-t-accent border-r-accent" />
    );
  }
  return (
    <span className="size-5 shrink-0 rounded-full border-2 border-line-strong" />
  );
}

// An inline SVG instead of the 🇸🇦 emoji, which Windows shows as the letters "SA".
// Simplified for its small size: the green field, the Shahada and the sword.
function SaudiFlag() {
  return (
    <svg
      viewBox="0 0 30 20"
      className="h-3.5 w-5.25 shrink-0 rounded-xs ring-1 ring-black/10"
      role="img"
      aria-label="المملكة العربية السعودية"
    >
      <rect width="30" height="20" fill="#006C35" />
      <text
        x="15"
        y="10"
        textAnchor="middle"
        fill="#fff"
        fontSize="5.2"
        fontWeight="700"
        direction="rtl"
      >
        لا إله إلا الله محمد رسول الله
      </text>
      <path d="M8 14.2h13.5l1.5-.9" stroke="#fff" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M9.6 13v2.4" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

function ErrorText({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-[13px] text-danger">
      {message}
    </p>
  );
}

function SubmitButton({
  label,
  disabled,
}: {
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-4 flex h-13 short:mt-3 short:h-11 w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-accent to-accent-2 font-display text-[17px] font-bold text-accent-fg shadow-[0_8px_30px_-8px] shadow-accent/40 transition hover:brightness-110 active:translate-y-px disabled:opacity-70"
    >
      {label}
      <svg
        viewBox="0 0 24 24"
        className="size-4 -scale-x-100"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  );
}
