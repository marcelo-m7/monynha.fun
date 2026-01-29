import { supabase } from '@/shared/api/supabase/supabaseClient';

export async function signUpWithEmail(email: string, password: string, username?: string) {
  const redirectUrl = `${window.location.origin}/`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        username: username || email.split('@')[0],
      },
    },
  });

  return { error: error as Error | null };
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error as Error | null };
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
