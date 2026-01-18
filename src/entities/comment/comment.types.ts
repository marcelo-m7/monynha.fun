import type { Database } from '@/integrations/supabase/types';
import type { Profile } from '@/entities/profile/profile.types';

export type Comment = Database['public']['Tables']['comments']['Row'] & {
  profile?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
};
export type CommentInsert = Database['public']['Tables']['comments']['Insert'];
export type CommentUpdate = Database['public']['Tables']['comments']['Update'];