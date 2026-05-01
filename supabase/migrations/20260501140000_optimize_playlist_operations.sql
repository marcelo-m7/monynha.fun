-- Optimize playlist operations for performance
-- 1. Auto-calculate position for new playlist_videos
-- 2. Add index on playlist_id for faster lookups

-- Create function to calculate next position
CREATE OR REPLACE FUNCTION calculate_next_position()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.position IS NULL THEN
    SELECT COALESCE(MAX(position), -1) + 1 INTO NEW.position
    FROM public.playlist_videos
    WHERE playlist_id = NEW.playlist_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_playlist_videos_position ON public.playlist_videos;

-- Create trigger to auto-set position on insert
CREATE TRIGGER set_playlist_videos_position
BEFORE INSERT ON public.playlist_videos
FOR EACH ROW
EXECUTE FUNCTION calculate_next_position();

-- Add index on playlist_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_playlist_videos_playlist_id ON public.playlist_videos(playlist_id);

-- Add index on position for ordering
CREATE INDEX IF NOT EXISTS idx_playlist_videos_position ON public.playlist_videos(playlist_id, position);
