import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Users, User as UserIcon, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { useContributorCount, useProfiles } from '@/features/profile/queries/useProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Community = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: contributorCount, isLoading: contributorCountLoading } = useContributorCount();
  const { data: profiles, isLoading: profilesLoading, isError: profilesError } = useProfiles();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <h1 className="text-3xl font-bold">{t('community.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('community.description')}</p>
        </div>
        
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-4 mb-8">
          <div className="p-3 rounded-full bg-accent/10 text-accent">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{t('community.totalContributors')}</h2>
            {contributorCountLoading ? (
              <Skeleton className="h-6 w-24 mt-1" />
            ) : (
              <p className="text-muted-foreground text-lg">
                {t('community.contributorsCount', { count: contributorCount || 0 })}
              </p>
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <UserIcon className="w-6 h-6 text-primary" />
          {t('community.allUsers')}
        </h2>

        {profilesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl shadow-sm">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : profilesError ? (
          <div className="text-center py-12 text-destructive">
            <p>{t('community.loadUsersError')}</p>
          </div>
        ) : profiles && profiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile, index) => (
              <Link
                key={profile.id}
                to={`/profile/${profile.username}`}
                className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <Avatar className="w-12 h-12 border-2 border-primary/50">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username || 'User'} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl font-semibold">
                    {profile.display_name ? profile.display_name[0].toUpperCase() : (profile.username ? profile.username[0].toUpperCase() : <UserIcon className="w-6 h-6" />)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                    {profile.display_name || profile.username || t('common.anonymous')}
                  </h3>
                  {profile.username && (
                    <p className="text-sm text-muted-foreground line-clamp-1">@{profile.username}</p>
                  )}
                  {profile.submissions_count > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Video className="w-3 h-3" />
                      {t('community.submissionsCount', { count: profile.submissions_count })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <UserIcon className="w-16 h-16 mb-4 opacity-50 mx-auto" />
            <p className="text-lg font-medium mb-2">{t('community.noUsersFoundTitle')}</p>
            <p className="mb-6">{t('community.noUsersFoundDescription')}</p>
            <Button onClick={() => navigate('/playlists/new')}>{t('community.createFirstPlaylist')}</Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Community;