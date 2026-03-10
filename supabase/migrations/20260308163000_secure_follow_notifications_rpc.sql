-- Secure username-based follow and notification RPCs to avoid UUID exposure in client requests

CREATE OR REPLACE FUNCTION public.follow_by_username_secure(p_target_username TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_id UUID;
  v_follow_id UUID;
BEGIN
  SELECT id INTO v_target_id
  FROM public.profiles
  WHERE username = p_target_username
  LIMIT 1;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  IF v_target_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  INSERT INTO public.user_follows (follower_id, following_id)
  VALUES (auth.uid(), v_target_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING
  RETURNING id INTO v_follow_id;

  RETURN v_follow_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unfollow_by_username_secure(p_target_username TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_id UUID;
  v_deleted INTEGER := 0;
BEGIN
  SELECT id INTO v_target_id
  FROM public.profiles
  WHERE username = p_target_username
  LIMIT 1;

  IF v_target_id IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM public.user_follows
  WHERE follower_id = auth.uid()
    AND following_id = v_target_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_following_by_username_secure(p_target_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT EXISTS (
  SELECT 1
  FROM public.user_follows uf
  JOIN public.profiles p ON p.id = uf.following_id
  WHERE uf.follower_id = auth.uid()
    AND p.username = p_target_username
);
$$;

CREATE OR REPLACE FUNCTION public.list_followers_by_username_secure(p_target_username TEXT)
RETURNS TABLE (
  follower_username TEXT,
  follower_display_name TEXT,
  follower_avatar_url TEXT,
  followed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
  follower.username,
  follower.display_name,
  follower.avatar_url,
  uf.created_at
FROM public.user_follows uf
JOIN public.profiles target ON target.id = uf.following_id
JOIN public.profiles follower ON follower.id = uf.follower_id
WHERE target.username = p_target_username
ORDER BY uf.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.list_following_by_username_secure(p_target_username TEXT)
RETURNS TABLE (
  following_username TEXT,
  following_display_name TEXT,
  following_avatar_url TEXT,
  followed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
  following.username,
  following.display_name,
  following.avatar_url,
  uf.created_at
FROM public.user_follows uf
JOIN public.profiles target ON target.id = uf.follower_id
JOIN public.profiles following ON following.id = uf.following_id
WHERE target.username = p_target_username
ORDER BY uf.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_follow_stats_by_username_secure(p_target_username TEXT)
RETURNS TABLE (
  followers_count BIGINT,
  following_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
  (SELECT COUNT(*) FROM public.user_follows uf JOIN public.profiles p ON p.id = uf.following_id WHERE p.username = p_target_username) AS followers_count,
  (SELECT COUNT(*) FROM public.user_follows uf JOIN public.profiles p ON p.id = uf.follower_id WHERE p.username = p_target_username) AS following_count;
$$;

CREATE OR REPLACE FUNCTION public.list_notifications_secure(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  actor_username TEXT,
  actor_display_name TEXT,
  actor_avatar_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
  n.id,
  n.type,
  n.title,
  n.message,
  n.entity_type,
  n.entity_id,
  n.is_read,
  n.created_at,
  n.read_at,
  a.username,
  a.display_name,
  a.avatar_url
FROM public.notifications n
LEFT JOIN public.profiles a ON a.id = n.actor_id
WHERE n.user_id = auth.uid()
ORDER BY n.created_at DESC
LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_notifications_count_secure()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT COUNT(*)::BIGINT
FROM public.notifications
WHERE user_id = auth.uid()
  AND is_read = false;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read_secure()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = auth.uid()
    AND is_read = false;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_as_read_secure(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = NOW()
  WHERE id = p_notification_id
    AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.follow_by_username_secure(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unfollow_by_username_secure(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_following_by_username_secure(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_followers_by_username_secure(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_following_by_username_secure(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_follow_stats_by_username_secure(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_notifications_secure(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notifications_count_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_as_read_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_as_read_secure(UUID) TO authenticated;
