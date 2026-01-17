import { useMutation } from '@tanstack/react-query';
import { createVideo, findVideoByYoutubeId } from '@/entities/video/video.api';
import type { Video } from '@/entities/video/video.types';
import { invokeEdgeFunction } from '@/shared/api/supabase/edgeFunctions';
import type { YouTubeMetadata } from './useYouTubeMetadata';

export interface SubmitVideoPayload {
  metadata: YouTubeMetadata;
  description?: string;
  language: string;
  categoryId?: string;
  userId: string;
  youtubeUrl: string;
}

export type SubmitVideoResult =
  | { status: 'exists' }
  | { status: 'created'; video: Video; edgeError?: Error | null };

export function useSubmitVideo() {
  return useMutation<SubmitVideoResult, Error, SubmitVideoPayload>({
    mutationFn: async (payload) => {
      const existingVideo = await findVideoByYoutubeId(payload.metadata.videoId);

      if (existingVideo) {
        return { status: 'exists' } as const;
      }

      const newVideo = await createVideo({
        youtube_id: payload.metadata.videoId,
        title: payload.metadata.title,
        description: payload.description || payload.metadata.description || null,
        channel_name: payload.metadata.channelName,
        thumbnail_url: payload.metadata.thumbnailUrl,
        language: payload.language,
        category_id: payload.categoryId || null,
        submitted_by: payload.userId,
      });

      let edgeError: Error | null = null;
      try {
        const { error } = await invokeEdgeFunction('enrich-video', {
          body: { videoId: newVideo.id, youtubeUrl: payload.youtubeUrl },
          headers: { 'Content-Type': 'application/json' },
        });

        if (error) {
          edgeError = error as Error;
        }
      } catch (err) {
        edgeError = err instanceof Error ? err : new Error(String(err));
      }

      return { status: 'created', video: newVideo, edgeError } as const;
    },
  });
}
