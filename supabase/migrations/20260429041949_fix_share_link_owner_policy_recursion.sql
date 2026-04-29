create or replace function private.user_owns_share_target(
  feed_config_uuid uuid,
  collection_uuid uuid,
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
        collection_uuid is not null
        and exists (
          select 1
          from public.collections c
          where c.id = collection_uuid
            and c.owner_id = (select auth.uid())
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

grant execute on function private.user_owns_share_target(uuid, uuid, uuid, uuid)
  to authenticated;

drop policy if exists "share links owner all" on public.share_links;

create policy "share links owner all" on public.share_links
  for all using ((select auth.uid()) = owner_id) with check (
    (select auth.uid()) = owner_id
    and private.user_owns_share_target(
      feed_config_id,
      collection_id,
      viewer_session_id,
      viewer_template_id
    )
  );
