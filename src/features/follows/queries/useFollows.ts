import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/useAuth';
import { followKeys } from '@/entities/follow/follow.keys';
import { supabase } from '@/shared/api/supabase/supabaseClient';
import {
  followUser,
  getFollowStats,
  isFollowing,
  listFollowers,
  listFollowing,
  unfollowUser,
} from '@/entities/follow/follow.api';
import type { FollowListItem, FollowStats } from '@/entities/follow/follow.types';

export function useFollowers(username: string | undefined) {
  return useQuery<FollowListItem[], Error>({
    queryKey: username ? followKeys.followers(username) : followKeys.followers(''),
    queryFn: async () => {
      if (!username) return [];
      return listFollowers(username);
    },
    enabled: !!username,
  });
}

export function useFollowing(username: string | undefined) {
  return useQuery<FollowListItem[], Error>({
    queryKey: username ? followKeys.following(username) : followKeys.following(''),
    queryFn: async () => {
      if (!username) return [];
      return listFollowing(username);
    },
    enabled: !!username,
  });
}

export function useFollowStatus(targetUsername: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id || !targetUsername) return;

    const channel = supabase
      .channel(`follow-status-${user.id}-${targetUsername}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_follows',
          filter: `follower_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: followKeys.status(targetUsername) });
          queryClient.invalidateQueries({ queryKey: followKeys.stats(targetUsername) });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, targetUsername, user?.id]);

  return useQuery<boolean, Error>({
    queryKey: targetUsername ? followKeys.status(targetUsername) : followKeys.status(''),
    queryFn: async () => {
      if (!user?.id || !targetUsername) return false;
      return isFollowing(targetUsername);
    },
    enabled: !!user?.id && !!targetUsername,
  });
}

export function useFollowStats(username: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!username) return;

    const channel = supabase
      .channel(`follow-stats-${username}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_follows',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: followKeys.stats(username) });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, username]);

  return useQuery<FollowStats, Error>({
    queryKey: username ? followKeys.stats(username) : followKeys.stats(''),
    queryFn: async () => {
      if (!username) return { followersCount: 0, followingCount: 0 };
      return getFollowStats(username);
    },
    enabled: !!username,
  });
}

export function useFollowUser() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUsername: string) => {
      if (!user?.id) throw new Error('You must be logged in to follow users.');
      return followUser(targetUsername);
    },
    onSuccess: (_, targetUsername) => {
      queryClient.invalidateQueries({ queryKey: followKeys.status(targetUsername) });
      queryClient.invalidateQueries({ queryKey: followKeys.stats(targetUsername) });
      queryClient.invalidateQueries({ queryKey: followKeys.followers(targetUsername) });
      queryClient.invalidateQueries({ queryKey: followKeys.all });
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
    mutationFn: async (targetUsername: string) => {
      if (!user?.id) throw new Error('You must be logged in to unfollow users.');
      return unfollowUser(targetUsername);
    },
    onSuccess: (_, targetUsername) => {
      queryClient.invalidateQueries({ queryKey: followKeys.status(targetUsername) });
      queryClient.invalidateQueries({ queryKey: followKeys.stats(targetUsername) });
      queryClient.invalidateQueries({ queryKey: followKeys.followers(targetUsername) });
      queryClient.invalidateQueries({ queryKey: followKeys.all });
      toast.success('Unfollowed user.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Could not unfollow user.');
    },
  });
}
