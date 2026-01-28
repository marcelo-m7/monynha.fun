import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/useAuth';
import { getContributorCount, getProfileById, getProfileByUsername, updateProfile, listProfiles } from '@/entities/profile/profile.api';
import { profileKeys } from '@/entities/profile/profile.keys';
import type { Profile } from '@/entities/profile/profile.types';

export function useProfileById(userId: string | undefined) {
  return useQuery<Profile, Error>({
    queryKey: userId ? profileKeys.detail(userId) : profileKeys.detail(''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      return getProfileById(userId);
    },
    enabled: !!userId,
  });
}

export function useProfileByUsername(username: string | undefined) {
  return useQuery<Profile, Error>({
    queryKey: username ? profileKeys.byUsername(username) : profileKeys.byUsername(''),
    queryFn: async () => {
      if (!username) throw new Error('Username is required');
      return getProfileByUsername(username);
    },
    enabled: !!username,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<Profile, Error, Partial<Omit<Profile, 'id' | 'created_at' | 'submissions_count'>>>({
    mutationFn: async (updatedProfileData) => {
      if (!user) throw new Error('User not authenticated');
      return updateProfile(user.id, updatedProfileData);
    },
    onSuccess: (updatedProfile) => {
      toast.success('Perfil atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(user?.id ?? '') });
      if (updatedProfile.username) {
        queryClient.invalidateQueries({ queryKey: profileKeys.byUsername(updatedProfile.username) });
      }
    },
    onError: (error) => {
      toast.error('Erro ao atualizar perfil', { description: error.message });
    },
  });
}

export function useContributorCount() {
  return useQuery<number, Error>({
    queryKey: profileKeys.contributorCount(),
    queryFn: () => getContributorCount(),
  });
}

export function useProfiles() {
  return useQuery<Profile[], Error>({
    queryKey: profileKeys.list(),
    queryFn: () => listProfiles(),
  });
}