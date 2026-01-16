-- Create function to increment a video's view_count atomically
CREATE OR REPLACE FUNCTION public.increment_video_view_count(p_video_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.videos
  SET view_count = view_count + 1
  WHERE id = p_video_id;

  RETURN (SELECT view_count FROM public.videos WHERE id = p_video_id);
END;
$$;

-- Allow anonymous and authenticated clients to call the function
GRANT EXECUTE ON FUNCTION public.increment_video_view_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_video_view_count(uuid) TO authenticated;
