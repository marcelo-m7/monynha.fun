import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Tag, FileText, Globe2, FolderOpen } from 'lucide-react';

const features = [
  { key: 'tags', icon: Tag },
  { key: 'summary', icon: FileText },
  { key: 'relevance', icon: Globe2 },
  { key: 'category', icon: FolderOpen },
] as const;

const mockTags = ['unix', 'linux', 'cli', 'philosophy', 'open-source', 'terminal'];

export const IntelligentSystemSection = () => {
  const { t } = useTranslation();

  return (
    <section id="intelligence" className="py-20 bg-background border-t border-primary/20">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left — feature list */}
          <div className="space-y-8">
            <div className="space-y-3">
              <Badge
                variant="outline"
                className="uppercase tracking-[0.2em] text-[0.65rem] font-bold border-primary/40 text-primary"
              >
                {t('home.intelligence.badge')}
              </Badge>
              <h2 className="text-2xl md:text-4xl font-extrabold uppercase tracking-[0.08em] font-mono">
                {t('home.intelligence.title')}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                {t('home.intelligence.description')}
              </p>
            </div>

            <ul className="space-y-5">
              {features.map(({ key, icon: Icon }) => (
                <li key={key} className="flex gap-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-primary/30 bg-primary/5">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.08em]">
                      {t(`home.intelligence.features.${key}.title`)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {t(`home.intelligence.features.${key}.description`)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — AI enrichment preview panel */}
          <div className="rounded-lg border border-primary/20 bg-card/60 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-primary/20 px-4 py-3 bg-primary/5">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-primary">
                {t('home.intelligence.preview.label')}
              </span>
            </div>

            <div className="p-5 space-y-5 font-mono">

              <div className="space-y-1.5">
                <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {t('home.intelligence.preview.titleLabel')}
                </span>
                <p className="text-sm font-semibold leading-snug">
                  The Unix Philosophy — Why Simple Tools Win
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {t('home.intelligence.preview.tagsLabel')}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {mockTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded-sm border border-primary/30 text-primary text-[0.65rem] font-bold uppercase tracking-[0.1em]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {t('home.intelligence.preview.summaryLabel')}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('home.intelligence.preview.mockSummary')}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {t('home.intelligence.preview.relevanceLabel')}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('home.intelligence.preview.mockRelevance')}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {t('home.intelligence.preview.categoryLabel')}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border border-secondary/40 text-secondary text-[0.65rem] font-bold uppercase tracking-[0.1em]">
                  {t('home.intelligence.preview.mockCategory')}
                </span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
