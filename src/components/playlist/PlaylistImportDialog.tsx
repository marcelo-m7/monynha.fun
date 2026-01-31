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
import { Loader2, Youtube, ListVideo, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/useAuth';
import { extractYouTubePlaylistId } from '@/shared/lib/youtube';
import { useCreatePlaylist, useAddVideoToPlaylist } from '@/features/playlists';
import { createVideo, findVideoByYoutubeId } from '@/entities/video/video.api';
import { invokeEdgeFunction } from '@/shared/api/supabase/edgeFunctions';
import type { VideoInsert } from '@/entities/video/video.types';
import { generateSlug } from '@/shared/lib/slug'; // Import generateSlug

interface PlaylistImportDialogProps {
  children: React.ReactNode;
}

const importSchema = z.object({
  playlistUrl: z.string().url('playlists.import.error.invalidUrl').refine(
    (url) => url.includes('youtube.com/playlist') || (url.includes('youtube.com/watch') && url.includes('list=')),
    'playlists.import.error.notYoutubePlaylistUrl'
  ),
  playlistName: z.string().min(3, 'playlists.import.error.nameMinLength').max(100, 'playlists.import.error.nameMaxLength'),
});

type ImportFormValues = z.infer<typeof importSchema>;

export const PlaylistImportDialog: React.FC<PlaylistImportDialogProps> = ({ children }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const createPlaylistMutation = useCreatePlaylist();
  const addVideoMutation = useAddVideoToPlaylist();
  const [isFetchingYoutube, setIsFetchingYoutube] = useState(false);
  const [youtubeFetchError, setYoutubeFetchError] = useState<string | null>(null);

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
      playlistName: '',
    },
  });

  const playlistUrl = watch('playlistUrl');
  const playlistName = watch('playlistName');

  useEffect(() => {
    if (!open) {
      reset();
      setYoutubeFetchError(null);
      setIsFetchingYoutube(false);
    }
  }, [open, reset]);

  // Effect to pre-fill playlist name based on URL (if possible, though YouTube API is needed for actual name)
  useEffect(() => {
    if (playlistUrl.includes('youtube.com/playlist') && !playlistName) {
      setValue('playlistName', t('playlists.import.defaultPlaylistName'));
    }
  }, [playlistUrl, playlistName, setValue, t]);

  const handlePlaylistUrlChange = useCallback(async (url: string) => {
    setYoutubeFetchError(null);
    if (!url.trim() || errors.playlistUrl) {
      setIsFetchingYoutube(false);
      return;
    }

    const youtubePlaylistId = extractYouTubePlaylistId(url);
    if (!youtubePlaylistId) {
      setYoutubeFetchError(t('playlists.import.error.noPlaylistId'));
      setIsFetchingYoutube(false);
      return;
    }

    setIsFetchingYoutube(true);
    try {
      // Call the new Edge Function to get playlist details
      const { data, error } = await invokeEdgeFunction<{ playlistId: string; videos: VideoInsert[] }>('import-youtube-playlist', {
        body: { playlistUrl: url },
        headers: { 'Content-Type': 'application/json' },
      });

      if (error) {
        // Extract the specific error message from the Edge Function response
        const errorMessage = error.message || t('playlists.import.error.youtubeApiFetchFailed');
        throw new Error(errorMessage);
      }

      if (data && data.videos.length > 0) {
        // Attempt to use the first video's title as a suggestion for playlist name
        if (!playlistName) {
          setValue('playlistName', data.videos[0].title);
        }
      } else {
        // Fallback name if no videos or title found
        if (!playlistName) {
          setValue('playlistName', t('playlists.import.defaultPlaylistName'));
        }
      }
      setYoutubeFetchError(null);
    } catch (err) {
      setYoutubeFetchError(err instanceof Error ? err.message : t('playlists.import.error.youtubeApiFetchFailed'));
    } finally {
      setIsFetchingYoutube(false);
    }
  }, [errors.playlistUrl, playlistName, setValue, t]);

  // Watch playlistUrl and trigger metadata fetch
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'playlistUrl') {
        handlePlaylistUrlChange(value.playlistUrl || '');
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, handlePlaylistUrlChange]);


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

    const currentPlaylistName = values.playlistName;
    let currentSlug = generateSlug(currentPlaylistName);
    let retryCount = 0;
    const MAX_RETRIES = 3;

    while (retryCount < MAX_RETRIES) {
      try {
        // 1. Fetch all videos from the YouTube playlist using the Edge Function
        const { data: edgeFunctionData, error: edgeFunctionError } = await invokeEdgeFunction<{ playlistId: string; videos: VideoInsert[] }>('import-youtube-playlist', {
          body: { playlistUrl: values.playlistUrl },
          headers: { 'Content-Type': 'application/json' },
        });

        if (edgeFunctionError) {
          throw new Error(edgeFunctionError.message);
        }
        if (!edgeFunctionData || !edgeFunctionData.videos || edgeFunctionData.videos.length === 0) {
          toast.warning(t('playlists.import.warning.noVideosFoundInPlaylist'));
          // Proceed to create an empty playlist if no videos are found
        }

        const videosToImport = edgeFunctionData?.videos || [];

        // 2. Create the playlist
        const newPlaylist = await createPlaylistMutation.mutateAsync({
          name: currentPlaylistName,
          slug: currentSlug,
          description: `Imported from YouTube playlist: ${values.playlistUrl}`,
          thumbnail_url: videosToImport.length > 0 ? videosToImport[0].thumbnail_url : null,
          language: 'pt', // Default language, could be made configurable
          is_public: true,
          is_ordered: true,
          course_code: null,
          unit_code: null,
        });

        toast.success(t('playlists.import.success.playlistCreated', { name: newPlaylist.name }));

        // 3. Add each video to the video library and then to the playlist
        for (const videoData of videosToImport) {
          try {
            const existingVideo = await findVideoByYoutubeId(videoData.youtube_id);
            let videoToAddToPlaylist;

            if (existingVideo) {
              videoToAddToPlaylist = existingVideo;
              toast.info(t('playlists.import.info.videoAlreadyExists', { title: videoData.title }));
            } else {
              // Create video if it doesn't exist
              videoToAddToPlaylist = await createVideo({
                youtube_id: videoData.youtube_id,
                title: videoData.title,
                description: videoData.description || null,
                channel_name: videoData.channel_name,
                thumbnail_url: videoData.thumbnail_url,
                duration_seconds: videoData.duration_seconds, // Use duration from API if available, otherwise null
                language: videoData.language || 'pt', // Use language from API if available, otherwise default
                submitted_by: user.id,
              });
              toast.success(t('playlists.import.success.videoAdded', { title: videoData.title }));
            }

            // Add the video to the new playlist
            await addVideoMutation.mutateAsync({
              playlistId: newPlaylist.id,
              videoId: videoToAddToPlaylist.id,
            });
          } catch (videoError) {
            const errorMessage = videoError instanceof Error ? videoError.message : String(videoError);
            toast.error(t('playlists.import.error.videoProcessingFailed', { title: videoData.title, error: errorMessage }));
          }
        }

        toast.success(t('playlists.import.success.allVideosProcessed', { count: videosToImport.length }));
        setOpen(false);
        return; // Exit on success
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505' && 'message' in error && typeof error.message === 'string' && error.message.includes('playlists_slug_key')) {
          retryCount++;
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          currentSlug = generateSlug(currentPlaylistName, randomSuffix);
          // Retry with new slug to avoid duplicate key conflict
        } else {
          toast.error(t('playlists.import.error.generic'), {
            description: error.message,
          });
          setOpen(false);
          return;
        }
      }
    }

    toast.error(t('playlists.import.error.generic'), {
      description: t('playlists.import.error.maxRetriesReached'),
    });
    setOpen(false);
  };

  const isFormDisabled = isSubmitting || createPlaylistMutation.isPending || addVideoMutation.isPending || isFetchingYoutube;

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
                aria-invalid={errors.playlistUrl || youtubeFetchError ? "true" : "false"}
                disabled={isFormDisabled}
              />
              {isFetchingYoutube && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {!isFetchingYoutube && !youtubeFetchError && playlistUrl.trim() !== '' && !errors.playlistUrl && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
              {(!isFetchingYoutube && (youtubeFetchError || errors.playlistUrl)) && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
              )}
            </div>
            {errors.playlistUrl && (
              <p role="alert" className="text-sm text-destructive">{t(errors.playlistUrl.message as string)}</p>
            )}
            {youtubeFetchError && !errors.playlistUrl && (
              <p className="text-sm text-destructive">{youtubeFetchError}</p>
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
              disabled={isFormDisabled}
            />
            {errors.playlistName && (
              <p role="alert" className="text-sm text-destructive">{t(errors.playlistName.message as string)}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isFormDisabled || !!errors.playlistUrl || !!youtubeFetchError}
          >
            {isFormDisabled ? (
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