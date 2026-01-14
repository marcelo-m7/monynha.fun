import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePlaylistById, usePlaylistVideos, useDeletePlaylist, useAddVideoToPlaylist, useRemoveVideoFromPlaylist } from '@/hooks/usePlaylists';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { VideoCard } from '@/components/VideoCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ListVideo, BookOpen, Code, Globe, Trash2, Edit, Loader2, Plus, Search, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useVideos } from '@/hooks/useVideos';
import { ScrollArea } from '@/components/ui/scroll-area';

const PlaylistDetails = () => {
  const { t } = useTranslation();
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const { data: playlist, isLoading: playlistLoading, isError: playlistError } = usePlaylistById(playlistId);
  const { data: playlistVideos, isLoading: videosLoading, isError: videosError } = usePlaylistVideos(playlistId);
  const deletePlaylistMutation = useDeletePlaylist();
  const addVideoToPlaylistMutation = useAddVideoToPlaylist();
  const removeVideoFromPlaylistMutation = useRemoveVideoFromPlaylist();

  const isAuthor = user && playlist && user.id === playlist.author_id;

  const [addVideoSearchQuery, setAddVideoSearchQuery] = useState('');
  const [isAddVideoDialogOpen, setIsAddVideoDialogOpen] = useState(false);
  const { data: availableVideos, isLoading: availableVideosLoading } = useVideos({ searchQuery: addVideoSearchQuery });

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
      // Optionally close dialog or clear search
      setAddVideoSearchQuery('');
      // Keep dialog open to allow adding multiple videos
    } catch (error) {
      // Error handled by mutation hook's onError
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    if (!playlistId) return;
    try {
      await removeVideoFromPlaylistMutation.mutateAsync({ playlistId, videoId });
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
                        {availableVideos.map((video) => (
                          <div key={video.id} className="flex items-center justify-between gap-4 p-2 border rounded-lg">
                            <VideoCard video={video} variant="compact" onClick={() => {}} />
                            <Button
                              size="sm"
                              onClick={() => handleAddVideo(video.id)}
                              disabled={addVideoToPlaylistMutation.isPending && addVideoToPlaylistMutation.variables?.videoId === video.id || playlistVideos?.some(pv => pv.video_id === video.id)}
                            >
                              {addVideoToPlaylistMutation.isPending && addVideoToPlaylistMutation.variables?.videoId === video.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                playlistVideos?.some(pv => pv.video_id === video.id) ? t('playlistDetails.added') : t('playlistDetails.add')
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground">{t('playlistDetails.noVideosFound')}</p>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
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
                  className="animate-fade-up relative"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <VideoCard video={pv.video} variant="default" />
                  {isAuthor && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full"
                      onClick={() => handleRemoveVideo(pv.video_id)}
                      disabled={removeVideoFromPlaylistMutation.isPending && removeVideoFromPlaylistMutation.variables?.videoId === pv.video_id}
                    >
                      {removeVideoFromPlaylistMutation.isPending && removeVideoFromPlaylistMutation.variables?.videoId === pv.video_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </Button>
                  )}
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