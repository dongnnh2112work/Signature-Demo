import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminPin } from "@/lib/admin";

export async function GET() {
  const jar = await cookies();
  return NextResponse.json({ ok: jar.get(ADMIN_COOKIE)?.value === "1" });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { pin?: unknown };
  const pin = typeof body.pin === "string" ? body.pin : "";
  if (pin !== getAdminPin()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
