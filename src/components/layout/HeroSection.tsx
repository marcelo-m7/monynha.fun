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
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 py-16 md:py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[500px] h-[500px] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium animate-fade-up">
            <Sparkles className="w-4 h-4" />
            <span>{t('hero.badge')}</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight animate-fade-up" style={{ animationDelay: "0.1s" }}>
            {t('hero.headingPart1')}{" "}
            <span className="text-gradient">{t('hero.headingPart2')}</span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "0.2s" }}>
            {t('hero.description')}
          </p>

          {/* Video Submission Input */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="w-full max-w-xl mx-auto mt-4 animate-fade-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="youtube-url-hero"
                  type="url"
                  placeholder={t('hero.submitUrlPlaceholder')}
                  {...register('youtubeUrl')}
                  className="h-12 pl-10 pr-4"
                  aria-invalid={errors.youtubeUrl ? "true" : "false"}
                />
                {errors.youtubeUrl && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                )}
              </div>
              <Button type="submit" className="px-6" variant="hero" disabled={isSubmittingForm || authLoading}>
                {isSubmittingForm || authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </Button>
            </div>
            {errors.youtubeUrl && (
              <p role="alert" className="text-sm text-destructive mt-2 text-left">
                {t(errors.youtubeUrl.message as string)}
              </p>
            )}
          </form>

          {/* Secondary CTA Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <Button
              variant="outline"
              size="lg"
              onClick={handleDirectSubmitClick}
              disabled={authLoading}
            >
              {t('hero.submitVideoButton')}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/videos')}
            >
              {t('hero.exploreVideosButton')}
              <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
