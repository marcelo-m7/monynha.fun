import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getHomeExhibition } from './home.api';

const maybeSingle = vi.fn();

vi.mock('@/shared/api/supabase/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        maybeSingle,
      })),
    })),
  },
}));

describe('getHomeExhibition', () => {
  beforeEach(() => {
    maybeSingle.mockReset();
  });

  it('maps the public home exhibition row defensively', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        generated_at: '2026-06-04T11:14:29.000Z',
        metrics: {
          videos_total: 465,
          playlists_total: 84,
          categories_total: 8,
          videos_with_summaries: 431,
          videos_with_tags: 429,
        },
        hero_videos: [
          {
            id: 'video-1',
            slug: 'learning-video',
            youtube_id: 'abc123',
            title: 'Learning video',
            channel_name: 'Open 2',
            thumbnail_url: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
            language: 'pt',
            duration_seconds: 360,
            view_count: 1200,
            favorites_count: 4,
            playlist_add_count: 2,
            category_name: 'IA',
            category_color: '#efff00',
            summary: 'Resumo curto',
            semantic_tags: ['ia', 'aprendizagem', 42],
          },
        ],
        categories: [{ id: 'cat-1', name: 'IA', slug: 'ia', color: '#efff00', video_count: 12 }],
        featured_playlists: [{ id: 'pl-1', name: 'Trilha', slug: 'trilha', video_count: 3 }],
        facodi_highlights: [{ playlist_id: 'pl-2', course_code: 'LESTI', course_name: 'LESTI', playlist_name: 'FACODI', playlist_slug: 'facodi', video_count: 6 }],
        curation_signals: { with_summaries: 431, with_tags: 429, transcripts_completed: 7, recent_submissions: 319 },
      },
      error: null,
    });

    const result = await getHomeExhibition();

    expect(result.metrics.videos_total).toBe(465);
    expect(result.metrics.public_non_empty_playlists).toBe(0);
    expect(result.hero_videos[0]).toMatchObject({
      id: 'video-1',
      semantic_tags: ['ia', 'aprendizagem'],
    });
    expect(result.categories[0]).toMatchObject({ slug: 'ia', icon: 'folder' });
    expect(result.featured_playlists[0].language).toBe('und');
    expect(result.facodi_highlights[0].video_range).toBe('empty');
  });

  it('returns an empty exhibition fallback when the view has no row', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getHomeExhibition();

    expect(result.metrics.videos_total).toBe(0);
    expect(result.hero_videos).toEqual([]);
    expect(result.categories).toEqual([]);
    expect(result.featured_playlists).toEqual([]);
    expect(result.facodi_highlights).toEqual([]);
  });
});
