import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Instagram,
  Github,
  Youtube,
  Linkedin,
  Twitter,
  Globe,
  Link as LinkIcon,
  LucideIcon,
} from 'lucide-react';
import { UserSocialAccount, SocialPlatform } from '@/entities/social_account/social_account.types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SocialAccountsDisplayProps {
  socialAccounts: UserSocialAccount[];
}

const platformIconMap: Record<SocialPlatform, LucideIcon> = {
  instagram: Instagram,
  github: Github,
  youtube: Youtube,
  linkedin: Linkedin,
  twitter: Twitter,
  website: Globe,
  other: LinkIcon,
};

const getPlatformName = (platform: SocialPlatform, t: (key: string) => string) => {
  switch (platform) {
    case 'instagram': return 'Instagram';
    case 'github': return 'GitHub';
    case 'youtube': return 'YouTube';
    case 'linkedin': return 'LinkedIn';
    case 'twitter': return 'Twitter';
    case 'website': return t('profile.social.website');
    case 'other': return t('profile.social.other');
    default: return platform;
  }
};

export const SocialAccountsDisplay: React.FC<SocialAccountsDisplayProps> = ({ socialAccounts }) => {
  const { t } = useTranslation();

  if (!socialAccounts || socialAccounts.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {socialAccounts.map((account) => {
        const Icon = platformIconMap[account.platform as SocialPlatform] || LinkIcon;
        const platformName = getPlatformName(account.platform as SocialPlatform, t);
        return (
          <TooltipProvider key={account.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="outline" size="icon" className="rounded-full">
                  <a href={account.url} target="_blank" rel="noopener noreferrer" aria-label={platformName}>
                    <Icon className="w-5 h-5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{platformName}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};