import { ArrowRight, Github, Globe, Heart, Instagram, Linkedin, Mail, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useHomeExhibition } from '@/features/home/useHomeExhibition';
import { footerNavigationSections } from './navigationItems';

const footerMetricKeys = ['recent_submissions', 'with_summaries', 'with_tags', 'transcripts_completed'] as const;

export const Footer = () => {
  const { i18n, t } = useTranslation();
  const { data: home } = useHomeExhibition();
  const formatNumber = useMemo(() => new Intl.NumberFormat(i18n.language || 'pt-PT').format, [i18n.language]);

  return (
    <footer className="border-t-2 border-border bg-black text-white">
      <div className="container py-12 md:py-16">
        <div className="grid gap-10 xl:grid-cols-[1fr_1.8fr_0.9fr]">
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center bg-primary text-primary-foreground">
                <span className="text-base font-black tracking-tighter">O2</span>
              </div>
              <span className="font-black text-2xl tracking-[0.12em] uppercase">
                Tube<span className="text-primary">O2</span>
              </span>
            </Link>
            <p className="max-w-sm text-lg font-black uppercase leading-tight">
              {t('footer.monynhaStatement')}
            </p>
            <p className="max-w-sm text-sm font-medium leading-7 text-white/65">
              {t('footer.description')}
            </p>
            <div className="flex items-center gap-3 text-white/70">
              <a href="https://open2.tech" target="_blank" rel="noopener noreferrer" aria-label="Open 2 Technology website" className="hover:text-primary">
                <Globe className="h-5 w-5" />
              </a>
              <a href="https://github.com/marcelo-m7/tube-o2" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository" className="hover:text-primary">
                <Github className="h-5 w-5" />
              </a>
              <a href="https://open2.tech" target="_blank" rel="noopener noreferrer" aria-label="Open 2 Technology social" className="hover:text-primary">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://open2.tech" target="_blank" rel="noopener noreferrer" aria-label="Open 2 Technology LinkedIn" className="hover:text-primary">
                <Linkedin className="h-5 w-5" />
              </a>
              <Link to="/contact" aria-label={t('footer.contact')} className="hover:text-primary">
                <Mail className="h-5 w-5" />
              </Link>
              <Link to="/videos" aria-label={t('header.videos')} className="hover:text-primary">
                <Youtube className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {footerNavigationSections.map((column) => (
              <div key={column.key} className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-white/50">
                  {t(column.labelKey)}
                </h4>
                <ul className="space-y-3 text-sm font-bold">
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to} className="inline-flex items-center gap-2 text-white/75 transition-colors hover:text-primary">
                        {t(link.labelKey)}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-l-0 border-white/20 lg:border-l lg:pl-8">
            <h4 className="text-xs font-black uppercase tracking-widest text-white/50">{t('footer.live.title')}</h4>
            <div className="mt-5 grid grid-cols-2 gap-4">
              {footerMetricKeys.map((key) => (
                <div key={key} className="border border-white/20 p-3">
                  <p className="text-3xl font-black leading-none">{formatNumber(home?.curation_signals[key] ?? 0)}</p>
                  <p className="mt-2 text-[0.62rem] font-black uppercase text-white/50">
                    {t(`homeExhibition.curation.signals.${key}`)}
                  </p>
                  <div className="mt-3 h-2 bg-primary" style={{ width: `${Math.min(100, 28 + ((home?.curation_signals[key] ?? 0) % 70))}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 border-2 border-primary bg-primary p-4 text-black md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <p className="text-2xl font-black uppercase leading-none">{t('footer.finalCta.title')}</p>
            <p className="mt-2 text-sm font-bold text-black/70">{t('footer.finalCta.description')}</p>
          </div>
          <Button asChild variant="outline" className="mt-5 border-black bg-black text-white hover:bg-white hover:text-black md:mt-0">
            <Link to="/submit">
              {t('footer.finalCta.action')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/15 pt-6 text-xs font-bold text-white/50 md:flex-row md:items-center md:justify-between">
          <p className="flex items-center gap-1">
            {t('footer.madeWithLove')} <Heart className="h-4 w-4 fill-primary text-primary" />{' '}
            <a href="https://open2.tech" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
              {t('footer.byOpen2Technology')}
            </a>
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/privacy" className="hover:text-primary">{t('footer.privacy')}</Link>
            <Link to="/terms" className="hover:text-primary">{t('footer.terms')}</Link>
            <Link to="/cookies" className="hover:text-primary">{t('footer.cookies')}</Link>
            <Link to="/rules" className="hover:text-primary">{t('footer.rules')}</Link>
            <Link to="/contact" className="hover:text-primary">{t('footer.contact')}</Link>
            <Link to="/faq" className="hover:text-primary">{t('footer.faq')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
