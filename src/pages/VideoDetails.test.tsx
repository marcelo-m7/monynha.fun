import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoDetails from './VideoDetails';
import { renderWithProviders } from '@/shared/test/renderWithProviders';
import type { VideoWithCategory } from '@/entities/video/video.types';

const useAuthMock = vi.fn();
const useVideoByIdMock = vi.fn();
const useRelatedVideosMock = vi.fn();
const useUpdateVideoMock = vi.fn();
const useDeleteVideoMock = vi.fn();
const useCategoriesMock = vi.fn();
const useProfileByIdMock = vi.fn();
const useIsFavoritedMock = vi.fn();
const useAddFavoriteMock = vi.fn();
const useRemoveFavoriteMock = vi.fn();

vi.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header" />,
}));

vi.mock('@/components/layout/Footer', () => ({
  Footer: () => <footer data-testid="footer" />,
}));

vi.mock('@/components/comment/CommentsSection', () => ({
  CommentsSection: () => <section data-testid="comments" />,
}));

vi.mock('@/components/video/VideoCard', () => ({
  VideoCard: ({ video }: { video: VideoWithCategory }) => <article>{video.title}</article>,
}));

vi.mock('@/shared/hooks/useMetaTags', () => ({
  useMetaTags: vi.fn(),
}));

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/features/categories/queries/useCategories', () => ({
  useCategories: () => useCategoriesMock(),
}));

vi.mock('@/features/videos/queries/useVideos', () => ({
  useVideoById: () => useVideoByIdMock(),
  useRelatedVideos: () => useRelatedVideosMock(),
  useUpdateVideo: () => useUpdateVideoMock(),
  useDeleteVideo: () => useDeleteVideoMock(),
}));

vi.mock('@/features/profile/queries/useProfile', () => ({
  useProfileById: () => useProfileByIdMock(),
}));

vi.mock('@/features/favorites/queries/useFavorites', () => ({
  useIsFavorited: () => useIsFavoritedMock(),
  useAddFavorite: () => useAddFavoriteMock(),
  useRemoveFavorite: () => useRemoveFavoriteMock(),
}));

const sampleVideo: VideoWithCategory = {
  id: 'video-1',
  youtube_id: 'abc123DEF45',
  title: 'Learning React',
  description: 'React basics',
  channel_name: 'Open2 Channel',
  duration_seconds: 125,
  favorites_count: 10,
  thumbnail_url: 'https://example.com/thumb.jpg',
  language: 'en',
  playlist_add_count: 3,
  category_id: 'cat-1',
  submitted_by: 'owner-1',
  view_count: 1200,
  is_featured: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  category: {
    id: 'cat-1',
    name: 'Frontend',
    slug: 'frontend',
    color: '#000000',
    icon: 'BookOpen',
    created_at: new Date().toISOString(),
  },
};

function renderVideoDetails() {
  return renderWithProviders(
    <Routes>
      <Route path="/videos/:videoId" element={<VideoDetails />} />
    </Routes>,
    { route: '/videos/video-1' },
  );
}

beforeEach(() => {
  useAuthMock.mockReturnValue({ user: { id: 'owner-1' }, loading: false });
  useVideoByIdMock.mockReturnValue({ data: sampleVideo, isLoading: false, isError: false });
  useRelatedVideosMock.mockReturnValue({ data: [], isLoading: false });
  useCategoriesMock.mockReturnValue({
    data: [
      {
        id: 'cat-1',
        name: 'Frontend',
        slug: 'frontend',
        color: '#000000',
        icon: 'BookOpen',
        created_at: new Date().toISOString(),
      },
    ],
  });
  useProfileByIdMock.mockReturnValue({
    data: { id: 'owner-1', username: 'owner', display_name: 'Owner', avatar_url: null },
  });
  useIsFavoritedMock.mockReturnValue({ data: false, isLoading: false });
  useAddFavoriteMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  useRemoveFavoriteMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  useUpdateVideoMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  useDeleteVideoMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
});

describe('VideoDetails owner management', () => {
  it('shows edit and delete actions to the video owner', () => {
    renderVideoDetails();

    expect(screen.getByLabelText('Edit video')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove video')).toBeInTheDocument();
  });

  it('hides edit and delete actions from other users', () => {
    useAuthMock.mockReturnValue({ user: { id: 'other-user' }, loading: false });

    renderVideoDetails();

    expect(screen.getAllByText('Learning React')[0]).toBeInTheDocument();
    expect(screen.queryByLabelText('Edit video')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Remove video')).not.toBeInTheDocument();
  });

  it('shows the canonical language and automatic detection hint when enrichment matches', () => {
    useVideoByIdMock.mockReturnValue({
      data: {
        ...sampleVideo,
        language: 'pt',
        enrichment: { language: 'pt' },
      },
      isLoading: false,
      isError: false,
    });

    renderVideoDetails();

    expect(screen.getByText(/Language:/)).toBeInTheDocument();
    expect(screen.getByText(/Portuguese/)).toBeInTheDocument();
    expect(screen.getByText('(Detected automatically)')).toBeInTheDocument();
  });

  it('shows a detecting state while the canonical language is unknown', () => {
    useVideoByIdMock.mockReturnValue({
      data: {
        ...sampleVideo,
        language: 'und',
      },
      isLoading: false,
      isError: false,
    });

    renderVideoDetails();

    expect(screen.getByText(/Detecting language/)).toBeInTheDocument();
  });

  it('submits edited metadata through the update mutation', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue(sampleVideo);
    useUpdateVideoMock.mockReturnValue({ mutateAsync, isPending: false });

    renderVideoDetails();

    await user.click(screen.getByLabelText('Edit video'));
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Updated title');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      id: 'video-1',
      title: 'Updated title',
      description: 'React basics',
      category_id: 'cat-1',
      language: 'en',
    });
  });
});
