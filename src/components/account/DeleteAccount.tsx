import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2, Trash2, HeartCrack } from 'lucide-react';
import { toast } from 'sonner';
import { deleteUserAccount } from '@/features/auth/auth.api';
import { useAuth } from '@/features/auth/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const DeleteAccount: React.FC = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const CONFIRMATION_TEXT = 'DELETE';

  const handleDelete = async () => {
    if (confirmText !== CONFIRMATION_TEXT) {
      toast.error(t('account.settings.deleteAccount.error.confirmationMismatch'));
      return;
    }

    setIsDeleting(true);

    try {
      const { error } = await deleteUserAccount();

      if (error) {
        toast.error(t('account.settings.deleteAccount.error.failed'), {
          description: error.message,
        });
        setIsDeleting(false);
        return;
      }

      toast.success(t('account.settings.deleteAccount.success.deleted'), {
        description: t('account.settings.deleteAccount.success.goodbye'),
      });

      // Sign out and redirect to home
      await signOut();
      navigate('/');
    } catch (err) {
      toast.error(t('auth.error.genericAuthError'), {
        description: err instanceof Error ? err.message : String(err),
      });
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {t('account.settings.deleteAccount.title')}
          </CardTitle>
          <CardDescription>
            {t('account.settings.deleteAccount.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('account.settings.deleteAccount.warning')}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('account.settings.deleteAccount.consequences.title')}
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>{t('account.settings.deleteAccount.consequences.data')}</li>
              <li>{t('account.settings.deleteAccount.consequences.videos')}</li>
              <li>{t('account.settings.deleteAccount.consequences.playlists')}</li>
              <li>{t('account.settings.deleteAccount.consequences.favorites')}</li>
              <li>{t('account.settings.deleteAccount.consequences.irreversible')}</li>
            </ul>
          </div>

          <Button
            variant="destructive"
            onClick={() => setShowDialog(true)}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t('account.settings.deleteAccount.button')}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <HeartCrack className="w-6 h-6 text-destructive" />
              {t('account.settings.deleteAccount.dialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-4">
              <p className="text-base font-medium">
                {t('account.settings.deleteAccount.dialog.playfulMessage')}
              </p>
              
              <p className="text-sm">
                {t('account.settings.deleteAccount.dialog.reallyConfirm')}
              </p>

              <div className="space-y-2">
                <Label htmlFor="confirm-delete">
                  {t('account.settings.deleteAccount.dialog.typeToConfirm', { text: CONFIRMATION_TEXT })}
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRMATION_TEXT}
                  className="font-mono"
                  autoComplete="off"
                />
              </div>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t('account.settings.deleteAccount.dialog.finalWarning')}
                </AlertDescription>
              </Alert>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={confirmText !== CONFIRMATION_TEXT || isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('account.settings.deleteAccount.dialog.deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('account.settings.deleteAccount.dialog.confirm')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
