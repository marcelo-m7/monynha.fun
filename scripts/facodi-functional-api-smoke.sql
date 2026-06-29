begin;

do $$
declare
	v_video facodi.learning_objects%rowtype;
	v_playlist facodi.learning_objects%rowtype;
	v_relation_count integer;
	v_tree_count integer;
	v_job facodi.analysis_jobs%rowtype;
	v_result facodi.analysis_results%rowtype;
	v_match facodi.semantic_matches%rowtype;
	v_odoo_job facodi.odoo_sync_jobs%rowtype;
	v_event_count integer;
begin
	v_video := facodi.create_learning_object(
		p_object_type := 'video',
		p_title := 'FACODI Smoke Video',
		p_slug := 'facodi-smoke-video',
		p_source_type := 'manual',
		p_source_id := 'smoke-video',
		p_metadata := jsonb_build_object('smoke', true)
	);

	if v_video.object_type <> 'video' then
		raise exception 'expected video learning object, got %', v_video.object_type;
	end if;

	v_playlist := facodi.create_playlist_from_objects(
		p_title := 'FACODI Smoke Playlist',
		p_slug := 'facodi-smoke-playlist',
		p_child_object_ids := array[v_video.id],
		p_source_id := 'smoke-playlist'
	);

	if v_playlist.object_type <> 'playlist' then
		raise exception 'expected playlist learning object, got %', v_playlist.object_type;
	end if;

	select count(*)
	into v_relation_count
	from facodi.get_learning_object_children(v_playlist.id, 'contains');

	if v_relation_count <> 1 then
		raise exception 'expected one playlist child relation, got %', v_relation_count;
	end if;

	select count(*)
	into v_tree_count
	from facodi.get_learning_object_tree(v_playlist.id, 'contains', 3)
	where depth = 1;

	if v_tree_count <> 1 then
		raise exception 'expected one tree child row, got %', v_tree_count;
	end if;

	v_job := facodi.queue_analysis_job(
		p_job_type := 'analyze_video',
		p_learning_object_id := v_video.id,
		p_input_payload := jsonb_build_object('smoke', true)
	);

	if v_job.status <> 'queued' or v_job.current_step <> 'queued' then
		raise exception 'expected queued analysis job, got status %, step %', v_job.status, v_job.current_step;
	end if;

	v_result := facodi.record_analysis_result(
		p_job_id := v_job.id,
		p_learning_object_id := v_video.id,
		p_result_type := 'smoke_analysis',
		p_payload := jsonb_build_object('ok', true),
		p_confidence_score := 1,
		p_status := 'succeeded'
	);

	if v_result.result_type <> 'smoke_analysis' then
		raise exception 'expected smoke analysis result, got %', v_result.result_type;
	end if;

	select count(*)
	into v_event_count
	from facodi.analysis_job_events
	where job_id = v_job.id;

	if v_event_count <> 2 then
		raise exception 'expected two analysis job events, got %', v_event_count;
	end if;

	v_match := facodi.record_semantic_match(
		p_source_object_id := v_video.id,
		p_target_object_id := v_playlist.id,
		p_match_type := 'recommended_for',
		p_score := 0.9,
		p_confidence_score := 0.9,
		p_evidence := jsonb_build_array(jsonb_build_object('reason', 'smoke'))
	);

	if v_match.match_type <> 'recommended_for' then
		raise exception 'expected recommended_for semantic match, got %', v_match.match_type;
	end if;

	v_odoo_job := facodi.queue_odoo_sync_job(
		p_job_type := 'sync_object_to_odoo',
		p_learning_object_id := v_playlist.id,
		p_payload := jsonb_build_object('smoke', true)
	);

	if v_odoo_job.status <> 'queued' then
		raise exception 'expected queued odoo sync job, got %', v_odoo_job.status;
	end if;
end;
$$;

rollback;