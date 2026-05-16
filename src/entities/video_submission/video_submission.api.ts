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
