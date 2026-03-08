import type { Database } from '@/integrations/supabase/types';
import type { Profile } from '@/entities/profile/profile.types';

export type DirectMessage = Database['public']['Tables']['direct_messages']['Row'];
export type DirectMessageInsert = Database['public']['Tables']['direct_messages']['Insert'];
export type DirectMessageUpdate = Database['public']['Tables']['direct_messages']['Update'];

export type MessageProfile = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;

export interface DirectMessageWithProfiles extends DirectMessage {
  sender_profile?: MessageProfile | null;
  receiver_profile?: MessageProfile | null;
}

export interface ConversationSummary {
  partner: MessageProfile;
  lastMessage: DirectMessage;
  unreadCount: number;
}
