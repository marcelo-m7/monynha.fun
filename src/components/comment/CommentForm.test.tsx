import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { CommentForm } from './CommentForm';
import { useAuth } from '@/features/auth/useAuth';
import { useSearchProfiles } from '@/features/profile/queries/useProfile';
import type { Mock } from 'vitest';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock dependencies
vi.mock('@/features/auth/useAuth');
vi.mock('@/features/profile/queries/useProfile');
vi.mock('@/features/comments/queries/useComments', () => ({
  useCreateComment: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockProfiles = [
  { id: '1', username: 'johndoe', display_name: 'John Doe', avatar_url: null },
  { id: '2', username: 'janedoe', display_name: 'Jane Doe', avatar_url: null },
  { id: '3', username: 'testuser', display_name: 'Test User', avatar_url: 'https://example.com/avatar.jpg' },
];

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('CommentForm - Mention Autocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as unknown as Mock).mockReturnValue({ user: mockUser });
    (useSearchProfiles as unknown as Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('renders the comment form with mention helper text', () => {
    renderWithProviders(<CommentForm videoId="video-123" />);
    
    expect(screen.getByLabelText('comments.form.placeholder')).toBeInTheDocument();
    expect(screen.getByText('comments.form.mentionHelper')).toBeInTheDocument();
  });

  it('shows autocomplete dropdown when typing @ symbol', async () => {
    (useSearchProfiles as unknown as Mock).mockReturnValue({
      data: mockProfiles,
      isLoading: false,
    });

    renderWithProviders(<CommentForm videoId="video-123" />);
    const textarea = screen.getByLabelText('comments.form.placeholder');

    await userEvent.type(textarea, 'Hello @john');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('@johndoe')).toBeInTheDocument();
    });
  });

  it('filters users based on mention query', async () => {
    let currentQuery = '';
    (useSearchProfiles as unknown as Mock).mockImplementation((query: string) => {
      currentQuery = query;
      const filtered = mockProfiles.filter(p => 
        p.username.toLowerCase().includes(query.toLowerCase()) ||
        (p.display_name || '').toLowerCase().includes(query.toLowerCase())
      );
      return { data: filtered, isLoading: false };
    });

    renderWithProviders(<CommentForm videoId="video-123" />);
    const textarea = screen.getByLabelText('comments.form.placeholder');

    await userEvent.type(textarea, 'Hello @jane');

    await waitFor(() => {
      expect(currentQuery).toBe('jane');
    });
  });

  it('shows loading state while searching users', async () => {
    (useSearchProfiles as unknown as Mock).mockReturnValue({
      data: [],
      isLoading: true,
    });

    renderWithProviders(<CommentForm videoId="video-123" />);
    const textarea = screen.getByLabelText('comments.form.placeholder');

    await userEvent.type(textarea, '@test');

    await waitFor(() => {
      expect(screen.getByText('comments.form.searchingUsers')).toBeInTheDocument();
    });
  });

  it('shows "no users found" when search returns empty', async () => {
    (useSearchProfiles as unknown as Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderWithProviders(<CommentForm videoId="video-123" />);
    const textarea = screen.getByLabelText('comments.form.placeholder');

    await userEvent.type(textarea, '@nonexistent');

    // Wait for debounce
    await waitFor(() => {
      expect(screen.queryByText('comments.noUsersFound')).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('closes autocomplete when pressing Escape', async () => {
    (useSearchProfiles as unknown as Mock).mockReturnValue({
      data: mockProfiles,
      isLoading: false,
    });

    renderWithProviders(<CommentForm videoId="video-123" />);
    const textarea = screen.getByLabelText('comments.form.placeholder');

    await userEvent.type(textarea, '@john');
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.keyDown(textarea, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('navigates through suggestions with arrow keys', async () => {
    (useSearchProfiles as unknown as Mock).mockReturnValue({
      data: mockProfiles,
      isLoading: false,
    });

    renderWithProviders(<CommentForm videoId="video-123" />);
    const textarea = screen.getByLabelText('comments.form.placeholder');

    await userEvent.type(textarea, '@john');
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // First item should be selected by default
    const firstOption = screen.getByText('John Doe').closest('[role="option"]');
    expect(firstOption).toHaveAttribute('aria-selected', 'true');

    // Navigate down
    fireEvent.keyDown(textarea, { key: 'ArrowDown' });
    
    await waitFor(() => {
      const secondOption = screen.getByText('Jane Doe').closest('[role="option"]');
      expect(secondOption).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('inserts selected mention when clicking on suggestion', async () => {
    (useSearchProfiles as unknown as Mock).mockReturnValue({
      data: mockProfiles,
      isLoading: false,
    });

    renderWithProviders(<CommentForm videoId="video-123" />);
    const textarea = screen.getByLabelText('comments.form.placeholder') as HTMLTextAreaElement;

    await userEvent.type(textarea, 'Hello @john');
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const suggestion = screen.getByText('John Doe');
    fireEvent.click(suggestion);

    await waitFor(() => {
      expect(textarea.value).toBe('Hello @johndoe ');
    });
  });

  it('shows keyboard hint when autocomplete is open', async () => {
    (useSearchProfiles as unknown as Mock).mockReturnValue({
      data: mockProfiles,
      isLoading: false,
    });

    renderWithProviders(<CommentForm videoId="video-123" />);
    const textarea = screen.getByLabelText('comments.form.placeholder');

    await userEvent.type(textarea, '@john');
    
    await waitFor(() => {
      expect(screen.getByText('comments.form.keyboardHint')).toBeInTheDocument();
    });
  });

  it('disables form when user is not authenticated', () => {
    (useAuth as unknown as Mock).mockReturnValue({ user: null });

    renderWithProviders(<CommentForm videoId="video-123" />);
    
    const textarea = screen.getByLabelText('comments.form.placeholder');
    const submitButton = screen.getByRole('button', { name: /comment/i });

    expect(textarea).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('comments.loginToCommentPrompt')).toBeInTheDocument();
  });
});
