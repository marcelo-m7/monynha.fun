import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getLatestVideoAnalysisJobBySubmissionId,
  getLatestVideoAnalysisJobByVideoId,
  listVideoAnalysisJobs,
  updateVideoAnalysisJob,
} from '@/entities/video_analysis_job/video_analysis_job.api';
import { videoAnalysisJobKeys } from '@/entities/video_analysis_job/video_analysis_job.keys';
import type { VideoAnalysisJob, VideoAnalysisJobUpdate } from '@/entities/video_analysis_job/video_analysis_job.types';

const ACTIVE_STATUSES = new Set(['pending', 'processing', 'recoverable_error']);

function isActiveAnalysisStatus(status: string | null | undefined) {
  return !!status && ACTIVE_STATUSES.has(status);
}

export function useLatestVideoAnalysisJob(params: {
  videoId?: string | null;
  submissionId?: string | null;
}) {
  const key = params.videoId
    ? videoAnalysisJobKeys.byVideo(params.videoId)
    : params.submissionId
      ? videoAnalysisJobKeys.bySubmission(params.submissionId)
      : videoAnalysisJobKeys.byVideo('');

  return useQuery<VideoAnalysisJob | null, Error>({
    queryKey: key,
    queryFn: async () => {
      if (params.videoId) return getLatestVideoAnalysisJobByVideoId(params.videoId);
      if (params.submissionId) return getLatestVideoAnalysisJobBySubmissionId(params.submissionId);
      return null;
    },
    enabled: !!params.videoId || !!params.submissionId,
    refetchInterval: (query) => (
      isActiveAnalysisStatus(query.state.data?.status) ? 5000 : false
    ),
  });
}

export function useVideoAnalysisJobs(params: { status?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: videoAnalysisJobKeys.list(params),
    queryFn: () => listVideoAnalysisJobs(params),
  });
}

export function useUpdateVideoAnalysisJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: VideoAnalysisJobUpdate }) =>
      updateVideoAnalysisJob(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videoAnalysisJobKeys.all });
    },
  });
}
