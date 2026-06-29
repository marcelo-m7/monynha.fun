create or replace function facodi.create_learning_object(
	p_object_type text,
	p_title text,
	p_slug text default null,
	p_description text default null,
	p_objectives jsonb default '[]'::jsonb,
	p_keywords text[] default '{}'::text[],
	p_tags text[] default '{}'::text[],
	p_language text default 'und',
	p_status text default 'draft',
	p_published boolean default false,
	p_source_type text default 'manual',
	p_source_url text default null,
	p_source_id text default null,
	p_metadata jsonb default '{}'::jsonb,
	p_created_by uuid default null,
	p_merge_metadata boolean default true
)
returns facodi.learning_objects
language plpgsql
security invoker
set search_path = facodi, public, extensions, pg_temp
as $$
declare
	v_object facodi.learning_objects%rowtype;
	v_slug text;
	v_source_id text;
begin
	if nullif(btrim(p_object_type), '') is null then
		raise exception 'object_type is required' using errcode = '22023';
	end if;

	if nullif(btrim(p_title), '') is null then
		raise exception 'title is required' using errcode = '22023';
	end if;

	v_slug := coalesce(nullif(btrim(p_slug), ''), lower(regexp_replace(btrim(p_title), '[^a-zA-Z0-9]+', '-', 'g')));
	v_slug := trim(both '-' from v_slug);

	if v_slug = '' then
		v_slug := replace(gen_random_uuid()::text, '-', '');
	end if;

	v_source_id := nullif(btrim(p_source_id), '');

	if v_source_id is not null then
		insert into facodi.learning_objects (
			object_type,
			title,
			slug,
			description,
			objectives,
			keywords,
			tags,
			language,
			status,
			published,
			source_type,
			source_url,
			source_id,
			metadata,
			created_by
		)
		values (
			btrim(p_object_type),
			btrim(p_title),
			v_slug,
			nullif(btrim(p_description), ''),
			coalesce(p_objectives, '[]'::jsonb),
			coalesce(p_keywords, '{}'::text[]),
			coalesce(p_tags, '{}'::text[]),
			coalesce(nullif(btrim(p_language), ''), 'und'),
			coalesce(nullif(btrim(p_status), ''), 'draft'),
			coalesce(p_published, false),
			coalesce(nullif(btrim(p_source_type), ''), 'manual'),
			nullif(btrim(p_source_url), ''),
			v_source_id,
			coalesce(p_metadata, '{}'::jsonb),
			p_created_by
		)
		on conflict (source_type, source_id) where source_id is not null do update
			set title = excluded.title,
				description = coalesce(excluded.description, facodi.learning_objects.description),
				objectives = case when excluded.objectives <> '[]'::jsonb then excluded.objectives else facodi.learning_objects.objectives end,
				keywords = case when cardinality(excluded.keywords) > 0 then excluded.keywords else facodi.learning_objects.keywords end,
				tags = case when cardinality(excluded.tags) > 0 then excluded.tags else facodi.learning_objects.tags end,
				language = coalesce(nullif(excluded.language, 'und'), facodi.learning_objects.language, 'und'),
				status = excluded.status,
				published = excluded.published,
				source_url = coalesce(excluded.source_url, facodi.learning_objects.source_url),
				metadata = case
					when p_merge_metadata then coalesce(facodi.learning_objects.metadata, '{}'::jsonb) || excluded.metadata
					else excluded.metadata
				end,
				updated_at = now()
		returning * into v_object;
	else
		insert into facodi.learning_objects (
			object_type,
			title,
			slug,
			description,
			objectives,
			keywords,
			tags,
			language,
			status,
			published,
			source_type,
			source_url,
			metadata,
			created_by
		)
		values (
			btrim(p_object_type),
			btrim(p_title),
			v_slug,
			nullif(btrim(p_description), ''),
			coalesce(p_objectives, '[]'::jsonb),
			coalesce(p_keywords, '{}'::text[]),
			coalesce(p_tags, '{}'::text[]),
			coalesce(nullif(btrim(p_language), ''), 'und'),
			coalesce(nullif(btrim(p_status), ''), 'draft'),
			coalesce(p_published, false),
			coalesce(nullif(btrim(p_source_type), ''), 'manual'),
			nullif(btrim(p_source_url), ''),
			coalesce(p_metadata, '{}'::jsonb),
			p_created_by
		)
		on conflict (object_type, slug) do update
			set title = excluded.title,
				description = coalesce(excluded.description, facodi.learning_objects.description),
				objectives = case when excluded.objectives <> '[]'::jsonb then excluded.objectives else facodi.learning_objects.objectives end,
				keywords = case when cardinality(excluded.keywords) > 0 then excluded.keywords else facodi.learning_objects.keywords end,
				tags = case when cardinality(excluded.tags) > 0 then excluded.tags else facodi.learning_objects.tags end,
				language = coalesce(nullif(excluded.language, 'und'), facodi.learning_objects.language, 'und'),
				status = excluded.status,
				published = excluded.published,
				source_url = coalesce(excluded.source_url, facodi.learning_objects.source_url),
				metadata = case
					when p_merge_metadata then coalesce(facodi.learning_objects.metadata, '{}'::jsonb) || excluded.metadata
					else excluded.metadata
				end,
				updated_at = now()
		returning * into v_object;
	end if;

	return v_object;
