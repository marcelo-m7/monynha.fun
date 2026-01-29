import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateUserPassword, reauthenticateUser } from '@/features/auth/auth.api';
import { useAuth } from '@/features/auth/useAuth';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'account.settings.error.currentPasswordRequired'),
  newPassword: z.string().min(6, 'auth.error.passwordMinLength'),
  confirmPassword: z.string().min(6, 'auth.error.passwordMinLength'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'account.settings.error.passwordMismatch',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'account.settings.error.samePassword',
  path: ['newPassword'],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const ChangePasswordForm: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    if (!user?.email) {
      toast.error(t('account.settings.error.notLoggedIn'));
      return;
    }

    try {
      // First, re-authenticate with current password
      const { error: authError } = await reauthenticateUser(user.email, values.currentPassword);
      
      if (authError) {
        toast.error(t('account.settings.error.wrongCurrentPassword'));
        return;
      }

      // Then update the password
      const { error } = await updateUserPassword(values.newPassword);

      if (error) {
        toast.error(t('account.settings.error.passwordUpdateFailed'), {
          description: error.message,
        });
        return;
      }

      toast.success(t('account.settings.success.passwordUpdated'));
      reset();
    } catch (err) {
      console.error('Password change error:', err);
      toast.error(t('auth.error.genericAuthError'), {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          {t('account.settings.passwordSection.title')}
        </CardTitle>
        <CardDescription>
          {t('account.settings.passwordSection.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">
              {t('account.settings.passwordSection.currentPassword')}
            </Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="••••••••"
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <p className="text-sm text-destructive">{t(errors.currentPassword.message as string)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">
              {t('account.settings.passwordSection.newPassword')}
            </Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••"
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">{t(errors.newPassword.message as string)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {t('account.settings.passwordSection.confirmPassword')}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{t(errors.confirmPassword.message as string)}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('auth.submittingButton')}
              </>
            ) : (
              t('account.settings.passwordSection.update')
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
