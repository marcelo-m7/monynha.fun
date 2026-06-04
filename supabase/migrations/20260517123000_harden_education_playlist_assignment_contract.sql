-- Harden the shared read contract used by Tube O2 enrichment and FACODI read-only discovery.
-- Additive/backward-compatible: existing function signatures consumed by enrich-video are preserved.

create or replace function public.normalize_slug_for_education_assignment(p_value text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select lower(
    regexp_replace(
      translate(coalesce(p_value, ''), 'áàâãäåéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaaeeeeiiiiooooouuuucnAAAAAAEEEEIIIIOOOOOUUUUCN'),
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    )
  );
$$;

comment on function public.normalize_slug_for_education_assignment(text)
is 'Normalizes playlist slugs for education assignment checks without depending on frontend naming conventions.';

create or replace function public.is_education_assignment_playlist(
  p_slug text,
  p_is_ordered boolean,
  p_course_code text,
  p_unit_code text
)
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select
    nullif(btrim(coalesce(p_course_code, '')), '') is not null
    or nullif(btrim(coalesce(p_unit_code, '')), '') is not null
    or (
      coalesce(p_is_ordered, false) = true
      and public.normalize_slug_for_education_assignment(coalesce(p_slug, '')) in (
        'educacao',
        'education',
        'educacional',
        'educational',
        'facodi',
        'open2-education',
        'open2-educacao',
        'tube-o2-educacao',
        'tube-o2-education'
      )
    );
$$;

comment on function public.is_education_assignment_playlist(text, boolean, text, text)
is 'Classifies public playlists that may receive AI educational video assignments. Curricular course/unit playlists are always eligible; general educational slugs are eligible only when ordered.';

create or replace function public.list_education_playlists_for_assignment(
  p_language text default null,
  p_limit integer default 120
)
returns table(
  id uuid,
  name text,
  description text,
  language text,
  is_public boolean,
  is_ordered boolean,
  course_code text,
  unit_code text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    p.id,
    p.name,
    p.description,
    p.language,
    p.is_public,
    p.is_ordered,
    nullif(btrim(p.course_code), '') as course_code,
    nullif(btrim(p.unit_code), '') as unit_code
  from public.playlists p
  where p.is_public = true
    and public.is_education_assignment_playlist(p.slug, p.is_ordered, p.course_code, p.unit_code)
  order by
    case when p_language is not null and p.language = p_language then 0 else 1 end,
    case
      when nullif(btrim(p.course_code), '') is not null and nullif(btrim(p.unit_code), '') is not null then 0
      when nullif(btrim(p.course_code), '') is not null or nullif(btrim(p.unit_code), '') is not null then 1
      else 2
    end,
    p.course_code nulls last,
    p.unit_code nulls last,
    p.video_count desc nulls last,
    p.name
  limit greatest(1, least(coalesce(p_limit, 120), 500));
$$;

comment on function public.list_education_playlists_for_assignment(text, integer)
is 'Stable candidate list for AI playlist assignment. SECURITY DEFINER RPC is restricted to authenticated/server execution; public read-only discovery should use v_education_playlist_assignment_candidates.';

drop view if exists public.v_education_playlist_assignment_candidates;

create view public.v_education_playlist_assignment_candidates
with (security_invoker = true)
as
select
  p.id,
  p.name,
  p.slug,
  p.description,
  p.language,
  p.is_public,
  p.is_ordered,
  nullif(btrim(p.course_code), '') as course_code,
  nullif(btrim(p.unit_code), '') as unit_code,
  p.video_count,
  p.total_duration_seconds,
  case
    when nullif(btrim(p.course_code), '') is not null or nullif(btrim(p.unit_code), '') is not null then 'curricular'
    else 'general_education'
  end as assignment_kind,
  public.is_education_assignment_playlist(p.slug, p.is_ordered, p.course_code, p.unit_code) as is_assignment_candidate,
  p.created_at,
  p.updated_at
from public.playlists p
where p.is_public = true
  and public.is_education_assignment_playlist(p.slug, p.is_ordered, p.course_code, p.unit_code);

comment on view public.v_education_playlist_assignment_candidates
is 'Read-only audit/discovery view for all public educational playlists eligible for AI assignment. Safe for FACODI read-only consumption.';

grant select on public.v_education_playlist_assignment_candidates to anon, authenticated;
grant execute on function public.is_education_assignment_playlist(text, boolean, text, text) to anon, authenticated, service_role;
grant execute on function public.normalize_slug_for_education_assignment(text) to anon, authenticated, service_role;

revoke execute on function public.list_education_playlists_for_assignment(text, integer) from public;
revoke execute on function public.list_education_playlists_for_assignment(text, integer) from anon;
revoke execute on function public.list_education_playlists_for_assignment(text, integer) from authenticated;
grant execute on function public.list_education_playlists_for_assignment(text, integer) to authenticated;
grant execute on function public.list_education_playlists_for_assignment(text, integer) to service_role;
