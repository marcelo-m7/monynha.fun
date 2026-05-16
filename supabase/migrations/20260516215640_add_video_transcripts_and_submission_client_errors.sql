-- Add internal transcript storage and a safe client-side failure marker for
-- submissions whose Edge Function invocation fails before the worker can update
-- status itself.

create table if not exists public.video_transcripts (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  provider text not null default 'gemini',
  provider_model text not null,
  language text,
  transcript_text text,
  summary text,
  confidence numeric not null default 0,
  status text not null default 'pending',
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint video_transcripts_status_check check (
    status in ('pending', 'processing', 'completed', 'unavailable', 'failed')
  ),
  constraint video_transcripts_confidence_check check (
    confidence >= 0 and confidence <= 1
  ),
  constraint video_transcripts_error_status_check check (
    status not in ('unavailable', 'failed') or error_message is not null
  )
);

comment on table public.video_transcripts is
  'Internal transcript records generated during Tube O2 video processing. Full transcript text is not exposed to client roles.';
comment on column public.video_transcripts.summary is
  'Short public-safe summary exposed through v_video_exhibition.';
comment on column public.video_transcripts.transcript_text is
  'Full transcript text for internal processing and audit only.';

create index if not exists video_transcripts_video_id_created_at_idx
  on public.video_transcripts(video_id, created_at desc);
create index if not exists video_transcripts_status_idx
  on public.video_transcripts(status);

create or replace function public.set_video_transcripts_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists video_transcripts_set_updated_at on public.video_transcripts;
create trigger video_transcripts_set_updated_at
before update on public.video_transcripts
for each row
execute function public.set_video_transcripts_updated_at();

alter table public.video_transcripts enable row level security;

revoke all on table public.video_transcripts from public, anon, authenticated;
grant select, insert, update, delete on table public.video_transcripts to service_role;

drop policy if exists video_transcripts_service_role_all on public.video_transcripts;
create policy video_transcripts_service_role_all
  on public.video_transcripts
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.mark_video_submission_client_error(
  p_submission_id uuid,
  p_error_message text,
  p_error_code text default null,
  p_stage text default 'start_processing'
)
returns public.video_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_submission public.video_submissions;
  v_message text := nullif(btrim(coalesce(p_error_message, '')), '');
  v_stage text := nullif(btrim(coalesce(p_stage, '')), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_submission_id is null then
    raise exception 'Submission id is required'
      using errcode = '22023';
  end if;

  if v_message is null then
    v_message := 'Could not start video processing';
  end if;

  update public.video_submissions vs
  set
    status = 'recoverable_error',
    error_message = left(v_message, 1000),
    recoverable = true,
    completed_at = now(),
    metadata = coalesce(vs.metadata, '{}'::jsonb) || jsonb_build_object(
      'clientError',
      jsonb_build_object(
        'code', p_error_code,
        'stage', coalesce(v_stage, 'start_processing'),
        'message', left(v_message, 1000),
        'createdAt', now()
      )
    )
  where vs.id = p_submission_id
    and vs.user_id = v_user_id
    and vs.status in ('pending', 'processing', 'recoverable_error')
  returning * into v_submission;

  if v_submission.id is null then
    raise exception 'Submission not found or cannot be marked as recoverable'
      using errcode = 'P0002';
  end if;

  return v_submission;
end;
$$;

revoke all on function public.mark_video_submission_client_error(uuid, text, text, text) from public, anon;
grant execute on function public.mark_video_submission_client_error(uuid, text, text, text) to authenticated;

comment on function public.mark_video_submission_client_error(uuid, text, text, text) is
  'Allows the owner to mark a pending/processing video submission as recoverable_error when the client cannot start the Edge Function.';

create or replace view public.v_video_exhibition
with (security_invoker = true) as
select
  v.*,
  c.name as category_name,
  c.slug as category_slug,
  c.color as category_color,
  p.username as submitted_by_username,
  p.display_name as submitted_by_display_name,
  p.avatar_url as submitted_by_avatar_url,
  le.optimized_title as enrichment_optimized_title,
  le.short_summary as enrichment_short_summary,
  le.summary_description as enrichment_summary_description,
  le.cultural_relevance as enrichment_cultural_relevance,
  le.semantic_tags as enrichment_semantic_tags,
  le.language as enrichment_language,
  coalesce(pc.playlist_count, 0) as playlist_count,
  coalesce(cc.comment_count, 0) as comment_count,
  coalesce(nullif(le.language, ''), v.language) as detected_language,
  coalesce(nullif(le.language, ''), v.language) as effective_language,
  lt.summary as transcript_summary,
  lt.language as transcript_language,
  lt.status as transcript_status
from public.videos v
left join public.categories c on c.id = v.category_id
left join public.profiles p on p.id = v.submitted_by
left join lateral (
  select
    ae.optimized_title,
    ae.short_summary,
    ae.summary_description,
    ae.cultural_relevance,
    ae.semantic_tags,
    ae.language
  from public.ai_enrichments ae
  where ae.video_id = v.id
  order by ae.created_at desc nulls last
  limit 1
) le on true
left join lateral (
  select
    vt.summary,
    vt.language,
    vt.status
  from public.video_transcripts vt
  where vt.video_id = v.id
  order by vt.created_at desc nulls last
  limit 1
) lt on true
left join lateral (
  select count(*)::int as playlist_count
  from public.playlist_videos pv
  where pv.video_id = v.id
) pc on true
left join lateral (
  select count(*)::int as comment_count
  from public.comments cm
  where cm.video_id = v.id
) cc on true;

grant select on public.v_video_exhibition to anon, authenticated;
