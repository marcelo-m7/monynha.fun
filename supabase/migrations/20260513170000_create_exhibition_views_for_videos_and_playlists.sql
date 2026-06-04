-- Enriched read models for frontend exhibition screens.
-- These views reduce client round-trips by pre-joining category, author,
-- latest enrichment, and playlist context metadata.

create or replace view public.v_video_exhibition
with (security_invoker = true) as
select
  v.*,
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
  coalesce(cc.comment_count, 0) as comment_count
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
  select count(*)::int as playlist_count
  from public.playlist_videos pv
  where pv.video_id = v.id
) pc on true
left join lateral (
  select count(*)::int as comment_count
  from public.comments cm
  where cm.video_id = v.id
) cc on true;

create or replace view public.v_playlist_exhibition
with (security_invoker = true) as
select
  pl.*,
  author.username as author_username,
  author.display_name as author_display_name,
  author.avatar_url as author_avatar_url,
  coalesce(collab.collaborator_count, 0) as collaborator_count,
  preview.video_id as preview_video_id,
  preview.video_title as preview_video_title,
  preview.video_thumbnail_url as preview_video_thumbnail_url,
  preview.video_channel_name as preview_video_channel_name,
  coalesce(activity.last_video_added_at, pl.updated_at, pl.created_at) as activity_at
from public.playlists pl
left join public.profiles author on author.id = pl.author_id
left join lateral (
  select count(*)::int as collaborator_count
  from public.playlist_collaborators pc
  where pc.playlist_id = pl.id
) collab on true
left join lateral (
  select
    v.id as video_id,
    v.title as video_title,
    v.thumbnail_url as video_thumbnail_url,
    v.channel_name as video_channel_name
  from public.playlist_videos pv
  join public.videos v on v.id = pv.video_id
  where pv.playlist_id = pl.id
  order by pv.position asc, pv.created_at asc
  limit 1
) preview on true
left join lateral (
  select max(pv.created_at) as last_video_added_at
  from public.playlist_videos pv
  where pv.playlist_id = pl.id
) activity on true;

grant select on public.v_video_exhibition to anon, authenticated;
grant select on public.v_playlist_exhibition to anon, authenticated;
