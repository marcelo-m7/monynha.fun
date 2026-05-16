import type { Database, Json } from '@/integrations/supabase/types';

export type VideoSubmission = Database['public']['Tables']['video_submissions']['Row'];
export type VideoSubmissionInsert = Database['public']['Tables']['video_submissions']['Insert'];

export type VideoSubmissionStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed'
  | 'duplicate'
  | 'recoverable_error';

export type VideoSubmissionMetadata = {
  enrichmentId?: string | null;
  detectedLanguage?: string | null;
  assignment?: Json;
};

export function getVideoSubmissionMetadata(metadata: Json): VideoSubmissionMetadata {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  return metadata as VideoSubmissionMetadata;
}
