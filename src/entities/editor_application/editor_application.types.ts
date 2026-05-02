import type { Database } from '@/integrations/supabase/types';

export type EditorApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

type BaseEditorApplicationRow = Database['public']['Tables']['editor_applications']['Row'];
type BaseEditorApplicationInsert = Database['public']['Tables']['editor_applications']['Insert'];
type BaseEditorApplicationUpdate = Database['public']['Tables']['editor_applications']['Update'];

export type EditorApplication = Omit<BaseEditorApplicationRow, 'status'> & {
  status: EditorApplicationStatus;
};

export type EditorApplicationInsert = Omit<BaseEditorApplicationInsert, 'status' | 'reviewed_by' | 'reviewed_at'> & {
  status?: 'pending';
};

export type EditorApplicationReviewUpdate = Pick<BaseEditorApplicationUpdate, 'review_notes'> & {
  status: EditorApplicationStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
};

export interface ListEditorApplicationsParams {
  query?: string;
  status?: EditorApplicationStatus | 'all';
  limit?: number;
}
