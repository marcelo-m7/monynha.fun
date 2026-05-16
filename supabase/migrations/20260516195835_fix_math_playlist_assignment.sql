-- Correct the already affected math video and keep the education playlist as
-- the broad holding collection. Future assignment logic is handled in the
-- enrich-video Edge Function.

with target_video as (
  select id
  from public.videos
  where youtube_id = 'mRTwy__oJ7A'
),
wrong_playlist as (
  select id
  from public.playlists
  where slug = 'ldc-14541000'
),
right_playlist as (
  select id
  from public.playlists
  where slug = 'lesti-19411008'
),
deleted as (
  delete from public.playlist_videos pv
  using target_video tv, wrong_playlist wp
  where pv.video_id = tv.id
    and pv.playlist_id = wp.id
  returning pv.video_id
),
next_position as (
  select coalesce(max(pv.position), -1) + 1 as position
  from public.playlist_videos pv
  join right_playlist rp on rp.id = pv.playlist_id
)
insert into public.playlist_videos (playlist_id, video_id, position, added_by, notes)
select
  rp.id,
  tv.id,
  np.position,
  v.submitted_by,
  'Corrected automatic curricular assignment from Design de Comunicacao I to Analise Matematica II.'
from target_video tv
join public.videos v on v.id = tv.id
cross join right_playlist rp
cross join next_position np
where not exists (
  select 1
  from public.playlist_videos existing
  where existing.playlist_id = rp.id
    and existing.video_id = tv.id
);

with target_video as (
  select id
  from public.videos
  where youtube_id = 'mRTwy__oJ7A'
),
right_playlist as (
  select id
  from public.playlists
  where slug = 'lesti-19411008'
)
update public.video_submissions vs
set metadata = coalesce(vs.metadata, '{}'::jsonb) || jsonb_build_object(
  'assignmentCorrection',
  jsonb_build_object(
    'reason', 'Corrected math video playlist assignment after classifier guard update',
    'assignedPlaylistId', (select id from right_playlist),
    'correctedAt', now()
  )
)
from target_video tv
where vs.video_id = tv.id;
