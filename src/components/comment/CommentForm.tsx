import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { useCreateComment } from '@/features/comments/queries/useComments';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/useAuth';
import { useNavigate } from 'react-router-dom';

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

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      content: '',
    },
  });

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
    } catch (error) {
      // Error handled by mutation hook's onError
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Textarea
        placeholder={t('comments.form.placeholder')}
        {...register('content')}
        rows={3}
        maxLength={500}
        disabled={isSubmitting || !user}
      />
      <p className="text-xs text-muted-foreground">
        {t('comments.form.mentionHelper')}
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
