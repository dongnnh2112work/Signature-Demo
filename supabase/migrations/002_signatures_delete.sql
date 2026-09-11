create policy "Anyone can delete signatures"
  on public.signatures
  for delete
  to anon, authenticated
  using (true);
