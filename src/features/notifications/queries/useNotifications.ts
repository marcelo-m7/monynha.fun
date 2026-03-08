import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/useAuth';
import { notificationKeys } from '@/entities/notification/notification.keys';
import {
  getUnreadNotificationsCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/entities/notification/notification.api';
import type { NotificationWithActor } from '@/entities/notification/notification.types';

export function useNotifications(limit = 50) {
  const { user } = useAuth();

  return useQuery<NotificationWithActor[], Error>({
    queryKey: user?.id ? notificationKeys.list(user.id, limit) : notificationKeys.list('', limit),
    queryFn: async () => {
      if (!user?.id) return [];
      return listNotifications(user.id, limit);
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });
}

export function useUnreadNotificationsCount() {
  const { user } = useAuth();

  return useQuery<number, Error>({
    queryKey: user?.id ? notificationKeys.unreadCount(user.id) : notificationKeys.unreadCount(''),
    queryFn: async () => {
      if (!user?.id) return 0;
      return getUnreadNotificationsCount(user.id);
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });
}

export function useMarkNotificationAsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(notificationId),
    onSuccess: () => {
      if (!user?.id) return;
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(user.id) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(user.id) });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('You must be logged in to update notifications.');
      return markAllNotificationsAsRead(user.id);
    },
    onSuccess: () => {
      if (!user?.id) return;
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(user.id) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(user.id) });
      toast.success('All notifications marked as read.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Could not update notifications.');
    },
  });
}
