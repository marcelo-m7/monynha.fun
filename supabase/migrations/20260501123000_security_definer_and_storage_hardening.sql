-- Revoke unnecessary anonymous execution on SECURITY DEFINER RPCs
-- Keep only explicit public endpoints required for platform behavior.

do $$
declare
  fn record;
begin
  for fn in
    select n.nspname as schema_name,
           p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as function_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  loop
    -- Public endpoints intentionally allowed for anonymous users
    if fn.function_name in ('increment_video_view_count', 'list_featured_videos', 'save_lead_with_diagnosis') then
      continue;
    end if;

    execute format(
      'revoke execute on function %I.%I(%s) from public',
      fn.schema_name,
      fn.function_name,
      fn.function_args
    );

    execute format(
      'revoke execute on function %I.%I(%s) from anon',
      fn.schema_name,
      fn.function_name,
      fn.function_args
    );
  end loop;
end
$$;

-- Public bucket does not need broad list permission.
-- Public file access via /object/public remains available.
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
