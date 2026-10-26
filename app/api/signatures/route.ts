import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminTokenValid } from "@/lib/admin";
import { allowAdminAction, isDemoOpenAdmin } from "@/lib/demo";
import {
  SIGNATURE_POST_BURST,
  SIGNATURE_POST_WINDOW_MS,
  clientIp,
  rateLimit,
} from "@/lib/rate-limit";
import { MESSAGE_MAX_LENGTH, POST_BODY_MAX } from "@/lib/sanitize";
import {
  deleteWish,
  insertWish,
  parseWishBody,
} from "@/lib/signatures/server";
import {
  listLocalSignatures,
  localSignatureCursor,
  localSignatureTotal,
} from "@/lib/signatures/local-store";
import { messageFromRow } from "@/lib/wish";
import {
  hasSupabaseConfig,
  hasSupabaseServiceRole,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function publicRow(row: { id: string; created_at: string; message?: string; svg?: string }) {
  return {
    id: row.id,
    created_at: row.created_at,
    message: messageFromRow(row),
  };
}

export async function GET(request: Request) {
  if (hasSupabaseConfig()) {
    return Response.json(
      { error: "use supabase select" },
      { status: 404 },
    );
  }
  const after = new URL(request.url).searchParams.get("after") ?? undefined;
  const rows = listLocalSignatures(after).map(publicRow);
  return Response.json({
    rows,
    cursor: localSignatureCursor(),
    total: localSignatureTotal(),
  });
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") || "0");
  if (length > POST_BODY_MAX) {
    return Response.json({ error: "payload too large" }, { status: 413 });
  }
  if (
    !rateLimit(
      `sig:${clientIp(request)}`,
      SIGNATURE_POST_BURST,
      SIGNATURE_POST_WINDOW_MS,
    )
  ) {
    return Response.json({ error: "rate limited" }, { status: 429 });
  }

  const body = (await request.json()) as { message?: unknown; svg?: unknown };
  const parsed = parseWishBody(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const message = parsed.message;
  if (message.length < 2 || message.length > MESSAGE_MAX_LENGTH) {
    return Response.json({ error: "invalid wish" }, { status: 400 });
  }

  const result = await insertWish(message);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json(result.row, { status: 201 });
}

export async function DELETE(request: Request) {
  const jar = await cookies();
  const tokenValid = isAdminTokenValid(jar.get(ADMIN_COOKIE)?.value);
  const hasServiceRole = hasSupabaseServiceRole();
  const demo = isDemoOpenAdmin();
  if (!allowAdminAction("delete", { tokenValid, hasServiceRole })) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  const result = await deleteWish(id, { demo });
  if ("error" in result) {
    return Response.json({ ok: false, error: result.error }, { status: result.status });
  }
  return Response.json({ ok: true });
}
