export const directMessageKeys = {
  all: ['directMessages'] as const,
  conversation: (currentUserId: string, otherUserId: string) =>
    [...directMessageKeys.all, 'conversation', currentUserId, otherUserId] as const,
  inbox: (userId: string) => [...directMessageKeys.all, 'inbox', userId] as const,
  unreadCount: (userId: string) => [...directMessageKeys.all, 'unreadCount', userId] as const,
};
