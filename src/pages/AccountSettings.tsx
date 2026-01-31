import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Shield } from 'lucide-react';
import { useRequireAuth } from '@/shared/hooks/useRequireAuth';
import { ChangeEmailForm } from '@/components/account/ChangeEmailForm';
import { ChangePasswordForm } from '@/components/account/ChangePasswordForm';
import { ResendConfirmationEmail } from '@/components/account/ResendConfirmationEmail';
import { DeleteAccount } from '@/components/account/DeleteAccount';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function AccountSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useRequireAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null; // Redirect handled by useRequireAuth
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container py-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back')}
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Settings className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">{t('account.settings.title')}</h1>
                  <p className="text-muted-foreground mt-1">{t('account.settings.description')}</p>
                </div>
              </div>
            </div>

            {/* Security Section Header */}
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{t('account.settings.securityTitle')}</h2>
            </div>

            {/* Forms */}
            <div className="space-y-6">
              <ResendConfirmationEmail />
              <ChangeEmailForm />
              <ChangePasswordForm />
            </div>

            {/* Link to Edit Profile */}
            <div className="mt-8 pt-6 border-t">
              <p className="text-muted-foreground mb-3">{t('account.settings.profileLinkDescription')}</p>
              <Button variant="outline" onClick={() => navigate('/profile/edit')}>
                {t('header.editProfile')}
              </Button>
            </div>

            {/* Danger Zone - Account Deletion */}
            <div className="mt-12">
              <Separator className="mb-6" />
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-destructive">{t('account.settings.dangerZone.title')}</h2>
                <p className="text-sm text-muted-foreground">{t('account.settings.dangerZone.description')}</p>
              </div>
              <DeleteAccount />
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}