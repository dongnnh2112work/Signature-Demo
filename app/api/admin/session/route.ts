import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminPinMissingMessage,
  adminSessionSecretMissingMessage,
  createAdminToken,
  getAdminPin,
  isAdminTokenValid,
  mustHaveSessionSecret,
  pinLoginBlocked,
  pinsMatch,
  recordPinLogin,
} from "@/lib/admin";
import { adminSessionView, isDemoOpenAdmin } from "@/lib/demo";
import { clientIp } from "@/lib/rate-limit";
import {
  hasSupabaseConfig,
  hasSupabaseServiceRole,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function GET() {
  const jar = await cookies();
  const view = adminSessionView({
    tokenValid: isAdminTokenValid(jar.get(ADMIN_COOKIE)?.value),
    canDeleteWithAuth: !hasSupabaseConfig() || hasSupabaseServiceRole(),
  });
  return NextResponse.json({
    ok: view.ok,
    demo: view.demo,
    demoBanner: view.demoBanner,
    canDelete: view.canDelete,
  });
}

export async function POST(request: Request) {
  const pin = getAdminPin();
  if (!pin) {
    return NextResponse.json(
      { ok: false, error: adminPinMissingMessage() },
      { status: 503 },
    );
  }

  const demo = isDemoOpenAdmin();
  if (mustHaveSessionSecret(demo)) {
    return NextResponse.json(
      { ok: false, error: adminSessionSecretMissingMessage() },
      { status: 503 },
    );
  }

  const ip = clientIp(request);
  if (pinLoginBlocked(ip)) {
    return NextResponse.json({ ok: false, error: "Too many attempts" }, { status: 429 });
  }

  const body = (await request.json()) as { pin?: unknown };
  const submitted = typeof body.pin === "string" ? body.pin : "";
  if (!pinsMatch(submitted, pin)) {
    const { delayMs } = recordPinLogin(ip, false);
    if (delayMs) {
      await sleep(delayMs);
    }
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  recordPinLogin(ip, true);

  const token = createAdminToken();
  if (!token) {
    if (demo) {
      return NextResponse.json({
        ok: true,
        demo: true,
        canDelete: false,
      });
    }
    return NextResponse.json(
      { ok: false, error: adminSessionSecretMissingMessage() },
      { status: 503 },
    );
  }

  const res = NextResponse.json({
    ok: true,
    canDelete: !hasSupabaseConfig() || hasSupabaseServiceRole(),
  });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
