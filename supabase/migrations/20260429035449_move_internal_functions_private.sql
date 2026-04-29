create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create or replace function private.viewer_session_has_local_sources(sessions_json jsonb)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(sessions_json, '[]'::jsonb)) session
    where session -> 'sourceConfig' ->> 'kind' = 'local'
  );
$$;

create or replace function private.reject_viewer_session_local_sources()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.viewer_session_has_local_sources(new.sessions) then
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
  execute function private.reject_viewer_session_local_sources();

create or replace function private.enforce_cloud_metadata_quota()
returns trigger
language plpgsql
set search_path = ''
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
  execute function private.enforce_cloud_metadata_quota();

create trigger enforce_viewer_template_cloud_quota_trigger
  before insert or update on public.viewer_templates
  for each row
  execute function private.enforce_cloud_metadata_quota();

create or replace function private.collection_is_shared(collection_uuid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.share_links sl
    join public.collections c on c.id = sl.collection_id
    where sl.collection_id = collection_uuid
      and sl.is_enabled
      and (not c.is_nsfw or (select auth.uid()) is not null)
  );
$$;

create or replace function private.feed_config_is_shared(config_uuid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.share_links sl
    join public.feed_configs fc on fc.id = sl.feed_config_id
    where sl.feed_config_id = config_uuid
      and sl.is_enabled
      and (not fc.is_nsfw or (select auth.uid()) is not null)
  )
  or exists (
    select 1
    from public.collection_items ci
    join public.feed_configs fc on fc.id = ci.feed_config_id
    where ci.feed_config_id = config_uuid
      and private.collection_is_shared(ci.collection_id)
      and (not fc.is_nsfw or (select auth.uid()) is not null)
  );
$$;

drop policy if exists "feed configs shared metadata read" on public.feed_configs;
drop policy if exists "collections shared metadata read" on public.collections;
drop policy if exists "collection items shared read" on public.collection_items;
drop policy if exists "collection tags shared read" on public.collection_tags;

create policy "feed configs shared metadata read" on public.feed_configs
  for select using ((select auth.uid()) = owner_id or private.feed_config_is_shared(id));

create policy "collections shared metadata read" on public.collections
  for select using ((select auth.uid()) = owner_id or private.collection_is_shared(id));

create policy "collection items shared read" on public.collection_items
  for select using (
    private.collection_is_shared(collection_id)
    and exists (
      select 1 from public.feed_configs fc
      where fc.id = feed_config_id
        and (not fc.is_nsfw or (select auth.uid()) is not null)
    )
  );

create policy "collection tags shared read" on public.collection_tags
  for select using (private.collection_is_shared(collection_id));

drop function if exists public.feed_config_is_shared(uuid);
drop function if exists public.collection_is_shared(uuid);
drop function if exists public.enforce_cloud_metadata_quota();
drop function if exists public.reject_viewer_session_local_sources();
drop function if exists public.viewer_session_has_local_sources(jsonb);

create index if not exists feed_configs_owner_id_idx
  on public.feed_configs(owner_id);
create index if not exists collections_owner_id_idx
  on public.collections(owner_id);
create index if not exists collection_items_feed_config_id_idx
  on public.collection_items(feed_config_id);
create index if not exists share_links_owner_id_idx
  on public.share_links(owner_id);
create index if not exists share_links_feed_config_id_idx
  on public.share_links(feed_config_id);
create index if not exists share_links_collection_id_idx
  on public.share_links(collection_id);
create index if not exists share_links_viewer_session_id_idx
  on public.share_links(viewer_session_id);
create index if not exists share_links_viewer_template_id_idx
  on public.share_links(viewer_template_id);
create index if not exists viewer_sessions_owner_id_idx
  on public.viewer_sessions(owner_id);
create index if not exists viewer_templates_owner_id_idx
  on public.viewer_templates(owner_id);

revoke execute on all functions in schema private from public;
revoke execute on all functions in schema private from anon, authenticated;
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from anon, authenticated;
