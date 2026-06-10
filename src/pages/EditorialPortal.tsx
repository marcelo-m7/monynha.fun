import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PlaylistCard } from '@/components/playlist/PlaylistCard';
import { VideoDurationBadge } from '@/components/video/VideoDurationBadge';
import { getVideoRoute } from '@/entities/video/video.routes';
import { useAuth } from '@/features/auth/useAuth';
import { useEnqueueModulePublication } from '@/features/editorial-board/queries/useEnqueueModulePublication';
import { useModulePublicationCandidates } from '@/features/editorial-board/queries/useModulePublicationCandidates';
import { useModulePublicationStatusByJob } from '@/features/editorial-board/queries/useModulePublicationStatus';
import { useVideoAnalysisJobs } from '@/features/video-analysis/useVideoAnalysisJob';
import { usePlaylists } from '@/features/playlists/queries/usePlaylists';
import { useIsEditor } from '@/features/profile/queries/useProfile';
import type { ModulePublicationCandidate } from '@/entities/module_publication/module_publication.types';
import { notify } from '@/shared/lib/notify';
import { getReliableYouTubeThumbnailUrl } from '@/shared/lib/youtube';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, ListVideo, Loader2, Plus, RefreshCw, Search } from 'lucide-react';

const EditorialPortal = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isEditor, isLoading: roleLoading } = useIsEditor();
  const [query, setQuery] = useState('');
  const { data: playlists, isLoading: playlistsLoading, isError } = usePlaylists();
  const { data: analysisJobs, isLoading: analysisJobsLoading } = useVideoAnalysisJobs({ limit: 6 });
  const {
    data: publicationCandidates = [],
    isLoading: publicationCandidatesLoading,
    refetch: refetchPublicationCandidates,
  } = useModulePublicationCandidates({
    search: query || undefined,
    limit: 12,
    enabled: isEditor,
  });
  const enqueueModulePublicationMutation = useEnqueueModulePublication();
  const [activePublicationJobId, setActivePublicationJobId] = useState<string | undefined>();
  const { data: activePublicationJobs = [] } = useModulePublicationStatusByJob(
    activePublicationJobId,
    !!activePublicationJobId,
  );

  const activePublicationJob = activePublicationJobs[0] ?? null;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, navigate, user]);

  const facodiPlaylists = useMemo(() => {
    const all = playlists || [];
    const filteredByCode = all.filter((playlist) => playlist.course_code || playlist.unit_code);

    if (!query.trim()) return filteredByCode;

    const normalized = query.toLowerCase();
    return filteredByCode.filter((playlist) =>
      [playlist.name, playlist.description || '', playlist.course_code || '', playlist.unit_code || '']
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [playlists, query]);

  const pendingAnalysisCount = useMemo(
    () => (analysisJobs || []).filter((job) => ['pending', 'processing', 'recoverable_error'].includes(job.status)).length,
    [analysisJobs],
  );

  const handleEnqueueModulePublication = async (candidate: ModulePublicationCandidate) => {
    try {
      const job = await enqueueModulePublicationMutation.mutateAsync({
        moduleId: candidate.module_id,
        payload: {
          source: 'editorial_portal',
          playlistId: candidate.playlist?.id ?? null,
        },
      });

      setActivePublicationJobId(job.job_id);
      notify.success(
        t('editorialPortal.publish.feedback.queued', {
          defaultValue: 'Publication job enqueued',
        }),
        {
          description: t('editorialPortal.publish.feedback.queuedDescription', {
            defaultValue: candidate.module_title,
          }),
        },
      );
      await refetchPublicationCandidates();
    } catch (error) {
      notify.error(
        t('editorialPortal.publish.feedback.error', {
          defaultValue: 'Could not enqueue publication',
        }),
        {
          description: error instanceof Error ? error.message : t('common.unknownError', { defaultValue: 'Unknown error' }),
        },
      );
    }
  };

  const getJobStatusBadgeVariant = (status: string | null | undefined) => {
    if (status === 'succeeded') return 'default';
    if (status === 'failed' || status === 'cancelled') return 'destructive';
    if (status === 'retryable_error') return 'secondary';
    return 'outline';
  };

  if (authLoading || roleLoading || playlistsLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-10 w-72 mb-4" />
          <Skeleton className="h-5 w-96 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isEditor) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">{t('editorialPortal.noAccessTitle')}</h1>
          <p className="text-muted-foreground mb-8">{t('editorialPortal.noAccessDescription')}</p>
          <Button onClick={() => navigate('/playlists')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('playlistDetails.backToPlaylists')}
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('editorialPortal.title')}</h1>
            <p className="text-muted-foreground mt-2">{t('editorialPortal.description')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('editorialPortal.searchPlaceholder')}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => navigate('/editor/applications')}>
              {t('editorApplications.adminPage.title')}
            </Button>
            <Button onClick={() => navigate('/playlists/new')} className="gap-2">
              <Plus className="w-4 h-4" />
              {t('playlists.createPlaylist')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">{t('editorialPortal.stats.editableTotal')}</p>
            <p className="text-2xl font-bold mt-1">{playlists?.length || 0}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">{t('editorialPortal.stats.facodiTotal')}</p>
            <p className="text-2xl font-bold mt-1">{facodiPlaylists.length}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">{t('editorialPortal.stats.withUnitCode')}</p>
            <p className="text-2xl font-bold mt-1">{facodiPlaylists.filter((p) => !!p.unit_code).length}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">{t('editorialPortal.stats.analysisQueue')}</p>
            <p className="text-2xl font-bold mt-1">{pendingAnalysisCount}</p>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">{t('editorialPortal.analysisQueue.title')}</h2>
              <p className="text-sm text-muted-foreground">{t('editorialPortal.analysisQueue.description')}</p>
            </div>
          </div>
          {analysisJobsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : analysisJobs && analysisJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysisJobs.map((job) => (
                <div key={job.id} className="rounded-xl border bg-card p-4">
                  <div className="flex items-start gap-3">
                    {job.video?.thumbnail_url ? (
                      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                        <img
                            src={getReliableYouTubeThumbnailUrl(job.video.thumbnail_url, '/placeholder.svg')}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <VideoDurationBadge durationSeconds={job.video.duration_seconds} className="bottom-1 right-1 min-w-9 px-1.5 py-0.5 text-[0.6rem]" />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {t(`submitStatus.deepAnalysis.statusLabels.${job.status}`, { defaultValue: job.status })}
                        </Badge>
                        <Badge variant="outline">{job.provider}</Badge>
                      </div>
                      <p className="mt-2 truncate text-sm font-medium">
                        {job.video?.title || t('editorialPortal.analysisQueue.unknownVideo')}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {job.video?.category?.name || t('common.none')}
                      </p>
                    </div>
                  </div>
                  {job.video_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => navigate(job.video ? getVideoRoute(job.video) : `/videos/${job.video_id}`)}
                    >
                      {t('editorialPortal.analysisQueue.reviewVideo')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
              {t('editorialPortal.analysisQueue.empty')}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {t('editorialPortal.publish.title', {
                  defaultValue: 'Module publication queue',
                })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('editorialPortal.publish.description', {
                  defaultValue: 'Queue module publication and monitor async job status from the editorial portal.',
                })}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => refetchPublicationCandidates()}
              disabled={publicationCandidatesLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('editorialPortal.publish.refresh', { defaultValue: 'Refresh jobs' })}
            </Button>
          </div>

          {activePublicationJob ? (
            <div className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={getJobStatusBadgeVariant(activePublicationJob.status)}>
                  {t(`editorialPortal.publish.status.${activePublicationJob.status}`, {
                    defaultValue: activePublicationJob.status,
                  })}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {t('editorialPortal.publish.jobId', { defaultValue: 'Job' })}: {activePublicationJob.id}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('editorialPortal.publish.attempts', { defaultValue: 'Attempts' })}: {activePublicationJob.attempt_count}/{activePublicationJob.max_attempts}
                </span>
              </div>
              {activePublicationJob.last_error_message ? (
                <p className="mt-2 text-sm text-destructive">{activePublicationJob.last_error_message}</p>
              ) : null}
            </div>
          ) : null}

          {publicationCandidatesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : publicationCandidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publicationCandidates.map((candidate) => {
                const isPendingCurrentModule =
                  enqueueModulePublicationMutation.isPending &&
                  enqueueModulePublicationMutation.variables?.moduleId === candidate.module_id;

                return (
                  <div key={candidate.module_id} className="rounded-xl border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold leading-snug">{candidate.module_title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{candidate.playlist?.name ?? candidate.module_slug}</p>
                      </div>
                      {candidate.latest_job ? (
                        <Badge variant={getJobStatusBadgeVariant(candidate.latest_job.status)}>
                          {t(`editorialPortal.publish.status.${candidate.latest_job.status}`, {
                            defaultValue: candidate.latest_job.status,
                          })}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{t('editorialPortal.publish.neverQueued', { defaultValue: 'Not queued' })}</Badge>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {candidate.playlist?.course_code ? <Badge variant="secondary">{candidate.playlist.course_code}</Badge> : null}
                      {candidate.playlist?.unit_code ? <Badge variant="secondary">{candidate.playlist.unit_code}</Badge> : null}
                      <Badge variant="outline">
                        {t('editorialPortal.publish.videoCount', { defaultValue: '{{count}} videos', count: candidate.playlist?.video_count ?? 0 })}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {candidate.latest_job?.status === 'succeeded' ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : candidate.latest_job?.status === 'failed' ? (
                          <AlertCircle className="h-3.5 w-3.5" />
                        ) : (
                          <Clock3 className="h-3.5 w-3.5" />
                        )}
                        {candidate.latest_job?.requested_at
                          ? new Date(candidate.latest_job.requested_at).toLocaleString()
                          : t('editorialPortal.publish.neverQueued', { defaultValue: 'Not queued yet' })}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleEnqueueModulePublication(candidate)}
                        disabled={isPendingCurrentModule}
                      >
                        {isPendingCurrentModule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t('editorialPortal.publish.enqueue', { defaultValue: 'Enqueue publish' })}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
              {t('editorialPortal.publish.empty', {
                defaultValue: 'No module publication candidates found for this filter.',
              })}
            </div>
          )}
        </section>

        {isError ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium mb-2">{t('playlists.loadingErrorTitle')}</p>
            <p>{t('playlists.loadingErrorDescription')}</p>
          </div>
        ) : facodiPlaylists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {facodiPlaylists.map((playlist, index) => (
              <PlaylistCard key={playlist.id} playlist={playlist} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <ListVideo className="w-16 h-16 mb-4 opacity-50 mx-auto" />
            <p className="text-lg font-medium mb-2">{t('editorialPortal.emptyTitle')}</p>
            <p className="mb-6">{t('editorialPortal.emptyDescription')}</p>
            <Button onClick={() => navigate('/playlists/new')}>{t('playlists.createFirstPlaylist')}</Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default EditorialPortal;
