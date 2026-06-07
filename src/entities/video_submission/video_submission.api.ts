import { supabase } from '@/shared/api/supabase/supabaseClient';
import { getSupabaseErrorMessage } from '@/shared/api/supabase/supabaseErrors';
import type { VideoSubmission, VideoSubmissionInsert } from './video_submission.types';

export async function createVideoSubmission(payload: VideoSubmissionInsert) {
  const { data, error } = await supabase
    .from('video_submissions')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }

  return data as VideoSubmission;
}

export async function getVideoSubmissionById(id: string) {
  const { data, error } = await supabase
    .from('video_submissions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }

  return data as VideoSubmission | null;
}

export async function getVideoSubmissionsByIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('video_submissions')
    .select('*')
    .in('id', uniqueIds);

  if (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }

  const submissionsById = new Map((data ?? []).map((submission) => [submission.id, submission as VideoSubmission]));

  return uniqueIds
    .map((id) => submissionsById.get(id))
    .filter((submission): submission is VideoSubmission => Boolean(submission));
}

export async function getRecentVideoSubmissions(limit = 100) {
  const safeLimit = Math.max(1, Math.min(limit, 500));

  const { data, error } = await supabase
    .from('video_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }

  return (data ?? []) as VideoSubmission[];
}

export async function markVideoSubmissionClientError(payload: {
  submissionId: string;
  errorMessage: string;
  errorCode?: string | null;
  stage?: string | null;
}) {
  const { data, error } = await supabase
    .rpc('mark_video_submission_client_error', {
      p_submission_id: payload.submissionId,
      p_error_message: payload.errorMessage,
      p_error_code: payload.errorCode ?? null,
      p_stage: payload.stage ?? 'start_processing',
    });

  if (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }

  return data as VideoSubmission;
}