end;
$$;

create or replace function facodi.update_learning_object_metadata(
	p_learning_object_id uuid,
	p_metadata jsonb default '{}'::jsonb,
	p_title text default null,
	p_description text default null,
	p_objectives jsonb default null,
	p_keywords text[] default null,
	p_tags text[] default null,
	p_status text default null,
	p_published boolean default null,
	p_merge_metadata boolean default true
)
returns facodi.learning_objects
language plpgsql
security invoker
set search_path = facodi, public, pg_temp
as $$
declare
	v_object facodi.learning_objects%rowtype;
begin
	update facodi.learning_objects
	set title = coalesce(nullif(btrim(p_title), ''), title),
		description = coalesce(nullif(btrim(p_description), ''), description),
		objectives = coalesce(p_objectives, objectives),
		keywords = coalesce(p_keywords, keywords),
		tags = coalesce(p_tags, tags),
		status = coalesce(nullif(btrim(p_status), ''), status),
		published = coalesce(p_published, published),
		metadata = case
			when p_merge_metadata then coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb)
			else coalesce(p_metadata, '{}'::jsonb)
		end,
		updated_at = now()
	where id = p_learning_object_id
	returning * into v_object;

	if not found then
		raise exception 'learning object % not found', p_learning_object_id using errcode = 'P0002';
	end if;

	return v_object;
end;
$$;

create or replace function facodi.link_learning_objects(
	p_parent_object_id uuid,
	p_child_object_id uuid,
	p_relation_type text,
	p_position integer default null,
	p_weight numeric default null,
	p_confidence_score numeric default null,
	p_created_by_mechanism text default null,
	p_metadata jsonb default '{}'::jsonb,
	p_created_by uuid default null
)
returns facodi.learning_object_relations
language plpgsql
security invoker
set search_path = facodi, public, pg_temp
as $$
declare
	v_relation facodi.learning_object_relations%rowtype;
begin
	insert into facodi.learning_object_relations (
		parent_object_id,
		child_object_id,
		relation_type,
		position,
		weight,
		confidence_score,
		created_by_mechanism,
		metadata,
		created_by
	)
	values (
		p_parent_object_id,
		p_child_object_id,
		btrim(p_relation_type),
		p_position,
		p_weight,
		p_confidence_score,
		nullif(btrim(p_created_by_mechanism), ''),
		coalesce(p_metadata, '{}'::jsonb),
		p_created_by
	)
	on conflict (parent_object_id, child_object_id, relation_type) do update
		set position = coalesce(excluded.position, facodi.learning_object_relations.position),
			weight = coalesce(excluded.weight, facodi.learning_object_relations.weight),
			confidence_score = coalesce(excluded.confidence_score, facodi.learning_object_relations.confidence_score),
			created_by_mechanism = coalesce(excluded.created_by_mechanism, facodi.learning_object_relations.created_by_mechanism),
			metadata = coalesce(facodi.learning_object_relations.metadata, '{}'::jsonb) || excluded.metadata,
			created_by = coalesce(excluded.created_by, facodi.learning_object_relations.created_by),
			updated_at = now()
	returning * into v_relation;

	return v_relation;
end;
$$;

create or replace function facodi.unlink_learning_objects(
	p_parent_object_id uuid,
	p_child_object_id uuid,
	p_relation_type text default null
)
returns integer
language plpgsql
security invoker
set search_path = facodi, public, pg_temp
as $$
declare
	v_deleted integer;
