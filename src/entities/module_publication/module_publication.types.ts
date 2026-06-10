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

export type ModulePublicationCandidatePlaylist = {
  id: string;
  name: string;
  course_code: string | null;
  unit_code: string | null;
  video_count: number | null;
  review_status: string | null;
};

export type ModulePublicationCandidate = {
  module_id: string;
  module_slug: string;
  module_title: string;
  module_description: string | null;
  module_status: string;
  module_updated_at: string | null;
  playlist: ModulePublicationCandidatePlaylist | null;
  latest_job: ModulePublicationStatusJob | null;
};

export type ListModulePublicationCandidatesParams = {
  search?: string;
  limit?: number;
};

export type ListModulePublicationCandidatesResponse = {
  ok: boolean;
  items: ModulePublicationCandidate[];
};

export function isTerminalPublishJobStatus(status: string | null | undefined) {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled';
}