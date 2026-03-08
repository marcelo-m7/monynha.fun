import { supabase } from '@/shared/api/supabase/supabaseClient';
import type {
  ConversationMessage,
  ConversationSummary,
  MessageProfile,
  SentMessage,
} from './direct_message.types';

export async function listConversation(otherUsername: string) {
  const { data, error } = await supabase.rpc('get_conversation_by_username_secure', {
    p_other_username: otherUsername,
  });

  if (error) throw error;
  return (data || []) as ConversationMessage[];
}

export async function sendDirectMessage(receiverUsername: string, content: string) {
  const { data, error } = await supabase.rpc('send_direct_message_by_username_secure', {
    p_receiver_username: receiverUsername,
    p_content: content.trim(),
  });

  if (error) throw error;
  const [sent] = (data || []) as SentMessage[];
  if (!sent) throw new Error('Message send failed.');
  return sent;
}

export async function markConversationAsRead(otherUsername: string) {
  const { error } = await supabase.rpc('mark_conversation_as_read_by_username_secure', {
    p_other_username: otherUsername,
  });

  if (error) throw error;
}

export async function getUnreadMessagesCount() {
  const { data, error } = await supabase.rpc('get_unread_messages_count_secure');

  if (error) throw error;
  return data || 0;
}

export async function listInboxConversations(): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc('list_inbox_conversations_secure');

  if (error) throw error;

  return ((data || []) as Array<{
    partner_username: string | null;
    partner_display_name: string | null;
    partner_avatar_url: string | null;
    last_message_id: string;
    last_message_content: string;
    last_message_created_at: string;
    last_message_is_read: boolean;
    last_message_sender_username: string | null;
    unread_count: number;
  }>)
    .filter((item) => Boolean(item.partner_username))
    .map((item) => ({
      partner: {
        username: item.partner_username as string,
        display_name: item.partner_display_name,
        avatar_url: item.partner_avatar_url,
      } as MessageProfile,
      lastMessage: {
        id: item.last_message_id,
        content: item.last_message_content,
        created_at: item.last_message_created_at,
        is_read: item.last_message_is_read,
        sender_username: item.last_message_sender_username,
      },
      unreadCount: Number(item.unread_count || 0),
    }));
}
