export const facodiKeys = {
  all: ['facodi'] as const,
  jobs: () => [...facodiKeys.all, 'jobs'] as const,
  analysisJob: (jobId: string) => [...facodiKeys.jobs(), 'analysis', jobId] as const,
  odooSyncJob: (jobId: string) => [...facodiKeys.jobs(), 'odoo-sync', jobId] as const,
};