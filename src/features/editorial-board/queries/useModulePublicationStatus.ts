import { useQuery } from '@tanstack/react-query';
import { getModulePublicationStatus } from '@/entities/module_publication/module_publication.api';
import { modulePublicationKeys } from '@/entities/module_publication/module_publication.keys';
import {
  isTerminalPublishJobStatus,
  type ModulePublicationStatusJob,
} from '@/entities/module_publication/module_publication.types';

interface UseModulePublicationStatusOptions {
  moduleId?: string;
  jobId?: string;
  limit?: number;
  enabled?: boolean;
  poll?: boolean;
}

export function useModulePublicationStatus(options: UseModulePublicationStatusOptions = {}) {
  const {
    moduleId,
    jobId,
    limit = 10,
    enabled = true,
    poll = true,
  } = options;

  return useQuery<ModulePublicationStatusJob[], Error>({
    queryKey: modulePublicationKeys.statusList({ moduleId, jobId, limit }),
    queryFn: () => getModulePublicationStatus({ moduleId, jobId, limit }),
    enabled: enabled && (!!moduleId || !!jobId),
    refetchInterval: poll
      ? (query) => {
          const jobs = query.state.data ?? [];
          if (jobs.length === 0) return 5000;
          if (jobs.every((job) => isTerminalPublishJobStatus(job.status))) return false;
          return jobs.some((job) => job.status === 'processing') ? 1000 : 3000;
        }
      : false,
  });
}

export function useModulePublicationStatusByModule(
  moduleId: string | undefined,
  limit = 10,
  enabled = true,
) {
  return useModulePublicationStatus({ moduleId, limit, enabled });
}

export function useModulePublicationStatusByJob(
  jobId: string | undefined,
  enabled = true,
) {
  return useModulePublicationStatus({ jobId, limit: 1, enabled });
}