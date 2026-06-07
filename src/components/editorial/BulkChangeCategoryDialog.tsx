import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Category } from '@/entities/category/category.types';
import type { VideoWithCategory } from '@/entities/video/video.types';
import { useTranslation } from 'react-i18next';

interface BulkChangeCategoryDialogProps {
  categories: Category[];
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (categoryId: string | null) => Promise<void>;
  open: boolean;
  selectedVideos: VideoWithCategory[];
}

export function BulkChangeCategoryDialog({
  categories,
  isSubmitting,
  onOpenChange,
  onSubmit,
  open,
  selectedVideos,
}: BulkChangeCategoryDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState<string>('');

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, number>();

    selectedVideos.forEach((video) => {
      const categoryName = video.category?.name ?? t('editorialBoard.columns.uncategorized', { defaultValue: 'Uncategorized' });
      map.set(categoryName, (map.get(categoryName) ?? 0) + 1);
    });

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [selectedVideos, t]);

  const closeDialog = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      setValue('');
    }
  };

  const handleSubmit = async () => {
    if (!value) return;
    const nextCategoryId = value === 'uncategorized' ? null : value;
    await onSubmit(nextCategoryId);
    setValue('');
  };

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('editorialBoard.bulkDialogs.category.title', {
              count: selectedVideos.length,
              defaultValue: `Change category for ${selectedVideos.length} videos`,
            })}
          </DialogTitle>
          <DialogDescription>
            {t('editorialBoard.bulkDialogs.category.description', {
              defaultValue: 'Review impact and choose the destination category.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {t('editorialBoard.bulkDialogs.category.currentDistribution', { defaultValue: 'Current category distribution' })}
            </p>
            <ul className="space-y-1 text-sm">
              {groupedByCategory.map(([name, count]) => (
                <li key={name} className="flex items-center justify-between gap-2">
                  <span className="truncate">{name}</span>
                  <span className="text-muted-foreground">{count}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t('editorialBoard.bulkDialogs.category.newCategory', { defaultValue: 'New category' })}</p>
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t('editorialBoard.bulkDialogs.category.selectPlaceholder', {
                    defaultValue: 'Select a category',
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uncategorized">
                  {t('editorialBoard.columns.uncategorized', { defaultValue: 'Uncategorized' })}
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={closeDialog} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!value || isSubmitting}>
            {isSubmitting
              ? t('common.loading')
              : t('editorialBoard.bulkDialogs.category.apply', { defaultValue: 'Apply change' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
