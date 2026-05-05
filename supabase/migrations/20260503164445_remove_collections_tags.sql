delete from public.share_links
where collection_id is not null;

drop policy if exists "feed configs shared metadata read"
  on public.feed_configs;
drop policy if exists "share links owner all"
  on public.share_links;
drop policy if exists "share links public read"
  on public.share_links;

drop policy if exists "collections owner all" on public.collections;
drop policy if exists "collections shared metadata read" on public.collections;
drop policy if exists "collection items owner all" on public.collection_items;
drop policy if exists "collection items shared read" on public.collection_items;
drop policy if exists "tags owner all" on public.tags;
drop policy if exists "collection tags owner all" on public.collection_tags;
drop policy if exists "collection tags shared read" on public.collection_tags;

alter table public.share_links
  drop constraint if exists share_links_check,
  drop constraint if exists share_links_single_target_check,
  drop column if exists collection_id;

alter table public.share_links
  add constraint share_links_single_target_check check (
    (feed_config_id is not null)::integer +
    (viewer_session_id is not null)::integer +
    (viewer_template_id is not null)::integer = 1
  );

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
  );
$$;

drop function if exists private.collection_is_shared(uuid);
drop function if exists private.user_owns_share_target(uuid, uuid, uuid, uuid);

create function private.user_owns_share_target(
  feed_config_uuid uuid,
  viewer_session_uuid uuid,
  viewer_template_uuid uuid
)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (
      (
        feed_config_uuid is not null
        and exists (
          select 1
          from public.feed_configs fc
          where fc.id = feed_config_uuid
            and fc.owner_id = (select auth.uid())
        )
      )
      or (
        viewer_session_uuid is not null
        and exists (
          select 1
          from public.viewer_sessions vs
          where vs.id = viewer_session_uuid
            and vs.owner_id = (select auth.uid())
        )
      )
      or (
        viewer_template_uuid is not null
        and exists (
          select 1
          from public.viewer_templates vt
          where vt.id = viewer_template_uuid
            and vt.owner_id = (select auth.uid())
        )
      )
    );
$$;

grant execute on function private.user_owns_share_target(uuid, uuid, uuid)
  to authenticated;

create policy "feed configs shared metadata read" on public.feed_configs
  for select using ((select auth.uid()) = owner_id or private.feed_config_is_shared(id));

create policy "share links owner all" on public.share_links
  for all using ((select auth.uid()) = owner_id) with check (
    (select auth.uid()) = owner_id
    and private.user_owns_share_target(
      feed_config_id,
      viewer_session_id,
      viewer_template_id
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
            and (not fc.is_nsfw or (select auth.uid()) is not null)
        )
      )
      or viewer_session_id is not null
      or viewer_template_id is not null
    )
  );

drop table if exists public.collection_tags;
drop table if exists public.collection_items;
drop table if exists public.tags;
drop table if exists public.collections;
