with recipe_videos as (
  select id
  from public.videos
  where youtube_id in ('R58X00Rf9hI', 'f4WqjJWNa2s')
)
update public.ai_enrichments ae
set semantic_tags = (
  select array(
    select distinct tag
    from unnest(coalesce(ae.semantic_tags, '{}'::text[]) || array['receitas','culinaria','cozinha']) as tag
    where tag is not null and btrim(tag) <> ''
  )
)
where ae.video_id in (select id from recipe_videos)
  and not (
    coalesce(ae.semantic_tags, '{}'::text[]) @> array['receitas']::text[]
    and coalesce(ae.semantic_tags, '{}'::text[]) @> array['culinaria']::text[]
  );
