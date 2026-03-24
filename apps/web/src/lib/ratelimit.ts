// lib/ratelimit.ts — simple in-memory rate limiter (per IP, per endpoint)
// Suitable for low-traffic, single-instance deployments (Railway/Node.js).

interface Bucket {
  count:   number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Prune expired buckets every 100 writes to prevent unbounded memory growth.
let writeCount = 0;
function maybePrune() {
  if (++writeCount < 100) return;
  writeCount = 0;
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (now >= bucket.resetAt) store.delete(key);
  }
}

/**
 * Returns true if the request should be blocked.
 *
 * @param key      Unique key per (endpoint + IP), e.g. "mc-auth:1.2.3.4"
 * @param limit    Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now    = Date.now();
  const bucket = store.get(key);

  if (!bucket || now >= bucket.resetAt) {
    maybePrune();
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  if (bucket.count > limit) return true;

  return false;
}
