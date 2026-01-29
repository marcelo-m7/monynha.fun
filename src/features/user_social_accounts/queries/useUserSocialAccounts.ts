import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/useAuth';
import { userSocialAccountKeys } from '@/entities/user_social_account/user_social_account.keys';
import {
  listUserSocialAccounts,
  createUserSocialAccount,
  updateUserSocialAccount,
  deleteUserSocialAccount,
} from '@/entities/user_social_account/user_social_account.api';
import type { UserSocialAccount, UserSocialAccountInsert, UserSocialAccountUpdate } from '@/entities/user_social_account/user_social_account.types';

export function useUserSocialAccounts(userId: string | undefined) {
  return useQuery<UserSocialAccount[], Error>({
    queryKey: userId ? userSocialAccountKeys.list(userId) : userSocialAccountKeys.list(''),
    queryFn: async () => {
      if (!userId) return [];
      return listUserSocialAccounts(userId);
    },
    enabled: !!userId,
  });
}

export function useCreateUserSocialAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<UserSocialAccount, Error, { platform: string; url: string }>({
    mutationFn: async (payload) => {
      if (!user?.id) throw new Error('User not authenticated');
      return createUserSocialAccount({ ...payload, user_id: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userSocialAccountKeys.list(user?.id ?? '') });
      toast.success('Social account added successfully!');
    },
    onError: (error) => {
      toast.error('Failed to add social account', { description: error.message });
    },
  });
}

export function useUpdateUserSocialAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<UserSocialAccount, Error, { id: string; payload: UserSocialAccountUpdate }>({
    mutationFn: async ({ id, payload }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return updateUserSocialAccount(id, payload);
    },
    onSuccess: (updatedAccount) => {
      queryClient.invalidateQueries({ queryKey: userSocialAccountKeys.list(user?.id ?? '') });
      queryClient.invalidateQueries({ queryKey: userSocialAccountKeys.detail(updatedAccount.id) });
      toast.success('Social account updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update social account', { description: error.message });
    },
  });
}

export function useDeleteUserSocialAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (!user?.id) throw new Error('User not authenticated');
      return deleteUserSocialAccount(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userSocialAccountKeys.list(user?.id ?? '') });
      toast.success('Social account removed successfully!');
    },
    onError: (error) => {
      toast.error('Failed to remove social account', { description: error.message });
    },
  });
}