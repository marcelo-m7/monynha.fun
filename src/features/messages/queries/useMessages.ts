import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/useAuth';
import { directMessageKeys } from '@/entities/direct_message/direct_message.keys';
import { supabase } from '@/shared/api/supabase/supabaseClient';
import {
  getUnreadMessagesCount,
  listConversation,
  listInboxConversations,
  markConversationAsRead,
  sendDirectMessage,
} from '@/entities/direct_message/direct_message.api';
import type {
  ConversationMessage,
  ConversationSummary,
  SentMessage,
} from '@/entities/direct_message/direct_message.types';

export function useInboxConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`dm-inbox-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: directMessageKeys.all });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: directMessageKeys.all });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  return useQuery<ConversationSummary[], Error>({
    queryKey: user?.id ? directMessageKeys.inbox(user.id) : directMessageKeys.inbox(''),
    queryFn: async () => {
      if (!user?.id) return [];
      return listInboxConversations();
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });
}

export function useConversation(otherUsername: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id || !otherUsername) return;

    const channel = supabase
      .channel(`dm-conversation-${user.id}-${otherUsername}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: directMessageKeys.conversation(user.id, otherUsername) });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: directMessageKeys.conversation(user.id, otherUsername) });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [otherUsername, queryClient, user?.id]);

  return useQuery<ConversationMessage[], Error>({
    queryKey:
      user?.id && otherUsername
        ? directMessageKeys.conversation(user.id, otherUsername)
        : directMessageKeys.conversation('', ''),
    queryFn: async () => {
      if (!user?.id || !otherUsername) return [];
      return listConversation(otherUsername);
    },
    enabled: !!user?.id && !!otherUsername,
    refetchInterval: 10000,
  });
}

export function useUnreadMessagesCount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`dm-unread-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: directMessageKeys.unreadCount(user.id) });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: directMessageKeys.unreadCount(user.id) });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  return useQuery<number, Error>({
    queryKey: user?.id ? directMessageKeys.unreadCount(user.id) : directMessageKeys.unreadCount(''),
    queryFn: async () => {
      if (!user?.id) return 0;
      return getUnreadMessagesCount();
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<SentMessage, Error, { receiverUsername: string; content: string }>({
    mutationFn: async ({ receiverUsername, content }) => {
      if (!user?.id) throw new Error('You must be logged in to send a message.');
      return sendDirectMessage(receiverUsername, content);
    },
    onSuccess: (_, variables) => {
      if (!user?.id) return;
      queryClient.invalidateQueries({ queryKey: directMessageKeys.conversation(user.id, variables.receiverUsername) });
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

  return useMutation<void, Error, { otherUsername: string }>({
    mutationFn: async ({ otherUsername }) => {
      if (!user?.id) throw new Error('You must be logged in to update messages.');
      return markConversationAsRead(otherUsername);
    },
    onSuccess: (_, { otherUsername }) => {
      if (!user?.id) return;
      queryClient.invalidateQueries({ queryKey: directMessageKeys.conversation(user.id, otherUsername) });
      queryClient.invalidateQueries({ queryKey: directMessageKeys.inbox(user.id) });
      queryClient.invalidateQueries({ queryKey: directMessageKeys.unreadCount(user.id) });
    },
  });
}
