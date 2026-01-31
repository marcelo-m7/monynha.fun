import type { Database } from '@/integrations/supabase/types';

export type UserSocialAccount = Database['public']['Tables']['user_social_accounts']['Row'];
export type UserSocialAccountInsert = Database['public']['Tables']['user_social_accounts']['Insert'];
export type UserSocialAccountUpdate = Database['public']['Tables']['user_social_accounts']['Update'];
