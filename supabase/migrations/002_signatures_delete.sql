-- DO NOT APPLY on the Signature Demo project.
-- This policy would let anyone with the public anon/publishable key
-- delete every signature. Admin deletes go through /api/signatures
-- (signed cookie + SUPABASE_SERVICE_ROLE_KEY) instead.

create policy "Anyone can delete signatures"
  on public.signatures
  for delete
  to anon, authenticated
  using (true);
