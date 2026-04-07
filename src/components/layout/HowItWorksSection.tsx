import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleCheck } from 'lucide-react';

const steps = ['step1', 'step2', 'step3', 'step4'] as const;

export const HowItWorksSection = () => {
  const { t } = useTranslation();

  return (
    <section id="how-it-works" className="py-20 bg-background border-t border-primary/20">
      <div className="container space-y-8">
        <div className="space-y-3">
          <Badge variant="outline" className="uppercase tracking-[0.2em] text-[0.65rem] font-bold border-primary/40 text-primary">
            {t('home.howItWorks.title')}
          </Badge>
          <h2 className="text-2xl md:text-4xl font-extrabold uppercase tracking-[0.08em] font-mono">
            {t('home.howItWorks.title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((stepKey, index) => (
            <Card key={stepKey} className="border-primary/20 bg-card/60">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    0{index + 1}
                  </span>
                  <CircleCheck className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="text-base md:text-lg uppercase tracking-[0.06em]">
                  {t(`home.howItWorks.steps.${stepKey}.title`)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`home.howItWorks.steps.${stepKey}.description`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
