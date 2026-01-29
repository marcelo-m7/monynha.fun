import React, { useState, useEffect, useCallback } from 'react';
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
    (url) => url.includes('youtube.com/playlist') || (url.includes('youtube.com/watch') && url.includes('list=')),
    'playlists.import.error.notYoutubePlaylistUrl'
  ),
  importMode: z.enum(['minimal', 'enhanced']),
  playlistName: z.string().min(3, 'playlists.import.error.nameMinLength').max(100, 'playlists.import.error.nameMaxLength'),
});

type ImportFormValues = z.infer<typeof importSchema>;

// Helper to generate a slug
const generateSlug = (name: string, suffix: string = '') => {
  let baseSlug = name.toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-')         // Replace multiple hyphens with a single one
    .replace(/^-|-$/g, '');      // Trim hyphens from start/end

  if (suffix) {
    baseSlug = `${baseSlug}-${suffix}`;
  }
  return baseSlug;
};

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

  // Only fetch video metadata if a video ID is present in the URL (for enhanced mode)
  const extractedVideoId = extractYouTubeId(playlistUrl);
  const { metadata: videoMetadata, isLoading: videoMetadataLoading, error: videoMetadataError } = useYouTubeMetadata(
    importMode === 'enhanced' && extractedVideoId ? playlistUrl : ''
  );

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    // Pre-fill playlist name if video metadata is available and name is empty
    if (videoMetadata && !watch('playlistName')) {
      setValue('playlistName', videoMetadata.title);
    } else if (!videoMetadata && !watch('playlistName') && playlistUrl.includes('youtube.com/playlist')) {
      // If it's a pure playlist URL and no video metadata, provide a generic name
      setValue('playlistName', t('playlists.import.defaultPlaylistName'));
    }
  }, [videoMetadata, setValue, watch, playlistUrl, t]);

  const onSubmit = async (values: ImportFormValues) => {
    if (!user) {
      toast.error(t('playlists.import.error.notLoggedIn'));
      return;
    }

    const youtubePlaylistId = extractYouTubePlaylistId(values.playlistUrl);
    if (!youtubePlaylistId) {
      toast.error(t('playlists.import.error.noPlaylistId'));
      return;
    }

    let currentPlaylistName = values.playlistName;
    let currentSlug = generateSlug(currentPlaylistName);
    let retryCount = 0;
    const MAX_RETRIES = 3; // Limit retries to prevent infinite loops

    while (retryCount < MAX_RETRIES) {
      try {
        // 1. Create the playlist
        const newPlaylist = await createPlaylistMutation.mutateAsync({
          name: currentPlaylistName,
          slug: currentSlug,
          description: t('playlists.import.defaultDescription', { url: values.playlistUrl }),
          thumbnail_url: videoMetadata?.thumbnailUrl || null,
          language: 'pt',
          is_public: true,
          is_ordered: true,
          course_code: null,
          unit_code: null,
        });

        toast.success(t('playlists.import.success.playlistCreated', { name: newPlaylist.name }));

        // 2. Handle video import based on mode
        if (values.importMode === 'enhanced') {
          if (extractedVideoId && videoMetadata) {
            toast.info(t('playlists.import.info.enhancedModeLimited'));
            
            const existingVideo = await findVideoByYoutubeId(videoMetadata.videoId);
            let videoToAddToPlaylist;

            if (existingVideo) {
              videoToAddToPlaylist = existingVideo;
              toast.info(t('playlists.import.info.videoAlreadyExists', { title: videoMetadata.title }));
            } else {
              // Create video if it doesn't exist
              videoToAddToPlaylist = await createVideo({
                youtube_id: videoMetadata.videoId,
                title: videoMetadata.title,
                description: videoMetadata.description || null,
                channel_name: videoMetadata.channelName,
                thumbnail_url: getYouTubeThumbnail(videoMetadata.videoId, 'max'),
                language: 'pt', // Default language
                submitted_by: user.id,
              });
              toast.success(t('playlists.import.success.videoAdded', { title: videoMetadata.title }));
            }

            // Add the video to the new playlist
            await addVideoMutation.mutateAsync({
              playlistId: newPlaylist.id,
              videoId: videoToAddToPlaylist.id,
            });
            toast.success(t('playlists.import.success.videoAddedToPlaylist', { title: videoToAddToPlaylist.title, playlistName: newPlaylist.name }));
          } else {
            toast.warning(t('playlists.import.warning.noVideoInUrlForEnhanced'));
            toast.info(t('playlists.import.info.minimalMode'));
          }
        } else {
          toast.info(t('playlists.import.info.minimalMode'));
        }

        setOpen(false);
        return; // Exit on success
      } catch (error: any) {
        if (error.code === '23505' && error.message.includes('playlists_slug_key')) {
          // Duplicate slug error, retry with a unique suffix
          retryCount++;
          const randomSuffix = Math.random().toString(36).substring(2, 8); // Short random string
          currentSlug = generateSlug(currentPlaylistName, randomSuffix);
          console.warn(`[PlaylistImportDialog] Duplicate slug detected. Retrying with new slug: ${currentSlug}`);
          // Do not update currentPlaylistName, as the user's input name should remain the same.
          // Only the internal slug is modified for uniqueness.
        } else {
          // Other error, re-throw or handle
          console.error('Playlist import error:', error);
          toast.error(t('playlists.import.error.generic'));
          setOpen(false);
          return; // Exit on other errors
        }
      }
    }

    // If loop finishes without success after max retries
    toast.error(t('playlists.import.error.generic'), {
      description: t('playlists.import.error.maxRetriesReached'),
    });
    setOpen(false);
  };

  const showVideoMetadataFeedback = importMode === 'enhanced' && playlistUrl.trim() !== '';

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
              {showVideoMetadataFeedback && videoMetadataLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {showVideoMetadataFeedback && videoMetadata && !videoMetadataError && !videoMetadataLoading && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
              {showVideoMetadataFeedback && videoMetadataError && !videoMetadataLoading && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
              )}
            </div>
            {errors.playlistUrl && (
              <p role="alert" className="text-sm text-destructive">{t(errors.playlistUrl.message as string)}</p>
            )}
            {showVideoMetadataFeedback && videoMetadataError && !errors.playlistUrl && (
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
            disabled={isSubmitting || createPlaylistMutation.isPending || addVideoMutation.isPending || (importMode === 'enhanced' && videoMetadataLoading) || !!errors.playlistUrl}
          >
            {isSubmitting || createPlaylistMutation.isPending || addVideoMutation.isPending || (importMode === 'enhanced' && videoMetadataLoading) ? (
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