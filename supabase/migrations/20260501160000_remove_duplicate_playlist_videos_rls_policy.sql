-- Consolidate playlist_videos RLS policies
-- Remove the old broken policy that uses playlist_accessible_to_user()
-- Keep only the fixed "View videos in public or accessible playlists" policy

DROP POLICY IF EXISTS "read_playlist_videos" ON public.playlist_videos;

-- Verify the new policy is in place (it should be from previous migration)
-- If for some reason it's not, create it:
CREATE POLICY IF NOT EXISTS "View videos in public or accessible playlists" ON public.playlist_videos
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
