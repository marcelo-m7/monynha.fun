import { supabase } from '@/shared/api/supabase/supabaseClient';
import type { FollowStats, FollowUser } from './follow.types';

interface FollowStatsRpcRow {
  followers_count: number;
  following_count: number;
}

interface FollowerRpcRow {
  follower_avatar_url: string | null;
  follower_display_name: string | null;
  follower_username: string | null;
  followed_at: string;
}

interface FollowingRpcRow {
  followed_at: string;
  following_avatar_url: string | null;
  following_display_name: string | null;
  following_username: string | null;
}

export async function getFollowStatsByUsername(username: string) {
  const { data, error } = await supabase.rpc('get_follow_stats_by_username_secure', {
    p_target_username: username,
  });

  if (error) throw error;

  const row = ((data as FollowStatsRpcRow[] | null) || [])[0];
  if (!row) {
    return {
      followersCount: 0,
      followingCount: 0,
    } satisfies FollowStats;
  }

  return {
    followersCount: Number(row.followers_count || 0),
    followingCount: Number(row.following_count || 0),
  } satisfies FollowStats;
}

export async function isFollowingByUsername(username: string) {
  const { data, error } = await supabase.rpc('is_following_by_username_secure', {
    p_target_username: username,
  });

  if (error) throw error;
  return !!data;
}

export async function followByUsername(username: string) {
  const { data, error } = await supabase.rpc('follow_by_username_secure', {
    p_target_username: username,
  });

  if (error) throw error;
  return data;
}

export async function unfollowByUsername(username: string) {
  const { data, error } = await supabase.rpc('unfollow_by_username_secure', {
    p_target_username: username,
  });

  if (error) throw error;
  return Number(data || 0);
}

export async function listFollowersByUsername(username: string) {
  const { data, error } = await supabase.rpc('list_followers_by_username_secure', {
    p_target_username: username,
  });

  if (error) throw error;

  return ((data as FollowerRpcRow[] | null) || [])
    .filter((row) => !!row.follower_username)
    .map((row) => ({
      username: row.follower_username as string,
      displayName: row.follower_display_name,
      avatarUrl: row.follower_avatar_url,
      followedAt: row.followed_at,
    })) satisfies FollowUser[];
}

export async function listFollowingByUsername(username: string) {
  const { data, error } = await supabase.rpc('list_following_by_username_secure', {
    p_target_username: username,
  });

  if (error) throw error;

  return ((data as FollowingRpcRow[] | null) || [])
    .filter((row) => !!row.following_username)
    .map((row) => ({
      username: row.following_username as string,
      displayName: row.following_display_name,
      avatarUrl: row.following_avatar_url,
      followedAt: row.followed_at,
    })) satisfies FollowUser[];
}
