export const directMessageKeys = {
  all: ['direct-messages'] as const,
  inbox: () => [...directMessageKeys.all, 'inbox'] as const,
  conversation: (username: string) => [...directMessageKeys.all, 'conversation', username] as const,
  unreadCount: () => [...directMessageKeys.all, 'unread-count'] as const,
};
