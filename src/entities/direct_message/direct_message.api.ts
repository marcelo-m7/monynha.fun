import { supabase } from '@/shared/api/supabase/supabaseClient';
import type { ConversationSummary, DirectMessage } from './direct_message.types';

interface ConversationRpcRow {
  content: string;
  created_at: string;
  id: string;
  is_mine: boolean;
  is_read: boolean;
  receiver_avatar_url: string | null;
  receiver_display_name: string | null;
  receiver_username: string | null;
  sender_avatar_url: string | null;
  sender_display_name: string | null;
  sender_username: string | null;
}

interface InboxRpcRow {
  last_message_content: string;
  last_message_created_at: string;
  last_message_id: string;
  last_message_is_read: boolean;
  last_message_sender_username: string | null;
  partner_avatar_url: string | null;
  partner_display_name: string | null;
  partner_username: string | null;
  unread_count: number;
}

interface SendMessageRpcRow {
  content: string;
  created_at: string;
  id: string;
  is_mine: boolean;
  is_read: boolean;
  receiver_username: string | null;
  sender_username: string | null;
}

function mapConversationRow(row: ConversationRpcRow): DirectMessage {
  return {
    id: row.id,
    content: row.content,
    isRead: row.is_read,
    createdAt: row.created_at,
    senderUsername: row.sender_username,
    senderDisplayName: row.sender_display_name,
    senderAvatarUrl: row.sender_avatar_url,
    receiverUsername: row.receiver_username,
    receiverDisplayName: row.receiver_display_name,
    receiverAvatarUrl: row.receiver_avatar_url,
    isMine: row.is_mine,
  };
}

export async function listInboxConversations() {
  const { data, error } = await supabase.rpc('list_inbox_conversations_secure');

  if (error) throw error;

  return ((data as InboxRpcRow[] | null) || [])
    .filter((row) => !!row.partner_username)
    .map((row) => ({
      partnerUsername: row.partner_username as string,
      partnerDisplayName: row.partner_display_name,
      partnerAvatarUrl: row.partner_avatar_url,
      lastMessageId: row.last_message_id,
      lastMessageContent: row.last_message_content,
      lastMessageCreatedAt: row.last_message_created_at,
      lastMessageIsRead: row.last_message_is_read,
      lastMessageSenderUsername: row.last_message_sender_username,
      unreadCount: Number(row.unread_count || 0),
    })) satisfies ConversationSummary[];
}

export async function getConversationByUsername(otherUsername: string) {
  const { data, error } = await supabase.rpc('get_conversation_by_username_secure', {
    p_other_username: otherUsername,
  });

  if (error) throw error;

  return ((data as ConversationRpcRow[] | null) || []).map(mapConversationRow) satisfies DirectMessage[];
}

export async function sendDirectMessageByUsername(receiverUsername: string, content: string) {
  const { data, error } = await supabase.rpc('send_direct_message_by_username_secure', {
    p_receiver_username: receiverUsername,
    p_content: content,
  });

  if (error) throw error;

  const row = ((data as SendMessageRpcRow[] | null) || [])[0];
  if (!row) {
    throw new Error('Failed to send message');
  }

  return {
    id: row.id,
    content: row.content,
    isRead: row.is_read,
    createdAt: row.created_at,
    senderUsername: row.sender_username,
    senderDisplayName: null,
    senderAvatarUrl: null,
    receiverUsername: row.receiver_username,
    receiverDisplayName: null,
    receiverAvatarUrl: null,
    isMine: row.is_mine,
  } satisfies DirectMessage;
}

export async function markConversationAsReadByUsername(otherUsername: string) {
  const { data, error } = await supabase.rpc('mark_conversation_as_read_by_username_secure', {
    p_other_username: otherUsername,
  });

  if (error) throw error;
  return Number(data || 0);
}

export async function getUnreadMessagesCount() {
  const { data, error } = await supabase.rpc('get_unread_messages_count_secure');

  if (error) throw error;
  return Number(data || 0);
}
