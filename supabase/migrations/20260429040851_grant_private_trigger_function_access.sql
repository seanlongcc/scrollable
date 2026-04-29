grant execute on function private.reject_viewer_session_local_sources()
  to authenticated;
grant execute on function private.viewer_session_has_local_sources(jsonb)
  to authenticated;
grant execute on function private.enforce_cloud_metadata_quota()
  to authenticated;
