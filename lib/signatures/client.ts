"use client";

import {
  getSupabaseBrowserClient,
  hasSupabaseConfig,
} from "@/lib/supabase/client";
import type { SignatureRow } from "@/lib/supabase/types";

export async function insertSignature(svg: string) {
  if (hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new Error("missing supabase");
    }
    const { error } = await supabase.from("signatures").insert({ svg });
    if (error) {
      throw error;
    }
    return;
  }

  const res = await fetch("/api/signatures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ svg }),
  });
  if (!res.ok) {
    throw new Error("insert failed");
  }
}

export async function listSignatures(): Promise<SignatureRow[]> {
  if (hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new Error("missing supabase");
    }
    const { data, error } = await supabase
      .from("signatures")
      .select("id, svg, created_at")
      .order("created_at", { ascending: true });
    if (error) {
      throw error;
    }
    return (data ?? []) as SignatureRow[];
  }

  const res = await fetch("/api/signatures", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("list failed");
  }
  return (await res.json()) as SignatureRow[];
}

export async function deleteSignature(id: string) {
  if (hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new Error("missing supabase");
    }
    const { error } = await supabase.from("signatures").delete().eq("id", id);
    if (error) {
      throw error;
    }
    return;
  }

  const res = await fetch(`/api/signatures?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("delete failed");
  }
}

export async function clearSignatures() {
  if (hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new Error("missing supabase");
    }
    const { error } = await supabase
      .from("signatures")
      .delete()
      .gte("created_at", "1970-01-01");
    if (error) {
      throw error;
    }
    return;
  }

  const res = await fetch("/api/signatures", { method: "DELETE" });
  if (!res.ok) {
    throw new Error("clear failed");
  }
}

export function subscribeSignatures(
  onInsert: (row: SignatureRow) => void,
): () => void {
  if (hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return () => {};
    }

    const channel = supabase
      .channel("signatures-wall")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "signatures" },
        (payload) => {
          onInsert(payload.new as SignatureRow);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }

  const timer = window.setInterval(() => {
    void listSignatures()
      .then((rows) => {
        for (const row of rows) {
          onInsert(row);
        }
      })
      .catch(() => {
        // Keep the wall up; the next poll retries.
      });
  }, 1000);

  return () => window.clearInterval(timer);
}
