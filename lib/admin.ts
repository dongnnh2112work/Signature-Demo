import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "km_admin";
const TOKEN_TTL_MS = 60 * 60 * 12 * 1000;

export function getAdminPin() {
  const pin = process.env.ADMIN_PIN?.trim();
  return pin ? pin : null;
}

export function adminPinMissingMessage() {
  if (process.env.NODE_ENV === "development") {
    return "ADMIN_PIN is not set. Add it to .env.local (no default PIN).";
  }
  return "Admin PIN is not configured.";
}

export function getAdminSessionSecret() {
  const secret =
    process.env.ADMIN_SESSION_SECRET?.trim() || process.env.ADMIN_PIN?.trim();
  return secret ? secret : null;
}

function hmac(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createAdminToken() {
  const secret = getAdminSessionSecret();
  if (!secret) {
    return null;
  }
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `v1.${exp}`;
  return `${payload}.${hmac(secret, payload)}`;
}

export function isAdminTokenValid(token: string | undefined) {
  if (!token) {
    return false;
  }
  const secret = getAdminSessionSecret();
  if (!secret) {
    return false;
  }
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") {
    return false;
  }
  const exp = Number(parts[1]);
  const sig = parts[2];
  if (!Number.isFinite(exp) || exp < Date.now() || !sig) {
    return false;
  }
  const payload = `v1.${exp}`;
  const expected = hmac(secret, payload);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
