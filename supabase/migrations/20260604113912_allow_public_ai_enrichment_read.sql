-- Allow the public exhibition views to show AI summaries and semantic tags for
-- videos that are already public, without exposing transcript text.

drop policy if exists "Public can read AI enrichment for public videos" on public.ai_enrichments;

create policy "Public can read AI enrichment for public videos"
on public.ai_enrichments
for select
to anon
using (
  exists (
    select 1
    from public.videos
    where videos.id = ai_enrichments.video_id
  )
);
