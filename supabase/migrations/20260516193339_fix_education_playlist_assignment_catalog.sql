-- Keep general collections and FACODI/study playlists distinct.
-- "Programacao" is a general programming collection; the submit fallback should
-- use a dedicated Education collection, while AI assignment sees curricular
-- playlists with course/unit markers.

update public.playlists
set
  is_ordered = false,
  updated_at = now()
where slug = 'programa-o'
  and course_code is null
  and unit_code is null
  and is_ordered = true;

insert into public.playlists (
  name,
  slug,
  description,
  author_id,
  thumbnail_url,
  course_code,
  unit_code,
  language,
  is_public,
  is_ordered
)
select
  'Educacao',
  'educacao',
  'Colecao geral para videos educacionais submetidos pela comunidade antes da classificacao curricular por IA.',
  p.id,
  null,
  null,
  null,
  'pt',
  true,
  false
from public.profiles p
where p.role in ('admin', 'editor')
order by case p.role when 'admin' then 0 else 1 end, p.created_at asc
limit 1
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  course_code = null,
  unit_code = null,
  language = excluded.language,
  is_public = true,
  is_ordered = false,
  updated_at = now();

create or replace function public.is_education_assignment_playlist(
  p_slug text,
  p_is_ordered boolean,
  p_course_code text,
  p_unit_code text
)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(p_slug, '') in ('educacao', 'education', 'tube-o2-educacao', 'tube-o2-education')
    or nullif(btrim(coalesce(p_course_code, '')), '') is not null
    or nullif(btrim(coalesce(p_unit_code, '')), '') is not null;
$$;

create or replace function public.get_default_education_playlist_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.playlists p
  where p.is_public = true
    and public.is_education_assignment_playlist(p.slug, p.is_ordered, p.course_code, p.unit_code)
  order by
    case
      when p.slug in ('educacao', 'education', 'tube-o2-educacao', 'tube-o2-education') then 0
      when p.course_code is not null or p.unit_code is not null then 1
      else 2
    end,
    coalesce(p.video_count, 0) desc,
    p.created_at asc
  limit 1;
$$;

create or replace function public.list_education_playlists_for_assignment(
  p_language text default null,
  p_limit integer default 120
)
returns table (
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
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.description,
    p.language,
    p.is_public,
    p.is_ordered,
    p.course_code,
    p.unit_code
  from public.playlists p
  where p.is_public = true
    and public.is_education_assignment_playlist(p.slug, p.is_ordered, p.course_code, p.unit_code)
  order by
    case when p_language is not null and p.language = p_language then 0 else 1 end,
    case
      when p.course_code is not null or p.unit_code is not null then 0
      when p.slug in ('educacao', 'education', 'tube-o2-educacao', 'tube-o2-education') then 1
      else 2
    end,
    p.course_code nulls last,
    p.unit_code nulls last,
    p.name
  limit greatest(1, least(coalesce(p_limit, 120), 200));
$$;

revoke all on function public.is_education_assignment_playlist(text, boolean, text, text) from public, anon, authenticated;
grant execute on function public.is_education_assignment_playlist(text, boolean, text, text) to service_role;

revoke all on function public.list_education_playlists_for_assignment(text, integer) from public, anon, authenticated;
grant execute on function public.list_education_playlists_for_assignment(text, integer) to service_role;

comment on function public.is_education_assignment_playlist(text, boolean, text, text) is
  'Education assignment contract: true for the general education collection or curricular playlists with course/unit markers.';
comment on function public.list_education_playlists_for_assignment(text, integer) is
  'Returns education assignment playlist candidates for AI enrichment, prioritizing requested language and curricular playlists.';
