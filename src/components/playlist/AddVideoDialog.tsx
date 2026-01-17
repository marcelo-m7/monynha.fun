import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAddVideoToPlaylist, PlaylistVideo } from '@/features/playlists';
import { useVideos } from '@/features/videos/queries/useVideos';
import { toast } from 'sonner';

interface AddVideoDialogProps {
  playlistId: string;
  existingVideos: PlaylistVideo[];
}

export function AddVideoDialog({ playlistId, existingVideos }: AddVideoDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const addVideoMutation = useAddVideoToPlaylist();

  const existingVideoIds = existingVideos.map(v => v.video_id);

  const { data: videos, isLoading } = useVideos({
    searchQuery,
    limit: 20,
    enabled: open,
  });

  const handleAddVideo = async (videoId: string) => {
    try {
      await addVideoMutation.mutateAsync({ playlistId, videoId });
      toast.success(t('playlistDetails.videoAdded'));
    } catch (error) {
      toast.error(t('playlistDetails.addVideoError'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          {t('playlistDetails.addVideos')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('playlistDetails.addVideoDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('playlistDetails.addVideoDialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('playlistDetails.searchVideosPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="max-h-80 overflow-y-auto space-y-2 mt-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : videos && videos.length > 0 ? (
            videos.map((video) => {
              const isAdded = existingVideoIds.includes(video.id);
              return (
                <div
                  key={video.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-20 h-12 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{video.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {video.channel_name}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isAdded ? 'secondary' : 'default'}
                    disabled={isAdded || addVideoMutation.isPending}
                    onClick={() => handleAddVideo(video.id)}
                    className="gap-1"
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3 h-3" />
                        {t('playlistDetails.added')}
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        {t('playlistDetails.add')}
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">
              {t('playlistDetails.noVideosFound')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
