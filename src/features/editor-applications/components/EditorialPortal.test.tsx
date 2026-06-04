import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import EditorialPortal from '@/pages/EditorialPortal';
import { renderWithProviders } from '@/shared/test/renderWithProviders';

const useIsEditorMock = vi.fn();
const useAuthMock = vi.fn();
const usePlaylistsMock = vi.fn();
const useVideoAnalysisJobsMock = vi.fn();

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/features/profile/queries/useProfile', () => ({
  useIsEditor: () => useIsEditorMock(),
  useCurrentUserProfile: () => ({ data: null, isLoading: false }),
  useProfileById: () => ({ data: null, isLoading: false }),
}));

vi.mock('@/features/playlists/queries/usePlaylists', () => ({
  usePlaylists: () => usePlaylistsMock(),
}));

vi.mock('@/features/video-analysis/useVideoAnalysisJob', () => ({
  useVideoAnalysisJobs: () => useVideoAnalysisJobsMock(),
}));

vi.mock('@/features/notifications', () => ({
  useUnreadNotificationsCount: () => ({ data: 0 }),
}));

vi.mock('@/features/messages', () => ({
  useUnreadMessagesCount: () => ({ data: 0 }),
}));

beforeEach(() => {
  useAuthMock.mockReturnValue({ user: { id: 'user-1' }, loading: false });
  usePlaylistsMock.mockReturnValue({ data: [], isLoading: false, isError: false });
  useVideoAnalysisJobsMock.mockReturnValue({ data: [], isLoading: false, isError: false });
});

describe('EditorialPortal access control', () => {
  it('shows restricted area message for non-editor users', () => {
    useIsEditorMock.mockReturnValue({ isEditor: false, isLoading: false, role: 'user' });

    renderWithProviders(<EditorialPortal />);

    expect(screen.getByText(/área restrita|restricted area/i)).toBeInTheDocument();
  });

  it('shows portal content for editor users', () => {
    useIsEditorMock.mockReturnValue({ isEditor: true, isLoading: false, role: 'editor' });

    renderWithProviders(<EditorialPortal />);

    expect(screen.getByText(/FACODI Editorial Portal/i)).toBeInTheDocument();
  });

  it('shows portal content for admin users', () => {
    useIsEditorMock.mockReturnValue({ isEditor: true, isLoading: false, role: 'admin' });

    renderWithProviders(<EditorialPortal />);

    expect(screen.getByText(/FACODI Editorial Portal/i)).toBeInTheDocument();
  });

  it('shows pending analysis jobs for editors', () => {
    useIsEditorMock.mockReturnValue({ isEditor: true, isLoading: false, role: 'editor' });
    useVideoAnalysisJobsMock.mockReturnValue({
      data: [
        {
          id: 'job-1',
          video_id: 'video-1',
          submission_id: 'submission-1',
          status: 'pending',
          provider: 'v2',
          provider_model: null,
          started_at: null,
          completed_at: null,
          error_message: null,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          video: {
            id: 'video-1',
            title: 'Async analysis video',
            youtube_id: 'abc123DEF45',
            thumbnail_url: 'https://example.com/thumb.jpg',
            category: { id: 'cat-1', name: 'Education', slug: 'education' },
          },
        },
      ],
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<EditorialPortal />);

    expect(screen.getByText(/Analysis and review queue/i)).toBeInTheDocument();
    expect(screen.getByText('Async analysis video')).toBeInTheDocument();
    expect(screen.getAllByText(/Pending/i).length).toBeGreaterThan(0);
  });

  it('redirects unauthenticated users to /auth', () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });
    useIsEditorMock.mockReturnValue({ isEditor: false, isLoading: false, role: undefined });

    // renderWithProviders uses MemoryRouter; we just check the portal is not shown
    renderWithProviders(<EditorialPortal />);

    expect(screen.queryByText(/FACODI Editorial Portal/i)).not.toBeInTheDocument();
  });
});
