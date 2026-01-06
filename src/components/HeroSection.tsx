import { ArrowRight, Sparkles, Youtube, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom"; // Import useNavigate

export const HeroSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate(); // Initialize useNavigate

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

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <Button 
              variant="hero" 
              size="xl" 
              className="gap-2 group"
              onClick={() => navigate('/submit')} {/* Updated link */}
            >
              <Youtube className="w-5 h-5" />
              {t('hero.submitVideoButton')}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/videos')} {/* Updated link */}
            >
              {t('hero.exploreCategoriesButton')}
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-8 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Youtube className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">2,659</span>
              <span>{t('hero.videosCount', { count: 2659 })}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5 text-accent" />
              <span className="font-semibold text-foreground">1,247</span>
              <span>{t('hero.contributorsCount', { count: 1247 })}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};