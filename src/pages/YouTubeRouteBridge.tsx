import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { findVideoByYoutubeId } from '@/entities/video/video.api';
import { extractYouTubeId } from '@/shared/lib/youtube';

const YouTubeRouteBridge = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const sourceYouTubeUrl = location.pathname.startsWith('/watch')
      ? `https://www.youtube.com/watch${location.search}`
      : `https://www.youtube.com${location.pathname}${location.search}`;

    const youtubeId = extractYouTubeId(sourceYouTubeUrl);

    if (!youtubeId) {
      navigate('/', { replace: true });
      return;
    }

    const resolveDestination = async () => {
      try {
        const existingVideo = await findVideoByYoutubeId(youtubeId);

        if (cancelled) return;

        if (existingVideo?.id) {
          navigate(`/videos/${existingVideo.id}${location.search}`, { replace: true });
          return;
        }

        navigate('/submit', {
          replace: true,
          state: { prefillVideoUrl: sourceYouTubeUrl },
        });
      } catch {
        if (cancelled) return;

        navigate('/submit', {
          replace: true,
          state: { prefillVideoUrl: sourceYouTubeUrl },
        });
      }
    };

    void resolveDestination();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, navigate]);

  return null;
};

export default YouTubeRouteBridge;
