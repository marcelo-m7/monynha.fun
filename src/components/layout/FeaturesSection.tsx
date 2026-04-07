import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

const cards = ['card1', 'card2', 'card3', 'card4', 'card5', 'card6'] as const;

export const FeaturesSection = () => {
  const { t } = useTranslation();

  return (
    <section id="features" className="py-20 bg-background border-t border-primary/20">
      <div className="container space-y-8">
        <div className="space-y-3">
          <Badge variant="outline" className="uppercase tracking-[0.2em] text-[0.65rem] font-bold border-secondary/40 text-secondary">
            {t('home.features.title')}
          </Badge>
          <h2 className="text-2xl md:text-4xl font-extrabold uppercase tracking-[0.08em] font-mono">
            {t('home.features.title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((cardKey) => (
            <Card key={cardKey} className="border-secondary/20 bg-card/60 h-full">
              <CardHeader className="space-y-3">
                <div className="inline-flex w-fit items-center gap-2 rounded-sm border border-secondary/30 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-secondary">
                  <Sparkles className="w-3 h-3" />
                  {t('home.features.title')}
                </div>
                <CardTitle className="text-base md:text-lg uppercase tracking-[0.06em]">
                  {t(`home.features.cards.${cardKey}.title`)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`home.features.cards.${cardKey}.description`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
