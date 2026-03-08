"use client";

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
  src: string;
  /**
   * Optional blur placeholder image (e.g., very small, low-quality version)
   * Displayed while the high-quality image loads
   */
  blurDataURL?: string;
  /**
   * Intersection Observer options (rootMargin, threshold)
   */
  observerOptions?: IntersectionObserverInit;
  /**
   * Fallback image if original fails to load
   */
  fallbackSrc?: string;
  /**
   * Callback when image finishes loading
   */
  onLoadComplete?: () => void;
  /**
   * Callback when image fails to load
   */
  onErrorOccurred?: (error: Error) => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  fallbackClassName,
  blurDataURL,
  observerOptions = { rootMargin: '50px', threshold: 0.01 },
  fallbackSrc,
  onLoadComplete,
  onErrorOccurred,
  decoding = 'async',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isObserving, setIsObserving] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Set up Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Image entered viewport, start loading
          setImageSrc(src);
          setIsObserving(false);
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    if (containerRef.current && isObserving) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
      observer.disconnect();
    };
  }, [src, isObserving, observerOptions]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoadComplete?.();
  };

  const handleError = () => {
    const errorMsg = `Failed to load image: ${src}`;
    setError(errorMsg);
    onErrorOccurred?.(new Error(errorMsg));

    // Try fallback image if provided
    if (fallbackSrc && imageSrc === src) {
      setImageSrc(fallbackSrc);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden w-full h-full bg-muted", fallbackClassName)}
    >
      {/* Blur placeholder while loading */}
      {blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          aria-hidden="true"
          className={cn(
            "absolute inset-0 w-full h-full object-cover pointer-events-none",
            "filter blur-xl opacity-70"
          )}
          style={{ filter: 'blur(10px)', opacity: 0.7 }}
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && !error && imageSrc && (
        <Skeleton className="absolute inset-0 w-full h-full z-10" />
      )}

      {/* Main image */}
      {imageSrc && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className={cn(
            "transition-opacity duration-500 ease-in-out w-full h-full object-cover",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          decoding={decoding}
          loading="lazy"
          {...props}
        />
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm p-4 text-center">
          <div className="space-y-2">
            <div>⚠️</div>
            <div>Falha ao carregar imagem</div>
            <div className="text-xs opacity-50">{alt}</div>
          </div>
        </div>
      )}
    </div>
  );
};