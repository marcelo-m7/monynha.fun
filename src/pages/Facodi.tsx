import { ArrowRight, BookOpen, GraduationCap, Send } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CategorySwatchCard, LearningPathRail, PlaylistShowcaseCard, SectionHeader } from '@/components/showcase';
import { useHomeExhibition } from '@/features/home/useHomeExhibition';

export default function Facodi() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const { data: home, isLoading } = useHomeExhibition();
  const formatNumber = useMemo(() => new Intl.NumberFormat(i18n.language || 'pt-PT').format, [i18n.language]);
  const facodi = home?.facodi_highlights ?? [];
  const categories = home?.categories ?? [];

  const rails = [
    {
      key: 'facodi',
      label: 'FACODI',
      accent: 'facodi' as const,
      title: t('facodiPage.rails.facodi.title'),
      description: t('facodiPage.rails.facodi.description'),
      playlists: facodi.slice(0, 4),
    },
    {
      key: 'lesti',
      label: 'LESTI',
      accent: 'lesti' as const,
      title: t('facodiPage.rails.lesti.title'),
      description: t('facodiPage.rails.lesti.description'),
      playlists: facodi.slice(4, 8).length ? facodi.slice(4, 8) : facodi.slice(0, 4),
    },
  ].filter((rail) => rail.playlists.length > 0);

  return (
    <MainLayout>
      <section className="border-b-2 border-border bg-background py-14 md:py-20">
        <div className="container grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div className="space-y-8">
            <GraduationCap className="h-12 w-12" />
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-black uppercase leading-none md:text-7xl">
                {t('facodiPage.hero.title')}
              </h1>
              <p className="max-w-2xl text-lg font-medium leading-8 text-muted-foreground">
                {t('facodiPage.hero.description')}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="xl" className="h-14 justify-between px-6" onClick={() => navigate('/playlists?course=LESTI')}>
                {t('facodiPage.hero.primaryCta')}
                <BookOpen className="h-5 w-5" />
              </Button>
              <Button size="xl" variant="outline" className="h-14 justify-between px-6" onClick={() => navigate('/submit')}>
                {t('facodiPage.hero.secondaryCta')}
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="grid gap-4 border-2 border-border bg-black p-4 text-white shadow-[12px_12px_0_#efff00] sm:grid-cols-3">
            <div>
              <p className="text-4xl font-black leading-none">{formatNumber(home?.metrics.curricular_playlists ?? 0)}</p>
              <p className="mt-3 text-[0.65rem] font-black uppercase text-white/70">{t('facodiPage.metrics.curricular')}</p>
            </div>
            <div>
              <p className="text-4xl font-black leading-none">{formatNumber(home?.metrics.public_non_empty_playlists ?? 0)}</p>
              <p className="mt-3 text-[0.65rem] font-black uppercase text-white/70">{t('facodiPage.metrics.publicPaths')}</p>
            </div>
            <div>
              <p className="text-4xl font-black leading-none">{formatNumber(home?.metrics.videos_total ?? 0)}</p>
              <p className="mt-3 text-[0.65rem] font-black uppercase text-white/70">{t('facodiPage.metrics.videos')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-16 md:py-20">
        <div className="container space-y-5">
          <SectionHeader title={t('facodiPage.rails.title')} description={t('facodiPage.rails.description')} />
          {isLoading ? (
            <div className="grid gap-5">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-72 border-2 border-border" />
              ))}
            </div>
          ) : rails.length ? (
            rails.map((rail) => (
              <LearningPathRail
                key={rail.key}
                label={rail.label}
                title={rail.title}
                description={rail.description}
                accent={rail.accent}
                playlists={rail.playlists}
              />
            ))
          ) : (
            <div className="border-2 border-border p-8 text-muted-foreground">{t('homeExhibition.empty.facodi')}</div>
          )}
        </div>
      </section>

      <section className="border-y-2 border-border bg-black py-16 text-white md:py-20">
        <div className="container">
          <SectionHeader
            title={t('facodiPage.featured.title')}
            description={t('facodiPage.featured.description')}
            action={
              <Button variant="outline" className="border-white bg-black text-white hover:bg-[#efff00] hover:text-black" onClick={() => navigate('/playlists')}>
                {t('homeExhibition.actions.viewAllPlaylists')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            }
          />
          <div className="grid gap-5 md:grid-cols-3">
            {(home?.featured_playlists ?? []).slice(0, 6).map((playlist) => (
              <PlaylistShowcaseCard key={playlist.id} playlist={playlist} className="border-white/40 bg-black text-white hover:border-[#efff00]" />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background py-16 md:py-20">
        <div className="container">
          <SectionHeader title={t('facodiPage.categories.title')} description={t('facodiPage.categories.description')} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 8).map((category) => (
              <CategorySwatchCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
