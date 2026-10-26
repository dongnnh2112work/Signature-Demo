-- Apply AFTER this PR is deployed AND SUPABASE_SERVICE_ROLE_KEY
-- is set on Vercel (server-only, never NEXT_PUBLIC_).
-- Do not run this before the service role key exists: Key Moment
-- writes currently rely on the anon UPDATE policy on event_state.
--
-- Effect:
--   * event_state: anon/authenticated may SELECT (LED wall + Realtime)
--     but may no longer INSERT or UPDATE. Admin toggles go through
--     /api/key-moment with a signed cookie, then the service role.
--   * signatures: DELETE stays server-only. Migration 002 was
--     intentionally never applied; this file does not add a public
--     delete policy. Guest SELECT + INSERT on signatures is unchanged.

drop policy if exists "Anyone can update event state" on public.event_state;
drop policy if exists "Anyone can insert event state" on public.event_state;
