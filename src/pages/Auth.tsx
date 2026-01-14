import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Play, Mail, Lock, User, ArrowLeft, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { supabase } from '@/integrations/supabase/client'; // Import supabase client for password reset

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');
const usernameSchema = z.string().min(3, 'Username deve ter pelo menos 3 caracteres').optional();

export default function Auth() {
  const { t } = useTranslation(); // Initialize useTranslation
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    try {
      emailSchema.parse(email);
      if (!showForgotPassword) { // Only validate password/username if not in forgot password mode
        passwordSchema.parse(password);
        if (!isLogin && username) {
          usernameSchema.parse(username);
        }
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(t('auth.error.validationTitle'), {
          description: error.errors[0].message,
        });
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          let message = t('auth.error.loginGeneric');
          if (error.message.includes('Invalid login credentials')) {
            message = t('auth.error.invalidCredentials');
          } else if (error.message.includes('Email not confirmed')) {
            message = t('auth.error.emailNotConfirmed');
          }
          toast.error(t('auth.error.loginGeneric'), {
            description: message,
          });
        } else {
          toast.success(t('auth.success.welcomeBack'), {
            description: t('auth.success.loginSuccess')
          });
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, username || undefined);
        if (error) {
          let message = t('auth.error.signupGeneric');
          if (error.message.includes('already registered')) {
            message = t('auth.error.emailRegistered');
          }
          toast.error(t('auth.error.signupGeneric'), {
            description: message,
          });
        } else {
          toast.success(t('auth.success.accountCreated'), {
            description: t('auth.success.confirmEmail')
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(t('auth.error.validationTitle'), {
          description: error.errors[0].message,
        });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`, // Redirect to auth page with a reset param
      });

      if (error) {
        toast.error(t('auth.error.forgotPasswordGeneric'), {
          description: error.message,
        });
      } else {
        toast.success(t('auth.success.passwordResetEmailSent'), {
          description: t('auth.success.checkEmailForReset'),
        });
        setShowForgotPassword(false); // Go back to login form
        setEmail(''); // Clear email field
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">{t('auth.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Play className="w-6 h-6 text-primary-foreground fill-current" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Monynha<span className="text-primary">Fun</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              {showForgotPassword ? t('auth.forgotPasswordTitle') : (isLogin ? t('auth.loginTitle') : t('auth.signupTitle'))}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-card border border-border rounded-2xl p-8 shadow-elegant">
            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">
                    {t('auth.emailLabel')}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('auth.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting 
                    ? t('auth.submittingButton')
                    : t('auth.sendResetLinkButton')
                  }
                </Button>
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t('auth.backToLogin')}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-foreground">
                      {t('auth.usernameLabel')}
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="username"
                        type="text"
                        placeholder={t('auth.usernamePlaceholder')}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">
                    {t('auth.emailLabel')}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('auth.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">
                    {t('auth.passwordLabel')}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={t('auth.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {t('auth.forgotPasswordLink')}
                    </button>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting 
                    ? t('auth.submittingButton')
                    : isLogin 
                      ? t('auth.loginButton')
                      : t('auth.signupButton')
                  }
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              {!showForgotPassword && (
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {isLogin 
                    ? t('auth.noAccount')
                    : t('auth.hasAccount')
                  }
                </button>
              )}
            </div>
          </div>

          {/* Tip */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            {t('auth.termsAgreement')}
          </p>
        </div>
      </main>
    </div>
  );
}