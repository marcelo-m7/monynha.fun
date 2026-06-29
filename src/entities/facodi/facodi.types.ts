export type FacodiJobStatus = 'idle' | 'queued' | 'running' | 'needs_review' | 'succeeded' | 'failed' | 'retrying' | 'cancelled';

export type FacodiMechanismResponse = {
  requestId: string;
  status: FacodiJobStatus;
  mechanism: string;
  jobType: string;
  jobId: string;
};

export type FacodiAnalysisJob = {
  id: string;
  learning_object_id: string | null;
  video_id: string | null;
  job_type: string;
  status: FacodiJobStatus;
  current_step: string;
  requested_by: string | null;
  error_code: string | null;
  error_message: string | null;
  input_payload: Record<string, unknown>;
  result_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export type FacodiOdooSyncJob = {
  id: string;
  instance_id: string | null;
  learning_object_id: string | null;
  odoo_record_id: string | null;
  job_type: string;
  status: FacodiJobStatus;
  attempts: number;
  max_attempts: number;
  error_code: string | null;
  error_message: string | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  requested_by: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export type ImportYoutubeVideoPayload = {
  url?: string;
  youtube_url?: string;
  youtube_video_id?: string;
  learning_object_id?: string;
  metadata?: Record<string, unknown>;
};

export type ImportYoutubeChannelPayload = {
  url?: string;
  channel_url?: string;
  youtube_channel_id?: string;
  learning_object_id?: string;
  metadata?: Record<string, unknown>;
};

export type AnalyzeVideoPayload = {
  learning_object_id?: string;
  video_id?: string;
  youtube_video_id?: string;
  transcript?: string;
  metadata?: Record<string, unknown>;
};

export type MatchVideoToCurriculumPayload = {
  learning_object_id?: string;
  video_id?: string;
  youtube_video_id?: string;
  target_object_ids?: string[];
  candidate_types?: string[];
  metadata?: Record<string, unknown>;
};

export type GeneratePlaylistPayload = {
  title?: string;
  learning_object_ids?: string[];
  source_object_id?: string;
  metadata?: Record<string, unknown>;
};

export type GenerateModulePayload = {
  title?: string;
  playlist_object_ids?: string[];
  source_object_id?: string;
  metadata?: Record<string, unknown>;
};

export type GenerateCourseStructurePayload = {
  title?: string;
  module_object_ids?: string[];
  curricular_unit_object_ids?: string[];
  source_object_id?: string;
  metadata?: Record<string, unknown>;
};

export type SyncLearningObjectToOdooPayload = {
  learning_object_id: string;
  instance_id?: string;
  odoo_record_id?: string;
  metadata?: Record<string, unknown>;
};