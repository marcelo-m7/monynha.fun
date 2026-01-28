import { AppLayout } from '@/components/AppLayout';
import { Footer } from '@/components/Footer';
import { usePlaylists } from '@/features/playlists/queries/usePlaylists';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, ListVideo, Search, Filter, Youtube } from 'lucide-react'; // Import Youtube icon
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { PlaylistCard } from '@/components/playlist/PlaylistCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/features/auth/useAuth';
import { PlaylistImportDialog } from '@/components/playlist/PlaylistImportDialog'; // Import PlaylistImportDialog

const Playlists = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'my' | 'collaborating'>('all');

  const { data: playlists, isLoading, isError } = usePlaylists({
    searchQuery: searchQuery || undefined,
    filter: filter,
    enabled: filter !== 'my' || !!user, // Only enable 'my' filter if user is logged in
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 container py-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <Skeleton className="h-10 w-48" />
            <div className="flex gap-2 w-full md:w-auto">
              <Skeleton className="h-10 flex-1 md:w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
        <Footer />
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <div className="flex-1 container py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">{t('playlists.loadingErrorTitle')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('playlists.loadingErrorDescription')}
          </p>
          <Button onClick={() => navigate('/')}>{t('common.backToHome')}</Button>
        </div>
        <Footer />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 container py-6 sm:py-8 lg:py-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{t('playlists.title')}</h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">{t('playlists.description')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder={t('playlists.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 h-11 sm:h-10 text-base sm:text-sm bg-muted/50 border-0 focus-visible:ring-primary/30"
              />
            </div>
            <Select value={filter} onValueChange={(value: 'all' | 'my' | 'collaborating') => setFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px] h-11 sm:h-10 bg-muted/50 border-0 focus:ring-primary/30">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder={t('playlists.filter.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('playlists.filter.all')}</SelectItem>
                {user && (
                  <>
                    <SelectItem value="my">{t('playlists.filter.myPlaylists')}</SelectItem>
                    <SelectItem value="collaborating">{t('playlists.filter.collaborating')}</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <PlaylistImportDialog>
              <Button variant="outline" className="gap-2 w-full sm:w-auto h-11 sm:h-10">
                <Youtube className="w-4 h-4" />
                {t('playlists.import.button')}
              </Button>
            </PlaylistImportDialog>
            <Button onClick={() => navigate('/playlists/new')} className="gap-2 w-full sm:w-auto h-11 sm:h-10">
              <Plus className="w-4 h-4" />
              {t('playlists.createPlaylist')}
            </Button>
          </div>
        </div>

        {playlists && playlists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {playlists.map((playlist, index) => (
              <PlaylistCard key={playlist.id} playlist={playlist} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <ListVideo className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 opacity-50 mx-auto" />
            <p className="text-base sm:text-lg font-medium mb-2">{t('playlists.noPlaylistsTitle')}</p>
            <p className="mb-4 sm:mb-6 text-sm sm:text-base">{t('playlists.noPlaylistsDescription')}</p>
            <Button onClick={() => navigate('/playlists/new')} className="w-full sm:w-auto">{t('playlists.createFirstPlaylist')}</Button>
          </div>
        )}
      </div>
      <Footer />
    </AppLayout>
  );
};

export default Playlists;
