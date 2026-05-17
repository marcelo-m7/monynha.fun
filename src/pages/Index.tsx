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
import { EmptyState } from "@/components/premium/EmptyState";
import { PremiumSection, Reveal, Stagger, StaggerItem } from "@/components/premium/Motion";
import { PlaylistSkeleton, VideoSkeleton } from "@/components/premium/Skeletons";

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

      <PremiumSection className="border-t border-white/10">
        <div className="container">
          <Reveal className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  <Clock className="w-3 h-3" />
                  {t('index.recentTitle')}
                </div>
                <h2 className="mt-3 text-2xl font-black md:text-4xl">{t('index.recentTitle')}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t('index.recentDescription')}</p>
              </div>
            </div>
            <Button variant="ghost" className="gap-2 group" onClick={() => navigate('/videos?recent=true')}>
              {t('index.viewAll')}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Reveal>

          {recentLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <VideoSkeleton key={i} />
              ))}
            </div>
          ) : recentVideos && recentVideos.length > 0 ? (
            <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentVideos.map((video, index) => (
                <StaggerItem key={video.id}>
                  <VideoCard video={video} />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <EmptyState title={t('index.noRecentVideos')} />
          )}
        </div>
      </PremiumSection>

      <PremiumSection className="border-t border-white/10 bg-muted/20">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  <TrendingUp className="w-3 h-3" />
                  {t('index.featuredTitle')}
                </div>
                <h2 className="mt-3 text-2xl font-black md:text-4xl">{t('index.featuredTitle')}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t('index.featuredDescription')}</p>
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
            <EmptyState title={t('index.noFeaturedVideos')} />
          )}
        </div>
      </PremiumSection>

      <CommunitySpotlightSection />

      <PremiumSection className="border-t border-white/10">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  <ListVideo className="w-3 h-3" />
                  {t('index.playlistsTitle')}
                </div>
                <h2 className="mt-3 text-2xl font-black md:text-4xl">{t('index.playlistsTitle')}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t('index.playlistsDescription')}</p>
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
                <PlaylistSkeleton key={i} />
              ))}
            </div>
          ) : recentPlaylists && recentPlaylists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentPlaylists.slice(0, 3).map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          ) : (
            <EmptyState title={t('index.noPlaylistsTitle')} />
          )}
        </div>
      </PremiumSection>

      <section className="relative overflow-hidden border-t border-white/10 py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-64 max-w-5xl rounded-full bg-primary/10 blur-3xl" />
        <div className="container text-center space-y-6">
          <h2 className="mx-auto max-w-3xl text-3xl font-black text-balance md:text-5xl">{t('index.ctaTitle')}</h2>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground">{t('index.ctaDescription')}</p>
          <Button variant="hero" size="xl" className="gap-2 rounded-full" onClick={() => navigate('/submit')}>
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
