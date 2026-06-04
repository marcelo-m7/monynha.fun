import { ArrowRight, BookOpen, BrainCircuit, Send, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  CategorySwatchCard,
  CtaBand,
  PageHero,
  PlaylistShowcaseCard,
  SectionHeader,
  VideoShowcaseCard,
} from '@/components/showcase';
import { useHomeExhibition } from '@/features/home/useHomeExhibition';

const metricKeys = [
  'videos_total',
  'playlists_total',
  'categories_total',
  'videos_with_summaries',
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

const Index = () => {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const { data: home, isLoading, isError } = useHomeExhibition();

  const heroFeature = home?.hero_videos[0];
  const heroTiles = useMemo(() => home?.hero_videos.slice(1, 7) ?? [], [home?.hero_videos]);
  const formatNumber = useMemo(
    () => new Intl.NumberFormat(i18n.language || 'pt-PT').format,
    [i18n.language],
  );

  return (
    <MainLayout>
      <PageHero
        title={t('homeExhibition.hero.title')}
        description={t('homeExhibition.hero.description')}
        actions={
          <>
            <Button size="xl" className="h-14 justify-between px-6 text-sm" onClick={() => navigate('/videos')}>
              {t('homeExhibition.hero.primaryCta')}
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="h-14 justify-between border-border bg-background px-6 text-sm"
              onClick={() => navigate('/submit')}
            >
              {t('homeExhibition.hero.secondaryCta')}
              <Send className="h-5 w-5" />
            </Button>
          </>
        }
        aside={
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            {isLoading ? (
              <>
                <Skeleton className="aspect-[16/12] border-2 border-border" />
                <Skeleton className="min-h-80 border-2 border-border" />
              </>
            ) : heroFeature ? (
              <>
                <VideoShowcaseCard video={heroFeature} variant="feature" className="shadow-[10px_10px_0_#000]" />
                <div className="grid gap-3 border-2 border-border bg-black p-3 text-white shadow-[10px_10px_0_#efff00]">
                  <div className="flex items-center justify-between text-[0.65rem] font-black uppercase text-white/70">
                    <span>{t('homeExhibition.hero.railTitle')}</span>
                    <Sparkles className="h-4 w-4 text-[#efff00]" />
                  </div>
                  {heroTiles.slice(0, 3).map((video) => (
                    <VideoShowcaseCard key={video.id} video={video} variant="row" className="border-white/30 bg-black text-white hover:border-[#efff00]" />
                  ))}
                </div>
              </>
            ) : (
              <div className="border-2 border-border p-8 text-muted-foreground lg:col-span-2">{t('homeExhibition.empty.hero')}</div>
            )}
          </div>
        }
      />

      <section className="border-b-2 border-border bg-[#efff00] py-6 text-black">
        <div className="container grid gap-4 md:grid-cols-4">
          {metricKeys.map((key) => (
            <div key={key} className="flex items-end justify-between gap-4 border-black/30 py-2 md:border-r md:pr-6 last:md:border-r-0">
              <span className="text-3xl font-black leading-none">{formatNumber(home?.metrics[key] ?? 0)}</span>
              <span className="max-w-32 text-right text-[0.65rem] font-black uppercase">
                {t(`homeExhibition.metrics.${key}`)}
              </span>
            </div>
          ))}
        </div>
      </section>

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

      <section className="border-y-2 border-border bg-black py-16 text-white md:py-20">
        <div className="container">
          <SectionHeader
            title={t('homeExhibition.playlists.title')}
            description={t('homeExhibition.playlists.description')}
            action={
              <Button variant="outline" className="border-white bg-black text-white hover:bg-[#efff00] hover:text-black" onClick={() => navigate('/playlists')}>
                {t('homeExhibition.actions.viewAllPlaylists')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            }
          />
          {isLoading ? (
            <div className="grid gap-5 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-72 border-2 border-white/40 bg-white/10" />
              ))}
            </div>
          ) : home?.featured_playlists.length ? (
            <div className="grid gap-5 md:grid-cols-3">
              {home.featured_playlists.map((playlist) => (
                <PlaylistShowcaseCard key={playlist.id} playlist={playlist} className="border-white/40 bg-black text-white hover:border-[#efff00]" />
              ))}
            </div>
          ) : (
            <div className="border-2 border-white/30 p-8 text-white/70">{t('homeExhibition.empty.playlists')}</div>
          )}
        </div>
      </section>

      <section className="bg-background py-16 text-foreground md:py-20">
        <div className="container grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHeader
              align="start"
              title={t('homeExhibition.facodi.title')}
              description={t('homeExhibition.facodi.description')}
            />
            <Button onClick={() => navigate('/playlists?course=LESTI')}>
              {t('homeExhibition.facodi.cta')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-56 border-2 border-border" />
              ))}
            </div>
          ) : home?.facodi_highlights.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {home.facodi_highlights.map((playlist) => (
                <PlaylistShowcaseCard key={playlist.playlist_id} playlist={playlist} compact />
              ))}
            </div>
          ) : (
            <div className="border-2 border-border p-8 text-muted-foreground">{t('homeExhibition.empty.facodi')}</div>
          )}
        </div>
      </section>

      <section className="border-y-2 border-border bg-background py-16 text-foreground md:py-20">
        <div className="container grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <SectionHeader
              align="start"
              title={t('homeExhibition.curation.title')}
              description={t('homeExhibition.curation.description')}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {(['with_summaries', 'with_tags', 'transcripts_completed', 'recent_submissions'] as const).map((key) => (
                <div key={key} className="border-2 border-border p-5">
                  <p className="text-4xl font-black leading-none">{formatNumber(home?.curation_signals[key] ?? 0)}</p>
                  <p className="mt-3 text-xs font-black uppercase text-muted-foreground">
                    {t(`homeExhibition.curation.signals.${key}`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="border-2 border-border bg-[#efff00] p-5 text-black">
            <BrainCircuit className="mb-8 h-10 w-10" />
            <h3 className="text-3xl font-black leading-none">{t('homeExhibition.curation.panelTitle')}</h3>
            <div className="mt-8 space-y-4">
              {(['summary', 'tags', 'review', 'paths'] as const).map((key) => (
                <div key={key} className="border-b-2 border-black pb-4">
                  <p className="text-sm font-black uppercase">{t(`homeExhibition.curation.steps.${key}.title`)}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-black/75">{t(`homeExhibition.curation.steps.${key}.description`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-16 md:py-20">
        <div className="container">
          <SectionHeader title={t('homeExhibition.cta.title')} description={t('homeExhibition.cta.description')} />
          <div className="grid gap-4 md:grid-cols-3">
            {ctaCards.map(({ key, icon: Icon, href }) => (
              <button
                key={key}
                type="button"
                onClick={() => navigate(href)}
                className="group min-h-56 border-2 border-border p-5 text-left transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            <Button variant="outline" className="border-black bg-white text-black hover:bg-black hover:text-white" onClick={() => navigate('/submit')}>
              {t('homeExhibition.finalCta.submit')}
              <Send className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="border-black bg-[#efff00] text-black hover:bg-black hover:text-white" onClick={() => navigate('/editor/apply')}>
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
