create or replace function private.viewer_session_is_shared(
  viewer_session_uuid uuid
)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.share_links sl
    where sl.viewer_session_id = viewer_session_uuid
      and sl.is_enabled
  );
$$;

create or replace function private.viewer_template_is_shared(
  viewer_template_uuid uuid
)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.share_links sl
    where sl.viewer_template_id = viewer_template_uuid
      and sl.is_enabled
  );
$$;

grant usage on schema private to anon, authenticated;

grant execute on function private.viewer_session_is_shared(uuid)
  to anon, authenticated;
grant execute on function private.viewer_template_is_shared(uuid)
  to anon, authenticated;

drop policy if exists "viewer sessions shared metadata read"
  on public.viewer_sessions;
drop policy if exists "viewer templates shared metadata read"
  on public.viewer_templates;

create policy "viewer sessions shared metadata read" on public.viewer_sessions
  for select using (
    (select auth.uid()) = owner_id
    or private.viewer_session_is_shared(id)
  );

create policy "viewer templates shared metadata read" on public.viewer_templates
  for select using (
    (select auth.uid()) = owner_id
    or private.viewer_template_is_shared(id)
  );
