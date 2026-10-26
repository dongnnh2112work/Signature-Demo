import "server-only";

import { sanitizeMessage, sanitizeSvgMarkup } from "@/lib/sanitize";
import {
  addLocalSignature,
  clearLocalSignatures,
  deleteLocalSignature,
} from "@/lib/signatures/local-store";
import {
  getSupabaseAnonServerClient,
  getSupabaseServiceClient,
  hasSupabaseConfig,
  SERVICE_ROLE_MISSING,
} from "@/lib/supabase/server";
import { messageFromRow, messageToSvg } from "@/lib/wish";

export function parseWishBody(body: { message?: unknown; svg?: unknown }) {
  let message =
    typeof body.message === "string" ? sanitizeMessage(body.message) : "";

  if (!message && typeof body.svg === "string") {
    const safe = sanitizeSvgMarkup(body.svg);
    if (!safe) {
      return { error: "invalid signature" as const };
    }
    message = sanitizeMessage(messageFromRow({ svg: safe }));
  }

  return { message };
}

export async function insertWish(message: string) {
  const anon = getSupabaseAnonServerClient();
  if (anon) {
    const { data, error } = await anon
      .from("signatures")
      .insert({ svg: messageToSvg(message) })
      .select("id, created_at, svg")
      .single();
    if (error || !data) {
      return { error: error?.message ?? "insert failed", status: 500 as const };
    }
    return {
      row: {
        id: data.id as string,
        created_at: data.created_at as string,
        message: messageFromRow(data),
      },
    };
  }

  return { row: addLocalSignature(message) };
}

export async function deleteWish(id?: string | null) {
  if (!hasSupabaseConfig()) {
    if (id) {
      deleteLocalSignature(id);
    } else {
      clearLocalSignatures();
    }
    return { ok: true as const };
  }

  const service = getSupabaseServiceClient();
  if (!service) {
    return { error: SERVICE_ROLE_MISSING, status: 503 as const };
  }

  const query = id
    ? service.from("signatures").delete().eq("id", id)
    : service.from("signatures").delete().gte("created_at", "1970-01-01");
  const { error } = await query;
  if (error) {
    return { error: error.message, status: 500 as const };
  }
  return { ok: true as const };
}
