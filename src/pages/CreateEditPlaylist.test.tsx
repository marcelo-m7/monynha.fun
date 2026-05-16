import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import CreateEditPlaylist from './CreateEditPlaylist';
import { renderWithProviders } from '@/shared/test/renderWithProviders';

const useAuthMock = vi.fn();
const useCurrentUserProfileMock = vi.fn();
const usePlaylistByIdMock = vi.fn();
const useCreatePlaylistMock = vi.fn();
const useUpdatePlaylistMock = vi.fn();
const createPlaylistMutateAsyncMock = vi.fn();
const updatePlaylistMutateAsyncMock = vi.fn();

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/components/layout/Header', () => ({
  Header: () => <header />,
}));

vi.mock('@/components/layout/Footer', () => ({
  Footer: () => <footer />,
}));

vi.mock('@/features/profile/queries/useProfile', () => ({
  useCurrentUserProfile: () => useCurrentUserProfileMock(),
}));

vi.mock('@/features/playlists/queries/usePlaylists', () => ({
  usePlaylistById: () => usePlaylistByIdMock(),
  useCreatePlaylist: () => useCreatePlaylistMock(),
  useUpdatePlaylist: () => useUpdatePlaylistMock(),
}));

beforeEach(() => {
  useAuthMock.mockReturnValue({ user: { id: 'user-1' }, loading: false });
  useCurrentUserProfileMock.mockReturnValue({
    data: { id: 'user-1', role: 'user' },
    isLoading: false,
  });
  usePlaylistByIdMock.mockReturnValue({
    data: null,
    isLoading: false,
    isError: false,
  });
  useCreatePlaylistMock.mockReturnValue({
    mutateAsync: createPlaylistMutateAsyncMock,
    isPending: false,
  });
  useUpdatePlaylistMock.mockReturnValue({
    mutateAsync: updatePlaylistMutateAsyncMock,
    isPending: false,
  });
  createPlaylistMutateAsyncMock.mockReset();
  createPlaylistMutateAsyncMock.mockResolvedValue({ id: 'playlist-1' });
  updatePlaylistMutateAsyncMock.mockReset();
  updatePlaylistMutateAsyncMock.mockResolvedValue({ id: 'playlist-1' });
});

describe('CreateEditPlaylist page', () => {
  it('hides the FACODI learning path option for a regular profile', () => {
    renderWithProviders(<CreateEditPlaylist />, { route: '/playlists/new' });

    expect(screen.getByText('Collection')).toBeInTheDocument();
    expect(screen.queryByText('Learning Path')).not.toBeInTheDocument();
  });

  it('shows the FACODI learning path option for an editor profile', () => {
    useCurrentUserProfileMock.mockReturnValue({
      data: { id: 'user-1', role: 'editor' },
      isLoading: false,
    });

    renderWithProviders(<CreateEditPlaylist />, { route: '/playlists/new' });

    expect(screen.getByText('Collection')).toBeInTheDocument();
    expect(screen.getByText('Learning Path')).toBeInTheDocument();
  });

  it('creates only a regular collection payload for a regular profile', async () => {
    renderWithProviders(<CreateEditPlaylist />, { route: '/playlists/new' });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/playlist name/i), 'Regular Collection');
    await user.click(screen.getByRole('button', { name: /create playlist/i }));

    await waitFor(() => {
      expect(createPlaylistMutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Regular Collection',
          slug: 'regular-collection',
          is_ordered: false,
          course_code: null,
          unit_code: null,
        }),
      );
    });
  });

  it('blocks regular profiles from editing an existing FACODI playlist', () => {
    usePlaylistByIdMock.mockReturnValue({
      data: {
        id: 'playlist-1',
        name: 'FACODI Path',
        slug: 'facodi-path',
        description: null,
        thumbnail_url: null,
        course_code: 'FACODI-101',
        unit_code: 'INTRO',
        language: 'pt',
        is_public: true,
        is_ordered: true,
      },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(
      <Routes>
        <Route path="/playlists/:playlistId/edit" element={<CreateEditPlaylist />} />
      </Routes>,
      { route: '/playlists/playlist-1/edit' },
    );

    expect(screen.getByText('Restricted area')).toBeInTheDocument();
    expect(screen.getByText('FACODI study playlists can only be created or edited by eligible profiles.')).toBeInTheDocument();
    expect(updatePlaylistMutateAsyncMock).not.toHaveBeenCalled();
  });
});
