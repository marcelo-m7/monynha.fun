import { describe, expect, it } from 'vitest';
import { extractYouTubeId, getYouTubeEmbedUrl, getYouTubeThumbnail, getYouTubeWatchUrl, extractYouTubePlaylistId } from './youtube';

describe('youtube helpers', () => {
  it('extracts YouTube IDs from supported URLs', () => {
    // Existing formats
    expect(extractYouTubeId('https://www.youtube.com/watch?v=abc123DEF45')).toBe('abc123DEF45');
    expect(extractYouTubeId('https://youtu.be/abc123DEF45')).toBe('abc123DEF45');
    expect(extractYouTubeId('https://www.youtube.com/embed/abc123DEF45')).toBe('abc123DEF45');
    expect(extractYouTubeId('https://www.youtube.com/v/abc123DEF45')).toBe('abc123DEF45');
    expect(extractYouTubeId('https://www.youtube.com/shorts/abc123DEF45')).toBe('abc123DEF45');
    expect(extractYouTubeId('abc123DEF45')).toBe('abc123DEF45');

    // New formats
    expect(extractYouTubeId('https://www.youtube.com/live/abc123DEF45')).toBe('abc123DEF45');
    expect(extractYouTubeId('https://www.youtube.com/watch/abc123DEF45')).toBe('abc123DEF45');
  });

  it('returns null for invalid YouTube URLs', () => {
    expect(extractYouTubeId('https://example.com/watch?v=abc123DEF45')).toBeNull();
    expect(extractYouTubeId('not-a-url')).toBeNull();
    expect(extractYouTubeId('https://www.youtube.com/invalid/abc123DEF45')).toBeNull();
    expect(extractYouTubeId('https://www.youtube.com/watch?v=short')).toBeNull(); // Too short ID
  });

  it('builds embed and thumbnail URLs', () => {
    const videoId = 'abc123DEF45';
    expect(getYouTubeEmbedUrl(videoId)).toBe('https://www.youtube.com/embed/abc123DEF45');
    expect(getYouTubeThumbnail(videoId, 'high')).toBe(
      'https://img.youtube.com/vi/abc123DEF45/hqdefault.jpg',
    );
    expect(getYouTubeWatchUrl(videoId)).toBe('https://www.youtube.com/watch?v=abc123DEF45');
  });

  it('extracts YouTube playlist IDs from supported URLs', () => {
    expect(extractYouTubePlaylistId('https://www.youtube.com/playlist?list=PLqRRLx0cl0hq0T4SV-BHhCicWOpzyWcHd')).toBe('PLqRRLx0cl0hq0T4SV-BHhCicWOpzyWcHd');
    expect(extractYouTubePlaylistId('https://www.youtube.com/watch?v=VIDEO_ID&list=PLqRRLx0cl0hq0T4SV-BHhCicWOpzyWcHd')).toBe('PLqRRLx0cl0hq0T4SV-BHhCicWOpzyWcHd');
    expect(extractYouTubePlaylistId('https://www.youtube.com/watch?v=VIDEO_ID&list=PLqRRLx0cl0hq0T4SV-BHhCicWOpzyWcHd&index=1')).toBe('PLqRRLx0cl0hq0T4SV-BHhCicWOpzyWcHd');
  });

  it('returns null for URLs without a playlist ID', () => {
    expect(extractYouTubePlaylistId('https://www.youtube.com/watch?v=VIDEO_ID')).toBeNull();
    expect(extractYouTubePlaylistId('https://www.youtube.com/')).toBeNull();
    expect(extractYouTubePlaylistId('https://example.com/playlist?list=ID')).toBeNull(); // Invalid domain
  });
});