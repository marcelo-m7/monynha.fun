import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getConversationByUsername,
  getUnreadMessagesCount,
  listInboxConversations,
  markConversationAsReadByUsername,
  sendDirectMessageByUsername,
} from './direct_message.api';

const rpcMock = vi.fn();

vi.mock('@/shared/api/supabase/supabaseClient', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

describe('direct message API', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('lists inbox conversations through the secure RPC', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          partner_username: 'monynha',
          partner_display_name: 'Monynha',
          partner_avatar_url: null,
          last_message_id: 'message-1',
          last_message_content: 'Oi!',
          last_message_created_at: '2026-06-05T10:00:00Z',
          last_message_is_read: false,
          last_message_sender_username: 'monynha',
          unread_count: 2,
        },
      ],
      error: null,
    });

    await expect(listInboxConversations()).resolves.toEqual([
      {
        partnerUsername: 'monynha',
        partnerDisplayName: 'Monynha',
        partnerAvatarUrl: null,
        lastMessageId: 'message-1',
        lastMessageContent: 'Oi!',
        lastMessageCreatedAt: '2026-06-05T10:00:00Z',
        lastMessageIsRead: false,
        lastMessageSenderUsername: 'monynha',
        unreadCount: 2,
      },
    ]);
    expect(rpcMock).toHaveBeenCalledWith('list_inbox_conversations_secure');
  });

  it('loads a conversation by username through the secure RPC', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          id: 'message-1',
          content: 'Vamos curar esse vídeo?',
          created_at: '2026-06-05T10:00:00Z',
          is_mine: false,
          is_read: false,
          receiver_avatar_url: null,
          receiver_display_name: 'Eu',
          receiver_username: 'me',
          sender_avatar_url: null,
          sender_display_name: 'Monynha',
          sender_username: 'monynha',
        },
      ],
      error: null,
    });

    const messages = await getConversationByUsername('monynha');

    expect(rpcMock).toHaveBeenCalledWith('get_conversation_by_username_secure', {
      p_other_username: 'monynha',
    });
    expect(messages[0]).toMatchObject({
      id: 'message-1',
      content: 'Vamos curar esse vídeo?',
      isMine: false,
      isRead: false,
      senderUsername: 'monynha',
    });
  });

  it('sends trimmed content through the secure RPC', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          id: 'message-2',
          content: 'Olá',
          created_at: '2026-06-05T10:01:00Z',
          is_mine: true,
          is_read: false,
          receiver_username: 'monynha',
          sender_username: 'me',
        },
      ],
      error: null,
    });

    const message = await sendDirectMessageByUsername(' monynha ', '  Olá  ');

    expect(rpcMock).toHaveBeenCalledWith('send_direct_message_by_username_secure', {
      p_receiver_username: 'monynha',
      p_content: 'Olá',
    });
    expect(message).toMatchObject({
      id: 'message-2',
      content: 'Olá',
      isMine: true,
      receiverUsername: 'monynha',
    });
  });

  it('rejects empty outbound content before calling Supabase', async () => {
    await expect(sendDirectMessageByUsername('monynha', '   ')).rejects.toThrow('Message content cannot be empty');
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('marks a conversation as read through the secure RPC', async () => {
    rpcMock.mockResolvedValue({ data: 3, error: null });

    await expect(markConversationAsReadByUsername('monynha')).resolves.toBe(3);
    expect(rpcMock).toHaveBeenCalledWith('mark_conversation_as_read_by_username_secure', {
      p_other_username: 'monynha',
    });
  });

  it('gets unread count through the secure RPC instead of direct table access', async () => {
    rpcMock.mockResolvedValue({ data: 7, error: null });

    await expect(getUnreadMessagesCount()).resolves.toBe(7);
    expect(rpcMock).toHaveBeenCalledWith('get_unread_messages_count_secure');
  });
});