begin
	delete from facodi.learning_object_relations
	where parent_object_id = p_parent_object_id
		and child_object_id = p_child_object_id
		and (p_relation_type is null or relation_type = p_relation_type);

	get diagnostics v_deleted = row_count;
	return v_deleted;
end;
$$;

create or replace function facodi.get_learning_object_children(
	p_parent_object_id uuid,
	p_relation_type text default null
)
returns table(
	relation_id uuid,
	parent_object_id uuid,
	child_object_id uuid,
	relation_type text,
	relation_position integer,
	weight numeric,
	confidence_score numeric,
	child_object jsonb,
	relation_metadata jsonb,
	created_at timestamptz
)
language sql
stable
security invoker
set search_path = facodi, public, pg_temp
as $$
	select
		r.id,
		r.parent_object_id,
		r.child_object_id,
		r.relation_type,
		r.position,
		r.weight,
		r.confidence_score,
		to_jsonb(lo),
		r.metadata,
		r.created_at
	from facodi.learning_object_relations r
	join facodi.learning_objects lo on lo.id = r.child_object_id
	where r.parent_object_id = p_parent_object_id
		and (p_relation_type is null or r.relation_type = p_relation_type)
	order by r.position nulls last, r.created_at, r.id;
$$;

create or replace function facodi.get_learning_object_parents(
	p_child_object_id uuid,
	p_relation_type text default null
)
returns table(
	relation_id uuid,
	parent_object_id uuid,
	child_object_id uuid,
	relation_type text,
	relation_position integer,
	weight numeric,
	confidence_score numeric,
	parent_object jsonb,
	relation_metadata jsonb,
	created_at timestamptz
)
language sql
stable
security invoker
set search_path = facodi, public, pg_temp
as $$
	select
		r.id,
		r.parent_object_id,
		r.child_object_id,
		r.relation_type,
		r.position,
		r.weight,
		r.confidence_score,
		to_jsonb(lo),
		r.metadata,
		r.created_at
	from facodi.learning_object_relations r
	join facodi.learning_objects lo on lo.id = r.parent_object_id
	where r.child_object_id = p_child_object_id
		and (p_relation_type is null or r.relation_type = p_relation_type)
	order by r.position nulls last, r.created_at, r.id;
$$;

create or replace function facodi.get_learning_object_tree(
	p_root_object_id uuid,
	p_relation_type text default 'contains',
	p_max_depth integer default 5
)
returns table(
	depth integer,
	path uuid[],
	relation_id uuid,
	parent_object_id uuid,
	child_object_id uuid,
	relation_type text,
	relation_position integer,
	object jsonb,
	relation_metadata jsonb
)
language sql
stable
security invoker
set search_path = facodi, public, pg_temp
as $$
	with recursive tree as (
		select
			0 as depth,
			array[lo.id] as path,
			null::uuid as relation_id,
			null::uuid as parent_object_id,
			lo.id as child_object_id,
			null::text as relation_type,
			null::integer as position,
			to_jsonb(lo) as object,
			'{}'::jsonb as relation_metadata
		from facodi.learning_objects lo
		where lo.id = p_root_object_id

		union all

		select
			tree.depth + 1,
			tree.path || child.id,
			r.id,
			r.parent_object_id,
			r.child_object_id,
			r.relation_type,
			r.position,
			to_jsonb(child),
			r.metadata
		from tree
		join facodi.learning_object_relations r on r.parent_object_id = tree.child_object_id
		join facodi.learning_objects child on child.id = r.child_object_id
		where tree.depth < greatest(coalesce(p_max_depth, 5), 0)
			and (p_relation_type is null or r.relation_type = p_relation_type)
			and not child.id = any(tree.path)
	)
	select *
	from tree
	order by path;
$$;

create or replace function facodi.queue_analysis_job(
	p_job_type text,
	p_learning_object_id uuid default null,
	p_video_id uuid default null,
	p_youtube_video_id text default null,
	p_input_url text default null,
	p_requested_by uuid default null,
	p_request_source text default 'edge_function',
	p_input_payload jsonb default '{}'::jsonb,
	p_current_step text default 'queued'
)
returns facodi.analysis_jobs
language plpgsql
security invoker
set search_path = facodi, public, pg_temp
as $$
declare
	v_job facodi.analysis_jobs%rowtype;
