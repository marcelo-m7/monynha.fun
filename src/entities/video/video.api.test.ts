import { describe, expect, it } from 'vitest';
import { getVideoLookupColumn } from './video.api';

describe('video API route lookup', () => {
  it('uses the UUID column for legacy id URLs', () => {
    expect(getVideoLookupColumn('550e8400-e29b-41d4-a716-446655440000')).toBe('id');
  });

  it('uses the YouTube column for legacy YouTube id URLs', () => {
    expect(getVideoLookupColumn('abc123DEF45')).toBe('youtube_id');
  });

  it('uses the slug column for canonical title slugs', () => {
    expect(getVideoLookupColumn('educacao-ia-aula-1')).toBe('slug');
  });
});
