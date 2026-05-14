begin;

select plan(25);

select has_table('public', 'feed_configs', 'feed_configs exists');
select has_table('public', 'share_links', 'share_links exists');
select has_table('public', 'viewer_sessions', 'viewer_sessions exists');
select has_table('public', 'viewer_templates', 'viewer_templates exists');
select hasnt_table('public', 'collections', 'collections removed');
select hasnt_table('public', 'collection_items', 'collection items removed');
select hasnt_table('public', 'tags', 'tags removed');
select hasnt_table('public', 'collection_tags', 'collection tags removed');
select hasnt_column('public', 'share_links', 'collection_id', 'share links no longer target collections');

select policies_are(
  'public',
  'feed_configs',
  array[
    'feed configs read metadata',
    'feed configs owner insert',
    'feed configs owner update',
    'feed configs owner delete'
  ]
);

select policies_are(
  'public',
  'share_links',
  array[
    'share links read metadata',
    'share links owner insert',
    'share links owner update',
    'share links owner delete'
  ]
);

select policies_are(
  'public',
  'viewer_sessions',
  array[
    'viewer sessions read metadata',
    'viewer sessions owner insert',
    'viewer sessions owner update',
    'viewer sessions owner delete'
  ]
);

select policies_are(
  'public',
  'viewer_templates',
  array[
    'viewer templates read metadata',
    'viewer templates owner insert',
    'viewer templates owner update',
    'viewer templates owner delete'
  ]
);

select is_empty(
  $$ select 1
     from pg_policy p
     join pg_class c on c.oid = p.polrelid
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname in (
         'profiles',
         'feed_configs',
         'share_links',
         'viewer_sessions',
         'viewer_templates'
       )
       and p.polroles = array[0]::oid[] $$,
  'Data API policies target explicit API roles instead of PUBLIC'
);

select is_empty(
  $$ select 1
     from pg_policy p
     join pg_class c on c.oid = p.polrelid
     join pg_namespace n on n.oid = c.relnamespace
     join unnest(p.polroles) policy_role(role_oid) on true
     join pg_roles r on r.oid = policy_role.role_oid
     where n.nspname = 'public'
       and c.relname in (
         'feed_configs',
         'share_links',
         'viewer_sessions',
         'viewer_templates'
       )
       and p.polpermissive
       and p.polcmd in ('r', '*')
       and r.rolname in ('anon', 'authenticated')
     group by c.relname, r.rolname
     having count(*) > 1 $$,
  'Data API tables avoid overlapping permissive SELECT policies'
);

select isnt_empty(
  $$ select 1
     from pg_policy p
     join pg_class c on c.oid = p.polrelid
     where c.relname = 'share_links'
       and pg_get_expr(p.polqual, p.polrelid) ~* 'not[[:space:]]+fc[.]is_nsfw'
       and pg_get_expr(p.polqual, p.polrelid) ~* 'auth[.]uid[(][)].*is[[:space:]]+not[[:space:]]+null' $$,
  'sensitive shared config metadata requires auth'
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
         ('share_links_owner_id_idx'),
         ('share_links_feed_config_id_idx'),
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

select is_empty(
  $$ with expected_privileges(table_name, role_name, privilege_name) as (
       values
         ('profiles', 'authenticated', 'SELECT'),
         ('profiles', 'authenticated', 'INSERT'),
         ('profiles', 'authenticated', 'UPDATE'),
         ('profiles', 'authenticated', 'DELETE'),
         ('profiles', 'service_role', 'SELECT'),
         ('profiles', 'service_role', 'INSERT'),
         ('profiles', 'service_role', 'UPDATE'),
         ('profiles', 'service_role', 'DELETE'),
         ('feed_configs', 'anon', 'SELECT'),
         ('feed_configs', 'authenticated', 'SELECT'),
         ('feed_configs', 'authenticated', 'INSERT'),
         ('feed_configs', 'authenticated', 'UPDATE'),
         ('feed_configs', 'authenticated', 'DELETE'),
         ('feed_configs', 'service_role', 'SELECT'),
         ('feed_configs', 'service_role', 'INSERT'),
         ('feed_configs', 'service_role', 'UPDATE'),
         ('feed_configs', 'service_role', 'DELETE'),
         ('share_links', 'anon', 'SELECT'),
         ('share_links', 'authenticated', 'SELECT'),
         ('share_links', 'authenticated', 'INSERT'),
         ('share_links', 'authenticated', 'UPDATE'),
         ('share_links', 'authenticated', 'DELETE'),
         ('share_links', 'service_role', 'SELECT'),
         ('share_links', 'service_role', 'INSERT'),
         ('share_links', 'service_role', 'UPDATE'),
         ('share_links', 'service_role', 'DELETE'),
         ('viewer_sessions', 'anon', 'SELECT'),
         ('viewer_sessions', 'authenticated', 'SELECT'),
         ('viewer_sessions', 'authenticated', 'INSERT'),
         ('viewer_sessions', 'authenticated', 'UPDATE'),
         ('viewer_sessions', 'authenticated', 'DELETE'),
         ('viewer_sessions', 'service_role', 'SELECT'),
         ('viewer_sessions', 'service_role', 'INSERT'),
         ('viewer_sessions', 'service_role', 'UPDATE'),
         ('viewer_sessions', 'service_role', 'DELETE'),
         ('viewer_templates', 'anon', 'SELECT'),
         ('viewer_templates', 'authenticated', 'SELECT'),
         ('viewer_templates', 'authenticated', 'INSERT'),
         ('viewer_templates', 'authenticated', 'UPDATE'),
         ('viewer_templates', 'authenticated', 'DELETE'),
         ('viewer_templates', 'service_role', 'SELECT'),
         ('viewer_templates', 'service_role', 'INSERT'),
         ('viewer_templates', 'service_role', 'UPDATE'),
         ('viewer_templates', 'service_role', 'DELETE')
     )
     select 1
     from expected_privileges e
     where not has_table_privilege(
       e.role_name,
       format('public.%I', e.table_name),
       e.privilege_name
     ) $$,
  'Data API roles have explicit table privileges for exposed public tables'
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

set local role anon;
select is(
  (select count(*)::integer from public.share_links where slug = 'rls-layout-share'),
  1,
  'anonymous users can read Cloud layout share links'
);
select is(
  (select count(*)::integer from public.viewer_sessions where id = '10000000-0000-4000-8000-000000000101'),
  1,
  'anonymous users can read shared Cloud layout metadata'
);
select is(
  (select count(*)::integer from public.viewer_templates where id = '10000000-0000-4000-8000-000000000201'),
  1,
  'anonymous users can read shared Cloud template metadata'
);
reset role;

insert into auth.users (id, aud, role, email)
values (
  '10000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  'rls-share-reader@example.test'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select is(
  (select count(*)::integer from public.viewer_sessions where id = '10000000-0000-4000-8000-000000000101'),
  1,
  'other authenticated users can read shared Cloud layout metadata'
);
reset role;

select * from finish();

rollback;
