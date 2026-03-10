import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  followByUsername,
  getFollowStatsByUsername,
  isFollowingByUsername,
  listFollowersByUsername,
  listFollowingByUsername,
  unfollowByUsername,
} from '@/entities/follow/follow.api';
import { followKeys } from '@/entities/follow/follow.keys';
import type { FollowStats, FollowUser } from '@/entities/follow/follow.types';
import { useAuth } from '@/features/auth/useAuth';

export function useFollowStats(username: string | undefined) {
  return useQuery<FollowStats, Error>({
    queryKey: followKeys.stats(username || ''),
    queryFn: async () => {
      if (!username) {
        return { followersCount: 0, followingCount: 0 };
      }
      return getFollowStatsByUsername(username);
    },
    enabled: !!username,
  });
}

export function useIsFollowing(username: string | undefined) {
  const { user } = useAuth();

  return useQuery<boolean, Error>({
    queryKey: followKeys.status(username || ''),
    queryFn: async () => {
      if (!user || !username) return false;
      return isFollowingByUsername(username);
    },
    enabled: !!user && !!username,
  });
}

export function useFollowers(username: string | undefined) {
  return useQuery<FollowUser[], Error>({
    queryKey: followKeys.followers(username || ''),
    queryFn: async () => {
      if (!username) return [];
      return listFollowersByUsername(username);
    },
    enabled: !!username,
  });
}

export function useFollowing(username: string | undefined) {
  return useQuery<FollowUser[], Error>({
    queryKey: followKeys.following(username || ''),
    queryFn: async () => {
      if (!username) return [];
      return listFollowingByUsername(username);
    },
    enabled: !!username,
  });
}

export function useFollowByUsername() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, { targetUsername: string; currentUsername?: string }>({
    mutationFn: ({ targetUsername }) => followByUsername(targetUsername),
    onSuccess: (_, variables) => {
      toast.success('Agora voce esta seguindo este perfil.');
      queryClient.invalidateQueries({ queryKey: followKeys.status(variables.targetUsername) });
      queryClient.invalidateQueries({ queryKey: followKeys.stats(variables.targetUsername) });
      queryClient.invalidateQueries({ queryKey: followKeys.followers(variables.targetUsername) });
      if (variables.currentUsername) {
        queryClient.invalidateQueries({ queryKey: followKeys.stats(variables.currentUsername) });
        queryClient.invalidateQueries({ queryKey: followKeys.following(variables.currentUsername) });
      }
    },
    onError: (error) => {
      toast.error('Nao foi possivel seguir este perfil.', { description: error.message });
    },
  });
}

export function useUnfollowByUsername() {
  const queryClient = useQueryClient();

  return useMutation<number, Error, { targetUsername: string; currentUsername?: string }>({
    mutationFn: ({ targetUsername }) => unfollowByUsername(targetUsername),
    onSuccess: (_, variables) => {
      toast.success('Voce deixou de seguir este perfil.');
      queryClient.invalidateQueries({ queryKey: followKeys.status(variables.targetUsername) });
      queryClient.invalidateQueries({ queryKey: followKeys.stats(variables.targetUsername) });
      queryClient.invalidateQueries({ queryKey: followKeys.followers(variables.targetUsername) });
      if (variables.currentUsername) {
        queryClient.invalidateQueries({ queryKey: followKeys.stats(variables.currentUsername) });
        queryClient.invalidateQueries({ queryKey: followKeys.following(variables.currentUsername) });
      }
    },
    onError: (error) => {
      toast.error('Nao foi possivel deixar de seguir este perfil.', { description: error.message });
    },
  });
}
