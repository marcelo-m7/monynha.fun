import { ArrowRight, BrainCircuit, CheckCircle2, Clock3, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CurationPipeline, SectionHeader, VideoShowcaseCard } from '@/components/showcase';
import { useHomeExhibition } from '@/features/home/useHomeExhibition';

const signalKeys = ['with_summaries', 'with_tags', 'transcripts_completed', 'recent_submissions'] as const;

export default function Curation() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const { data: home, isLoading } = useHomeExhibition();
  const formatNumber = useMemo(() => new Intl.NumberFormat(i18n.language || 'pt-PT').format, [i18n.language]);
  const videos = home?.hero_videos ?? [];

  return (
    <MainLayout>
      <section className="border-b-2 border-border bg-background py-14 md:py-20">
        <div className="container grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div className="space-y-8">
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-black uppercase leading-none md:text-7xl">
                {t('curationPage.hero.title')}
              </h1>
              <p className="max-w-2xl text-lg font-medium leading-8 text-muted-foreground">
                {t('curationPage.hero.description')}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="xl" className="h-14 justify-between px-6" onClick={() => navigate('/submit')}>
                {t('curationPage.hero.primaryCta')}
                <Send className="h-5 w-5" />
              </Button>
              <Button size="xl" variant="outline" className="h-14 justify-between px-6" onClick={() => navigate('/editor/apply')}>
                {t('curationPage.hero.secondaryCta')}
                <ShieldCheck className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="border-2 border-border bg-black p-3 text-white shadow-[12px_12px_0_#efff00]">
            <div className="mb-3 flex items-center justify-between text-[0.65rem] font-black uppercase text-white/70">
              <span>{t('curationPage.hero.panelTitle')}</span>
              <Sparkles className="h-4 w-4 text-[#efff00]" />
            </div>
            {isLoading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="aspect-video border border-white/30 bg-white/10" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {videos.slice(0, 4).map((video) => (
                  <VideoShowcaseCard key={video.id} video={video} className="border-white/30 bg-black text-white hover:border-[#efff00]" />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-border bg-[#efff00] py-6 text-black">
        <div className="container grid gap-4 md:grid-cols-4">
          {signalKeys.map((key) => (
            <div key={key} className="flex items-end justify-between gap-4 border-black/30 py-2 md:border-r md:pr-6 last:md:border-r-0">
              <span className="text-3xl font-black leading-none">{formatNumber(home?.curation_signals[key] ?? 0)}</span>
              <span className="max-w-36 text-right text-[0.65rem] font-black uppercase">
                {t(`homeExhibition.curation.signals.${key}`)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-background py-16 md:py-20">
        <div className="container">
          <SectionHeader title={t('curationPage.pipeline.title')} description={t('curationPage.pipeline.description')} />
          <CurationPipeline />
        </div>
      </section>

      <section className="border-y-2 border-border bg-black py-16 text-white md:py-20">
        <div className="container grid gap-8 lg:grid-cols-3">
          {(['fast', 'deep', 'editorial'] as const).map((key) => {
            const Icon = key === 'fast' ? CheckCircle2 : key === 'deep' ? BrainCircuit : Clock3;
            return (
              <article key={key} className="border-2 border-white/30 p-6 shadow-[8px_8px_0_#efff00]">
                <Icon className="mb-10 h-9 w-9 text-[#efff00]" />
                <h2 className="text-2xl font-black uppercase leading-tight">{t(`curationPage.modes.${key}.title`)}</h2>
                <p className="mt-4 text-sm font-medium leading-7 text-white/70">{t(`curationPage.modes.${key}.description`)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-background py-16 md:py-20">
        <div className="container grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <SectionHeader align="start" title={t('curationPage.editorial.title')} description={t('curationPage.editorial.description')} />
            <Button onClick={() => navigate('/editor/apply')}>
              {t('curationPage.editorial.cta')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3">
            {(['category', 'summary', 'tags', 'playlist'] as const).map((key) => (
              <div key={key} className="flex items-center justify-between gap-4 border-2 border-border p-4">
                <span className="text-sm font-black uppercase">{t(`curationPage.editorial.checklist.${key}`)}</span>
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
