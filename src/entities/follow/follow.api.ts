import { supabase } from '@/shared/api/supabase/supabaseClient';
import type { Follow, FollowWithProfile, FollowStats } from './follow.types';

export async function listFollowers(userId: string) {
  const { data, error } = await supabase
    .from('user_follows')
    .select('*, follower:profiles!user_follows_follower_id_fkey(id, username, display_name, avatar_url)')
    .eq('following_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as FollowWithProfile[];
}

export async function listFollowing(userId: string) {
  const { data, error } = await supabase
    .from('user_follows')
    .select('*, following:profiles!user_follows_following_id_fkey(id, username, display_name, avatar_url)')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as FollowWithProfile[];
}

export async function isFollowing(followerId: string, followingId: string) {
  const { data, error } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function followUser(followerId: string, followingId: string) {
  const { data, error } = await supabase
    .from('user_follows')
    .insert({ follower_id: followerId, following_id: followingId })
    .select()
    .single();

  if (error) throw error;
  return data as Follow;
}

export async function unfollowUser(followerId: string, followingId: string) {
  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) throw error;
}

export async function getFollowStats(userId: string): Promise<FollowStats> {
  const [followersResult, followingResult] = await Promise.all([
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);

  if (followersResult.error) throw followersResult.error;
  if (followingResult.error) throw followingResult.error;

  return {
    followersCount: followersResult.count || 0,
    followingCount: followingResult.count || 0,
  };
}
