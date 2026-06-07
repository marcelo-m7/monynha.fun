import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRecentVideoSubmissions, getVideoSubmissionById, getVideoSubmissionsByIds, markVideoSubmissionClientError } from '@/entities/video_submission/video_submission.api';
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

function submissionRefetchInterval(status: string | null | undefined) {
  if (!status) return 5000;
  if (isTerminalStatus(status)) return false;
  return status === 'processing' ? 1000 : 5000;
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
      return submissionRefetchInterval(status);
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
      if (submissions.length === 0) return 5000;
      if (submissions.every((submission) => isTerminalStatus(submission.status))) return false;
      if (submissions.some((submission) => submission.status === 'processing')) return 1000;
      return 5000;
    },
  });
}

export function useRecentVideoSubmissions(limit = 100, enabled = true) {
  return useQuery<VideoSubmission[], Error>({
    queryKey: [...videoSubmissionKeys.all, 'recent', limit],
    queryFn: () => getRecentVideoSubmissions(limit),
    enabled,
    refetchInterval: (query) => {
      const submissions = query.state.data ?? [];
      if (submissions.length === 0) return 5000;
      if (submissions.some((submission) => submission.status === 'processing' || submission.status === 'pending')) return 1500;
      return 5000;
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
    const retryAfterSuffix = details.retryAfterSeconds && details.retryAfterSeconds > 0
      ? ` Retry after ${Math.round(details.retryAfterSeconds)}s.`
      : '';
    const messageWithRetry = `${details.message}${retryAfterSuffix}`;
    const message = details.requestId
      ? `${messageWithRetry} (request ${details.requestId})`
      : messageWithRetry;

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
