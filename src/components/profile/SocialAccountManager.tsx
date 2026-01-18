import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Instagram,
  Github,
  Youtube,
  Linkedin,
  Twitter,
  Globe,
  Link as LinkIcon,
  Plus,
  Trash2,
  Loader2,
  Edit,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useUserSocialAccounts,
  useAddSocialAccount,
  useUpdateSocialAccount,
  useDeleteSocialAccount,
} from '@/features/social_accounts/queries/useSocialAccounts';
import { UserSocialAccount, SocialPlatform } from '@/entities/social_account/social_account.types';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

interface SocialAccountManagerProps {
  userId: string;
}

const socialAccountSchema = z.object({
  platform: z.string().min(1, 'profile.social.form.platformRequired'),
  url: z.string().url('profile.social.form.invalidUrl'),
});

type SocialAccountFormValues = z.infer<typeof socialAccountSchema>;

const platformOptions: { value: SocialPlatform; labelKey: string; icon: LucideIcon }[] = [
  { value: 'instagram', labelKey: 'Instagram', icon: Instagram },
  { value: 'github', labelKey: 'GitHub', icon: Github },
  { value: 'youtube', labelKey: 'YouTube', icon: Youtube },
  { value: 'linkedin', labelKey: 'LinkedIn', icon: Linkedin },
  { value: 'twitter', labelKey: 'Twitter', icon: Twitter },
  { value: 'website', labelKey: 'profile.social.website', icon: Globe },
  { value: 'other', labelKey: 'profile.social.other', icon: LinkIcon },
];

export const SocialAccountManager: React.FC<SocialAccountManagerProps> = ({ userId }) => {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserSocialAccount | null>(null);

  const { data: socialAccounts, isLoading: accountsLoading } = useUserSocialAccounts(userId);
  const addMutation = useAddSocialAccount();
  const updateMutation = useUpdateSocialAccount();
  const deleteMutation = useDeleteSocialAccount();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<SocialAccountFormValues>({
    resolver: zodResolver(socialAccountSchema),
    defaultValues: {
      platform: '',
      url: '',
    },
  });

  const currentPlatform = watch('platform');

  React.useEffect(() => {
    if (editingAccount) {
      setValue('platform', editingAccount.platform);
      setValue('url', editingAccount.url);
    } else {
      reset();
    }
  }, [editingAccount, reset, setValue]);

  const handleOpenDialog = (account?: UserSocialAccount) => {
    setEditingAccount(account || null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAccount(null);
    reset();
  };

  const onSubmit = async (values: SocialAccountFormValues) => {
    try {
      if (editingAccount) {
        await updateMutation.mutateAsync({ id: editingAccount.id, updates: values });
      } else {
        await addMutation.mutateAsync(values);
      }
      handleCloseDialog();
    } catch (error) {
      // Error handled by mutation hooks' onError
    }
  };

  const handleDelete = async (accountId: string) => {
    try {
      await deleteMutation.mutateAsync({ id: accountId, userId });
    } catch (error) {
      // Error handled by mutation hooks' onError
    }
  };

  const CurrentPlatformIcon = platformOptions.find(opt => opt.value === currentPlatform)?.icon || LinkIcon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('profile.social.title')}</h3>
        <Button variant="outline" size="sm" onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          {t('profile.social.addAccount')}
        </Button>
      </div>

      {accountsLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : socialAccounts && socialAccounts.length > 0 ? (
        <div className="space-y-2">
          {socialAccounts.map((account) => {
            const Icon = platformIconMap[account.platform as SocialPlatform] || LinkIcon;
            const platformName = getPlatformName(account.platform as SocialPlatform, t);
            return (
              <div key={account.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{platformName}</p>
                    <a
                      href={account.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline line-clamp-1"
                    >
                      {account.url}
                    </a>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleOpenDialog(account)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(account.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('profile.social.noAccounts')}
        </p>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              {editingAccount ? t('profile.social.editAccountTitle') : t('profile.social.addAccountTitle')}
            </DialogTitle>
            <DialogDescription>
              {editingAccount ? t('profile.social.editAccountDescription') : t('profile.social.addAccountDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform">{t('profile.social.form.platformLabel')} *</Label>
              <Select
                value={currentPlatform}
                onValueChange={(value: SocialPlatform) => setValue('platform', value)}
                disabled={!!editingAccount || isSubmitting} // Platform cannot be changed when editing
              >
                <SelectTrigger>
                  <CurrentPlatformIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder={t('profile.social.form.platformPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {platformOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <option.icon className="w-4 h-4" />
                        {t(option.labelKey)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.platform && (
                <p className="text-sm text-destructive">{t(errors.platform.message as string)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">{t('profile.social.form.urlLabel')} *</Label>
              <Input
                id="url"
                type="url"
                placeholder={t('profile.social.form.urlPlaceholder')}
                {...register('url')}
                aria-invalid={errors.url ? 'true' : 'false'}
                disabled={isSubmitting}
              />
              {errors.url && (
                <p className="text-sm text-destructive">{t(errors.url.message as string)}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('profile.social.form.saving')}
                  </>
                ) : (
                  editingAccount ? t('profile.social.form.saveChanges') : t('profile.social.form.add')
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};