import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Instagram,
  Github,
  Youtube,
  Globe,
  Twitter,
  Linkedin,
  Facebook,
  Link as LinkIcon,
  Plus,
  Edit,
  Trash2,
  Loader2,
  LucideIcon,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useUserSocialAccounts,
  useCreateUserSocialAccount,
  useUpdateUserSocialAccount,
  useDeleteUserSocialAccount,
  UserSocialAccount,
} from '@/features/user_social_accounts';
import { useAuth } from '@/features/auth/useAuth';
import { toast } from 'sonner';

interface SocialAccountsManagerProps {
  userId: string;
}

const socialAccountSchema = z.object({
  platform: z.string().min(1, 'profile.social.form.platformRequired'),
  url: z.string().url('profile.social.form.invalidUrl'),
});

type SocialAccountFormValues = z.infer<typeof socialAccountSchema>;

const platformOptions = [
  { value: 'instagram', labelKey: 'profile.social.platform.instagram', icon: Instagram },
  { value: 'github', labelKey: 'profile.social.platform.github', icon: Github },
  { value: 'youtube', labelKey: 'profile.social.platform.youtube', icon: Youtube },
  { value: 'twitter', labelKey: 'profile.social.platform.twitter', icon: Twitter },
  { value: 'linkedin', labelKey: 'profile.social.platform.linkedin', icon: Linkedin },
  { value: 'facebook', labelKey: 'profile.social.platform.facebook', icon: Facebook },
  { value: 'website', labelKey: 'profile.social.platform.website', icon: Globe },
];

const platformIconMap: Record<string, LucideIcon> = {
  instagram: Instagram,
  github: Github,
  youtube: Youtube,
  twitter: Twitter,
  linkedin: Linkedin,
  facebook: Facebook,
  website: Globe,
};

export const SocialAccountsManager: React.FC<SocialAccountsManagerProps> = ({ userId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserSocialAccount | null>(null);

  const { data: socialAccounts, isLoading: accountsLoading } = useUserSocialAccounts(userId);
  const createMutation = useCreateUserSocialAccount();
  const updateMutation = useUpdateUserSocialAccount();
  const deleteMutation = useDeleteUserSocialAccount();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SocialAccountFormValues>({
    resolver: zodResolver(socialAccountSchema),
    defaultValues: {
      platform: '',
      url: '',
    },
  });

  const selectedPlatform = watch('platform');

  // Effect to reset form when dialog opens for a new account or closes
  useEffect(() => {
    if (!isDialogOpen) {
      setEditingAccount(null);
      reset({
        platform: '',
        url: '',
      });
    } else if (editingAccount) {
      // If editing, set form values
      reset({
        platform: editingAccount.platform,
        url: editingAccount.url,
      });
    }
  }, [isDialogOpen, editingAccount, reset]);


  const onSubmit = async (values: SocialAccountFormValues) => {
    if (!user) {
      toast.error(t('profile.social.error.notLoggedIn'));
      return;
    }

    try {
      if (editingAccount) {
        await updateMutation.mutateAsync({ id: editingAccount.id, payload: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setIsDialogOpen(false); // Close dialog on successful submission
    } catch (error) {
      // Errors handled by mutation hooks' onError
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!user) {
      toast.error(t('profile.social.error.notLoggedIn'));
      return;
    }
    try {
      await deleteMutation.mutateAsync(accountId);
    } catch (error) {
      // Errors handled by mutation hooks' onError
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('profile.social.title')}</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => setEditingAccount(null)}> {/* Set editingAccount to null for new */}
              <Plus className="w-4 h-4 mr-2" />
              {t('profile.social.addAccount')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? t('profile.social.editAccount') : t('profile.social.addAccount')}
              </DialogTitle>
              <DialogDescription>
                {t('profile.social.dialogDescription')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform">{t('profile.social.form.platformLabel')} *</Label>
                <Select
                  value={selectedPlatform}
                  onValueChange={(value) => setValue('platform', value, { shouldValidate: true })}
                  disabled={!!editingAccount} // Platform cannot be changed when editing
                >
                  <SelectTrigger>
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
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="url"
                    type="url"
                    placeholder={t('profile.social.form.urlPlaceholder')}
                    {...register('url')}
                    className="pl-10"
                  />
                </div>
                {errors.url && (
                  <p className="text-sm text-destructive">{t(errors.url.message as string)}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
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

      {accountsLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : socialAccounts && socialAccounts.length > 0 ? (
        <div className="space-y-2">
          {socialAccounts.map((account) => {
            const Icon = platformIconMap[account.platform] || LinkIcon;
            return (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <a
                    href={account.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline"
                  >
                    {account.url}
                  </a>
                </div>
                <div className="flex gap-2">
                  <DialogTrigger asChild> {/* This DialogTrigger is for editing */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => setEditingAccount(account)} // Set account to be edited
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-destructive hover:text-destructive"
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
    </div>
  );
};