-- Resolve legacy deep-analysis jobs that remained pending after worker removal.
-- Fast-path enrichment now computes AI summary inline (OpenAI primary, Gemini fallback).

update public.video_analysis_jobs
set
  status = 'skipped',
  completed_at = coalesce(completed_at, now()),
  error_message = coalesce(
    error_message,
    'Skipped automatically: legacy deep-analysis worker unavailable; fast-path AI now produces the public summary.'
  ),
  metadata = coalesce(metadata, '{}'::jsonb)
    || jsonb_build_object(
      'autoResolution', jsonb_build_object(
        'at', now(),
        'reason', 'legacy_worker_unavailable',
        'strategy', 'openai_primary_gemini_fallback_fast_path'
      )
    )
where provider = 'v2'
  and status in ('pending', 'processing', 'recoverable_error');
