import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { updateUserEmail } from '@/features/auth/auth.api';
import { useAuth } from '@/features/auth/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';

const changeEmailSchema = z.object({
  newEmail: z.string().email('auth.error.invalidEmail'),
});

type ChangeEmailFormValues = z.infer<typeof changeEmailSchema>;

export const ChangeEmailForm: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangeEmailFormValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: {
      newEmail: '',
    },
  });

  const onSubmit = async (values: ChangeEmailFormValues) => {
    if (!user) {
      toast.error(t('account.settings.error.notLoggedIn'));
      return;
    }

    if (values.newEmail === user.email) {
      toast.error(t('account.settings.error.sameEmail'));
      return;
    }

    try {
      const { error } = await updateUserEmail(values.newEmail);

      if (error) {
        toast.error(t('account.settings.error.emailUpdateFailed'), {
          description: error.message,
        });
        return;
      }

      toast.success(t('account.settings.success.emailUpdated'));
      reset();
    } catch (err) {
      console.error('Email change error:', err);
      toast.error(t('auth.error.genericAuthError'), {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          {t('account.settings.emailSection.title')}
        </CardTitle>
        <CardDescription>
          {t('account.settings.emailSection.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground">{t('account.settings.emailSection.current')}</Label>
          <p className="font-medium">{user?.email}</p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t('account.settings.emailSection.changeInfo')}
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newEmail">
              {t('account.settings.emailSection.newEmail')}
            </Label>
            <Input
              id="newEmail"
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              {...register('newEmail')}
            />
            {errors.newEmail && (
              <p className="text-sm text-destructive">{t(errors.newEmail.message as string)}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('auth.submittingButton')}
              </>
            ) : (
              t('account.settings.emailSection.confirmChange')
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
