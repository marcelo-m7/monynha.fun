import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getVideoSubmissionById, markVideoSubmissionClientError } from '@/entities/video_submission/video_submission.api';
import { videoAnalysisJobKeys } from '@/entities/video_analysis_job/video_analysis_job.keys';
import { videoSubmissionKeys } from '@/entities/video_submission/video_submission.keys';
import type { VideoSubmission, VideoSubmissionStatus } from '@/entities/video_submission/video_submission.types';
import { getEdgeFunctionErrorDetails, invokeEdgeFunction } from '@/shared/api/supabase/edgeFunctions';

const TERMINAL_STATUSES: VideoSubmissionStatus[] = [
  'success',
  'failed',
  'duplicate',
  'recoverable_error',
];

function isTerminalStatus(status: string | null | undefined) {
  return TERMINAL_STATUSES.includes(status as VideoSubmissionStatus);
}

export function useVideoSubmission(id: string | undefined) {
  return useQuery<VideoSubmission | null, Error>({
    queryKey: id ? videoSubmissionKeys.detail(id) : videoSubmissionKeys.detail(''),
    queryFn: async () => {
      if (!id) return null;
      return getVideoSubmissionById(id);
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && isTerminalStatus(status) ? false : 2500;
    },
  });
}

export interface StartSubmissionProcessingPayload {
  submissionId: string;
  videoId: string;
  youtubeUrl: string;
}

export function useStartSubmissionProcessing() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, StartSubmissionProcessingPayload>({
    mutationFn: async (payload) => {
      const { data, error } = await invokeEdgeFunction('enrich-video', {
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      });

      if (error) {
        const details = await getEdgeFunctionErrorDetails(error);
        const message = details.requestId
          ? `${details.message} (request ${details.requestId})`
          : details.message;

        await markVideoSubmissionClientError({
          submissionId: payload.submissionId,
          errorMessage: message,
          errorCode: details.code,
          stage: details.stage ?? 'start_processing',
        }).catch(() => undefined);

        throw new Error(message);
      }

      return data;
    },
    onSettled: (_data, _error, variables) => {
      if (variables) {
        queryClient.invalidateQueries({ queryKey: videoSubmissionKeys.detail(variables.submissionId) });
        queryClient.invalidateQueries({ queryKey: videoAnalysisJobKeys.bySubmission(variables.submissionId) });
        queryClient.invalidateQueries({ queryKey: videoAnalysisJobKeys.byVideo(variables.videoId) });
      }
    },
  });
}
