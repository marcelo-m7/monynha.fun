with music_category as (
  select id
  from public.categories
  where slug = 'musica'
  limit 1
),
music_candidates as (
  select v.id
  from public.videos v
  left join public.categories c on c.id = v.category_id
  where c.slug = 'educacao'
    and (
      v.title ilike '%official video%'
      or v.title ilike '%music video%'
      or v.title ilike '%lyrics%'
      or v.title ilike '%album%'
      or v.channel_name ilike '%vevo%'
      or v.title ilike '% - %'
    )
)
update public.videos v
set category_id = mc.id,
    updated_at = now()
from music_category mc
where v.id in (select id from music_candidates)
  and v.category_id is distinct from mc.id;

with music_category as (
  select id
  from public.categories
  where slug = 'musica'
  limit 1
),
music_candidates as (
  select v.id
  from public.videos v
  left join public.categories c on c.id = v.category_id
  where c.slug = 'musica'
    and (
      v.title ilike '%official video%'
      or v.title ilike '%music video%'
      or v.title ilike '%lyrics%'
      or v.title ilike '%album%'
      or v.channel_name ilike '%vevo%'
      or v.title ilike '% - %'
    )
)
update public.ai_enrichments ae
set suggested_category_id = mc.id,
    semantic_tags = (
      select array(
        select distinct tag
        from unnest(coalesce(ae.semantic_tags, '{}'::text[]) || array['música','music']) as tag
        where tag is not null and btrim(tag) <> ''
      )
    )
from music_category mc
where ae.video_id in (select id from music_candidates)
  and ae.suggested_category_id is distinct from mc.id;
