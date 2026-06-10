begin;

alter table tube.modules
	add column if not exists facodi_course_id uuid references facodi.courses(id) on delete set null,
	add column if not exists facodi_curricular_unit_id uuid references facodi.curricular_units(id) on delete set null;

create index if not exists idx_tube_modules_facodi_course on tube.modules (facodi_course_id);
create index if not exists idx_tube_modules_facodi_unit on tube.modules (facodi_curricular_unit_id);

create table if not exists tube.facodi_video_publications (
	id uuid primary key default gen_random_uuid(),
	tube_video_id uuid not null references tube.videos(id) on delete cascade,
	module_id uuid references tube.modules(id) on delete set null,
	facodi_video_id uuid not null references facodi.youtube_videos(id) on delete cascade,
	published_by uuid references public.profiles(id) on delete set null,
	published_at timestamptz not null default now(),
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint tube_facodi_video_publications_tube_video_unique unique (tube_video_id)
);

create index if not exists idx_tube_facodi_video_publications_module
	on tube.facodi_video_publications (module_id);
create index if not exists idx_tube_facodi_video_publications_facodi_video
	on tube.facodi_video_publications (facodi_video_id);

drop trigger if exists trg_tube_facodi_video_publications_updated_at on tube.facodi_video_publications;
create trigger trg_tube_facodi_video_publications_updated_at
before update on tube.facodi_video_publications
for each row execute function tube.set_updated_at();

alter table tube.facodi_video_publications enable row level security;

drop policy if exists tube_editor_manage_facodi_video_publications on tube.facodi_video_publications;
create policy tube_editor_manage_facodi_video_publications
on tube.facodi_video_publications
for all
to authenticated
using ((select tube.is_editor_or_admin()))
with check ((select tube.is_editor_or_admin()));

create or replace function tube.publish_module_to_facodi(
	p_module_id uuid,
	p_actor_id uuid default null
)
returns table (module_id uuid, published_count integer)
language plpgsql
security definer
set search_path = tube, facodi, public, pg_temp
as $$
declare
	v_module tube.modules%rowtype;
	v_video record;
	v_facodi_video_id uuid;
	v_unit_id uuid;
	v_course_id uuid;
	v_count integer := 0;
