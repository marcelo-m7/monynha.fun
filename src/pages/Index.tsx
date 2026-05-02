import { MainLayout } from "@/components/layout/MainLayout";
import { HeroSection } from "@/components/layout/HeroSection";
import { VideoCard } from "@/components/video/VideoCard";
import { useFeaturedVideos, useRecentVideos } from "@/features/videos/queries/useVideos";
import { usePlaylists } from "@/features/playlists/queries/usePlaylists";
import { ArrowRight, TrendingUp, Clock, ListVideo } from "lucide-react";
import { FeaturedHero } from "@/components/layout/FeaturedHero";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { PlaylistCard } from "@/components/playlist/PlaylistCard";
import { CategorySection } from "@/components/layout/CategorySection";
import { CommunitySpotlightSection } from "@/components/layout/CommunitySpotlightSection";
import { HowItWorksSection } from "@/components/layout/HowItWorksSection";
import { IntelligentSystemSection } from "@/components/layout/IntelligentSystemSection";
import { UseCasesSection } from "@/components/layout/UseCasesSection";
import { EditorApplicationCTA } from "@/features/editor-applications";

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const { data: featuredVideos, isLoading: featuredLoading } = useFeaturedVideos(4);
  const { data: recentVideos, isLoading: recentLoading } = useRecentVideos(4);
  const { data: recentPlaylists, isLoading: playlistsLoading } = usePlaylists({ isPublic: true });

  return (
    <MainLayout>
      <HeroSection />
      <HowItWorksSection />
      <IntelligentSystemSection />
      <UseCasesSection />
      <CategorySection />

      <section className="py-20 bg-background border-t border-primary/20">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border border-primary/40 text-primary text-[0.65rem] font-bold uppercase tracking-[0.25em]">
                  <Clock className="w-3 h-3" />
                  {t('index.recentTitle')}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-[0.1em] mt-3 font-mono">{t('index.recentTitle')}</h2>
                <p className="text-muted-foreground mt-2 text-sm uppercase tracking-widest">{t('index.recentDescription')}</p>
              </div>
            </div>
            <Button variant="ghost" className="gap-2 group" onClick={() => navigate('/videos?recent=true')}>
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
                </div>
              ))}
            </div>
          ) : recentVideos && recentVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentVideos.map((video, index) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">{t('index.noRecentVideos')}</div>
          )}
        </div>
      </section>

      <section className="py-20 bg-background border-t border-primary/20">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border border-secondary/40 text-secondary text-[0.65rem] font-bold uppercase tracking-[0.25em]">
                  <TrendingUp className="w-3 h-3" />
                  {t('index.featuredTitle')}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-[0.1em] mt-3 font-mono">{t('index.featuredTitle')}</h2>
                <p className="text-muted-foreground mt-2 text-sm uppercase tracking-widest">{t('index.featuredDescription')}</p>
              </div>
            </div>
            <Button variant="ghost" className="gap-2 group" onClick={() => navigate('/videos')}>
              {t('index.viewAll')}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
          {featuredLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <Skeleton className="lg:col-span-2 aspect-video rounded-3xl" />
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Skeleton className="aspect-video rounded-2xl" />
                <Skeleton className="aspect-video rounded-2xl" />
              </div>
            </div>
          ) : featuredVideos && featuredVideos.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              <div className="lg:col-span-2">
                <FeaturedHero video={featuredVideos[0]} />
              </div>
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {featuredVideos.slice(1).map((video) => (
                  <VideoCard key={video.id} video={video} variant="compact" />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">{t('index.noFeaturedVideos')}</div>
          )}
        </div>
      </section>

      <CommunitySpotlightSection />

      <section className="py-20 bg-background border-t border-primary/20">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border border-accent/40 text-accent text-[0.65rem] font-bold uppercase tracking-[0.25em]">
                  <ListVideo className="w-3 h-3" />
                  {t('index.playlistsTitle')}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-[0.1em] mt-3 font-mono">{t('index.playlistsTitle')}</h2>
                <p className="text-muted-foreground mt-2 text-sm uppercase tracking-widest">{t('index.playlistsDescription')}</p>
              </div>
            </div>
            <Button variant="ghost" className="gap-2 group" onClick={() => navigate('/playlists')}>
              {t('index.viewAll')}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          {playlistsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : recentPlaylists && recentPlaylists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentPlaylists.slice(0, 3).map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">{t('index.noPlaylistsTitle')}</div>
          )}
        </div>
      </section>

      <section className="py-24 bg-background border-t border-primary/20">
        <div className="container text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-[0.12em] font-mono">{t('index.ctaTitle')}</h2>
          <p className="text-sm uppercase tracking-widest text-muted-foreground max-w-2xl mx-auto">{t('index.ctaDescription')}</p>
          <Button variant="hero" size="xl" className="gap-2" onClick={() => navigate('/submit')}>
            {t('index.ctaButton')}
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      <EditorApplicationCTA />
    </MainLayout>
  );
};

export default Index;