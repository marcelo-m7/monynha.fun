import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Youtube,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { videoSubmissionKeys } from '@/entities/video_submission/video_submission.keys';
import {
  getVideoSubmissionMetadata,
  type VideoSubmission,
  type VideoSubmissionStatus,
} from '@/entities/video_submission/video_submission.types';
import { useAuth } from '@/features/auth/useAuth';
import {
  isPlaylistImportSubmission,
  SubmissionMetricCard,
  SubmissionRowCard,
  SubmissionsFilterBar,
  terminalStatuses,
  type SubmissionStatusFilter,
  type SubmissionTypeFilter,
} from '@/features/video-submissions/components/SubmissionsCenterParts';
import {
  startVideoSubmissionProcessing,
  useRecentVideoSubmissions,
  useVideoSubmissions,
} from '@/features/video-submissions/queries/useVideoSubmissions';

type ImportGroup = {
  playlistList: string;
  playlistUrl: string | null;
  submissions: VideoSubmission[];
};

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
  return (submission.status === 'pending' || submission.status === 'recoverable_error') && !!submission.video_id && !!submission.youtube_url;
}

function normalizeTypeFilter(value: string | null): SubmissionTypeFilter {
  if (value === 'playlist' || value === 'single') return value;
  return 'all';
}

function normalizeStatusFilter(value: string | null): SubmissionStatusFilter {
  if (value === 'active' || value === 'done' || value === 'failed') return value;
  return 'all';
}

function matchesStatusFilter(submission: VideoSubmission, statusFilter: SubmissionStatusFilter) {
  if (statusFilter === 'all') return true;
  if (statusFilter === 'active') return submission.status === 'pending' || submission.status === 'processing';
  if (statusFilter === 'done') return submission.status === 'success' || submission.status === 'duplicate';
  return submission.status === 'failed' || submission.status === 'recoverable_error';
}

function matchesTypeFilter(submission: VideoSubmission, typeFilter: SubmissionTypeFilter) {
  if (typeFilter === 'all') return true;
  const isPlaylistImport = isPlaylistImportSubmission(submission);
  if (typeFilter === 'playlist') return isPlaylistImport;
  return !isPlaylistImport;
}

function buildImportGroups(submissions: VideoSubmission[]): ImportGroup[] {
  const groups = new Map<string, ImportGroup>();

  for (const submission of submissions) {
    const metadata = getVideoSubmissionMetadata(submission.metadata);
    const playlistList = metadata.youtube_playlist_list;

    if (!playlistList) {
      continue;
    }

    const existing = groups.get(playlistList);
    if (!existing) {
      groups.set(playlistList, {
        playlistList,
        playlistUrl: metadata.youtube_playlist_url ?? null,
        submissions: [submission],
      });
      continue;
    }

    existing.submissions.push(submission);
    if (!existing.playlistUrl && metadata.youtube_playlist_url) {
      existing.playlistUrl = metadata.youtube_playlist_url;
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      submissions: group.submissions.sort((a, b) => {
        const aTime = new Date(a.created_at ?? 0).getTime();
        const bTime = new Date(b.created_at ?? 0).getTime();
        return bTime - aTime;
      }),
    }))
    .sort((a, b) => {
      const aNewest = a.submissions[0]?.created_at ? new Date(a.submissions[0].created_at).getTime() : 0;
      const bNewest = b.submissions[0]?.created_at ? new Date(b.submissions[0].created_at).getTime() : 0;
      return bNewest - aNewest;
    });
}

