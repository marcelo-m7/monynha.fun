import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PlaylistCard } from '@/components/playlist/PlaylistCard';
import { useAuth } from '@/features/auth/useAuth';
import { usePlaylists } from '@/features/playlists/queries/usePlaylists';
import { useIsEditor } from '@/features/profile/queries/useProfile';
import { ArrowLeft, ListVideo, Plus, Search } from 'lucide-react';

const EditorialPortal = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isEditor, isLoading: roleLoading } = useIsEditor();
  const { data: playlists, isLoading: playlistsLoading, isError } = usePlaylists();
  const [query, setQuery] = useState('');

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        </div>

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
