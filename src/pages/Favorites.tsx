import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { VideoCard } from '@/components/VideoCard';
import { useAuth } from '@/features/auth/useAuth';
import { useFavorites } from '@/features/favorites/queries/useFavorites';
import { Skeleton } from '@/components/ui/skeleton';
import { HeartCrack, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next'; // Import useTranslation

const Favorites = () => {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user, loading: authLoading } = useAuth();
  const { data: favorites, isLoading: favoritesLoading, isError: favoritesError } = useFavorites();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || favoritesLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (favoritesError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">{t('favorites.loadingErrorTitle')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('favorites.loadingErrorDescription')}
          </p>
          <Button onClick={() => navigate('/')}>{t('videoDetails.backToHome')}</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">{t('favorites.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('favorites.description')}
          </p>
        </div>

        {favorites && favorites.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {favorites.map((favorite, index) => (
              favorite.video && (
                <div
                  key={favorite.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <VideoCard video={favorite.video} variant="default" />
                </div>
              )
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center">
            <HeartCrack className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">{t('favorites.noFavoritesTitle')}</p>
            <p className="mb-6">{t('favorites.noFavoritesDescription')}</p>
            <Button onClick={() => navigate('/videos')}>{t('favorites.exploreVideos')}</Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Favorites;