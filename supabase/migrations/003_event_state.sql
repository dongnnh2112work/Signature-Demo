create table if not exists public.event_state (
  id text primary key,
  active boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.event_state (id, active)
values ('key_moment', false)
on conflict (id) do nothing;

alter table public.event_state enable row level security;

create policy "Anyone can read event state"
  on public.event_state
  for select
  to anon, authenticated
  using (true);

create policy "Anyone can update event state"
  on public.event_state
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Anyone can insert event state"
  on public.event_state
  for insert
  to anon, authenticated
  with check (true);

alter publication supabase_realtime add table public.event_state;
