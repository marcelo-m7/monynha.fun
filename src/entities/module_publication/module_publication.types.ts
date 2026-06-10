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

export function isTerminalPublishJobStatus(status: string | null | undefined) {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled';
}