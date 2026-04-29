create table public.viewer_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 80),
  layers jsonb not null default '[]'::jsonb,
  active_layer_id text not null default 'layer-1',
  global_timer_seconds integer not null default 10 check (global_timer_seconds between 1 and 120),
  slots jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.viewer_templates enable row level security;

create policy "viewer templates owner all" on public.viewer_templates
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
