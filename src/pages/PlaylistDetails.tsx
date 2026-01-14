import { useParams, useNavigate } from 'react-router-dom';
import { usePlaylistById, usePlaylistVideos, useDeletePlaylist } from '@/hooks/usePlaylists';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { VideoCard } from '@/components/VideoCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ListVideo, BookOpen, Code, Globe, Trash2, Edit, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const PlaylistDetails = () => {
  const { t } = useTranslation();
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const { data: playlist, isLoading: playlistLoading, isError: playlistError } = usePlaylistById(playlistId);
  const { data: playlistVideos, isLoading: videosLoading, isError: videosError } = usePlaylistVideos(playlistId);
  const deletePlaylistMutation = useDeletePlaylist();

  const isAuthor = user && playlist && user.id === playlist.author_id;

  const handleDeletePlaylist = async () => {
    if (!playlistId) return;
    try {
      await deletePlaylistMutation.mutateAsync(playlistId);
      navigate('/playlists');
    } catch (error) {
      // Error handled by mutation hook's onError
    }
  };

  if (playlistLoading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-5 w-1/2 mb-6" />
          <div className="flex gap-2 mb-8">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (playlistError || !playlist) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">{t('playlistDetails.notFoundTitle')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('playlistDetails.notFoundDescription')}
          </p>
          <Button onClick={() => navigate('/playlists')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('playlistDetails.backToPlaylists')}
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/playlists')}
          className="text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('playlistDetails.backToPlaylists')}
        </Button>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <ListVideo className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold leading-tight">{playlist.name}</h1>
            <p className="text-lg text-muted-foreground">
              {playlist.author?.username ? t('playlistDetails.byAuthor', { author: playlist.author.username }) : t('playlistDetails.anonymousAuthor')}
            </p>
          </div>
        </div>

        <p className="text-muted-foreground text-base mb-6 max-w-2xl">
          {playlist.description || t('playlistDetails.noDescription')}
        </p>

        <div className="flex flex-wrap gap-3 mb-8">
          {playlist.course_code && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted/50 text-sm">
              <BookOpen className="w-4 h-4" /> {playlist.course_code}
            </span>
          )}
          {playlist.unit_code && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted/50 text-sm">
              <Code className="w-4 h-4" /> {playlist.unit_code}
            </span>
          )}
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted/50 text-sm uppercase">
            <Globe className="w-4 h-4" /> {playlist.language}
          </span>
          {isAuthor && (
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/playlists/${playlist.id}/edit`)}>
                <Edit className="w-4 h-4" /> {t('playlistDetails.editPlaylist')}
              </Button>
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
            </>
          )}
        </div>

        <h2 className="text-2xl font-bold mb-6">{t('playlistDetails.videosInPlaylist')}</h2>

        {videosLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : playlistVideos && playlistVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlistVideos.map((pv, index) => (
              pv.video && (
                <div
                  key={pv.video_id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <VideoCard video={pv.video} variant="default" />
                </div>
              )
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <ListVideo className="w-16 h-16 mb-4 opacity-50 mx-auto" />
            <p className="text-lg font-medium mb-2">{t('playlistDetails.noVideosTitle')}</p>
            <p className="mb-6">{t('playlistDetails.noVideosDescription')}</p>
            {isAuthor && (
              <Button onClick={() => toast.info(t('playlistDetails.addVideoPrompt'))}>
                {t('playlistDetails.addVideos')}
              </Button>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PlaylistDetails;