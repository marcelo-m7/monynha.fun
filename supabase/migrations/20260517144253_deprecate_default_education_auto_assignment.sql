-- Stop client-side/default holding playlist assignment.
-- Playlist insertion now happens only after enrichment confirms content adherence.

revoke execute on function public.add_video_to_default_education_playlist(uuid) from authenticated;
grant execute on function public.add_video_to_default_education_playlist(uuid) to service_role;

delete from public.playlist_videos pv
using public.playlists p
where pv.playlist_id = p.id
  and p.slug in ('educacao', 'education', 'tube-o2-educacao', 'tube-o2-education')
  and pv.notes = 'Auto-added from Tube O2 submission';

comment on function public.add_video_to_default_education_playlist(uuid) is
  'Legacy helper retained for service_role only. User submissions are no longer auto-added to a holding playlist; Gemini assignment adds playlists only after content adherence checks.';
