import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CopyCheck,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getVideoSubmissionMetadata,
  type VideoSubmission,
  type VideoSubmissionStatus,
} from '@/entities/video_submission/video_submission.types';

export const terminalStatuses = new Set<VideoSubmissionStatus>([
  'success',
  'failed',
  'duplicate',
  'recoverable_error',
]);

export function isPlaylistImportSubmission(submission: VideoSubmission) {
  const metadata = getVideoSubmissionMetadata(submission.metadata);
  return metadata.source === 'youtube_playlist_import';
}

export function getStatusIcon(status: string) {
  if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (status === 'duplicate') return <CopyCheck className="h-4 w-4 text-primary" />;
  if (status === 'failed' || status === 'recoverable_error') {
    return <AlertCircle className="h-4 w-4 text-destructive" />;
  }
  if (status === 'processing') return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  return <Clock3 className="h-4 w-4 text-muted-foreground" />;
}

export function SubmissionMetricCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'warning';
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className={tone === 'warning' ? 'mt-1 text-2xl font-semibold text-destructive' : 'mt-1 text-2xl font-semibold'}>{value}</p>
    </div>
  );
}

export function SubmissionRowCard({
  submission,
  compact = false,
  showImportBadge = true,
}: {
  submission: VideoSubmission;
  compact?: boolean;
  showImportBadge?: boolean;
}) {
  const { t } = useTranslation();

  const metadata = getVideoSubmissionMetadata(submission.metadata);
  const processingStage = metadata.processing?.stage ?? metadata.error?.stage ?? metadata.clientError?.stage ?? null;
  const linkedVideoId = submission.video_id ?? submission.duplicate_video_id;
  const isPlaylistImport = metadata.source === 'youtube_playlist_import';

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {getStatusIcon(submission.status)}
            <p className="truncate text-sm font-medium">{submission.youtube_id}</p>
            {showImportBadge && (
              <Badge variant={isPlaylistImport ? 'default' : 'outline'} className="h-5 text-[10px] uppercase">
                {isPlaylistImport ? t('playlists.import.progress.kicker') : t('header.submitVideo')}
              </Badge>
            )}
          </div>
          {processingStage && (
            <p className="text-xs text-muted-foreground">
              {t('playlists.import.progress.stageLabel')}: {t(`submitStatus.stage.values.${processingStage}`, { defaultValue: processingStage })}
            </p>
          )}
          {submission.error_message && (
            <p className="line-clamp-2 text-xs text-destructive">{submission.error_message}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={terminalStatuses.has(submission.status as VideoSubmissionStatus) ? 'default' : 'outline'}>
            {t(`submitStatus.statusLabels.${submission.status}`)}
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/submit/status/${submission.id}`}>
              {t('playlists.import.progress.openSubmission')}
            </Link>
          </Button>
          {!compact && linkedVideoId && (submission.status === 'success' || submission.status === 'duplicate') && (
            <Button size="sm" asChild>
              <Link to={`/videos/${linkedVideoId}`}>
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                {t('submitStatus.viewVideo')}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export type SubmissionTypeFilter = 'all' | 'playlist' | 'single';
export type SubmissionStatusFilter = 'all' | 'active' | 'done' | 'failed';

export function SubmissionsFilterBar({
  typeFilter,
  statusFilter,
  onTypeFilterChange,
  onStatusFilterChange,
}: {
  typeFilter: SubmissionTypeFilter;
  statusFilter: SubmissionStatusFilter;
  onTypeFilterChange: (value: SubmissionTypeFilter) => void;
  onStatusFilterChange: (value: SubmissionStatusFilter) => void;
}) {
  const { t } = useTranslation();

  const typeOptions: { value: SubmissionTypeFilter; label: string }[] = [
    { value: 'all', label: t('playlists.import.progress.filters.types.all') },
    { value: 'playlist', label: t('playlists.import.progress.filters.types.playlist') },
    { value: 'single', label: t('playlists.import.progress.filters.types.single') },
  ];

  const statusOptions: { value: SubmissionStatusFilter; label: string }[] = [
    { value: 'all', label: t('playlists.import.progress.filters.status.all') },
    { value: 'active', label: t('playlists.import.progress.filters.status.active') },
    { value: 'done', label: t('playlists.import.progress.filters.status.done') },
    { value: 'failed', label: t('playlists.import.progress.filters.status.failed') },
  ];

  return (
    <div className="rounded-md border border-border p-4 space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('playlists.import.progress.filters.typeLabel')}
        </p>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={typeFilter === option.value ? 'default' : 'outline'}
              onClick={() => onTypeFilterChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('playlists.import.progress.filters.statusLabel')}
        </p>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={statusFilter === option.value ? 'default' : 'outline'}
              onClick={() => onStatusFilterChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
