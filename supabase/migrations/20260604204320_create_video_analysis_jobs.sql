create table if not exists public.video_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  submission_id uuid references public.video_submissions(id) on delete set null,
  status text not null default 'pending',
  provider text not null default 'v2',
  provider_model text,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint video_analysis_jobs_status_check check (
    status in ('pending', 'processing', 'completed', 'failed', 'recoverable_error', 'skipped')
  ),
  constraint video_analysis_jobs_completed_status_check check (
    (status in ('completed', 'failed', 'skipped') and completed_at is not null)
    or (status not in ('completed', 'failed', 'skipped'))
  )
);

comment on table public.video_analysis_jobs is
  'Tracks optional deep video analysis separately from fast video_submissions completion.';
comment on column public.video_analysis_jobs.metadata is
  'Operational metadata for the deep-analysis job. Must not store raw transcripts, secrets, emails, or private payloads.';

create index if not exists video_analysis_jobs_video_id_idx
  on public.video_analysis_jobs(video_id);
create index if not exists video_analysis_jobs_submission_id_idx
  on public.video_analysis_jobs(submission_id);
create index if not exists video_analysis_jobs_status_idx
  on public.video_analysis_jobs(status);
create index if not exists video_analysis_jobs_created_at_idx
  on public.video_analysis_jobs(created_at desc);
create unique index if not exists video_analysis_jobs_video_provider_active_idx
  on public.video_analysis_jobs(video_id, provider)
  where status in ('pending', 'processing', 'recoverable_error');

create or replace function public.set_video_analysis_jobs_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists video_analysis_jobs_set_updated_at on public.video_analysis_jobs;
create trigger video_analysis_jobs_set_updated_at
before update on public.video_analysis_jobs
for each row
execute function public.set_video_analysis_jobs_updated_at();

alter table public.video_analysis_jobs enable row level security;

revoke all on table public.video_analysis_jobs from anon;
grant select, update on table public.video_analysis_jobs to authenticated;
grant select, insert, update, delete on table public.video_analysis_jobs to service_role;

drop policy if exists video_analysis_jobs_select_owner_or_editor on public.video_analysis_jobs;
create policy video_analysis_jobs_select_owner_or_editor
on public.video_analysis_jobs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('editor', 'admin')
  )
  or exists (
    select 1
    from public.videos v
    where v.id = video_analysis_jobs.video_id
      and v.submitted_by = (select auth.uid())
  )
  or exists (
    select 1
    from public.video_submissions vs
    where vs.id = video_analysis_jobs.submission_id
      and vs.user_id = (select auth.uid())
  )
);

drop policy if exists video_analysis_jobs_update_editor_admin on public.video_analysis_jobs;
create policy video_analysis_jobs_update_editor_admin
on public.video_analysis_jobs
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('editor', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('editor', 'admin')
  )
);
