import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getVideoSubmissionById, getVideoSubmissionsByIds, markVideoSubmissionClientError } from '@/entities/video_submission/video_submission.api';
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

export function useVideoSubmissions(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

  return useQuery<VideoSubmission[], Error>({
    queryKey: videoSubmissionKeys.list(uniqueIds),
    queryFn: () => getVideoSubmissionsByIds(uniqueIds),
    enabled: uniqueIds.length > 0,
    refetchInterval: (query) => {
      const submissions = query.state.data ?? [];
      return submissions.length > 0 && submissions.every((submission) => isTerminalStatus(submission.status))
        ? false
        : 2500;
    },
  });
}

export interface StartSubmissionProcessingPayload {
  submissionId: string;
  videoId: string;
  youtubeUrl: string;
}

export async function startVideoSubmissionProcessing(payload: StartSubmissionProcessingPayload) {
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
}

export function useStartSubmissionProcessing() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, StartSubmissionProcessingPayload>({
    mutationFn: startVideoSubmissionProcessing,
    onSettled: (_data, _error, variables) => {
      if (variables) {
        queryClient.invalidateQueries({ queryKey: videoSubmissionKeys.detail(variables.submissionId) });
        queryClient.invalidateQueries({ queryKey: videoAnalysisJobKeys.bySubmission(variables.submissionId) });
        queryClient.invalidateQueries({ queryKey: videoAnalysisJobKeys.byVideo(variables.videoId) });
      }
    },
  });
}
