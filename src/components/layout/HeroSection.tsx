import { ArrowRight, Sparkles, Youtube, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
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
  const videoUrlInputRef = useRef<HTMLInputElement | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<HeroSubmitFormValues>({
    resolver: zodResolver(heroSubmitSchema),
    defaultValues: {
      youtubeUrl: '',
    },
  });

  const { ref: youtubeUrlFieldRef, ...youtubeUrlField } = register('youtubeUrl');

  useEffect(() => {
    const input = videoUrlInputRef.current;
    if (!input || typeof window === 'undefined') {
      return;
    }

    const activeElement = document.activeElement;
    if (window.location.hash || (activeElement && activeElement !== document.body)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const targetInput = videoUrlInputRef.current;
      if (!targetInput) {
        return;
      }

      const currentActiveElement = document.activeElement;
      if (currentActiveElement && currentActiveElement !== document.body) {
        return;
      }

      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      try {
        targetInput.focus({ preventScroll: true });
      } catch {
        targetInput.focus();
      }

      if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
        window.scrollTo(scrollX, scrollY);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

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
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-sm border border-primary/50 bg-card/70 backdrop-blur-sm text-primary text-xs font-bold tracking-[0.35em] uppercase animate-fade-in shadow-[0_0_12px_var(--glow-primary)]">
          <Sparkles className="w-3 h-3 text-neon-cyan" />
          <span>{t('hero.badge')}</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-[0.1em] leading-[1.05] animate-fade-up font-mono" style={{ animationDelay: '0.1s' }}>
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
            <div className="relative flex items-center bg-card/95 rounded-lg p-1 border border-border/60 group-hover:border-transparent transition-colors">
              <div className="pl-3 text-muted-foreground">
                <Youtube className="w-5 h-5 group-focus-within:text-red-500 transition-colors" />
              </div>
              <Input
                {...youtubeUrlField}
                ref={(element) => {
                  youtubeUrlFieldRef(element);
                  videoUrlInputRef.current = element;
                }}
                id="youtube-url-hero"
                type="text"
                autoComplete="url"
                inputMode="url"
                placeholder={t('hero.submitUrlPlaceholder')}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70 h-10 md:h-12 text-foreground font-mono"
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
