export type PublishJobStatus =
  | 'queued'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'retryable_error'
  | 'cancelled';

export type EnqueueModulePublicationParams = {
  moduleId: string;
  force?: boolean;
  payload?: Record<string, unknown>;
};

export type ModulePublicationJob = {
  job_id: string;
  status: PublishJobStatus | string;
  created: boolean;
};

export type EnqueueModulePublicationResponse = {
  ok: boolean;
  job: ModulePublicationJob | null;
};

export type ModulePublicationStatusQueryParams = {
  moduleId?: string;
  jobId?: string;
  limit?: number;
};

export type ModulePublicationStatusJob = {
  id: string;
  module_id: string;
  status: PublishJobStatus | string;
  attempt_count: number;
  max_attempts: number;
  next_retry_at: string | null;
  requested_by: string | null;
  requested_at: string;
  started_at: string | null;
  finished_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  last_error_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ModulePublicationStatusResponse = {
  ok: boolean;
  jobs: ModulePublicationStatusJob[];
};

export function isTerminalPublishJobStatus(status: string | null | undefined) {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled';
}