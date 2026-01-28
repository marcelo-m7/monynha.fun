import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Youtube, ListVideo, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/useAuth';
import { extractYouTubeId, extractYouTubePlaylistId, getYouTubeThumbnail } from '@/shared/lib/youtube';
import { useCreatePlaylist, useAddVideoToPlaylist } from '@/features/playlists';
import { useYouTubeMetadata } from '@/features/submit/useYouTubeMetadata';
import { createVideo, findVideoByYoutubeId } from '@/entities/video/video.api';

interface PlaylistImportDialogProps {
  children: React.ReactNode;
}

const importSchema = z.object({
  playlistUrl: z.string().url('playlists.import.error.invalidUrl').refine(
    (url) => url.includes('youtube.com/playlist') || url.includes('youtube.com/watch') && url.includes('list='),
    'playlists.import.error.notYoutubePlaylistUrl'
  ),
  importMode: z.enum(['minimal', 'enhanced']),
  playlistName: z.string().min(3, 'playlists.import.error.nameMinLength').max(100, 'playlists.import.error.nameMaxLength'),
});

type ImportFormValues = z.infer<typeof importSchema>;

export const PlaylistImportDialog: React.FC<PlaylistImportDialogProps> = ({ children }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const createPlaylistMutation = useCreatePlaylist();
  const addVideoMutation = useAddVideoToPlaylist();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ImportFormValues>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      playlistUrl: '',
      importMode: 'minimal',
      playlistName: '',
    },
  });

  const playlistUrl = watch('playlistUrl');
  const importMode = watch('importMode');
  const { metadata: videoMetadata, isLoading: videoMetadataLoading, error: videoMetadataError } = useYouTubeMetadata(playlistUrl);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    if (videoMetadata && !watch('playlistName')) {
      setValue('playlistName', videoMetadata.title);
    }
  }, [videoMetadata, setValue, watch]);

  const onSubmit = async (values: ImportFormValues) => {
    if (!user) {
      toast.error(t('playlists.import.error.notLoggedIn'));
      return;
    }

    const playlistId = extractYouTubePlaylistId(values.playlistUrl);
    if (!playlistId) {
      toast.error(t('playlists.import.error.noPlaylistId'));
      return;
    }

    try {
      // 1. Create the playlist
      const newPlaylist = await createPlaylistMutation.mutateAsync({
        name: values.playlistName,
        slug: values.playlistName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''), // Basic slug generation
        description: t('playlists.import.defaultDescription', { url: values.playlistUrl }),
        thumbnail_url: videoMetadata?.thumbnailUrl || null, // Use video thumbnail as playlist thumbnail if available
        language: 'pt', // Default language, can be extended later
        is_public: true,
        is_ordered: true, // Default to ordered
      });

      toast.success(t('playlists.import.success.playlistCreated', { name: newPlaylist.name }));

      // 2. Handle video import based on mode
      if (values.importMode === 'enhanced') {
        const extractedVideoId = extractYouTubeId(values.playlistUrl);
        if (extractedVideoId) {
          toast.info(t('playlists.import.info.enhancedModeLimited'));
          
          // Try to get metadata for the single video
          const videoMeta = videoMetadata; // Already fetched by useYouTubeMetadata hook
          
          if (videoMeta) {
            const existingVideo = await findVideoByYoutubeId(videoMeta.videoId);
            let videoToAddToPlaylist;

            if (existingVideo) {
              videoToAddToPlaylist = existingVideo;
              toast.info(t('playlists.import.info.videoAlreadyExists', { title: videoMeta.title }));
            } else {
              // Create video if it doesn't exist
              videoToAddToPlaylist = await createVideo({
                youtube_id: videoMeta.videoId,
                title: videoMeta.title,
                description: videoMeta.description || null,
                channel_name: videoMeta.channelName,
                thumbnail_url: getYouTubeThumbnail(videoMeta.videoId, 'max'),
                language: 'pt', // Default language
                submitted_by: user.id,
              });
              toast.success(t('playlists.import.success.videoAdded', { title: videoMeta.title }));
            }

            // Add the video to the new playlist
            await addVideoMutation.mutateAsync({
              playlistId: newPlaylist.id,
              videoId: videoToAddToPlaylist.id,
            });
            toast.success(t('playlists.import.success.videoAddedToPlaylist', { title: videoMeta.title, playlistName: newPlaylist.name }));
          } else {
            toast.warn(t('playlists.import.warning.videoMetadataFailed'));
          }
        } else {
          toast.warn(t('playlists.import.warning.noVideoInUrl'));
        }
      } else {
        toast.info(t('playlists.import.info.minimalMode'));
      }

      setOpen(false);
    } catch (error) {
      console.error('Playlist import error:', error);
      toast.error(t('playlists.import.error.generic'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" />
            {t('playlists.import.title')}
          </DialogTitle>
          <DialogDescription>
            {t('playlists.import.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Playlist URL */}
          <div className="space-y-2">
            <Label htmlFor="playlistUrl">{t('playlists.import.form.urlLabel')} *</Label>
            <div className="relative">
              <ListVideo className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="playlistUrl"
                type="url"
                placeholder={t('playlists.import.form.urlPlaceholder')}
                {...register('playlistUrl')}
                className="pl-10"
                aria-invalid={errors.playlistUrl ? "true" : "false"}
              />
              {videoMetadataLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {videoMetadata && !videoMetadataError && !videoMetadataLoading && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
              {(videoMetadataError || errors.playlistUrl) && !videoMetadataLoading && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
              )}
            </div>
            {errors.playlistUrl && (
              <p role="alert" className="text-sm text-destructive">{t(errors.playlistUrl.message as string)}</p>
            )}
            {videoMetadataError && !errors.playlistUrl && (
              <p className="text-sm text-destructive">{videoMetadataError}</p>
            )}
          </div>

          {/* Playlist Name */}
          <div className="space-y-2">
            <Label htmlFor="playlistName">{t('playlists.import.form.nameLabel')} *</Label>
            <Input
              id="playlistName"
              type="text"
              placeholder={t('playlists.import.form.namePlaceholder')}
              {...register('playlistName')}
              aria-invalid={errors.playlistName ? "true" : "false"}
            />
            {errors.playlistName && (
              <p role="alert" className="text-sm text-destructive">{t(errors.playlistName.message as string)}</p>
            )}
          </div>

          {/* Import Mode */}
          <div className="space-y-2">
            <Label>{t('playlists.import.form.modeLabel')}</Label>
            <RadioGroup
              value={importMode}
              onValueChange={(value: 'minimal' | 'enhanced') => setValue('importMode', value)}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="minimal" id="minimal" />
                <Label htmlFor="minimal">{t('playlists.import.form.minimalMode')}</Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6 -mt-1 mb-2">{t('playlists.import.form.minimalModeHint')}</p>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="enhanced" id="enhanced" />
                <Label htmlFor="enhanced">{t('playlists.import.form.enhancedMode')}</Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6 -mt-1">
                {t('playlists.import.form.enhancedModeHint')}
                <span className="font-semibold text-destructive ml-1">{t('playlists.import.form.enhancedModeWarning')}</span>
              </p>
            </RadioGroup>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting || createPlaylistMutation.isPending || addVideoMutation.isPending || videoMetadataLoading || !!videoMetadataError}
          >
            {isSubmitting || createPlaylistMutation.isPending || addVideoMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('playlists.import.form.importingButton')}
              </>
            ) : (
              <>
                <Youtube className="w-4 h-4 mr-2" />
                {t('playlists.import.form.importButton')}
              </>
            )}
          </Button>
        </form>

        <div className="flex items-start gap-3 p-3 bg-blue-100/50 text-blue-800 rounded-lg text-sm mt-4">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p>{t('playlists.import.apiLimitationInfo')}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};