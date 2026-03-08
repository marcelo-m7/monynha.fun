export const notificationKeys = {
  all: ['notifications'] as const,
  list: (limit = 50) => [...notificationKeys.all, 'list', limit] as const,
  unreadCount: () => [...notificationKeys.all, 'unreadCount'] as const,
};
