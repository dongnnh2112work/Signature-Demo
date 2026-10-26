type Bucket = number[];

const buckets = new Map<string, Bucket>();

/** Per guest device (~1 POST / 2s, burst of 5). */
export const SIGNATURE_CLIENT_BURST = 5;
export const SIGNATURE_CLIENT_WINDOW_MS = 10_000;

/** Shared venue IP ceiling so ~50 phones can send at once. */
export const SIGNATURE_IP_BURST = 300;
export const SIGNATURE_IP_WINDOW_MS = 60_000;

/** @deprecated use SIGNATURE_CLIENT_BURST */
export const SIGNATURE_POST_BURST = SIGNATURE_CLIENT_BURST;
/** @deprecated use SIGNATURE_CLIENT_WINDOW_MS */
export const SIGNATURE_POST_WINDOW_MS = SIGNATURE_CLIENT_WINDOW_MS;

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

export function allowSignaturePost(input: { clientId: string | null; ip: string }) {
  const clientKey = input.clientId ?? `ip-fallback:${input.ip}`;
  if (!rateLimit(`sig:client:${clientKey}`, SIGNATURE_CLIENT_BURST, SIGNATURE_CLIENT_WINDOW_MS)) {
    return false;
  }
  if (!rateLimit(`sig:ip:${input.ip}`, SIGNATURE_IP_BURST, SIGNATURE_IP_WINDOW_MS)) {
    return false;
  }
  return true;
}
