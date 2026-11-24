import { isIP } from 'node:net';
import { waitUntil } from '@vercel/functions';
import { timingReport } from './form-timing-report';
import { leadSubmissionSchema, toCrmPayload, type LeadSubmission } from './lead-schema';
import { isRateLimited, type RateRule } from './rate-limit';

// Server-only. Ported from arabic-trading-spark-arab-only (src/lib/lead-proxy.server.ts):
// the browser posts leads to /api/submit-lead, and this adds the visitor IP and the CRM API key.

/** Lead submits allowed per visitor IP (the CRM also rejects a second lead from one IP per 24h). */
export const LEAD_RATE_RULE: RateRule = { limit: 5, windowMs: 10 * 60_000 };

const MAX_BODY_BYTES = 8_192;
const CRM_TIMEOUT_MS = 15_000;
const LOG_TIMEOUT_MS = 10_000;
const DEFAULT_LOG_ENDPOINT = 'https://alphamastercrm.online/api/leads-logs';
/** Identifies this site's leads in the leads log. */
const OFFER_NAME = 'meta fb ads';

export type CrmConfig = {
  endpoint?: string | undefined;
  apiKey?: string | undefined;
  /** Local dev only: IP to send when there is no proxy header. */
  devIp?: string | undefined;
  /** Leads log: gets a copy of the CRM payload for every lead the CRM accepted. */
  logEndpoint?: string | undefined;
  logApiKey?: string | undefined;
};

/** Server-only settings (never NEXT_PUBLIC_*, so the API key is not bundled into the page). */
export function crmConfig(): CrmConfig {
  return {
    endpoint: process.env.BASE_ENDPOINT,
    apiKey: process.env.BASE_API_KEY,
    devIp:
      process.env.NODE_ENV !== 'production'
        ? process.env.DEV_IP_ADDRESS || '127.0.0.1'
        : undefined,
    logEndpoint: process.env.LEADS_LOG_ENDPOINT || DEFAULT_LOG_ENDPOINT,
    logApiKey: process.env.LEADS_LOG_API_KEY,
  };
}

/**
 * Sends the CRM payload to the leads log. Runs only after the CRM accepted the lead and never
 * throws, so it cannot break the visitor's response.
 */
export async function sendLeadLog(
  payload: ReturnType<typeof toCrmPayload>,
  timing: LeadSubmission['timing'],
  config: CrmConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!config.logEndpoint || !config.logApiKey) {
    console.warn('lead log: skipped, LEADS_LOG_ENDPOINT or LEADS_LOG_API_KEY is not set');
    return;
  }
  try {
    const res = await fetchImpl(config.logEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.logApiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email: payload.email,
        offer_name: OFFER_NAME,
        ip_address: payload.ip_address,
        data: { ...payload, timing: timing ? timingReport(timing) : undefined },
      }),
      signal: AbortSignal.timeout(LOG_TIMEOUT_MS),
    });
    if (res.ok) console.log(`lead log: sent status=${res.status}`);
    else console.warn(`lead log: rejected status=${res.status} ${(await res.text()).slice(0, 300)}`);
  } catch (err) {
    console.warn('lead log: request failed', (err as Error).name);
  }
}

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

/**
 * The visitor's real IP, or '' when it can't be determined.
 * This site is hosted on Vercel, which overwrites x-forwarded-for with the connecting client's IP,
 * so only that header is trusted. (The reference repo reads CF-Connecting-IP / X-Real-IP first
 * because it runs behind Cloudflare + nginx; on Vercel anyone could send those headers.)
 */
export function clientIp(headers: Headers): string {
  const ip = (headers.get('x-forwarded-for')?.split(',')[0] ?? '').trim().replace(/^::ffff:/i, '');
  return isPublicIp(ip) ? ip : '';
}

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

type CrmResponse = {
  success?: boolean;
  message?: unknown;
  autologin_url?: unknown;
  data?: { autologin_url?: unknown };
};

/** POST /api/submit-lead. Status codes stay below 502/504, as in the reference repo. */
export async function handleSubmitLead(
  request: Request,
  config: CrmConfig = crmConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return json(415, { success: false });
  }

  const ip = clientIp(request.headers) || config.devIp || '';
  if (!ip) {
    console.error('lead submit: no public client IP in x-forwarded-for');
    return json(400, { success: false });
  }
  if (isRateLimited(`lead:${ip}`, LEAD_RATE_RULE)) {
    return json(429, { success: false });
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json(413, { success: false });
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return json(400, { success: false });
  }

  const parsed = leadSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return json(422, {
      success: false,
      errors: parsed.error.issues.map((i) => i.path.join('.')),
    });
  }

  if (!config.endpoint || !config.apiKey) {
    console.error('lead submit: BASE_ENDPOINT or BASE_API_KEY is not set');
    return json(503, { success: false });
  }

  const payload = toCrmPayload(parsed.data, ip);
  try {
    const res = await fetchImpl(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(CRM_TIMEOUT_MS),
    });
    const body = await res.text();
    let result: CrmResponse = {};
    try {
      result = JSON.parse(body) as CrmResponse;
    } catch {
      // not JSON; handled below
    }
    // One line per lead, no personal data.
    const sent = `country_code=${payload.country_code}`;
    if (!res.ok || result.success === false) {
      console.warn(`lead submit: ${sent} → CRM rejected status=${res.status} ${body.slice(0, 300)}`);
      return json(res.status === 409 ? 409 : 422, { success: false });
    }
    console.log(`lead submit: ${sent} → accepted`);
    // Only accepted leads go to the leads log. Not awaited, so it cannot delay the response;
    // waitUntil keeps the Vercel function alive until it finishes.
    waitUntil(sendLeadLog(payload, parsed.data.timing, config, fetchImpl));
    return json(200, {
      success: true,
      autologin_url: result.autologin_url ?? result.data?.autologin_url,
    });
  } catch (err) {
    console.error('lead submit: CRM request failed', err);
    return json(503, { success: false });
  }
}
