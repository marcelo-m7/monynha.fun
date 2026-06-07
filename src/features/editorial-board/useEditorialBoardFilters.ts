import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { VideoWithCategory } from '@/entities/video/video.types';

export type EditorialBoardView = 'category' | 'playlist' | 'compact';

export interface PlaylistFilterOption {
  id: string;
  name: string;
  videoCount: number;
}

export function useEditorialBoardFilters(videos: VideoWithCategory[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState('all');
  const [view, setView] = useState<EditorialBoardView>('category');
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const languages = useMemo(
    () => Array.from(new Set(videos.map((video) => video.language).filter(Boolean))).sort(),
    [videos],
  );

  const playlistOptions = useMemo<PlaylistFilterOption[]>(() => {
    const playlistMap = new Map<string, PlaylistFilterOption>();

    videos.forEach((video) => {
      const uniquePlaylistsByVideo = new Set<string>();
      (video.assignedPlaylists ?? []).forEach((playlist) => {
        if (!playlist?.id || uniquePlaylistsByVideo.has(playlist.id)) {
          return;
        }

        uniquePlaylistsByVideo.add(playlist.id);

        const existing = playlistMap.get(playlist.id);
        if (existing) {
          existing.videoCount += 1;
        } else {
          playlistMap.set(playlist.id, {
            id: playlist.id,
            name: playlist.name,
            videoCount: 1,
          });
        }
      });
    });

    return Array.from(playlistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [videos]);

  useEffect(() => {
    if (playlistOptions.length === 0) {
      setSelectedPlaylistIds([]);
      return;
    }

    setSelectedPlaylistIds((previous) => {
      if (previous.length === 0) {
        return playlistOptions.map((playlist) => playlist.id);
      }

      const validIds = new Set(playlistOptions.map((playlist) => playlist.id));
      const next = previous.filter((id) => validIds.has(id));
      if (next.length === 0) {
        return playlistOptions.map((playlist) => playlist.id);
      }

      return next;
    });
  }, [playlistOptions]);

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      if (language !== 'all' && video.language !== language) {
        return false;
      }

      if (!deferredSearchQuery) {
        if (view !== 'playlist') {
          return true;
        }

        if (selectedPlaylistIds.length === 0) {
          return false;
        }

        return (video.assignedPlaylists ?? []).some((playlist) => selectedPlaylistIds.includes(playlist.id));
      }

      const matchesText = [video.title, video.channel_name, video.category?.name ?? '']
        .join(' ')
        .toLowerCase()
        .includes(deferredSearchQuery);

      if (!matchesText) {
        return false;
      }

      if (view !== 'playlist') {
        return true;
      }

      if (selectedPlaylistIds.length === 0) {
        return false;
      }

      return (video.assignedPlaylists ?? []).some((playlist) => selectedPlaylistIds.includes(playlist.id));
    });
  }, [deferredSearchQuery, language, selectedPlaylistIds, videos, view]);

  const togglePlaylistSelection = (playlistId: string) => {
    setSelectedPlaylistIds((previous) =>
      previous.includes(playlistId) ? previous.filter((id) => id !== playlistId) : [...previous, playlistId],
    );
  };

  const selectAllPlaylists = () => {
    setSelectedPlaylistIds(playlistOptions.map((playlist) => playlist.id));
  };

  const clearPlaylistSelection = () => {
    setSelectedPlaylistIds([]);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setLanguage('all');
    setView('category');
    setSelectedPlaylistIds(playlistOptions.map((playlist) => playlist.id));
  };

  return {
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
  };
}