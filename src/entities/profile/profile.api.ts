import { supabase } from '@/shared/api/supabase/supabaseClient';
import type { Profile, ProfileUpdate } from './profile.types';

export async function getProfileById(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data as Profile;
}

export async function getProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function findProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', username)
    .maybeSingle();

  if (error) throw error;
  return data as Pick<Profile, 'id' | 'username'> | null;
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
