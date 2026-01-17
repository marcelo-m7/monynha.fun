import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Submit from './Submit';
import { renderWithProviders } from '@/shared/test/renderWithProviders';

const useAuthMock = vi.fn();
const useCategoriesMock = vi.fn();
const useYouTubeMetadataMock = vi.fn();
const mutateAsyncMock = vi.fn();
const useSubmitVideoMock = vi.fn();

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/features/categories/queries/useCategories', () => ({
  useCategories: () => useCategoriesMock(),
}));

vi.mock('@/features/submit/useYouTubeMetadata', () => ({
  useYouTubeMetadata: (url: string) => useYouTubeMetadataMock(url),
}));

vi.mock('@/features/submit/useSubmitVideo', () => ({
  useSubmitVideo: () => useSubmitVideoMock(),
}));

beforeEach(() => {
  useAuthMock.mockReturnValue({ user: { id: 'user-1' }, loading: false });
  useCategoriesMock.mockReturnValue({ data: [], isLoading: false });
  useSubmitVideoMock.mockReturnValue({ mutateAsync: mutateAsyncMock, isPending: false });
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

    await user.type(screen.getByLabelText(/youtube url/i), 'https://example.com');
    await user.click(screen.getByRole('button', { name: /submit video/i }));

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

    await user.type(
      screen.getByLabelText(/youtube url/i),
      'https://www.youtube.com/watch?v=abc123DEF45',
    );

    await user.click(screen.getByRole('button', { name: /submit video/i }));

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
});
