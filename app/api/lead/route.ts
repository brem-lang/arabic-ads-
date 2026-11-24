import { isIP } from 'node:net';
import type { NextRequest } from 'next/server';
import { COUNTRY_BY_CODE } from '../../lib/countries';
import { QUESTIONS } from '../../lib/questions';

const OFFER_NAME = 'meta fb ads';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_RE = /^\+\d{7,15}$/;

// Loopback, private-network and link-local addresses aren't a usable visitor IP.
function isPublicIp(ip: string) {
  const version = isIP(ip);
  if (version === 0) return false;
  if (version === 6) {
    const v6 = ip.toLowerCase();
    return !(v6 === '::1' || v6 === '::' || /^(fc|fd|fe80)/.test(v6));
  }
  const [a, b] = ip.split('.').map(Number);
  return !(
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

// The visitor's real IP, or '' when it can't be determined.
// Only x-forwarded-for is trusted: Vercel overwrites it with the connecting client's
// IP, so visitors can't spoof it. Other headers (cf-connecting-ip, x-real-ip) are
// ignored because anyone can send them. This assumes the domain's DNS points straight
// to Vercel (Cloudflare proxy OFF); if a proxy is ever put in front, this header will
// hold the proxy's IP and the trusted header must change.
function getClientIp(request: NextRequest) {
  const ip = (request.headers.get('x-forwarded-for')?.split(',')[0] ?? '')
    .trim()
    .replace(/^::ffff:/i, '');
  return isPublicIp(ip) ? ip : '';
}

function str(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const payload = {
    firstname: str(body.firstname),
    lastname: str(body.lastname),
    email: str(body.email).toLowerCase(),
    mobile: str(body.mobile),
    country_code: str(body.country_code).toUpperCase(),
    offer_name: OFFER_NAME,
    ip_address: getClientIp(request),
    questions: QUESTIONS.map((q) => ({
      key: q.key,
      value: str(body.answers?.[q.key]),
    })),
  };

  if (
    payload.questions.some(
      (a, i) => a.value && !QUESTIONS[i].options.includes(a.value),
    ) ||
    !payload.firstname ||
    !payload.lastname ||
    !EMAIL_RE.test(payload.email) ||
    !MOBILE_RE.test(payload.mobile) ||
    !COUNTRY_BY_CODE.has(payload.country_code)
  ) {
    return Response.json(
      { error: 'Please check your details and try again.' },
      { status: 422 },
    );
  }

  // Never send a lead without the visitor's real IP in production.
  // In local dev there's no proxy, so the IP is always empty; let it through.
  if (!payload.ip_address && process.env.NODE_ENV === 'production') {
    console.error('[lead] rejected: no public client IP in x-forwarded-for');
    return Response.json(
      { error: "We couldn't verify your connection. Please try again." },
      { status: 400 },
    );
  }

  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[lead] LEAD_WEBHOOK_URL not set, payload:', payload);
    return Response.json({ ok: true });
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.LEAD_WEBHOOK_TOKEN && {
        'Api-Key': process.env.LEAD_WEBHOOK_TOKEN,
      }),
    },
    body: JSON.stringify(payload),
  }).catch((err) => {
    console.error('[lead] webhook request failed:', err);
    return null;
  });

  if (!res?.ok) {
    const text = (await res?.text().catch(() => '')) ?? '';
    console.error('[lead] webhook responded with', res?.status, text);

    // Show the CRM's own reason (e.g. a duplicate or invalid field) when it gives one.
    let reason = '';
    try {
      reason = 'Registration failed, Please try again later.';
    } catch {}
    if (/no eligible advertisers/i.test(reason)) {
      reason = 'Unavailable in your region. Please check back later.';
    }

    return Response.json(
      { error: reason || "We couldn't submit your details. Please try again." },
      { status: 502 },
    );
  }

  // Pass the CRM's response (lead_id, request_id, autologin_url, ...) through to the browser.
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { success: true });
}
