import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVideo, findVideoByYoutubeId } from '@/entities/video/video.api';
import { createVideoSubmission } from '@/entities/video_submission/video_submission.api';
import { useSubmitVideo } from './useSubmitVideo';

vi.mock('@/entities/video/video.api', () => ({
  createVideo: vi.fn(),
  findVideoByYoutubeId: vi.fn(),
}));

vi.mock('@/entities/video_submission/video_submission.api', () => ({
  createVideoSubmission: vi.fn(),
}));

const metadata = {
  videoId: 'BORLLC3FG2I',
  title: 'Education video',
  channelName: 'Open2 Channel',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  description: 'Useful educational content',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.mocked(createVideo).mockReset();
  vi.mocked(findVideoByYoutubeId).mockReset();
  vi.mocked(createVideoSubmission).mockReset();
});

describe('useSubmitVideo', () => {
  it('creates a pending submission without assigning a playlist before processing', async () => {
    vi.mocked(findVideoByYoutubeId).mockResolvedValue(null);
    vi.mocked(createVideo).mockResolvedValue({ id: 'video-1' } as Awaited<ReturnType<typeof createVideo>>);
    vi.mocked(createVideoSubmission).mockResolvedValue({ id: 'submission-1' } as Awaited<ReturnType<typeof createVideoSubmission>>);

    const { result } = renderHook(() => useSubmitVideo(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        metadata,
        userId: 'user-1',
        youtubeUrl: 'https://youtu.be/BORLLC3FG2I',
      });
    });

    expect(createVideoSubmission).toHaveBeenCalledWith({
      user_id: 'user-1',
      video_id: 'video-1',
      youtube_id: 'BORLLC3FG2I',
      youtube_url: 'https://youtu.be/BORLLC3FG2I',
      status: 'pending',
    });
  });

  it('marks duplicate submissions without assigning a playlist before processing', async () => {
    vi.mocked(findVideoByYoutubeId).mockResolvedValue({ id: 'existing-video-1' } as Awaited<ReturnType<typeof findVideoByYoutubeId>>);
    vi.mocked(createVideoSubmission).mockResolvedValue({ id: 'submission-1' } as Awaited<ReturnType<typeof createVideoSubmission>>);

    const { result } = renderHook(() => useSubmitVideo(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        metadata,
        userId: 'user-1',
        youtubeUrl: 'https://youtu.be/BORLLC3FG2I',
      });
    });

    expect(createVideo).not.toHaveBeenCalled();
    expect(createVideoSubmission).toHaveBeenCalledWith({
      user_id: 'user-1',
      youtube_id: 'BORLLC3FG2I',
      youtube_url: 'https://youtu.be/BORLLC3FG2I',
      duplicate_video_id: 'existing-video-1',
      status: 'duplicate',
      completed_at: expect.any(String),
      metadata: { reason: 'youtube_id_match' },
    });
  });
});