export default function Submissions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const startedIdsRef = useRef(new Set<string>());

  const focusedIds = useMemo(() => parseIds(searchParams.get('ids')), [searchParams]);
  const foundCount = parseCount(searchParams.get('found'));
  const createdCount = parseCount(searchParams.get('created'));
  const existingCount = parseCount(searchParams.get('existing'));
  const typeFilter = normalizeTypeFilter(searchParams.get('type'));
  const statusFilter = normalizeStatusFilter(searchParams.get('status'));

  const {
    data: focusedSubmissions = [],
    isLoading: focusedLoading,
    isError: focusedError,
    refetch: refetchFocused,
  } = useVideoSubmissions(focusedIds);

  const {
    data: recentSubmissions = [],
    isLoading: recentLoading,
    isError: recentError,
    refetch: refetchRecent,
  } = useRecentVideoSubmissions(120, !!user);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, navigate, user]);

  useEffect(() => {
    // Only auto-start explicit ids passed from batch import to avoid background storms.
    const pendingSubmissions = focusedSubmissions.filter(
      (submission) => canStartProcessing(submission) && !startedIdsRef.current.has(submission.id),
    );

    if (pendingSubmissions.length === 0) {
      return;
    }

    let cancelled = false;
    pendingSubmissions.forEach((submission) => startedIdsRef.current.add(submission.id));

    runWithConcurrencyLimit(pendingSubmissions, 1, async (submission) => {
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
        queryClient.invalidateQueries({ queryKey: videoSubmissionKeys.list(focusedIds) });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [focusedIds, focusedSubmissions, queryClient]);

  const mergedSubmissions = useMemo(() => {
    const byId = new Map<string, VideoSubmission>();

    for (const submission of recentSubmissions) {
      byId.set(submission.id, submission);
    }

    for (const submission of focusedSubmissions) {
      byId.set(submission.id, submission);
    }

    return Array.from(byId.values()).sort((a, b) => {
      const aTime = new Date(a.created_at ?? 0).getTime();
      const bTime = new Date(b.created_at ?? 0).getTime();
      return bTime - aTime;
    });
  }, [focusedSubmissions, recentSubmissions]);

  const filteredSubmissions = useMemo(
    () => mergedSubmissions.filter((submission) => matchesTypeFilter(submission, typeFilter) && matchesStatusFilter(submission, statusFilter)),
    [mergedSubmissions, statusFilter, typeFilter],
  );

  const importGroups = useMemo(() => buildImportGroups(filteredSubmissions), [filteredSubmissions]);

  const totalCount = filteredSubmissions.length;
  const terminalCount = filteredSubmissions.filter((submission) => terminalStatuses.has(submission.status as VideoSubmissionStatus)).length;
  const readyCount = filteredSubmissions.filter((submission) => submission.status === 'success' || submission.status === 'duplicate').length;
  const failedCount = filteredSubmissions.filter((submission) => submission.status === 'failed' || submission.status === 'recoverable_error').length;
  const processingCount = filteredSubmissions.filter((submission) => submission.status === 'pending' || submission.status === 'processing').length;
  const progressValue = totalCount > 0 ? Math.round((terminalCount / totalCount) * 100) : 0;

  const focusedTerminalCount = focusedSubmissions.filter((submission) => terminalStatuses.has(submission.status as VideoSubmissionStatus)).length;
  const focusedProgressValue = focusedSubmissions.length > 0
    ? Math.round((focusedTerminalCount / focusedSubmissions.length) * 100)
    : 0;

  const updateFilter = (key: 'type' | 'status', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const isLoading = authLoading || focusedLoading || recentLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container max-w-6xl py-10 space-y-6">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-6xl py-10 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/submit')} className="text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('submitStatus.backToSubmit')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/playlists')}>
            {t('playlists.import.progress.backToPlaylists')}
          </Button>
          <Button variant="outline" onClick={() => { void refetchFocused(); void refetchRecent(); }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('playlists.import.progress.refresh')}
          </Button>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                  <Youtube className="h-4 w-4" />
                  {t('header.imports')}
                </div>
                <CardTitle className="text-2xl md:text-3xl">{t('header.imports')}</CardTitle>
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
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <SubmissionMetricCard label={t('playlists.import.progress.metrics.found')} value={totalCount} />
              <SubmissionMetricCard label={t('playlists.import.progress.metrics.created')} value={readyCount} />
              <SubmissionMetricCard label={t('playlists.import.progress.metrics.existing')} value={importGroups.length} />
              <SubmissionMetricCard label={t('playlists.import.progress.metrics.processing')} value={processingCount} />
              <SubmissionMetricCard label={t('playlists.import.progress.metrics.ready')} value={failedCount} tone={failedCount > 0 ? 'warning' : 'default'} />
            </div>
          </CardContent>
        </Card>

        <SubmissionsFilterBar
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          onTypeFilterChange={(value) => updateFilter('type', value)}
          onStatusFilterChange={(value) => updateFilter('status', value)}
        />

        {focusedIds.length > 0 && (
          <Card>
            <CardHeader className="space-y-3">
              <CardTitle>{t('playlists.import.progress.title')}</CardTitle>
              <CardDescription>
                {t('playlists.import.success.summaryDescription', {
                  found: foundCount || focusedSubmissions.length,
                  created: createdCount || focusedSubmissions.length,
                  existing: existingCount,
                  queued: focusedSubmissions.length,
                })}
              </CardDescription>
              <Progress value={focusedProgressValue} className="h-2" />
            </CardHeader>
            <CardContent className="space-y-3">
              {(focusedError || recentError) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('playlists.import.progress.loadErrorTitle')}</AlertTitle>
                  <AlertDescription>{t('playlists.import.progress.loadErrorDescription')}</AlertDescription>
                </Alert>
              )}

              {focusedSubmissions.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('playlists.import.progress.emptyTitle')}</AlertTitle>
                  <AlertDescription>{t('playlists.import.progress.emptyDescription')}</AlertDescription>
                </Alert>
              )}

              {focusedSubmissions.map((submission) => (
                <SubmissionRowCard key={submission.id} submission={submission} />
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('home.curationSignals.recent_submissions')}</CardTitle>
            <CardDescription>{t('home.onboarding.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {importGroups.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">{t('playlists.import.title')}</h3>
                {importGroups.map((group) => {
                  const groupDoneCount = group.submissions.filter((submission) => terminalStatuses.has(submission.status as VideoSubmissionStatus)).length;
                  const groupProgress = group.submissions.length > 0
                    ? Math.round((groupDoneCount / group.submissions.length) * 100)
                    : 0;
                  return (
                    <details key={group.playlistList} className="rounded-md border border-border p-4">
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{group.playlistList}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('playlists.import.progress.progressBadge', { done: groupDoneCount, total: group.submissions.length })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {group.playlistUrl && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={group.playlistUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                  YouTube
                                </a>
                              </Button>
                            )}
                            <Badge variant={groupProgress === 100 ? 'default' : 'outline'}>
                              {groupProgress}%
                            </Badge>
                          </div>
                        </div>
                        <Progress value={groupProgress} className="mt-3 h-2" />
                      </summary>
                      <div className="mt-3 space-y-3">
                        {group.submissions.map((submission) => (
                          <SubmissionRowCard key={submission.id} submission={submission} compact />
                        ))}
                      </div>
                    </details>
                  );
                })}
                <Separator />
              </div>
            )}

            {filteredSubmissions.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('playlists.import.progress.filters.emptyFilteredTitle')}</AlertTitle>
                <AlertDescription>{t('playlists.import.progress.filters.emptyFilteredDescription')}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {filteredSubmissions.map((submission) => (
                <SubmissionRowCard key={submission.id} submission={submission} showImportBadge={!isPlaylistImportSubmission(submission)} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
