import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '@/shared/lib/notify';
import {
  getUnreadNotificationsCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/entities/notification/notification.api';
import { notificationKeys } from '@/entities/notification/notification.keys';
import type { NotificationItem } from '@/entities/notification/notification.types';
import { useAuth } from '@/features/auth/useAuth';

export function useNotifications(limit = 50) {
  return useQuery<NotificationItem[], Error>({
    queryKey: notificationKeys.list(limit),
    queryFn: () => listNotifications(limit),
  });
}

export function useUnreadNotificationsCount() {
  const { user } = useAuth();

  return useQuery<number, Error>({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      if (!user) return 0;
      return getUnreadNotificationsCount();
    },
    enabled: !!user,
    staleTime: 15000,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, { notificationId: string; limit?: number }>({
    mutationFn: ({ notificationId }) => markNotificationAsRead(notificationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(variables.limit || 50) });
    },
    onError: (error) => {
      notify.error('Nao foi possivel atualizar a notificacao.', { description: error.message });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation<number, Error, { limit?: number } | undefined>({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(variables?.limit || 50) });
    },
    onError: (error) => {
      notify.error('Nao foi possivel marcar as notificacoes como lidas.', { description: error.message });
    },
  });
}
