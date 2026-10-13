import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/admin";
import { getLocalKeyMoment, setLocalKeyMoment } from "@/lib/key-moment/store";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ active: getLocalKeyMoment() });
}

export async function POST(request: Request) {
  const jar = await cookies();
  if (jar.get(ADMIN_COOKIE)?.value !== "1") {
    return Response.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json()) as { active?: unknown };
  const active = setLocalKeyMoment(Boolean(body.active));
  return Response.json({ active });
}
