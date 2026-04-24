create extension if not exists "pgcrypto";

create type public.reddit_sort as enum ('top', 'hot', 'new');
create type public.reddit_time_range as enum ('hour', 'day', 'week', 'month', 'year', 'all');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feed_configs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 80),
  subreddit text not null check (subreddit ~ '^[A-Za-z0-9_]{1,80}$'),
  sort public.reddit_sort not null default 'top',
  time_range public.reddit_time_range not null default 'day',
  limit_count integer not null default 20 check (limit_count between 1 and 100),
  skip_count integer not null default 0 check (skip_count between 0 and 100),
  timer_seconds integer not null default 12 check (timer_seconds between 3 and 120),
  display_options jsonb not null default '{}'::jsonb,
  is_nsfw boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 100),
  description text,
  is_nsfw boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  feed_config_id uuid not null references public.feed_configs(id) on delete cascade,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (collection_id, feed_config_id),
  unique (collection_id, position)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);

create unique index tags_owner_lower_name_key on public.tags (owner_id, lower(name));

create table public.collection_tags (
  collection_id uuid not null references public.collections(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, tag_id)
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  slug text not null unique check (slug ~ '^[A-Za-z0-9_-]{8,80}$'),
  feed_config_id uuid references public.feed_configs(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete cascade,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((feed_config_id is not null)::integer + (collection_id is not null)::integer = 1)
);

alter table public.profiles enable row level security;
alter table public.feed_configs enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.tags enable row level security;
alter table public.collection_tags enable row level security;
alter table public.share_links enable row level security;

create function public.collection_is_shared(collection_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.share_links sl
    join public.collections c on c.id = sl.collection_id
    where sl.collection_id = collection_uuid
      and sl.is_enabled
      and (not c.is_nsfw or auth.uid() is not null)
  );
$$;

create function public.feed_config_is_shared(config_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.share_links sl
    join public.feed_configs fc on fc.id = sl.feed_config_id
    where sl.feed_config_id = config_uuid
      and sl.is_enabled
      and (not fc.is_nsfw or auth.uid() is not null)
  )
  or exists (
    select 1
    from public.collection_items ci
    join public.feed_configs fc on fc.id = ci.feed_config_id
    where ci.feed_config_id = config_uuid
      and public.collection_is_shared(ci.collection_id)
      and (not fc.is_nsfw or auth.uid() is not null)
  );
$$;

create policy "profiles owner read" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles owner update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles owner insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "feed configs owner all" on public.feed_configs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "feed configs shared metadata read" on public.feed_configs
  for select using (auth.uid() = owner_id or public.feed_config_is_shared(id));

create policy "collections owner all" on public.collections
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "collections shared metadata read" on public.collections
  for select using (auth.uid() = owner_id or public.collection_is_shared(id));

create policy "collection items owner all" on public.collection_items
  for all using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.feed_configs fc
      where fc.id = feed_config_id and fc.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.feed_configs fc
      where fc.id = feed_config_id and fc.owner_id = auth.uid()
    )
  );
create policy "collection items shared read" on public.collection_items
  for select using (
    public.collection_is_shared(collection_id)
    and exists (
      select 1 from public.feed_configs fc
      where fc.id = feed_config_id
        and (not fc.is_nsfw or auth.uid() is not null)
    )
  );

create policy "tags owner all" on public.tags
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "collection tags owner all" on public.collection_tags
  for all using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = auth.uid()
    )
  );
create policy "collection tags shared read" on public.collection_tags
  for select using (public.collection_is_shared(collection_id));

create policy "share links owner all" on public.share_links
  for all using (auth.uid() = owner_id) with check (
    auth.uid() = owner_id
    and (
      (
        feed_config_id is not null
        and exists (
          select 1 from public.feed_configs fc
          where fc.id = feed_config_id and fc.owner_id = auth.uid()
        )
      )
      or (
        collection_id is not null
        and exists (
          select 1 from public.collections c
          where c.id = collection_id and c.owner_id = auth.uid()
        )
      )
    )
  );
create policy "share links public read" on public.share_links
  for select using (
    is_enabled
    and (
      (
        feed_config_id is not null
        and exists (
          select 1 from public.feed_configs fc
          where fc.id = feed_config_id
            and (not fc.is_nsfw or auth.uid() is not null)
        )
      )
      or (
        collection_id is not null
        and exists (
          select 1 from public.collections c
          where c.id = collection_id
            and (not c.is_nsfw or auth.uid() is not null)
        )
      )
    )
  );
