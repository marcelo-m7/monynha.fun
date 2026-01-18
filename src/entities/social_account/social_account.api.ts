import { supabase } from '@/shared/api/supabase/supabaseClient';
import type { UserSocialAccount, UserSocialAccountInsert, UserSocialAccountUpdate } from './social_account.types';

export async function listUserSocialAccounts(userId: string) {
  const { data, error } = await supabase
    .from('user_social_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('platform', { ascending: true });

  if (error) throw error;
  return data as UserSocialAccount[];
}

export async function addSocialAccount(payload: UserSocialAccountInsert) {
  const { data, error } = await supabase
    .from('user_social_accounts')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as UserSocialAccount;
}

export async function updateSocialAccount(socialAccountId: string, payload: UserSocialAccountUpdate) {
  const { data, error } = await supabase
    .from('user_social_accounts')
    .update(payload)
    .eq('id', socialAccountId)
    .select()
    .single();

  if (error) throw error;
  return data as UserSocialAccount;
}

export async function deleteSocialAccount(socialAccountId: string) {
  const { error } = await supabase
    .from('user_social_accounts')
    .delete()
    .eq('id', socialAccountId);

  if (error) throw error;
}