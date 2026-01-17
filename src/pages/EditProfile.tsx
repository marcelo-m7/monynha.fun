import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { useProfileById, useUpdateProfile } from '@/features/profile/queries/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, User, Image, Info, Loader2, Save } from 'lucide-react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const editProfileSchema = z.object({
  display_name: z.string().min(3, 'profile.edit.error.displayNameMinLength').max(50, 'profile.edit.error.displayNameMaxLength'),
  avatar_url: z.string().url('profile.edit.error.invalidAvatarUrl').optional().or(z.literal('')),
  bio: z.string().max(300, 'profile.edit.error.bioMaxLength').optional().or(z.literal('')),
});

type EditProfileFormValues = z.infer<typeof editProfileSchema>;

export default function EditProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading, isError: profileLoadError } = useProfileById(user?.id);
  const updateProfileMutation = useUpdateProfile();

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      display_name: '',
      avatar_url: '',
      bio: '',
    },
  });

  const displayName = watch('display_name');
  const avatarUrl = watch('avatar_url');
  const bio = watch('bio');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      reset({
        display_name: profile.display_name || '',
        avatar_url: profile.avatar_url || '',
        bio: profile.bio || '',
      });
    }
  }, [profile, reset]);

  const onSubmit = async (values: EditProfileFormValues) => {
    if (!user || !profile) {
      toast.error(t('profile.edit.error.notLoggedInTitle'), {
        description: t('profile.edit.error.notLoggedInDescription'),
      });
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        display_name: values.display_name,
        avatar_url: values.avatar_url || null,
        bio: values.bio || null,
      });
      navigate(`/profile/${profile.username}`);
    } catch (error) {
      // Error handled by mutation hook's onError
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profileLoadError || !profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">{t('profile.edit.loadErrorTitle')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('profile.edit.loadErrorDescription')}
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.backToHome')}
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-border/50">
        <div className="container flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/profile/${profile.username}`)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground fill-current" />
            </div>
            <span className="font-bold text-lg">
              Monynha<span className="text-primary">Fun</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8">
        <div className="container max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">{t('profile.edit.title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('profile.edit.description')}
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Avatar Preview */}
              <div className="flex flex-col items-center gap-4 mb-6">
                <Avatar className="w-24 h-24 border-2 border-primary">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName || profile.username || 'User'} />
                  <AvatarFallback className="bg-primary/20 text-primary text-3xl font-semibold">
                    {displayName ? displayName[0].toUpperCase() : (profile.username ? profile.username[0].toUpperCase() : <User className="w-12 h-12" />)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm text-muted-foreground">{t('profile.edit.avatarPreview')}</p>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="display-name">{t('profile.edit.form.displayNameLabel')} *</Label>
                <Input
                  id="display-name"
                  type="text"
                  placeholder={t('profile.edit.form.displayNamePlaceholder')}
                  {...register('display_name')}
                  aria-invalid={errors.display_name ? "true" : "false"}
                />
                {errors.display_name && (
                  <p role="alert" className="text-sm text-destructive">{t(errors.display_name.message as string)}</p>
                )}
              </div>

              {/* Avatar URL */}
              <div className="space-y-2">
                <Label htmlFor="avatar-url">{t('profile.edit.form.avatarUrlLabel')}</Label>
                <div className="relative">
                  <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="avatar-url"
                    type="url"
                    placeholder={t('profile.edit.form.avatarUrlPlaceholder')}
                    {...register('avatar_url')}
                    className="pl-10"
                    aria-invalid={errors.avatar_url ? "true" : "false"}
                  />
                </div>
                {errors.avatar_url && (
                  <p role="alert" className="text-sm text-destructive">{t(errors.avatar_url.message as string)}</p>
                )}
                <p className="text-xs text-muted-foreground">{t('profile.edit.form.avatarUrlHint')}</p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">{t('profile.edit.form.bioLabel')}</Label>
                <Textarea
                  id="bio"
                  placeholder={t('profile.edit.form.bioPlaceholder')}
                  {...register('bio')}
                  rows={4}
                  maxLength={300}
                  aria-invalid={errors.bio ? "true" : "false"}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {bio.length}/300
                </p>
                {errors.bio && (
                  <p role="alert" className="text-sm text-destructive">{t(errors.bio.message as string)}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('profile.edit.form.savingButton')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t('profile.edit.form.saveButton')}
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
