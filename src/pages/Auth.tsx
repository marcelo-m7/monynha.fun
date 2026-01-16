import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Play, Mail, Lock, User, ArrowLeft, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Define Zod schemas for validation
const loginSchema = z.object({
  email: z.string().email('auth.error.invalidEmail'),
  password: z.string().min(6, 'auth.error.passwordMinLength'),
});

const signupSchema = z.object({
  username: z.string().min(3, 'auth.error.usernameMinLength').optional().or(z.literal('')),
  email: z.string().email('auth.error.invalidEmail'),
  password: z.string().min(6, 'auth.error.passwordMinLength'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('auth.error.invalidEmail'),
});

export default function Auth() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  // Form setup for login/signup
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch } = useForm<z.infer<typeof loginSchema> | z.infer<typeof signupSchema>>({
    resolver: zodResolver(isLogin ? loginSchema : signupSchema),
    defaultValues: {
      email: '',
      password: '',
      ...(isLogin ? {} : { username: '' }),
    },
  });

  // Form setup for forgot password
  const { register: registerForgotPassword, handleSubmit: handleSubmitForgotPassword, formState: { errors: forgotPasswordErrors, isSubmitting: isForgotPasswordSubmitting }, reset: resetForgotPassword } = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  // Watch email field for forgot password to pre-fill if coming from login
  const emailForForgotPassword = watch('email');

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    reset(); // Reset form fields when switching between login/signup
  }, [isLogin, reset]);

  const onSubmit = async (values: z.infer<typeof loginSchema> | z.infer<typeof signupSchema>) => {
    try {
      if (isLogin) {
        const { error } = await signIn(values.email, values.password);
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
        const signupValues = values as z.infer<typeof signupSchema>;
        const { error } = await signUp(signupValues.email, signupValues.password, signupValues.username || undefined);
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
    } catch (err) {
      console.error('Auth submission error:', err);
      toast.error(t('auth.error.genericAuthError'), {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const onForgotPasswordSubmit = async (values: z.infer<typeof forgotPasswordSchema>) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        toast.error(t('auth.error.forgotPasswordGeneric'), {
          description: error.message,
        });
      } else {
        toast.success(t('auth.success.passwordResetEmailSent'), {
          description: t('auth.success.checkEmailForReset'),
        });
        setShowForgotPassword(false);
        resetForgotPassword();
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      toast.error(t('auth.error.genericAuthError'), {
        description: err instanceof Error ? err.message : String(err),
      });
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
              <form onSubmit={handleSubmitForgotPassword(onForgotPasswordSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-foreground">
                    {t('auth.emailLabel')}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder={t('auth.emailPlaceholder')}
                      {...registerForgotPassword('email')}
                      className="pl-10"
                    />
                  </div>
                  {forgotPasswordErrors.email && (
                    <p className="text-sm text-destructive">{t(forgotPasswordErrors.email.message as string)}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isForgotPasswordSubmitting}
                >
                  {isForgotPasswordSubmitting
                    ? t('auth.submittingButton')
                    : t('auth.sendResetLinkButton')
                  }
                </Button>
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      resetForgotPassword();
                      reset({ email: emailForForgotPassword, password: '', username: '' }); // Pre-fill email back to login form
                    }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t('auth.backToLogin')}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                        {...register('username')}
                        className="pl-10"
                      />
                    </div>
                    {'username' in errors && errors.username && (
                      <p className="text-sm text-destructive">{t(errors.username.message as string)}</p>
                    )}
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
                      {...register('email')}
                      className="pl-10"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{t(errors.email.message as string)}</p>
                  )}
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
                      {...register('password')}
                      className="pl-10"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{t(errors.password.message as string)}</p>
                  )}
                </div>

                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        resetForgotPassword({ email: watch('email') }); // Pre-fill email to forgot password form
                      }}
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