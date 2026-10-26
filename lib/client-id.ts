export const CLIENT_ID_HEADER = "x-client-id";
export const CLIENT_ID_STORAGE_KEY = "km-client-id";

/** Random client id from the guest device. 8–64 url-safe characters. */
export function parseClientId(raw: string | null | undefined) {
  if (!raw) {
    return null;
  }
  const id = raw.trim();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    return null;
  }
  return id;
}

export function createClientId() {
  return crypto.randomUUID();
}

export function getOrCreateClientId() {
  if (typeof window === "undefined") {
    return createClientId();
  }
  try {
    const existing = parseClientId(window.localStorage.getItem(CLIENT_ID_STORAGE_KEY));
    if (existing) {
      return existing;
    }
    const next = createClientId();
    window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, next);
    return next;
  } catch {
    return createClientId();
  }
}
