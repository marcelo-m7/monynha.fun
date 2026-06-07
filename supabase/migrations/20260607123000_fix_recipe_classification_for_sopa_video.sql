-- Ensure the sopa de cebola video is consistently categorized as Receitas
-- and, when a culinary playlist exists, linked to it.

with recipe_category as (
  select id
  from public.categories
  where slug in ('receitas-tradicionais', 'receitas')
  order by case when slug = 'receitas-tradicionais' then 0 else 1 end
  limit 1
)
update public.videos v
set
  category_id = rc.id,
  updated_at = now()
from recipe_category rc
where v.youtube_id = 'R58X00Rf9hI'
  and v.category_id is distinct from rc.id;

with recipe_category as (
  select id
  from public.categories
  where slug in ('receitas-tradicionais', 'receitas')
  order by case when slug = 'receitas-tradicionais' then 0 else 1 end
  limit 1
)
update public.ai_enrichments ae
set
  suggested_category_id = rc.id
from recipe_category rc
where ae.video_id in (
  select id
  from public.videos
  where youtube_id = 'R58X00Rf9hI'
)
  and ae.suggested_category_id is distinct from rc.id;

with target_video as (
  select id, submitted_by
  from public.videos
  where youtube_id = 'R58X00Rf9hI'
  limit 1
),
recipe_playlist as (
  select p.id
  from public.playlists p
  where p.is_public = true
    and (
      p.slug ilike '%receita%'
      or p.name ilike '%receita%'
      or coalesce(p.description, '') ilike '%receita%'
      or p.slug ilike '%culinaria%'
      or p.name ilike '%culinaria%'
      or coalesce(p.description, '') ilike '%culinaria%'
      or p.slug ilike '%cozinha%'
      or p.name ilike '%cozinha%'
      or coalesce(p.description, '') ilike '%cozinha%'
    )
  order by p.video_count desc nulls last, p.created_at asc
  limit 1
),
next_pos as (
  select
    rp.id as playlist_id,
    coalesce(max(pv.position), -1) + 1 as next_position
  from recipe_playlist rp
  left join public.playlist_videos pv on pv.playlist_id = rp.id
  group by rp.id
)
insert into public.playlist_videos (playlist_id, video_id, position, notes, added_by)
select
  rp.id,
  tv.id,
  np.next_position,
  'Assigned by migration fix_recipe_classification_for_sopa_video',
  tv.submitted_by
from target_video tv
join recipe_playlist rp on true
join next_pos np on np.playlist_id = rp.id
where not exists (
  select 1
  from public.playlist_videos existing
  where existing.playlist_id = rp.id
    and existing.video_id = tv.id
);
