import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PlaylistFilterOption } from '@/features/editorial-board/useEditorialBoardFilters';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BoardFiltersProps {
  language: string;
  languages: string[];
  playlistOptions?: PlaylistFilterOption[];
  searchQuery: string;
  selectedPlaylistIds?: string[];
  showPlaylistFilter?: boolean;
  clearPlaylistSelection?: () => void;
  selectAllPlaylists?: () => void;
  setLanguage: (value: string) => void;
  setSearchQuery: (value: string) => void;
  togglePlaylistSelection?: (playlistId: string) => void;
}

export function BoardFilters({
  language,
  languages,
  playlistOptions = [],
  searchQuery,
  selectedPlaylistIds = [],
  showPlaylistFilter = false,
  clearPlaylistSelection,
  selectAllPlaylists,
  setLanguage,
  setSearchQuery,
  togglePlaylistSelection,
}: BoardFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative min-w-0 flex-1 md:min-w-[320px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t('editorialBoard.searchPlaceholder')}
          className="pl-10"
        />
      </div>
      <Select value={language} onValueChange={setLanguage}>
        <SelectTrigger className="w-full md:w-[190px]">
          <SelectValue placeholder={t('editorialBoard.filters.language')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('editorialBoard.allLanguages')}</SelectItem>
          {languages.map((item) => (
            <SelectItem key={item} value={item}>
              {item.toUpperCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showPlaylistFilter ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="w-full md:w-auto">
              {t('editorialBoard.playlistFilter.button', {
                count: selectedPlaylistIds.length,
              })}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-80 w-72 overflow-y-auto" align="end">
            <DropdownMenuLabel>{t('editorialBoard.playlistFilter.label')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between gap-2 px-2 pb-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={selectAllPlaylists}
              >
                {t('editorialBoard.playlistFilter.selectAll')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={clearPlaylistSelection}
              >
                {t('editorialBoard.playlistFilter.clear')}
              </Button>
            </div>
            {playlistOptions.map((playlist) => (
              <DropdownMenuCheckboxItem
                key={playlist.id}
                checked={selectedPlaylistIds.includes(playlist.id)}
                onCheckedChange={() => togglePlaylistSelection?.(playlist.id)}
              >
                {playlist.name} ({playlist.videoCount})
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}