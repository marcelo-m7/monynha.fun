import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, type Locale } from 'date-fns';
import { pt, enUS, es, fr } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Trash2, User as UserIcon } from 'lucide-react';
import type { Comment } from '@/entities/comment/comment.types';
import { useAuth } from '@/features/auth/useAuth';
import { useDeleteComment } from '@/features/comments/queries/useComments';
import { toast } from 'sonner';
import i18n from 'i18next';
import { Link } from 'react-router-dom';
import { MentionLink } from './MentionLink'; // Import the new MentionLink component

interface CommentItemProps {
  comment: Comment;
}

const localeMap: Record<string, Locale> = {
  pt: pt,
  en: enUS,
  es: es,
  fr: fr,
};

interface ParsedContentPart {
  type: 'text' | 'mention';
  value: string; // The actual text or username
}

const parseContent = (content: string): ParsedContentPart[] => {
  const parts: ParsedContentPart[] = [];
  const regex = /(@[\w.-]+)/g; // Regex to find @username mentions
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Add preceding text
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.substring(lastIndex, match.index) });
    }
    // Add mention
    parts.push({ type: 'mention', value: match[1].substring(1) }); // Remove '@' prefix
    lastIndex = regex.lastIndex;
  }

  // Add any remaining text
  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.substring(lastIndex) });
  }

  return parts;
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
  const contentParts = parseContent(comment.content);

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
        <div className="text-sm text-foreground mt-1 whitespace-pre-wrap">
          {contentParts.map((part, index) => (
            part.type === 'text' ? (
              <React.Fragment key={index}>{part.value}</React.Fragment>
            ) : (
              <MentionLink key={index} username={part.value} />
            )
          ))}
        </div>
      </div>
    </div>
  );
};