export const videoSubmissionKeys = {
  all: ['video-submissions'] as const,
  details: () => [...videoSubmissionKeys.all, 'detail'] as const,
  detail: (id: string) => [...videoSubmissionKeys.details(), id] as const,
};
