import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { useYouTubeMetadata } from '@/hooks/useYouTubeMetadata';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Link as LinkIcon, Loader2, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { z } from 'zod';

const urlSchema = z.string().url('URL inválida').refine(
  (url) => url.includes('youtube.com') || url.includes('youtu.be'),
  'Apenas URLs do YouTube são aceitas'
);

export default function Submit() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('pt');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user, loading: authLoading } = useAuth();
  const { data: categories } = useCategories();
  const { metadata, isLoading: metadataLoading, error: metadataError } = useYouTubeMetadata(youtubeUrl);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!metadata) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira uma URL válida do YouTube',
        variant: 'destructive'
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para enviar vídeos',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if video already exists
      const { data: existingVideo } = await supabase
        .from('videos')
        .select('id')
        .eq('youtube_id', metadata.videoId)
        .maybeSingle();

      if (existingVideo) {
        toast({
          title: 'Vídeo já existe',
          description: 'Este vídeo já foi enviado por outro usuário',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      // Insert new video
      const { error } = await supabase
        .from('videos')
        .insert({
          youtube_id: metadata.videoId,
          title: metadata.title,
          description: description || metadata.description || null,
          channel_name: metadata.channelName,
          thumbnail_url: metadata.thumbnailUrl,
          language,
          category_id: categoryId || null,
          submitted_by: user.id
        });

      if (error) throw error;

      toast({
        title: 'Vídeo enviado!',
        description: 'Seu vídeo foi adicionado com sucesso ao acervo',
      });

      navigate('/');
    } catch (err) {
      console.error('Error submitting video:', err);
      toast({
        title: 'Erro ao enviar',
        description: 'Ocorreu um erro ao enviar o vídeo. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
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
            Voltar
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
            <h1 className="text-3xl font-bold">Enviar Vídeo</h1>
            <p className="text-muted-foreground mt-2">
              Compartilhe um vídeo interessante do YouTube com a comunidade
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* YouTube URL */}
                <div className="space-y-2">
                  <Label htmlFor="youtube-url">URL do YouTube *</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="youtube-url"
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className="pl-10"
                      required
                    />
                    {metadataLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    {metadata && !metadataLoading && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                    )}
                    {metadataError && !metadataLoading && (
                      <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                    )}
                  </div>
                  {metadataError && (
                    <p className="text-sm text-destructive">{metadataError}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Por que este vídeo é interessante?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {description.length}/500
                  </p>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma do vídeo</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">Português</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria (opcional)</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isSubmitting || !metadata || metadataLoading}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Vídeo'
                  )}
                </Button>
              </form>
            </div>

            {/* Preview */}
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Preview</h2>
              
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
                  <p className="text-sm">Cole uma URL do YouTube para ver o preview</p>
                </div>
              )}

              {/* Tips */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                <h3 className="font-medium text-sm">Dicas</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Vídeos únicos e interessantes são mais valorizados</li>
                  <li>• Escolha a categoria correta para facilitar a descoberta</li>
                  <li>• Adicione uma descrição explicando por que o vídeo é especial</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
