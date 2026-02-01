import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Users, User as UserIcon, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfiles } from '@/features/profile/queries/useProfile';

export const CommunitySpotlightSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: profiles, isLoading: profilesLoading, isError: profilesError } = useProfiles();

  // Take top 4 profiles for the spotlight
  const topContributors = profiles?.slice(0, 4);

  return (
    <section className="py-16 bg-background">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/10">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">{t('index.communitySpotlightTitle')}</h2>
              <p className="text-muted-foreground mt-1">{t('index.communitySpotlightDescription')}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="gap-2 group"
            onClick={() => navigate('/community')}
          >
            {t('index.viewAll')}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {profilesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl shadow-sm">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : profilesError || !topContributors || topContributors.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UserIcon className="w-16 h-16 mb-4 opacity-50 mx-auto" />
            <p className="text-lg font-medium mb-2">{t('index.noContributorsFound')}</p>
            <p className="mb-6">{t('community.noUsersFoundDescription')}</p>
            <Button onClick={() => navigate('/submit')}>{t('index.ctaButton')}</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topContributors.map((profile, index) => (
              <Link
                key={profile.id}
                to={`/profile/${profile.username}`}
                className="group flex flex-col items-center text-center gap-4 p-6 bg-card border border-border rounded-2xl shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <Avatar className="w-20 h-20 border-2 border-primary/50">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username || 'User'} />
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl font-semibold">
                    {profile.display_name ? profile.display_name[0].toUpperCase() : (profile.username ? profile.username[0].toUpperCase() : <UserIcon className="w-8 h-8" />)}
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
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                      <Video className="w-3 h-3" />
                      {t('community.submissionsCount', { count: profile.submissions_count })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};