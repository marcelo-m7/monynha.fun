import { supabase } from '@/shared/api/supabase/supabaseClient';
import type {
  ConversationSummary,
  DirectMessage,
  DirectMessageWithProfiles,
  MessageProfile,
} from './direct_message.types';

export async function listConversation(currentUserId: string, otherUserId: string) {
  const { data, error } = await supabase
    .from('direct_messages')
    .select(
      `
      *,
      sender_profile:profiles!direct_messages_sender_id_fkey(id, username, display_name, avatar_url),
      receiver_profile:profiles!direct_messages_receiver_id_fkey(id, username, display_name, avatar_url)
    `,
    )
    .or(
      `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`,
    )
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as DirectMessageWithProfiles[];
}

export async function sendDirectMessage(senderId: string, receiverId: string, content: string) {
  const { data, error } = await supabase
    .from('direct_messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, content: content.trim() })
    .select()
    .single();

  if (error) throw error;
  return data as DirectMessage;
}

export async function markConversationAsRead(currentUserId: string, otherUserId: string) {
  const { error } = await supabase
    .from('direct_messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('receiver_id', currentUserId)
    .eq('sender_id', otherUserId)
    .eq('is_read', false);

  if (error) throw error;
}

export async function getUnreadMessagesCount(userId: string) {
  const { count, error } = await supabase
    .from('direct_messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

export async function listInboxConversations(userId: string): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from('direct_messages')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) throw error;

  const messages = (data || []) as DirectMessage[];
  const byPartner = new Map<string, { lastMessage: DirectMessage; unreadCount: number }>();

  for (const message of messages) {
    const partnerId = message.sender_id === userId ? message.receiver_id : message.sender_id;
    const current = byPartner.get(partnerId);

    if (!current) {
      byPartner.set(partnerId, {
        lastMessage: message,
        unreadCount: message.receiver_id === userId && !message.is_read ? 1 : 0,
      });
    } else if (message.receiver_id === userId && !message.is_read) {
      current.unreadCount += 1;
    }
  }

  const partnerIds = [...byPartner.keys()];
  if (partnerIds.length === 0) return [];

  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', partnerIds);

  if (profilesError) throw profilesError;

  const profiles = (profilesData || []) as MessageProfile[];
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return partnerIds
    .map((partnerId) => {
      const convo = byPartner.get(partnerId);
      const partner = profileMap.get(partnerId);
      if (!convo || !partner) return null;

      return {
        partner,
        lastMessage: convo.lastMessage,
        unreadCount: convo.unreadCount,
      } as ConversationSummary;
    })
    .filter((item): item is ConversationSummary => Boolean(item))
    .sort((a, b) =>
      new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime(),
    );
}
