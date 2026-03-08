export const followKeys = {
  all: ['follows'] as const,
  followers: (username: string) => [...followKeys.all, 'followers', username] as const,
  following: (username: string) => [...followKeys.all, 'following', username] as const,
  status: (targetUsername: string) => [...followKeys.all, 'status', targetUsername] as const,
  stats: (username: string) => [...followKeys.all, 'stats', username] as const,
};