begin
	insert into facodi.analysis_jobs (
		learning_object_id,
		video_id,
		youtube_video_id,
		input_url,
		job_type,
		status,
		current_step,
		requested_by,
		request_source,
		input_payload
	)
	values (
		p_learning_object_id,
		p_video_id,
		nullif(btrim(p_youtube_video_id), ''),
		nullif(btrim(p_input_url), ''),
		btrim(p_job_type),
		'queued',
		coalesce(nullif(btrim(p_current_step), ''), 'queued'),
		p_requested_by,
		coalesce(nullif(btrim(p_request_source), ''), 'edge_function'),
		coalesce(p_input_payload, '{}'::jsonb)
	)
	returning * into v_job;

	insert into facodi.analysis_job_events (job_id, event_type, message, metadata)
	values (
		v_job.id,
		'queued',
		'Analysis job queued',
		jsonb_build_object('job_type', v_job.job_type, 'request_source', v_job.request_source)
	);

	return v_job;
end;
$$;

create or replace function facodi.queue_odoo_sync_job(
	p_job_type text,
	p_instance_id uuid default null,
	p_learning_object_id uuid default null,
	p_odoo_record_id uuid default null,
	p_requested_by uuid default null,
	p_payload jsonb default '{}'::jsonb
)
returns facodi.odoo_sync_jobs
language plpgsql
security invoker
set search_path = facodi, public, pg_temp
as $$
declare
	v_job facodi.odoo_sync_jobs%rowtype;
begin
	insert into facodi.odoo_sync_jobs (
		instance_id,
		learning_object_id,
		odoo_record_id,
		job_type,
		status,
		requested_by,
		payload
	)
	values (
		p_instance_id,
		p_learning_object_id,
		p_odoo_record_id,
		btrim(p_job_type),
		'queued',
		p_requested_by,
		coalesce(p_payload, '{}'::jsonb)
	)
	returning * into v_job;

	insert into facodi.odoo_sync_logs (job_id, level, message, metadata)
	values (
		v_job.id,
		'info',
		'Odoo sync job queued',
		jsonb_build_object('job_type', v_job.job_type)
	);

	return v_job;
end;
$$;

create or replace function facodi.record_analysis_result(
	p_job_id uuid,
	p_learning_object_id uuid,
	p_result_type text,
	p_provider text default null,
	p_provider_model text default null,
	p_summary text default null,
	p_payload jsonb default '{}'::jsonb,
	p_confidence_score numeric default null,
	p_status text default 'succeeded',
	p_current_step text default 'completed'
)
returns facodi.analysis_results
language plpgsql
security invoker
set search_path = facodi, public, pg_temp
as $$
declare
	v_result facodi.analysis_results%rowtype;
begin
	insert into facodi.analysis_results (
		job_id,
		learning_object_id,
		result_type,
		provider,
		provider_model,
		summary,
		payload,
		confidence_score
	)
	values (
		p_job_id,
		p_learning_object_id,
		btrim(p_result_type),
		nullif(btrim(p_provider), ''),
		nullif(btrim(p_provider_model), ''),
		nullif(btrim(p_summary), ''),
		coalesce(p_payload, '{}'::jsonb),
		p_confidence_score
	)
	returning * into v_result;

	if p_job_id is not null then
		update facodi.analysis_jobs
		set status = coalesce(nullif(btrim(p_status), ''), status),
			current_step = coalesce(nullif(btrim(p_current_step), ''), current_step),
			result_payload = coalesce(result_payload, '{}'::jsonb) || jsonb_build_object(
				'result_id', v_result.id,
				'result_type', v_result.result_type
			),
			completed_at = case when coalesce(nullif(btrim(p_status), ''), status) in ('succeeded', 'failed', 'needs_review') then now() else completed_at end,
			updated_at = now()
		where id = p_job_id;

		insert into facodi.analysis_job_events (job_id, event_type, message, metadata)
		values (
			p_job_id,
			coalesce(nullif(btrim(p_status), ''), 'succeeded'),
			'Analysis result recorded',
			jsonb_build_object('result_id', v_result.id, 'result_type', v_result.result_type)
		);
	end if;

	return v_result;
end;
$$;

