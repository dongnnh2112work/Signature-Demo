"use client";

import {
  getSupabaseBrowserClient,
  preferLocalDataStore,
} from "@/lib/supabase/client";

const ROW_ID = "key_moment";

async function readLocal() {
  const res = await fetch("/api/key-moment", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("key moment read failed");
  }
  const body = (await res.json()) as { active?: boolean };
  return Boolean(body.active);
}

export async function setKeyMoment(active: boolean) {
  const res = await fetch("/api/key-moment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(body.error || "key moment write failed");
  }
}

export function subscribeKeyMoment(onChange: (active: boolean) => void) {
  let cancelled = false;
  let cleanup = () => {};

  if (preferLocalDataStore()) {
    const poll = () => {
      void readLocal()
        .then((active) => {
          if (!cancelled) {
            onChange(active);
          }
        })
        .catch(() => {
          // Keep the current scene; the next poll retries.
        });
    };
    poll();
    const timer = window.setInterval(poll, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return () => {};
  }

  void supabase
    .from("event_state")
    .select("active")
    .eq("id", ROW_ID)
    .maybeSingle()
    .then(({ data, error }) => {
      if (cancelled || error) {
        return;
      }
      onChange(Boolean(data?.active));
    });

  const channel = supabase
    .channel("event-state-key-moment")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "event_state",
        filter: `id=eq.${ROW_ID}`,
      },
      (payload) => {
        const next = payload.new as { active?: boolean };
        onChange(Boolean(next.active));
      },
    )
    .subscribe();

  cleanup = () => {
    void supabase.removeChannel(channel);
  };

  return () => {
    cancelled = true;
    cleanup();
  };
}
