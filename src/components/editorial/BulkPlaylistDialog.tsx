import { useState } from 'react';
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
import type { Playlist } from '@/entities/playlist/playlist.types';
import { useTranslation } from 'react-i18next';

interface BulkPlaylistDialogProps {
  action: 'add' | 'remove';
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (playlistId: string) => Promise<void>;
  open: boolean;
  playlists: Playlist[];
  selectedCount: number;
}

export function BulkPlaylistDialog({
  action,
  isSubmitting,
  onOpenChange,
  onSubmit,
  open,
  playlists,
  selectedCount,
}: BulkPlaylistDialogProps) {
  const { t } = useTranslation();
  const [playlistId, setPlaylistId] = useState('');

  const closeDialog = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      setPlaylistId('');
    }
  };

  const handleSubmit = async () => {
    if (!playlistId) return;
    await onSubmit(playlistId);
    setPlaylistId('');
  };

  const titleKey =
    action === 'add' ? 'editorialBoard.bulkDialogs.playlist.addTitle' : 'editorialBoard.bulkDialogs.playlist.removeTitle';
  const applyKey =
    action === 'add' ? 'editorialBoard.bulkDialogs.playlist.addApply' : 'editorialBoard.bulkDialogs.playlist.removeApply';

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t(titleKey, {
              count: selectedCount,
              defaultValue:
                action === 'add'
                  ? `Add ${selectedCount} videos to playlist`
                  : `Remove ${selectedCount} videos from playlist`,
            })}
          </DialogTitle>
          <DialogDescription>
            {t('editorialBoard.bulkDialogs.playlist.description', {
              defaultValue: 'Choose a playlist and confirm the bulk operation.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">
            {t('editorialBoard.bulkDialogs.playlist.targetPlaylist', { defaultValue: 'Target playlist' })}
          </p>
          <Select value={playlistId} onValueChange={setPlaylistId}>
            <SelectTrigger>
              <SelectValue
                placeholder={t('editorialBoard.bulkDialogs.playlist.selectPlaceholder', {
                  defaultValue: 'Select a playlist',
                })}
              />
            </SelectTrigger>
            <SelectContent>
              {playlists.map((playlist) => (
                <SelectItem key={playlist.id} value={playlist.id}>
                  {playlist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={closeDialog} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!playlistId || isSubmitting}>
            {isSubmitting
              ? t('common.loading')
              : t(applyKey, {
                  defaultValue: action === 'add' ? 'Add videos' : 'Remove videos',
                })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
