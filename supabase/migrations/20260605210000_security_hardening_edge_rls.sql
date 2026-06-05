-- Security hardening for user-triggered Edge Function flows and public policies.

-- Keep the public AI-enrichment policy aligned with its documented contract:
-- anonymous reads are allowed only for enrichments whose video is public.
drop policy if exists "Public can read AI enrichment for public videos" on public.ai_enrichments;

create policy "Public can read AI enrichment for public videos"
on public.ai_enrichments
for select
to anon
using (
  exists (
    select 1
    from public.videos
    where videos.id = ai_enrichments.video_id
      and videos.is_public is true
  )
);

-- The taxonomy repair audit table is intentionally not exposed to client roles,
-- but an explicit service-role policy keeps the RLS posture clear to advisors.
revoke all on table public.video_taxonomy_correction_audit from public, anon, authenticated;
grant select, insert, update, delete on table public.video_taxonomy_correction_audit to service_role;

drop policy if exists video_taxonomy_correction_audit_service_role_all on public.video_taxonomy_correction_audit;
create policy video_taxonomy_correction_audit_service_role_all
on public.video_taxonomy_correction_audit
for all
to service_role
using (true)
with check (true);

-- Shared server-side rate-limit buckets for Supabase Edge Functions. Client roles
-- receive no direct access; service-role functions use check_edge_rate_limit().
create table if not exists public.edge_rate_limits (
  id uuid primary key default gen_random_uuid(),
  function_name text not null,
  subject_id uuid not null,
  window_seconds integer not null check (window_seconds > 0),
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (function_name, subject_id, window_seconds, window_start)
);

comment on table public.edge_rate_limits is
  'Server-side counters for per-user Edge Function rate limiting. Managed only by service-role Edge Functions.';

create index if not exists edge_rate_limits_subject_idx
  on public.edge_rate_limits(subject_id, function_name, window_start desc);

create index if not exists edge_rate_limits_cleanup_idx
  on public.edge_rate_limits(window_start);

alter table public.edge_rate_limits enable row level security;
revoke all on table public.edge_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.edge_rate_limits to service_role;

drop policy if exists edge_rate_limits_service_role_all on public.edge_rate_limits;
create policy edge_rate_limits_service_role_all
on public.edge_rate_limits
for all
to service_role
using (true)
with check (true);

create or replace function public.check_edge_rate_limit(
  p_function_name text,
  p_subject_id uuid,
  p_window_seconds integer,
  p_max_requests integer
)
returns table (
  allowed boolean,
  request_count integer,
  retry_after_seconds integer
)
language sql
security definer
set search_path = public, pg_temp
as $$
  with params as (
    select
      nullif(btrim(p_function_name), '') as function_name,
      p_subject_id as subject_id,
      greatest(p_window_seconds, 1) as window_seconds,
      greatest(p_max_requests, 1) as max_requests,
      to_timestamp(
        floor(extract(epoch from now()) / greatest(p_window_seconds, 1))
        * greatest(p_window_seconds, 1)
      ) as window_start
  ), upserted as (
    insert into public.edge_rate_limits (
      function_name,
      subject_id,
      window_seconds,
      window_start,
      request_count
    )
    select
      function_name,
      subject_id,
      window_seconds,
      window_start,
      1
    from params
    where function_name is not null
      and subject_id is not null
    on conflict (function_name, subject_id, window_seconds, window_start)
    do update set
      request_count = public.edge_rate_limits.request_count + 1,
      updated_at = now()
    returning
      public.edge_rate_limits.request_count,
      public.edge_rate_limits.window_start,
      public.edge_rate_limits.window_seconds
  )
  select
    upserted.request_count <= params.max_requests as allowed,
    upserted.request_count,
    greatest(
      1,
      ceil(extract(epoch from (upserted.window_start + (upserted.window_seconds * interval '1 second') - now())))::integer
    ) as retry_after_seconds
  from upserted
  cross join params;
$$;

comment on function public.check_edge_rate_limit(text, uuid, integer, integer) is
  'Atomically increments and checks an Edge Function rate-limit bucket. Intended for service-role Edge Functions only.';

revoke all on function public.check_edge_rate_limit(text, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.check_edge_rate_limit(text, uuid, integer, integer) to service_role;
