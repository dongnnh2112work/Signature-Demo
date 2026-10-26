/**
 * Temporary DEMO MODE for a live client walkthrough.
 *
 * Server-only. Do not prefix with NEXT_PUBLIC_ and do not import this
 * module from Client Components — the flag is read on the server and
 * exposed to the admin UI via GET /api/admin/session.
 *
 * On when:
 *   1. DEMO_OPEN_ADMIN=1  (explicit, even if ADMIN_PIN is set)
 *   2. ADMIN_PIN is unset / blank  (zero-env path; owner cannot set Vercel env today)
 *
 * Off (secure default of this PR — PIN required):
 *   ADMIN_PIN is set AND DEMO_OPEN_ADMIN is not exactly "1".
 *
 * Setting ADMIN_PIN immediately restores PIN login on the next request.
 * DELETE is never opened by demo mode (still requires a signed admin cookie).
 */

export const DEMO_OPEN_ADMIN_FLAG = "1";

export const DEMO_ADMIN_BANNER =
  "DEMO MODE – admin không khoá. Đặt ADMIN_PIN trước sự kiện thật.";

export type DemoEnv = {
  DEMO_OPEN_ADMIN?: string;
  ADMIN_PIN?: string;
};

type EnvLike = DemoEnv | NodeJS.ProcessEnv | Record<string, string | undefined>;

export type AdminAction = "desk" | "key-moment" | "delete";

export type KeyMomentWriteStrategy = "local" | "service" | "anon-update";

export function isDemoOpenAdmin(env: EnvLike = process.env): boolean {
  if (env.DEMO_OPEN_ADMIN === DEMO_OPEN_ADMIN_FLAG) {
    return true;
  }
  return !env.ADMIN_PIN?.trim();
}

/** Desk + Key Moment may open in demo; DELETE never skips auth. */
export function allowAdminAction(
  action: AdminAction,
  input: { tokenValid: boolean; env?: EnvLike },
): boolean {
  if (action === "delete") {
    return input.tokenValid;
  }
  return input.tokenValid || isDemoOpenAdmin(input.env);
}

export function adminSessionView(input: {
  tokenValid: boolean;
  canDeleteWithAuth: boolean;
  env?: EnvLike;
}) {
  const env = input.env;
  const demo = isDemoOpenAdmin(env);
  return {
    ok: allowAdminAction("desk", { tokenValid: input.tokenValid, env }),
    demo,
    demoBanner: demo ? DEMO_ADMIN_BANNER : null,
    canDelete: input.tokenValid && input.canDeleteWithAuth,
    keyMomentAllowed: allowAdminAction("key-moment", {
      tokenValid: input.tokenValid,
      env,
    }),
    deleteAllowed: allowAdminAction("delete", {
      tokenValid: input.tokenValid,
      env,
    }),
  };
}

/**
 * Key Moment write path. Demo mode does not change this:
 * service role if present, else anon UPDATE (valid until migration 004),
 * else the local file/memory store when Supabase is not configured.
 */
export function keyMomentWriteStrategy(input: {
  hasSupabaseConfig: boolean;
  hasServiceRole: boolean;
}): KeyMomentWriteStrategy {
  if (!input.hasSupabaseConfig) {
    return "local";
  }
  if (input.hasServiceRole) {
    return "service";
  }
  return "anon-update";
}
