import { supabase } from '@/shared/api/supabase/supabaseClient';
import { getEdgeFunctionErrorDetails, invokeEdgeFunction } from '@/shared/api/supabase/edgeFunctions';
import type { FacodiAnalysisJob, FacodiMechanismResponse, FacodiOdooSyncJob } from './facodi.types';

type RpcResult<T> = { data: T | T[] | null; error: { message?: string } | null };

type FacodiRpcClient = {
  schema: (schema: 'facodi') => {
    rpc: <T>(functionName: string, args: Record<string, unknown>) => Promise<RpcResult<T>>;
  };
};

function firstRow<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function invokeFacodiMechanism<TPayload extends Record<string, unknown>>(
  functionName: string,
  payload: TPayload,
) {
  const { data, error } = await invokeEdgeFunction<FacodiMechanismResponse>(functionName, {
    body: payload,
    headers: { 'Content-Type': 'application/json' },
  });

  if (error) {
    const details = await getEdgeFunctionErrorDetails(error);
    throw new Error(details.requestId ? `${details.message} (request ${details.requestId})` : details.message);
  }

  if (!data) {
    throw new Error('FACODI mechanism returned no response');
  }

  return data;
}

export async function getAnalysisJobStatus(jobId: string) {
  const { data, error } = await (supabase as unknown as FacodiRpcClient)
    .schema('facodi')
    .rpc<FacodiAnalysisJob>('get_analysis_job_status', { p_job_id: jobId });

  if (error) throw new Error(error.message ?? 'Could not load analysis job status');
  return firstRow(data);
}

export async function getOdooSyncJobStatus(jobId: string) {
  const { data, error } = await (supabase as unknown as FacodiRpcClient)
    .schema('facodi')
    .rpc<FacodiOdooSyncJob>('get_odoo_sync_job_status', { p_job_id: jobId });

  if (error) throw new Error(error.message ?? 'Could not load Odoo sync job status');
  return firstRow(data);
}

export function subscribeToAnalysisJob(
  jobId: string,
  onChange: (job: Partial<FacodiAnalysisJob>) => void,
) {
  const channel = supabase
    .channel(`facodi-analysis-job:${jobId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'facodi', table: 'analysis_jobs', filter: `id=eq.${jobId}` },
      (payload) => onChange(payload.new as Partial<FacodiAnalysisJob>),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToOdooSyncJob(
  jobId: string,
  onChange: (job: Partial<FacodiOdooSyncJob>) => void,
) {
  const channel = supabase
    .channel(`facodi-odoo-sync-job:${jobId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'facodi', table: 'odoo_sync_jobs', filter: `id=eq.${jobId}` },
      (payload) => onChange(payload.new as Partial<FacodiOdooSyncJob>),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}