-- Fix ambiguous output-column reference inside messaging RPC
-- In RETURNS TABLE plpgsql functions, output column names act as variables.
-- Qualify profile id reference to avoid ambiguity with output column "id".

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
  SELECT p.id INTO v_receiver_id
  FROM public.profiles p
  WHERE p.username = p_receiver_username
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
