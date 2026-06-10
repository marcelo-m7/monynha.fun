import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  enqueueModulePublication,
} from '@/entities/module_publication/module_publication.api';
import { modulePublicationKeys } from '@/entities/module_publication/module_publication.keys';
import type {
  EnqueueModulePublicationParams,
  ModulePublicationJob,
} from '@/entities/module_publication/module_publication.types';

export function useEnqueueModulePublication() {
  const queryClient = useQueryClient();

  return useMutation<ModulePublicationJob, Error, EnqueueModulePublicationParams>({
    mutationFn: enqueueModulePublication,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: modulePublicationKeys.all });
      queryClient.setQueryData(modulePublicationKeys.detail(job.job_id), job);
    },
  });
}