import { supabase } from '@/shared/api/supabase/supabaseClient';
import type {
  EditorApplication,
  EditorApplicationInsert,
  EditorApplicationReviewUpdate,
  ListEditorApplicationsParams,
} from './editor_application.types';

export async function createEditorApplication(payload: EditorApplicationInsert) {
  const { data, error } = await supabase
    .from('editor_applications')
    .insert({
      ...payload,
      source_page: payload.source_page ?? 'editor_apply_page',
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST205' || error.message.includes('editor_applications')) {
      throw new Error('Editor applications schema is not available yet. Please contact support.');
    }
    throw error;
  }
  return data as EditorApplication;
}

export async function listEditorApplications(params: ListEditorApplicationsParams = {}) {
  const limit = params.limit ?? 50;

  let query = supabase
    .from('editor_applications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  if (params.query?.trim()) {
    const escaped = params.query.trim().replace(/,/g, '');
    query = query.or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as EditorApplication[];
}

export async function updateEditorApplicationReview(
  applicationId: string,
  payload: EditorApplicationReviewUpdate,
) {
  const reviewPayload = {
    status: payload.status,
    review_notes: payload.review_notes ?? null,
    reviewed_by: payload.reviewed_by ?? null,
    reviewed_at: payload.reviewed_at ?? new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('editor_applications')
    .update(reviewPayload)
    .eq('id', applicationId)
    .select()
    .single();

  if (error) throw error;
  return data as EditorApplication;
}
