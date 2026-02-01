import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { useCreateComment } from '@/features/comments/queries/useComments';
import { useSearchProfiles } from '@/features/profile/queries/useProfile';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/useAuth';
import { useNavigate } from 'react-router-dom';
import { MentionAutocomplete } from './MentionAutocomplete';

interface CommentFormProps {
  videoId: string;
}

const commentFormSchema = z.object({
  content: z.string().min(1, 'comments.form.contentRequired').max(500, 'comments.form.contentMaxLength'),
});

type CommentFormValues = z.infer<typeof commentFormSchema>;

export const CommentForm: React.FC<CommentFormProps> = ({ videoId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const createCommentMutation = useCreateComment();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  
  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState('');
  const [debouncedMentionQuery, setDebouncedMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState<{ top: number; left: number } | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  
  // Debounce mention query to reduce API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMentionQuery(mentionQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [mentionQuery]);
  
  const { data: mentionUsers = [], isLoading: isLoadingMentions } = useSearchProfiles(debouncedMentionQuery, 10);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, setValue, watch } = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      content: '',
    },
  });

  const content = watch('content');

  // Detect @ mentions
  useEffect(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPosition);
    
    // Find the last @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      
      // Check if there's a space after @ (which would end the mention)
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 30) {
        setMentionQuery(textAfterAt);
        setMentionStartIndex(lastAtIndex);
        setShowMentions(true);
        setSelectedMentionIndex(0);
        
        // Calculate position for autocomplete dropdown
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines.length;
        const charInLine = lines[lines.length - 1].length;
        
        // Approximate position (can be refined with more precise calculations)
        const lineHeight = 20;
        const charWidth = 8;
        setMentionPosition({
          top: currentLine * lineHeight + 40,
          left: Math.min(charInLine * charWidth, 300),
        });
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }, [content]);

  // Handle keyboard navigation in mention dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions || mentionUsers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedMentionIndex((prev) => 
        prev < mentionUsers.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMentionIndex((prev) => 
        prev > 0 ? prev - 1 : mentionUsers.length - 1
      );
    } else if (e.key === 'Enter' && showMentions) {
      e.preventDefault();
      if (mentionUsers[selectedMentionIndex]) {
        insertMention(mentionUsers[selectedMentionIndex].username);
      }
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  // Insert selected mention into textarea
  const insertMention = (username: string) => {
    if (mentionStartIndex === -1) return;

    const beforeMention = content.substring(0, mentionStartIndex);
    const afterCursor = content.substring(textareaRef.current?.selectionStart || content.length);
    const newContent = `${beforeMention}@${username} ${afterCursor}`;
    
    setValue('content', newContent);
    setShowMentions(false);
    setMentionQuery('');
    
    // Set cursor position after the inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStartIndex + username.length + 2; // +2 for @ and space
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  };

  const onSubmit = async (values: CommentFormValues) => {
    if (!user) {
      toast.info(t('comments.loginToComment'), {
        action: {
          label: t('comments.loginAction'),
          onClick: () => navigate('/auth'),
        },
      });
      return;
    }
    try {
      await createCommentMutation.mutateAsync({ videoId, content: values.content });
      reset();
      setShowMentions(false);
      setMentionQuery('');
    } catch (error) {
      // Error handled by mutation hook's onError
    }
  };

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showMentions &&
        textareaRef.current &&
        autocompleteRef.current &&
        !textareaRef.current.contains(e.target as Node) &&
        !autocompleteRef.current.contains(e.target as Node)
      ) {
        setShowMentions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMentions]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 relative">
      <div className="relative">
        <Textarea
          {...register('content')}
          ref={(e) => {
            register('content').ref(e);
            textareaRef.current = e;
          }}
          placeholder={t('comments.form.placeholder')}
          rows={3}
          maxLength={500}
          disabled={isSubmitting || !user}
          onKeyDown={handleKeyDown}
          aria-label={t('comments.form.placeholder')}
          aria-describedby="comment-helper-text"
        />
        {showMentions && (
          <div ref={autocompleteRef}>
            <MentionAutocomplete
              users={mentionUsers}
              isLoading={isLoadingMentions}
              selectedIndex={selectedMentionIndex}
              onSelect={insertMention}
              position={mentionPosition}
            />
          </div>
        )}
      </div>
      <p id="comment-helper-text" className="text-xs text-muted-foreground">
        {t('comments.form.mentionHelper')}
        {showMentions && mentionUsers.length > 0 && (
          <span className="ml-2 font-medium">
            {t('comments.form.keyboardHint')}
          </span>
        )}
      </p>
      {errors.content && (
        <p className="text-sm text-destructive">{t(errors.content.message as string)}</p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || !user}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('comments.form.submitting')}
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            {t('comments.form.submitButton')}
          </>
        )}
      </Button>
      {!user && (
        <p className="text-sm text-muted-foreground text-center">
          {t('comments.loginToCommentPrompt')}
        </p>
      )}
    </form>
  );
};
