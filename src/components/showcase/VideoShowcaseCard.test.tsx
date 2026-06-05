import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import type { HomeHeroVideo } from '@/entities/home/home.types';
import { renderWithProviders } from '@/shared/test/renderWithProviders';
import { VideoShowcaseCard } from './VideoShowcaseCard';

const video: HomeHeroVideo = {
  id: 'video-1',
  youtube_id: 'abc123DEF45',
  title: 'Aprender com calma',
  channel_name: 'Tube O2',
  thumbnail_url: 'https://example.com/thumb.jpg',
  language: 'pt',
  duration_seconds: 125,
  view_count: 42,
  favorites_count: 4,
  playlist_add_count: 2,
  category_name: 'Educação',
  category_slug: 'educacao',
  category_color: '#efff00',
  summary: 'Resumo curto',
  semantic_tags: ['aprendizagem'],
};

describe('VideoShowcaseCard', () => {
  it('renders duration when available', () => {
    renderWithProviders(<VideoShowcaseCard video={video} />);

    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('does not render a fake zero duration', () => {
    renderWithProviders(<VideoShowcaseCard video={{ ...video, duration_seconds: null }} />);

    expect(screen.queryByText('0:00')).not.toBeInTheDocument();
  });
});
