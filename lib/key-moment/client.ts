"use client";

import {
  getSupabaseBrowserClient,
  useLocalDataStore,
} from "@/lib/supabase/client";

const ROW_ID = "key_moment";

function preferLocalStore() {
  return useLocalDataStore();
}

async function readLocal() {
  const res = await fetch("/api/key-moment", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("key moment read failed");
  }
  const body = (await res.json()) as { active?: boolean };
  return Boolean(body.active);
}

export async function setKeyMoment(active: boolean) {
  if (!preferLocalStore()) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new Error("missing supabase");
    }
    const { error } = await supabase.from("event_state").upsert({
      id: ROW_ID,
      active,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      throw error;
    }
    return;
  }

  const res = await fetch("/api/key-moment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) {
    throw new Error("key moment write failed");
  }
}

export function subscribeKeyMoment(onChange: (active: boolean) => void) {
  let cancelled = false;
  let cleanup = () => {};

  if (preferLocalStore()) {
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
    const timer = window.setInterval(poll, 400);
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
