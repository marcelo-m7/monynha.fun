import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getCroppedImg } from '@/lib/image';
import { Crop, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AvatarCropperDialogProps {
  imageSrc: string;
  open: boolean;
  onClose: () => void;
  onCropComplete: (croppedImageBlob: Blob) => void;
}

export function AvatarCropperDialog({ imageSrc, open, onClose, onCropComplete }: AvatarCropperDialogProps) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number[]) => {
    setZoom(zoom[0]);
  }, []);

  const onRotationChange = useCallback((rotation: number[]) => {
    setRotation(rotation[0]);
  }, []);

  const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCroppedImage = useCallback(async () => {
    if (!croppedAreaPixels) {
      toast.error(t('profile.avatar.cropError'));
      return;
    }
    setIsCropping(true);
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
      );
      if (croppedImage) {
        onCropComplete(croppedImage);
        onClose();
      } else {
        toast.error(t('profile.avatar.cropError'));
      }
    } catch (e) {
      console.error('Error cropping image:', e);
      toast.error(t('profile.avatar.cropError'));
    } finally {
      setIsCropping(false);
    }
  }, [imageSrc, croppedAreaPixels, rotation, onCropComplete, onClose, t]);

  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    setIsCropping(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl flex flex-col h-[90vh] max-h-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-5 h-5" />
            {t('profile.avatar.cropTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('profile.avatar.cropDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex-1 bg-muted rounded-md overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1} // Square aspect ratio for avatars
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onRotationChange={onRotationChange}
            onCropComplete={onCropCompleteCallback}
            cropShape="round" // Make it round for avatars
            showGrid={false}
            restrictPosition={false}
          />
        </div>

        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-4">
            <Label className="w-12 text-right text-sm text-muted-foreground">{t('profile.avatar.zoom')}</Label>
            <Slider
              min={1}
              max={3}
              step={0.1}
              value={[zoom]}
              onValueChange={onZoomChange}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-4">
            <Label className="w-12 text-right text-sm text-muted-foreground">{t('profile.avatar.rotate')}</Label>
            <Slider
              min={0}
              max={360}
              step={1}
              value={[rotation]}
              onValueChange={onRotationChange}
              className="flex-1"
            />
            <Button variant="outline" size="icon" onClick={() => setRotation(0)} className="shrink-0">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={handleClose} disabled={isCropping}>
            {t('common.cancel')}
          </Button>
          <Button onClick={showCroppedImage} disabled={isCropping}>
            {isCropping ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Crop className="w-4 h-4 mr-2" />
            )}
            {t('profile.avatar.cropAndUpload')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}