create or replace function facodi.record_semantic_match(
	p_source_object_id uuid,
	p_target_object_id uuid,
	p_match_type text default 'similar_to',
	p_score numeric default 0,
	p_confidence_score numeric default null,
	p_algorithm_version text default 'facodi_v2',
	p_explanation text default null,
	p_evidence jsonb default '[]'::jsonb,
	p_metadata jsonb default '{}'::jsonb,
	p_created_by_mechanism text default null
)
returns facodi.semantic_matches
language plpgsql
security invoker
set search_path = facodi, public, pg_temp
as $$
declare
	v_match facodi.semantic_matches%rowtype;
begin
	insert into facodi.semantic_matches (
		source_object_id,
		target_object_id,
		match_type,
		score,
		confidence_score,
		algorithm_version,
		explanation,
		evidence,
		metadata,
		created_by_mechanism
	)
	values (
		p_source_object_id,
		p_target_object_id,
		coalesce(nullif(btrim(p_match_type), ''), 'similar_to'),
		coalesce(p_score, 0),
		p_confidence_score,
		coalesce(nullif(btrim(p_algorithm_version), ''), 'facodi_v2'),
		nullif(btrim(p_explanation), ''),
		coalesce(p_evidence, '[]'::jsonb),
		coalesce(p_metadata, '{}'::jsonb),
		nullif(btrim(p_created_by_mechanism), '')
	)
	on conflict (source_object_id, target_object_id, match_type, algorithm_version) do update
		set score = excluded.score,
			confidence_score = excluded.confidence_score,
			explanation = coalesce(excluded.explanation, facodi.semantic_matches.explanation),
			evidence = excluded.evidence,
			metadata = coalesce(facodi.semantic_matches.metadata, '{}'::jsonb) || excluded.metadata,
			created_by_mechanism = coalesce(excluded.created_by_mechanism, facodi.semantic_matches.created_by_mechanism),
			updated_at = now()
	returning * into v_match;

	return v_match;
end;
$$;

create or replace function facodi.create_playlist_from_objects(
	p_title text,
	p_slug text default null,
	p_child_object_ids uuid[] default '{}'::uuid[],
	p_description text default null,
	p_metadata jsonb default '{}'::jsonb,
	p_created_by uuid default null,
	p_source_type text default 'generated',
	p_source_id text default null
)
returns facodi.learning_objects
language plpgsql
security invoker
set search_path = facodi, public, pg_temp
as $$
declare
	v_playlist facodi.learning_objects%rowtype;
	v_child_id uuid;
	v_position integer := 0;
begin
	v_playlist := facodi.create_learning_object(
		p_object_type := 'playlist',
		p_title := p_title,
		p_slug := p_slug,
		p_description := p_description,
		p_status := 'draft',
		p_source_type := p_source_type,
		p_source_id := p_source_id,
		p_metadata := coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('structure_type', 'playlist'),
		p_created_by := p_created_by
	);

	foreach v_child_id in array coalesce(p_child_object_ids, '{}'::uuid[]) loop
		v_position := v_position + 1;
		perform facodi.link_learning_objects(
			p_parent_object_id := v_playlist.id,
			p_child_object_id := v_child_id,
			p_relation_type := 'contains',
			p_position := v_position,
			p_created_by_mechanism := 'facodi.create_playlist_from_objects',
			p_created_by := p_created_by
		);
	end loop;

	insert into facodi.generated_structures (root_object_id, structure_type, status, result, generated_by, created_by)
	values (
		v_playlist.id,
		'playlist',
		'draft',
		jsonb_build_object('child_object_ids', coalesce(p_child_object_ids, '{}'::uuid[])),
		'facodi.create_playlist_from_objects',
		p_created_by
	);

	return v_playlist;
end;
$$;

create or replace function facodi.create_module_from_playlists(
	p_title text,
	p_slug text default null,
	p_playlist_object_ids uuid[] default '{}'::uuid[],
	p_description text default null,
	p_metadata jsonb default '{}'::jsonb,
	p_created_by uuid default null,
	p_source_type text default 'generated',
	p_source_id text default null
)
returns facodi.learning_objects
language plpgsql
security invoker
set search_path = facodi, public, pg_temp
as $$
declare
	v_module facodi.learning_objects%rowtype;
	v_playlist_id uuid;
	v_position integer := 0;
