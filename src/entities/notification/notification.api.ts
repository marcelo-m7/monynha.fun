import { supabase } from '@/shared/api/supabase/supabaseClient';
import type { NotificationItem } from './notification.types';

interface NotificationRpcRow {
  actor_avatar_url: string | null;
  actor_display_name: string | null;
  actor_username: string | null;
  created_at: string;
  entity_id: string | null;
  entity_type: string | null;
  id: string;
  is_read: boolean;
  message: string | null;
  read_at: string | null;
  title: string;
  type: string;
}

export async function listNotifications(limit = 50) {
  const { data, error } = await supabase.rpc('list_notifications_secure', {
    p_limit: limit,
  });

  if (error) throw error;

  return ((data as NotificationRpcRow[] | null) || []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    entityType: row.entity_type,
    entityId: row.entity_id,
    isRead: row.is_read,
    createdAt: row.created_at,
    readAt: row.read_at,
    actorUsername: row.actor_username,
    actorDisplayName: row.actor_display_name,
    actorAvatarUrl: row.actor_avatar_url,
  })) satisfies NotificationItem[];
}

export async function markNotificationAsRead(notificationId: string) {
  const { data, error } = await supabase.rpc('mark_notification_as_read_secure', {
    p_notification_id: notificationId,
  });

  if (error) throw error;
  return !!data;
}

export async function markAllNotificationsAsRead() {
  const { data, error } = await supabase.rpc('mark_all_notifications_as_read_secure');

  if (error) throw error;
  return Number(data || 0);
}

export async function getUnreadNotificationsCount() {
  const { data, error } = await supabase.rpc('get_unread_notifications_count_secure');

  if (error) throw error;
  return Number(data || 0);
}
