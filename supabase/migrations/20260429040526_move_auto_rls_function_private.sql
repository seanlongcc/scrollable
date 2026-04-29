do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'alter function public.rls_auto_enable() set schema private';
  end if;

  if to_regprocedure('private.rls_auto_enable()') is not null then
    execute 'revoke execute on function private.rls_auto_enable() from public';
    execute 'revoke execute on function private.rls_auto_enable() from anon, authenticated';
  end if;
end
$$;
