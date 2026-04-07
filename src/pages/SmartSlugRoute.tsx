import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { findVideoByYoutubeId } from '@/entities/video/video.api';
import Profile from './Profile';

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const SmartSlugRoute = () => {
  const { username: slug } = useParams<{ username: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCheckingVideoSlug, setIsCheckingVideoSlug] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!slug || !YOUTUBE_ID_REGEX.test(slug)) {
      setIsCheckingVideoSlug(false);
      return;
    }

    setIsCheckingVideoSlug(true);

    const checkExistingVideo = async () => {
      try {
        const existingVideo = await findVideoByYoutubeId(slug);

        if (cancelled) return;

        if (existingVideo?.id) {
          navigate(`/videos/${existingVideo.id}${location.search}`, { replace: true });
          return;
        }

        setIsCheckingVideoSlug(false);
      } catch {
        if (!cancelled) {
          setIsCheckingVideoSlug(false);
        }
      }
    };

    void checkExistingVideo();

    return () => {
      cancelled = true;
    };
  }, [slug, location.search, navigate]);

  if (isCheckingVideoSlug) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return <Profile />;
};

export default SmartSlugRoute;
