import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notify } from '@/shared/lib/notify';
import { useAuth } from '@/features/auth/useAuth';
import i18n from '@/i18n/config';
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
      if (!user?.id) throw new Error(i18n.t('profile.social.error.notLoggedIn'));
      return createUserSocialAccount({ ...payload, user_id: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userSocialAccountKeys.list(user?.id ?? '') });
      notify.success(i18n.t('profile.social.feedback.addSuccess'));
    },
    onError: (error) => {
      notify.error(i18n.t('profile.social.feedback.addError'), { description: error.message });
    },
  });
}

export function useUpdateUserSocialAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<UserSocialAccount, Error, { id: string; payload: UserSocialAccountUpdate }>({
    mutationFn: async ({ id, payload }) => {
      if (!user?.id) throw new Error(i18n.t('profile.social.error.notLoggedIn'));
      return updateUserSocialAccount(id, payload);
    },
    onSuccess: (updatedAccount) => {
      queryClient.invalidateQueries({ queryKey: userSocialAccountKeys.list(user?.id ?? '') });
      queryClient.invalidateQueries({ queryKey: userSocialAccountKeys.detail(updatedAccount.id) });
      notify.success(i18n.t('profile.social.feedback.updateSuccess'));
    },
    onError: (error) => {
      notify.error(i18n.t('profile.social.feedback.updateError'), { description: error.message });
    },
  });
}

export function useDeleteUserSocialAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (!user?.id) throw new Error(i18n.t('profile.social.error.notLoggedIn'));
      return deleteUserSocialAccount(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userSocialAccountKeys.list(user?.id ?? '') });
      notify.success(i18n.t('profile.social.feedback.removeSuccess'));
    },
    onError: (error) => {
      notify.error(i18n.t('profile.social.feedback.removeError'), { description: error.message });
    },
  });
}