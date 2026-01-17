import { describe, expect, it, vi } from 'vitest';
import { fetchFeaturedVideos } from './fetchFeaturedVideos';
import type { VideoRepository } from '../infrastructure/VideoRepository';

const video = {
  id: '1',
  youtube_id: 'abc',
  title: 'Video',
  description: null,
  channel_name: 'Channel',
  duration_seconds: 120,
  thumbnail_url: 'https://example.com/thumb.jpg',
  language: 'pt',
  category_id: null,
  submitted_by: null,
  view_count: 100,
  is_featured: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-02',
};

describe('fetchFeaturedVideos', () => {
  it('returns featured videos when available', async () => {
    const repo: VideoRepository = {
      listVideos: vi.fn(),
      getVideoById: vi.fn(),
      listRelatedVideos: vi.fn(),
      listFeaturedVideos: vi.fn().mockResolvedValue([video]),
      listPopularVideos: vi.fn().mockResolvedValue([]),
      listRecentVideos: vi.fn(),
    };

    const result = await fetchFeaturedVideos(repo, 4);

    expect(result).toEqual([video]);
    expect(repo.listPopularVideos).not.toHaveBeenCalled();
  });

  it('falls back to popular videos when none are featured', async () => {
    const repo: VideoRepository = {
      listVideos: vi.fn(),
      getVideoById: vi.fn(),
      listRelatedVideos: vi.fn(),
      listFeaturedVideos: vi.fn().mockResolvedValue([]),
      listPopularVideos: vi.fn().mockResolvedValue([video]),
      listRecentVideos: vi.fn(),
    };

    const result = await fetchFeaturedVideos(repo, 4);

    expect(result).toEqual([video]);
    expect(repo.listPopularVideos).toHaveBeenCalledWith(4);
  });
});
