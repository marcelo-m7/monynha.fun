import { ArrowRight, Sparkles, Youtube, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/features/auth/useAuth';
import { extractYouTubeId } from '@/shared/lib/youtube';
import { toast } from 'sonner';

// Define Zod schema for the YouTube URL input
const heroSubmitSchema = z.object({
  youtubeUrl: z
    .string()
    .url('hero.error.invalidUrl')
    .refine((url) => {
      const youtubeId = extractYouTubeId(url);
      return !!youtubeId;
    }, 'hero.error.notYoutubeUrl'),
});

type HeroSubmitFormValues = z.infer<typeof heroSubmitSchema>;

export const HeroSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<HeroSubmitFormValues>({
    resolver: zodResolver(heroSubmitSchema),
    defaultValues: {
      youtubeUrl: '',
    },
  });

  const onSubmit = async (values: HeroSubmitFormValues) => {
    setIsSubmittingForm(true);
    const youtubeUrl = values.youtubeUrl;

    if (!youtubeUrl) {
      toast.error(t('hero.error.emptyUrl'));
      setIsSubmittingForm(false);
      return;
    }

    // Client-side validation for YouTube URL format
    const youtubeId = extractYouTubeId(youtubeUrl);
    if (!youtubeId) {
      toast.error(t('hero.error.invalidYoutubeUrl'));
      setIsSubmittingForm(false);
      return;
    }

    if (user) {
      // User is authenticated, redirect directly to Submit page
      navigate('/submit', { state: { prefillVideoUrl: youtubeUrl } });
    } else {
      // User is not authenticated, redirect to Auth page and store URL
      localStorage.setItem('redirectAfterLogin', '/submit');
      localStorage.setItem('prefillVideoUrl', youtubeUrl);
      navigate('/auth');
    }
    setIsSubmittingForm(false);
  };

  // Handle direct submission from the "Submit a Video" button
  const handleDirectSubmitClick = () => {
    // If the input is empty, just navigate to submit page
    // The submit page will handle the empty state or prompt for URL
    const currentUrl = (document.getElementById('youtube-url-hero') as HTMLInputElement)?.value;
    if (currentUrl && extractYouTubeId(currentUrl)) {
      onSubmit({ youtubeUrl: currentUrl });
    } else {
      if (user) {
        navigate('/submit');
      } else {
        localStorage.setItem('redirectAfterLogin', '/submit');
        navigate('/auth');
      }
    }
  };

  return (
    <section className="relative w-full overflow-hidden py-20 md:py-32 flex flex-col items-center justify-center min-h-[70vh] border-b border-border/40 bg-background">
      {/* Cyberpunk Grid Background */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-background via-background to-background opacity-80 pointer-events-none" />
      
      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none animate-pulse delay-700" />

      <div className="container relative z-10 flex flex-col items-center text-center space-y-10">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-sm border border-primary/50 bg-black/60 backdrop-blur-sm text-primary text-xs font-bold tracking-[0.2em] uppercase animate-fade-in shadow-[0_0_10px_rgba(0,245,255,0.2)]">
          <Sparkles className="w-3 h-3 text-neon-cyan" />
          <span>{t('hero.badge')}</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[1.1] animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <span className="block text-foreground drop-shadow-[0_0_10px_var(--glow-primary)]">
            {t('hero.headingPart1')}
          </span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-foreground to-secondary drop-shadow-[0_0_15px_var(--glow-primary)] animate-flicker">
            {t('hero.headingPart2')}
          </span>
        </h1>

        <p className="max-w-2xl text-lg md:text-xl text-muted-foreground/80 md:leading-relaxed animate-fade-up" style={{ animationDelay: '0.2s' }}>
          {t('hero.description')}
        </p>

        {/* Action Area */}
        <div className="w-full max-w-md space-y-4 animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-cyan to-neon-pink rounded-lg opacity-30 group-hover:opacity-100 transition duration-500 blur"></div>
            <div className="relative flex items-center bg-card/90 rounded-lg p-1 border border-border group-hover:border-transparent transition-colors">
              <div className="pl-3 text-muted-foreground">
                <Youtube className="w-5 h-5 group-focus-within:text-red-500 transition-colors" />
              </div>
              <Input
                {...register('youtubeUrl')}
                id="youtube-url-hero"
                type="text"
                placeholder={t('hero.submitUrlPlaceholder')}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 h-10 md:h-12 text-foreground"
              />
              <Button 
                type="submit" 
                variant="default"
                className="h-10 md:h-12 px-6 rounded-md"
                disabled={isSubmittingForm || authLoading}
              >
                {isSubmittingForm || authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </Button>
            </div>
            {errors.youtubeUrl && (
              <p className="absolute -bottom-6 left-0 text-xs text-destructive font-bold uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {t(errors.youtubeUrl.message as string)}
              </p>
            )}
          </form>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
             {/* Secondary Action - Explore */}
             <Button
               variant="outline"
               size="lg"
               className="w-full sm:w-auto"
               onClick={() => navigate('/videos')}
             >
                {t('hero.exploreVideosButton')}
             </Button>

            <Button 
                variant="ghost" 
                size="lg"
                className="w-full sm:w-auto text-muted-foreground hover:text-foreground"
                onClick={handleDirectSubmitClick}
            >
                {t('hero.submitVideoButton')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
