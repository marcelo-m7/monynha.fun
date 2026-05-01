-- Fix auth_rls_initplan performance warnings
-- Replace bare auth.uid() calls with (SELECT auth.uid()) to avoid per-row
-- re-evaluation and satisfy the Supabase security advisor recommendations.
-- Affected tables: comments, direct_messages, notifications, user_follows,
-- user_social_accounts

-- ─── comments ────────────────────────────────────────────────────────────────

ALTER POLICY "Users can delete their own comments"
  ON public.comments
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can update their own comments"
  ON public.comments
  USING ((SELECT auth.uid()) = user_id);

-- ─── direct_messages ─────────────────────────────────────────────────────────

ALTER POLICY "direct_messages_delete_participants"
  ON public.direct_messages
  USING ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id);

ALTER POLICY "direct_messages_select_participants"
  ON public.direct_messages
  USING ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id);

ALTER POLICY "direct_messages_update_receiver"
  ON public.direct_messages
  USING ((SELECT auth.uid()) = receiver_id);

-- ─── notifications ───────────────────────────────────────────────────────────

ALTER POLICY "notifications_delete_own"
  ON public.notifications
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "notifications_select_own"
  ON public.notifications
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "notifications_update_own"
  ON public.notifications
  USING ((SELECT auth.uid()) = user_id);

-- ─── user_follows ─────────────────────────────────────────────────────────────

ALTER POLICY "user_follows_delete_own"
  ON public.user_follows
  USING ((SELECT auth.uid()) = follower_id);

-- ─── user_social_accounts ────────────────────────────────────────────────────

ALTER POLICY "Users can delete their own social accounts"
  ON public.user_social_accounts
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can update their own social accounts"
  ON public.user_social_accounts
  USING ((SELECT auth.uid()) = user_id);
