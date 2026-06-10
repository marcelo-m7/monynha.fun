export const modulePublicationKeys = {
  all: ['module-publications'] as const,
  enqueue: () => [...modulePublicationKeys.all, 'enqueue'] as const,
  detail: (jobId: string) => [...modulePublicationKeys.all, 'detail', jobId] as const,
};