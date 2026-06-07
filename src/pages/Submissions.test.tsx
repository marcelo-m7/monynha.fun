import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/shared/test/renderWithProviders';
import type { VideoSubmission } from '@/entities/video_submission/video_submission.types';
import Submissions from './Submissions';

const useAuthMock = vi.fn();
const useVideoSubmissionsMock = vi.fn();
const useRecentVideoSubmissionsMock = vi.fn();

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/features/video-submissions/queries/useVideoSubmissions', () => ({
  startVideoSubmissionProcessing: vi.fn(),
  useVideoSubmissions: (ids: string[]) => useVideoSubmissionsMock(ids),
  useRecentVideoSubmissions: (limit: number, enabled: boolean) => useRecentVideoSubmissionsMock(limit, enabled),
}));

const baseSubmission: Partial<VideoSubmission> = {
  user_id: 'user-1',
  status: 'pending',
  duplicate_video_id: null,
  recoverable: false,
  processing_started_at: null,
  completed_at: null,
  error_message: null,
  metadata: {},
};

function makeSubmission(partial: Partial<VideoSubmission>): VideoSubmission {
  return {
    ...(baseSubmission as VideoSubmission),
    ...partial,
  };
}

describe('Submissions page', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com' },
      loading: false,
    });

    useVideoSubmissionsMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    useRecentVideoSubmissionsMock.mockReturnValue({
      data: [
        makeSubmission({
          id: 's-1',
          youtube_id: 'playlist-video',
          youtube_url: 'https://www.youtube.com/watch?v=playlistvideo',
          video_id: 'video-1',
          created_at: '2026-06-07T10:00:00.000Z',
          status: 'processing',
          metadata: {
            source: 'youtube_playlist_import',
            youtube_playlist_list: 'PL-123',
            youtube_playlist_url: 'https://www.youtube.com/playlist?list=PL-123',
          },
        }),
        makeSubmission({
          id: 's-2',
          youtube_id: 'single-video',
          youtube_url: 'https://www.youtube.com/watch?v=singlevideo',
          video_id: 'video-2',
          created_at: '2026-06-07T09:00:00.000Z',
          status: 'success',
        }),
        makeSubmission({
          id: 's-3',
          youtube_id: 'failed-video',
          youtube_url: 'https://www.youtube.com/watch?v=failedvideo',
          video_id: 'video-3',
          created_at: '2026-06-07T08:00:00.000Z',
          status: 'failed',
          error_message: 'classification failed',
        }),
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('renders submissions and filter controls', () => {
    renderWithProviders(<Submissions />, { route: '/submissions' });

    expect(screen.getByRole('heading', { name: /imports/i })).toBeInTheDocument();
    expect(screen.getAllByText(/playlist-video/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/single-video/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/failed-video/i).length).toBeGreaterThan(0);

    expect(screen.getByRole('button', { name: /all types/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /playlist imports/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /single submissions/i })).toBeInTheDocument();
  });

  it('filters by type and status', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Submissions />, { route: '/submissions' });

    await user.click(screen.getByRole('button', { name: /playlist imports/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/playlist-video/i).length).toBeGreaterThan(0);
      expect(screen.queryByText(/single-video/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/failed-video/i)).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /all types/i }));
    await user.click(screen.getByRole('button', { name: /needs attention/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed-video/i)).toBeInTheDocument();
      expect(screen.queryByText(/playlist-video/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/single-video/i)).not.toBeInTheDocument();
    });
  });
});
