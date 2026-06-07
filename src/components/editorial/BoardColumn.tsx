import { useDroppable } from '@dnd-kit/core';
import { Checkbox } from '@/components/ui/checkbox';
import type { Category } from '@/entities/category/category.types';
import type { VideoWithCategory } from '@/entities/video/video.types';
import { cn } from '@/lib/utils';
import type { CheckedState } from '@radix-ui/react-checkbox';
import type { LucideIcon } from 'lucide-react';
import { VideoCard } from './VideoCard';

interface BoardColumnProps {
  activeVideoId?: string | null;
  categories?: Category[];
  colorClassName?: string;
  disabledDrag?: boolean;
  icon: LucideIcon;
  id: string;
  selectedVideoIds?: Set<string>;
  showSelectionControls?: boolean;
  showMoveSelector?: boolean;
  title: string;
  videos: VideoWithCategory[];
  onMoveCategory?: (video: VideoWithCategory, categoryId: string | null) => void;
  onToggleColumnSelection?: (videoIds: string[], checked: boolean) => void;
  onToggleVideoSelection?: (videoId: string, checked: boolean) => void;
}

export function BoardColumn({
  activeVideoId,
  categories = [],
  colorClassName,
  disabledDrag = false,
  icon: Icon,
  id,
  selectedVideoIds = new Set<string>(),
  showSelectionControls = false,
  showMoveSelector = false,
  title,
  videos,
  onMoveCategory,
  onToggleColumnSelection,
  onToggleVideoSelection,
}: BoardColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const selectedCount = videos.filter((video) => selectedVideoIds.has(video.id)).length;
  const allSelected = videos.length > 0 && selectedCount === videos.length;
  const isIndeterminate = selectedCount > 0 && !allSelected;

  const handleColumnSelectionChange = (checked: CheckedState) => {
    onToggleColumnSelection?.(
      videos.map((video) => video.id),
      Boolean(checked),
    );
  };

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex min-h-[420px] min-w-[300px] flex-1 flex-col rounded-3xl border bg-card/70 p-4 transition-colors',
        isOver && 'border-primary bg-primary/5',
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {showSelectionControls ? (
            <Checkbox
              checked={allSelected ? true : isIndeterminate ? 'indeterminate' : false}
              onCheckedChange={handleColumnSelectionChange}
              aria-label={title}
            />
          ) : null}
          <div className={cn('rounded-full p-2 text-foreground', colorClassName ?? 'bg-muted')}>
            <Icon className="h-4 w-4" />
          </div>
          <h2 className="truncate text-sm font-bold uppercase tracking-[0.12em]">{title}</h2>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
          {selectedCount > 0 ? `${selectedCount}/${videos.length}` : videos.length}
        </span>
      </div>
      <div className="space-y-3">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            categories={categories}
            disabled={disabledDrag}
            hideWhileDragging={video.id === activeVideoId}
            selectable={showSelectionControls}
            isSelected={selectedVideoIds.has(video.id)}
            onSelectChange={(checked) => onToggleVideoSelection?.(video.id, checked)}
            showMoveSelector={showMoveSelector}
            onMoveCategory={
              onMoveCategory
                ? (categoryId) => {
                    onMoveCategory(video, categoryId);
                  }
                : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}