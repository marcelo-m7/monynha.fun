import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { usePlaylists } from '@/hooks/usePlaylists';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, ListVideo, Loader2, BookOpen, Code, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const Playlists = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: playlists, isLoading, isError } = usePlaylists({ searchQuery: searchQuery || undefined });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
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
          <div className="flex gap-2 w-full md:w-auto">
            <Input
              type="search"
              placeholder={t('playlists.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 md:flex-none md:w-64"
            />
            <Button onClick={() => navigate('/playlists/new')} className="gap-2">
              <Plus className="w-4 h-4" />
              {t('playlists.createPlaylist')}
            </Button>
          </div>
        </div>

        {playlists && playlists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist, index) => (
              <Link
                key={playlist.id}
                to={`/playlists/${playlist.id}`}
                className="group bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 card-hover animate-fade-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <ListVideo className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">{playlist.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {t('playlists.videoCount', { count: playlist.video_count || 0 })}
                      {playlist.author?.username && ` • ${playlist.author.username}`}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                  {playlist.description || t('playlists.noDescription')}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {playlist.course_code && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50">
                      <BookOpen className="w-3 h-3" /> {playlist.course_code}
                    </span>
                  )}
                  {playlist.unit_code && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50">
                      <Code className="w-3 h-3" /> {playlist.unit_code}
                    </span>
                  )}
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 uppercase">
                    <Globe className="w-3 h-3" /> {playlist.language}
                  </span>
                </div>
              </Link>
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