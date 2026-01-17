import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { VideoCard } from './VideoCard';
import { FeaturedHero } from './FeaturedHero';
import { renderWithProviders } from '@/shared/test/renderWithProviders';
import type { VideoWithCategory } from '@/entities/video/video.types';

vi.mock('@/entities/video/video.api', () => ({
  incrementVideoViewCount: vi.fn().mockResolvedValue({}),
}));

const sampleVideo: VideoWithCategory = {
  id: 'video-1',
  youtube_id: 'abc123DEF45',
  title: 'Learning React',
  description: 'React basics',
  channel_name: 'Monynha',
  duration_seconds: 125,
  thumbnail_url: 'https://example.com/thumb.jpg',
  language: 'en',
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
};

describe('video components', () => {
  it('renders VideoCard details', () => {
    renderWithProviders(<VideoCard video={sampleVideo} />);

    expect(screen.getByText('Learning React')).toBeInTheDocument();
    expect(screen.getByText('Monynha')).toBeInTheDocument();
  });

  it('renders FeaturedHero headline', () => {
    renderWithProviders(<FeaturedHero video={sampleVideo} />);

    expect(screen.getByText('Learning React')).toBeInTheDocument();
    expect(screen.getByText('React basics')).toBeInTheDocument();
  });
});
