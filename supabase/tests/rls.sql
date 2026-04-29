begin;

select plan(12);

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

select * from finish();

rollback;
