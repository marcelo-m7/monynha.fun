import { ArrowRight, BookOpen, Radio, Send, ShieldCheck, Users } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { HomeHeroVideo } from '@/entities/home/home.types';
import type { VideoWithCategory } from '@/entities/video/video.types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  CategorySwatchCard,
  CtaBand,
  CurationPipeline,
  LearningPathRail,
  PageHero,
  PlaylistShowcaseCard,
  SectionHeader,
  VideoCarouselRail,
  VideoShowcaseCard,
} from '@/components/showcase';
import { useHomeExhibition } from '@/features/home/useHomeExhibition';
import { useFeaturedVideos, useRecentVideos } from '@/features/videos/queries/useVideos';

const metricKeys = [
  'videos_total',
  'playlists_total',
  'categories_total',
  'videos_with_summaries',
] as const;

const liveSignalKeys = [
  'recent_submissions',
  'with_summaries',
  'with_tags',
  'transcripts_completed',
] as const;

const ctaCards = [
  {
    key: 'learners',
    icon: BookOpen,
    href: '/videos',
  },
  {
    key: 'contributors',
    icon: Send,
    href: '/submit',
  },
  {
    key: 'editors',
    icon: ShieldCheck,
    href: '/editor/apply',
  },
] as const;

const DEFAULT_RAIL_LIMIT = 12;

function mapVideoToShowcase(video: VideoWithCategory): HomeHeroVideo {
  return {
    id: video.id,
    slug: video.slug,
    youtube_id: video.youtube_id,
    title: video.enrichment?.optimized_title || video.title,
    channel_name: video.channel_name,
    thumbnail_url: video.thumbnail_url,
    language: video.transcriptLanguage || video.language || 'N/A',
    duration_seconds: video.duration_seconds,
    view_count: video.view_count,
    favorites_count: video.favorites_count,
    playlist_add_count: video.playlist_add_count,
    category_name: video.category?.name || null,
    category_slug: video.category?.slug || null,
    category_color: video.category?.color || null,
    summary: video.enrichment?.short_summary || video.transcriptSummary || null,
    semantic_tags: video.enrichment?.semantic_tags || null,
  };
}

function dedupeVideos(videos: HomeHeroVideo[]) {
  const seen = new Set<string>();
  return videos.filter((video) => {
    if (seen.has(video.id)) return false;
    seen.add(video.id);
    return true;
  });
}

function pickVideos(primary: HomeHeroVideo[], fallback: HomeHeroVideo[], limit = DEFAULT_RAIL_LIMIT) {
  const merged = dedupeVideos([...primary, ...fallback]);
  return merged.slice(0, limit);
}

