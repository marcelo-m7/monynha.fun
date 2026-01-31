import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { useProfileById, useUpdateProfile } from '@/features/profile/queries/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, User, Loader2, Save } from 'lucide-react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { SocialAccountsManager } from '@/components/profile/SocialAccountsManager'; // Import the new component

const editProfileSchema = z.object({
  display_name: z.string().min(3, 'profile.edit.error.displayNameMinLength').max(50, 'profile.edit.error.displayNameMaxLength'),
  avatar_url: z.string().optional().or(z.literal('')),
  avatar_path: z.string().optional().or(z.literal('')), // New field for storage path
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
      avatar_path: '', // Initialize new field
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
        avatar_path: profile.avatar_path || '', // Set initial avatar_path
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
        avatar_path: values.avatar_path || null, // Include avatar_path in update
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
              {/* Avatar Upload */}
              <div className="mb-6">
                <AvatarUpload
                  userId={user!.id}
                  currentAvatarUrl={avatarUrl}
                  currentAvatarPath={profile.avatar_path} // Pass current avatar path
                  displayName={displayName}
                  username={profile.username}
                  onUploadComplete={(url, path) => {
                    setValue('avatar_url', url);
                    setValue('avatar_path', path);
                  }}
                />
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

              {/* Social Accounts Manager */}
              {user && (
                <div className="border-t border-border/50 pt-6 mt-6">
                  <SocialAccountsManager userId={user.id} />
                </div>
              )}

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