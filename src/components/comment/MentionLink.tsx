import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { User as UserIcon } from 'lucide-react';
import { useProfileByUsername } from '@/features/profile/queries/useProfile';

interface MentionLinkProps {
  username: string;
}

export const MentionLink: React.FC<MentionLinkProps> = ({ username }) => {
  const { t } = useTranslation();
  const { data: profile, isLoading, isError } = useProfileByUsername(username);

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Link to={`/profile/${username}`} className="text-primary font-semibold hover:underline">
          @{username}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        {isLoading ? (
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ) : isError || !profile ? (
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-muted/50 text-muted-foreground">
                <UserIcon className="w-6 h-6" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('common.anonymous')}</p>
              <p className="text-xs text-muted-foreground">{t('profile.notFoundTitle')}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username || 'User'} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {profile.display_name ? profile.display_name[0].toUpperCase() : (profile.username ? profile.username[0].toUpperCase() : <UserIcon className="w-6 h-6" />)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <span className="text-sm font-semibold">{profile.display_name || profile.username}</span>
              {profile.username && <p className="text-xs text-muted-foreground">@{profile.username}</p>}
              {profile.bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{profile.bio}</p>}
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};