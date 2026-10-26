import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminPinMissingMessage,
  createAdminToken,
  getAdminPin,
  isAdminTokenValid,
} from "@/lib/admin";
import {
  hasSupabaseConfig,
  hasSupabaseServiceRole,
} from "@/lib/supabase/server";

export async function GET() {
  const jar = await cookies();
  const ok = isAdminTokenValid(jar.get(ADMIN_COOKIE)?.value);
  return NextResponse.json({
    ok,
    canDelete:
      ok && (!hasSupabaseConfig() || hasSupabaseServiceRole()),
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

  const body = (await request.json()) as { pin?: unknown };
  const submitted = typeof body.pin === "string" ? body.pin : "";
  if (submitted !== pin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = createAdminToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: adminPinMissingMessage() },
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
