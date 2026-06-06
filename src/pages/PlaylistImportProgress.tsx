import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, CopyCheck, ExternalLink, Loader2, RefreshCw, Youtube } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { videoSubmissionKeys } from '@/entities/video_submission/video_submission.keys';
import { getVideoSubmissionMetadata, type VideoSubmission, type VideoSubmissionStatus } from '@/entities/video_submission/video_submission.types';
import { useAuth } from '@/features/auth/useAuth';
import { startVideoSubmissionProcessing, useVideoSubmissions } from '@/features/video-submissions/queries/useVideoSubmissions';

const terminalStatuses = new Set<VideoSubmissionStatus>(['success', 'failed', 'duplicate', 'recoverable_error']);

function parseIds(rawIds: string | null) {
  return Array.from(new Set((rawIds ?? '').split(',').map((id) => id.trim()).filter(Boolean)));
}

function parseCount(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

async function runWithConcurrencyLimit<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
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

function canStartProcessing(submission: VideoSubmission) {
  return submission.status === 'pending' && !!submission.video_id && !!submission.youtube_url;
}

function getStatusIcon(status: string) {
  if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (status === 'duplicate') return <CopyCheck className="h-4 w-4 text-primary" />;
  if (status === 'failed' || status === 'recoverable_error') return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (status === 'processing') return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  return <Clock3 className="h-4 w-4 text-muted-foreground" />;
}

export default function PlaylistImportProgress() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const startedIdsRef = useRef(new Set<string>());

  const submissionIds = useMemo(() => parseIds(searchParams.get('ids')), [searchParams]);
  const foundCount = parseCount(searchParams.get('found'));
  const createdCount = parseCount(searchParams.get('created'));
  const existingCount = parseCount(searchParams.get('existing'));
  const { data: submissions = [], isLoading, isError, refetch } = useVideoSubmissions(submissionIds);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, navigate, user]);

  useEffect(() => {
    const pendingSubmissions = submissions.filter(
      (submission) => canStartProcessing(submission) && !startedIdsRef.current.has(submission.id),
    );

    if (pendingSubmissions.length === 0) {
      return;
    }

    let cancelled = false;
    pendingSubmissions.forEach((submission) => startedIdsRef.current.add(submission.id));

    runWithConcurrencyLimit(pendingSubmissions, 3, async (submission) => {
      await startVideoSubmissionProcessing({
        submissionId: submission.id,
        videoId: submission.video_id as string,
        youtubeUrl: submission.youtube_url as string,
      }).catch(() => undefined);

      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: videoSubmissionKeys.detail(submission.id) });
      }
    }).finally(() => {
      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: videoSubmissionKeys.list(submissionIds) });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [queryClient, submissionIds, submissions]);

  const totalCount = submissions.length;
  const terminalCount = submissions.filter((submission) => terminalStatuses.has(submission.status as VideoSubmissionStatus)).length;
  const readyCount = submissions.filter((submission) => submission.status === 'success' || submission.status === 'duplicate').length;
  const failedCount = submissions.filter((submission) => submission.status === 'failed' || submission.status === 'recoverable_error').length;
  const processingCount = submissions.filter((submission) => submission.status === 'pending' || submission.status === 'processing').length;
  const progressValue = totalCount > 0 ? Math.round((terminalCount / totalCount) * 100) : 0;

  if (authLoading || (isLoading && submissionIds.length > 0)) {
    return (
      <MainLayout>
        <div className="container max-w-5xl py-10 space-y-6">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-5xl py-10 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/playlists')} className="text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('playlists.import.progress.backToPlaylists')}
        </Button>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                  <Youtube className="h-4 w-4" />
                  {t('playlists.import.progress.kicker')}
                </div>
                <CardTitle className="text-2xl md:text-3xl">{t('playlists.import.progress.title')}</CardTitle>
                <CardDescription>{t('playlists.import.progress.description')}</CardDescription>
              </div>
              <Badge variant={terminalCount === totalCount && totalCount > 0 ? 'default' : 'outline'} className="w-fit">
                {t('playlists.import.progress.progressBadge', { done: terminalCount, total: totalCount })}
              </Badge>
            </div>
            <div className="space-y-2">
              <Progress value={progressValue} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {t('playlists.import.progress.progressLabel', { progress: progressValue })}
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {submissionIds.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('playlists.import.progress.emptyTitle')}</AlertTitle>
                <AlertDescription>{t('playlists.import.progress.emptyDescription')}</AlertDescription>
              </Alert>
            )}

            {isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('playlists.import.progress.loadErrorTitle')}</AlertTitle>
                <AlertDescription>{t('playlists.import.progress.loadErrorDescription')}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Metric label={t('playlists.import.progress.metrics.found')} value={foundCount || totalCount} />
              <Metric label={t('playlists.import.progress.metrics.created')} value={createdCount || totalCount} />
              <Metric label={t('playlists.import.progress.metrics.existing')} value={existingCount} />
              <Metric label={t('playlists.import.progress.metrics.processing')} value={processingCount} />
              <Metric label={t('playlists.import.progress.metrics.ready')} value={readyCount} tone={failedCount > 0 ? 'warning' : 'default'} />
            </div>

            {failedCount > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('playlists.import.progress.partialTitle')}</AlertTitle>
                <AlertDescription>{t('playlists.import.progress.partialDescription', { failed: failedCount })}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {submissions.map((submission) => {
                const metadata = getVideoSubmissionMetadata(submission.metadata);
                const processingStage = metadata.processing?.stage ?? metadata.error?.stage ?? metadata.clientError?.stage ?? null;
                const linkedVideoId = submission.video_id ?? submission.duplicate_video_id;

                return (
                  <div key={submission.id} className="rounded-md border border-border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(submission.status)}
                          <p className="truncate text-sm font-medium">{submission.youtube_id}</p>
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
                        {linkedVideoId && (submission.status === 'success' || submission.status === 'duplicate') && (
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
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => refetch()} variant="outline" disabled={isLoading || submissionIds.length === 0}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('playlists.import.progress.refresh')}
              </Button>
              <Button asChild>
                <Link to="/playlists">{t('playlists.import.progress.backToPlaylists')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'warning' }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className={tone === 'warning' ? 'mt-1 text-2xl font-semibold text-destructive' : 'mt-1 text-2xl font-semibold'}>{value}</p>
    </div>
  );
}