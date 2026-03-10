export const followKeys = {
  all: ['follows'] as const,
  stats: (username: string) => [...followKeys.all, 'stats', username] as const,
  status: (username: string) => [...followKeys.all, 'status', username] as const,
  followers: (username: string) => [...followKeys.all, 'followers', username] as const,
  following: (username: string) => [...followKeys.all, 'following', username] as const,
};
