import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getConversationByUsername,
  getUnreadMessagesCount,
  listInboxConversations,
  markConversationAsReadByUsername,
  sendDirectMessageByUsername,
} from '@/entities/direct_message/direct_message.api';
import { directMessageKeys } from '@/entities/direct_message/direct_message.keys';
import type { ConversationSummary, DirectMessage } from '@/entities/direct_message/direct_message.types';
import { useAuth } from '@/features/auth/useAuth';

export function useInboxConversations() {
  return useQuery<ConversationSummary[], Error>({
    queryKey: directMessageKeys.inbox(),
    queryFn: () => listInboxConversations(),
  });
}

export function useConversation(otherUsername: string | undefined) {
  return useQuery<DirectMessage[], Error>({
    queryKey: directMessageKeys.conversation(otherUsername || ''),
    queryFn: async () => {
      if (!otherUsername) return [];
      return getConversationByUsername(otherUsername);
    },
    enabled: !!otherUsername,
  });
}

export function useUnreadMessagesCount() {
  const { user } = useAuth();

  return useQuery<number, Error>({
    queryKey: directMessageKeys.unreadCount(),
    queryFn: async () => {
      if (!user) return 0;
      return getUnreadMessagesCount();
    },
    enabled: !!user,
    staleTime: 15000,
  });
}

export function useSendDirectMessage() {
  const queryClient = useQueryClient();

  return useMutation<DirectMessage, Error, { receiverUsername: string; content: string }>({
    mutationFn: ({ receiverUsername, content }) => sendDirectMessageByUsername(receiverUsername, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: directMessageKeys.inbox() });
      queryClient.invalidateQueries({ queryKey: directMessageKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: directMessageKeys.conversation(variables.receiverUsername) });
    },
    onError: (error) => {
      toast.error('Nao foi possivel enviar a mensagem.', { description: error.message });
    },
  });
}

export function useMarkConversationAsRead() {
  const queryClient = useQueryClient();

  return useMutation<number, Error, { otherUsername: string }>({
    mutationFn: ({ otherUsername }) => markConversationAsReadByUsername(otherUsername),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: directMessageKeys.inbox() });
      queryClient.invalidateQueries({ queryKey: directMessageKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: directMessageKeys.conversation(variables.otherUsername) });
    },
  });
}