begin
	v_module := facodi.create_learning_object(
		p_object_type := 'module',
		p_title := p_title,
		p_slug := p_slug,
		p_description := p_description,
		p_status := 'draft',
		p_source_type := p_source_type,
		p_source_id := p_source_id,
		p_metadata := coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('structure_type', 'module'),
		p_created_by := p_created_by
	);

	foreach v_playlist_id in array coalesce(p_playlist_object_ids, '{}'::uuid[]) loop
		v_position := v_position + 1;
		perform facodi.link_learning_objects(
			p_parent_object_id := v_module.id,
			p_child_object_id := v_playlist_id,
			p_relation_type := 'contains',
			p_position := v_position,
			p_created_by_mechanism := 'facodi.create_module_from_playlists',
			p_created_by := p_created_by
		);
	end loop;

	insert into facodi.generated_structures (root_object_id, structure_type, status, result, generated_by, created_by)
	values (
		v_module.id,
		'module',
		'draft',
		jsonb_build_object('playlist_object_ids', coalesce(p_playlist_object_ids, '{}'::uuid[])),
		'facodi.create_module_from_playlists',
		p_created_by
	);

	return v_module;
end;
$$;

create or replace function facodi.create_course_structure(
	p_title text,
	p_slug text default null,
	p_child_object_ids uuid[] default '{}'::uuid[],
	p_description text default null,
	p_metadata jsonb default '{}'::jsonb,
	p_created_by uuid default null,
	p_source_type text default 'generated',
	p_source_id text default null
)
returns facodi.learning_objects
language plpgsql
security invoker
set search_path = facodi, public, pg_temp
as $$
declare
	v_course facodi.learning_objects%rowtype;
	v_child_id uuid;
	v_position integer := 0;
begin
	v_course := facodi.create_learning_object(
		p_object_type := 'course',
		p_title := p_title,
		p_slug := p_slug,
		p_description := p_description,
		p_status := 'draft',
		p_source_type := p_source_type,
		p_source_id := p_source_id,
		p_metadata := coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('structure_type', 'course'),
		p_created_by := p_created_by
	);

	foreach v_child_id in array coalesce(p_child_object_ids, '{}'::uuid[]) loop
		v_position := v_position + 1;
		perform facodi.link_learning_objects(
			p_parent_object_id := v_course.id,
			p_child_object_id := v_child_id,
			p_relation_type := 'contains',
			p_position := v_position,
			p_created_by_mechanism := 'facodi.create_course_structure',
			p_created_by := p_created_by
		);
	end loop;

	insert into facodi.generated_structures (root_object_id, structure_type, status, result, generated_by, created_by)
	values (
		v_course.id,
		'course',
		'draft',
		jsonb_build_object('child_object_ids', coalesce(p_child_object_ids, '{}'::uuid[])),
		'facodi.create_course_structure',
		p_created_by
	);

	return v_course;
end;
$$;

