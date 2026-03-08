export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: string, limit = 50) => [...notificationKeys.all, 'list', userId, limit] as const,
  unreadCount: (userId: string) => [...notificationKeys.all, 'unreadCount', userId] as const,
};
