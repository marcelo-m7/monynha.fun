import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, KeyRound, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { updateUserPassword } from '@/features/auth/auth.api';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'auth.error.passwordMinLength'),
  confirmPassword: z.string().min(6, 'auth.error.passwordMinLength'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'auth.resetPassword.error.passwordMismatch',
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  onSuccess: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const [isSuccess, setIsSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    try {
      const { error } = await updateUserPassword(values.password);

      if (error) {
        toast.error(t('auth.resetPassword.error.generic'), {
          description: error.message,
        });
        return;
      }

      setIsSuccess(true);
      toast.success(t('auth.resetPassword.success'));

      // Redirect after short delay
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      console.error('Password reset error:', err);
      toast.error(t('auth.error.genericAuthError'), {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">{t('auth.resetPassword.successTitle')}</h3>
        <p className="text-muted-foreground">{t('auth.resetPassword.redirecting')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{t('auth.resetPassword.title')}</h2>
        <p className="text-muted-foreground mt-2">{t('auth.resetPassword.description')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-foreground">
          {t('auth.resetPassword.newPassword')}
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            className="pl-10"
          />
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{t(errors.password.message as string)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-foreground">
          {t('auth.resetPassword.confirmPassword')}
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            {...register('confirmPassword')}
            className="pl-10"
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{t(errors.confirmPassword.message as string)}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('auth.submittingButton')}
          </>
        ) : (
          t('auth.resetPassword.submit')
        )}
      </Button>
    </form>
  );
};
