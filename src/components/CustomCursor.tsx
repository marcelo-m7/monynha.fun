import React, { useEffect, useRef, useState } from 'react';

export const CustomCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  // Position state to handle the RAF ring delay gracefully
  const mousePos = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });

  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  // We only enable this on devices with a fine pointer (usually a mouse/trackpad)
  const isFinePointer = useRef(
    typeof window !== 'undefined' ? window.matchMedia('(pointer: fine)').matches : false
  );

  // Opt out completely on reduced motion systems
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );

  useEffect(() => {
    if (!isFinePointer.current || prefersReducedMotion.current) return;

    let rafId: number;

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };

      // Update dot immediately
      if (dotRef.current) {
        dotRef.current.style.left = `${e.clientX}px`;
        dotRef.current.style.top = `${e.clientY}px`;
      }

      // Check if hovering over interactive elements
      const target = e.target as HTMLElement;
      const isInteractive = !!target.closest('a, button, [role="button"], input, textarea, select');
      setIsHovering(isInteractive);
    };

    const animateRing = () => {
      // Lerp (Linear Interpolation) for the ring trailing cursor
      // Formula: current = current + (target - current) * smooth_factor
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.15;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.15;

      if (ringRef.current) {
        ringRef.current.style.left = `${ringPos.current.x}px`;
        ringRef.current.style.top = `${ringPos.current.y}px`;
      }

      rafId = requestAnimationFrame(animateRing);
    };

    const onMouseDown = () => setIsClicking(true);
    const onMouseUp = () => setIsClicking(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    
    // Hide default cursor
    document.body.style.cursor = 'none';

    rafId = requestAnimationFrame(animateRing);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(rafId);
      document.body.style.cursor = '';
    };
  }, []);

  if (!isFinePointer.current || prefersReducedMotion.current) return null;

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div
        ref={ringRef}
        className={`cursor-ring transition-colors duration-150 ${isHovering ? 'cursor-hover' : ''} ${
          isClicking ? 'cursor-click' : ''
        }`}
      />
    </>
  );
};
