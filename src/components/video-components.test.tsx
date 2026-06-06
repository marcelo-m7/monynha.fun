import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoCard } from './video/VideoCard';
import { FeaturedHero } from './layout/FeaturedHero';
import { renderWithProviders } from '@/shared/test/renderWithProviders';
import type { VideoWithCategory } from '@/entities/video/video.types';

const incrementVideoViewCount = vi.fn().mockResolvedValue({ data: 1201 });

vi.mock('@/entities/video/video.api', () => ({
  incrementVideoViewCount: (...args: unknown[]) => incrementVideoViewCount(...args),
}));

const sampleVideo: VideoWithCategory = {
  id: 'video-1',
  slug: 'learning-react',
  youtube_id: 'abc123DEF45',
  title: 'Learning React',
  description: 'React basics',
  channel_name: 'Monynha',
  duration_seconds: 125,
  enrichment: {
    id: 'enrichment-1',
    video_id: 'video-1',
    cultural_relevance: 'Useful learning material',
    language: 'en',
    semantic_tags: ['react', 'frontend', 'learning'],
    optimized_title: null,
    short_summary: 'React introduction summary',
    summary_description: 'React basics for frontend developers',
    suggested_category_id: 'cat-1',
    reprocessed_at: null,
    created_at: new Date().toISOString(),
  },
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
};

describe('video components', () => {
  it('renders VideoCard details', () => {
    renderWithProviders(<VideoCard video={sampleVideo} />);

    expect(screen.getByText('Learning React')).toBeInTheDocument();
    expect(screen.getByText('Monynha')).toBeInTheDocument();
    expect(screen.getByText('2:05')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
  });

  it('formats hour-long durations on cards', () => {
    renderWithProviders(<VideoCard video={{ ...sampleVideo, duration_seconds: 3903 }} />);

    expect(screen.getByText('1:05:03')).toBeInTheDocument();
  });

  it('renders FeaturedHero headline', () => {
    renderWithProviders(<FeaturedHero video={sampleVideo} />);

    expect(screen.getByText('Learning React')).toBeInTheDocument();
    expect(screen.getByText('React basics')).toBeInTheDocument();
  });

  it('increments view count with session id on click', async () => {
    window.localStorage.setItem('video-vault-session-id', 'session-123');
    const user = userEvent.setup();

    renderWithProviders(<VideoCard video={sampleVideo} />);
    await user.click(screen.getByRole('link', { name: 'Learning React' }));

    expect(incrementVideoViewCount).toHaveBeenCalledWith('video-1', 'session-123');
  });
});
