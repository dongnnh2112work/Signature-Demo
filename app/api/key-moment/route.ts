import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminTokenValid } from "@/lib/admin";
import { readKeyMoment, writeKeyMoment } from "@/lib/key-moment/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ active: await readKeyMoment() });
  } catch {
    return Response.json({ active: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const jar = await cookies();
  if (!isAdminTokenValid(jar.get(ADMIN_COOKIE)?.value)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json()) as { active?: unknown };
  const result = await writeKeyMoment(Boolean(body.active));
  if ("error" in result) {
    return Response.json({ ok: false, error: result.error }, { status: result.status });
  }
  return Response.json({ active: result.active });
}
