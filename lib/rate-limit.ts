type Bucket = number[];

const buckets = new Map<string, Bucket>();

/** ~1 POST / 2s with a burst of 5. Still blocks extreme spam. */
export const SIGNATURE_POST_BURST = 5;
export const SIGNATURE_POST_WINDOW_MS = 10_000;

export function resetRateLimit(key?: string) {
  if (key) {
    buckets.delete(key);
    return;
  }
  buckets.clear();
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}
