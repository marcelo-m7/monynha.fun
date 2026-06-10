import { getEdgeFunctionErrorDetails, invokeEdgeFunction } from '@/shared/api/supabase/edgeFunctions';
import type {
  EnqueueModulePublicationParams,
  EnqueueModulePublicationResponse,
  ListModulePublicationCandidatesParams,
  ListModulePublicationCandidatesResponse,
  ModulePublicationCandidate,
  ModulePublicationJob,
  ModulePublicationStatusJob,
  ModulePublicationStatusQueryParams,
  ModulePublicationStatusResponse,
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

export async function getModulePublicationStatus(
  params: ModulePublicationStatusQueryParams,
): Promise<ModulePublicationStatusJob[]> {
  const { data, error } = await invokeEdgeFunction<ModulePublicationStatusResponse>(
    'get-module-publication-status-v2',
    {
      body: {
        moduleId: params.moduleId,
        jobId: params.jobId,
        limit: params.limit ?? 10,
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

  if (!data?.ok || !Array.isArray(data.jobs)) {
    throw new Error('Invalid publication status response');
  }

  return data.jobs;
}

type CandidatesEdgeResponse = {
  ok: boolean;
  candidates?: ModulePublicationCandidate[];
};

export async function listModulePublicationCandidates(
  params: ListModulePublicationCandidatesParams = {},
): Promise<ListModulePublicationCandidatesResponse> {
  const { data, error } = await invokeEdgeFunction<CandidatesEdgeResponse>(
    'list-module-publication-candidates-v2',
    {
      body: {
        search: params.search,
        limit: params.limit ?? 20,
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

  if (!data?.ok || !Array.isArray(data.candidates)) {
    throw new Error('Invalid publication candidates response');
  }

  return {
    ok: true,
    items: data.candidates,
  };
}