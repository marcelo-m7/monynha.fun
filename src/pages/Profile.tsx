import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useProfileByUsername } from '@/features/profile/queries/useProfile';
import { useVideos } from '@/features/videos/queries/useVideos';
import { usePlaylists } from '@/features/playlists/queries/usePlaylists';
import { useUserSocialAccounts } from '@/features/user_social_accounts'; // Import the new hook
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, User as UserIcon, Video as VideoIcon, ListVideo, ArrowLeft, Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';
import { VideoCard } from '@/components/VideoCard';
import { SocialAccountsDisplay } from '@/components/profile/SocialAccountsDisplay'; // Import the new component

const Profile = () => {
  const { t } = useTranslation();
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading } = useAuth();

  const { data: profile, isLoading: profileLoading, isError: profileError } = useProfileByUsername(username);
  const isCurrentUser = authUser && profile && authUser.id === profile.id;
  const { data: userVideos, isLoading: videosLoading } = useVideos({
    submittedBy: profile?.id,
    enabled: !!profile?.id,
  });
  const { data: userPlaylists, isLoading: playlistsLoading } = usePlaylists({
    authorId: profile?.id,
    isPublic: isCurrentUser ? undefined : true,
    enabled: !!profile?.id,
  });
  const { data: socialAccounts, isLoading: socialAccountsLoading } = useUserSocialAccounts(profile?.id); // Fetch social accounts

  if (profileLoading || authLoading || socialAccountsLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <Skeleton className="h-24 w-full mb-8" />
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">{t('profile.notFoundTitle')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('profile.notFoundDescription')}
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.backToHome')}
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
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 p-6 bg-card border border-border rounded-2xl shadow-sm">
          <Avatar className="w-24 h-24 border-2 border-primary">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username || 'User'} />
            <AvatarFallback className="bg-primary/20 text-primary text-3xl font-semibold">
              {profile.display_name ? profile.display_name[0].toUpperCase() : (profile.username ? profile.username[0].toUpperCase() : <UserIcon className="w-12 h-12" />)}
            </AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-3xl font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-muted-foreground text-lg">@{profile.username}</p>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground mt-2">
              <CalendarDays className="w-4 h-4" />
              <span>{t('profile.joinedOn', { date: new Date(profile.created_at).toLocaleDateString() })}</span>
            </div>
            {profile.bio && (
              <p className="text-muted-foreground mt-4 max-w-xl whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}
            {socialAccounts && socialAccounts.length > 0 && (
              <div className="mt-4">
                <SocialAccountsDisplay socialAccounts={socialAccounts} />
              </div>
            )}
            {isCurrentUser && (
              <Button onClick={() => navigate('/profile/edit')} className="mt-4 gap-2">
                <Edit className="w-4 h-4" />
                {t('profile.editProfile')}
              </Button>
            )}
          </div>
        </div>

        {/* User Videos */}
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <VideoIcon className="w-6 h-6 text-primary" />
          {t('profile.uploadedVideos')}
        </h2>
        {videosLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : userVideos && userVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {userVideos.map((video, index) => (
              <div
                key={video.id}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <VideoCard video={video} variant="default" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <VideoIcon className="w-16 h-16 mb-4 opacity-50 mx-auto" />
            <p className="text-lg font-medium mb-2">{t('profile.noVideosTitle')}</p>
            <p className="mb-6">{t('profile.noVideosDescription')}</p>
            {isCurrentUser && (
              <Button onClick={() => navigate('/submit')}>{t('profile.uploadFirstVideo')}</Button>
            )}
          </div>
        )}

        {/* User Playlists */}
        <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
          <ListVideo className="w-6 h-6 text-accent" />
          {t('profile.createdPlaylists')}
        </h2>
        {playlistsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : userPlaylists && userPlaylists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {userPlaylists.map((playlist, index) => (
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
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                  {playlist.description || t('playlists.noDescription')}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <ListVideo className="w-16 h-16 mb-4 opacity-50 mx-auto" />
            <p className="text-lg font-medium mb-2">{t('profile.noPlaylistsTitle')}</p>
            <p className="mb-6">{t('profile.noPlaylistsDescription')}</p>
            {isCurrentUser && (
              <Button onClick={() => navigate('/playlists/new')}>{t('profile.createFirstPlaylist')}</Button>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Profile;