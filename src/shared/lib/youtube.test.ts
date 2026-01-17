import { describe, expect, it } from 'vitest';
import { extractYouTubeId, getYouTubeEmbedUrl, getYouTubeThumbnail } from './youtube';

describe('youtube helpers', () => {
  it('extracts YouTube IDs from supported URLs', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=abc123DEF45')).toBe('abc123DEF45');
    expect(extractYouTubeId('https://youtu.be/abc123DEF45')).toBe('abc123DEF45');
    expect(extractYouTubeId('abc123DEF45')).toBe('abc123DEF45');
  });

  it('returns null for invalid YouTube URLs', () => {
    expect(extractYouTubeId('https://example.com/watch?v=abc123DEF45')).toBeNull();
    expect(extractYouTubeId('not-a-url')).toBeNull();
  });

  it('builds embed and thumbnail URLs', () => {
    expect(getYouTubeEmbedUrl('abc123DEF45')).toBe('https://www.youtube.com/embed/abc123DEF45');
    expect(getYouTubeThumbnail('abc123DEF45', 'high')).toBe(
      'https://img.youtube.com/vi/abc123DEF45/hqdefault.jpg',
    );
  });
});
