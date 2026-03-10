import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Submit from './Submit';
import { renderWithProviders } from '@/shared/test/renderWithProviders';

const navigateMock = vi.fn();

const useAuthMock = vi.fn();
const useCategoriesMock = vi.fn();
const useYouTubeMetadataMock = vi.fn();
const mutateAsyncMock = vi.fn();
const useSubmitVideoMock = vi.fn();
const useEditablePlaylistsMock = vi.fn();
const useAddVideoToPlaylistMock = vi.fn();
const useProfileByIdMock = vi.fn();

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/features/categories/queries/useCategories', () => ({
  useCategories: () => useCategoriesMock(),
}));

vi.mock('@/features/submit/useYouTubeMetadata', () => ({
  useYouTubeMetadata: (url: string) => useYouTubeMetadataMock(url),
}));

vi.mock('@/features/submit/useSubmitVideo', () => ({
  useSubmitVideo: () => useSubmitVideoMock(),
}));

vi.mock('@/features/profile/queries/useProfile', () => ({
  useProfileById: (id?: string) => useProfileByIdMock(id),
}));

vi.mock('@/features/playlists', () => ({
  useEditablePlaylists: () => useEditablePlaylistsMock(),
  useAddVideoToPlaylist: () => useAddVideoToPlaylistMock(),
}));

beforeEach(() => {
  navigateMock.mockReset();
  useAuthMock.mockReturnValue({ user: { id: 'user-1' }, loading: false });
  useCategoriesMock.mockReturnValue({ data: [], isLoading: false });
  useSubmitVideoMock.mockReturnValue({ mutateAsync: mutateAsyncMock, isPending: false });
  useEditablePlaylistsMock.mockReturnValue({ data: [], isLoading: false });
  useAddVideoToPlaylistMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  useProfileByIdMock.mockReturnValue({ data: null, isLoading: false, isError: false });
  mutateAsyncMock.mockResolvedValue({ status: 'created', video: { id: 'video-1' }, edgeError: null });
});

describe('Submit page', () => {
  it('shows validation errors for invalid input', async () => {
    useYouTubeMetadataMock.mockReturnValue({
      metadata: {
        videoId: 'abc123DEF45',
        title: 'Learning React',
        channelName: 'Monynha',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        description: 'React basics',
      },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<Submit />);

    const user = userEvent.setup();

    const youtubeInput = screen.getByLabelText(/youtube url/i);
    await user.type(youtubeInput, 'https://example.com');

    const form = youtubeInput.closest('form');
    if (!form) throw new Error('Submit form not found');
    await user.click(within(form).getByRole('button', { name: /submit video/i }));

    expect(await screen.findByText('Only YouTube URLs are accepted')).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('submits the form and calls the mutation', async () => {
    useYouTubeMetadataMock.mockReturnValue({
      metadata: {
        videoId: 'abc123DEF45',
        title: 'Learning React',
        channelName: 'Monynha',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        description: 'React basics',
      },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<Submit />);

    const user = userEvent.setup();

    const youtubeInput = screen.getByLabelText(/youtube url/i);
    fireEvent.change(youtubeInput, {
      target: { value: 'https://www.youtube.com/watch?v=abc123DEF45' },
    });

    expect(youtubeInput).toHaveValue('https://www.youtube.com/watch?v=abc123DEF45');

    const form = youtubeInput.closest('form');
    if (!form) throw new Error('Submit form not found');
    await user.click(within(form).getByRole('button', { name: /submit video/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalled();
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        youtubeUrl: 'https://www.youtube.com/watch?v=abc123DEF45',
        userId: 'user-1',
      }),
    );
  });

  it('redirects to auth when user is not authenticated', async () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });
    useYouTubeMetadataMock.mockReturnValue({ metadata: null, isLoading: false, error: null });

    renderWithProviders(<Submit />);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/auth');
    });
  });
});
