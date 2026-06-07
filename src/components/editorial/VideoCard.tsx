import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { resolveCategoryIcon } from '@/entities/category/category.icons';
import type { Category } from '@/entities/category/category.types';
import { getVideoRoute } from '@/entities/video/video.routes';
import type { VideoWithCategory } from '@/entities/video/video.types';
import { cn } from '@/lib/utils';
import { getReliableYouTubeThumbnailUrl } from '@/shared/lib/youtube';
import { ExternalLink, GripVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface VideoCardProps {
  categories?: Category[];
  disabled?: boolean;
  hideWhileDragging?: boolean;
  isSelected?: boolean;
  selectable?: boolean;
  showMoveSelector?: boolean;
  video: VideoWithCategory;
  onMoveCategory?: (categoryId: string | null) => void;
  onSelectChange?: (checked: boolean) => void;
}

export function VideoCard({
  categories = [],
  disabled = false,
  hideWhileDragging = false,
  isSelected = false,
  selectable = false,
  showMoveSelector = false,
  video,
  onMoveCategory,
  onSelectChange,
}: VideoCardProps) {
  const { t } = useTranslation();
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({
    id: video.id,
    data: {
      categoryId: video.category_id,
      videoId: video.id,
    },
    disabled,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const CategoryIcon = video.category ? resolveCategoryIcon(video.category) : null;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-2xl border bg-card p-3 shadow-sm transition-opacity',
        isSelected && 'border-primary bg-primary/5',
        isDragging && !hideWhileDragging && 'opacity-70',
        isDragging && hideWhileDragging && 'opacity-0',
      )}
    >
      <div className="flex items-start gap-3">
        {selectable ? (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectChange?.(Boolean(checked))}
            aria-label={t('editorialBoard.selection.selectVideo', { defaultValue: 'Select video' })}
            className="mt-1"
          />
        ) : null}
        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
          <img
            src={getReliableYouTubeThumbnailUrl(video.thumbnail_url, '/placeholder.svg')}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(event) => {
              const target = event.currentTarget;
              if (target.src.endsWith('/placeholder.svg')) return;
              target.src = '/placeholder.svg';
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={getVideoRoute(video)} className="line-clamp-2 text-sm font-semibold hover:text-primary">
                {video.title}
              </Link>
              <p className="mt-1 truncate text-xs text-muted-foreground">{video.channel_name}</p>
            </div>
            {!disabled ? (
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t('editorialBoard.card.dragHandle')}
                {...listeners}
                {...attributes}
              >
                <GripVertical className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-1 font-medium">{video.language?.toUpperCase()}</span>
            {CategoryIcon ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 font-medium">
                <CategoryIcon className="h-3.5 w-3.5" />
                {video.category?.name}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="ghost" className="px-0 text-xs">
          <Link to={getVideoRoute(video)}>
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            {t('editorialBoard.card.openVideo')}
          </Link>
        </Button>
        {showMoveSelector && onMoveCategory ? (
          <Select
            value={video.category_id ?? 'uncategorized'}
            onValueChange={(value) => onMoveCategory(value === 'uncategorized' ? null : value)}
          >
            <SelectTrigger className="ml-auto h-8 w-[170px] text-xs">
              <SelectValue placeholder={t('editorialBoard.card.moveTo')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="uncategorized">{t('editorialBoard.columns.uncategorized')}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
    </article>
  );
}