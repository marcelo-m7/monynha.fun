create extension if not exists unaccent with schema extensions;

alter table public.videos
  add column if not exists slug text not null default '';

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function public.generate_video_slug_base(p_title text)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select coalesce(
    nullif(
      regexp_replace(
        regexp_replace(
          lower(unaccent(coalesce(p_title, ''))),
          '[^a-z0-9]+',
          '-',
          'g'
        ),
        '(^-+|-+$)',
        '',
        'g'
      ),
      ''
    ),
    'video'
  );
$$;

comment on function public.generate_video_slug_base(text) is
  'Normalizes video titles into lowercase URL slugs. Used by videos slug trigger and historical backfill.';

create or replace function private.assign_unique_video_slug()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  base_slug text;
  candidate_slug text;
  suffix integer := 1;
begin
  if tg_op = 'UPDATE'
    and coalesce(new.slug, '') <> ''
    and coalesce(new.slug, '') = coalesce(old.slug, '')
    and new.title is not distinct from old.title
  then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and coalesce(new.slug, '') <> ''
    and coalesce(new.slug, '') = coalesce(old.slug, '')
    and coalesce(old.slug, '') not in ('video', public.generate_video_slug_base(old.youtube_id))
  then
    return new;
  end if;

  if coalesce(new.slug, '') <> '' then
    new.slug := public.generate_video_slug_base(new.slug);
  else
    new.slug := public.generate_video_slug_base(new.title);
  end if;

  base_slug := new.slug;
  candidate_slug := base_slug;

  perform pg_advisory_xact_lock(hashtext('public.videos.slug.' || base_slug));

  while exists (
    select 1
    from public.videos existing
    where existing.slug = candidate_slug
      and existing.id is distinct from new.id
  ) loop
    suffix := suffix + 1;
    candidate_slug := base_slug || '-' || suffix::text;
  end loop;

  new.slug := candidate_slug;
  return new;
end;
$$;

comment on function private.assign_unique_video_slug() is
  'Assigns stable unique title-based video slugs with numeric collision suffixes.';

drop trigger if exists videos_assign_unique_slug on public.videos;
create trigger videos_assign_unique_slug
before insert or update of slug, title
on public.videos
for each row
execute function private.assign_unique_video_slug();

do $$
declare
  video_row record;
  base_slug text;
  candidate_slug text;
  suffix integer;
begin
  for video_row in
    select id, title
    from public.videos
    where slug = ''
    order by created_at asc, id asc
  loop
    base_slug := public.generate_video_slug_base(video_row.title);
    candidate_slug := base_slug;
    suffix := 1;

    perform pg_advisory_xact_lock(hashtext('public.videos.slug.' || base_slug));

    while exists (
      select 1
      from public.videos existing
      where existing.slug = candidate_slug
        and existing.id <> video_row.id
    ) loop
      suffix := suffix + 1;
      candidate_slug := base_slug || '-' || suffix::text;
    end loop;

    update public.videos
    set slug = candidate_slug
    where id = video_row.id;
  end loop;
end;
$$;

create unique index if not exists videos_slug_key
  on public.videos(slug);

create or replace view public.v_video_exhibition
with (security_invoker = true) as
select
  v.id,
  v.youtube_id,
  v.title,
  v.description,
  v.channel_name,
  v.duration_seconds,
  v.thumbnail_url,
  v.language,
  v.category_id,
  v.submitted_by,
  v.view_count,
  v.is_featured,
  v.created_at,
  v.updated_at,
  v.favorites_count,
  v.playlist_add_count,
  c.name as category_name,
  c.slug as category_slug,
  c.color as category_color,
  p.username as submitted_by_username,
  p.display_name as submitted_by_display_name,
  p.avatar_url as submitted_by_avatar_url,
  le.optimized_title as enrichment_optimized_title,
  le.short_summary as enrichment_short_summary,
  le.summary_description as enrichment_summary_description,
  le.cultural_relevance as enrichment_cultural_relevance,
  le.semantic_tags as enrichment_semantic_tags,
  le.language as enrichment_language,
  coalesce(pc.playlist_count, 0) as playlist_count,
  coalesce(cc.comment_count, 0) as comment_count,
  coalesce(nullif(le.language, ''), v.language) as detected_language,
  coalesce(nullif(le.language, ''), v.language) as effective_language,
  lt.summary as transcript_summary,
  lt.language as transcript_language,
  lt.status as transcript_status,
  v.slug
from public.videos v
left join public.categories c on c.id = v.category_id
left join public.profiles p on p.id = v.submitted_by
left join lateral (
  select
    ae.optimized_title,
    ae.short_summary,
    ae.summary_description,
    ae.cultural_relevance,
    ae.semantic_tags,
    ae.language
  from public.ai_enrichments ae
  where ae.video_id = v.id
  order by ae.created_at desc nulls last
  limit 1
) le on true
left join lateral (
  select
    vt.summary,
    vt.language,
    vt.status
  from public.video_transcripts vt
  where vt.video_id = v.id
  order by vt.created_at desc nulls last
  limit 1
) lt on true
left join lateral (
  select count(*)::int as playlist_count
  from public.playlist_videos pv
  where pv.video_id = v.id
) pc on true
left join lateral (
  select count(*)::int as comment_count
  from public.comments cm
  where cm.video_id = v.id
) cc on true;

grant select on public.v_video_exhibition to anon, authenticated;

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
        'slug', video.slug,
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

grant execute on function public.generate_video_slug_base(text) to anon, authenticated, service_role;
revoke all on function private.assign_unique_video_slug() from public, anon, authenticated;
