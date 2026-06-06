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
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { extractYouTubePlaylistId } from '@/shared/lib/youtube';
import { getEdgeFunctionErrorDetails, invokeEdgeFunction } from '@/shared/api/supabase/edgeFunctions';

interface PlaylistImportDialogProps {
  children: React.ReactNode;
}

const importSchema = z.object({
  playlistUrl: z.string().url('playlists.import.error.invalidUrl').refine(
    (url) => url.includes('youtube.com/playlist') || (url.includes('youtube.com/watch') && url.includes('list=')),
    'playlists.import.error.notYoutubePlaylistUrl'
  ),
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
  skipped_existing_enriched_count?: number;
  already_queued_count?: number;
  created_submission_count?: number;
  submissions?: ImportedSubmission[];
};

type TrackableSubmission = {
  id: string;
  video_id: string;
  youtube_url: string;
};

function isTrackableSubmission(submission: ImportedSubmission): submission is TrackableSubmission {
  return !!submission.id && !!submission.video_id && !!submission.youtube_url;
}

export const PlaylistImportDialog: React.FC<PlaylistImportDialogProps> = ({ children }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ImportFormValues>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      playlistUrl: '',
    },
  });

  const playlistUrl = watch('playlistUrl');

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

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

    try {
      const { data: edgeFunctionData, error: edgeFunctionError } = await invokeEdgeFunction<ImportYoutubePlaylistResponse>('import-youtube-playlist', {
        body: {
          playlist_url: values.playlistUrl,
          language: 'und',
          max_videos: 50,
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

      const submissions = (edgeFunctionData.submissions ?? []).filter(isTrackableSubmission);
      const createdCount = edgeFunctionData.created_submission_count ?? submissions.length;
      const existingCount = (edgeFunctionData.skipped_existing_enriched_count ?? 0) + (edgeFunctionData.already_queued_count ?? 0);

      toast.success(t('playlists.import.success.summaryTitle'), {
        description: t('playlists.import.success.summaryDescription', {
          found: edgeFunctionData.fetched_video_count,
          created: createdCount,
          existing: existingCount,
          queued: submissions.length,
        }),
      });

      if (submissions.length > 0) {
        const params = new URLSearchParams({
          ids: submissions.map((submission) => submission.id).join(','),
          found: String(edgeFunctionData.fetched_video_count),
          created: String(createdCount),
          existing: String(existingCount),
        });

        navigate(`/playlists/import/progress?${params.toString()}`);
      }

      setOpen(false);
    } catch (error) {
      toast.error(t('playlists.import.error.generic'), {
        description: error instanceof Error ? error.message : t('playlists.import.error.importFunctionFailed'),
      });
      setOpen(false);
    }
  };

  const isFormDisabled = isSubmitting;

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
