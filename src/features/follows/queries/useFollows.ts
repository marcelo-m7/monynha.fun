import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/useAuth';
import { followKeys } from '@/entities/follow/follow.keys';
import {
  followUser,
  getFollowStats,
  isFollowing,
  listFollowers,
  listFollowing,
  unfollowUser,
} from '@/entities/follow/follow.api';
import type { FollowStats, FollowWithProfile } from '@/entities/follow/follow.types';

export function useFollowers(userId: string | undefined) {
  return useQuery<FollowWithProfile[], Error>({
    queryKey: userId ? followKeys.followers(userId) : followKeys.followers(''),
    queryFn: async () => {
      if (!userId) return [];
      return listFollowers(userId);
    },
    enabled: !!userId,
  });
}

export function useFollowing(userId: string | undefined) {
  return useQuery<FollowWithProfile[], Error>({
    queryKey: userId ? followKeys.following(userId) : followKeys.following(''),
    queryFn: async () => {
      if (!userId) return [];
      return listFollowing(userId);
    },
    enabled: !!userId,
  });
}

export function useFollowStatus(targetUserId: string | undefined) {
  const { user } = useAuth();

  return useQuery<boolean, Error>({
    queryKey: user?.id && targetUserId ? followKeys.status(user.id, targetUserId) : followKeys.status('', ''),
    queryFn: async () => {
      if (!user?.id || !targetUserId || user.id === targetUserId) return false;
      return isFollowing(user.id, targetUserId);
    },
    enabled: !!user?.id && !!targetUserId && user.id !== targetUserId,
  });
}

export function useFollowStats(userId: string | undefined) {
  return useQuery<FollowStats, Error>({
    queryKey: userId ? followKeys.stats(userId) : followKeys.stats(''),
    queryFn: async () => {
      if (!userId) return { followersCount: 0, followingCount: 0 };
      return getFollowStats(userId);
    },
    enabled: !!userId,
  });
}

export function useFollowUser() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user?.id) throw new Error('You must be logged in to follow users.');
      return followUser(user.id, targetUserId);
    },
    onSuccess: (_, targetUserId) => {
      if (!user?.id) return;
      queryClient.invalidateQueries({ queryKey: followKeys.status(user.id, targetUserId) });
      queryClient.invalidateQueries({ queryKey: followKeys.stats(targetUserId) });
      queryClient.invalidateQueries({ queryKey: followKeys.stats(user.id) });
      queryClient.invalidateQueries({ queryKey: followKeys.followers(targetUserId) });
      queryClient.invalidateQueries({ queryKey: followKeys.following(user.id) });
      toast.success('Now following user.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Could not follow user.');
    },
  });
}

export function useUnfollowUser() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user?.id) throw new Error('You must be logged in to unfollow users.');
      return unfollowUser(user.id, targetUserId);
    },
    onSuccess: (_, targetUserId) => {
      if (!user?.id) return;
      queryClient.invalidateQueries({ queryKey: followKeys.status(user.id, targetUserId) });
      queryClient.invalidateQueries({ queryKey: followKeys.stats(targetUserId) });
      queryClient.invalidateQueries({ queryKey: followKeys.stats(user.id) });
      queryClient.invalidateQueries({ queryKey: followKeys.followers(targetUserId) });
      queryClient.invalidateQueries({ queryKey: followKeys.following(user.id) });
      toast.success('Unfollowed user.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Could not unfollow user.');
    },
  });
}
