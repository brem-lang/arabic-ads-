// Ported from arabic-trading-spark-arab-only (in-memory part only).

/** A limit of `limit` hits per `windowMs` for one key. */
export type RateRule = { limit: number; windowMs: number };

const hits = new Map<string, { start: number; count: number; windowMs: number }>();

/**
 * Fixed-window counter in this server process's memory. On serverless hosts each instance
 * counts separately, so this is a soft limit; the CRM also rejects repeat leads from one IP.
 */
export function isRateLimited(key: string, rule: RateRule, now = Date.now()): boolean {
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (now - v.start >= v.windowMs) hits.delete(k);
  }
  const entry = hits.get(key);
  if (!entry || now - entry.start >= entry.windowMs) {
    hits.set(key, { start: now, count: 1, windowMs: rule.windowMs });
    return false;
  }
  entry.count++;
  return entry.count > rule.limit;
}