create or replace function facodi.register_odoo_mapping(
	p_learning_object_type text,
	p_odoo_model text,
	p_direction text default 'push',
	p_field_map jsonb default '{}'::jsonb,
	p_metadata jsonb default '{}'::jsonb,
	p_instance_id uuid default null,
	p_learning_object_id uuid default null,
	p_odoo_record_id integer default null,
	p_external_ref text default null,
	p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = facodi, public, pg_temp
as $$
declare
	v_map facodi.odoo_model_maps%rowtype;
	v_record facodi.odoo_records%rowtype;
begin
	insert into facodi.odoo_model_maps (
		learning_object_type,
		odoo_model,
		direction,
		field_map,
		metadata
	)
	values (
		btrim(p_learning_object_type),
		btrim(p_odoo_model),
		coalesce(nullif(btrim(p_direction), ''), 'push'),
		coalesce(p_field_map, '{}'::jsonb),
		coalesce(p_metadata, '{}'::jsonb)
	)
	on conflict (learning_object_type, odoo_model, direction) do update
		set field_map = excluded.field_map,
			metadata = coalesce(facodi.odoo_model_maps.metadata, '{}'::jsonb) || excluded.metadata,
			updated_at = now()
	returning * into v_map;

	if p_instance_id is not null and p_odoo_record_id is not null then
		insert into facodi.odoo_records (
			instance_id,
			learning_object_id,
			odoo_model,
			odoo_record_id,
			external_ref,
			last_sync_direction,
			last_sync_status,
			payload,
			metadata,
			synced_at
		)
		values (
			p_instance_id,
			p_learning_object_id,
			btrim(p_odoo_model),
			p_odoo_record_id,
			nullif(btrim(p_external_ref), ''),
			case when coalesce(nullif(btrim(p_direction), ''), 'push') = 'pull' then 'pull' else 'push' end,
			'succeeded',
			coalesce(p_payload, '{}'::jsonb),
			coalesce(p_metadata, '{}'::jsonb),
			now()
		)
		on conflict (instance_id, odoo_model, odoo_record_id) do update
			set learning_object_id = coalesce(excluded.learning_object_id, facodi.odoo_records.learning_object_id),
				external_ref = coalesce(excluded.external_ref, facodi.odoo_records.external_ref),
				last_sync_direction = excluded.last_sync_direction,
				last_sync_status = excluded.last_sync_status,
				payload = excluded.payload,
				metadata = coalesce(facodi.odoo_records.metadata, '{}'::jsonb) || excluded.metadata,
				synced_at = now(),
				updated_at = now()
		returning * into v_record;
	end if;

	return jsonb_build_object(
		'map', to_jsonb(v_map),
		'odoo_record', case when v_record.id is null then null else to_jsonb(v_record) end
	);
end;
$$;

create or replace function facodi.get_analysis_job_status(p_job_id uuid)
returns table(
	id uuid,
	learning_object_id uuid,
	video_id uuid,
	job_type text,
	status text,
	current_step text,
	requested_by uuid,
	error_code text,
	error_message text,
	input_payload jsonb,
	result_payload jsonb,
	created_at timestamptz,
	updated_at timestamptz,
	started_at timestamptz,
	completed_at timestamptz
)
language sql
stable
security invoker
set search_path = facodi, public, pg_temp
as $$
	select
		j.id,
		j.learning_object_id,
		j.video_id,
		j.job_type,
		j.status,
		j.current_step,
		j.requested_by,
		j.error_code,
		j.error_message,
		j.input_payload,
		j.result_payload,
		j.created_at,
		j.updated_at,
		j.started_at,
		j.completed_at
	from facodi.analysis_jobs j
	where j.id = p_job_id;
$$;

create or replace function facodi.get_odoo_sync_job_status(p_job_id uuid)
returns table(
	id uuid,
	instance_id uuid,
	learning_object_id uuid,
	odoo_record_id uuid,
	job_type text,
	status text,
	attempts integer,
	max_attempts integer,
	error_code text,
	error_message text,
	payload jsonb,
	result jsonb,
	requested_by uuid,
	created_at timestamptz,
	updated_at timestamptz,
	started_at timestamptz,
	completed_at timestamptz
)
language sql
stable
security invoker
set search_path = facodi, public, pg_temp
as $$
	select
		j.id,
		j.instance_id,
		j.learning_object_id,
		j.odoo_record_id,
		j.job_type,
		j.status,
		j.attempts,
		j.max_attempts,
		j.error_code,
		j.error_message,
		j.payload,
		j.result,
		j.requested_by,
		j.created_at,
		j.updated_at,
		j.started_at,
		j.completed_at
	from facodi.odoo_sync_jobs j
	where j.id = p_job_id;
$$;

do $$
declare
	v_function regprocedure;
begin
	for v_function in
		select p.oid::regprocedure
		from pg_proc p
		join pg_namespace n on n.oid = p.pronamespace
		where n.nspname = 'facodi'
			and p.proname = any (array[
				'create_learning_object',
				'update_learning_object_metadata',
				'link_learning_objects',
				'unlink_learning_objects',
				'get_learning_object_children',
				'get_learning_object_parents',
				'get_learning_object_tree',
				'queue_analysis_job',
				'queue_odoo_sync_job',
				'record_analysis_result',
				'record_semantic_match',
				'create_playlist_from_objects',
				'create_module_from_playlists',
				'create_course_structure',
				'register_odoo_mapping',
				'get_analysis_job_status',
				'get_odoo_sync_job_status'
			])
	loop
		execute format('revoke all on function %s from public', v_function);
		execute format('grant execute on function %s to authenticated, service_role', v_function);
	end loop;
end;
$$;

grant execute on function facodi.get_learning_object_children(uuid, text) to anon;
grant execute on function facodi.get_learning_object_parents(uuid, text) to anon;
grant execute on function facodi.get_learning_object_tree(uuid, text, integer) to anon;
