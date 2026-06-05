import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isZooming, setIsZooming] = useState(false);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Check if splash has already been shown in this session
    const hasSeenSplash = sessionStorage.getItem('o2-splash-seen');

    if (prefersReducedMotion || hasSeenSplash === 'true') {
      setIsVisible(false);
      return;
    }

    // Set standard splash seen marker
    sessionStorage.setItem('o2-splash-seen', 'true');

    // Trigger zoom out after draw and glow (1s draw + 0.8s glow = 1.8s)
    const zoomTimer = setTimeout(() => {
      setIsZooming(true);
    }, 1800);

    // Remove from DOM entirely after zoom out finishes (1.8s + 0.6s zoom = 2.4s)
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 2400);

    return () => {
      clearTimeout(zoomTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background text-foreground overflow-hidden pointer-events-none">
      <div className={cn('splash-container flex items-center justify-center', isZooming && 'zoom-out')}>
        {/* Draw a slick play button piercing the screen */}
        <svg
          viewBox="0 0 200 200"
          className="w-32 h-32 md:w-48 md:h-48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* pathLength="1000" forces the path to measure exactly 1000 units, 
              aligning perfectly with stroke-dasharray: 1000 in our CSS */}
          <path
            d="M 65,40 L 155,100 L 65,160 Z"
            pathLength="1000"
            className="splash-path"
          />
        </svg>
      </div>
    </div>
  );
};
