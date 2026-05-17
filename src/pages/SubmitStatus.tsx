import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, CheckCircle2, CopyCheck, ListChecks, ListVideo, Loader2, RefreshCw, Sparkles, Tag, Wand2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/useAuth';
import { useStartSubmissionProcessing, useVideoSubmission } from '@/features/video-submissions/queries/useVideoSubmissions';
import { getVideoSubmissionMetadata } from '@/entities/video_submission/video_submission.types';
import { MotionPage, Reveal } from '@/components/premium/Motion';

const terminalStatuses = new Set(['success', 'failed', 'duplicate', 'recoverable_error']);

function languageLabelKey(language?: string | null) {
  if (!language || language === 'und') {
    return 'submitStatus.language.pending';
  }

  if (['pt', 'en', 'es', 'fr', 'other'].includes(language)) {
    return `common.language.${language}`;
  }

  return null;
}

export default function SubmitStatus() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { submissionId } = useParams<{ submissionId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { data: submission, isLoading, isError, refetch } = useVideoSubmission(submissionId);
  const startProcessing = useStartSubmissionProcessing();
  const startedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (!submission || submission.status !== 'pending' || !submission.video_id || !submission.youtube_url) {
      return;
    }

    if (startedRef.current === submission.id || startProcessing.isPending) {
      return;
    }

    startedRef.current = submission.id;
    startProcessing.mutate({
      submissionId: submission.id,
      videoId: submission.video_id,
      youtubeUrl: submission.youtube_url,
    });
  }, [startProcessing, submission]);

  const metadata = useMemo(
    () => getVideoSubmissionMetadata(submission?.metadata ?? null),
    [submission?.metadata],
  );

  const status = submission?.status;
  const isTerminal = !!status && terminalStatuses.has(status);
  const detectedLanguage = metadata.detectedLanguage;
  const detectedLanguageKey = languageLabelKey(detectedLanguage);
  const videoId = submission?.video_id ?? submission?.duplicate_video_id;
  const assignedPlaylistId = metadata.assignment?.assignedPlaylistId ?? null;
  const assignedPlaylist = assignedPlaylistId
    ? metadata.assignment?.topCandidates?.find((candidate) => candidate.playlistId === assignedPlaylistId) ?? null
    : null;
  const noAssignedPlaylist = status === 'success' && !!metadata.assignment && !assignedPlaylistId;
  const processingStage = metadata.processing?.stage ?? metadata.error?.stage ?? metadata.clientError?.stage ?? null;
  const requestId = metadata.processing?.requestId ?? metadata.error?.requestId ?? null;
  const analysis = metadata.analysis ?? metadata.transcription ?? null;
  const transcript = metadata.transcription;
  const transcriptError = analysis?.errorMessage ?? transcript?.error ?? null;
  const semanticTags = metadata.analysis?.semanticTags ?? metadata.enrichment?.semanticTags ?? [];
  const summaryText = metadata.analysis?.summary
    ?? metadata.enrichment?.summaryDescription
    ?? metadata.enrichment?.shortSummary
    ?? metadata.transcription?.summary
    ?? null;
  const optimizedTitle = metadata.analysis?.optimizedTitle ?? metadata.enrichment?.optimizedTitle ?? null;
  const topCandidates = metadata.assignment?.topCandidates ?? [];
  const rejectedPlaylist = metadata.assignment?.rejectedPlaylistId
    ? topCandidates.find((candidate) => candidate.playlistId === metadata.assignment?.rejectedPlaylistId) ?? null
    : null;

  const handleRetry = () => {
    if (!submission?.video_id || !submission.youtube_url) {
      refetch();
      return;
    }

    startedRef.current = submission.id;
    startProcessing.mutate({
      submissionId: submission.id,
      videoId: submission.video_id,
      youtubeUrl: submission.youtube_url,
    });
  };

  if (authLoading || isLoading) {
    return (
      <MainLayout>
        <div className="container max-w-3xl py-10 space-y-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (isError || !submission) {
    return (
      <MainLayout>
        <div className="container max-w-3xl py-10">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('submitStatus.notFoundTitle')}</AlertTitle>
            <AlertDescription>{t('submitStatus.notFoundDescription')}</AlertDescription>
          </Alert>
          <Button variant="outline" className="mt-6" onClick={() => navigate('/submit')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('submitStatus.backToSubmit')}
          </Button>
        </div>
      </MainLayout>
    );
  }

  const statusIcon = status === 'success'
    ? <CheckCircle2 className="h-8 w-8 text-primary" />
    : status === 'duplicate'
      ? <CopyCheck className="h-8 w-8 text-primary" />
      : status === 'failed' || status === 'recoverable_error'
        ? <AlertCircle className="h-8 w-8 text-destructive" />
        : <Loader2 className="h-8 w-8 animate-spin text-primary" />;

  return (
    <MainLayout>
      <MotionPage className="container max-w-5xl py-10 pb-24 md:pb-10">
        <Button variant="ghost" onClick={() => navigate('/submit')} className="mb-6 text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('submitStatus.backToSubmit')}
        </Button>

        <Card className="overflow-hidden rounded-3xl">
          <CardHeader className="relative space-y-4 border-b border-border/60 bg-muted/25">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-r from-primary/10 via-sky-400/10 to-emerald-400/10" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {statusIcon}
                <div>
                  <CardTitle className="text-2xl font-black">{t(`submitStatus.states.${status}.title`)}</CardTitle>
                  <CardDescription>{t(`submitStatus.states.${status}.description`)}</CardDescription>
                </div>
              </div>
              <Badge variant={isTerminal ? 'default' : 'outline'}>
                {t(`submitStatus.statusLabels.${status}`)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {startProcessing.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('submitStatus.startErrorTitle')}</AlertTitle>
                <AlertDescription>{startProcessing.error.message}</AlertDescription>
              </Alert>
            )}

            {submission.error_message && (
              <Alert variant={submission.recoverable ? 'default' : 'destructive'}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('submitStatus.processingErrorTitle')}</AlertTitle>
                <AlertDescription>
                  {submission.error_message}
                  {requestId && (
                    <span className="mt-1 block text-xs">
                      {t('submitStatus.requestIdLabel')}: {requestId}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {status === 'success' && analysis?.status === 'failed' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('submitStatus.transcription.partialTitle')}</AlertTitle>
                <AlertDescription>
                  {t('submitStatus.transcription.partialDescription')}
                  {transcriptError && (
                    <span className="mt-1 block text-xs">{transcriptError}</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="premium-glass rounded-2xl p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">{t('submitStatus.youtubeIdLabel')}</p>
                <p className="mt-1 break-all text-sm">{submission.youtube_id}</p>
              </div>
              <div className="premium-glass rounded-2xl p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">{t('submitStatus.language.label')}</p>
                <p className="mt-1 text-sm">
                  {detectedLanguageKey ? t(detectedLanguageKey) : detectedLanguage}
                </p>
              </div>
              {processingStage && (
                <div className="premium-glass rounded-2xl p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">{t('submitStatus.stage.label')}</p>
                  <p className="mt-1 text-sm">
                    {t(`submitStatus.stage.values.${processingStage}`, { defaultValue: processingStage })}
                  </p>
                </div>
              )}
              {(summaryText || semanticTags.length > 0 || optimizedTitle) && (
                <Reveal className="premium-surface rounded-3xl p-5 sm:col-span-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase text-muted-foreground">{t('submitStatus.analysis.label')}</p>
                      {optimizedTitle && (
                        <p className="mt-1 text-lg font-bold">{optimizedTitle}</p>
                      )}
                      {summaryText && (
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{summaryText}</p>
                      )}
                    </div>
                  </div>
                  {semanticTags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {semanticTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          <Tag className="h-3 w-3" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Reveal>
              )}
              {assignedPlaylist && (
                <div className="premium-surface rounded-3xl p-5 sm:col-span-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      <ListVideo className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        {t('submitStatus.assignment.label')}
                      </p>
                      <p className="mt-1 text-lg font-bold">{assignedPlaylist.name}</p>
                      {metadata.assignment?.reason && (
                        <p className="mt-1 text-xs text-muted-foreground">{metadata.assignment.reason}</p>
                      )}
                      {metadata.assignment?.decisionSource && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('submitStatus.assignment.decisionSource')}: {metadata.assignment.decisionSource}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {noAssignedPlaylist && (
                <div className="premium-surface rounded-3xl p-5 sm:col-span-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                      <ListVideo className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        {t('submitStatus.assignment.noneLabel')}
                      </p>
                      <p className="mt-1 text-sm font-medium">{t('submitStatus.assignment.noneTitle')}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {metadata.assignment?.reason || t('submitStatus.assignment.noneDescription')}
                      </p>
                      {metadata.assignment?.providerError && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('submitStatus.assignment.providerError')}: {metadata.assignment.providerError}
                        </p>
                      )}
                      {rejectedPlaylist && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('submitStatus.assignment.rejectedLabel')}: {rejectedPlaylist.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {topCandidates.length > 0 && (
                <div className="premium-surface rounded-3xl p-5 sm:col-span-3">
                  <div className="mb-3 flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-primary" />
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      {t('submitStatus.assignment.candidatesLabel')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {topCandidates.slice(0, 3).map((candidate) => (
                      <div key={candidate.playlistId} className="flex flex-col gap-2 rounded-2xl bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{candidate.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('submitStatus.assignment.scoreLabel')}: {candidate.score ?? 0}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {candidate.isAiSuggested || candidate.aiSuggested ? (
                            <Badge variant="secondary">{t('submitStatus.assignment.openaiSuggested')}</Badge>
                          ) : null}
                          {candidate.compatible ? (
                            <Badge variant="outline">{t('submitStatus.assignment.compatible')}</Badge>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!isTerminal && (
              <div className="premium-glass rounded-3xl p-5">
                <div className="flex items-start gap-3">
                  <Wand2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">{t('submitStatus.processingTitle')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t('submitStatus.processingDescription')}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              {videoId && (status === 'success' || status === 'duplicate') && (
                <Button asChild className="rounded-full">
                  <Link to={`/videos/${videoId}`}>{t('submitStatus.viewVideo')}</Link>
                </Button>
              )}
              {(status === 'recoverable_error' || startProcessing.isError) && (
                <Button onClick={handleRetry} disabled={startProcessing.isPending} className="rounded-full">
                  {startProcessing.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {t('submitStatus.retry')}
                </Button>
              )}
              <Button variant="outline" asChild className="rounded-full">
                <Link to="/videos">{t('submitStatus.exploreVideos')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </MotionPage>
    </MainLayout>
  );
}
