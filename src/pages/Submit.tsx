import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { useCategories } from '@/features/categories/queries/useCategories';
import { useYouTubeMetadata } from '@/features/submit/useYouTubeMetadata';
import { useSubmitVideo } from '@/features/submit/useSubmitVideo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Link as LinkIcon, Loader2, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { submitVideoSchema, SubmitVideoFormValues } from '@/features/submit/submitVideoSchema';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export default function Submit() {
  const { t } = useTranslation();
  
  const { user, loading: authLoading } = useAuth();
  const { data: categories } = useCategories();
  const submitVideoMutation = useSubmitVideo();
  const navigate = useNavigate();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SubmitVideoFormValues>({
    resolver: zodResolver(submitVideoSchema),
    defaultValues: {
      youtubeUrl: '',
      description: '',
      language: 'pt',
      categoryId: '',
    },
  });

  const youtubeUrl = watch('youtubeUrl');
  const description = watch('description');
  const language = watch('language');
  const categoryId = watch('categoryId');

  const { metadata, isLoading: metadataLoading, error: metadataError } = useYouTubeMetadata(youtubeUrl);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const onSubmit = async (values: SubmitVideoFormValues) => {
    if (!metadata) {
      toast.error(t('submit.error.invalidUrlTitle'), {
        description: t('submit.error.invalidUrlDescription'),
      });
      return;
    }

    if (!user) {
      toast.error(t('submit.error.notLoggedInTitle'), {
        description: t('submit.error.notLoggedInDescription'),
      });
      return;
    }

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
        toast.error(t('submit.error.videoExistsTitle'), {
          description: t('submit.error.videoExistsDescription'),
        });
        return;
      }

      toast.success(t('submit.success.videoSubmittedTitle'), {
        description: t('submit.success.videoSubmittedDescription'),
      });

      toast.info(t('submit.info.aiEnrichmentStartedTitle'), {
        description: t('submit.info.aiEnrichmentStartedDescription'),
      });

      if (result.edgeError) {
        console.error('Error invoking AI enrichment function:', result.edgeError);
        toast.error(t('submit.error.aiEnrichmentFailedTitle'), {
          description: t('submit.error.aiEnrichmentFailedDescription'),
        });
      }

      navigate('/');
    } catch (err) {
      console.error('Error submitting video:', err);
      toast.error(t('submit.error.genericSubmitTitle'), {
        description: err instanceof Error ? err.message : String(err),
      });
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-border/50">
        <div className="container flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 text-primary-foreground fill-current" />
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
            <h1 className="text-3xl font-bold">{t('submit.title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('submit.description')}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* YouTube URL */}
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
                    {metadata && !metadataError && !metadataLoading && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                    )}
                    {(metadataError || errors.youtubeUrl) && !metadataLoading && (
                      <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                    )}
                  </div>
                  {errors.youtubeUrl && (
                    <p role="alert" className="text-sm text-destructive">{t(errors.youtubeUrl.message as string)}</p>
                  )}
                  {metadataError && !errors.youtubeUrl && (
                    <p className="text-sm text-destructive">{metadataError}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">{t('submit.form.descriptionLabel')}</Label>
                  <Textarea
                    id="description"
                    placeholder={t('submit.form.descriptionPlaceholder')}
                    {...register('description')}
                    rows={3}
                    maxLength={500}
                    aria-invalid={errors.description ? "true" : "false"}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {description.length}/500
                  </p>
                  {errors.description && (
                    <p role="alert" className="text-sm text-destructive">{t(errors.description.message as string)}</p>
                  )}
                </div>

                {/* Language */}
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
                  {errors.language && (
                    <p role="alert" className="text-sm text-destructive">{t(errors.language.message as string)}</p>
                  )}
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">{t('submit.form.categoryLabel')}</Label>
                  <Select value={categoryId} onValueChange={(value) => setValue('categoryId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('submit.form.categoryPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.categoryId && (
                    <p role="alert" className="text-sm text-destructive">{t(errors.categoryId.message as string)}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={submitVideoMutation.isPending || !metadata || metadataLoading}
                >
                  {submitVideoMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('submit.form.submittingButton')}
                    </>
                  ) : (
                    t('submit.form.submitButton')
                  )}
                </Button>
              </form>
            </div>

            {/* Preview */}
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">{t('submit.previewTitle')}</h2>
              
              {metadata ? (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-fade-in">
                  {/* Thumbnail */}
                  <div className="relative aspect-video">
                    <img
                      src={metadata.thumbnailUrl}
                      alt={metadata.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to lower quality thumbnail
                        const target = e.target as HTMLImageElement;
                        if (target.src.includes('maxresdefault')) {
                          target.src = target.src.replace('maxresdefault', 'hqdefault');
                        } else {
                          target.src = '/placeholder.svg'; // Fallback to placeholder if hqdefault also fails
                          target.onerror = null; // Prevent infinite loop
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-foreground/10 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                        <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold line-clamp-2">{metadata.title}</h3>
                    <p className="text-sm text-muted-foreground">{metadata.channelName}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/50 border border-dashed border-border rounded-2xl aspect-video flex flex-col items-center justify-center text-muted-foreground">
                  <Play className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">{t('submit.previewPlaceholder')}</p>
                </div>
              )}

              {/* Tips */}
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
      </main>
    </div>
  );
}
