import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function EditorApplicationCTA() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="py-14 bg-background border-t border-primary/20">
      <div className="container text-center space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">
          {t('editorApplications.cta.badge')}
        </p>
        <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-[0.08em]">
          {t('editorApplications.cta.title')}
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t('editorApplications.cta.description')}
        </p>
        <Button
          size="lg"
          className="gap-2"
          onClick={() => navigate('/editor/apply')}
        >
          {t('editorApplications.cta.button')}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </section>
  );
}
