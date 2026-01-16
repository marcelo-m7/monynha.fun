import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, X, Shield, Eye, Loader2 } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  PlaylistCollaborator,
  usePlaylistCollaborators,
  useAddCollaborator,
  useUpdateCollaboratorRole,
  useRemoveCollaborator,
} from '@/hooks/usePlaylists';

interface PlaylistCollaboratorsDialogProps {
  playlistId: string;
  isAuthor: boolean;
}

export function PlaylistCollaboratorsDialog({ playlistId, isAuthor }: PlaylistCollaboratorsDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  const { data: collaborators, isLoading } = usePlaylistCollaborators(playlistId);
  const addMutation = useAddCollaborator();
  const updateRoleMutation = useUpdateCollaboratorRole();
  const removeMutation = useRemoveCollaborator();

  const handleAddCollaborator = async () => {
    if (!username.trim()) return;

    setSearchLoading(true);
    try {
      // Find user by username
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', username.trim())
        .single();

      if (error || !profile) {
        toast.error(t('playlistDetails.collaborators.userNotFound'));
        return;
      }

      // Check if already a collaborator
      if (collaborators?.some(c => c.user_id === profile.id)) {
        toast.error(t('playlistDetails.collaborators.alreadyAdded'));
        return;
      }

      await addMutation.mutateAsync({
        playlistId,
        userId: profile.id,
        role: 'editor',
      });

      toast.success(t('playlistDetails.collaborators.addedSuccess'));
      setUsername('');
    } catch (error) {
      toast.error(t('playlistDetails.collaborators.addError'));
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: 'editor' | 'viewer') => {
    try {
      await updateRoleMutation.mutateAsync({ playlistId, userId, role });
      toast.success(t('playlistDetails.collaborators.roleUpdated'));
    } catch (error) {
      toast.error(t('playlistDetails.collaborators.roleUpdateError'));
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeMutation.mutateAsync({ playlistId, userId });
      toast.success(t('playlistDetails.collaborators.removed'));
    } catch (error) {
      toast.error(t('playlistDetails.collaborators.removeError'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="w-4 h-4" />
          {t('playlistDetails.collaborators.manage')}
          {collaborators && collaborators.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
              {collaborators.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('playlistDetails.collaborators.title')}
          </DialogTitle>
          <DialogDescription>
            {t('playlistDetails.collaborators.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Add collaborator form (author only) */}
        {isAuthor && (
          <div className="flex gap-2 mb-4">
            <Input
              placeholder={t('playlistDetails.collaborators.usernamePlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCollaborator()}
            />
            <Button
              onClick={handleAddCollaborator}
              disabled={searchLoading || !username.trim()}
              size="icon"
            >
              {searchLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}

        {/* Collaborators list */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : collaborators && collaborators.length > 0 ? (
            collaborators.map((collab) => (
              <div
                key={collab.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={collab.profile?.avatar_url || ''} />
                    <AvatarFallback>
                      {collab.profile?.username?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {collab.profile?.display_name || collab.profile?.username || t('common.anonymous')}
                    </p>
                    {collab.profile?.username && (
                      <p className="text-xs text-muted-foreground">@{collab.profile.username}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAuthor ? (
                    <>
                      <Select
                        value={collab.role}
                        onValueChange={(value: 'editor' | 'viewer') => handleRoleChange(collab.user_id, value)}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" /> {t('playlistDetails.collaborators.roleEditor')}
                            </span>
                          </SelectItem>
                          <SelectItem value="viewer">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {t('playlistDetails.collaborators.roleViewer')}
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemove(collab.user_id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {collab.role === 'editor' ? (
                        <>
                          <Shield className="w-3 h-3" /> {t('playlistDetails.collaborators.roleEditor')}
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" /> {t('playlistDetails.collaborators.roleViewer')}
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              {t('playlistDetails.collaborators.noCollaborators')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}