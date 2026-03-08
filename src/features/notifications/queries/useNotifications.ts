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
    queryKey: notificationKeys.list(limit),
    queryFn: async () => {
      if (!user?.id) return [];
      return listNotifications(limit);
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });
}

export function useUnreadNotificationsCount() {
  const { user } = useAuth();

  return useQuery<number, Error>({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      if (!user?.id) return 0;
      return getUnreadNotificationsCount();
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
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('You must be logged in to update notifications.');
      return markAllNotificationsAsRead();
    },
    onSuccess: () => {
      if (!user?.id) return;
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success('All notifications marked as read.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Could not update notifications.');
    },
  });
}
