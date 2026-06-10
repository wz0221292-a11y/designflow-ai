'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Tracks mouse position relative to the window and updates a CSS custom property
 * `--mouse-x` and `--mouse-y` on the documentElement for cursor-follow glow effects.
 *
 * Throttled via requestAnimationFrame to stay smooth without jank.
 */
export function useMousePosition() {
  const rafRef = useRef<number>(0);
  const posRef = useRef({ x: -1000, y: -1000 });

  const update = useCallback(() => {
    document.documentElement.style.setProperty('--mouse-x', `${posRef.current.x}px`);
    document.documentElement.style.setProperty('--mouse-y', `${posRef.current.y}px`);
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          update();
          rafRef.current = 0;
        });
      }
    };

    const handleLeave = () => {
      posRef.current = { x: -1000, y: -1000 };
      update();
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    document.addEventListener('mouseleave', handleLeave);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseleave', handleLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [update]);
}
