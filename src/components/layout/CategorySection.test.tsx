import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { CategorySection } from './CategorySection';
import { renderWithProviders } from '@/shared/test/renderWithProviders';
import type { Category } from '@/entities/category/category.types';
import type { VideoWithCategory } from '@/entities/video/video.types';

const useCategoriesMock = vi.fn();
const useVideosMock = vi.fn();

vi.mock('@/features/categories/queries/useCategories', () => ({
  useCategories: () => useCategoriesMock(),
}));

vi.mock('@/features/videos/queries/useVideos', () => ({
  useVideos: (params?: unknown) => useVideosMock(params),
}));

const sampleCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Frontend',
    slug: 'frontend',
    color: '#000000',
    icon: 'BookOpen',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    name: 'Backend',
    slug: 'backend',
    color: '#111111',
    icon: 'Globe',
    created_at: new Date().toISOString(),
  },
];

const sampleVideos: VideoWithCategory[] = [
  {
    id: 'video-1',
    youtube_id: 'abc123DEF45',
    title: 'Learning React',
    description: 'React basics',
    channel_name: 'Monynha',
    duration_seconds: 125,
    favorites_count: 10,
    thumbnail_url: 'https://example.com/thumb.jpg',
    language: 'en',
    playlist_add_count: 3,
    category_id: 'cat-1',
    submitted_by: 'user-1',
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
  },
  {
    id: 'video-2',
    youtube_id: 'xyz987',
    title: 'Advanced React',
    description: 'Hooks and more',
    channel_name: 'Monynha',
    duration_seconds: 300,
    favorites_count: 5,
    thumbnail_url: 'https://example.com/thumb2.jpg',
    language: 'en',
    playlist_add_count: 2,
    category_id: 'cat-1',
    submitted_by: 'user-2',
    view_count: 300,
    is_featured: false,
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
  },
];

describe('CategorySection', () => {
  it('renders video counts per category', () => {
    useCategoriesMock.mockReturnValue({
      data: sampleCategories,
      isLoading: false,
      isError: false,
    });
    useVideosMock.mockReturnValue({
      data: sampleVideos,
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<CategorySection />);

    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('2 vídeos')).toBeInTheDocument();
    expect(screen.getByText('0 vídeos')).toBeInTheDocument();
  });
});
