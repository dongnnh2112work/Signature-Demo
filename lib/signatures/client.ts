"use client";

import { realtimeNeedsRefetch } from "@/lib/realtime";
import {
  SIGNATURE_FETCH_PAGE,
  hasMoreSignatureRows,
  signatureRange,
} from "@/lib/signatures/pages";
import {
  getSupabaseBrowserClient,
  preferLocalDataStore,
} from "@/lib/supabase/client";
import type { SignatureRow } from "@/lib/supabase/types";
import { messageFromRow } from "@/lib/wish";

function toPublic(row: {
  id: string;
  created_at: string;
  message?: string | null;
  svg?: string | null;
}): SignatureRow {
  const message = messageFromRow(row);
  return {
    id: row.id,
    created_at: row.created_at,
    message,
    svg: message ? undefined : row.svg || undefined,
  };
}

export async function insertSignature(message: string) {
  const res = await fetch("/api/signatures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    throw new Error("insert failed");
  }
}

export async function listSignatures(after?: string): Promise<SignatureRow[]> {
  if (!preferLocalDataStore()) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new Error("missing supabase");
    }
    const rows: SignatureRow[] = [];
    let offset = 0;
    for (let page = 0; page < 100; page += 1) {
      const { from, to } = signatureRange(offset);
      let query = supabase
        .from("signatures")
        .select("id, svg, created_at")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
      if (after) {
        query = query.gt("created_at", after);
      }
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      const batch = (data ?? []).map(toPublic);
      rows.push(...batch);
      if (!hasMoreSignatureRows(batch.length, SIGNATURE_FETCH_PAGE)) {
        break;
      }
      offset += SIGNATURE_FETCH_PAGE;
    }
    return rows;
  }

  const params = after ? `?after=${encodeURIComponent(after)}` : "";
  const res = await fetch(`/api/signatures${params}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("list failed");
  }
  const body = (await res.json()) as { rows?: SignatureRow[] } | SignatureRow[];
  if (Array.isArray(body)) {
    return body.map(toPublic);
  }
  return (body.rows ?? []).map(toPublic);
}

export async function deleteSignature(id: string) {
  const res = await fetch(`/api/signatures?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(body.error || "delete failed");
  }
}

export async function clearSignatures() {
  const res = await fetch("/api/signatures", { method: "DELETE" });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(body.error || "clear failed");
  }
}

export function subscribeSignatures(
  onInsert: (row: SignatureRow) => void,
  onRemove?: (id: string) => void,
  options?: { onReconnect?: () => void },
): () => void {
  if (!preferLocalDataStore()) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return () => {};
    }

    let cancelled = false;
    let disconnected = false;
    const channel = supabase
      .channel("signatures-wall")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "signatures" },
        (payload) => {
          onInsert(toPublic(payload.new as SignatureRow));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "signatures" },
        (payload) => {
          const row = payload.old as { id?: string };
          if (row.id) {
            onRemove?.(row.id);
          } else {
            options?.onReconnect?.();
          }
        },
      )
      .subscribe((status) => {
        if (cancelled) {
          return;
        }
        const next = realtimeNeedsRefetch(status, disconnected);
        disconnected = next.disconnected;
        if (next.refetch) {
          options?.onReconnect?.();
        }
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }

  const poll = () => {
    if (options?.onReconnect) {
      options.onReconnect();
      return;
    }
    void listSignatures()
      .then((rows) => {
        for (const row of rows) {
          onInsert(row);
        }
      })
      .catch(() => {
        // Keep the wall up; the next poll retries.
      });
  };

  const timer = window.setInterval(poll, 1500);
  return () => window.clearInterval(timer);
}
