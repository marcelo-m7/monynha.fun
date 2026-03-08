import type { Database } from '@/integrations/supabase/types';
import type { Profile } from '@/entities/profile/profile.types';

export type Follow = Database['public']['Tables']['user_follows']['Row'];
export type FollowInsert = Database['public']['Tables']['user_follows']['Insert'];
export type FollowUpdate = Database['public']['Tables']['user_follows']['Update'];

export type FollowProfile = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;

export interface FollowWithProfile extends Follow {
  follower?: FollowProfile | null;
  following?: FollowProfile | null;
}

export interface FollowStats {
  followersCount: number;
  followingCount: number;
}
