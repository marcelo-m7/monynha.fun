import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/useAuth';
import { socialAccountKeys } from '@/entities/social_account/social_account.keys';
import { listUserSocialAccounts, addSocialAccount, updateSocialAccount, deleteSocialAccount } from '@/entities/social_account/social_account.api';
import type { UserSocialAccount, UserSocialAccountInsert, UserSocialAccountUpdate } from '@/entities/social_account/social_account.types';

export function useUserSocialAccounts(userId: string | undefined) {
  return useQuery<UserSocialAccount[], Error>({
    queryKey: userId ? socialAccountKeys.list(userId) : socialAccountKeys.list(''),
    queryFn: async () => {
      if (!userId) return [];
      return listUserSocialAccounts(userId);
    },
    enabled: !!userId,
  });
}

export function useAddSocialAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<UserSocialAccount, Error, Omit<UserSocialAccountInsert, 'user_id'>>({
    mutationFn: async (payload) => {
      if (!user?.id) throw new Error('User not authenticated');
      return addSocialAccount({ ...payload, user_id: user.id });
    },
    onSuccess: (newAccount) => {
      queryClient.invalidateQueries({ queryKey: socialAccountKeys.list(newAccount.user_id) });
      toast.success('Social account added successfully!');
    },
    onError: (error) => {
      toast.error('Failed to add social account', { description: error.message });
    },
  });
}

export function useUpdateSocialAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<UserSocialAccount, Error, { id: string; updates: UserSocialAccountUpdate }>({
    mutationFn: async ({ id, updates }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return updateSocialAccount(id, updates);
    },
    onSuccess: (updatedAccount) => {
      queryClient.invalidateQueries({ queryKey: socialAccountKeys.list(updatedAccount.user_id) });
      queryClient.invalidateQueries({ queryKey: socialAccountKeys.detail(updatedAccount.id) });
      toast.success('Social account updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update social account', { description: error.message });
    },
  });
}

export function useDeleteSocialAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<void, Error, { id: string; userId: string }>({
    mutationFn: async ({ id }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return deleteSocialAccount(id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: socialAccountKeys.list(variables.userId) });
      toast.success('Social account removed successfully!');
    },
    onError: (error) => {
      toast.error('Failed to remove social account', { description: error.message });
    },
  });
}