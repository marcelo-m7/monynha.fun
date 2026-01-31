import { useState, useRef, useCallback } from 'react';
import { incrementVideoViewCount } from '@/entities/video/video.api';

const SESSION_STORAGE_KEY = 'video-vault-session-id';

const getStoredSessionId = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(SESSION_STORAGE_KEY);
};

const createSessionId = () => {
  if (typeof window === 'undefined') return null;
  if (typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

/**
 * Custom hook to handle video view count increment with optimistic UI
 * @param initialViewCount - Initial view count for the video
 * @param animationDuration - Duration in ms for the +1 animation (default: 700ms)
 * @returns Object containing viewCount, showPlus indicator, and handleViewIncrement function
 */
export function useVideoViewIncrement(initialViewCount: number, animationDuration: number = 700) {
  const [viewCount, setViewCount] = useState<number>(initialViewCount);
  const [showPlus, setShowPlus] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const resolveSessionId = useCallback(() => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const existing = getStoredSessionId();
    if (existing) {
      sessionIdRef.current = existing;
      return existing;
    }
    const created = createSessionId();
    if (created) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, created);
    }
    sessionIdRef.current = created;
    return created;
  }, []);

  const handleViewIncrement = useCallback(async (videoId: string) => {
    const sessionId = resolveSessionId();

    // Clear any existing timeout to prevent memory leaks
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Optimistic UI: increment local counter and show +1 animation
    setViewCount((v) => v + 1);
    setShowPlus(true);
    timeoutRef.current = setTimeout(() => {
      setShowPlus(false);
      timeoutRef.current = null;
    }, animationDuration);

    // Fire-and-forget: increment on the server (atomic in DB function)
    incrementVideoViewCount(videoId, sessionId).then((result) => {
      if (typeof result.data === 'number') {
        setViewCount(result.data);
      }
    }).catch(() => {
      // Ignore errors - view count is not critical for UX
    });
  }, [animationDuration, resolveSessionId]);

  return { viewCount, showPlus, handleViewIncrement };
}
