-- Update increment function to set is_featured when view_count crosses threshold
CREATE OR REPLACE FUNCTION public.increment_video_view_count(p_video_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
  featured_threshold integer := 100;
BEGIN
  UPDATE public.videos
  SET view_count = view_count + 1
  WHERE id = p_video_id;

  SELECT view_count INTO new_count FROM public.videos WHERE id = p_video_id;

  IF new_count >= featured_threshold THEN
    UPDATE public.videos SET is_featured = true WHERE id = p_video_id;
  END IF;

  RETURN new_count;
END;
$$;

-- Ensure execute permissions
GRANT EXECUTE ON FUNCTION public.increment_video_view_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_video_view_count(uuid) TO authenticated;
