import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { useCategories } from '@/features/categories/queries/useCategories';
import { useYouTubeMetadata } from '@/features/submit/useYouTubeMetadata';
import { useSubmitVideo } from '@/features/submit/useSubmitVideo';
import { useEditablePlaylists, useAddVideoToPlaylist } from '@/features/playlists';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { notify } from '@/shared/lib/notify';
import { ArrowLeft, Link as LinkIcon, Loader2, Play, CheckCircle, AlertCircle, ListVideo } from 'lucide-react';
import { submitVideoSchema, SubmitVideoFormValues } from '@/features/submit/submitVideoSchema';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MainLayout } from '@/components/layout/MainLayout';
import { VideoPreviewCard } from '@/features/submit/components/VideoPreviewCard';

export default function Submit() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { user, loading: authLoading } = useAuth();
  const { data: categories } = useCategories();
  const { data: editablePlaylists } = useEditablePlaylists();
  const submitVideoMutation = useSubmitVideo();
  const addVideoToPlaylistMutation = useAddVideoToPlaylist();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SubmitVideoFormValues>({
    resolver: zodResolver(submitVideoSchema),
    defaultValues: {
      youtubeUrl: '',
      description: '',
      language: 'pt',
      categoryId: '',
      playlistId: 'none',
    },
  });

  const youtubeUrl = watch('youtubeUrl');
  const description = watch('description');
  const language = watch('language');
  const categoryId = watch('categoryId');
  const playlistId = watch('playlistId');

  const { metadata, isLoading: metadataLoading, error: metadataError } = useYouTubeMetadata(youtubeUrl);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const prefillUrl = location.state?.prefillVideoUrl || localStorage.getItem('prefillVideoUrl');
    if (prefillUrl) {
      setValue('youtubeUrl', prefillUrl);
      localStorage.removeItem('prefillVideoUrl');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, setValue, navigate]);

  const onSubmit = async (values: SubmitVideoFormValues) => {
    if (!metadata || !user) return;

    try {
      const result = await submitVideoMutation.mutateAsync({
        metadata,
        description: values.description,
        language: values.language,
        categoryId: values.categoryId || undefined,
        userId: user.id,
        youtubeUrl,
      });

      if (result.status === 'exists') {
        notify.error(t('submit.error.videoExistsTitle'), {
          description: t('submit.error.videoExistsDescription'),
        });
        return;
      }

      const newVideo = result.video;

      if (values.playlistId && values.playlistId !== 'none') {
        await addVideoToPlaylistMutation.mutateAsync({
          playlistId: values.playlistId,
          videoId: newVideo.id,
        });
      }

      notify.success(t('submit.success.videoSubmittedTitle'));
      navigate('/');
    } catch (err) {
      notify.error(t('submit.error.genericSubmitTitle'));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">{t('submit.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('submit.description')}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="youtube-url">{t('submit.form.youtubeUrlLabel')} *</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="youtube-url"
                    type="url"
                    placeholder={t('submit.form.youtubeUrlPlaceholder')}
                    {...register('youtubeUrl')}
                    className="pl-10"
                    aria-invalid={errors.youtubeUrl ? "true" : "false"}
                  />
                  {metadataLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {errors.youtubeUrl && <p className="text-sm text-destructive">{t(errors.youtubeUrl.message as string)}</p>}
                {metadataError && !errors.youtubeUrl && <p className="text-sm text-destructive">{metadataError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('submit.form.descriptionLabel')}</Label>
                <Textarea
                  id="description"
                  placeholder={t('submit.form.descriptionPlaceholder')}
                  {...register('description')}
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">{t('submit.form.languageLabel')}</Label>
                <Select value={language} onValueChange={(value) => setValue('language', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('submit.form.languagePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">{t('common.language.pt')}</SelectItem>
                    <SelectItem value="en">{t('common.language.en')}</SelectItem>
                    <SelectItem value="es">{t('common.language.es')}</SelectItem>
                    <SelectItem value="fr">{t('common.language.fr')}</SelectItem>
                    <SelectItem value="other">{t('common.language.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">{t('submit.form.categoryLabel')}</Label>
                <Select value={categoryId} onValueChange={(value) => setValue('categoryId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('submit.form.categoryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="playlist">{t('header.playlists')}</Label>
                <Select value={playlistId} onValueChange={(value) => setValue('playlistId', value)}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <ListVideo className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common.none')}</SelectItem>
                    {editablePlaylists?.map((pl) => (
                      <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={submitVideoMutation.isPending || !metadata || metadataLoading}
              >
                {submitVideoMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {t('submit.form.submitButton')}
              </Button>
            </form>
          </div>

          <div className="space-y-4">
            <h2 className="font-semibold text-lg">{t('submit.previewTitle')}</h2>
            <VideoPreviewCard metadata={metadata} />
            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <h3 className="font-medium text-sm">{t('submit.tipsTitle')}</h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• {t('submit.tip1')}</li>
                <li>• {t('submit.tip2')}</li>
                <li>• {t('submit.tip3')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}