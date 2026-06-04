-- Homepage read model for public Tube O2 exhibition screens.
-- Exposes only public aggregate/display data from existing RLS-protected views.

create or replace view public.v_home_exhibition
with (security_invoker = true) as
select
  now() as generated_at,
  jsonb_build_object(
    'videos_total', coalesce((select count(*)::int from public.v_video_exhibition), 0),
    'playlists_total', coalesce((select count(*)::int from public.v_playlist_exhibition where is_public is true), 0),
    'categories_total', coalesce((select count(*)::int from public.categories), 0),
    'videos_with_summaries', coalesce((
      select count(*)::int
      from public.v_video_exhibition
      where enrichment_short_summary is not null
         or transcript_summary is not null
    ), 0),
    'videos_with_tags', coalesce((
      select count(*)::int
      from public.v_video_exhibition
      where enrichment_semantic_tags is not null
        and array_length(enrichment_semantic_tags, 1) > 0
    ), 0),
    'public_non_empty_playlists', coalesce((
      select count(*)::int
      from public.v_playlist_exhibition
      where is_public is true
        and coalesce(video_count, 0) > 0
    ), 0),
    'curricular_playlists', coalesce((
      select count(*)::int
      from public.v_playlist_exhibition
      where is_public is true
        and course_code is not null
    ), 0)
  ) as metrics,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', video.id,
        'youtube_id', video.youtube_id,
        'title', video.title,
        'channel_name', video.channel_name,
        'thumbnail_url', video.thumbnail_url,
        'language', video.language,
        'duration_seconds', video.duration_seconds,
        'view_count', video.view_count,
        'favorites_count', video.favorites_count,
        'playlist_add_count', video.playlist_add_count,
        'category_name', video.category_name,
        'category_slug', video.category_slug,
        'category_color', video.category_color,
        'summary', coalesce(video.enrichment_short_summary, video.transcript_summary),
        'semantic_tags', video.enrichment_semantic_tags
      )
      order by video.is_featured desc, video.view_count desc nulls last, video.created_at desc
    )
    from (
      select *
      from public.v_video_exhibition
      where thumbnail_url is not null
        and thumbnail_url <> ''
      order by is_featured desc, view_count desc nulls last, created_at desc
      limit 8
    ) video
  ), '[]'::jsonb) as hero_videos,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', category.id,
        'name', category.name,
        'slug', category.slug,
        'icon', category.icon,
        'color', category.color,
        'video_count', coalesce(counts.video_count, 0)
      )
      order by category.name
    )
    from public.categories category
    left join lateral (
      select count(*)::int as video_count
      from public.v_video_exhibition video
      where video.category_id = category.id
    ) counts on true
  ), '[]'::jsonb) as categories,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', playlist.id,
        'name', playlist.name,
        'slug', playlist.slug,
        'description', playlist.description,
        'thumbnail_url', coalesce(playlist.thumbnail_url, playlist.preview_video_thumbnail_url),
        'course_code', playlist.course_code,
        'unit_code', playlist.unit_code,
        'language', playlist.language,
        'is_ordered', playlist.is_ordered,
        'video_count', playlist.video_count,
        'total_duration_seconds', playlist.total_duration_seconds,
        'preview_video_title', playlist.preview_video_title,
        'preview_video_thumbnail_url', playlist.preview_video_thumbnail_url,
        'preview_video_channel_name', playlist.preview_video_channel_name
      )
      order by playlist.video_count desc nulls last, playlist.activity_at desc nulls last
    )
    from (
      select *
      from public.v_playlist_exhibition
      where is_public is true
        and coalesce(video_count, 0) > 0
      order by video_count desc nulls last, activity_at desc nulls last
      limit 6
    ) playlist
  ), '[]'::jsonb) as featured_playlists,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'playlist_id', item.playlist_id,
        'course_code', item.course_code,
        'course_name', item.course_name,
        'unit_code', item.unit_code,
        'playlist_name', item.playlist_name,
        'playlist_slug', item.playlist_slug,
        'playlist_description', item.playlist_description,
        'language', item.language,
        'video_count', item.video_count,
        'thumbnail_url', item.thumbnail_url,
        'semester_label', item.semester_label,
        'video_range', item.video_range
      )
      order by item.video_count desc nulls last, item.course_code, item.unit_code
    )
    from (
      select *
      from public.v_course_playlist_catalog
      where is_public is true
        and coalesce(video_count, 0) > 0
      order by video_count desc nulls last, course_code, unit_code
      limit 4
    ) item
  ), '[]'::jsonb) as facodi_highlights,
  jsonb_build_object(
    'with_summaries', coalesce((
      select count(*)::int
      from public.v_video_exhibition
      where enrichment_short_summary is not null
         or transcript_summary is not null
    ), 0),
    'with_tags', coalesce((
      select count(*)::int
      from public.v_video_exhibition
      where enrichment_semantic_tags is not null
        and array_length(enrichment_semantic_tags, 1) > 0
    ), 0),
    'transcripts_completed', coalesce((
      select count(*)::int
      from public.v_video_exhibition
      where transcript_status = 'completed'
    ), 0),
    'recent_submissions', coalesce((
      select count(*)::int
      from public.v_video_exhibition
      where created_at >= now() - interval '30 days'
    ), 0)
  ) as curation_signals;

grant select on public.v_home_exhibition to anon, authenticated;
