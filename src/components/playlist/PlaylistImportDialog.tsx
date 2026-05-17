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
import { Loader2, Youtube, ListVideo, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/useAuth';
import { extractYouTubePlaylistId } from '@/shared/lib/youtube';
import { useCreatePlaylist } from '@/features/playlists';
import { getEdgeFunctionErrorDetails, invokeEdgeFunction } from '@/shared/api/supabase/edgeFunctions';
import { generateSlug } from '@/shared/lib/slug';

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

type ImportedSubmission = {
  id: string;
  video_id: string | null;
  youtube_url: string;
  status: string;
};

type ImportYoutubePlaylistResponse = {
  fetched_video_count: number;
  added_to_playlist_count: number;
  existing_in_playlist_count: number;
  submissions?: ImportedSubmission[];
};

async function runWithConcurrencyLimit<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
) {
  const queue = [...items];
  const workerCount = Math.max(1, Math.min(limit, queue.length));

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) return;
        await worker(item);
      }
    }),
  );
}

export const PlaylistImportDialog: React.FC<PlaylistImportDialogProps> = ({ children }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const createPlaylistMutation = useCreatePlaylist();

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
    }
  }, [open, reset]);

  useEffect(() => {
    if (playlistUrl.includes('youtube.com/playlist') && !playlistName) {
      setValue('playlistName', t('playlists.import.form.defaultPlaylistName'));
    }
  }, [playlistUrl, playlistName, setValue, t]);

  const playlistIdFromUrl = extractYouTubePlaylistId(playlistUrl);
  const playlistUrlFeedbackError = playlistUrl.trim() && !errors.playlistUrl && !playlistIdFromUrl
    ? t('playlists.import.error.noPlaylistId')
    : null;

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
        const newPlaylist = await createPlaylistMutation.mutateAsync({
          name: currentPlaylistName,
          slug: currentSlug,
          description: `Imported from YouTube playlist: ${values.playlistUrl}`,
          thumbnail_url: null,
          language: 'und',
          is_public: true,
          is_ordered: true,
          course_code: null,
          unit_code: null,
        });

        const { data: edgeFunctionData, error: edgeFunctionError } = await invokeEdgeFunction<ImportYoutubePlaylistResponse>('import-youtube-playlist', {
          body: {
            playlist_url: values.playlistUrl,
            playlist_id: newPlaylist.id,
            language: 'und',
            max_videos: 200,
          },
          headers: { 'Content-Type': 'application/json' },
        });

        if (edgeFunctionError) {
          const details = await getEdgeFunctionErrorDetails(edgeFunctionError);
          throw new Error(details.requestId ? `${details.message} (request ${details.requestId})` : details.message);
        }

        if (!edgeFunctionData) {
          throw new Error(t('playlists.import.error.noImportResponse'));
        }

        const submissions = (edgeFunctionData.submissions ?? []).filter(
          (submission) => !!submission.id && !!submission.video_id && !!submission.youtube_url,
        ) as Array<Required<Pick<ImportedSubmission, 'id' | 'video_id' | 'youtube_url'>>>;

        let processedForEnrichment = 0;
        let enrichFailedCount = 0;

        await runWithConcurrencyLimit(submissions, 3, async (submission) => {
          const { error } = await invokeEdgeFunction('enrich-video', {
            body: {
              videoId: submission.video_id,
              youtubeUrl: submission.youtube_url,
              submissionId: submission.id,
            },
            headers: { 'Content-Type': 'application/json' },
          });

          if (error) {
            enrichFailedCount += 1;
            return;
          }

          processedForEnrichment += 1;
        });

        toast.success(t('playlists.import.success.summaryTitle'), {
          description: t('playlists.import.success.summaryDescription', {
            found: edgeFunctionData.fetched_video_count,
            added: edgeFunctionData.added_to_playlist_count,
            duplicates: edgeFunctionData.existing_in_playlist_count,
            queued: processedForEnrichment,
          }),
        });

        if (enrichFailedCount > 0) {
          toast.warning(t('playlists.import.warning.enrichPartial', { failed: enrichFailedCount }));
        }

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
            description: error instanceof Error ? error.message : t('playlists.import.error.importFunctionFailed'),
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

  const isFormDisabled = isSubmitting || createPlaylistMutation.isPending;

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
                aria-invalid={errors.playlistUrl || playlistUrlFeedbackError ? "true" : "false"}
                disabled={isFormDisabled}
              />
              {!playlistUrlFeedbackError && playlistUrl.trim() !== '' && !errors.playlistUrl && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
              {(playlistUrlFeedbackError || errors.playlistUrl) && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
              )}
            </div>
            {errors.playlistUrl && (
              <p role="alert" className="text-sm text-destructive">{t(errors.playlistUrl.message as string)}</p>
            )}
            {playlistUrlFeedbackError && !errors.playlistUrl && (
              <p className="text-sm text-destructive">{playlistUrlFeedbackError}</p>
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
            disabled={isFormDisabled || !!errors.playlistUrl || !!playlistUrlFeedbackError}
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
