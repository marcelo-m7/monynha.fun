import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/useAuth';
import { commentKeys } from '@/entities/comment/comment.keys';
import { createComment, listComments, deleteComment } from '@/entities/comment/comment.api';
import type { Comment, CommentInsert } from '@/entities/comment/comment.types';

export function useComments(videoId: string | undefined) {
  return useQuery<Comment[], Error>({
    queryKey: videoId ? commentKeys.list(videoId) : commentKeys.list(''),
    queryFn: async () => {
      if (!videoId) return [];
      return listComments(videoId);
    },
    enabled: !!videoId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<Comment, Error, { videoId: string; content: string }>({
    mutationFn: async ({ videoId, content }) => {
      if (!user?.id) throw new Error('User not authenticated');
      const payload: CommentInsert = {
        video_id: videoId,
        user_id: user.id,
        content,
      };
      return createComment(payload);
    },
    onSuccess: (newComment) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(newComment.video_id) });
      toast.success('Comment added successfully!');
    },
    onError: (error) => {
      toast.error('Failed to add comment', { description: error.message });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { commentId: string; videoId: string }>({
    mutationFn: async ({ commentId }) => {
      return deleteComment(commentId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(variables.videoId) });
      toast.success('Comment deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete comment', { description: error.message });
    },
  });
}