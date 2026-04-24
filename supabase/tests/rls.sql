begin;

select plan(8);

select has_table('public', 'feed_configs', 'feed_configs exists');
select has_table('public', 'collections', 'collections exists');
select has_table('public', 'share_links', 'share_links exists');

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

select isnt_empty(
  $$ select 1
     from pg_policy p
     join pg_class c on c.oid = p.polrelid
     where c.relname = 'share_links'
       and pg_get_expr(p.polqual, p.polrelid) like '%not fc.is_nsfw or auth.uid() is not null%' $$,
  'shared NSFW config metadata requires auth'
);

select isnt_empty(
  $$ select 1
     from pg_policy p
     join pg_class c on c.oid = p.polrelid
     where c.relname = 'share_links'
       and pg_get_expr(p.polqual, p.polrelid) like '%not c.is_nsfw or auth.uid() is not null%' $$,
  'shared NSFW collection metadata requires auth'
);

select * from finish();

rollback;
