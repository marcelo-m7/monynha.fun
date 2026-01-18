export const socialAccountKeys = {
  all: ['user_social_accounts'] as const,
  lists: () => [...socialAccountKeys.all, 'list'] as const,
  list: (userId: string) => [...socialAccountKeys.lists(), userId] as const,
  details: () => [...socialAccountKeys.all, 'detail'] as const,
  detail: (id: string) => [...socialAccountKeys.details(), id] as const,
};