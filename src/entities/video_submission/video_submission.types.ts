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

export type VideoSubmissionAssignmentCandidate = {
  playlistId: string;
  name: string;
  score?: number | null;
  compatible?: boolean | null;
  isAiSuggested?: boolean | null;
};

export type VideoSubmissionAssignment = {
  fallbackUsed?: boolean | null;
  reliability?: 'high' | 'low' | string | null;
  reason?: string | null;
  assignedCategoryId?: string | null;
  assignedPlaylistId?: string | null;
  algorithmVersion?: string | null;
  score?: number | null;
  signals?: Record<string, number> | null;
  topCandidates?: VideoSubmissionAssignmentCandidate[];
  rejectedAiPlaylistId?: string | null;
};

export type VideoSubmissionMetadata = {
  enrichmentId?: string | null;
  detectedLanguage?: string | null;
  assignment?: VideoSubmissionAssignment;
};

export function getVideoSubmissionMetadata(metadata: Json): VideoSubmissionMetadata {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  return metadata as VideoSubmissionMetadata;
}
