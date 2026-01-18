import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { pt, enUS, es, fr } from 'date-fns/locale'; // Import locales
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Trash2, User as UserIcon } from 'lucide-react';
import { Comment } from '@/entities/comment/comment.types';
import { useAuth } from '@/features/auth/useAuth';
import { useDeleteComment } from '@/features/comments/queries/useComments';
import { toast } from 'sonner';
import i18n from 'i18next'; // Import i18n to get current language

interface CommentItemProps {
  comment: Comment;
}

const localeMap: { [key: string]: Locale } = {
  pt: pt,
  en: enUS,
  es: es,
  fr: fr,
};

export const CommentItem: React.FC<CommentItemProps> = ({ comment }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const deleteCommentMutation = useDeleteComment();
  const isAuthor = user?.id === comment.user_id;

  const handleDelete = async () => {
    if (!comment.id || !comment.video_id) return;
    try {
      await deleteCommentMutation.mutateAsync({ commentId: comment.id, videoId: comment.video_id });
    } catch (error) {
      toast.error(t('comments.deleteError'));
    }
  };

  const currentLocale = localeMap[i18n.language] || enUS;

  return (
    <div className="flex items-start space-x-3 p-4 bg-card border border-border rounded-xl">
      <Avatar className="w-9 h-9">
        <AvatarImage src={comment.profile?.avatar_url || undefined} alt={comment.profile?.display_name || comment.profile?.username || 'User'} />
        <AvatarFallback className="bg-muted/50 text-muted-foreground">
          {comment.profile?.display_name ? comment.profile.display_name[0].toUpperCase() : (comment.profile?.username ? comment.profile.username[0].toUpperCase() : <UserIcon className="w-4 h-4" />)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">
              {comment.profile?.display_name || comment.profile?.username || t('common.anonymous')}
            </p>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: currentLocale })}
            </span>
          </div>
          {isAuthor && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
              disabled={deleteCommentMutation.isPending}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{comment.content}</p>
      </div>
    </div>
  );
};