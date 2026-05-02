do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'playlists'
      and column_name = 'external_source'
  ) then
    alter table public.playlists
      add column external_source text;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'playlists'
      and column_name = 'external_id'
  ) then
    alter table public.playlists
      add column external_id text;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'playlists_external_identity_unique'
  ) then
    alter table public.playlists
      add constraint playlists_external_identity_unique unique (external_source, external_id);
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_playlists_external_source'
  ) then
    create index idx_playlists_external_source
      on public.playlists(external_source);
  end if;
end $$;
