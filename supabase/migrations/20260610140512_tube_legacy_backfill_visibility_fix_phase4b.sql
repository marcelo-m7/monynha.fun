begin;

create or replace function tube.backfill_legacy_to_tube(
	p_video_limit integer default 200,
	p_playlist_limit integer default 100,
	p_actor_id uuid default null,
	p_run_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = tube, public, pg_temp
as $$
declare
	v_video_limit integer := greatest(1, least(coalesce(p_video_limit, 200), 2000));
	v_playlist_limit integer := greatest(1, least(coalesce(p_playlist_limit, 100), 1000));
	v_run_id uuid := coalesce(p_run_id, gen_random_uuid());
	v_result jsonb;
begin
	if current_user not in ('service_role', 'postgres') then
		raise exception 'tube.backfill_legacy_to_tube is restricted to service role';
	end if;

	insert into tube.backfill_runs (
		id,
		job_type,
		status,
		started_at,
		created_by,
		stats
	)
	values (
		v_run_id,
		'legacy_to_tube',
		'running',
		now(),
		p_actor_id,
		jsonb_build_object('video_limit', v_video_limit, 'playlist_limit', v_playlist_limit)
	)
	on conflict (id) do update
	set status = 'running',
		started_at = now(),
		finished_at = null,
		error_message = null,
		updated_at = now();

	with legacy_videos as (
		select
			pv.id as legacy_video_id,
			pv.youtube_id,
			pv.title,
			pv.description,
			pv.channel_name,
			pv.duration_seconds,
			pv.thumbnail_url,
			pv.language,
			pv.created_at,
			format('legacy-channel:%s', substr(md5(lower(trim(pv.channel_name))), 1, 24)) as synthetic_channel_key
		from public.videos pv
		where not exists (
			select 1
			from tube.videos tv
			where tv.youtube_video_id = pv.youtube_id
		)
		order by pv.created_at asc
		limit v_video_limit
	), legacy_channels as (
		select
			lv.synthetic_channel_key as youtube_channel_id,
			lv.channel_name as title,
			max(lv.language) as language,
			max(lv.thumbnail_url) as thumbnail_url
		from legacy_videos lv
		group by lv.synthetic_channel_key, lv.channel_name
	), existing_channels as (
		select c.id, c.youtube_channel_id
		from tube.channels c
		join legacy_channels lc
			on lc.youtube_channel_id = c.youtube_channel_id
	), inserted_channels as (
		insert into tube.channels (
			youtube_channel_id,
			title,
			language,
			thumbnail_url,
			metadata
		)
		select
			lc.youtube_channel_id,
			lc.title,
			lc.language,
			lc.thumbnail_url,
			jsonb_build_object('source', 'legacy_backfill')
		from legacy_channels lc
		on conflict (youtube_channel_id) do nothing
		returning id, youtube_channel_id
	), channel_map as (
		select ec.id, ec.youtube_channel_id from existing_channels ec
		union all
		select ic.id, ic.youtube_channel_id from inserted_channels ic
	), inserted_videos as (
		insert into tube.videos (
			channel_id,
			youtube_video_id,
			title,
			description,
			duration_seconds,
			published_at,
			thumbnail_url,
			language,
			status,
			metadata
		)
		select
			cm.id,
			lv.youtube_id,
			lv.title,
			lv.description,
			lv.duration_seconds,
			lv.created_at,
			lv.thumbnail_url,
			coalesce(nullif(lv.language, ''), 'und'),
			'processed'::tube.video_status,
			jsonb_build_object(
				'source', 'legacy_backfill',
				'legacy', jsonb_build_object('public_video_id', lv.legacy_video_id)
			)
		from legacy_videos lv
		join channel_map cm
			on cm.youtube_channel_id = lv.synthetic_channel_key
		on conflict (youtube_video_id) do nothing
		returning id
	), legacy_playlists as (
		select
			pl.id as legacy_playlist_id,
			pl.name,
			pl.description,
			pl.total_duration_seconds,
			pl.review_status,
			pl.course_code,
			pl.unit_code,
			pl.language,
			pl.created_at,
			pl.updated_at,
			format('legacy-playlist-%s', pl.id) as module_slug
		from public.playlists pl
		where not exists (
			select 1
			from tube.modules tm
			where tm.slug = format('legacy-playlist-%s', pl.id)
		)
		order by pl.created_at asc nulls last
		limit v_playlist_limit
	), existing_modules as (
		select tm.id, tm.slug
		from tube.modules tm
		join legacy_playlists lp
			on lp.module_slug = tm.slug
	), inserted_modules as (
		insert into tube.modules (
			slug,
			title,
			description,
			objectives,
			difficulty,
			estimated_hours,
			status,
			metadata,
			created_at,
			updated_at
		)
		select
			lp.module_slug,
			lp.name,
			lp.description,
			'[]'::jsonb,
			null,
			case
				when lp.total_duration_seconds is null then null
				else round((lp.total_duration_seconds::numeric / 3600.0), 2)
			end,
			case when lp.review_status in ('approved', 'published') then 'published' else 'draft' end,
			jsonb_build_object(
				'source', 'legacy_backfill',
				'legacy', jsonb_build_object(
					'playlist_id', lp.legacy_playlist_id,
					'course_code', lp.course_code,
					'unit_code', lp.unit_code
				)
			),
			coalesce(lp.created_at, now()),
			coalesce(lp.updated_at, now())
		from legacy_playlists lp
		on conflict (slug) do nothing
		returning id, slug
	), module_map as (
		select em.id, em.slug from existing_modules em
		union all
		select im.id, im.slug from inserted_modules im
	), module_candidates as (
		select
			lp.legacy_playlist_id,
			mm.id as module_id
		from legacy_playlists lp
		join module_map mm
			on mm.slug = lp.module_slug
	), inserted_module_videos as (
		insert into tube.module_videos (
			module_id,
			video_id,
			position,
			is_required,
			created_at
		)
		select
			mc.module_id,
			tv.id,
			pv.position,
			true,
			coalesce(pv.created_at, now())
		from public.playlist_videos pv
		join module_candidates mc
			on mc.legacy_playlist_id = pv.playlist_id
		join public.videos lv
			on lv.id = pv.video_id
		join tube.videos tv
			on tv.youtube_video_id = lv.youtube_id
		on conflict (module_id, video_id) do nothing
		returning module_id
	)
	select jsonb_build_object(
		'run_id', v_run_id,
		'videos_scanned', (select count(*) from legacy_videos),
		'channels_inserted', (select count(*) from inserted_channels),
		'videos_inserted', (select count(*) from inserted_videos),
		'playlists_scanned', (select count(*) from legacy_playlists),
		'modules_inserted', (select count(*) from inserted_modules),
		'module_videos_inserted', (select count(*) from inserted_module_videos)
	)
	into v_result;

	update tube.backfill_runs
	set status = 'completed',
		finished_at = now(),
		stats = v_result,
		updated_at = now()
	where id = v_run_id;

	return v_result;
exception
	when others then
		update tube.backfill_runs
		set status = 'failed',
			finished_at = now(),
			error_message = sqlerrm,
			updated_at = now()
		where id = v_run_id;
		raise;
end;
$$;

commit;
