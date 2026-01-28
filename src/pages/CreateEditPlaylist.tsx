import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { useCreatePlaylist, usePlaylistById, useUpdatePlaylist } from '@/features/playlists/queries/usePlaylists';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save, BookOpen, Code, Globe, Image, GraduationCap } from 'lucide-react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppLayout } from '@/components/AppLayout';
import { Footer } from '@/components/Footer';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // NEW

const playlistSchema = z.object({
  name: z.string().min(3, 'createEditPlaylist.error.nameMinLength').max(100, 'createEditPlaylist.error.nameMaxLength'),
  slug: z.string().min(3, 'createEditPlaylist.error.slugMinLength').max(100, 'createEditPlaylist.error.slugMaxLength').regex(/^[a-z0-9-]+$/, 'createEditPlaylist.error.slugInvalidFormat'),
  description: z.string().max(500, 'createEditPlaylist.error.descriptionMaxLength').optional().or(z.literal('')),
  thumbnail_url: z.string().url('createEditPlaylist.error.invalidThumbnailUrl').optional().or(z.literal('')), // NEW
  course_code: z.string().max(50, 'createEditPlaylist.error.courseCodeMaxLength').optional().or(z.literal('')),
  unit_code: z.string().max(50, 'createEditPlaylist.error.unitCodeMaxLength').optional().or(z.literal('')),
  language: z.string().min(2, 'createEditPlaylist.error.languageRequired'),
  is_public: z.boolean(),
  is_ordered: z.boolean(), // NEW
});

type PlaylistFormValues = z.infer<typeof playlistSchema>;

