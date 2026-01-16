import { useParams, useNavigate } from 'react-router-dom';
import {
  usePlaylistById,
  usePlaylistVideos,
  useDeletePlaylist,
  useAddVideoToPlaylist,
  useRemoveVideoFromPlaylist,
  usePlaylistProgress,
  useCanEditPlaylist,
  useIsPlaylistAuthor,
} from '@/hooks/usePlaylists';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { VideoCard } from '@/components/VideoCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ListVideo, BookOpen, Code, Globe, Trash2, Edit, Loader2, Plus, Search, XCircle, Lock, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useVideos } from '@/hooks/useVideos';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlaylistProgressBar } from '@/components/playlist/PlaylistProgressBar'; // NEW
import { SortableVideoList } from '@/components/playlist/SortableVideoList'; // NEW
import { PlaylistCollaboratorsDialog } from '@/components/playlist/PlaylistCollaboratorsDialog'; // NEW

const PlaylistDetails = () => {
  const { t } = useTranslation();
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const { data: playlist, isLoading: playlistLoading, isError: playlistError } = usePlaylistById(playlistId);
  const { data: playlistVideos, isLoading: videosLoading, isError: videosError } = usePlaylistVideos(playlistId);
  const { data: playlistProgress, isLoading: progressLoading } = usePlaylistProgress(playlistId);

  const deletePlaylistMutation = useDeletePlaylist();
  const addVideoToPlaylistMutation = useAddVideoToPlaylist();

  const isAuthor = useIsPlaylistAuthor(playlist);
  const canEdit = useCanEditPlaylist(playlist);

  const [addVideoSearchQuery, setAddVideoSearchQuery] = useState('');
  const [isAddVideoDialogOpen, setIsAddVideoDialogOpen] = useState(false);
  const { data: availableVideos, isLoading: availableVideosLoading } = useVideos({
    searchQuery: addVideoSearchQuery,
    enabled: canEdit && isAddVideoDialogOpen,
  });

  const handleDeletePlaylist = async () => {
    if (!playlistId) return;
    try {
      await deletePlaylistMutation.mutateAsync(playlistId);
      navigate('/playlists');
    } catch (error) {
      // Error handled by mutation hook's onError
    }
  };

  const handleAddVideo = async (videoId: string) => {
    if (!playlistId) return;
    try {
      await addVideoToPlaylistMutation.mutateAsync({ playlistId, videoId });
      setAddVideoSearchQuery(''); // Clear search after adding
    } catch (error) {
      // Error handled by mutation hook's onError
    }
  };

  const totalVideos = playlistVideos?.length || 0;
  const watchedVideos = playlistProgress?.filter(p => p.watched).length || 0;

  if (playlistLoading || authLoading || videosLoading || progressLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-5 w-48" />
            </div>
          </div>
          <Skeleton className="h-20 w-full mb-6" />
          <div className="flex flex-wrap gap-3 mb-8">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            {canEdit && (
              <>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </>
            )}
          </div>
          {user && <Skeleton className="h-16 w-full mb-8" />}
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
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

  // Check if user can view the playlist (public, author, or collaborator)
  const canView = playlist.is_public || isAuthor || (playlistProgress && playlistProgress.length > 0); // Simplified check for collaborators for now

  if (!canView) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <Lock className="w-16 h-16 mb-4 opacity-50 mx-auto" />
          <h1 className="text-3xl font-bold mb-4">{t('playlistDetails.privateTitle')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('playlistDetails.privateDescription')}
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

  const playlistThumbnail = playlist.thumbnail_url || playlistVideos?.[0]?.video?.thumbnail_url || '/placeholder.svg';

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

        <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
          <img
            src={playlistThumbnail}
            alt={playlist.name}
            className="w-full md:w-64 h-40 md:h-auto object-cover rounded-2xl shadow-md flex-shrink-0"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.svg';
              target.onerror = null;
            }}
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {playlist.is_ordered ? (
                <Badge variant="secondary" className="gap-1">
                  <GraduationCap className="w-3 h-3" /> {t('playlists.learningPath')}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <ListVideo className="w-3 h-3" /> {t('playlists.collection')}
                </Badge>
              )}
              {!playlist.is_public && (
                <Badge variant="outline" className="gap-1 text-yellow-700 border-yellow-500 bg-yellow-500/10">
                  <Lock className="w-3 h-3" /> {t('playlistDetails.privateTitle')}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">{playlist.name}</h1>
            <p className="text-lg text-muted-foreground">
              {playlist.author?.username ? t('playlistDetails.byAuthor', { author: playlist.author.display_name || playlist.author.username }) : t('playlistDetails.anonymousAuthor')}
            </p>
            <p className="text-muted-foreground text-base max-w-2xl">
              {playlist.description || t('playlistDetails.noDescription')}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {playlist.course_code && (
                <Badge variant="outline" className="gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> {playlist.course_code}
                </Badge>
              )}
              {playlist.unit_code && (
                <Badge variant="outline" className="gap-1">
                  <Code className="w-3.5 h-3.5" /> {playlist.unit_code}
                </Badge>
              )}
              <Badge variant="outline" className="gap-1 uppercase">
                <Globe className="w-3.5 h-3.5" /> {playlist.language}
              </Badge>
            </div>
          </div>
        </div>

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
              <Dialog open={isAddVideoDialogOpen} onOpenChange={setIsAddVideoDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> {t('playlistDetails.addVideos')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>{t('playlistDetails.addVideoDialogTitle')}</DialogTitle>
                    <DialogDescription>{t('playlistDetails.addVideoDialogDescription')}</DialogDescription>
                  </DialogHeader>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t('playlistDetails.searchVideosPlaceholder')}
                      value={addVideoSearchQuery}
                      onChange={(e) => setAddVideoSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                    {addVideoSearchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                        onClick={() => setAddVideoSearchQuery('')}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="flex-1 pr-4">
                    {availableVideosLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center space-x-4">
                            <Skeleton className="w-24 h-16 rounded-md" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-3 w-3/4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : availableVideos && availableVideos.length > 0 ? (
                      <div className="space-y-4">
                        {availableVideos.map((video) => {
                          const isAlreadyInPlaylist = playlistVideos?.some(pv => pv.video_id === video.id);
                          return (
                            <div key={video.id} className="flex items-center justify-between gap-4 p-2 border rounded-lg">
                              <VideoCard video={video} variant="compact" onClick={() => {}} />
                              <Button
                                size="sm"
                                onClick={() => handleAddVideo(video.id)}
                                disabled={isAlreadyInPlaylist || addVideoToPlaylistMutation.isPending}
                              >
                                {addVideoToPlaylistMutation.isPending && addVideoToPlaylistMutation.variables?.videoId === video.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  isAlreadyInPlaylist ? t('playlistDetails.added') : t('playlistDetails.add')
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground">{t('playlistDetails.noVideosFound')}</p>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              {isAuthor && ( // Only author can manage collaborators
                <PlaylistCollaboratorsDialog playlistId={playlist.id} isAuthor={isAuthor} />
              )}
              {isAuthor && ( // Only author can delete
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
            {canEdit && (
              <Button onClick={() => setIsAddVideoDialogOpen(true)}>
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