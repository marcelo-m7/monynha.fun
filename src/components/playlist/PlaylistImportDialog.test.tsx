import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/shared/test/renderWithProviders';
import { PlaylistImportDialog } from './PlaylistImportDialog';

const invokeEdgeFunctionMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/shared/api/supabase/edgeFunctions', () => ({
  invokeEdgeFunction: (...args: unknown[]) => invokeEdgeFunctionMock(...args),
  getEdgeFunctionErrorDetails: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PlaylistImportDialog', () => {
  beforeEach(() => {
    invokeEdgeFunctionMock.mockReset();
    navigateMock.mockReset();

    invokeEdgeFunctionMock.mockResolvedValueOnce({
      data: {
        fetched_video_count: 5,
        created_submission_count: 3,
        skipped_existing_enriched_count: 1,
        already_queued_count: 1,
        submissions: [
          {
            id: 'sub-1',
            video_id: 'video-1',
            youtube_url: 'https://www.youtube.com/watch?v=abcdefghijk',
            status: 'pending',
          },
        ],
      },
      error: null,
    });
  });

  it('uses snake_case payload and navigates to the submissions center', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <PlaylistImportDialog>
        <button type="button">Open Import</button>
      </PlaylistImportDialog>,
    );

    await user.click(screen.getByRole('button', { name: 'Open Import' }));
    await user.type(
      screen.getByLabelText('YouTube Playlist URL *'),
      'https://youtube.com/playlist?list=PL7iAT8C5wumpQWB8AFW7CwK2nlzh8ZdP9',
    );

    expect(screen.queryByLabelText('Playlist Name *')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Import videos' }));

    await waitFor(() => {
      expect(invokeEdgeFunctionMock).toHaveBeenCalledWith(
        'import-youtube-playlist',
        expect.objectContaining({
          body: expect.objectContaining({
            playlist_url: 'https://youtube.com/playlist?list=PL7iAT8C5wumpQWB8AFW7CwK2nlzh8ZdP9',
            language: 'und',
            max_videos: 50,
          }),
        }),
      );
    });

    expect(invokeEdgeFunctionMock.mock.calls[0]?.[1]?.body).not.toHaveProperty('playlist_id');
    expect(invokeEdgeFunctionMock).toHaveBeenCalledTimes(1);
    expect(invokeEdgeFunctionMock).not.toHaveBeenCalledWith('enrich-video', expect.anything());

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(expect.stringContaining('/submissions?'));
    });
    expect(navigateMock).toHaveBeenCalledWith(expect.stringContaining('ids=sub-1'));
    expect(navigateMock).toHaveBeenCalledWith(expect.stringContaining('found=5'));
    expect(navigateMock).toHaveBeenCalledWith(expect.stringContaining('created=3'));
    expect(navigateMock).toHaveBeenCalledWith(expect.stringContaining('existing=2'));
  }, 15000);
});
