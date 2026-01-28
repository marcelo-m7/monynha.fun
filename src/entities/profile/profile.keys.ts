export const profileKeys = {
  all: ['profiles'] as const,
  details: () => [...profileKeys.all, 'detail'] as const,
  detail: (id: string) => [...profileKeys.details(), id] as const,
  byUsername: (username: string) => [...profileKeys.all, 'by-username', username] as const,
  contributorCount: () => [...profileKeys.all, 'contributor-count'] as const,
  lists: () => [...profileKeys.all, 'list'] as const, // New key for listing all profiles
  list: () => [...profileKeys.lists()] as const, // New key for listing all profiles
};