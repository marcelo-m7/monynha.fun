import { supabase } from '@/shared/api/supabase/supabaseClient';
import type { Database } from '@/integrations/supabase/types';
import type { Profile } from '@/entities/profile/profile.types';

export type Comment = Database['public']['Tables']['comments']['Row'] & {
  profile?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
};
export type CommentInsert = Database['public']['Tables']['comments']['Insert'];
export type CommentUpdate = Database['public']['Tables']['comments']['Update'];

export async function createComment(payload: CommentInsert) {
  const { data, error } = await supabase
    .from('comments')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as Comment;
}

export async function listComments(videoId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select(
      `
      *,
      profile:profiles(id, username, display_name, avatar_url)
    `,
    )
    .eq('video_id', videoId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(comment => ({
    ...comment,
    profile: comment.profile as Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> | null,
  })) as Comment[];
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
}