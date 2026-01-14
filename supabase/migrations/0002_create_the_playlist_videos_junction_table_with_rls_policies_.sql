-- Create playlist_videos junction table
CREATE TABLE public.playlist_videos (
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (playlist_id, video_id) -- Enforce uniqueness for video in a playlist
);

-- Create a composite index on (playlist_id, position) for ordering
CREATE UNIQUE INDEX idx_playlist_videos_position ON public.playlist_videos (playlist_id, position);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.playlist_videos ENABLE ROW LEVEL SECURITY;

-- Policies for playlist_videos table
CREATE POLICY "Anyone can view videos in public playlists" ON public.playlist_videos
FOR SELECT USING (EXISTS (SELECT 1 FROM public.playlists WHERE playlists.id = playlist_videos.playlist_id AND playlists.is_public = TRUE));

CREATE POLICY "Playlist authors can add videos to their playlists" ON public.playlist_videos
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.playlists WHERE playlists.id = playlist_videos.playlist_id AND playlists.author_id = auth.uid()));

CREATE POLICY "Playlist authors can update videos in their playlists" ON public.playlist_videos
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.playlists WHERE playlists.id = playlist_videos.playlist_id AND playlists.author_id = auth.uid()));

CREATE POLICY "Playlist authors can remove videos from their playlists" ON public.playlist_videos
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.playlists WHERE playlists.id = playlist_videos.playlist_id AND playlists.author_id = auth.uid()));