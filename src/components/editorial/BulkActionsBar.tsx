import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface BulkActionsBarProps {
  hiddenCount: number;
  onAddPlaylist: () => void;
  onChangeCategory: () => void;
  onClearSelection: () => void;
  onRemovePlaylist: () => void;
  selectedCount: number;
}

export function BulkActionsBar({
  hiddenCount,
  onAddPlaylist,
  onChangeCategory,
  onClearSelection,
  onRemovePlaylist,
  selectedCount,
}: BulkActionsBarProps) {
  const { t } = useTranslation();

  return (
    <div className="sticky top-20 z-20 flex flex-col gap-3 rounded-2xl border bg-card/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-sm">
          {t('editorialBoard.selection.count', { count: selectedCount, defaultValue: `${selectedCount} selected videos` })}
        </Badge>
        {hiddenCount > 0 ? (
          <span className="text-xs text-muted-foreground">
            {t('editorialBoard.selection.hiddenCount', {
              count: hiddenCount,
              defaultValue: `${hiddenCount} outside current filters`,
            })}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onChangeCategory}>
          {t('editorialBoard.bulkActions.changeCategory', { defaultValue: 'Change category' })}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onAddPlaylist}>
          {t('editorialBoard.bulkActions.addToPlaylist', { defaultValue: 'Add to playlist' })}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onRemovePlaylist}>
          {t('editorialBoard.bulkActions.removeFromPlaylist', { defaultValue: 'Remove from playlist' })}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClearSelection}>
          {t('editorialBoard.bulkActions.clearSelection', { defaultValue: 'Clear selection' })}
        </Button>
      </div>
    </div>
  );
}
