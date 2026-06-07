import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlaylistImportProgress() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    navigate(query ? `/submissions?${query}` : '/submissions', { replace: true });
  }, [navigate, searchParams]);

  return (
    <MainLayout>
      <div className="container max-w-5xl py-10 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('playlists.import.progress.title')}</CardTitle>
            <CardDescription>{t('playlists.import.progress.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}