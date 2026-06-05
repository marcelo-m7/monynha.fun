drop view if exists public.v_facodi_content_backlog;
drop view if exists public.v_facodi_playlist_health;

create view public.v_facodi_playlist_health
with (security_invoker = true)
as
with catalog as (
  select
    playlist_id,
    course_code,
    course_name,
    unit_code,
    playlist_name,
    playlist_slug,
    playlist_description,
    language,
    is_public,
    is_ordered,
    coalesce(video_count, 0)::integer as video_count,
    coalesce(total_duration_seconds, 0)::integer as total_duration_seconds,
    thumbnail_url,
    semester_label,
    video_range,
    collaborators_count,
    playlist_videos_rows
  from public.v_course_playlist_catalog
  where is_public = true
),
classified as (
  select
    *,
    case
      when video_count = 0 then 'empty'
      when video_count between 1 and 4 then 'thin'
      when video_count >= 50 then 'overloaded'
      else 'healthy'
    end as health_status
  from catalog
)
select
  playlist_id,
  course_code,
  course_name,
  unit_code,
  playlist_name,
  playlist_slug,
  playlist_description,
  language,
  is_public,
  is_ordered,
  video_count,
  total_duration_seconds,
  thumbnail_url,
  semester_label,
  video_range,
  collaborators_count,
  playlist_videos_rows,
  health_status,
  case
    when course_code = 'LESTI' and health_status = 'empty' then 10
    when course_code = 'LESTI' and health_status = 'thin' then 20
    when course_code = 'LESTI' and health_status = 'overloaded' then 30
    when course_code = 'LESTI' and health_status = 'healthy' then 60
    when course_code = 'LDC' and health_status = 'empty' then 70
    when course_code = 'LDC' and health_status = 'thin' then 80
    when health_status = 'empty' then 90
    when health_status = 'thin' then 100
    when health_status = 'overloaded' then 110
    else 120
  end as priority_rank,
  case
    when health_status = 'empty' then 'playlist_sem_videos'
    when health_status = 'thin' then 'playlist_com_poucos_videos'
    when health_status = 'overloaded' then 'playlist_precisa_ordenacao_editorial'
    else 'playlist_saudavel'
  end as priority_reason,
  case
    when health_status = 'empty' then 'seed_initial_videos'
    when health_status = 'thin' then 'add_quality_videos'
    when health_status = 'overloaded' then 'curate_order'
    else 'maintain'
  end as recommended_action
from classified;

create view public.v_facodi_content_backlog
with (security_invoker = true)
as
select
  playlist_id,
  course_code,
  course_name,
  unit_code,
  playlist_name,
  playlist_slug,
  semester_label,
  video_count,
  total_duration_seconds,
  health_status,
  priority_rank,
  priority_reason,
  recommended_action,
  case
    when health_status = 'empty' then 'empty_playlist'
    when health_status = 'thin' then 'thin_playlist'
    when health_status = 'overloaded' then 'overloaded_playlist'
    else 'monitor'
  end as backlog_kind
from public.v_facodi_playlist_health
where health_status <> 'healthy';

grant select on public.v_facodi_playlist_health to anon, authenticated;
grant select on public.v_facodi_content_backlog to anon, authenticated;

comment on view public.v_facodi_playlist_health is
  'Read-only FACODI curricular playlist health view. Empty/thin/healthy/overloaded are derived from public playlist-video counts.';

comment on view public.v_facodi_content_backlog is
  'Read-only FACODI content backlog derived from playlist health, ordered by LESTI-first editorial priority in consuming queries.';
