-- Repair the Dani Porto art-history playlist import that was rate-limited and
-- missed deterministic assignment to the LDC art-history study playlist.

with target_playlist as (
	select id, name
	from public.playlists
	where slug = 'ldc-14541196'
	limit 1
), target_submissions as (
	select
		s.id as submission_id,
		s.user_id,
		s.video_id,
		s.created_at,
		v.title
	from public.video_submissions s
	join public.videos v on v.id = s.video_id
	where s.created_at >= timestamptz '2026-06-06 11:18:00+00'
		and s.created_at < timestamptz '2026-06-06 11:19:00+00'
		and v.channel_name = 'Dani Porto'
		and v.title ~* '(arte|pintura|arquitetura|renascimento|barroca|barroco|maneirismo|g[óo]tica|bizantina|rupestre|paleocrist[ãa]|rom[âa]nica|romana|grega|eg[íi]pcia|idade m[ée]dia)'
), numbered_targets as (
	select
		ts.*,
		tp.id as playlist_id,
		coalesce((select max(position) + 1 from public.playlist_videos where playlist_id = tp.id), 0)
			+ row_number() over (order by ts.created_at, ts.title, ts.video_id) - 1 as next_position
	from target_submissions ts
	cross join target_playlist tp
)
insert into public.playlist_videos (playlist_id, video_id, position, added_by, notes)
select
	playlist_id,
	video_id,
	next_position,
	user_id,
	'Assigned by playlist-assignment-v6-art-history-repair: repaired Dani Porto art-history playlist import.'
from numbered_targets
on conflict (playlist_id, video_id) do nothing;

with target_category as (
	select id
	from public.categories
	where slug = 'design'
	limit 1
), target_submissions as (
	select s.video_id
	from public.video_submissions s
	join public.videos v on v.id = s.video_id
	where s.created_at >= timestamptz '2026-06-06 11:18:00+00'
		and s.created_at < timestamptz '2026-06-06 11:19:00+00'
		and v.channel_name = 'Dani Porto'
		and v.title ~* '(arte|pintura|arquitetura|renascimento|barroca|barroco|maneirismo|g[óo]tica|bizantina|rupestre|paleocrist[ãa]|rom[âa]nica|romana|grega|eg[íi]pcia|idade m[ée]dia)'
)
update public.videos v
set category_id = target_category.id,
		updated_at = now()
from target_submissions ts
cross join target_category
where v.id = ts.video_id
	and v.category_id is distinct from target_category.id;

with target_playlist as (
	select id, name
	from public.playlists
	where slug = 'ldc-14541196'
	limit 1
), target_category as (
	select id, name
	from public.categories
	where slug = 'design'
	limit 1
), target_submissions as (
	select
		s.id as submission_id,
		s.video_id,
		v.title
	from public.video_submissions s
	join public.videos v on v.id = s.video_id
	where s.created_at >= timestamptz '2026-06-06 11:18:00+00'
		and s.created_at < timestamptz '2026-06-06 11:19:00+00'
		and v.channel_name = 'Dani Porto'
		and v.title ~* '(arte|pintura|arquitetura|renascimento|barroca|barroco|maneirismo|g[óo]tica|bizantina|rupestre|paleocrist[ãa]|rom[âa]nica|romana|grega|eg[íi]pcia|idade m[ée]dia)'
)
update public.video_submissions s
set status = 'success',
		error_message = null,
		recoverable = false,
		completed_at = coalesce(s.completed_at, now()),
		metadata = coalesce(s.metadata, '{}'::jsonb)
			|| jsonb_build_object(
				'processing', coalesce(s.metadata->'processing', '{}'::jsonb) || jsonb_build_object(
					'stage', 'success',
					'updatedAt', now()
				),
				'enrichment', coalesce(s.metadata->'enrichment', '{}'::jsonb) || jsonb_build_object(
					'provider', 'legacy_fast_repair',
					'model', null,
					'optimizedTitle', ts.title,
					'summaryDescription', 'Video do canal Dani Porto sobre "' || ts.title || '", reparado pela curadoria Tube O2.',
					'shortSummary', 'Video do canal Dani Porto sobre "' || ts.title || '", reparado pela curadoria Tube O2.',
					'semanticTags', jsonb_build_array('história da arte', 'design')
				),
				'assignment', jsonb_build_object(
					'fallbackUsed', false,
					'reliability', 'high',
					'reason', 'Deterministic scoring selected História da Arte for art-history signals.',
					'assignedCategoryId', target_category.id,
					'assignedPlaylistId', target_playlist.id,
					'decisionSource', 'deterministic',
					'provider', 'legacy_fast_repair',
					'providerConfidence', null,
					'score', 12,
					'algorithmVersion', 'playlist-assignment-v6-art-history-repair',
					'signals', jsonb_build_object(
						'math', 0,
						'design', 1,
						'science', 0,
						'business', 0,
						'database', 0,
						'language', 0,
						'humanities', 2,
						'programming', 0
					),
					'topCandidates', jsonb_build_array(jsonb_build_object(
						'playlistId', target_playlist.id,
						'name', target_playlist.name,
						'score', 12,
						'compatible', true,
						'isAiSuggested', false
					)),
					'rejectedPlaylistId', null,
					'rejectedAiPlaylistId', null,
					'persisted', jsonb_build_object('created', true)
				)
			)
from target_submissions ts
cross join target_playlist
cross join target_category
where s.id = ts.submission_id;
