import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Messages from './Messages';
import { renderWithProviders } from '@/shared/test/renderWithProviders';

const navigateMock = vi.fn();
const useAuthMock = vi.fn();
const useCurrentUserProfileMock = vi.fn();
const useInboxConversationsMock = vi.fn();
const useConversationMock = vi.fn();
const useSendDirectMessageMock = vi.fn();
const useMarkConversationAsReadMock = vi.fn();
const sendMutateAsyncMock = vi.fn();
const markAsReadMutateMock = vi.fn();
const refetchInboxMock = vi.fn();
const refetchConversationMock = vi.fn();

vi.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header" />,
}));

vi.mock('@/components/layout/Footer', () => ({
  Footer: () => <footer data-testid="footer" />,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/features/profile/queries/useProfile', () => ({
  useCurrentUserProfile: () => useCurrentUserProfileMock(),
}));

vi.mock('@/features/messages', () => ({
  useInboxConversations: () => useInboxConversationsMock(),
  useConversation: (username?: string) => useConversationMock(username),
  useSendDirectMessage: () => useSendDirectMessageMock(),
  useMarkConversationAsRead: () => useMarkConversationAsReadMock(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const aliceConversation = {
  partnerUsername: 'alice',
  partnerDisplayName: 'Alice',
  partnerAvatarUrl: null,
  lastMessageId: 'message-1',
  lastMessageContent: 'Oi!',
  lastMessageCreatedAt: '2026-06-05T10:00:00Z',
  lastMessageIsRead: false,
  lastMessageSenderUsername: 'alice',
  unreadCount: 1,
};

beforeEach(() => {
  navigateMock.mockReset();
  sendMutateAsyncMock.mockReset();
  markAsReadMutateMock.mockReset();
  refetchInboxMock.mockReset();
  refetchConversationMock.mockReset();

  useAuthMock.mockReturnValue({ user: { id: 'user-1' }, loading: false });
  useCurrentUserProfileMock.mockReturnValue({ data: { id: 'user-1', username: 'me' } });
  useInboxConversationsMock.mockReturnValue({
    data: [aliceConversation],
    isLoading: false,
    isError: false,
    error: null,
    refetch: refetchInboxMock,
  });
  useConversationMock.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: refetchConversationMock,
  });
  useSendDirectMessageMock.mockReturnValue({
    mutateAsync: sendMutateAsyncMock.mockResolvedValue({ id: 'message-2' }),
    isPending: false,
  });
  useMarkConversationAsReadMock.mockReturnValue({
    mutate: markAsReadMutateMock,
    isPending: false,
  });
});

describe('Messages page', () => {
  it('shows the empty inbox state', () => {
    useInboxConversationsMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchInboxMock,
    });

    renderWithProviders(<Messages />, { route: '/messages' });

    expect(screen.getByText('No conversations yet.')).toBeInTheDocument();
    expect(screen.getAllByText('Select a conversation to start chatting.')).toHaveLength(2);
  });

  it('shows inbox errors with retry', async () => {
    useInboxConversationsMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error('RPC missing'),
      refetch: refetchInboxMock,
    });

    renderWithProviders(<Messages />, { route: '/messages' });

    expect(screen.getByText('Could not load conversations.')).toBeInTheDocument();
    expect(screen.getByText('RPC missing')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetchInboxMock).toHaveBeenCalled();
  });

  it('sends a trimmed message to the selected username', async () => {
    renderWithProviders(<Messages />, { route: '/messages?with=alice' });

    await userEvent.type(screen.getByPlaceholderText('Write a message...'), '  Olá Alice  ');
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(sendMutateAsyncMock).toHaveBeenCalledWith({
        receiverUsername: 'alice',
        content: 'Olá Alice',
      });
    });
  });

  it('marks unread partner messages as read', async () => {
    useConversationMock.mockReturnValue({
      data: [
        {
          id: 'message-1',
          content: 'Oi!',
          isRead: false,
          createdAt: '2026-06-05T10:00:00Z',
          senderUsername: 'alice',
          senderDisplayName: 'Alice',
          senderAvatarUrl: null,
          receiverUsername: 'me',
          receiverDisplayName: 'Me',
          receiverAvatarUrl: null,
          isMine: false,
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchConversationMock,
    });

    renderWithProviders(<Messages />, { route: '/messages?with=alice' });

    await waitFor(() => {
      expect(markAsReadMutateMock).toHaveBeenCalledWith({ otherUsername: 'alice' });
    });
  });

  it('blocks self conversations in the UI', async () => {
    renderWithProviders(<Messages />, { route: '/messages?with=me' });

    expect(screen.getByText('You cannot send a message to yourself.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('You cannot send a message to yourself.')).toBeDisabled();
    expect(sendMutateAsyncMock).not.toHaveBeenCalled();
  });
});
