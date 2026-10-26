import { getLocalKeyMoment, setLocalKeyMoment } from "@/lib/key-moment/store";
import {
  getSupabaseAnonServerClient,
  getSupabaseServiceClient,
  hasSupabaseConfig,
  SERVICE_ROLE_MISSING,
} from "@/lib/supabase/server";

export const KEY_MOMENT_ROW_ID = "key_moment";

export async function readKeyMoment() {
  const anon = getSupabaseAnonServerClient();
  if (anon) {
    const { data, error } = await anon
      .from("event_state")
      .select("active")
      .eq("id", KEY_MOMENT_ROW_ID)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return Boolean(data?.active);
  }
  return getLocalKeyMoment();
}

export async function writeKeyMoment(active: boolean) {
  if (!hasSupabaseConfig()) {
    return { active: setLocalKeyMoment(active) };
  }

  const service = getSupabaseServiceClient();
  const client = service ?? getSupabaseAnonServerClient();
  if (!client) {
    return { error: SERVICE_ROLE_MISSING, status: 503 as const };
  }

  const payload = {
    id: KEY_MOMENT_ROW_ID,
    active,
    updated_at: new Date().toISOString(),
  };

  if (service) {
    const { error } = await service.from("event_state").upsert(payload);
    if (error) {
      return { error: error.message, status: 500 as const };
    }
    return { active };
  }

  // Graceful path before SUPABASE_SERVICE_ROLE_KEY: current RLS still
  // allows anon UPDATE on event_state. After migration 004 this fails
  // closed with a clear message.
  const { error: updateError, data } = await client
    .from("event_state")
    .update({ active, updated_at: payload.updated_at })
    .eq("id", KEY_MOMENT_ROW_ID)
    .select("active")
    .maybeSingle();

  if (!updateError && data) {
    return { active: Boolean(data.active) };
  }

  const { error: upsertError } = await client.from("event_state").upsert(payload);
  if (upsertError) {
    return {
      error: `${SERVICE_ROLE_MISSING} (${upsertError.message})`,
      status: 503 as const,
    };
  }
  return { active };
}
