import { supabase } from '@/shared/api/supabase/supabaseClient';
import type { Profile, ProfileUpdate } from './profile.types';

export async function getProfileById(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*, avatar_path').eq('id', userId).single();
  if (error) throw error;
  return data as Profile;
}

export async function getProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, avatar_path')
    .eq('username', username)
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function findProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, avatar_path') // Added display_name and avatar_url
    .eq('username', username)
    .maybeSingle();

  if (error) throw error;
  return data as Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'avatar_path'> | null;
}

export async function updateProfile(userId: string, updates: ProfileUpdate) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function getContributorCount() {
  const { count, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

export async function listProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, submissions_count')
    .order('submissions_count', { ascending: false }) // Order by submissions count
    .order('username', { ascending: true }); // Then by username

  if (error) throw error;
  return data as Profile[];
}

export async function searchProfiles(query: string, limit = 10) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchQuery = query.trim().toLowerCase();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
    .limit(limit);

  if (error) throw error;
  return data as Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>[];
}