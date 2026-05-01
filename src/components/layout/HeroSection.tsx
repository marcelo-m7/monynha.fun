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

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || document.visibilityState !== 'visible') {
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

  const handleHowItWorksClick = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative w-full py-20 md:py-32 flex flex-col items-center justify-center min-h-[70vh] border-b border-border bg-background">
      <div className="container flex flex-col items-center text-center space-y-10">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-primary/50 bg-primary/8 text-foreground text-xs font-bold tracking-[0.35em] uppercase">
          <Sparkles className="w-3 h-3" />
          <span>{t('hero.badge')}</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-[0.06em] leading-[1.05] font-mono">
          <span className="block text-foreground">
            {t('hero.headingPart1')}
          </span>
          <span className="text-foreground">
            {t('hero.headingPart2')}
          </span>
        </h1>

        <p className="max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
          {t('hero.description')}
        </p>

        {/* Action Area */}
        <div className="w-full max-w-md space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="relative">
            <div className="flex items-center border border-border bg-card focus-within:border-primary transition-colors">
              <div className="pl-3 text-muted-foreground">
                <Youtube className="w-5 h-5" />
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
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 placeholder:text-muted-foreground/70 h-10 md:h-12 text-foreground font-mono"
              />
              <Button
                type="submit"
                variant="default"
                className="h-10 md:h-12 px-6"
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
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
              onClick={handleHowItWorksClick}
            >
              {t('home.howItWorks.title')}
            </Button>
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
