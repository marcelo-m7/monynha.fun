import { supabase } from '@/shared/api/supabase/supabaseClient';
import type { NotificationWithActor } from './notification.types';

type NotificationRpcRow = {
  id: string;
  type: string;
  title: string | null;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  actor_username: string | null;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
};

export async function listNotifications(limit = 50) {
  const { data, error } = await supabase.rpc('list_notifications_secure', {
    p_limit: limit,
  });

  if (error) throw error;

  return ((data ?? []) as NotificationRpcRow[]).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    is_read: row.is_read,
    created_at: row.created_at,
    read_at: row.read_at,
    actor: row.actor_username || row.actor_display_name || row.actor_avatar_url
      ? {
          username: row.actor_username,
          display_name: row.actor_display_name,
          avatar_url: row.actor_avatar_url,
        }
      : null,
  })) as NotificationWithActor[];
}

export async function getUnreadNotificationsCount() {
  const { data, error } = await supabase.rpc('get_unread_notifications_count_secure');

  if (error) throw error;
  return data ?? 0;
}

export async function markNotificationAsRead(notificationId: string) {
  const { data, error } = await supabase.rpc('mark_notification_as_read_secure', {
    p_notification_id: notificationId,
  });

  if (error) throw error;
  return Boolean(data);
}

export async function markAllNotificationsAsRead() {
  const { data, error } = await supabase.rpc('mark_all_notifications_as_read_secure');

  if (error) throw error;
  return data ?? 0;
}
