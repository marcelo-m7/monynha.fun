-- Create a canonical public recipe playlist and backfill known recipe videos.

with editor_profile as (
  select id
  from public.profiles
  where role in ('admin', 'editor')
  order by created_at asc
  limit 1
),
upsert_playlist as (
  insert into public.playlists (
    name,
    slug,
    description,
    author_id,
    language,
    is_public,
    is_ordered,
    tags,
    metadata,
    review_status,
    classification_confidence
  )
  select
    'Receitas Tradicionais',
    'receitas-tradicionais',
    'Receitas tradicionais, tecnicas de cozinha e gastronomia em portugues.',
    ep.id,
    'pt',
    true,
    true,
    array['receitas','culinaria','cozinha']::text[],
    jsonb_build_object('source', 'migration', 'scope', 'recipe-classification-fix'),
    'reviewed',
    0.95
  from editor_profile ep
  where not exists (
    select 1 from public.playlists p where p.slug = 'receitas-tradicionais'
  )
  returning id
),
recipe_playlist as (
  select id from upsert_playlist
  union all
  select id from public.playlists where slug = 'receitas-tradicionais'
  limit 1
),
recipe_category as (
  select id
  from public.categories
  where slug in ('receitas-tradicionais', 'receitas')
  order by case when slug = 'receitas-tradicionais' then 0 else 1 end
  limit 1
),
recipe_videos as (
  select id, submitted_by
  from public.videos
  where youtube_id in ('R58X00Rf9hI', 'f4WqjJWNa2s')
)
update public.videos v
set
  category_id = rc.id,
  updated_at = now()
from recipe_category rc, recipe_videos rv
where v.id = rv.id
  and v.category_id is distinct from rc.id;

with recipe_category as (
  select id
  from public.categories
  where slug in ('receitas-tradicionais', 'receitas')
  order by case when slug = 'receitas-tradicionais' then 0 else 1 end
  limit 1
),
recipe_videos as (
  select id
  from public.videos
  where youtube_id in ('R58X00Rf9hI', 'f4WqjJWNa2s')
)
update public.ai_enrichments ae
set suggested_category_id = rc.id
from recipe_category rc, recipe_videos rv
where ae.video_id = rv.id
  and ae.suggested_category_id is distinct from rc.id;

with recipe_playlist as (
  select id
  from public.playlists
  where slug = 'receitas-tradicionais'
  limit 1
),
recipe_videos as (
  select id, submitted_by
  from public.videos
  where youtube_id in ('R58X00Rf9hI', 'f4WqjJWNa2s')
),
rows_to_insert as (
  select
    rp.id as playlist_id,
    rv.id as video_id,
    rv.submitted_by as added_by
  from recipe_playlist rp
  cross join recipe_videos rv
  where not exists (
    select 1
    from public.playlist_videos pv
    where pv.playlist_id = rp.id
      and pv.video_id = rv.id
  )
),
base_pos as (
  select
    rti.playlist_id,
    coalesce(max(pv.position), -1) as max_position
  from rows_to_insert rti
  left join public.playlist_videos pv on pv.playlist_id = rti.playlist_id
  group by rti.playlist_id
)
insert into public.playlist_videos (playlist_id, video_id, position, notes, added_by)
select
  rti.playlist_id,
  rti.video_id,
  bp.max_position + row_number() over (partition by rti.playlist_id order by rti.video_id),
  'Assigned by migration create_recipe_playlist_and_backfill_recipe_videos_v3',
  rti.added_by
from rows_to_insert rti
join base_pos bp on bp.playlist_id = rti.playlist_id;
