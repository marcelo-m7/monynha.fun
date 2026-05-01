-- Fix playlist_videos RLS policy to allow public access
-- The current policy breaks for public playlists when auth.uid() is NULL
-- This ensures public playlists are readable by everyone, while keeping private playlists secure

DROP POLICY IF EXISTS "View videos in accessible playlists" ON public.playlist_videos;

CREATE POLICY "View videos in public or accessible playlists" ON public.playlist_videos
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.playlists p
    WHERE p.id = playlist_videos.playlist_id AND (
      p.is_public = TRUE                        -- Allow public playlists for ALL users
      OR
      (auth.uid() IS NOT NULL AND (             -- For authenticated users only
        p.author_id = auth.uid() OR
        EXISTS (
          SELECT 1
          FROM public.playlist_collaborators pc
          WHERE pc.playlist_id = p.id AND pc.user_id = auth.uid()
        )
      ))
    )
  )
);
