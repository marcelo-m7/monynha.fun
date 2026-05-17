import { ArrowRight, Sparkles, Youtube, Loader2, AlertCircle, PlayCircle, Tags, ListChecks, Wand2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Reveal, Stagger, StaggerItem } from "@/components/premium/Motion";
import { MagneticButton } from "@/components/premium/MagneticButton";

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
    <section className="relative flex min-h-[calc(100svh-4rem)] w-full items-center overflow-hidden border-b border-white/10 py-14 md:py-20">
      <div className="ambient-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-primary/25 blur-3xl animate-ambient-pan" />
      <div className="pointer-events-none absolute -right-24 top-28 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl animate-ambient-pan" />
      <div className="container relative z-10 grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
        <Reveal className="space-y-8 text-center lg:text-left">
          <Badge variant="outline" className="mx-auto gap-2 border-primary/30 bg-primary/10 px-4 py-1.5 text-primary lg:mx-0">
            <Sparkles className="h-3.5 w-3.5" />
            {t('hero.badge')}
          </Badge>

          <div className="space-y-5">
            <h1 className="text-balance text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
              <span className="block">{t('hero.headingPart1')}</span>
              <span className="block bg-gradient-to-r from-primary via-sky-300 to-emerald-300 bg-clip-text text-transparent">
                {t('hero.headingPart2')}
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg lg:mx-0">
              {t('hero.description')}
            </p>
          </div>

          <div className="w-full max-w-2xl space-y-4 lg:max-w-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="relative">
            <div className="premium-surface flex items-center overflow-hidden rounded-2xl focus-within:border-primary/70 focus-within:shadow-glow">
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
                className="h-12 border-0 bg-transparent text-foreground placeholder:text-muted-foreground/70 focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 md:h-14"
              />
              <Button
                type="submit"
                variant="default"
                className="m-1 h-10 rounded-xl px-5 md:h-12"
                disabled={isSubmittingForm || authLoading}
                aria-label={t('hero.submitVideoButton')}
              >
                {isSubmittingForm || authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </Button>
            </div>
            {errors.youtubeUrl && (
              <p className="absolute -bottom-6 left-0 flex items-center gap-1 text-xs font-bold text-destructive">
                <AlertCircle className="w-3 h-3" />
                {t(errors.youtubeUrl.message as string)}
              </p>
            )}
          </form>

          <div className="flex flex-col justify-center gap-3 pt-4 sm:flex-row lg:justify-start">
            <MagneticButton
              variant="secondary"
              size="lg"
              className="w-full rounded-full sm:w-auto"
              onClick={handleHowItWorksClick}
            >
              {t('home.howItWorks.title')}
            </MagneticButton>
            <MagneticButton
              variant="outline"
              size="lg"
              className="w-full rounded-full sm:w-auto"
              onClick={() => navigate('/videos')}
            >
              {t('hero.exploreVideosButton')}
            </MagneticButton>
            <MagneticButton
              variant="ghost"
              size="lg"
              className="w-full rounded-full text-muted-foreground hover:text-foreground sm:w-auto"
              onClick={handleDirectSubmitClick}
            >
              {t('hero.submitVideoButton')}
            </MagneticButton>
          </div>
        </div>

          <Stagger className="grid grid-cols-3 gap-3 pt-2">
            {[
              ['hero.stats.videos', '12k+'],
              ['hero.stats.tags', '98%'],
              ['hero.stats.community', '24/7'],
            ].map(([labelKey, value]) => (
              <StaggerItem key={labelKey} className="premium-glass rounded-2xl p-4">
                <p className="text-2xl font-black">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t(labelKey)}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </Reveal>

        <Reveal delay={0.1} className="relative">
          <div className="premium-surface relative overflow-hidden rounded-3xl p-3 shadow-ambient">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-950 text-white">
              <div className="relative h-1/2 overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(239,255,0,0.35),transparent_30%),linear-gradient(135deg,#0f172a,#020617)]">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/12 backdrop-blur-xl ring-1 ring-white/20">
                    <PlayCircle className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="h-2 rounded-full bg-white/15">
                    <div className="h-full w-2/3 rounded-full bg-primary" />
                  </div>
                </div>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                <div className="space-y-3 sm:col-span-2">
                  <p className="text-xs font-semibold text-primary">{t('hero.preview.label')}</p>
                  <h2 className="text-2xl font-black leading-tight">{t('hero.preview.title')}</h2>
                  <p className="text-sm leading-6 text-white/68">{t('hero.preview.summary')}</p>
                </div>
                <div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
                  <Tags className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-sm font-bold">{t('hero.preview.tags')}</p>
                  <p className="mt-1 text-xs text-white/60">open-source · react · educação</p>
                </div>
                <div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
                  <ListChecks className="mb-3 h-5 w-5 text-sky-300" />
                  <p className="text-sm font-bold">{t('hero.preview.playlist')}</p>
                  <p className="mt-1 text-xs text-white/60">{t('hero.preview.reason')}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="premium-glass absolute -bottom-5 left-5 hidden max-w-56 rounded-2xl p-4 shadow-lg md:block">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Wand2 className="h-4 w-4 text-primary" />
              {t('hero.preview.ai')}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t('hero.preview.aiDescription')}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
