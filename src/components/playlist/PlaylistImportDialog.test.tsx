import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/shared/test/renderWithProviders';
import { PlaylistImportDialog } from './PlaylistImportDialog';

const mutateAsyncMock = vi.fn();
const invokeEdgeFunctionMock = vi.fn();

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/features/playlists', () => ({
  useCreatePlaylist: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/shared/api/supabase/edgeFunctions', () => ({
  invokeEdgeFunction: (...args: unknown[]) => invokeEdgeFunctionMock(...args),
  getEdgeFunctionErrorDetails: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PlaylistImportDialog', () => {
  beforeEach(() => {
    mutateAsyncMock.mockReset();
    invokeEdgeFunctionMock.mockReset();

    mutateAsyncMock.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Imported YouTube Playlist',
    });

    invokeEdgeFunctionMock
      .mockResolvedValueOnce({
        data: {
          fetched_video_count: 5,
          added_to_playlist_count: 3,
          existing_in_playlist_count: 2,
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
      })
      .mockResolvedValueOnce({ data: { status: 'processing' }, error: null });
  });

  it('uses snake_case payload for import-youtube-playlist and dispatches enrich-video', async () => {
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

    await waitFor(() => {
      expect(screen.getByLabelText('Playlist Name *')).toHaveValue('Imported YouTube Playlist');
    });

    await user.click(screen.getByRole('button', { name: 'Import Playlist' }));

    await waitFor(() => {
      expect(invokeEdgeFunctionMock).toHaveBeenCalledWith(
        'import-youtube-playlist',
        expect.objectContaining({
          body: expect.objectContaining({
            playlist_url: 'https://youtube.com/playlist?list=PL7iAT8C5wumpQWB8AFW7CwK2nlzh8ZdP9',
            playlist_id: '11111111-1111-4111-8111-111111111111',
            language: 'und',
            max_videos: 200,
          }),
        }),
      );
    });

    expect(invokeEdgeFunctionMock).toHaveBeenCalledWith(
      'enrich-video',
      expect.objectContaining({
        body: {
          videoId: 'video-1',
          youtubeUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
          submissionId: 'sub-1',
        },
      }),
    );
  });
});
