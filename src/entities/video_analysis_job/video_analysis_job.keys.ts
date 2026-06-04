export const videoAnalysisJobKeys = {
  all: ['video-analysis-jobs'] as const,
  lists: () => [...videoAnalysisJobKeys.all, 'list'] as const,
  list: (params: { status?: string; limit?: number } = {}) =>
    [...videoAnalysisJobKeys.lists(), {
      status: params.status ?? '',
      limit: params.limit ?? null,
    }] as const,
  byVideo: (videoId: string) => [...videoAnalysisJobKeys.all, 'by-video', videoId] as const,
  bySubmission: (submissionId: string) => [...videoAnalysisJobKeys.all, 'by-submission', submissionId] as const,
};
