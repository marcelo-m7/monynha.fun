do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'playlists'
      and policyname = 'facodi_editor_select_playlists'
  ) then
    create policy facodi_editor_select_playlists
      on public.playlists
      for select
      to authenticated
      using (
        (course_code is not null or unit_code is not null)
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('editor', 'admin')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'playlists'
      and policyname = 'facodi_editor_insert_playlists'
  ) then
    create policy facodi_editor_insert_playlists
      on public.playlists
      for insert
      to authenticated
      with check (
        (course_code is not null or unit_code is not null)
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('editor', 'admin')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'playlists'
      and policyname = 'facodi_editor_update_playlists'
  ) then
    create policy facodi_editor_update_playlists
      on public.playlists
      for update
      to authenticated
      using (
        (course_code is not null or unit_code is not null)
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('editor', 'admin')
        )
      )
      with check (
        (course_code is not null or unit_code is not null)
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('editor', 'admin')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'playlists'
      and policyname = 'facodi_editor_delete_playlists'
  ) then
    create policy facodi_editor_delete_playlists
      on public.playlists
      for delete
      to authenticated
      using (
        (course_code is not null or unit_code is not null)
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('editor', 'admin')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'playlist_videos'
      and policyname = 'facodi_editor_manage_playlist_videos'
  ) then
    create policy facodi_editor_manage_playlist_videos
      on public.playlist_videos
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.playlists pl
          join public.profiles p on p.id = auth.uid()
          where pl.id = public.playlist_videos.playlist_id
            and (pl.course_code is not null or pl.unit_code is not null)
            and p.role in ('editor', 'admin')
        )
      )
      with check (
        exists (
          select 1
          from public.playlists pl
          join public.profiles p on p.id = auth.uid()
          where pl.id = public.playlist_videos.playlist_id
            and (pl.course_code is not null or pl.unit_code is not null)
            and p.role in ('editor', 'admin')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'playlist_collaborators'
      and policyname = 'facodi_editor_manage_playlist_collaborators'
  ) then
    create policy facodi_editor_manage_playlist_collaborators
      on public.playlist_collaborators
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.playlists pl
          join public.profiles p on p.id = auth.uid()
          where pl.id = public.playlist_collaborators.playlist_id
            and (pl.course_code is not null or pl.unit_code is not null)
            and p.role in ('editor', 'admin')
        )
      )
      with check (
        exists (
          select 1
          from public.playlists pl
          join public.profiles p on p.id = auth.uid()
          where pl.id = public.playlist_collaborators.playlist_id
            and (pl.course_code is not null or pl.unit_code is not null)
            and p.role in ('editor', 'admin')
        )
      );
  end if;
end $$;
