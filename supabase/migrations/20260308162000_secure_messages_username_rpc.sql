-- Secure username-based messaging RPCs to avoid UUID exposure in client requests

CREATE OR REPLACE FUNCTION public.list_inbox_conversations_secure()
RETURNS TABLE (
  partner_username TEXT,
  partner_display_name TEXT,
  partner_avatar_url TEXT,
  last_message_id UUID,
  last_message_content TEXT,
  last_message_created_at TIMESTAMP WITH TIME ZONE,
  last_message_is_read BOOLEAN,
  last_message_sender_username TEXT,
  unread_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH scoped AS (
  SELECT
    dm.*,
    CASE
      WHEN dm.sender_id = auth.uid() THEN dm.receiver_id
      ELSE dm.sender_id
    END AS partner_id
  FROM public.direct_messages dm
  WHERE dm.sender_id = auth.uid() OR dm.receiver_id = auth.uid()
),
latest AS (
  SELECT DISTINCT ON (partner_id)
    partner_id,
    id,
    content,
    created_at,
    is_read,
    sender_id
  FROM scoped
  ORDER BY partner_id, created_at DESC
),
unread AS (
  SELECT
    partner_id,
    COUNT(*)::BIGINT AS unread_count
  FROM scoped
  WHERE receiver_id = auth.uid() AND is_read = false
  GROUP BY partner_id
)
SELECT
  partner.username AS partner_username,
  partner.display_name AS partner_display_name,
  partner.avatar_url AS partner_avatar_url,
  latest.id AS last_message_id,
  latest.content AS last_message_content,
  latest.created_at AS last_message_created_at,
  latest.is_read AS last_message_is_read,
  sender_profile.username AS last_message_sender_username,
  COALESCE(unread.unread_count, 0) AS unread_count
FROM latest
JOIN public.profiles partner ON partner.id = latest.partner_id
LEFT JOIN public.profiles sender_profile ON sender_profile.id = latest.sender_id
LEFT JOIN unread ON unread.partner_id = latest.partner_id
ORDER BY latest.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_conversation_by_username_secure(p_other_username TEXT)
RETURNS TABLE (
  id UUID,
  content TEXT,
  is_read BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  sender_username TEXT,
  sender_display_name TEXT,
  sender_avatar_url TEXT,
  receiver_username TEXT,
  receiver_display_name TEXT,
  receiver_avatar_url TEXT,
  is_mine BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
  dm.id,
  dm.content,
  dm.is_read,
  dm.created_at,
  sender_profile.username AS sender_username,
  sender_profile.display_name AS sender_display_name,
  sender_profile.avatar_url AS sender_avatar_url,
  receiver_profile.username AS receiver_username,
  receiver_profile.display_name AS receiver_display_name,
  receiver_profile.avatar_url AS receiver_avatar_url,
  (dm.sender_id = auth.uid()) AS is_mine
FROM public.direct_messages dm
JOIN public.profiles sender_profile ON sender_profile.id = dm.sender_id
JOIN public.profiles receiver_profile ON receiver_profile.id = dm.receiver_id
WHERE
  (dm.sender_id = auth.uid() OR dm.receiver_id = auth.uid())
  AND (
    sender_profile.username = p_other_username
    OR receiver_profile.username = p_other_username
  )
ORDER BY dm.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.send_direct_message_by_username_secure(
  p_receiver_username TEXT,
  p_content TEXT
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  is_read BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  sender_username TEXT,
  receiver_username TEXT,
  is_mine BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receiver_id UUID;
BEGIN
  SELECT id INTO v_receiver_id
  FROM public.profiles
  WHERE username = p_receiver_username
  LIMIT 1;

  IF v_receiver_id IS NULL THEN
    RAISE EXCEPTION 'Receiver not found';
  END IF;

  IF v_receiver_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot send message to yourself';
  END IF;

  RETURN QUERY
  WITH inserted AS (
    INSERT INTO public.direct_messages (sender_id, receiver_id, content)
    VALUES (auth.uid(), v_receiver_id, trim(p_content))
    RETURNING *
  )
  SELECT
    inserted.id,
    inserted.content,
    inserted.is_read,
    inserted.created_at,
    sender_profile.username AS sender_username,
    receiver_profile.username AS receiver_username,
    true AS is_mine
  FROM inserted
  JOIN public.profiles sender_profile ON sender_profile.id = inserted.sender_id
  JOIN public.profiles receiver_profile ON receiver_profile.id = inserted.receiver_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_as_read_by_username_secure(p_other_username TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_other_id UUID;
  v_updated_rows INTEGER := 0;
BEGIN
  SELECT id INTO v_other_id
  FROM public.profiles
  WHERE username = p_other_username
  LIMIT 1;

  IF v_other_id IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.direct_messages
  SET is_read = true, read_at = NOW()
  WHERE receiver_id = auth.uid()
    AND sender_id = v_other_id
    AND is_read = false;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  RETURN v_updated_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_messages_count_secure()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT COUNT(*)::BIGINT
FROM public.direct_messages
WHERE receiver_id = auth.uid()
  AND is_read = false;
$$;

GRANT EXECUTE ON FUNCTION public.list_inbox_conversations_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_by_username_secure(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_direct_message_by_username_secure(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_as_read_by_username_secure(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_messages_count_secure() TO authenticated;
