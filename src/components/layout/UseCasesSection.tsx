import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

const useCases = ['case1', 'case2', 'case3'] as const;

export const UseCasesSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section id="use-cases" className="py-20 bg-background border-t border-primary/20">
      <div className="container space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-3">
            <Badge variant="outline" className="uppercase tracking-[0.2em] text-[0.65rem] font-bold border-accent/40 text-accent">
              {t('home.useCases.title')}
            </Badge>
            <h2 className="text-2xl md:text-4xl font-extrabold uppercase tracking-[0.08em] font-mono">
              {t('home.useCases.title')}
            </h2>
            <p className="text-sm text-muted-foreground uppercase tracking-[0.12em]">
              {t('home.onboarding.subtitle')}
            </p>
          </div>

          <Button variant="ghost" className="gap-2 group" onClick={() => navigate('/videos')}>
            {t('home.ctaSecondary.label')}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {useCases.map((caseKey) => (
            <Card key={caseKey} className="border-accent/20 bg-card/60 h-full">
              <CardHeader>
                <CardTitle className="text-base md:text-lg uppercase tracking-[0.06em]">
                  {t(`home.useCases.items.${caseKey}.title`)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`home.useCases.items.${caseKey}.description`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
