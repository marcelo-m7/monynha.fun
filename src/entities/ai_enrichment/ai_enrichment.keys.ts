export const aiEnrichmentKeys = {
  all: ['aiEnrichments'] as const,
  lists: () => [...aiEnrichmentKeys.all, 'list'] as const,
  list: (videoId: string) => [...aiEnrichmentKeys.lists(), videoId] as const,
  details: () => [...aiEnrichmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...aiEnrichmentKeys.details(), id] as const,
  latest: (videoId: string) => [...aiEnrichmentKeys.all, 'latest', videoId] as const,
};
