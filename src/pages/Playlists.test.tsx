import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import Playlists from './Playlists';
import { renderWithProviders } from '@/shared/test/renderWithProviders';

const usePlaylistsMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/features/playlists/queries/usePlaylists', () => ({
  usePlaylists: () => usePlaylistsMock(),
}));

vi.mock('@/features/playlists', () => ({
  usePlaylistVideos: () => ({ data: [], isLoading: false }),
  usePlaylistProgress: () => ({ data: [], isLoading: false }),
  useCreatePlaylist: () => ({ mutateAsync: vi.fn(async (payload: any) => ({ id: 'playlist-1', name: payload?.name || 'Playlist' })) }),
  useAddVideoToPlaylist: () => ({ mutateAsync: vi.fn(async () => ({}) ) }),
}));

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

beforeEach(() => {
  useAuthMock.mockReturnValue({ user: null });
  usePlaylistsMock.mockReturnValue({
    data: [
      {
        id: 'playlist-1',
        name: 'Frontend Basics',
        slug: 'frontend-basics',
        description: null,
        author_id: 'user-1',
        thumbnail_url: null,
        course_code: null,
        unit_code: null,
        language: 'en',
        is_public: true,
        is_ordered: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    isLoading: false,
    isError: false,
  });
});

describe('Playlists page', () => {
  it('renders playlists from the hook', () => {
    renderWithProviders(<Playlists />);

    expect(screen.getByText('Frontend Basics')).toBeInTheDocument();
  });
});
