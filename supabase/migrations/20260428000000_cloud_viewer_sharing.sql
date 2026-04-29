alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists cloud_quota_bytes bigint not null default 5242880
    check (cloud_quota_bytes >= 0);

alter table public.viewer_sessions
  add column if not exists layers jsonb not null default '[]'::jsonb,
  add column if not exists active_layer_id text not null default 'layer-1',
  add column if not exists metadata_bytes bigint not null default 0
    check (metadata_bytes >= 0);

alter table public.viewer_templates
  add column if not exists metadata_bytes bigint not null default 0
    check (metadata_bytes >= 0);

alter table public.viewer_sessions
  drop constraint if exists viewer_sessions_fixed_columns_check,
  drop constraint if exists viewer_sessions_fixed_rows_check,
  add constraint viewer_sessions_fixed_columns_check
    check (fixed_columns between 1 and 16),
  add constraint viewer_sessions_fixed_rows_check
    check (fixed_rows between 1 and 16);

alter table public.share_links
  add column if not exists viewer_session_id uuid
    references public.viewer_sessions(id) on delete cascade,
  add column if not exists viewer_template_id uuid
    references public.viewer_templates(id) on delete cascade;

alter table public.share_links
  drop constraint if exists share_links_check,
  add constraint share_links_single_target_check check (
    (feed_config_id is not null)::integer +
    (collection_id is not null)::integer +
    (viewer_session_id is not null)::integer +
    (viewer_template_id is not null)::integer = 1
  );

create or replace function public.viewer_session_has_local_sources(sessions_json jsonb)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(sessions_json, '[]'::jsonb)) session
    where session -> 'sourceConfig' ->> 'kind' = 'local'
  );
$$;

create or replace function public.reject_viewer_session_local_sources()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.viewer_session_has_local_sources(new.sessions) then
    raise exception 'Cloud layouts cannot include local file sources';
  end if;

  return new;
end;
$$;

drop trigger if exists reject_viewer_session_local_sources_trigger
  on public.viewer_sessions;

create trigger reject_viewer_session_local_sources_trigger
  before insert or update on public.viewer_sessions
  for each row
  execute function public.reject_viewer_session_local_sources();

create or replace function public.enforce_cloud_metadata_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row record;
  used_bytes bigint;
  next_bytes bigint;
begin
  select is_admin, cloud_quota_bytes
  into profile_row
  from public.profiles
  where id = new.owner_id;

  if coalesce(profile_row.is_admin, false) then
    return new;
  end if;

  if tg_table_name = 'viewer_sessions' then
    select
      coalesce((select sum(metadata_bytes) from public.viewer_sessions where owner_id = new.owner_id and id <> new.id), 0) +
      coalesce((select sum(metadata_bytes) from public.viewer_templates where owner_id = new.owner_id), 0)
    into used_bytes;
  else
    select
      coalesce((select sum(metadata_bytes) from public.viewer_sessions where owner_id = new.owner_id), 0) +
      coalesce((select sum(metadata_bytes) from public.viewer_templates where owner_id = new.owner_id and id <> new.id), 0)
    into used_bytes;
  end if;

  next_bytes := used_bytes + coalesce(new.metadata_bytes, 0);

  if next_bytes > coalesce(profile_row.cloud_quota_bytes, 5242880) then
    raise exception 'Cloud metadata quota exceeded';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_viewer_session_cloud_quota_trigger
  on public.viewer_sessions;
drop trigger if exists enforce_viewer_template_cloud_quota_trigger
  on public.viewer_templates;

create trigger enforce_viewer_session_cloud_quota_trigger
  before insert or update on public.viewer_sessions
  for each row
  execute function public.enforce_cloud_metadata_quota();

create trigger enforce_viewer_template_cloud_quota_trigger
  before insert or update on public.viewer_templates
  for each row
  execute function public.enforce_cloud_metadata_quota();

drop policy if exists "share links owner all" on public.share_links;
drop policy if exists "share links public read" on public.share_links;

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
      or (
        viewer_session_id is not null
        and exists (
          select 1 from public.viewer_sessions vs
          where vs.id = viewer_session_id and vs.owner_id = auth.uid()
        )
      )
      or (
        viewer_template_id is not null
        and exists (
          select 1 from public.viewer_templates vt
          where vt.id = viewer_template_id and vt.owner_id = auth.uid()
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
      or viewer_session_id is not null
      or viewer_template_id is not null
    )
  );

create or replace function public.collection_is_shared(collection_uuid uuid)
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

create or replace function public.feed_config_is_shared(config_uuid uuid)
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

create policy "viewer sessions shared metadata read" on public.viewer_sessions
  for select using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.share_links sl
      where sl.viewer_session_id = id and sl.is_enabled
    )
  );

create policy "viewer templates shared metadata read" on public.viewer_templates
  for select using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.share_links sl
      where sl.viewer_template_id = id and sl.is_enabled
    )
  );
