import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { GripVertical, X, Check } from 'lucide-react';
import type { PlaylistVideo } from '@/features/playlists';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SortableVideoItemProps {
  item: PlaylistVideo;
  index: number;
  isOrdered: boolean;
  canEdit: boolean;
  canTrackProgress: boolean;
  isWatched: boolean;
  onRemove: () => void;
  onToggleWatched: () => void;
}

export function SortableVideoItem({
  item,
  index,
  isOrdered,
  canEdit,
  canTrackProgress,
  isWatched,
  onRemove,
  onToggleWatched,
}: SortableVideoItemProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.video_id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 p-3 bg-card border border-border rounded-xl transition-all",
        isDragging && "opacity-50 shadow-lg scale-[1.02]",
        isWatched && "bg-primary/5 border-primary/20"
      )}
    >
      {/* Drag handle (only for editors) */}
      {canEdit && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
        >
          <GripVertical className="w-5 h-5" />
        </div>
      )}

      {/* Position number (for ordered playlists) */}
      {isOrdered && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
          {index + 1}
        </div>
      )}

      {/* Progress checkbox */}
      {canTrackProgress && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleWatched();
          }}
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
            isWatched
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/30 hover:border-primary/50"
          )}
        >
          {isWatched && <Check className="w-4 h-4" />}
        </button>
      )}

      {/* Thumbnail */}
      <Link
        to={`/videos/${item.video?.id}`}
        className="relative w-24 h-14 rounded-lg overflow-hidden shrink-0 group-hover:ring-2 ring-primary/50 transition-all"
      >
        <img
          src={item.video?.thumbnail_url || '/placeholder.svg'}
          alt={item.video?.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder.svg'; // Fallback to placeholder
            target.onerror = null;
          }}
        />
        {item.video?.duration_seconds && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded">
            {formatDuration(item.video.duration_seconds)}
          </span>
        )}
      </Link>

      {/* Video info */}
      <Link
        to={`/videos/${item.video?.id}`}
        className="flex-1 min-w-0"
      >
        <h3 className={cn(
          "font-medium line-clamp-1 group-hover:text-primary transition-colors",
          isWatched && "text-muted-foreground"
        )}>
          {item.video?.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-1">
          {item.video?.channel_name}
        </p>
      </Link>

      {/* Remove button (only for editors) */}
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            onRemove();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
