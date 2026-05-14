grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on table public.profiles
  to authenticated;
grant select, insert, update, delete on table public.profiles
  to service_role;

grant select on table public.feed_configs
  to anon;
grant select, insert, update, delete on table public.feed_configs
  to authenticated;
grant select, insert, update, delete on table public.feed_configs
  to service_role;

grant select on table public.share_links
  to anon;
grant select, insert, update, delete on table public.share_links
  to authenticated;
grant select, insert, update, delete on table public.share_links
  to service_role;

grant select on table public.viewer_sessions
  to anon;
grant select, insert, update, delete on table public.viewer_sessions
  to authenticated;
grant select, insert, update, delete on table public.viewer_sessions
  to service_role;

grant select on table public.viewer_templates
  to anon;
grant select, insert, update, delete on table public.viewer_templates
  to authenticated;
grant select, insert, update, delete on table public.viewer_templates
  to service_role;