begin
	if current_user not in ('service_role', 'postgres') then
		raise exception 'tube.publish_module_to_facodi is restricted to service role';
	end if;

	select *
	into v_module
	from tube.modules
	where id = p_module_id;

	if not found then
		raise exception 'module % not found', p_module_id using errcode = 'P0002';
	end if;

	v_unit_id := v_module.facodi_curricular_unit_id;
	v_course_id := v_module.facodi_course_id;

	if v_unit_id is null then
		select um.facodi_curricular_unit_id
		into v_unit_id
		from tube.unit_matches um
		where um.module_id = p_module_id
		order by um.score desc nulls last, um.created_at desc
		limit 1;
	end if;

	if v_course_id is null and v_unit_id is not null then
		select cu.course_id
		into v_course_id
		from facodi.curricular_units cu
		where cu.id = v_unit_id;
	end if;

	if v_course_id is null then
		select cm.facodi_course_id
		into v_course_id
		from tube.course_modules cmod
		join tube.course_matches cm on cm.course_candidate_id = cmod.course_candidate_id
		where cmod.module_id = p_module_id
		order by cm.score desc nulls last, cm.created_at desc
		limit 1;
	end if;

	update tube.modules
	set facodi_course_id = coalesce(facodi_course_id, v_course_id),
			facodi_curricular_unit_id = coalesce(facodi_curricular_unit_id, v_unit_id),
			updated_at = now()
	where id = p_module_id;

	for v_video in
		select
			v.id,
			v.youtube_video_id,
			v.title,
			v.description,
			v.duration_seconds,
			v.published_at,
			v.thumbnail_url,
			v.language,
			v.metadata,
			ch.youtube_channel_id,
			ch.title as channel_title
		from tube.module_videos mv
		join tube.videos v on v.id = mv.video_id
		join tube.channels ch on ch.id = v.channel_id
		where mv.module_id = p_module_id
		order by mv.position nulls last, mv.created_at, v.created_at
	loop
		insert into facodi.youtube_videos (
			youtube_video_id,
			canonical_url,
			title,
			description,
			channel_id,
			channel_title,
			duration_seconds,
			published_at,
			thumbnails,
			language,
			metadata,
			status,
			updated_at
		)
		values (
			v_video.youtube_video_id,
			format('https://www.youtube.com/watch?v=%s', v_video.youtube_video_id),
			v_video.title,
			v_video.description,
			v_video.youtube_channel_id,
			v_video.channel_title,
			v_video.duration_seconds,
			v_video.published_at,
			jsonb_build_object('default', jsonb_build_object('url', v_video.thumbnail_url)),
			coalesce(v_video.language, 'und'),
			coalesce(v_video.metadata, '{}'::jsonb) || jsonb_build_object(
				'tube',
				jsonb_build_object(
					'video_id', v_video.id,
					'module_id', p_module_id
				)
			),
			'processed',
			now()
		)
		on conflict (youtube_video_id) do update
			set canonical_url = excluded.canonical_url,
					title = excluded.title,
					description = excluded.description,
					channel_id = excluded.channel_id,
					channel_title = excluded.channel_title,
					duration_seconds = excluded.duration_seconds,
					published_at = excluded.published_at,
					thumbnails = excluded.thumbnails,
					language = excluded.language,
					metadata = coalesce(facodi.youtube_videos.metadata, '{}'::jsonb) || excluded.metadata,
					status = excluded.status,
					updated_at = now()
		returning id into v_facodi_video_id;

		insert into tube.facodi_video_publications (
			tube_video_id,
			module_id,
			facodi_video_id,
			published_by,
			published_at,
			metadata
		)
		values (
			v_video.id,
			p_module_id,
			v_facodi_video_id,
			p_actor_id,
			now(),
			jsonb_build_object('source', 'tube.publish_module_to_facodi')
		)
		on conflict (tube_video_id) do update
			set module_id = excluded.module_id,
					facodi_video_id = excluded.facodi_video_id,
					published_by = excluded.published_by,
					published_at = excluded.published_at,
					metadata = coalesce(tube.facodi_video_publications.metadata, '{}'::jsonb) || excluded.metadata,
					updated_at = now();

		if v_unit_id is not null then
			insert into facodi.video_classifications (
				video_id,
				course_id,
				curricular_unit_id,
				confidence,
				confidence_level,
				status,
				needs_review,
				justification,
				evidence,
				metadata,
				reviewed_by,
				reviewed_at
			)
			select
				v_facodi_video_id,
				coalesce(v_course_id, cu.course_id),
				v_unit_id,
				1.0,
				'high',
				'approved',
				false,
				'Published from curated Tube module',
				jsonb_build_array(
					jsonb_build_object(
						'module_id', p_module_id,
						'tube_video_id', v_video.id
					)
				),
				jsonb_build_object(
					'source', 'tube.publish_module_to_facodi',
					'tube_module_id', p_module_id
				),
				p_actor_id,
				now()
			from facodi.curricular_units cu
			where cu.id = v_unit_id
				and not exists (
					select 1
					from facodi.video_classifications vc
					where vc.video_id = v_facodi_video_id
						and vc.curricular_unit_id = v_unit_id
				);
		end if;

		v_count := v_count + 1;
	end loop;

	update tube.curation_queue
	set status = 'published',
			published_at = coalesce(published_at, now()),
			reviewed_by = coalesce(reviewed_by, p_actor_id),
			reviewed_at = coalesce(reviewed_at, now()),
			updated_at = now()
	where entity_type = 'module'
		and entity_id = p_module_id
		and status in ('approved', 'edited');

	return query select p_module_id, v_count;
end;
$$;

revoke all on function tube.publish_module_to_facodi(uuid, uuid) from public;
grant execute on function tube.publish_module_to_facodi(uuid, uuid) to service_role;

commit;
