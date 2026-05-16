import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubmitStatus from './SubmitStatus';
import { renderWithProviders } from '@/shared/test/renderWithProviders';

const navigateMock = vi.fn();
const useAuthMock = vi.fn();
const useVideoSubmissionMock = vi.fn();
const useStartSubmissionProcessingMock = vi.fn();
const startProcessingMock = vi.fn();
const refetchMock = vi.fn();

vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

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

vi.mock('@/features/video-submissions/queries/useVideoSubmissions', () => ({
  useVideoSubmission: (id?: string) => useVideoSubmissionMock(id),
  useStartSubmissionProcessing: () => useStartSubmissionProcessingMock(),
}));

const baseSubmission = {
  id: 'submission-1',
  user_id: 'user-1',
  video_id: 'video-1',
  duplicate_video_id: null,
  youtube_id: 'abc123DEF45',
  youtube_url: 'https://www.youtube.com/watch?v=abc123DEF45',
  status: 'processing',
  error_message: null,
  recoverable: false,
  metadata: null,
};

beforeEach(() => {
  navigateMock.mockReset();
  startProcessingMock.mockReset();
  refetchMock.mockReset();
  useAuthMock.mockReturnValue({ user: { id: 'user-1' }, loading: false });
  useVideoSubmissionMock.mockReturnValue({
    data: baseSubmission,
    isLoading: false,
    isError: false,
    refetch: refetchMock,
  });
  useStartSubmissionProcessingMock.mockReturnValue({
    mutate: startProcessingMock,
    isPending: false,
    isError: false,
    error: null,
  });
});

describe('SubmitStatus page', () => {
  it('starts processing a pending submission', async () => {
    useVideoSubmissionMock.mockReturnValue({
      data: { ...baseSubmission, status: 'pending' },
      isLoading: false,
      isError: false,
      refetch: refetchMock,
    });

    renderWithProviders(<SubmitStatus />, { route: '/submit/status/submission-1' });

    await waitFor(() => {
      expect(startProcessingMock).toHaveBeenCalledWith({
        submissionId: 'submission-1',
        videoId: 'video-1',
        youtubeUrl: 'https://www.youtube.com/watch?v=abc123DEF45',
      });
    });
  });

  it('shows success with detected language and video link', () => {
    useVideoSubmissionMock.mockReturnValue({
      data: {
        ...baseSubmission,
        status: 'success',
        metadata: { detectedLanguage: 'pt', enrichmentId: 'enrichment-1' },
      },
      isLoading: false,
      isError: false,
      refetch: refetchMock,
    });

    renderWithProviders(<SubmitStatus />, { route: '/submit/status/submission-1' });

    expect(screen.getByText('Video ready')).toBeInTheDocument();
    expect(screen.getByText('Portuguese')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View video' })).toHaveAttribute('href', '/videos/video-1');
    expect(startProcessingMock).not.toHaveBeenCalled();
  });

  it('shows duplicate status with link to the existing video', () => {
    useVideoSubmissionMock.mockReturnValue({
      data: {
        ...baseSubmission,
        video_id: null,
        duplicate_video_id: 'existing-video-1',
        status: 'duplicate',
      },
      isLoading: false,
      isError: false,
      refetch: refetchMock,
    });

    renderWithProviders(<SubmitStatus />, { route: '/submit/status/submission-1' });

    expect(screen.getByText('Duplicate detected')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View video' })).toHaveAttribute('href', '/videos/existing-video-1');
  });

  it('allows retry for recoverable errors', async () => {
    useVideoSubmissionMock.mockReturnValue({
      data: {
        ...baseSubmission,
        status: 'recoverable_error',
        error_message: 'OpenAI timeout',
        recoverable: true,
      },
      isLoading: false,
      isError: false,
      refetch: refetchMock,
    });

    renderWithProviders(<SubmitStatus />, { route: '/submit/status/submission-1' });

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(startProcessingMock).toHaveBeenCalledWith({
      submissionId: 'submission-1',
      videoId: 'video-1',
      youtubeUrl: 'https://www.youtube.com/watch?v=abc123DEF45',
    });
  });
});
