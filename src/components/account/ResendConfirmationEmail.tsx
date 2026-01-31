import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { resendConfirmationEmail } from '@/features/auth/auth.api';
import { useAuth } from '@/features/auth/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const ResendConfirmationEmail: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);

  const canResend = !lastSent || Date.now() - lastSent.getTime() > 60000; // 1 minute cooldown

  const handleResend = async () => {
    if (!user?.email) {
      toast.error(t('account.settings.error.notLoggedIn'));
      return;
    }

    if (!canResend) {
      toast.error(t('account.settings.resendEmail.error.cooldown'));
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await resendConfirmationEmail();

      if (error) {
        toast.error(t('account.settings.resendEmail.error.failed'), {
          description: error.message,
        });
        return;
      }

      setLastSent(new Date());
      toast.success(t('account.settings.resendEmail.success.sent'), {
        description: t('account.settings.resendEmail.success.checkInbox'),
      });
    } catch (err) {
      toast.error(t('auth.error.genericAuthError'), {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if email is already confirmed
  const isEmailConfirmed = user?.email_confirmed_at !== null;

  if (isEmailConfirmed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {t('account.settings.resendEmail.title')}
          </CardTitle>
          <CardDescription>
            {t('account.settings.resendEmail.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              {t('account.settings.resendEmail.alreadyConfirmed')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          {t('account.settings.resendEmail.title')}
        </CardTitle>
        <CardDescription>
          {t('account.settings.resendEmail.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('account.settings.resendEmail.notConfirmedWarning')}
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {user?.email && (
              <p>
                {t('account.settings.resendEmail.emailLabel')}: <span className="font-medium text-foreground">{user.email}</span>
              </p>
            )}
            {lastSent && (
              <p className="mt-1 text-xs">
                {t('account.settings.resendEmail.lastSent')}: {lastSent.toLocaleTimeString()}
              </p>
            )}
          </div>
          
          <Button
            onClick={handleResend}
            disabled={isSubmitting || !canResend}
            variant="default"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('auth.submittingButton')}
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                {t('account.settings.resendEmail.button')}
              </>
            )}
          </Button>
        </div>

        {!canResend && (
          <p className="text-xs text-muted-foreground">
            {t('account.settings.resendEmail.cooldownMessage')}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
