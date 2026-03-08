import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/useAuth';
import { directMessageKeys } from '@/entities/direct_message/direct_message.keys';
import {
  getUnreadMessagesCount,
  listConversation,
  listInboxConversations,
  markConversationAsRead,
  sendDirectMessage,
} from '@/entities/direct_message/direct_message.api';
import type {
  ConversationSummary,
  DirectMessage,
  DirectMessageWithProfiles,
} from '@/entities/direct_message/direct_message.types';

export function useInboxConversations() {
  const { user } = useAuth();

  return useQuery<ConversationSummary[], Error>({
    queryKey: user?.id ? directMessageKeys.inbox(user.id) : directMessageKeys.inbox(''),
    queryFn: async () => {
      if (!user?.id) return [];
      return listInboxConversations(user.id);
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });
}

export function useConversation(otherUserId: string | undefined) {
  const { user } = useAuth();

  return useQuery<DirectMessageWithProfiles[], Error>({
    queryKey:
      user?.id && otherUserId
        ? directMessageKeys.conversation(user.id, otherUserId)
        : directMessageKeys.conversation('', ''),
    queryFn: async () => {
      if (!user?.id || !otherUserId) return [];
      return listConversation(user.id, otherUserId);
    },
    enabled: !!user?.id && !!otherUserId,
    refetchInterval: 10000,
  });
}

export function useUnreadMessagesCount() {
  const { user } = useAuth();

  return useQuery<number, Error>({
    queryKey: user?.id ? directMessageKeys.unreadCount(user.id) : directMessageKeys.unreadCount(''),
    queryFn: async () => {
      if (!user?.id) return 0;
      return getUnreadMessagesCount(user.id);
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<DirectMessage, Error, { receiverId: string; content: string }>({
    mutationFn: async ({ receiverId, content }) => {
      if (!user?.id) throw new Error('You must be logged in to send a message.');
      return sendDirectMessage(user.id, receiverId, content);
    },
    onSuccess: (_, variables) => {
      if (!user?.id) return;
      queryClient.invalidateQueries({ queryKey: directMessageKeys.conversation(user.id, variables.receiverId) });
      queryClient.invalidateQueries({ queryKey: directMessageKeys.inbox(user.id) });
      toast.success('Message sent.');
    },
    onError: (error) => {
      toast.error(error.message || 'Could not send message.');
    },
  });
}

export function useMarkConversationAsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { otherUserId: string }>({
    mutationFn: async ({ otherUserId }) => {
      if (!user?.id) throw new Error('You must be logged in to update messages.');
      return markConversationAsRead(user.id, otherUserId);
    },
    onSuccess: (_, { otherUserId }) => {
      if (!user?.id) return;
      queryClient.invalidateQueries({ queryKey: directMessageKeys.conversation(user.id, otherUserId) });
      queryClient.invalidateQueries({ queryKey: directMessageKeys.inbox(user.id) });
      queryClient.invalidateQueries({ queryKey: directMessageKeys.unreadCount(user.id) });
    },
  });
}
