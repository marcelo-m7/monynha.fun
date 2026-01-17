import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableVideoItem } from './SortableVideoItem';
import { PlaylistVideo, useReorderPlaylistVideos, useRemoveVideoFromPlaylist, useMarkVideoWatched, PlaylistProgress } from '@/features/playlists';
import { useAuth } from '@/features/auth/useAuth';
import { toast } from 'sonner';

interface SortableVideoListProps {
  playlistId: string;
  videos: PlaylistVideo[];
  progress: PlaylistProgress[];
  canEdit: boolean;
  isOrdered: boolean;
}

export function SortableVideoList({ playlistId, videos, progress, canEdit, isOrdered }: SortableVideoListProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState(videos);
  const reorderMutation = useReorderPlaylistVideos();
  const removeMutation = useRemoveVideoFromPlaylist();
  const markWatchedMutation = useMarkVideoWatched();

  // Update local state when videos prop changes (e.g., after adding/removing a video)
  useEffect(() => {
    setItems(videos);
  }, [videos]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.video_id === active.id);
      const newIndex = items.findIndex((item) => item.video_id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      // Persist the new order
      reorderMutation.mutate({
        playlistId,
        orderedVideoIds: newItems.map((item) => item.video_id),
      });
    }
  };

  const handleRemove = (videoId: string) => {
    setItems(items.filter(item => item.video_id !== videoId)); // Optimistic update
    removeMutation.mutate({ playlistId, videoId });
  };

  const handleToggleWatched = (videoId: string, currentlyWatched: boolean) => {
    markWatchedMutation.mutate({
      playlistId,
      videoId,
      watched: !currentlyWatched,
    });
  };

  const getVideoProgress = (videoId: string) => {
    return progress.find(p => p.video_id === videoId);
  };

  // If can't edit, just render a static list
  if (!canEdit && !user) { // If not editable and not logged in, no progress tracking
    return (
      <div className="space-y-3">
        {videos.map((item, index) => (
          <SortableVideoItem
            key={item.video_id}
            item={item}
            index={index}
            isOrdered={isOrdered}
            canEdit={false}
            canTrackProgress={false}
            isWatched={false}
            onRemove={() => {}}
            onToggleWatched={() => {}}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(item => item.video_id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {items.map((item, index) => (
            <SortableVideoItem
              key={item.video_id}
              item={item}
              index={index}
              isOrdered={isOrdered}
              canEdit={canEdit}
              canTrackProgress={!!user}
              isWatched={getVideoProgress(item.video_id)?.watched || false}
              onRemove={() => handleRemove(item.video_id)}
              onToggleWatched={() => handleToggleWatched(item.video_id, getVideoProgress(item.video_id)?.watched || false)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
