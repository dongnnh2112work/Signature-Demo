create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  svg text not null check (char_length(svg) > 20),
  created_at timestamptz not null default now()
);

create index if not exists signatures_created_at_idx
  on public.signatures (created_at);

alter table public.signatures enable row level security;

create policy "Anyone can read signatures"
  on public.signatures
  for select
  to anon, authenticated
  using (true);

create policy "Anyone can insert signatures"
  on public.signatures
  for insert
  to anon, authenticated
  with check (true);

alter publication supabase_realtime add table public.signatures;
