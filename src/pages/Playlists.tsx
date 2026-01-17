import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { usePlaylists } from '@/features/playlists/queries/usePlaylists';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, ListVideo, Search, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { PlaylistCard } from '@/components/playlist/PlaylistCard'; // Import the new PlaylistCard
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/features/auth/useAuth';

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
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
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
        </main>
        <Footer />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">{t('playlists.loadingErrorTitle')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('playlists.loadingErrorDescription')}
          </p>
          <Button onClick={() => navigate('/')}>{t('common.backToHome')}</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('playlists.title')}</h1>
            <p className="text-muted-foreground mt-2">{t('playlists.description')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('playlists.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 h-10 bg-muted/50 border-0 focus-visible:ring-primary/30"
              />
            </div>
            <Select value={filter} onValueChange={(value: 'all' | 'my' | 'collaborating') => setFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px] bg-muted/50 border-0 focus:ring-primary/30">
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
            <Button onClick={() => navigate('/playlists/new')} className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              {t('playlists.createPlaylist')}
            </Button>
          </div>
        </div>

        {playlists && playlists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist, index) => (
              <PlaylistCard key={playlist.id} playlist={playlist} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <ListVideo className="w-16 h-16 mb-4 opacity-50 mx-auto" />
            <p className="text-lg font-medium mb-2">{t('playlists.noPlaylistsTitle')}</p>
            <p className="mb-6">{t('playlists.noPlaylistsDescription')}</p>
            <Button onClick={() => navigate('/playlists/new')}>{t('playlists.createFirstPlaylist')}</Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Playlists;
