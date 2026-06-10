export const modulePublicationKeys = {
  all: ['module-publications'] as const,
  enqueue: () => [...modulePublicationKeys.all, 'enqueue'] as const,
  detail: (jobId: string) => [...modulePublicationKeys.all, 'detail', jobId] as const,
  statusLists: () => [...modulePublicationKeys.all, 'status-list'] as const,
  statusList: (params: { moduleId?: string; jobId?: string; limit?: number }) =>
    [...modulePublicationKeys.statusLists(), {
      moduleId: params.moduleId ?? '',
      jobId: params.jobId ?? '',
      limit: params.limit ?? null,
    }] as const,
  byModule: (moduleId: string, limit = 10) =>
    modulePublicationKeys.statusList({ moduleId, limit }),
  byJob: (jobId: string) => modulePublicationKeys.statusList({ jobId, limit: 1 }),
};