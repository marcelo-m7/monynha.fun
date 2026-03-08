import type { Database } from '@/integrations/supabase/types';
import type { Profile } from '@/entities/profile/profile.types';

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

export type NotificationActor = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;

export interface NotificationWithActor extends Notification {
  actor?: NotificationActor | null;
}