const Index = () => {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const { data: home, isLoading, isError } = useHomeExhibition();
  const { data: featuredVideosData = [], isLoading: isFeaturedLoading } = useFeaturedVideos(24, 0);
  const { data: recentVideosData = [], isLoading: isRecentLoading } = useRecentVideos(24);

  const heroFeature = home?.hero_videos[0];
  const heroTiles = useMemo(() => home?.hero_videos.slice(1, 4) ?? [], [home?.hero_videos]);
  const featuredVideos = useMemo(() => featuredVideosData.map(mapVideoToShowcase), [featuredVideosData]);
  const recentVideos = useMemo(() => recentVideosData.map(mapVideoToShowcase), [recentVideosData]);
  const homeVideos = useMemo(() => home?.hero_videos ?? [], [home?.hero_videos]);
  const allRailsPool = useMemo(
    () => dedupeVideos([...homeVideos, ...featuredVideos, ...recentVideos]),
    [homeVideos, featuredVideos, recentVideos],
  );
  const railsLoading = isLoading || isFeaturedLoading || isRecentLoading;

  const videoRails = useMemo(() => {
    const withSummaries = allRailsPool.filter((video) => !!video.summary);
    const quickLessons = allRailsPool
      .filter((video) => !!video.duration_seconds && (video.duration_seconds || 0) <= 900)
      .sort((a, b) => (a.duration_seconds || 0) - (b.duration_seconds || 0));
    const mostViewed = [...allRailsPool].sort((a, b) => b.view_count - a.view_count);
    const communityFavorites = [...allRailsPool].sort(
      (a, b) => b.favorites_count + b.playlist_add_count - (a.favorites_count + a.playlist_add_count),
    );

    return [
      {
        key: 'trendingNow',
        title: t('homeExhibition.videoRails.trendingNow.title'),
        description: t('homeExhibition.videoRails.trendingNow.description'),
        videos: pickVideos(featuredVideos, allRailsPool),
        variant: 'dark' as const,
      },
      {
        key: 'freshDrops',
        title: t('homeExhibition.videoRails.freshDrops.title'),
        description: t('homeExhibition.videoRails.freshDrops.description'),
        videos: pickVideos(recentVideos, allRailsPool),
        variant: 'light' as const,
      },
      {
        key: 'mostViewed',
        title: t('homeExhibition.videoRails.mostViewed.title'),
        description: t('homeExhibition.videoRails.mostViewed.description'),
        videos: pickVideos(mostViewed, allRailsPool),
        variant: 'dark' as const,
      },
      {
        key: 'communityPicks',
        title: t('homeExhibition.videoRails.communityPicks.title'),
        description: t('homeExhibition.videoRails.communityPicks.description'),
        videos: pickVideos(communityFavorites, allRailsPool),
        variant: 'light' as const,
      },
      {
        key: 'withSummaries',
        title: t('homeExhibition.videoRails.withSummaries.title'),
        description: t('homeExhibition.videoRails.withSummaries.description'),
        videos: pickVideos(withSummaries, allRailsPool),
        variant: 'dark' as const,
      },
      {
        key: 'quickLessons',
        title: t('homeExhibition.videoRails.quickLessons.title'),
        description: t('homeExhibition.videoRails.quickLessons.description'),
        videos: pickVideos(quickLessons, allRailsPool),
        variant: 'light' as const,
      },
    ];
  }, [allRailsPool, featuredVideos, recentVideos, t]);

  const learningRails = useMemo(() => {
    const facodi = home?.facodi_highlights ?? [];
    const featured = home?.featured_playlists ?? [];
    return [
      {
        key: 'facodi',
        label: 'FACODI',
        accent: 'facodi' as const,
        title: t('homeExhibition.learningRails.facodi.title'),
        description: t('homeExhibition.learningRails.facodi.description'),
        playlists: facodi.slice(0, 4),
      },
      {
        key: 'lesti',
        label: 'LESTI',
        accent: 'lesti' as const,
        title: t('homeExhibition.learningRails.lesti.title'),
        description: t('homeExhibition.learningRails.lesti.description'),
        playlists: facodi.slice(4, 8).length ? facodi.slice(4, 8) : facodi.slice(0, 4),
      },
      {
        key: 'open',
        label: 'O2',
        accent: 'open' as const,
        title: t('homeExhibition.learningRails.open.title'),
        description: t('homeExhibition.learningRails.open.description'),
        playlists: featured.slice(0, 4),
      },
    ].filter((rail) => rail.playlists.length > 0);
  }, [home?.facodi_highlights, home?.featured_playlists, t]);
  const formatNumber = useMemo(
    () => new Intl.NumberFormat(i18n.language || 'pt-PT').format,
    [i18n.language],
  );

  return (
    <MainLayout>
      <PageHero
        animateEntrance
        className="overflow-x-clip"
        contentClassName="lg:max-w-4xl"
        title={t('homeExhibition.hero.monynhaTitle')}
        description={t('homeExhibition.hero.description')}
        actions={
          <>
            <Button size="xl" className="h-14 justify-between px-6 text-sm transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]" onClick={() => navigate('/videos')}>
              {t('homeExhibition.hero.primaryCta')}
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="h-14 justify-between border-border bg-background px-6 text-sm transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]"
              onClick={() => navigate('/submit')}
            >
              {t('homeExhibition.hero.secondaryCta')}
              <Send className="h-5 w-5" />
            </Button>
          </>
        }
        aside={
          <div className="grid gap-3 lg:ml-auto lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_15rem]">
            {isLoading ? (
              <>
                <Skeleton className="aspect-[4/5] border-2 border-border bg-muted/60" />
                <div className="border-2 border-border bg-secondary p-2">
                  <Skeleton className="mb-2 h-4 w-24 bg-muted/20" />
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="aspect-video border border-border bg-muted/10" />
                    ))}
                  </div>
                </div>
              </>
            ) : heroFeature ? (
              <>
                <VideoShowcaseCard
                  video={heroFeature}
                  variant="feature"
                  className="border-border bg-card text-card-foreground hover:border-primary"
                />
                <div className="border-2 border-border bg-card p-2 shadow-[8px_8px_0_hsl(var(--primary))]">
                  <p className="mb-2 px-1 text-[0.62rem] font-black uppercase text-card-foreground/70">{t('homeExhibition.hero.railTitle')}</p>
                  <div className="space-y-2">
                    {heroTiles.map((video) => (
                      <VideoShowcaseCard
                        key={video.id}
                        video={video}
                        variant="tile"
                        className="border-border bg-secondary text-secondary-foreground hover:border-primary [&_h3]:line-clamp-2 [&_h3]:text-xs [&_p]:hidden [&_.text-muted-foreground]:hidden"
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="border-2 border-border p-8 text-muted-foreground lg:col-span-2">{t('homeExhibition.empty.hero')}</div>
            )}
          </div>
        }
      />

      <section className="border-y-2 border-border bg-secondary py-5 text-secondary-foreground">
        <div className="container grid gap-4 md:grid-cols-[auto_repeat(4,1fr)] md:items-center">
          <div className="animate-signal-pulse inline-flex w-fit items-center gap-2 bg-primary px-3 py-2 text-xs font-black uppercase text-primary-foreground">
            <Radio className="h-4 w-4" />
            {t('homeExhibition.live.label')}
          </div>
          {liveSignalKeys.map((key) => (
            <div key={key} className="flex items-end justify-between gap-4 border-border/20 py-1 md:border-r md:pr-5 last:md:border-r-0">
              <span className="text-3xl font-black leading-none">{formatNumber(home?.curation_signals[key] ?? 0)}</span>
              <span className="max-w-36 text-right text-[0.65rem] font-black uppercase text-secondary-foreground/70">
                {t(`homeExhibition.curation.signals.${key}`)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b-2 border-border bg-[#efff00] py-6 text-black">
        <div className="container grid gap-4 md:grid-cols-4">
          {metricKeys.map((key) => (
            <div key={key} className="flex items-end justify-between gap-4 border-black/30 py-2 md:border-r md:pr-6 last:md:border-r-0">
              <span className="text-3xl font-black leading-none">{formatNumber(home?.metrics[key] ?? 0)}</span>
              <span className="max-w-32 text-right text-[0.65rem] font-black uppercase">{t(`homeExhibition.metrics.${key}`)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-0">
        {videoRails.map((rail) => (
          <VideoCarouselRail
            key={rail.key}
            title={rail.title}
            description={rail.description}
            videos={rail.videos}
            isLoading={railsLoading}
            emptyMessage={t('homeExhibition.empty.hero')}
            actionLabel={t('homeExhibition.actions.viewAllVideos')}
            onAction={() => navigate('/videos')}
            variant={rail.variant}
          />
        ))}
      </div>

      <section className="bg-background py-16 text-foreground md:py-20">
        <div className="container">
          <SectionHeader
            title={t('homeExhibition.categories.title')}
            description={t('homeExhibition.categories.description')}
            action={
              <Button variant="outline" onClick={() => navigate('/videos')}>
                {t('homeExhibition.actions.viewAllVideos')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            }
          />
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-36 border-2 border-border" />
              ))}
            </div>
          ) : home?.categories.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {home.categories.map((category) => (
                <CategorySwatchCard key={category.id} category={category} />
              ))}
            </div>
          ) : (
            <div className="border-2 border-border p-8 text-muted-foreground">{t('homeExhibition.empty.categories')}</div>
          )}
        </div>
      </section>

      <section className="border-y-2 border-border bg-secondary py-16 text-secondary-foreground md:py-20">
        <div className="container">
          <SectionHeader
            title={t('homeExhibition.playlists.title')}
            description={t('homeExhibition.playlists.description')}
            action={
              <Button variant="outline" className="border-border bg-background text-foreground hover:bg-primary hover:text-primary-foreground" onClick={() => navigate('/playlists')}>
                {t('homeExhibition.actions.viewAllPlaylists')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            }
          />
          {isLoading ? (
            <div className="grid gap-5 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-72 border-2 border-border" />
              ))}
            </div>
          ) : home?.featured_playlists.length ? (
            <div className="grid gap-5 md:grid-cols-3">
              {home.featured_playlists.map((playlist) => (
                <PlaylistShowcaseCard key={playlist.id} playlist={playlist} className="border-border bg-card text-card-foreground hover:border-primary" />
              ))}
            </div>
          ) : (
            <div className="border-2 border-border p-8 text-secondary-foreground/70">{t('homeExhibition.empty.playlists')}</div>
          )}
        </div>
      </section>

      <section className="border-y-2 border-border bg-background py-16 text-foreground md:py-20">
        <div className="container">
          <SectionHeader
            title={t('homeExhibition.curation.title')}
            description={t('homeExhibition.curation.description')}
            action={
              <Button variant="outline" onClick={() => navigate('/curadoria')}>
                {t('homeExhibition.curation.cta')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            }
          />
          <CurationPipeline />
        </div>
      </section>

      {learningRails.length > 0 && (
        <section className="bg-background py-16 text-foreground md:py-20">
          <div className="container space-y-5">
            <SectionHeader
              title={t('homeExhibition.learningRails.title')}
              description={t('homeExhibition.learningRails.description')}
              action={
                <Button variant="outline" onClick={() => navigate('/facodi')}>
                  {t('homeExhibition.learningRails.cta')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              }
            />
            {learningRails.map((rail) => (
              <LearningPathRail
                key={rail.key}
                label={rail.label}
                title={rail.title}
                description={rail.description}
                accent={rail.accent}
                playlists={rail.playlists}
              />
            ))}
          </div>
        </section>
      )}

      <section className="bg-background py-16 md:py-20">
        <div className="container">
          <SectionHeader title={t('homeExhibition.cta.title')} description={t('homeExhibition.cta.description')} />
          <div className="grid gap-4 md:grid-cols-3">
            {ctaCards.map(({ key, icon: Icon, href }) => (
              <button
                key={key}
                type="button"
                onClick={() => navigate(href)}
                className="group min-h-56 border-2 border-border p-5 text-left transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="mb-10 flex items-center justify-between">
                  <Icon className="h-7 w-7" />
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
                <h3 className="text-2xl font-black leading-none">{t(`homeExhibition.cta.cards.${key}.title`)}</h3>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{t(`homeExhibition.cta.cards.${key}.description`)}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title={t('homeExhibition.finalCta.title')}
        description={t('homeExhibition.finalCta.description')}
        actions={
          <>
            <Button variant="outline" className="border-black bg-white text-black hover:bg-black hover:text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]" onClick={() => navigate('/submit')}>
              {t('homeExhibition.finalCta.submit')}
              <Send className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="border-black bg-[#efff00] text-black hover:bg-black hover:text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]" onClick={() => navigate('/editor/apply')}>
              {t('homeExhibition.finalCta.editor')}
              <Users className="h-4 w-4" />
            </Button>
          </>
        }
      />

      {isError && (
        <div className="border-t-2 border-border bg-destructive px-4 py-3 text-center text-sm font-bold text-destructive-foreground">
          {t('homeExhibition.error')}
        </div>
      )}
    </MainLayout>
  );
};

export default Index;