export default function CreateEditPlaylist() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { playlistId } = useParams<{ playlistId: string }>();
  const isEditing = !!playlistId;

  const { user, loading: authLoading } = useAuth();
  const { data: existingPlaylist, isLoading: playlistLoading, isError: playlistLoadError } = usePlaylistById(playlistId);
  const createPlaylistMutation = useCreatePlaylist();
  const updatePlaylistMutation = useUpdatePlaylist();

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<PlaylistFormValues>({
    resolver: zodResolver(playlistSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      thumbnail_url: '', // NEW
      course_code: '',
      unit_code: '',
      language: 'pt',
      is_public: true,
      is_ordered: true, // NEW: Default to learning path
    },
  });

  const name = watch('name');
  const slug = watch('slug');
  const description = watch('description');
  const thumbnailUrl = watch('thumbnail_url'); // NEW
  const courseCode = watch('course_code');
  const unitCode = watch('unit_code');
  const language = watch('language');
  const isPublic = watch('is_public');
  const isOrdered = watch('is_ordered'); // NEW

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isEditing && existingPlaylist) {
      reset({
        name: existingPlaylist.name,
        slug: existingPlaylist.slug,
        description: existingPlaylist.description || '',
        thumbnail_url: existingPlaylist.thumbnail_url || '', // NEW
        course_code: existingPlaylist.course_code || '',
        unit_code: existingPlaylist.unit_code || '',
        language: existingPlaylist.language,
        is_public: existingPlaylist.is_public,
        is_ordered: existingPlaylist.is_ordered, // NEW
      });
    }
  }, [isEditing, existingPlaylist, reset]);

  const onSubmit = async (values: PlaylistFormValues) => {
    if (!user) {
      toast.error(t('createEditPlaylist.error.notLoggedInTitle'), {
        description: t('createEditPlaylist.error.notLoggedInDescription'),
      });
      return;
    }

    try {
      const playlistData = {
        name: values.name,
        slug: values.slug,
        description: values.description || null,
        thumbnail_url: values.thumbnail_url || null, // NEW
        course_code: values.course_code || null,
        unit_code: values.unit_code || null,
        language: values.language,
        is_public: values.is_public,
        is_ordered: values.is_ordered, // NEW
      };

      if (isEditing) {
        await updatePlaylistMutation.mutateAsync({ id: playlistId!, ...playlistData });
        navigate(`/playlists/${playlistId}`);
      } else {
        const newPlaylist = await createPlaylistMutation.mutateAsync(playlistData);
        navigate(`/playlists/${newPlaylist.id}`);
      }
    } catch (error) {
      // Error handled by mutation hooks' onError
    }
  };

  if (authLoading || playlistLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isEditing && playlistLoadError) {
    return (
      <AppLayout>
        <div className="flex-1 container py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">{t('createEditPlaylist.loadErrorTitle')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('createEditPlaylist.loadErrorDescription')}
          </p>
          <Button onClick={() => navigate('/playlists')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('createEditPlaylist.backToPlaylists')}
          </Button>
        </div>
        <Footer />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 py-8">
        <div className="container max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">{isEditing ? t('createEditPlaylist.editTitle') : t('createEditPlaylist.createTitle')}</h1>
            <p className="text-muted-foreground mt-2">
              {isEditing ? t('createEditPlaylist.editDescription') : t('createEditPlaylist.createDescription')}
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">{t('createEditPlaylist.form.nameLabel')} *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t('createEditPlaylist.form.namePlaceholder')}
                  {...register('name')}
                  aria-invalid={errors.name ? "true" : "false"}
                />
                {errors.name && (
                  <p role="alert" className="text-sm text-destructive">{t(errors.name.message as string)}</p>
                )}
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug">{t('createEditPlaylist.form.slugLabel')} *</Label>
                <Input
                  id="slug"
                  type="text"
                  placeholder={t('createEditPlaylist.form.slugPlaceholder')}
                  {...register('slug')}
                  aria-invalid={errors.slug ? "true" : "false"}
                />
                {errors.slug && (
                  <p role="alert" className="text-sm text-destructive">{t(errors.slug.message as string)}</p>
                )}
                <p className="text-xs text-muted-foreground">{t('createEditPlaylist.form.slugHint')}</p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('createEditPlaylist.form.descriptionLabel')}</Label>
                <Textarea
                  id="description"
                  placeholder={t('createEditPlaylist.form.descriptionPlaceholder')}
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

              {/* Thumbnail URL */}
              <div className="space-y-2">
                <Label htmlFor="thumbnail-url">{t('createEditPlaylist.form.thumbnailUrlLabel')}</Label>
                <div className="relative">
                  <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="thumbnail-url"
                    type="url"
                    placeholder={t('createEditPlaylist.form.thumbnailUrlPlaceholder')}
                    {...register('thumbnail_url')}
                    className="pl-10"
                    aria-invalid={errors.thumbnail_url ? "true" : "false"}
                  />
                </div>
                {errors.thumbnail_url && (
                  <p role="alert" className="text-sm text-destructive">{t(errors.thumbnail_url.message as string)}</p>
                )}
                <p className="text-xs text-muted-foreground">{t('createEditPlaylist.form.thumbnailUrlHint')}</p>
              </div>

              {/* Course Code */}
              <div className="space-y-2">
                <Label htmlFor="course-code">{t('createEditPlaylist.form.courseCodeLabel')}</Label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="course-code"
                    type="text"
                    placeholder={t('createEditPlaylist.form.courseCodePlaceholder')}
                    {...register('course_code')}
                    className="pl-10"
                    aria-invalid={errors.course_code ? "true" : "false"}
                  />
                </div>
                {errors.course_code && (
                  <p role="alert" className="text-sm text-destructive">{t(errors.course_code.message as string)}</p>
                )}
                <p className="text-xs text-muted-foreground">{t('createEditPlaylist.form.courseCodeHint')}</p>
              </div>

              {/* Unit Code */}
              <div className="space-y-2">
                <Label htmlFor="unit-code">{t('createEditPlaylist.form.unitCodeLabel')}</Label>
                <div className="relative">
                  <Code className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="unit-code"
                    type="text"
                    placeholder={t('createEditPlaylist.form.unitCodePlaceholder')}
                    {...register('unit_code')}
                    className="pl-10"
                    aria-invalid={errors.unit_code ? "true" : "false"}
                  />
                </div>
                {errors.unit_code && (
                  <p role="alert" className="text-sm text-destructive">{t(errors.unit_code.message as string)}</p>
                )}
                <p className="text-xs text-muted-foreground">{t('createEditPlaylist.form.unitCodeHint')}</p>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language">{t('createEditPlaylist.form.languageLabel')} *</Label>
                <Select value={language} onValueChange={(value) => setValue('language', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('createEditPlaylist.form.languagePlaceholder')} />
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

              {/* Playlist Type (is_ordered) */}
              <div className="space-y-2">
                <Label>{t('createEditPlaylist.form.playlistTypeLabel')}</Label>
                <RadioGroup
                  value={isOrdered ? 'ordered' : 'unordered'}
                  onValueChange={(value) => setValue('is_ordered', value === 'ordered')}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ordered" id="ordered" />
                    <Label htmlFor="ordered">{t('createEditPlaylist.form.learningPath')}</Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6 -mt-1 mb-2">{t('createEditPlaylist.form.learningPathHint')}</p>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unordered" id="unordered" />
                    <Label htmlFor="unordered">{t('createEditPlaylist.form.collection')}</Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6 -mt-1">{t('createEditPlaylist.form.collectionHint')}</p>
                </RadioGroup>
              </div>

              {/* Is Public Switch */}
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="is-public" className="flex flex-col">
                  <span>{t('createEditPlaylist.form.isPublicLabel')}</span>
                  <span className="text-xs text-muted-foreground">{t('createEditPlaylist.form.isPublicHint')}</span>
                </Label>
                <Switch
                  id="is-public"
                  checked={isPublic}
                  onCheckedChange={(checked) => setValue('is_public', checked)}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={createPlaylistMutation.isPending || updatePlaylistMutation.isPending}
              >
                {createPlaylistMutation.isPending || updatePlaylistMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('createEditPlaylist.form.submittingButton')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditing ? t('createEditPlaylist.form.saveButton') : t('createEditPlaylist.form.createButton')}
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </AppLayout>
  );
}
