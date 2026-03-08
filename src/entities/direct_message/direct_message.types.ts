export interface MessageProfile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ConversationMessage {
  id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_username: string | null;
  sender_display_name: string | null;
  sender_avatar_url: string | null;
  receiver_username: string | null;
  receiver_display_name: string | null;
  receiver_avatar_url: string | null;
  is_mine: boolean;
}

export interface SentMessage {
  id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_username: string | null;
  receiver_username: string | null;
  is_mine: boolean;
}

export interface ConversationSummary {
  partner: MessageProfile;
  lastMessage: {
    id: string;
    content: string;
    created_at: string;
    is_read: boolean;
    sender_username: string | null;
  };
  unreadCount: number;
}
