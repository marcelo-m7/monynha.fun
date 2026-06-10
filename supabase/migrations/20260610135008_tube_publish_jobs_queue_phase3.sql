begin;

create table if not exists tube.publish_jobs (
	id uuid primary key default gen_random_uuid(),
	module_id uuid not null references tube.modules(id) on delete cascade,
	curation_queue_id uuid references tube.curation_queue(id) on delete set null,
	status text not null default 'queued',
	attempt_count integer not null default 0,
	max_attempts integer not null default 5,
	next_retry_at timestamptz not null default now(),
	locked_at timestamptz,
	locked_by text,
	started_at timestamptz,
	finished_at timestamptz,
	last_error_code text,
	last_error_message text,
	last_error_at timestamptz,
	idempotency_key text not null,
	payload jsonb not null default '{}'::jsonb,
	requested_by uuid references public.profiles(id) on delete set null,
	requested_at timestamptz not null default now(),
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint tube_publish_jobs_status_check check (
		status = any (array['queued', 'processing', 'succeeded', 'failed', 'retryable_error', 'cancelled'])
	),
	constraint tube_publish_jobs_attempt_non_negative check (attempt_count >= 0),
	constraint tube_publish_jobs_max_attempts_positive check (max_attempts > 0),
	constraint tube_publish_jobs_idempotency_unique unique (idempotency_key)
);

create index if not exists idx_tube_publish_jobs_status_retry
	on tube.publish_jobs (status, next_retry_at, created_at);
create index if not exists idx_tube_publish_jobs_module
	on tube.publish_jobs (module_id, created_at desc);
create index if not exists idx_tube_publish_jobs_curation_queue
	on tube.publish_jobs (curation_queue_id);
create index if not exists idx_tube_publish_jobs_requested_by
	on tube.publish_jobs (requested_by);

drop trigger if exists trg_tube_publish_jobs_updated_at on tube.publish_jobs;
create trigger trg_tube_publish_jobs_updated_at
before update on tube.publish_jobs
for each row execute function tube.set_updated_at();

alter table tube.publish_jobs enable row level security;

drop policy if exists tube_editor_manage_publish_jobs on tube.publish_jobs;
create policy tube_editor_manage_publish_jobs
on tube.publish_jobs
for all
to authenticated
using ((select tube.is_editor_or_admin()))
with check ((select tube.is_editor_or_admin()));

create or replace function tube.enqueue_module_publication(
	p_module_id uuid,
	p_actor_id uuid default null,
	p_payload jsonb default '{}'::jsonb,
	p_force boolean default false
)
returns table (job_id uuid, status text, created boolean)
language plpgsql
security definer
set search_path = tube, public, pg_temp
as $$
declare
	v_module_exists boolean;
	v_job tube.publish_jobs%rowtype;
	v_curation_queue_id uuid;
	v_idempotency_key text;
begin
	if current_user not in ('service_role', 'postgres') then
		raise exception 'tube.enqueue_module_publication is restricted to service role';
	end if;

	select exists(
		select 1
		from tube.modules m
		where m.id = p_module_id
	)
	into v_module_exists;

	if not v_module_exists then
		raise exception 'module % not found', p_module_id using errcode = 'P0002';
	end if;

	select q.id
	into v_curation_queue_id
	from tube.curation_queue q
	where q.entity_type = 'module'
		and q.entity_id = p_module_id
		and q.status in ('approved', 'edited')
	order by q.updated_at desc, q.created_at desc
	limit 1;

	v_idempotency_key := format(
		'%s:%s:%s',
		p_module_id,
		coalesce(v_curation_queue_id::text, 'none'),
		md5(coalesce(p_payload, '{}'::jsonb)::text)
	);

	if p_force then
		v_idempotency_key := format('%s:force:%s', p_module_id, gen_random_uuid());
	end if;

	insert into tube.publish_jobs (
		module_id,
		curation_queue_id,
		status,
		attempt_count,
		max_attempts,
		next_retry_at,
		idempotency_key,
		payload,
		requested_by,
		requested_at,
		metadata
	)
	values (
		p_module_id,
		v_curation_queue_id,
		'queued',
		0,
		5,
		now(),
		v_idempotency_key,
		coalesce(p_payload, '{}'::jsonb),
		p_actor_id,
		now(),
		jsonb_build_object('source', 'tube.enqueue_module_publication')
	)
	on conflict (idempotency_key) do nothing
	returning * into v_job;

	if found then
		return query select v_job.id, v_job.status, true;
		return;
	end if;

	select *
	into v_job
	from tube.publish_jobs pj
	where pj.idempotency_key = v_idempotency_key
	limit 1;

	return query select v_job.id, v_job.status, false;
end;
$$;

revoke all on function tube.enqueue_module_publication(uuid, uuid, jsonb, boolean) from public;
grant execute on function tube.enqueue_module_publication(uuid, uuid, jsonb, boolean) to service_role;

commit;
