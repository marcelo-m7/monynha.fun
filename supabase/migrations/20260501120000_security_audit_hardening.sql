-- Security and performance hardening from 2026-05 audit

-- 1) Add covering indexes for foreign keys and common lookups
create index if not exists idx_comments_user_id on public.comments (user_id);
create index if not exists idx_comments_video_id on public.comments (video_id);
create index if not exists idx_notifications_actor_id on public.notifications (actor_id) where actor_id is not null;
create index if not exists idx_video_view_events_user_id on public.video_view_events (user_id) where user_id is not null;

-- 2) Tighten permissive INSERT policies

drop policy if exists "ai_enrichments_insert_policy" on public.ai_enrichments;
create policy "ai_enrichments_insert_policy"
on public.ai_enrichments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.videos v
    where v.id = ai_enrichments.video_id
      and v.submitted_by = (select auth.uid())
  )
);

drop policy if exists "Enable insert for authenticated users only" on public.categories;
create policy "Enable insert for authenticated users only"
on public.categories
for insert
to authenticated
with check (((select auth.jwt()) ->> 'role') = 'admin');

drop policy if exists "notifications_insert_authenticated" on public.notifications;
create policy "notifications_insert_authenticated"
on public.notifications
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (actor_id is null or actor_id = (select auth.uid()))
);

drop policy if exists "Allow public insert leads" on public.leads;
create policy "Allow public insert leads"
on public.leads
for insert
to public
with check (
  email is not null
  and length(trim(email)) between 5 and 320
  and position('@' in email) > 1
  and coalesce(status, 'new') = 'new'
);

-- 3) Make search_path explicit for mutable functions
alter function public.update_updated_at_column() set search_path = public, pg_temp;
alter function public.playlist_accessible_to_user(uuid) set search_path = public, pg_temp;
alter function public.save_lead_with_diagnosis(
  character varying,
  character varying,
  boolean,
  character varying,
  character varying,
  character varying,
  character varying,
  character varying,
  character varying,
  text,
  character varying,
  text,
  numeric,
  numeric,
  numeric,
  text[],
  jsonb
) set search_path = public, pg_temp;
alter function public.update_playlist_thumbnail_from_first_video(uuid) set search_path = public, pg_temp;
alter function public.update_playlist_derived_fields(uuid) set search_path = public, pg_temp;

-- 4) Add explicit read policies for RLS-enabled tables without policies
-- (service_role continues to bypass RLS for server-side writes)

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'video_view_events'
      and policyname = 'video_view_events_select_own'
  ) then
    create policy "video_view_events_select_own"
    on public.video_view_events
    for select
    to authenticated
    using (user_id = (select auth.uid()));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'edge_function_logs'
      and policyname = 'edge_function_logs_admin_select'
  ) then
    create policy "edge_function_logs_admin_select"
    on public.edge_function_logs
    for select
    to authenticated
    using (((select auth.jwt()) ->> 'role') = 'admin');
  end if;
end
$$;
