import { AppLayout } from "@/components/AppLayout";
import { HeroSection } from "@/components/HeroSection";
import { VideoCard } from "@/components/VideoCard";
import { Footer } from "@/components/Footer";
import { useFeaturedVideos, useRecentVideos } from "@/features/videos/queries/useVideos";
import { usePlaylists } from "@/features/playlists/queries/usePlaylists"; // Import usePlaylists
import { ArrowRight, TrendingUp, Clock, Loader2, ListVideo } from "lucide-react"; // Import ListVideo icon
import { FeaturedHero } from "@/components/FeaturedHero";
import { Button } from "@/components/ui/button";
import { MarkFeaturedButton } from "@/features/admin-dev-tools/markFeatured";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { PlaylistCard } from "@/components/playlist/PlaylistCard"; // Import PlaylistCard
import { CategorySection } from "@/components/CategorySection"; // Import the new CategorySection

const Index = () => {
  const { t } = useTranslation(); // Initialize useTranslation
  const { data: featuredVideos, isLoading: featuredLoading } = useFeaturedVideos(4);
  const { data: recentVideos, isLoading: recentLoading } = useRecentVideos(4);
  const { data: recentPlaylists, isLoading: playlistsLoading } = usePlaylists({ isPublic: true }); // Fetch recent public playlists
  const navigate = useNavigate();

  return (
    <AppLayout>
      <main className="flex-1 w-full">
        {/* Hero */}
        <HeroSection />

        {/* Categories Section */}
        <CategorySection />

        {/* Recent Videos Section */}
        <section className="w-full py-12 sm:py-16 lg:py-20 bg-muted/30"> {/* Changed background to differentiate */}
          <div className="container">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/10"> {/* Changed icon background to primary */}
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> {/* Changed icon color to primary */}
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t('index.recentTitle')}</h2>
                  <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t('index.recentDescription')}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="gap-2 group shrink-0 h-9 sm:h-10"
                onClick={() => navigate('/videos?recent=true')}
              >
                <span className="hidden sm:inline">{t('index.viewAll')}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            {recentLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2 sm:space-y-3">
                    <Skeleton className="aspect-video rounded-xl sm:rounded-2xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : recentVideos && recentVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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
              <div className="text-center py-8 sm:py-12 text-muted-foreground text-sm sm:text-base">
                {t('index.noRecentVideos')}
              </div>
            )}
          </div>
        </section>

        {/* Featured Videos Section */}
        <section className="w-full py-12 sm:py-16 lg:py-20 bg-muted/30">
          <div className="container">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/10">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t('index.featuredTitle')}</h2>
                  <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t('index.featuredDescription')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  variant="ghost" 
                  className="gap-2 group flex-1 sm:flex-none h-9 sm:h-10"
                  onClick={() => navigate('/videos?featured=true')}
                >
                  <span className="hidden sm:inline">{t('index.viewAll')}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
                {import.meta.env.DEV && (
                  <MarkFeaturedButton limit={4} />
                )}
              </div>
            </div>
            {featuredLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="lg:col-span-2">
                  <div className="space-y-2 sm:space-y-3">
                    <Skeleton className="aspect-video rounded-2xl sm:rounded-3xl" />
                    <Skeleton className="h-6 w-3/4 mt-2" />
                    <Skeleton className="h-4 w-1/2 mt-1" />
                  </div>
                </div>
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-1.5 sm:space-y-2">
                      <Skeleton className="aspect-video rounded-xl sm:rounded-2xl" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              </div>
            ) : featuredVideos && featuredVideos.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 items-start">
                {/* Highlight the first featured video */}
                <div className="lg:col-span-2">
                  <div className="animate-fade-up" style={{ animationDelay: `0s` }}>
                    <FeaturedHero video={featuredVideos[0]} />
                  </div>
                </div>

                {/* The rest of featured videos as compact cards */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {featuredVideos.slice(1).map((video, index) => (
                    <div key={video.id} className="animate-fade-up" style={{ animationDelay: `${(index + 1) * 0.08}s` }}>
                      <VideoCard video={video} variant="compact" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12 text-muted-foreground text-sm sm:text-base">
                {t('index.noFeaturedVideos')}
              </div>
            )}
          </div>
        </section>

        {/* Recent Playlists Section */}
        <section className="w-full py-12 sm:py-16 lg:py-20 bg-background">
          <div className="container">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-accent/10">
                  <ListVideo className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t('index.playlistsTitle')}</h2>
                  <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t('index.playlistsDescription')}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="gap-2 group shrink-0 h-9 sm:h-10"
                onClick={() => navigate('/playlists')}
              >
                <span className="hidden sm:inline">{t('index.viewAll')}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            {playlistsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-56 sm:h-64 rounded-xl sm:rounded-2xl" />
                ))}
              </div>
            ) : recentPlaylists && recentPlaylists.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {recentPlaylists.map((playlist, index) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12 text-muted-foreground">
                <ListVideo className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 opacity-50 mx-auto" />
                <p className="text-base sm:text-lg font-medium mb-2">{t('index.noPlaylistsTitle')}</p>
                <p className="mb-4 sm:mb-6 text-sm sm:text-base">{t('index.noPlaylistsDescription')}</p>
                <Button onClick={() => navigate('/playlists/new')} className="w-full sm:w-auto">{t('index.createFirstPlaylist')}</Button>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                {t('index.ctaTitle')}
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
                {t('index.ctaDescription')}
              </p>
              <Button variant="hero" size="xl" className="gap-2 w-full sm:w-auto" onClick={() => navigate('/submit')}>
                {t('index.ctaButton')}
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </AppLayout>
  );
};

export default Index;
