-- Add engagement counters to videos
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS favorites_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS playlist_add_count integer NOT NULL DEFAULT 0;

-- Backfill counters from existing data
UPDATE public.videos v
SET favorites_count = fav.favorites_count
FROM (
  SELECT video_id, COUNT(*)::integer AS favorites_count
  FROM public.favorites
  GROUP BY video_id
) fav
WHERE fav.video_id = v.id;

UPDATE public.videos v
SET playlist_add_count = pv.playlist_add_count
FROM (
  SELECT video_id, COUNT(*)::integer AS playlist_add_count
  FROM public.playlist_videos
  GROUP BY video_id
) pv
WHERE pv.video_id = v.id;

-- Track unique daily views per user/session
CREATE TABLE IF NOT EXISTS public.video_view_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  viewed_on date NOT NULL DEFAULT current_date,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.video_view_events ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_video_view_events_user_unique
  ON public.video_view_events (video_id, user_id, viewed_on)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_video_view_events_session_unique
  ON public.video_view_events (video_id, session_id, viewed_on)
  WHERE user_id IS NULL AND session_id IS NOT NULL;

-- Update increment function to dedupe per day
CREATE OR REPLACE FUNCTION public.increment_video_view_count(p_video_id uuid, p_session_id text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_id uuid;
  use_session_id text;
  inserted_count integer;
  new_count integer;
BEGIN
  viewer_id := auth.uid();
  use_session_id := CASE WHEN viewer_id IS NULL THEN p_session_id ELSE NULL END;

  IF viewer_id IS NULL AND use_session_id IS NULL THEN
    SELECT view_count INTO new_count FROM public.videos WHERE id = p_video_id;
    RETURN COALESCE(new_count, 0);
  END IF;

  INSERT INTO public.video_view_events (video_id, user_id, session_id)
  VALUES (p_video_id, viewer_id, use_session_id)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count > 0 THEN
    UPDATE public.videos
    SET view_count = view_count + 1
    WHERE id = p_video_id;
  END IF;

  SELECT view_count INTO new_count FROM public.videos WHERE id = p_video_id;
  RETURN COALESCE(new_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_video_view_count(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_video_view_count(uuid, text) TO authenticated;

-- Keep favorites_count in sync
CREATE OR REPLACE FUNCTION public.increment_video_favorites_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.videos
  SET favorites_count = favorites_count + 1
  WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_video_favorites_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.videos
  SET favorites_count = GREATEST(favorites_count - 1, 0)
  WHERE id = OLD.video_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_favorite_added ON public.favorites;
DROP TRIGGER IF EXISTS on_favorite_removed ON public.favorites;

CREATE TRIGGER on_favorite_added
  AFTER INSERT ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.increment_video_favorites_count();

CREATE TRIGGER on_favorite_removed
  AFTER DELETE ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.decrement_video_favorites_count();

-- Keep playlist_add_count in sync
CREATE OR REPLACE FUNCTION public.increment_video_playlist_add_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.videos
  SET playlist_add_count = playlist_add_count + 1
  WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_video_playlist_add_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.videos
  SET playlist_add_count = GREATEST(playlist_add_count - 1, 0)
  WHERE id = OLD.video_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_playlist_video_added ON public.playlist_videos;
DROP TRIGGER IF EXISTS on_playlist_video_removed ON public.playlist_videos;

CREATE TRIGGER on_playlist_video_added
  AFTER INSERT ON public.playlist_videos
  FOR EACH ROW EXECUTE FUNCTION public.increment_video_playlist_add_count();

CREATE TRIGGER on_playlist_video_removed
  AFTER DELETE ON public.playlist_videos
  FOR EACH ROW EXECUTE FUNCTION public.decrement_video_playlist_add_count();

-- Featured ranking RPC
CREATE OR REPLACE FUNCTION public.list_featured_videos(p_limit integer DEFAULT 4, p_offset integer DEFAULT 0)
RETURNS TABLE (
  id uuid,
  youtube_id text,
  title text,
  description text,
  channel_name text,
  duration_seconds integer,
  thumbnail_url text,
  language text,
  category_id uuid,
  submitted_by uuid,
  view_count integer,
  favorites_count integer,
  playlist_add_count integer,
  is_featured boolean,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  featured_score numeric,
  category jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.youtube_id,
    v.title,
    v.description,
    v.channel_name,
    v.duration_seconds,
    v.thumbnail_url,
    v.language,
    v.category_id,
    v.submitted_by,
    v.view_count,
    v.favorites_count,
    v.playlist_add_count,
    v.is_featured,
    v.created_at,
    v.updated_at,
    v.view_count::numeric AS featured_score,
    to_jsonb(c.*) AS category
  FROM public.videos v
  LEFT JOIN public.categories c ON c.id = v.category_id
  ORDER BY
    v.view_count DESC,
    v.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_featured_videos(integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.list_featured_videos(integer, integer) TO authenticated;
