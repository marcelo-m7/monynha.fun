export const directMessageKeys = {
  all: ['directMessages'] as const,
  conversation: (currentUserId: string, otherUsername: string) =>
    [...directMessageKeys.all, 'conversation', currentUserId, otherUsername] as const,
  inbox: (userId: string) => [...directMessageKeys.all, 'inbox', userId] as const,
  unreadCount: (userId: string) => [...directMessageKeys.all, 'unreadCount', userId] as const,
};
