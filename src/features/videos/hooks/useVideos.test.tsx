import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useVideos } from './useVideos';
import type { Video } from '../types/Video';

const videos: Video[] = [
  {
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
    is_featured: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-02',
  },
];

vi.mock('../useCases/fetchVideos', () => ({
  fetchVideos: vi.fn().mockResolvedValue(videos),
}));

describe('useVideos', () => {
  it('returns videos from the fetch use case', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useVideos(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(videos);
  });
});
