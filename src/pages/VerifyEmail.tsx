import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowLeft, LogIn, CheckCircle, Loader2 } from 'lucide-react';
import { ResendConfirmationEmail } from '@/components/account/ResendConfirmationEmail';
import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/shared/api/supabase/supabaseClient';

const VerifyEmail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const { user, loading: authLoading } = useAuth();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for active session immediately on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsConfirmed(true);
      }
      setLoading(false);
    });
  }, []);

  // Listen for auth state changes (e.g., if user clicks link while on this page)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsConfirmed(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  const handleGoToApp = () => {
    navigate('/');
  };

  if (isConfirmed) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <Card className="shadow-lg border-green-500/50">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-2xl">{t('auth.resetPassword.successTitle')}</CardTitle>
                <CardDescription>
                  {t('auth.verifyEmail.successConfirmed')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="default" 
                  onClick={handleGoToApp}
                  className="w-full"
                >
                  {t('auth.verifyEmail.goToApp')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Default state: Pending confirmation
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t('auth.verifyEmail.title')}</CardTitle>
              <CardDescription>
                {t('auth.verifyEmail.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {email && (
                <p className="text-center text-sm text-muted-foreground">
                  {t('auth.verifyEmail.sentTo')} <span className="font-medium text-foreground">{email}</span>
                </p>
              )}

              <ResendConfirmationEmail email={email} />

              <div className="flex flex-col gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/auth')}
                  className="w-full"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {t('auth.verifyEmail.goToLogin')}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('common.backToHome')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VerifyEmail;