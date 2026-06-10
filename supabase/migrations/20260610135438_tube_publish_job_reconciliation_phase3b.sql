begin;

create table if not exists tube.publish_job_events (
	id uuid primary key default gen_random_uuid(),
	publish_job_id uuid not null references tube.publish_jobs(id) on delete cascade,
	event_type text not null,
	event_payload jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	constraint tube_publish_job_events_event_type_check check (
		event_type = any (array['enqueued', 'claimed', 'succeeded', 'retryable_error', 'failed', 'cancelled'])
	)
);

create index if not exists idx_tube_publish_job_events_job_created
	on tube.publish_job_events (publish_job_id, created_at desc);
create index if not exists idx_tube_publish_job_events_type_created
	on tube.publish_job_events (event_type, created_at desc);

alter table tube.publish_job_events enable row level security;

drop policy if exists tube_editor_manage_publish_job_events on tube.publish_job_events;
create policy tube_editor_manage_publish_job_events
on tube.publish_job_events
for all
to authenticated
using ((select tube.is_editor_or_admin()))
with check ((select tube.is_editor_or_admin()));

create or replace function tube.claim_publish_jobs(
	p_limit integer default 10,
	p_lock_id text default null
)
returns table (
	id uuid,
	module_id uuid,
	max_attempts integer,
	attempt_count integer,
	requested_by uuid
)
language plpgsql
security definer
set search_path = tube, public, pg_temp
as $$
declare
	v_effective_limit integer;
	v_lock_id text;
begin
	if current_user not in ('service_role', 'postgres') then
		raise exception 'tube.claim_publish_jobs is restricted to service role';
	end if;

	v_effective_limit := greatest(1, least(coalesce(p_limit, 10), 100));
	v_lock_id := coalesce(nullif(p_lock_id, ''), gen_random_uuid()::text);

	return query
	with candidates as (
		select pj.id
		from tube.publish_jobs pj
		where pj.status = any (array['queued', 'retryable_error'])
			and pj.next_retry_at <= now()
		order by pj.created_at asc
		for update skip locked
		limit v_effective_limit
	),
	updated as (
		update tube.publish_jobs pj
		set status = 'processing',
			locked_at = now(),
			locked_by = v_lock_id,
			started_at = coalesce(pj.started_at, now()),
			attempt_count = pj.attempt_count + 1,
			updated_at = now()
		from candidates c
		where pj.id = c.id
		returning pj.id, pj.module_id, pj.max_attempts, pj.attempt_count, pj.requested_by
	),
	events as (
		insert into tube.publish_job_events (publish_job_id, event_type, event_payload)
		select
			u.id,
			'claimed',
			jsonb_build_object(
				'attempt_count', u.attempt_count,
				'lock_id', v_lock_id
			)
		from updated u
	)
	select u.id, u.module_id, u.max_attempts, u.attempt_count, u.requested_by
	from updated u;
end;
$$;

create or replace view tube.v_publish_job_reconciliation as
select
	pj.id as publish_job_id,
	pj.module_id,
	pj.status,
	pj.attempt_count,
	pj.max_attempts,
	pj.requested_by,
	pj.requested_at,
	pj.finished_at,
	pj.last_error_code,
	pj.last_error_message,
	count(distinct fvp.id) as publication_records,
	count(distinct fvp.tube_video_id) as published_videos,
	max(fvp.published_at) as last_published_at
from tube.publish_jobs pj
left join tube.facodi_video_publications fvp
	on fvp.module_id = pj.module_id
group by
	pj.id,
	pj.module_id,
	pj.status,
	pj.attempt_count,
	pj.max_attempts,
	pj.requested_by,
	pj.requested_at,
	pj.finished_at,
	pj.last_error_code,
	pj.last_error_message;

revoke all on function tube.claim_publish_jobs(integer, text) from public;
grant execute on function tube.claim_publish_jobs(integer, text) to service_role;

commit;
