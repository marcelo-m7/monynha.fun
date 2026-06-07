-- Broad historical reprocessing pass for videos with strong math/probability
-- signals that were automatically linked to art-history playlists.
--
-- Policy goals:
-- 1) Remove stale automatic art-history links only (manual/editorial links are preserved).
-- 2) Keep at most one automatic playlist association by letting enrich-video reassess.
-- 3) Requeue latest submissions and ensure a pending v2 deep-analysis job exists.

with art_history_playlists as (
  select p.id
  from public.playlists p
  where lower(coalesce(p.slug, '')) = 'ldc-14541196'
     or lower(coalesce(p.name, '')) like '%historia da arte%'
     or lower(coalesce(p.description, '')) like '%historia da arte%'
), latest_enrichment as (
  select distinct on (ae.video_id)
    ae.video_id,
    ae.semantic_tags,
    ae.summary_description
  from public.ai_enrichments ae
  order by ae.video_id, ae.reprocessed_at desc nulls last, ae.created_at desc nulls last, ae.id desc
), math_signal_videos as (
  select distinct v.id as video_id
  from public.videos v
  left join latest_enrichment le on le.video_id = v.id
  where (
    coalesce(v.title, '') || ' ' || coalesce(v.description, '') || ' ' || coalesce(le.summary_description, '')
  ) ~* '(probabilid|combinat|permuta|arranjo|bayes|distribui|vari[áa]vel aleat[oó]ria|estat[íi]stica)'
  or exists (
    select 1
    from unnest(coalesce(le.semantic_tags, array[]::text[])) as tag(value)
    where lower(tag.value) ~ '(probabilid|combinat|estatistic|matematica|matem[áa]tica)'
  )
), misassigned_auto_links as (
  select pv.id as playlist_video_id, pv.video_id
  from public.playlist_videos pv
  join art_history_playlists ah on ah.id = pv.playlist_id
  join math_signal_videos msv on msv.video_id = pv.video_id
  where coalesce(pv.notes, '') ilike 'Assigned by playlist-assignment-v%'
), deleted_auto_links as (
  delete from public.playlist_videos pv
  using misassigned_auto_links mal
  where pv.id = mal.playlist_video_id
  returning mal.video_id
), target_videos as (
  select distinct dal.video_id
  from deleted_auto_links dal
), latest_submissions as (
  select distinct on (vs.video_id)
    vs.id as submission_id,
    vs.video_id
  from public.video_submissions vs
  join target_videos tv on tv.video_id = vs.video_id
  order by vs.video_id, vs.created_at desc, vs.id desc
), requeued_submissions as (
  update public.video_submissions vs
  set status = 'pending',
      recoverable = false,
      error_message = null,
      processing_started_at = null,
      completed_at = null,
      metadata = coalesce(vs.metadata, '{}'::jsonb)
        || jsonb_build_object(
          'processing', jsonb_build_object(
            'stage', 'pending_reenrichment',
            'updatedAt', now(),
            'reason', 'math_probability_art_history_reassignment'
          ),
          'assignment', coalesce(vs.metadata->'assignment', '{}'::jsonb)
            || jsonb_build_object(
              'fallbackUsed', true,
              'reliability', 'low',
              'reason', 'Automatic art-history assignment removed due math/probability signals; submission requeued for reassessment.',
              'assignedPlaylistId', null,
              'decisionSource', 'none',
              'score', 0,
              'topCandidates', '[]'::jsonb,
              'rejectedPlaylistId', null,
              'persisted', null
            )
        )
  from latest_submissions ls
  where vs.id = ls.submission_id
  returning vs.video_id, vs.id as submission_id
)
insert into public.video_analysis_jobs (
  video_id,
  submission_id,
  status,
  provider,
  provider_model,
  metadata
)
select
  rs.video_id,
  rs.submission_id,
  'pending',
  'v2',
  null,
  jsonb_build_object(
    'source', 'migration:20260607153000_requeue_math_probability_misassigned_art_history',
    'reason', 'requeued after removing stale automatic art-history assignment for math/probability content'
  )
from requeued_submissions rs
on conflict (video_id, provider) where status in ('pending', 'processing', 'recoverable_error')
do update
set submission_id = excluded.submission_id,
    metadata = coalesce(video_analysis_jobs.metadata, '{}'::jsonb) || excluded.metadata,
    error_message = null;
