create type public.viewer_layout_mode as enum ('fixed', 'free');

create table public.viewer_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 80),
  layout_mode public.viewer_layout_mode not null default 'fixed',
  fixed_columns integer not null default 2 check (fixed_columns between 1 and 8),
  fixed_rows integer not null default 1 check (fixed_rows between 1 and 8),
  sessions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.viewer_sessions enable row level security;

create policy "viewer sessions owner all" on public.viewer_sessions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
