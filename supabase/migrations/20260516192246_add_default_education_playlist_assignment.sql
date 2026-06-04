-- Allow the submit flow to place any user's submitted video into a public
-- education/study playlist without opening direct playlist_videos writes.

create or replace function public.get_default_education_playlist_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.playlists p
  where p.is_public = true
    and public.is_facodi_playlist(p.is_ordered, p.course_code, p.unit_code)
  order by
    case
      when p.slug in ('educacao', 'education', 'tube-o2-educacao', 'facodi-educacao') then 0
      when p.course_code is null and p.unit_code is null then 1
      else 2
    end,
    coalesce(p.video_count, 0) desc,
    p.created_at asc
  limit 1;
$$;

create or replace function public.add_video_to_default_education_playlist(
  p_video_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_playlist_id uuid;
  v_existing_playlist_video_id uuid;
  v_playlist_video_id uuid;
  v_next_position integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_video_id is null then
    raise exception 'Video id is required'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.videos v
    where v.id = p_video_id
      and v.submitted_by = v_user_id
  ) and not exists (
    select 1
    from public.video_submissions vs
    where vs.user_id = v_user_id
      and (
        vs.video_id = p_video_id
        or vs.duplicate_video_id = p_video_id
      )
  ) then
    raise exception 'Video is not linked to the authenticated user submission'
      using errcode = '42501';
  end if;

  v_playlist_id := public.get_default_education_playlist_id();

  if v_playlist_id is null then
    raise exception 'No public education playlist is configured'
      using errcode = 'P0002';
  end if;

  select pv.id
  into v_existing_playlist_video_id
  from public.playlist_videos pv
  where pv.playlist_id = v_playlist_id
    and pv.video_id = p_video_id
  limit 1;

  if v_existing_playlist_video_id is not null then
    return v_existing_playlist_video_id;
  end if;

  select coalesce(max(pv.position), -1) + 1
  into v_next_position
  from public.playlist_videos pv
  where pv.playlist_id = v_playlist_id;

  insert into public.playlist_videos (
    playlist_id,
    video_id,
    position,
    added_by,
    notes
  )
  values (
    v_playlist_id,
    p_video_id,
    v_next_position,
    v_user_id,
    'Auto-added from Tube O2 submission'
  )
  returning id into v_playlist_video_id;

  return v_playlist_video_id;
end;
$$;

revoke all on function public.get_default_education_playlist_id() from public, anon, authenticated;
grant execute on function public.get_default_education_playlist_id() to service_role;

revoke all on function public.add_video_to_default_education_playlist(uuid) from public, anon;
grant execute on function public.add_video_to_default_education_playlist(uuid) to authenticated, service_role;

comment on function public.get_default_education_playlist_id() is
  'Returns the public study/FACODI playlist used for automatic education playlist assignment.';
comment on function public.add_video_to_default_education_playlist(uuid) is
  'Adds a video linked to the authenticated user submission to the default public education playlist.';
