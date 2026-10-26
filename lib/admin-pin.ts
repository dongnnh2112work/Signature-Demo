import { createHash, timingSafeEqual } from "node:crypto";

export const PIN_FAIL_LIMIT = 5;
export const PIN_LOCK_MS = 15_000;
export const PIN_FAIL_DELAY_MS = 250;

type Attempt = { fails: number; lockedUntil: number };

const pinAttempts = new Map<string, Attempt>();

export function getAdminPin(env: NodeJS.ProcessEnv = process.env) {
  const pin = env.ADMIN_PIN?.trim();
  return pin ? pin : null;
}

/** HMAC cookie key. Never falls back to ADMIN_PIN. */
export function getAdminSessionSecret(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.ADMIN_SESSION_SECRET?.trim();
  return secret ? secret : null;
}

export function adminPinMissingMessage(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "development") {
    return "ADMIN_PIN is not set. Add it to .env.local (no default PIN).";
  }
  return "Admin PIN is not configured.";
}

export function adminSessionSecretMissingMessage(
  env: NodeJS.ProcessEnv = process.env,
) {
  if (env.NODE_ENV === "development") {
    return "ADMIN_SESSION_SECRET is not set. Add it to .env.local (do not reuse ADMIN_PIN).";
  }
  return "Admin session secret is not configured.";
}

/** Constant-time PIN compare via equal-length SHA-256 digests. */
export function pinsMatch(submitted: string, expected: string) {
  const left = createHash("sha256").update(submitted, "utf8").digest();
  const right = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(left, right);
}

export function pinLoginBlocked(key: string, now = Date.now()) {
  const row = pinAttempts.get(key);
  return Boolean(row && row.lockedUntil > now);
}

export function recordPinLogin(key: string, ok: boolean, now = Date.now()) {
  if (ok) {
    pinAttempts.delete(key);
    return { delayMs: 0, locked: false as const };
  }
  const prev = pinAttempts.get(key);
  const fails = (prev?.fails ?? 0) + 1;
  const locked = fails >= PIN_FAIL_LIMIT;
  pinAttempts.set(key, {
    fails,
    lockedUntil: locked ? now + PIN_LOCK_MS : 0,
  });
  return { delayMs: PIN_FAIL_DELAY_MS, locked };
}

export function resetPinLoginAttempts() {
  pinAttempts.clear();
}

/** Outside demo mode a missing ADMIN_SESSION_SECRET is a hard 503. */
export function mustHaveSessionSecret(
  demo: boolean,
  env: NodeJS.ProcessEnv = process.env,
) {
  return !demo && !getAdminSessionSecret(env);
}
