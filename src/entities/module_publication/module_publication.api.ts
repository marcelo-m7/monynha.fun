import { getEdgeFunctionErrorDetails, invokeEdgeFunction } from '@/shared/api/supabase/edgeFunctions';
import type {
  EnqueueModulePublicationParams,
  EnqueueModulePublicationResponse,
  ModulePublicationJob,
} from './module_publication.types';

export async function enqueueModulePublication(
  params: EnqueueModulePublicationParams,
): Promise<ModulePublicationJob> {
  const { data, error } = await invokeEdgeFunction<EnqueueModulePublicationResponse>(
    'enqueue-module-publication-v2',
    {
      body: {
        moduleId: params.moduleId,
        force: params.force ?? false,
        payload: params.payload ?? {},
      },
      headers: { 'Content-Type': 'application/json' },
    },
  );

  if (error) {
    const details = await getEdgeFunctionErrorDetails(error);
    const message = details.requestId
      ? `${details.message} (request ${details.requestId})`
      : details.message;
    throw new Error(message);
  }

  if (!data?.ok || !data.job?.job_id) {
    throw new Error('Invalid enqueue response');
  }

  return data.job;
}