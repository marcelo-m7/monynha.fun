export const followKeys = {
  all: ['follows'] as const,
  followers: (userId: string) => [...followKeys.all, 'followers', userId] as const,
  following: (userId: string) => [...followKeys.all, 'following', userId] as const,
  status: (followerId: string, followingId: string) =>
    [...followKeys.all, 'status', followerId, followingId] as const,
  stats: (userId: string) => [...followKeys.all, 'stats', userId] as const,
};
