import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCreatePlaylist, usePlaylistById, useUpdatePlaylist } from '@/hooks/usePlaylists';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, ListVideo, Loader2, Save, BookOpen, Code, Globe } from 'lucide-react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

const playlistSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  slug: z.string().min(3, 'Slug deve ter pelo menos 3 caracteres').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  description: z.string().max(500, 'Descrição não pode exceder 500 caracteres').optional(),
  course_code: z.string().optional(),
  unit_code: z.string().optional(),
  language: z.string().min(2, 'Idioma é obrigatório'),
  is_public: z.boolean(),
});

export default function CreateEditPlaylist() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { playlistId } = useParams<{ playlistId: string }>();
  const isEditing = !!playlistId;

  const { user, loading: authLoading } = useAuth();
  const { data: existingPlaylist, isLoading: playlistLoading, isError: playlistLoadError } = usePlaylistById(playlistId);
  const createPlaylistMutation = useCreatePlaylist();
  const updatePlaylistMutation = useUpdatePlaylist();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [language, setLanguage] = useState('pt');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isEditing && existingPlaylist) {
      setName(existingPlaylist.name);
      setSlug(existingPlaylist.slug);
      setDescription(existingPlaylist.description || '');
      setCourseCode(existingPlaylist.course_code || '');
      setUnitCode(existingPlaylist.unit_code || '');
      setLanguage(existingPlaylist.language);
      setIsPublic(existingPlaylist.is_public);
    }
  }, [isEditing, existingPlaylist]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const playlistData = {
      name,
      slug,
      description: description || null,
      course_code: courseCode || null,
      unit_code: unitCode || null,
      language,
      is_public: isPublic,
    };

    try {
      playlistSchema.parse(playlistData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(t('common.validationError'), {
          description: error.errors[0].message,
        });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updatePlaylistMutation.mutateAsync({ id: playlistId!, ...playlistData });
        navigate(`/playlists/${playlistId}`);
      } else {
        const newPlaylist = await createPlaylistMutation.mutateAsync(playlistData);
        navigate(`/playlists/${newPlaylist.id}`);
      }
    } catch (error) {
      // Error handled by mutation hooks' onError
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || playlistLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isEditing && playlistLoadError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">{t('createEditPlaylist.loadErrorTitle')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('createEditPlaylist.loadErrorDescription')}
          </p>
          <Button onClick={() => navigate('/playlists')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('createEditPlaylist.backToPlaylists')}
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
            onClick={() => navigate(isEditing ? `/playlists/${playlistId}` : '/playlists')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ListVideo className="w-4 h-4 text-primary-foreground fill-current" />
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
            <h1 className="text-3xl font-bold">{isEditing ? t('createEditPlaylist.editTitle') : t('createEditPlaylist.createTitle')}</h1>
            <p className="text-muted-foreground mt-2">
              {isEditing ? t('createEditPlaylist.editDescription') : t('createEditPlaylist.createDescription')}
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">{t('createEditPlaylist.form.nameLabel')} *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t('createEditPlaylist.form.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug">{t('createEditPlaylist.form.slugLabel')} *</Label>
                <Input
                  id="slug"
                  type="text"
                  placeholder={t('createEditPlaylist.form.slugPlaceholder')}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">{t('createEditPlaylist.form.slugHint')}</p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('createEditPlaylist.form.descriptionLabel')}</Label>
                <Textarea
                  id="description"
                  placeholder={t('createEditPlaylist.form.descriptionPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {description.length}/500
                </p>
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
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="pl-10"
                  />
                </div>
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
                    value={unitCode}
                    onChange={(e) => setUnitCode(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t('createEditPlaylist.form.unitCodeHint')}</p>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language">{t('createEditPlaylist.form.languageLabel')} *</Label>
                <Select value={language} onValueChange={setLanguage}>
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
                  onCheckedChange={setIsPublic}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting || createPlaylistMutation.isPending || updatePlaylistMutation.isPending}
              >
                {isSubmitting || createPlaylistMutation.isPending || updatePlaylistMutation.isPending ? (
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
      </main>
      <Footer />
    </div>
  );
}