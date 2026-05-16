-- DB-02/DB-03: asynchronous video submission status and detected-language contract.

create table if not exists public.video_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid references public.videos(id) on delete set null,
  duplicate_video_id uuid references public.videos(id) on delete set null,
  youtube_id text not null,
  youtube_url text not null,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  recoverable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processing_started_at timestamptz,
  completed_at timestamptz,
  constraint video_submissions_status_check check (
    status in (
      'pending',
      'processing',
      'success',
      'failed',
      'duplicate',
      'recoverable_error'
    )
  ),
  constraint video_submissions_duplicate_status_check check (
    status <> 'duplicate'
      or duplicate_video_id is not null
      or video_id is not null
  ),
  constraint video_submissions_error_status_check check (
    status not in ('failed', 'recoverable_error')
      or error_message is not null
  ),
  constraint video_submissions_completed_status_check check (
    completed_at is null
      or status in ('success', 'failed', 'duplicate', 'recoverable_error')
  )
);

comment on table public.video_submissions is
  'Tracks asynchronous Tube O2 video submissions. /submit/status/:id uses video_submissions.id.';
comment on column public.video_submissions.status is
  'Allowed states: pending, processing, success, failed, duplicate, recoverable_error.';
comment on column public.video_submissions.metadata is
  'Small JSON payload for worker/frontend coordination, such as enrichmentId, detectedLanguage, and assignment result.';
comment on column public.video_submissions.duplicate_video_id is
  'Existing video matched during duplicate detection, when available.';

create index if not exists video_submissions_user_id_idx
  on public.video_submissions(user_id);
create index if not exists video_submissions_video_id_idx
  on public.video_submissions(video_id);
create index if not exists video_submissions_duplicate_video_id_idx
  on public.video_submissions(duplicate_video_id);
create index if not exists video_submissions_youtube_id_idx
  on public.video_submissions(youtube_id);
create index if not exists video_submissions_status_idx
  on public.video_submissions(status);
create index if not exists video_submissions_created_at_idx
  on public.video_submissions(created_at desc);

create or replace function public.set_video_submissions_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists video_submissions_set_updated_at on public.video_submissions;
create trigger video_submissions_set_updated_at
before update on public.video_submissions
for each row
execute function public.set_video_submissions_updated_at();

alter table public.video_submissions enable row level security;

revoke all on table public.video_submissions from anon;
grant select, insert on table public.video_submissions to authenticated;
grant select, insert, update, delete on table public.video_submissions to service_role;

drop policy if exists video_submissions_owner_select on public.video_submissions;
create policy video_submissions_owner_select
  on public.video_submissions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists video_submissions_owner_insert on public.video_submissions;
create policy video_submissions_owner_insert
  on public.video_submissions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Submit can omit manual language. Keep videos.language canonical for filters,
-- with 'und' as the transitional "undetermined" value until enrichment detects it.
alter table public.videos
  alter column language set default 'und';

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
  coalesce(nullif(le.language, ''), v.language) as effective_language
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
