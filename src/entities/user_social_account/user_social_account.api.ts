import { supabase } from '@/shared/api/supabase/supabaseClient';
import type { UserSocialAccount, UserSocialAccountInsert, UserSocialAccountUpdate } from './user_social_account.types';

export async function listUserSocialAccounts(userId: string) {
  const { data, error } = await supabase
    .from('user_social_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('platform', { ascending: true });

  if (error) throw error;
  return data as UserSocialAccount[];
}

export async function createUserSocialAccount(payload: UserSocialAccountInsert) {
  const { data, error } = await supabase
    .from('user_social_accounts')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as UserSocialAccount;
}

export async function updateUserSocialAccount(id: string, payload: UserSocialAccountUpdate) {
  const { data, error } = await supabase
    .from('user_social_accounts')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as UserSocialAccount;
}

export async function deleteUserSocialAccount(id: string) {
  const { error } = await supabase
    .from('user_social_accounts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}