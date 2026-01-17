import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { markTopVideosAsFeatured } from '@/entities/video/video.api';
import { videoKeys } from '@/entities/video/video.keys';

interface MarkFeaturedButtonProps {
  limit?: number;
}

export function MarkFeaturedButton({ limit = 4 }: MarkFeaturedButtonProps) {
  const queryClient = useQueryClient();

  const handleClick = async () => {
    try {
      await markTopVideosAsFeatured(limit);
      queryClient.invalidateQueries({ queryKey: videoKeys.all });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      Mark top
    </Button>
  );
}
