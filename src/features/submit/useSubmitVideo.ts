import { useMutation } from '@tanstack/react-query';
import { createVideo, findVideoByYoutubeId } from '@/entities/video/video.api';
import type { Video } from '@/entities/video/video.types';
import { createVideoSubmission } from '@/entities/video_submission/video_submission.api';
import type { VideoSubmission } from '@/entities/video_submission/video_submission.types';
import type { YouTubeMetadata } from './useYouTubeMetadata';
import { generateSlug } from '@/shared/lib/slug';

export interface SubmitVideoPayload {
  metadata: YouTubeMetadata;
  description?: string;
  categoryId?: string;
  userId: string;
  youtubeUrl: string;
}

export type SubmitVideoResult =
  | { status: 'duplicate'; submission: VideoSubmission; videoId: string }
  | { status: 'created'; video: Video; submission: VideoSubmission };

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

      const newVideo = await createVideo({
        youtube_id: payload.metadata.videoId,
        slug: generateSlug(payload.metadata.title),
        title: payload.metadata.title,
        description: payload.description || payload.metadata.description || null,
        channel_name: payload.metadata.channelName,
        thumbnail_url: payload.metadata.thumbnailUrl,
        category_id: payload.categoryId || null,
        submitted_by: payload.userId,
      });

      const submission = await createVideoSubmission({
        user_id: payload.userId,
        video_id: newVideo.id,
        youtube_id: payload.metadata.videoId,
        youtube_url: payload.youtubeUrl,
        status: 'pending',
      });

      return { status: 'created', video: newVideo, submission } as const;
    },
  });
}
