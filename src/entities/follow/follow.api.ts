import { supabase } from '@/shared/api/supabase/supabaseClient';
import type { FollowListItem, FollowStats } from './follow.types';

type FollowersRpcRow = {
  follower_username: string | null;
  follower_display_name: string | null;
  follower_avatar_url: string | null;
  followed_at: string;
};

type FollowingRpcRow = {
  following_username: string | null;
  following_display_name: string | null;
  following_avatar_url: string | null;
  followed_at: string;
};

export async function listFollowers(username: string) {
  const { data, error } = await supabase.rpc('list_followers_by_username_secure', {
    p_target_username: username,
  });

  if (error) throw error;

  return ((data ?? []) as FollowersRpcRow[]).map((row) => ({
    username: row.follower_username ?? '',
    display_name: row.follower_display_name,
    avatar_url: row.follower_avatar_url,
    followed_at: row.followed_at,
  })) as FollowListItem[];
}

export async function listFollowing(username: string) {
  const { data, error } = await supabase.rpc('list_following_by_username_secure', {
    p_target_username: username,
  });

  if (error) throw error;

  return ((data ?? []) as FollowingRpcRow[]).map((row) => ({
    username: row.following_username ?? '',
    display_name: row.following_display_name,
    avatar_url: row.following_avatar_url,
    followed_at: row.followed_at,
  })) as FollowListItem[];
}

export async function isFollowing(targetUsername: string) {
  const { data, error } = await supabase.rpc('is_following_by_username_secure', {
    p_target_username: targetUsername,
  });

  if (error) throw error;
  return Boolean(data);
}

export async function followUser(targetUsername: string) {
  const { data, error } = await supabase.rpc('follow_by_username_secure', {
    p_target_username: targetUsername,
  });

  if (error) throw error;
  return data as string | null;
}

export async function unfollowUser(targetUsername: string) {
  const { data, error } = await supabase.rpc('unfollow_by_username_secure', {
    p_target_username: targetUsername,
  });

  if (error) throw error;
  return data ?? 0;
}

export async function getFollowStats(username: string): Promise<FollowStats> {
  const { data, error } = await supabase.rpc('get_follow_stats_by_username_secure', {
    p_target_username: username,
  });

  if (error) throw error;

  const stats = (data ?? [])[0];
  return {
    followersCount: stats?.followers_count ?? 0,
    followingCount: stats?.following_count ?? 0,
  };
}
