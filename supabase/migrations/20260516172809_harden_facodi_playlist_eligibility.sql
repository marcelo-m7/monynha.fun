-- DB-04: FACODI study playlists are restricted to eligible profiles.
-- Eligibility v1 is profiles.role in ('editor', 'admin').
-- A playlist is FACODI/study content when is_ordered is true, course_code is
-- filled, or unit_code is filled.

create or replace function public.is_facodi_playlist(
  p_is_ordered boolean,
  p_course_code text,
  p_unit_code text
)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(p_is_ordered, false)
    or nullif(btrim(coalesce(p_course_code, '')), '') is not null
    or nullif(btrim(coalesce(p_unit_code, '')), '') is not null;
$$;

create or replace function public.current_profile_can_manage_facodi_playlist()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role'
    or current_user in ('postgres', 'supabase_admin')
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('editor', 'admin')
    );
$$;

create or replace function public.prevent_unauthorized_facodi_playlist_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_facodi_playlist(new.is_ordered, new.course_code, new.unit_code)
    and not public.current_profile_can_manage_facodi_playlist()
  then
    raise exception 'Only FACODI-eligible profiles can create or edit study playlists'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists playlists_prevent_unauthorized_facodi_write on public.playlists;
create trigger playlists_prevent_unauthorized_facodi_write
before insert or update on public.playlists
for each row
execute function public.prevent_unauthorized_facodi_playlist_write();

drop policy if exists facodi_editor_select_playlists on public.playlists;
create policy facodi_editor_select_playlists
  on public.playlists
  for select
  to authenticated
  using (
    public.is_facodi_playlist(is_ordered, course_code, unit_code)
    and public.current_profile_can_manage_facodi_playlist()
  );

drop policy if exists facodi_editor_insert_playlists on public.playlists;
create policy facodi_editor_insert_playlists
  on public.playlists
  for insert
  to authenticated
  with check (
    public.is_facodi_playlist(is_ordered, course_code, unit_code)
    and public.current_profile_can_manage_facodi_playlist()
  );

drop policy if exists facodi_editor_update_playlists on public.playlists;
create policy facodi_editor_update_playlists
  on public.playlists
  for update
  to authenticated
  using (
    public.is_facodi_playlist(is_ordered, course_code, unit_code)
    and public.current_profile_can_manage_facodi_playlist()
  )
  with check (
    public.is_facodi_playlist(is_ordered, course_code, unit_code)
    and public.current_profile_can_manage_facodi_playlist()
  );

drop policy if exists facodi_editor_delete_playlists on public.playlists;
create policy facodi_editor_delete_playlists
  on public.playlists
  for delete
  to authenticated
  using (
    public.is_facodi_playlist(is_ordered, course_code, unit_code)
    and public.current_profile_can_manage_facodi_playlist()
  );

drop policy if exists facodi_editor_manage_playlist_videos on public.playlist_videos;
create policy facodi_editor_manage_playlist_videos
  on public.playlist_videos
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.playlists pl
      where pl.id = public.playlist_videos.playlist_id
        and public.is_facodi_playlist(pl.is_ordered, pl.course_code, pl.unit_code)
        and public.current_profile_can_manage_facodi_playlist()
    )
  )
  with check (
    exists (
      select 1
      from public.playlists pl
      where pl.id = public.playlist_videos.playlist_id
        and public.is_facodi_playlist(pl.is_ordered, pl.course_code, pl.unit_code)
        and public.current_profile_can_manage_facodi_playlist()
    )
  );

drop policy if exists facodi_editor_manage_playlist_collaborators on public.playlist_collaborators;
create policy facodi_editor_manage_playlist_collaborators
  on public.playlist_collaborators
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.playlists pl
      where pl.id = public.playlist_collaborators.playlist_id
        and public.is_facodi_playlist(pl.is_ordered, pl.course_code, pl.unit_code)
        and public.current_profile_can_manage_facodi_playlist()
    )
  )
  with check (
    exists (
      select 1
      from public.playlists pl
      where pl.id = public.playlist_collaborators.playlist_id
        and public.is_facodi_playlist(pl.is_ordered, pl.course_code, pl.unit_code)
        and public.current_profile_can_manage_facodi_playlist()
    )
  );

comment on function public.is_facodi_playlist(boolean, text, text) is
  'FACODI/study playlist contract: true when is_ordered is true or course_code/unit_code are filled.';
comment on function public.current_profile_can_manage_facodi_playlist() is
  'FACODI eligibility v1: service role, postgres/supabase admin, or profiles.role in editor/admin.';
