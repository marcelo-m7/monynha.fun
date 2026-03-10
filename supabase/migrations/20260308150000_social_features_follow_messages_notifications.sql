-- Social features MVP: follows, direct messages, notifications

-- 1) Follow graph
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT user_follows_unique UNIQUE (follower_id, following_id),
  CONSTRAINT user_follows_no_self_follow CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON public.user_follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON public.user_follows (following_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_follows_select_authenticated"
ON public.user_follows
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "user_follows_insert_own"
ON public.user_follows
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "user_follows_delete_own"
ON public.user_follows
FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

-- 2) Direct messages
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT direct_messages_no_self_message CHECK (sender_id <> receiver_id),
  CONSTRAINT direct_messages_content_not_empty CHECK (length(trim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON public.direct_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver_id ON public.direct_messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON public.direct_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver_unread ON public.direct_messages (receiver_id, is_read);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "direct_messages_select_participants"
ON public.direct_messages
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "direct_messages_insert_sender"
ON public.direct_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "direct_messages_update_receiver"
ON public.direct_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "direct_messages_delete_participants"
ON public.direct_messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 3) Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_authenticated"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "notifications_update_own"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger helper for follow notifications
CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.follower_id = NEW.following_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    actor_id,
    type,
    title,
    message,
    entity_type,
    entity_id
  )
  VALUES (
    NEW.following_id,
    NEW.follower_id,
    'new_follower',
    'New follower',
    'Someone started following you.',
    'follow',
    NEW.id
  );

  RETURN NEW;
END;
$$;

-- Trigger helper for message notifications
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_id = NEW.receiver_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    actor_id,
    type,
    title,
    message,
    entity_type,
    entity_id
  )
  VALUES (
    NEW.receiver_id,
    NEW.sender_id,
    'new_message',
    'New message',
    CASE
      WHEN length(NEW.content) > 90 THEN left(NEW.content, 90) || '...'
      ELSE NEW.content
    END,
    'direct_message',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_follower ON public.user_follows;
CREATE TRIGGER trg_notify_new_follower
AFTER INSERT ON public.user_follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_follower();

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.direct_messages;
CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();
