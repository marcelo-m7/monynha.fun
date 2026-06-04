import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { notify } from '@/shared/lib/notify';
import { useAuth } from '@/features/auth/useAuth';
import { useIsEditor } from '@/features/profile/queries/useProfile';
import {
  useEditorApplicationsList,
  useUpdateEditorApplicationStatus,
} from '@/features/editor-applications';
import type { EditorApplicationStatus } from '@/entities/editor_application/editor_application.types';

const statusList: EditorApplicationStatus[] = ['pending', 'under_review', 'approved', 'rejected'];

export default function EditorApplications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isEditor, isLoading: roleLoading } = useIsEditor();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | EditorApplicationStatus>('all');

  const listParams = {
    query: search,
    status,
    limit: 100,
  };

  const { data, isLoading, isError } = useEditorApplicationsList(listParams);
  const updateStatusMutation = useUpdateEditorApplicationStatus();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, navigate, user]);

  if (authLoading || roleLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-12 w-full max-w-md mb-8" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-24 w-full" />
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
          <h1 className="text-3xl font-bold mb-4">{t('editorApplications.adminPage.noAccessTitle')}</h1>
          <p className="text-muted-foreground mb-8">{t('editorApplications.adminPage.noAccessDescription')}</p>
          <Button onClick={() => navigate('/editorial')}>{t('editorApplications.adminPage.backToEditorial')}</Button>
        </div>
      </MainLayout>
    );
  }

  const handleStatusUpdate = async (applicationId: string, nextStatus: EditorApplicationStatus) => {
    try {
      await updateStatusMutation.mutateAsync({
        applicationId,
        status: nextStatus,
        listParams,
      });

      notify.success(t('editorApplications.adminPage.statusUpdatedTitle'), {
        description: t('editorApplications.adminPage.statusUpdatedDescription', { status: t(`editorApplications.status.${nextStatus}`) }),
      });
    } catch (error) {
      notify.error(t('editorApplications.adminPage.statusUpdateErrorTitle'), {
        description: error instanceof Error ? error.message : t('editorApplications.adminPage.statusUpdateErrorDescription'),
      });
    }
  };

  return (
    <MainLayout>
      <div className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('editorApplications.adminPage.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('editorApplications.adminPage.description')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('editorApplications.adminPage.searchPlaceholder')}
          />
          <Select value={status} onValueChange={(value) => setStatus(value as 'all' | EditorApplicationStatus)}>
            <SelectTrigger>
              <SelectValue placeholder={t('editorApplications.adminPage.statusFilterPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('editorApplications.adminPage.statusFilterAll')}</SelectItem>
              {statusList.map((item) => (
                <SelectItem key={item} value={item}>
                  {t(`editorApplications.status.${item}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-28 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-muted-foreground">
            <p>{t('editorApplications.adminPage.loadError')}</p>
          </div>
        ) : data && data.length > 0 ? (
          <div className="space-y-4">
            {data.map((application) => (
              <article key={application.id} className="border border-border rounded-2xl p-4 md:p-5 space-y-4 bg-card">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-lg">{application.full_name}</h2>
                    <p className="text-sm text-muted-foreground">{application.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('editorApplications.adminPage.appliedAt')} {new Date(application.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-primary">
                    {t(`editorApplications.status.${application.status}`)}
                  </span>
                </div>

                {application.motivation ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{application.motivation}</p>
                ) : null}

                {application.portfolio_url ? (
                  <a
                    href={application.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline break-all text-sm"
                  >
                    {application.portfolio_url}
                  </a>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {statusList.map((nextStatus) => (
                    <Button
                      key={nextStatus}
                      type="button"
                      variant={nextStatus === application.status ? 'default' : 'outline'}
                      size="sm"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => handleStatusUpdate(application.id, nextStatus)}
                    >
                      {t(`editorApplications.status.${nextStatus}`)}
                    </Button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <p>{t('editorApplications.adminPage.empty')}</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
