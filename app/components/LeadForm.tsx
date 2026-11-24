'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { COUNTRIES, COUNTRY_BY_CODE } from '../lib/countries';
import { QUESTIONS, type Answers } from '../lib/questions';
import { trackPixel } from '../lib/pixel';

type Step = 'form' | 'questions' | 'preparing';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GENERIC_ERROR = 'Something went wrong. Please try again.';

const inputClass =
  'h-11 short:h-10 rounded-lg border border-line bg-surface-2 px-3.5 text-[15px] text-fg placeholder:text-subtle outline-none transition-colors focus:border-accent/70 focus:ring-2 focus:ring-accent/20';

export default function LeadForm() {
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [country, setCountry] = useState('CA');
  const countryTouched = useRef(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [showMissing, setShowMissing] = useState(false);
  const [request, setRequest] = useState<Promise<string | null> | null>(null);

  const dial = COUNTRY_BY_CODE.get(country)?.dial ?? '';
  const digits = phone.replace(/\D/g, '').replace(/^0+/, '');

  const handleError = useCallback((message: string) => {
    setError(message);
    setStep('form');
  }, []);

  // Preselect the visitor's country from their IP, falling back to the browser locale (e.g. "en-CA").
  // Never overrides a country the visitor already picked.
  useEffect(() => {
    fetch('/api/geo')
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data) => {
        const region =
          data?.country ?? navigator.language.split('-')[1]?.toUpperCase();
        if (!countryTouched.current && region && COUNTRY_BY_CODE.has(region)) {
          setCountry(region);
        }
      });
  }, []);

  function continueToQuestions(e: React.FormEvent) {
    e.preventDefault();
    if (!firstname.trim() || !lastname.trim()) {
      setError('Enter your first and last name.');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (digits.length < 6 || dial.length + digits.length > 15) {
      setError('Enter a valid mobile number.');
      return;
    }

    setError('');
    setStep('questions');
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (QUESTIONS.some((q) => !answers[q.key])) {
      setShowMissing(true);
      setError('Please answer all the questions.');
      return;
    }

    setError('');
    setRequest(
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          email: email.trim(),
          mobile: `+${dial}${digits}`,
          country_code: country,
          answers,
        }),
      }).then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? GENERIC_ERROR);
        trackPixel('Lead');
        return safeUrl(data?.data?.autologin_url);
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
          ← Back to your details
        </button>
        <h2 className="mt-2 font-display text-[22px] font-bold tracking-tight">
          A few quick questions
        </h2>
        <p className="mt-1 text-[15px] text-muted xshort:hidden">
          This helps us prepare the right account for you.
        </p>

        <form onSubmit={submit} noValidate className="mt-4">
          <div className="-mr-3 max-h-[calc(100dvh-420px)] space-y-4 overflow-y-auto pr-3 pb-5 [mask-image:linear-gradient(to_bottom,black_calc(100%-28px),transparent)] [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]">
            {QUESTIONS.map((q) => {
              const missing = showMissing && !answers[q.key];
              return (
                <fieldset key={q.key}>
                  <legend className="text-[14px] font-semibold leading-snug">
                    {q.label} <span className="text-danger">*</span>
                  </legend>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {q.options.map((option) => {
                      const checked = answers[q.key] === option;
                      return (
                        <label
                          key={option}
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
                            value={option}
                            checked={checked}
                            onChange={() =>
                              setAnswers((a) => ({ ...a, [q.key]: option }))
                            }
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
                          {option}
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
          <SubmitButton label="Submit" />
        </form>
      </>
    );
  }

  return (
    <>
      <h2 className="font-display text-[22px] font-bold tracking-tight">
        Continue to your account
      </h2>
      <p className="mt-2 text-[15px] text-muted xshort:hidden">
        Enter your details to continue securely.
      </p>

      <form
        onSubmit={continueToQuestions}
        noValidate
        className="mt-6 space-y-3.5 short:mt-4 short:space-y-2.5"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstname" className="text-[13px] font-semibold">
              First name
            </label>
            <input
              id="firstname"
              autoComplete="given-name"
              placeholder="John"
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
              className={`${inputClass} mt-1.5 w-full`}
            />
          </div>
          <div>
            <label htmlFor="lastname" className="text-[13px] font-semibold">
              Last name
            </label>
            <input
              id="lastname"
              autoComplete="family-name"
              placeholder="Doe"
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              className={`${inputClass} mt-1.5 w-full`}
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="text-[13px] font-semibold">
            Email address
          </label>
          <div className="relative mt-1.5">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle"
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
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputClass} w-full pl-10`}
            />
          </div>
        </div>
        <div>
          <label htmlFor="country" className="text-[13px] font-semibold">
            Country
          </label>
          <div className="relative mt-1.5">
            <select
              id="country"
              autoComplete="country"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                countryTouched.current = true;
              }}
              className={`${inputClass} w-full cursor-pointer appearance-none pr-10`}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
        <div>
          <label htmlFor="mobile" className="text-[13px] font-semibold">
            Mobile number
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-1.5 border-r border-line pl-3.5 pr-3 text-[15px] text-muted">
              <span className="text-[11px] font-semibold text-subtle">
                {country}
              </span>
              <span className="font-medium text-fg">+{dial}</span>
            </span>
            <input
              id="mobile"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="416 555 1234"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ paddingLeft: `${4.25 + dial.length * 0.55}rem` }}
              className={`${inputClass} w-full`}
            />
          </div>
        </div>
        <ErrorText message={error} />
        <SubmitButton label="Continue" />
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
        Protected by 256-bit encryption
      </p>
      <p className="mt-4 text-xs short:mt-3 leading-relaxed text-subtle">
        By continuing you agree to the{' '}
        <a href="#" className="text-muted hover:text-fg">
          Terms
        </a>{' '}
        and{' '}
        <a href="#" className="text-muted hover:text-fg">
          Privacy Policy
        </a>
        . We may contact you by email or phone about your account.
      </p>
    </>
  );
}

// Only follow http(s) links from the CRM response.
function safeUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

const STAGES = [
  'Verifying your email',
  'Securing your connection',
  'Checking account access',
  'Preparing your account',
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

      <h2 className="mt-5 font-display short:mt-3 text-[22px] font-bold tracking-tight">
        Preparing your account
      </h2>
      <p className="mt-2 text-[15px] text-muted">
        Signing in as{' '}
        <span className="font-mono font-semibold text-fg">
          {maskEmail(email)}
        </span>
        . Please keep this page open.
      </p>

      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-linear-to-r from-accent-2 to-accent transition-[width] duration-150 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[13px]">
        <span className="text-muted">
          {progress < 100 ? `${STAGES[activeStage]}…` : 'Redirecting…'}
        </span>
        <span className="font-mono font-semibold text-accent">{progress}%</span>
      </div>

      <ul className="mt-5 space-y-3.5 short:mt-4 short:space-y-2.5 short:p-4 rounded-xl border border-line bg-surface-2/60 p-5 text-left text-[15px]">
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
        Raw spreads from 0.0pts
      </p>
      <button
        type="button"
        onClick={onCancel}
        className="mt-4 text-[15px] font-semibold text-accent hover:underline"
      >
        ← Use different details
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
        className="size-4"
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
