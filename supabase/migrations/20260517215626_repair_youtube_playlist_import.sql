-- Operational repair for the mistaken YouTube playlist import that created a
-- Tube O2 playlist and duplicate pending submissions. This intentionally keeps
-- the imported video records and removes only the incorrect playlist binding
-- plus duplicate import submissions for the affected YouTube playlist.

create temp table youtube_playlist_import_repair_affected on commit drop as
select distinct
  v.id as video_id,
  v.youtube_id,
  coalesce(pv.added_by, pl.author_id, v.submitted_by) as user_id
from public.playlist_videos pv
join public.playlists pl on pl.id = pv.playlist_id
join public.videos v on v.id = pv.video_id
where pv.playlist_id = '7decaf18-1f0d-45aa-9bd3-8933fd98ce6d'::uuid;

delete from public.video_submissions vs
using youtube_playlist_import_repair_affected affected
where (vs.video_id = affected.video_id or vs.youtube_id = affected.youtube_id)
  and vs.status in ('pending', 'processing', 'recoverable_error')
  and (
    vs.metadata->>'playlist_id' = '7decaf18-1f0d-45aa-9bd3-8933fd98ce6d'
    or (
      vs.metadata->>'source' in ('youtube_playlist', 'playlist_repair', 'youtube_playlist_import_repair')
      and coalesce(vs.metadata->>'youtube_playlist_list', vs.metadata->>'playlist_list') = 'PL7iAT8C5wumpQWB8AFW7CwK2nlzh8ZdP9'
    )
  );

delete from public.playlists
where id = '7decaf18-1f0d-45aa-9bd3-8933fd98ce6d'::uuid;

insert into public.video_submissions (
  user_id,
  video_id,
  youtube_id,
  youtube_url,
  status,
  metadata,
  error_message,
  recoverable
)
select
  affected.user_id,
  affected.video_id,
  affected.youtube_id,
  'https://www.youtube.com/watch?v=' || affected.youtube_id,
  'pending',
  jsonb_build_object(
    'source', 'youtube_playlist_import_repair',
    'repaired_from_playlist_id', '7decaf18-1f0d-45aa-9bd3-8933fd98ce6d',
    'youtube_playlist_list', 'PL7iAT8C5wumpQWB8AFW7CwK2nlzh8ZdP9',
    'youtube_playlist_url', 'https://www.youtube.com/playlist?list=PL7iAT8C5wumpQWB8AFW7CwK2nlzh8ZdP9',
    'repaired_at', now()
  ),
  null,
  false
from youtube_playlist_import_repair_affected affected
where affected.user_id is not null
  and not exists (
    select 1
    from public.video_submissions success_vs
    where (success_vs.video_id = affected.video_id or success_vs.youtube_id = affected.youtube_id)
      and success_vs.status = 'success'
  )
  and not exists (
    select 1
    from public.video_submissions active_vs
    where (active_vs.video_id = affected.video_id or active_vs.youtube_id = affected.youtube_id)
      and active_vs.status in ('pending', 'processing', 'recoverable_error')
  );
