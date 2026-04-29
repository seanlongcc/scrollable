begin;

select plan(16);

select has_table('public', 'feed_configs', 'feed_configs exists');
select has_table('public', 'collections', 'collections exists');
select has_table('public', 'share_links', 'share_links exists');
select has_table('public', 'viewer_sessions', 'viewer_sessions exists');
select has_table('public', 'viewer_templates', 'viewer_templates exists');

select policies_are(
  'public',
  'feed_configs',
  array['feed configs owner all', 'feed configs shared metadata read']
);

select policies_are(
  'public',
  'collections',
  array['collections owner all', 'collections shared metadata read']
);

select policies_are(
  'public',
  'share_links',
  array['share links owner all', 'share links public read']
);

select policies_are(
  'public',
  'viewer_sessions',
  array['viewer sessions owner all', 'viewer sessions shared metadata read']
);

select policies_are(
  'public',
  'viewer_templates',
  array['viewer templates owner all', 'viewer templates shared metadata read']
);

select isnt_empty(
  $$ select 1
     from pg_policy p
     join pg_class c on c.oid = p.polrelid
     where c.relname = 'share_links'
       and pg_get_expr(p.polqual, p.polrelid) ~* 'not[[:space:]]+fc[.]is_nsfw'
       and pg_get_expr(p.polqual, p.polrelid) ~* 'auth[.]uid[(][)][[:space:]]+is[[:space:]]+not[[:space:]]+null' $$,
  'shared NSFW config metadata requires auth'
);

select isnt_empty(
  $$ select 1
     from pg_policy p
     join pg_class c on c.oid = p.polrelid
     where c.relname = 'share_links'
       and pg_get_expr(p.polqual, p.polrelid) ~* 'not[[:space:]]+c[.]is_nsfw'
       and pg_get_expr(p.polqual, p.polrelid) ~* 'auth[.]uid[(][)][[:space:]]+is[[:space:]]+not[[:space:]]+null' $$,
  'shared NSFW collection metadata requires auth'
);

select is_empty(
  $$ select 1
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef $$,
  'security definer functions are not exposed in public schema'
);

select is_empty(
  $$ with expected_indexes(index_name) as (
       values
         ('feed_configs_owner_id_idx'),
         ('collections_owner_id_idx'),
         ('collection_items_feed_config_id_idx'),
         ('share_links_owner_id_idx'),
         ('share_links_feed_config_id_idx'),
         ('share_links_collection_id_idx'),
         ('share_links_viewer_session_id_idx'),
         ('share_links_viewer_template_id_idx'),
         ('viewer_sessions_owner_id_idx'),
         ('viewer_templates_owner_id_idx')
     )
     select 1
     from expected_indexes e
     where not exists (
       select 1
       from pg_indexes i
       where i.schemaname = 'public'
         and i.indexname = e.index_name
     ) $$,
  'RLS and share lookup columns have supporting indexes'
);

select is_empty(
  $$ with expected_functions(function_name) as (
       values
         ('private.reject_viewer_session_local_sources()'),
         ('private.viewer_session_has_local_sources(jsonb)'),
         ('private.enforce_cloud_metadata_quota()')
     )
     select 1
     from expected_functions e
     where not has_function_privilege(
       'authenticated',
       e.function_name,
       'EXECUTE'
     ) $$,
  'authenticated can execute private trigger helpers for cloud saves'
);

insert into auth.users (id, aud, role, email)
values (
  '10000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'rls-share-owner@example.test'
);

insert into public.profiles (id)
values ('10000000-0000-4000-8000-000000000001');

insert into public.viewer_sessions (
  id,
  owner_id,
  name,
  layers,
  active_layer_id,
  layout_mode,
  fixed_columns,
  fixed_rows,
  global_timer_seconds,
  sessions,
  template_slots,
  metadata_bytes
)
values (
  '10000000-0000-4000-8000-000000000101',
  '10000000-0000-4000-8000-000000000001',
  'RLS share layout',
  '[]'::jsonb,
  'layer-1',
  'fixed',
  1,
  1,
  10,
  '[]'::jsonb,
  '[]'::jsonb,
  2
);

insert into public.viewer_templates (
  id,
  owner_id,
  name,
  layers,
  active_layer_id,
  global_timer_seconds,
  slots,
  metadata_bytes
)
values (
  '10000000-0000-4000-8000-000000000201',
  '10000000-0000-4000-8000-000000000001',
  'RLS share template',
  '[]'::jsonb,
  'layer-1',
  10,
  '[]'::jsonb,
  2
);

select lives_ok(
  $$
    set local role authenticated;
    select set_config(
      'request.jwt.claim.sub',
      '10000000-0000-4000-8000-000000000001',
      true
    );
    insert into public.share_links (slug, viewer_session_id)
    values (
      'rls-layout-share',
      '10000000-0000-4000-8000-000000000101'
    );
    insert into public.share_links (slug, viewer_template_id)
    values (
      'rls-template-share',
      '10000000-0000-4000-8000-000000000201'
    );
    reset role;
  $$,
  'authenticated owner can create Cloud layout and template share links'
);

select * from finish();

rollback;
