import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Loader2 } from 'lucide-react';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';
import { useComments } from '@/features/comments/queries/useComments';
import { Skeleton } from '@/components/ui/skeleton';

interface CommentsSectionProps {
  videoId: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ videoId }) => {
  const { t } = useTranslation();
  const { data: comments, isLoading, isError } = useComments(videoId);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-primary" />
        {t('comments.title')} ({comments?.length || 0})
      </h2>

      <CommentForm videoId={videoId} />

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start space-x-3 p-4 bg-card border border-border rounded-xl">
              <Skeleton className="w-9 h-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))
        ) : isError ? (
          <p className="text-center text-destructive">{t('comments.loadError')}</p>
        ) : comments && comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        ) : (
          <p className="text-center text-muted-foreground py-8">
            {t('comments.noComments')}
          </p>
        )}
      </div>
    </div>
  );
};