import { useParams, useNavigate } from 'react-router-dom';
import { usePlaylistById, useDeletePlaylist } from '@/features/playlists/queries/usePlaylists';
import { usePlaylistVideos } from '@/features/playlists/queries/usePlaylistVideos';
import { usePlaylistProgress } from '@/features/playlists/queries/usePlaylistProgress';
import { useCanEditPlaylist, useIsPlaylistAuthor } from '@/features/playlists/usePlaylistUtils';
import { useMetaTags } from '@/shared/hooks/useMetaTags';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ListVideo, Trash2, Edit, Loader2, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PlaylistProgressBar } from '@/components/playlist/PlaylistProgressBar';
import { SortableVideoList } from '@/components/playlist/SortableVideoList';
import { PlaylistCollaboratorsDialog } from '@/components/playlist/PlaylistCollaboratorsDialog';
import { AddVideoDialog } from '@/components/playlist/AddVideoDialog';
import { PlaylistDetailsHeader } from '@/features/playlists/components/PlaylistDetailsHeader';

const PlaylistDetails = () => {
  const { t } = useTranslation();
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const { data: playlist, isLoading: playlistLoading, isError: playlistError } = usePlaylistById(playlistId);
  const { data: playlistVideos, isLoading: videosLoading, isError: videosError } = usePlaylistVideos(playlistId);
  const { data: playlistProgress, isLoading: progressLoading } = usePlaylistProgress(playlistId);

  const deletePlaylistMutation = useDeletePlaylist();

  const isAuthor = useIsPlaylistAuthor(playlist);
  const canEdit = useCanEditPlaylist(playlist);

  useMetaTags({
    title: playlist?.name ? `${playlist.name} | Tube O2` : 'Tube O2',
    description: playlist?.description || 'Playlist no Tube O2: Curadoria coletiva de vídeos do YouTube.',
    type: 'website',
  });

  const handleDeletePlaylist = async () => {
    if (!playlistId) return;
    await deletePlaylistMutation.mutateAsync(playlistId);
    navigate('/playlists');
  };

  const totalVideos = playlistVideos?.length || 0;
  const watchedVideos = playlistProgress?.filter(p => p.watched).length || 0;

  if (playlistLoading || authLoading || videosLoading || progressLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-5 w-48" />
            </div>
          </div>
          <Skeleton className="h-20 w-full mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (playlistError || !playlist) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">{t('playlistDetails.notFoundTitle')}</h1>
          <p className="text-muted-foreground mb-8">{t('playlistDetails.notFoundDescription')}</p>
          <Button onClick={() => navigate('/playlists')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('playlistDetails.backToPlaylists')}
          </Button>
        </div>
      </MainLayout>
    );
  }

  const canView = playlist.is_public || isAuthor || (playlistProgress && playlistProgress.length > 0);

  if (!canView) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <Lock className="w-16 h-16 mb-4 opacity-50 mx-auto" />
          <h1 className="text-3xl font-bold mb-4">{t('playlistDetails.privateTitle')}</h1>
          <p className="text-muted-foreground mb-8">{t('playlistDetails.privateDescription')}</p>
          <Button onClick={() => navigate('/playlists')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('playlistDetails.backToPlaylists')}
          </Button>
        </div>
      </MainLayout>
    );
  }

  const playlistThumbnail = playlist.thumbnail_url || playlistVideos?.[0]?.video?.thumbnail_url || '/placeholder.svg';

  return (
    <MainLayout>
      <div className="container py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/playlists')}
          className="text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('playlistDetails.backToPlaylists')}
        </Button>

        <PlaylistDetailsHeader playlist={playlist} thumbnail={playlistThumbnail} />

        {user && totalVideos > 0 && (
          <PlaylistProgressBar
            watched={watchedVideos}
            total={totalVideos}
            className="mb-8 p-4 bg-card border border-border rounded-xl shadow-sm"
          />
        )}

        <div className="flex flex-wrap gap-3 mb-8">
          {canEdit && (
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/playlists/${playlist.id}/edit`)}>
                <Edit className="w-4 h-4" /> {t('playlistDetails.editPlaylist')}
              </Button>
              
              <AddVideoDialog playlistId={playlist.id} existingVideos={playlistVideos || []} />

              {isAuthor && (
                <PlaylistCollaboratorsDialog playlistId={playlist.id} isAuthor={isAuthor} />
              )}
              {isAuthor && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                      <Trash2 className="w-4 h-4" /> {t('playlistDetails.deletePlaylist')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('playlistDetails.confirmDeleteTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('playlistDetails.confirmDeleteDescription', { playlistName: playlist.name })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeletePlaylist} disabled={deletePlaylistMutation.isPending}>
                        {deletePlaylistMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {t('common.delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}
        </div>

        <h2 className="text-2xl font-bold mb-6">{t('playlistDetails.videosInPlaylist')}</h2>

        {videosError ? (
          <div className="text-center py-12 text-muted-foreground">
            <ListVideo className="w-16 h-16 mb-4 opacity-50 mx-auto" />
            <p className="text-lg font-medium mb-2">{t('playlistDetails.videosLoadErrorTitle')}</p>
            <p className="mb-6">{t('playlistDetails.videosLoadErrorDescription')}</p>
          </div>
        ) : playlistVideos && playlistVideos.length > 0 ? (
          <SortableVideoList
            playlistId={playlist.id}
            videos={playlistVideos}
            progress={playlistProgress || []}
            canEdit={canEdit}
            isOrdered={playlist.is_ordered}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <ListVideo className="w-16 h-16 mb-4 opacity-50 mx-auto" />
            <p className="text-lg font-medium mb-2">{t('playlistDetails.noVideosTitle')}</p>
            <p className="mb-6">{t('playlistDetails.noVideosDescription')}</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PlaylistDetails;