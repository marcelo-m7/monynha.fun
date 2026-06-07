import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EditorialBoardView } from '@/features/editorial-board/useEditorialBoardFilters';
import { useTranslation } from 'react-i18next';

interface ViewSelectorProps {
  onChange: (view: EditorialBoardView) => void;
  value: EditorialBoardView;
}

export function ViewSelector({ onChange, value }: ViewSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        className={cn(value === 'category' && 'border-primary bg-primary/10 text-foreground')}
        onClick={() => onChange('category')}
      >
        {t('editorialBoard.views.category')}
      </Button>
      <Button
        type="button"
        variant="outline"
        className={cn(value === 'playlist' && 'border-primary bg-primary/10 text-foreground')}
        onClick={() => onChange('playlist')}
      >
        {t('editorialBoard.views.playlist')}
      </Button>
      <Button
        type="button"
        variant="outline"
        className={cn(value === 'compact' && 'border-primary bg-primary/10 text-foreground')}
        onClick={() => onChange('compact')}
      >
        {t('editorialBoard.views.compact')}
      </Button>
      <Button type="button" variant="ghost" disabled>
        {t('editorialBoard.views.path')}
      </Button>
      <Button type="button" variant="ghost" disabled>
        {t('editorialBoard.views.status')}
      </Button>
    </div>
  );
}