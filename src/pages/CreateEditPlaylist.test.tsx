import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import CreateEditPlaylist from './CreateEditPlaylist';
import { renderWithProviders } from '@/shared/test/renderWithProviders';

const useAuthMock = vi.fn();
const useCurrentUserProfileMock = vi.fn();
const usePlaylistByIdMock = vi.fn();
const useCreatePlaylistMock = vi.fn();
const useUpdatePlaylistMock = vi.fn();

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => useAuthMock(),
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
    mutateAsync: vi.fn(),
    isPending: false,
  });
  useUpdatePlaylistMock.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
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
});
