import { useQuery } from '@tanstack/react-query';
import { listModulePublicationCandidates } from '@/entities/module_publication/module_publication.api';
import { modulePublicationKeys } from '@/entities/module_publication/module_publication.keys';
import type { ModulePublicationCandidate } from '@/entities/module_publication/module_publication.types';

interface UseModulePublicationCandidatesOptions {
  search?: string;
  limit?: number;
  enabled?: boolean;
}

export function useModulePublicationCandidates(options: UseModulePublicationCandidatesOptions = {}) {
  const {
    search,
    limit = 20,
    enabled = true,
  } = options;

  return useQuery<ModulePublicationCandidate[], Error>({
    queryKey: modulePublicationKeys.candidatesList({ search, limit }),
    queryFn: async () => {
      const response = await listModulePublicationCandidates({ search, limit });
      return response.items;
    },
    enabled,
    staleTime: 30_000,
  });
}