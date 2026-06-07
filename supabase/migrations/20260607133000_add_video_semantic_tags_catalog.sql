create index if not exists idx_ai_enrichments_semantic_tags_gin
  on public.ai_enrichments
  using gin (semantic_tags);

create or replace function public.list_video_semantic_tags(p_limit integer default 200)
returns table (
  tag text,
  video_count bigint
)
language sql
stable
set search_path = public, pg_temp
as $$
  with latest_enrichment as (
    select distinct on (ae.video_id)
      ae.video_id,
      ae.semantic_tags
    from public.ai_enrichments ae
    where ae.semantic_tags is not null
      and cardinality(ae.semantic_tags) > 0
    order by ae.video_id, ae.reprocessed_at desc nulls last, ae.created_at desc nulls last, ae.id desc
  ),
  expanded as (
    select
      trim(raw_tag) as tag,
      le.video_id
    from latest_enrichment le
    cross join unnest(le.semantic_tags) as raw_tag
  )
  select
    e.tag,
    count(distinct e.video_id)::bigint as video_count
  from expanded e
  join public.v_video_exhibition v on v.id = e.video_id
  where e.tag <> ''
  group by e.tag
  order by video_count desc, e.tag asc
  limit greatest(coalesce(p_limit, 200), 1);
$$;

grant execute on function public.list_video_semantic_tags(integer) to anon, authenticated, service_role;