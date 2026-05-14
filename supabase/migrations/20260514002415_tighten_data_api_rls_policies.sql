drop policy if exists "profiles owner read" on public.profiles;
drop policy if exists "profiles owner update" on public.profiles;
drop policy if exists "profiles owner insert" on public.profiles;
drop policy if exists "feed configs owner all" on public.feed_configs;
drop policy if exists "feed configs shared metadata read" on public.feed_configs;
drop policy if exists "feed configs read metadata" on public.feed_configs;
drop policy if exists "feed configs owner insert" on public.feed_configs;
drop policy if exists "feed configs owner update" on public.feed_configs;
drop policy if exists "feed configs owner delete" on public.feed_configs;
drop policy if exists "share links owner all" on public.share_links;
drop policy if exists "share links public read" on public.share_links;
drop policy if exists "share links read metadata" on public.share_links;
drop policy if exists "share links owner insert" on public.share_links;
drop policy if exists "share links owner update" on public.share_links;
drop policy if exists "share links owner delete" on public.share_links;
drop policy if exists "viewer sessions owner all" on public.viewer_sessions;
drop policy if exists "viewer sessions shared metadata read" on public.viewer_sessions;
drop policy if exists "viewer sessions read metadata" on public.viewer_sessions;
drop policy if exists "viewer sessions owner insert" on public.viewer_sessions;
drop policy if exists "viewer sessions owner update" on public.viewer_sessions;
drop policy if exists "viewer sessions owner delete" on public.viewer_sessions;
drop policy if exists "viewer templates owner all" on public.viewer_templates;
drop policy if exists "viewer templates shared metadata read" on public.viewer_templates;
drop policy if exists "viewer templates read metadata" on public.viewer_templates;
drop policy if exists "viewer templates owner insert" on public.viewer_templates;
drop policy if exists "viewer templates owner update" on public.viewer_templates;
drop policy if exists "viewer templates owner delete" on public.viewer_templates;

create policy "profiles owner read" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles owner update" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles owner insert" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "feed configs read metadata" on public.feed_configs
  for select to anon, authenticated
  using ((select auth.uid()) = owner_id or private.feed_config_is_shared(id));

create policy "feed configs owner insert" on public.feed_configs
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "feed configs owner update" on public.feed_configs
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "feed configs owner delete" on public.feed_configs
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "share links read metadata" on public.share_links
  for select to anon, authenticated
  using (
    (select auth.uid()) = owner_id
    or (
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
    )
  );

create policy "share links owner insert" on public.share_links
  for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and private.user_owns_share_target(
      feed_config_id,
      viewer_session_id,
      viewer_template_id
    )
  );

create policy "share links owner update" on public.share_links
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and private.user_owns_share_target(
      feed_config_id,
      viewer_session_id,
      viewer_template_id
    )
  );

create policy "share links owner delete" on public.share_links
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "viewer sessions read metadata" on public.viewer_sessions
  for select to anon, authenticated
  using (
    (select auth.uid()) = owner_id
    or private.viewer_session_is_shared(id)
  );

create policy "viewer sessions owner insert" on public.viewer_sessions
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "viewer sessions owner update" on public.viewer_sessions
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "viewer sessions owner delete" on public.viewer_sessions
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "viewer templates read metadata" on public.viewer_templates
  for select to anon, authenticated
  using (
    (select auth.uid()) = owner_id
    or private.viewer_template_is_shared(id)
  );

create policy "viewer templates owner insert" on public.viewer_templates
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "viewer templates owner update" on public.viewer_templates
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "viewer templates owner delete" on public.viewer_templates
  for delete to authenticated
  using ((select auth.uid()) = owner_id);
