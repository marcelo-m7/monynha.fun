import type { Database, Json } from '@/integrations/supabase/types';

export type VideoAnalysisJob = Database['public']['Tables']['video_analysis_jobs']['Row'];
export type VideoAnalysisJobInsert = Database['public']['Tables']['video_analysis_jobs']['Insert'];
export type VideoAnalysisJobUpdate = Database['public']['Tables']['video_analysis_jobs']['Update'];

export type VideoAnalysisJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'recoverable_error'
  | 'skipped';

export type VideoAnalysisJobMetadata = {
  source?: string | null;
  fastProvider?: string | null;
  enrichmentId?: string | null;
  requestId?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
};

export type VideoAnalysisJobWithVideo = VideoAnalysisJob & {
  video?: {
    id: string;
    title: string;
    youtube_id: string;
    thumbnail_url: string;
    duration_seconds: number | null;
    category?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
};

export function getVideoAnalysisJobMetadata(metadata: Json): VideoAnalysisJobMetadata {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  return metadata as VideoAnalysisJobMetadata;
}
