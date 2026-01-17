import { useState, useRef } from 'react';
import { supabase } from '@/shared/api/supabase/supabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Upload, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  onUploadComplete: (url: string) => void;
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  displayName,
  username,
  onUploadComplete,
}: AvatarUploadProps) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('profile.avatar.invalidType'));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.avatar.fileTooLarge'));
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload file
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

      // Delete old avatar if exists in storage
      if (currentAvatarUrl?.includes('avatars')) {
        const oldPath = currentAvatarUrl.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      onUploadComplete(publicUrl);
      toast.success(t('profile.avatar.uploadSuccess'));
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(t('profile.avatar.uploadError'));
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = () => {
    setPreviewUrl(null);
    onUploadComplete('');
  };

  const displayedUrl = previewUrl || currentAvatarUrl;
  const fallbackChar = displayName?.[0]?.toUpperCase() || username?.[0]?.toUpperCase();

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="w-24 h-24 border-2 border-primary">
          <AvatarImage src={displayedUrl || undefined} alt={displayName || username || 'User'} />
          <AvatarFallback className="bg-primary/20 text-primary text-3xl font-semibold">
            {fallbackChar || <User className="w-12 h-12" />}
          </AvatarFallback>
        </Avatar>
        
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {t('profile.avatar.upload')}
        </Button>

        {displayedUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={isUploading}
          >
            <X className="w-4 h-4 mr-2" />
            {t('profile.avatar.remove')}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {t('profile.avatar.hint')}
      </p>
    </div>
  );
}
