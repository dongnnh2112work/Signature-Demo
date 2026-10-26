import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
}

export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
}

/** Server-only. Never prefix with NEXT_PUBLIC_. */
export function getSupabaseServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    ""
  );
}

export function hasSupabaseConfig() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function hasSupabaseServiceRole() {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

function makeClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabaseAnonServerClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    return null;
  }
  return makeClient(url, key);
}

export function getSupabaseServiceClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    return null;
  }
  return makeClient(url, key);
}

export const SERVICE_ROLE_MISSING =
  "SUPABASE_SERVICE_ROLE_KEY is not set. Add this server-only key on Vercel (never NEXT_PUBLIC_). Admin deletes and (after migration 004) Key Moment writes need it.";
