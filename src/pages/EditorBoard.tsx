import { useEffect, useMemo, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { BoardColumn } from '@/components/editorial/BoardColumn';
import { BoardEmptyState } from '@/components/editorial/BoardEmptyState';
import { BoardFilters } from '@/components/editorial/BoardFilters';
import { BoardSkeleton } from '@/components/editorial/BoardSkeleton';
import { BulkActionsBar } from '@/components/editorial/BulkActionsBar';
import { BulkChangeCategoryDialog } from '@/components/editorial/BulkChangeCategoryDialog';
import { BulkPlaylistDialog } from '@/components/editorial/BulkPlaylistDialog';
import { VideoCard } from '@/components/editorial/VideoCard';
import { ViewSelector } from '@/components/editorial/ViewSelector';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { resolveCategoryIcon } from '@/entities/category/category.icons';
import type { Category } from '@/entities/category/category.types';
import type { VideoWithCategory } from '@/entities/video/video.types';
import { useAuth } from '@/features/auth/useAuth';
import { useCategories } from '@/features/categories/queries/useCategories';
import { useEditableVideos } from '@/features/editorial-board/queries/useEditableVideos';
import { useBulkUpdateVideoCategory } from '@/features/editorial-board/queries/useBulkUpdateVideoCategory';
import {
  useBulkAddVideosToPlaylist,
  useBulkRemoveVideosFromPlaylist,
} from '@/features/editorial-board/queries/useBulkUpdateVideoPlaylist';
import { useUpdateVideoCategory } from '@/features/editorial-board/queries/useUpdateVideoCategory';
import { useEditorialBoardFilters } from '@/features/editorial-board/useEditorialBoardFilters';
import { useEditablePlaylists } from '@/features/playlists/queries/usePlaylists';
import { useIsEditor } from '@/features/profile/queries/useProfile';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, HelpCircle, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const UNCATEGORIZED_COLUMN_ID = 'uncategorized';

interface BoardColumnData {
  category: Category | null;
  colorClassName?: string;
  icon: LucideIcon;
  id: string;
  title: string;
  videos: VideoWithCategory[];
}

const EditorBoard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isEditor, isLoading: roleLoading } = useIsEditor();
  const isMobile = useIsMobile();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: editablePlaylists = [] } = useEditablePlaylists();
  const { data: videos = [], isLoading: videosLoading, refetch, isRefetching } = useEditableVideos();
  const updateCategoryMutation = useUpdateVideoCategory();
  const bulkCategoryMutation = useBulkUpdateVideoCategory();
  const bulkAddToPlaylistMutation = useBulkAddVideosToPlaylist();
  const bulkRemoveFromPlaylistMutation = useBulkRemoveVideosFromPlaylist();
  const {
    filteredVideos,
    language,
    languages,
    playlistOptions,
    selectedPlaylistIds,
    togglePlaylistSelection,
    selectAllPlaylists,
    clearPlaylistSelection,
    resetFilters,
    searchQuery,
    setLanguage,
    setSearchQuery,
    setView,
    view,
  } = useEditorialBoardFilters(videos);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isAddPlaylistDialogOpen, setIsAddPlaylistDialogOpen] = useState(false);
  const [isRemovePlaylistDialogOpen, setIsRemovePlaylistDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, navigate, user]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columns = useMemo<BoardColumnData[]>(() => {
    if (view === 'playlist') {
      const selectedPlaylistSet = new Set(selectedPlaylistIds);

      return playlistOptions
        .filter((playlist) => selectedPlaylistSet.has(playlist.id))
        .map((playlist) => ({
          category: null,
          colorClassName: 'bg-muted',
          icon: HelpCircle,
          id: `playlist:${playlist.id}`,
          title: playlist.name,
          videos: filteredVideos.filter((video) =>
            (video.assignedPlaylists ?? []).some((assignedPlaylist) => assignedPlaylist.id === playlist.id),
          ),
        }));
    }

    const categoryColumns = categories.map((category) => ({
      category,
      colorClassName: 'bg-muted',
      icon: resolveCategoryIcon(category),
      id: category.id,
      title: category.name,
      videos: [] as VideoWithCategory[],
    }));

    const uncategorizedColumn: BoardColumnData = {
      category: null,
      colorClassName: 'bg-muted',
      icon: HelpCircle,
      id: UNCATEGORIZED_COLUMN_ID,
      title: t('editorialBoard.columns.uncategorized'),
      videos: [],
    };

    const columnsById = new Map(categoryColumns.map((column) => [column.id, column]));

    filteredVideos.forEach((video) => {
      const column = video.category_id ? columnsById.get(video.category_id) : undefined;
      if (column) {
        column.videos.push(video);
      } else {
        uncategorizedColumn.videos.push(video);
      }
    });

    return [uncategorizedColumn, ...categoryColumns];
  }, [categories, filteredVideos, playlistOptions, selectedPlaylistIds, t, view]);

  const activeVideo = useMemo(
    () => videos.find((video) => video.id === activeVideoId) ?? null,
    [activeVideoId, videos],
  );

  const selectedVideoIdSet = useMemo(() => new Set(selectedVideoIds), [selectedVideoIds]);

  const selectedVideos = useMemo(
    () => videos.filter((video) => selectedVideoIdSet.has(video.id)),
    [selectedVideoIdSet, videos],
  );

  const selectedVisibleCount = useMemo(
    () => filteredVideos.filter((video) => selectedVideoIdSet.has(video.id)).length,
    [filteredVideos, selectedVideoIdSet],
  );

  const hiddenSelectedCount = selectedVideoIds.length - selectedVisibleCount;
  const allVisibleSelected = filteredVideos.length > 0 && selectedVisibleCount === filteredVideos.length;

  useEffect(() => {
    const videoIdSet = new Set(videos.map((video) => video.id));
    setSelectedVideoIds((previous) => previous.filter((videoId) => videoIdSet.has(videoId)));
  }, [videos]);

  const isLoading = authLoading || roleLoading || categoriesLoading || videosLoading;
  const hasFilters = Boolean(searchQuery.trim()) || language !== 'all';

  const clearSelection = () => {
    setSelectedVideoIds([]);
  };

  const toggleVideoSelection = (videoId: string, checked: boolean) => {
    setSelectedVideoIds((previous) => {
      if (checked) {
        if (previous.includes(videoId)) {
          return previous;
        }
        return [...previous, videoId];
      }
      return previous.filter((id) => id !== videoId);
    });
  };

  const toggleManyVideoSelection = (videoIds: string[], checked: boolean) => {
    if (videoIds.length === 0) return;

    setSelectedVideoIds((previous) => {
      const set = new Set(previous);
      if (checked) {
        videoIds.forEach((videoId) => set.add(videoId));
      } else {
        videoIds.forEach((videoId) => set.delete(videoId));
      }

      return Array.from(set);
    });
  };

  const handleBulkCategorySubmit = async (categoryId: string | null) => {
    const result = await bulkCategoryMutation.mutateAsync({
      videoIds: selectedVideoIds,
      categoryId,
    });

    if (result.failedCount === 0) {
      setIsCategoryDialogOpen(false);
      clearSelection();
      return;
    }

    setSelectedVideoIds(result.failures.map((failure) => failure.videoId));
    setIsCategoryDialogOpen(false);
  };

  const handleBulkPlaylistSubmit = async (playlistId: string, action: 'add' | 'remove') => {
    const result =
      action === 'add'
        ? await bulkAddToPlaylistMutation.mutateAsync({ videoIds: selectedVideoIds, playlistId })
        : await bulkRemoveFromPlaylistMutation.mutateAsync({ videoIds: selectedVideoIds, playlistId });

    if (result.failedCount === 0) {
      clearSelection();
    } else {
      setSelectedVideoIds(result.failures.map((failure) => failure.videoId));
    }

    if (action === 'add') {
      setIsAddPlaylistDialogOpen(false);
      return;
    }

    setIsRemovePlaylistDialogOpen(false);
  };

  const moveVideoToCategory = (video: VideoWithCategory, categoryId: string | null) => {
    const category = categoryId ? categories.find((item) => item.id === categoryId) ?? null : null;
    updateCategoryMutation.mutate({
      videoId: video.id,
      category,
      categoryId,
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveVideoId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveVideoId(null);

    if (view !== 'category') {
      return;
    }

    const { active, over } = event;
    if (!over) return;

    const dropTargetId = String(over.id);
    const validDropTargetIds = new Set([UNCATEGORIZED_COLUMN_ID, ...categories.map((category) => category.id)]);
    if (!validDropTargetIds.has(dropTargetId)) {
      return;
    }

    const nextCategoryId = dropTargetId === UNCATEGORIZED_COLUMN_ID ? null : dropTargetId;
    const currentCategoryId = active.data.current?.categoryId ?? null;
    if (currentCategoryId === nextCategoryId) return;

    const video = videos.find((item) => item.id === String(active.id));
    if (!video) return;

    moveVideoToCategory(video, nextCategoryId);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <BoardSkeleton />
        </div>
      </MainLayout>
    );
  }

  if (!isEditor) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="mb-4 text-3xl font-bold">{t('editorialBoard.noAccessTitle')}</h1>
          <p className="mb-8 text-muted-foreground">{t('editorialBoard.noAccessDescription')}</p>
          <Button onClick={() => navigate('/editorial')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('header.editorialPortal')}
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container space-y-8 py-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('editorialBoard.title')}</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">{t('editorialBoard.description')}</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isRefetching || updateCategoryMutation.isPending}>
            <RotateCw className="mr-2 h-4 w-4" />
            {t('editorialBoard.refresh')}
          </Button>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border bg-card/70 p-4">
          <BoardFilters
            language={language}
            languages={languages}
            playlistOptions={playlistOptions}
            selectedPlaylistIds={selectedPlaylistIds}
            showPlaylistFilter={view === 'playlist'}
            selectAllPlaylists={selectAllPlaylists}
            clearPlaylistSelection={clearPlaylistSelection}
            searchQuery={searchQuery}
            setLanguage={setLanguage}
            setSearchQuery={setSearchQuery}
            togglePlaylistSelection={togglePlaylistSelection}
          />
          <ViewSelector value={view} onChange={setView} />
          {view === 'playlist' ? (
            <p className="text-xs text-muted-foreground">{t('editorialBoard.playlistFilter.hint')}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {t('editorialBoard.scopeDescription', { count: filteredVideos.length })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => toggleManyVideoSelection(filteredVideos.map((video) => video.id), !allVisibleSelected)}
              disabled={filteredVideos.length === 0}
            >
              {allVisibleSelected
                ? t('editorialBoard.selection.unselectVisible', { defaultValue: 'Unselect visible' })
                : t('editorialBoard.selection.selectVisible', { defaultValue: 'Select visible' })}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={clearSelection}
              disabled={selectedVideoIds.length === 0}
            >
              {t('editorialBoard.bulkActions.clearSelection', { defaultValue: 'Clear selection' })}
            </Button>
          </div>
        </div>

        {selectedVideoIds.length > 0 ? (
          <BulkActionsBar
            selectedCount={selectedVideoIds.length}
            hiddenCount={hiddenSelectedCount}
            onClearSelection={clearSelection}
            onChangeCategory={() => setIsCategoryDialogOpen(true)}
            onAddPlaylist={() => setIsAddPlaylistDialogOpen(true)}
            onRemovePlaylist={() => setIsRemovePlaylistDialogOpen(true)}
          />
        ) : null}

        {filteredVideos.length === 0 ? (
          <BoardEmptyState hasFilters={hasFilters} onReset={resetFilters} />
        ) : isMobile || view === 'compact' || view === 'playlist' ? (
          <div className="space-y-4">
            {columns.map((column) => (
              <BoardColumn
                key={column.id}
                id={column.id}
                title={column.title}
                icon={column.icon}
                videos={column.videos}
                categories={categories}
                activeVideoId={activeVideoId}
                colorClassName={column.colorClassName}
                disabledDrag={view !== 'compact'}
                selectedVideoIds={selectedVideoIdSet}
                showSelectionControls
                showMoveSelector={view === 'compact'}
                onMoveCategory={view === 'compact' ? moveVideoToCategory : undefined}
                onToggleVideoSelection={toggleVideoSelection}
                onToggleColumnSelection={toggleManyVideoSelection}
              />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveVideoId(null)}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              {columns.map((column) => (
                <BoardColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  icon={column.icon}
                  videos={column.videos}
                  activeVideoId={activeVideoId}
                  colorClassName={column.colorClassName}
                  selectedVideoIds={selectedVideoIdSet}
                  showSelectionControls
                  onToggleVideoSelection={toggleVideoSelection}
                  onToggleColumnSelection={toggleManyVideoSelection}
                />
              ))}
            </div>
            <DragOverlay>{activeVideo ? <VideoCard video={activeVideo} disabled /> : null}</DragOverlay>
          </DndContext>
        )}

        <BulkChangeCategoryDialog
          open={isCategoryDialogOpen}
          onOpenChange={setIsCategoryDialogOpen}
          categories={categories}
          selectedVideos={selectedVideos}
          isSubmitting={bulkCategoryMutation.isPending}
          onSubmit={handleBulkCategorySubmit}
        />

        <BulkPlaylistDialog
          action="add"
          open={isAddPlaylistDialogOpen}
          onOpenChange={setIsAddPlaylistDialogOpen}
          playlists={editablePlaylists}
          selectedCount={selectedVideoIds.length}
          isSubmitting={bulkAddToPlaylistMutation.isPending}
          onSubmit={(playlistId) => handleBulkPlaylistSubmit(playlistId, 'add')}
        />

        <BulkPlaylistDialog
          action="remove"
          open={isRemovePlaylistDialogOpen}
          onOpenChange={setIsRemovePlaylistDialogOpen}
          playlists={editablePlaylists}
          selectedCount={selectedVideoIds.length}
          isSubmitting={bulkRemoveFromPlaylistMutation.isPending}
          onSubmit={(playlistId) => handleBulkPlaylistSubmit(playlistId, 'remove')}
        />
      </div>
    </MainLayout>
  );
};

export default EditorBoard;