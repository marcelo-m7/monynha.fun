-- Create function to mark top N videos as featured based on view_count
CREATE OR REPLACE FUNCTION public.mark_top_videos_as_featured(p_limit integer DEFAULT 4)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  WITH top_videos AS (
    SELECT id FROM public.videos
    ORDER BY view_count DESC
    LIMIT p_limit
  )
  UPDATE public.videos v
  SET is_featured = true
  FROM top_videos t
  WHERE v.id = t.id
  RETURNING v.id INTO updated_count;

  -- If RETURNING into single scalar doesn't work, compute updated_count
  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_top_videos_as_featured(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.mark_top_videos_as_featured(integer) TO authenticated;
