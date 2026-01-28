import { ArrowRight, Sparkles, Youtube, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useVideoCount } from "@/features/videos/queries/useVideos"; // Import the new hook
import { useContributorCount } from "@/features/profile/queries/useProfile"; // Import the new hook
import { useCategories } from "@/features/categories/queries/useCategories";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton for loading state

export const HeroSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { data: videoCount, isLoading: videoCountLoading } = useVideoCount(); // Use the hook
  const { data: contributorCount, isLoading: contributorCountLoading } = useContributorCount(); // Use the hook
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 sm:py-16 md:py-20 lg:py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-6 sm:space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium animate-fade-up">
            <Sparkles className="w-4 h-4" />
            <span>{t('hero.badge')}</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight animate-fade-up" style={{ animationDelay: "0.1s" }}>
            {t('hero.headingPart1')}{" "}
            <span className="text-gradient">{t('hero.headingPart2')}</span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: "0.2s" }}>
            {t('hero.description')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <Button 
              variant="hero" 
              size="xl" 
              className="gap-2 group w-full sm:w-auto"
              onClick={() => navigate('/submit')}
            >
              <Youtube className="w-5 h-5" />
              {t('hero.submitVideoButton')}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => navigate('/videos')}
            >
              {t('hero.exploreCategoriesButton')}
            </Button>
          </div>

          {/* Search (prominent) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) navigate(`/videos?query=${encodeURIComponent(query.trim())}`);
            }}
            className="w-full max-w-xl mx-auto mt-2 sm:mt-4"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="search"
                placeholder={t('hero.searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 sm:h-12 text-base"
              />
              <Button type="submit" className="px-6 sm:px-4 h-11 sm:h-12" variant="hero">
                {t('hero.searchButton')}
              </Button>
            </div>

            {/* Trending categories */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground">
              <span className="mr-1 sm:mr-2 font-medium text-muted-foreground">{t('hero.trendingLabel')}</span>
              {categoriesLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                categories?.slice(0, 6).map((c) => (
                  <Button
                    key={c.id}
                    variant="ghost"
                    size="sm"
                    className="px-3 py-1"
                    onClick={() => navigate(`/videos?category=${c.id}`)}
                  >
                    {c.name}
                  </Button>
                ))
              )}
            </div>
          </form>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-8 pt-6 sm:pt-8 animate-fade-up text-sm sm:text-base" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground">
              <Youtube className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              {videoCountLoading ? (
                <Skeleton className="h-5 w-12" />
              ) : (
                <span className="font-semibold text-foreground">{videoCount?.toLocaleString()}</span>
              )}
              <span>{t('hero.videosCount', { count: videoCount || 0 })}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
              {contributorCountLoading ? (
                <Skeleton className="h-5 w-12" />
              ) : (
                <span className="font-semibold text-foreground">{contributorCount?.toLocaleString()}</span>
              )}
              <span>{t('hero.contributorsCount', { count: contributorCount || 0 })}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
