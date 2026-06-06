import { useEffect, useRef } from 'react';
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
import { supabase } from '@/shared/api/supabase/supabaseClient';

let directMessagesRealtimeInstance = 0;

function useDirectMessagesRealtime(otherUsername?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const instanceIdRef = useRef<string | null>(null);

  if (!instanceIdRef.current) {
    directMessagesRealtimeInstance += 1;
    instanceIdRef.current = String(directMessagesRealtimeInstance);
  }

  useEffect(() => {
    if (!user?.id || import.meta.env.MODE === 'test') return;

    const invalidateMessages = () => {
      queryClient.invalidateQueries({ queryKey: directMessageKeys.inbox() });
      queryClient.invalidateQueries({ queryKey: directMessageKeys.unreadCount() });
      if (otherUsername) {
        queryClient.invalidateQueries({ queryKey: directMessageKeys.conversation(otherUsername) });
      }
    };

    const channel = supabase
      .channel(`direct-messages:${user.id}:${otherUsername ?? 'all'}:${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        invalidateMessages,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${user.id}`,
        },
        invalidateMessages,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [otherUsername, queryClient, user?.id]);
}

export function useInboxConversations() {
  const { user } = useAuth();

  return useQuery<ConversationSummary[], Error>({
    queryKey: directMessageKeys.inbox(),
    queryFn: () => listInboxConversations(),
    enabled: !!user,
    staleTime: 10000,
    refetchInterval: user ? 45000 : false,
  });
}

export function useConversation(otherUsername: string | undefined) {
  const { user } = useAuth();
  useDirectMessagesRealtime(otherUsername);

  return useQuery<DirectMessage[], Error>({
    queryKey: directMessageKeys.conversation(otherUsername || ''),
    queryFn: async () => {
      if (!otherUsername) return [];
      return getConversationByUsername(otherUsername);
    },
    enabled: !!user && !!otherUsername,
    staleTime: 5000,
    refetchInterval: user && otherUsername ? 15000 : false,
  });
}

export function useUnreadMessagesCount() {
  const { user } = useAuth();
  useDirectMessagesRealtime();

  return useQuery<number, Error>({
    queryKey: directMessageKeys.unreadCount(),
    queryFn: async () => {
      if (!user) return 0;
      return getUnreadMessagesCount();
    },
    enabled: !!user,
    staleTime: 10000,
    refetchInterval: user ? 30000 : false,
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
    onError: (error) => {
      toast.error('Nao foi possivel marcar a conversa como lida.', { description: error.message });
    },
  });
}
