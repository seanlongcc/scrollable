grant usage on schema private to anon, authenticated;

grant execute on function private.collection_is_shared(uuid)
  to anon, authenticated;
grant execute on function private.feed_config_is_shared(uuid)
  to anon, authenticated;
