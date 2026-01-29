import type { Profile } from '@/entities/profile/profile.types';

// Manual type definition for comments table (exists in database but missing from auto-generated types)
export interface CommentRow {
  content: string;
  created_at: string | null;
  id: string;
  updated_at: string | null;
  user_id: string;
  video_id: string;
}

export interface CommentInsertRow {
  content: string;
  created_at?: string | null;
  id?: string;
  updated_at?: string | null;
  user_id: string;
  video_id: string;
}

export interface CommentUpdateRow {
  content?: string;
  created_at?: string | null;
  id?: string;
  updated_at?: string | null;
  user_id?: string;
  video_id?: string;
}

export type Comment = CommentRow & {
  profile?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
};

export type CommentInsert = CommentInsertRow;
export type CommentUpdate = CommentUpdateRow;
