import { Button } from '@/components/ui/button';
import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BoardEmptyStateProps {
  hasFilters: boolean;
  onReset: () => void;
}

export function BoardEmptyState({ hasFilters, onReset }: BoardEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-3xl border border-dashed bg-card/60 px-6 py-14 text-center">
      <Inbox className="mx-auto mb-4 h-12 w-12 text-muted-foreground/70" />
      <h2 className="text-xl font-bold">
        {hasFilters ? t('editorialBoard.emptyFilteredTitle') : t('editorialBoard.emptyTitle')}
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
        {hasFilters ? t('editorialBoard.emptyFilteredDescription') : t('editorialBoard.emptyDescription')}
      </p>
      {hasFilters ? (
        <Button className="mt-6" variant="outline" onClick={onReset}>
          {t('editorialBoard.clearFilters')}
        </Button>
      ) : null}
    </div>
  );
}