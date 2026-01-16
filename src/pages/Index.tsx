import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { CategoryCard } from "@/components/CategoryCard";
import { VideoCard } from "@/components/VideoCard";
import { Footer } from "@/components/Footer";
import { useCategories } from "@/hooks/useCategories";
import { useFeaturedVideos, useRecentVideos } from "@/hooks/useVideos";
import { ArrowRight, TrendingUp, Clock, Loader2 } from "lucide-react";
import { FeaturedHero } from "@/components/FeaturedHero";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next'; // Import useTranslation

const Index = () => {
  const { t } = useTranslation(); // Initialize useTranslation
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: featuredVideos, isLoading: featuredLoading } = useFeaturedVideos(4);
  const { data: recentVideos, isLoading: recentLoading } = useRecentVideos(4);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <HeroSection />

        {/* Categories Section */}
        <section className="py-16 bg-background">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">{t('index.categoriesTitle')}</h2>
                <p className="text-muted-foreground mt-1">{t('index.categoriesDescription')}</p>
              </div>
              <Button 
                variant="ghost" 
                className="gap-2 group"
                onClick={() => navigate('/videos')}
              >
                {t('index.viewAll')}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            {categoriesLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {categories?.map((category, index) => (
                  <div
                    key={category.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <CategoryCard 
                      category={category} 
                      onClick={() => navigate(`/videos?category=${category.id}`)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Featured Videos Section */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">{t('index.featuredTitle')}</h2>
                  <p className="text-muted-foreground mt-1">{t('index.featuredDescription')}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="gap-2 group"
                onClick={() => navigate('/videos?featured=true')}
              >
                {t('index.viewAll')}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            {featuredLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-2">
                  <div className="space-y-3">
                    <Skeleton className="aspect-video rounded-3xl" />
                    <Skeleton className="h-6 w-3/4 mt-2" />
                    <Skeleton className="h-4 w-1/2 mt-1" />
                  </div>
                </div>
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-video rounded-2xl" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              </div>
            ) : featuredVideos && featuredVideos.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Highlight the first featured video */}
                <div className="lg:col-span-2">
                  <div className="animate-fade-up" style={{ animationDelay: `0s` }}>
                    <FeaturedHero video={featuredVideos[0]} />
                  </div>
                </div>

                {/* The rest of featured videos as compact cards */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {featuredVideos.slice(1).map((video, index) => (
                    <div key={video.id} className="animate-fade-up" style={{ animationDelay: `${(index + 1) * 0.08}s` }}>
                      <VideoCard video={video} variant="compact" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {t('index.noFeaturedVideos')}
              </div>
            )}
          </div>
        </section>

        {/* Recent Videos Section */}
        <section className="py-16 bg-background">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent/10">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">{t('index.recentTitle')}</h2>
                  <p className="text-muted-foreground mt-1">{t('index.recentDescription')}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="gap-2 group"
                onClick={() => navigate('/videos?recent=true')}
              >
                {t('index.viewAll')}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            {recentLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-video rounded-2xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : recentVideos && recentVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recentVideos.map((video, index) => (
                  <div
                    key={video.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <VideoCard video={video} variant="default" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {t('index.noRecentVideos')}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                {t('index.ctaTitle')}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t('index.ctaDescription')}
              </p>
              <Button variant="hero" size="xl" className="gap-2" onClick={() => navigate('/submit')}>
                {t('index.ctaButton')}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;