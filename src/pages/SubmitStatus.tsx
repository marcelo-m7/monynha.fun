import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, CheckCircle2, CopyCheck, Loader2, RefreshCw, Wand2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/useAuth';
import { useStartSubmissionProcessing, useVideoSubmission } from '@/features/video-submissions/queries/useVideoSubmissions';
import { getVideoSubmissionMetadata } from '@/entities/video_submission/video_submission.types';

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
      <div className="container max-w-3xl py-10">
        <Button variant="ghost" onClick={() => navigate('/submit')} className="mb-6 text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('submitStatus.backToSubmit')}
        </Button>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {statusIcon}
                <div>
                  <CardTitle>{t(`submitStatus.states.${status}.title`)}</CardTitle>
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
                <AlertDescription>{submission.error_message}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">{t('submitStatus.youtubeIdLabel')}</p>
                <p className="mt-1 break-all text-sm">{submission.youtube_id}</p>
              </div>
              <div className="rounded-md border border-border p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">{t('submitStatus.language.label')}</p>
                <p className="mt-1 text-sm">
                  {detectedLanguageKey ? t(detectedLanguageKey) : detectedLanguage}
                </p>
              </div>
            </div>

            {!isTerminal && (
              <div className="rounded-md border border-border bg-muted/30 p-4">
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
                <Button asChild>
                  <Link to={`/videos/${videoId}`}>{t('submitStatus.viewVideo')}</Link>
                </Button>
              )}
              {(status === 'recoverable_error' || startProcessing.isError) && (
                <Button onClick={handleRetry} disabled={startProcessing.isPending}>
                  {startProcessing.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {t('submitStatus.retry')}
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link to="/videos">{t('submitStatus.exploreVideos')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
