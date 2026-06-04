import { ArrowLeft, Mail, type LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHero } from '@/components/showcase';
import { Button } from '@/components/ui/button';
import { useMetaTags } from '@/shared/hooks/useMetaTags';

interface LegalSection {
  title: string;
  body: string;
  items?: string[];
}

interface LegalPageProps {
  translationKey: 'privacy' | 'terms' | 'cookies';
  icon: LucideIcon;
  canonicalPath: string;
}

const metaImage = 'https://tube.open2.tech/social-preview-default.png';

export const LegalPage = ({ translationKey, icon: Icon, canonicalPath }: LegalPageProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sections = useMemo(
    () => t(`${translationKey}.sections`, { returnObjects: true }) as LegalSection[],
    [t, translationKey],
  );
  const highlights = useMemo(
    () => t(`${translationKey}.highlights`, { returnObjects: true }) as string[],
    [t, translationKey],
  );

  const title = t(`${translationKey}.title`);
  const description = t(`${translationKey}.description`);

  useMetaTags({
    title: `${title} | Tube O2`,
    description,
    image: metaImage,
    imageAlt: t(`${translationKey}.metaImageAlt`),
    imageWidth: 1200,
    imageHeight: 630,
    imageType: 'image/png',
    url: `https://tube.open2.tech${canonicalPath}`,
  });

  return (
    <MainLayout>
      <PageHero
        eyebrow={t('legal.eyebrow')}
        title={title}
        description={description}
        actions={
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="justify-start px-0 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
        }
        aside={
          <div className="border-2 border-border bg-card p-6 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center border-2 border-primary bg-primary text-primary-foreground">
              <Icon className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
              {t('legal.lastUpdated')}
            </p>
            <p className="mt-2 text-2xl font-black">{t(`${translationKey}.updatedAt`)}</p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{t('legal.reviewNotice')}</p>
          </div>
        }
      />

      <div className="container py-12">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="space-y-4">
            <div className="border-2 border-border bg-card p-5">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
                {t('legal.summaryTitle')}
              </h2>
              <ul className="mt-5 space-y-3 text-sm font-semibold leading-6">
                {highlights.map((item) => (
                  <li key={item} className="border-l-4 border-primary pl-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-2 border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
                <Mail className="h-4 w-4" aria-hidden="true" />
                {t('legal.contactTitle')}
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{t('legal.contactDescription')}</p>
              <Button asChild variant="outline" className="mt-5 w-full justify-center">
                <Link to="/contact">{t('legal.contactAction')}</Link>
              </Button>
            </div>
          </aside>

          <section className="space-y-5">
            {sections.map((section) => (
              <article key={section.title} className="border-2 border-border bg-card p-6 shadow-sm">
                <h2 className="text-2xl font-black leading-tight">{section.title}</h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">{section.body}</p>
                {section.items && section.items.length > 0 && (
                  <ul className="mt-5 space-y-3 text-sm leading-6 text-muted-foreground">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 shrink-0 bg-primary" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </section>
        </div>
      </div>
    </MainLayout>
  );
};
