import { useMutation } from '@tanstack/react-query';
import { findVideoByYoutubeId } from '@/entities/video/video.api';
import { createVideoSubmission } from '@/entities/video_submission/video_submission.api';
import type { VideoSubmission } from '@/entities/video_submission/video_submission.types';
import type { YouTubeMetadata } from './useYouTubeMetadata';
import { getEdgeFunctionErrorDetails, invokeEdgeFunction } from '@/shared/api/supabase/edgeFunctions';

export interface SubmitVideoPayload {
  metadata: YouTubeMetadata;
  description?: string;
  categoryId?: string;
  userId: string;
  youtubeUrl: string;
}

export type SubmitVideoResult =
  | { status: 'duplicate'; submission: VideoSubmission; videoId: string }
  | { status: 'processing'; submissionId: string; videoId: string; requestId?: string };

interface ImportVideoResponse {
  status: 'processing';
  submissionId: string;
  videoId: string;
  requestId?: string;
}

export function useSubmitVideo() {
  return useMutation<SubmitVideoResult, Error, SubmitVideoPayload>({
    mutationFn: async (payload) => {
      const existingVideo = await findVideoByYoutubeId(payload.metadata.videoId);

      if (existingVideo) {
        const submission = await createVideoSubmission({
          user_id: payload.userId,
          youtube_id: payload.metadata.videoId,
          youtube_url: payload.youtubeUrl,
          duplicate_video_id: existingVideo.id,
          status: 'duplicate',
          completed_at: new Date().toISOString(),
          metadata: { reason: 'youtube_id_match' },
        });

        return { status: 'duplicate', submission, videoId: existingVideo.id } as const;
      }

      const { data, error } = await invokeEdgeFunction<ImportVideoResponse>('import-video', {
        body: {
          youtubeUrl: payload.youtubeUrl,
          submissionId: crypto.randomUUID(),
          idempotencyKey: crypto.randomUUID(),
        },
        headers: { 'Content-Type': 'application/json' },
      });

      if (error) {
        const details = await getEdgeFunctionErrorDetails(error);
        throw new Error(details.requestId ? `${details.message} (request ${details.requestId})` : details.message);
      }

      if (!data?.videoId || !data?.submissionId) {
        throw new Error('No import response returned');
      }

      return {
        status: 'processing',
        submissionId: data.submissionId,
        videoId: data.videoId,
        requestId: data.requestId,
      } as const;
    },
  });
}
