import { supabase } from '@/shared/api/supabase/supabaseClient';
import { getSupabaseErrorMessage } from '@/shared/api/supabase/supabaseErrors';
import type { VideoAnalysisJob, VideoAnalysisJobUpdate, VideoAnalysisJobWithVideo } from './video_analysis_job.types';

const baseJobSelect = '*, video:videos(id, title, youtube_id, thumbnail_url, duration_seconds, category:categories(id, name, slug))';

export async function getLatestVideoAnalysisJobByVideoId(videoId: string) {
  const { data, error } = await supabase
    .from('video_analysis_jobs')
    .select('*')
    .eq('video_id', videoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data as VideoAnalysisJob | null;
}

export async function getLatestVideoAnalysisJobBySubmissionId(submissionId: string) {
  const { data, error } = await supabase
    .from('video_analysis_jobs')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data as VideoAnalysisJob | null;
}

export async function listVideoAnalysisJobs(params: { status?: string; limit?: number } = {}) {
  let query = supabase
    .from('video_analysis_jobs')
    .select(baseJobSelect)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 20);

  if (params.status) {
    query = query.eq('status', params.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(getSupabaseErrorMessage(error));
  return (data ?? []) as VideoAnalysisJobWithVideo[];
}

export async function updateVideoAnalysisJob(id: string, values: VideoAnalysisJobUpdate) {
  const { data, error } = await supabase
    .from('video_analysis_jobs')
    .update(values)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data as VideoAnalysisJob;
}
