import { supabase } from '@/shared/api/supabase/supabaseClient';
import { AuthResponse } from '@supabase/supabase-js';

export async function signUpWithEmail(email: string, password: string, username?: string) {
  const redirectUrl = `${window.location.origin}/auth/verify-email`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        username: username || email.split('@')[0],
      },
    },
  });

  return { data, error: error as Error | null };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error: error as Error | null };
}

export async function signOutUser() {
  await supabase.auth.signOut();
}

export async function requestPasswordReset(email: string, redirectTo?: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo ?? `${window.location.origin}/auth?reset=true`,
  });

  return { error: error as Error | null };
}

export async function updateUserPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error as Error | null };
}

export async function updateUserEmail(newEmail: string, redirectTo?: string) {
  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: redirectTo ?? `${window.location.origin}/auth` }
  );
  return { error: error as Error | null };
}

export async function reauthenticateUser(email: string, password: string) {
  // Re-authenticate by signing in with current credentials
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error as Error | null };
}

export async function resendConfirmationEmail(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
    },
  });
  return { error: error as Error | null };
}

export async function deleteUserAccount() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: new Error('No user found') };
  }

  // Note: Supabase's admin.deleteUser requires admin privileges
  // For self-service deletion, we use the auth.admin API or a custom edge function
  // This implementation assumes you have RLS policies that cascade delete user data
  
  const { error } = await supabase.rpc('delete_user_account');
  
  return { error: error as Error | null };
}