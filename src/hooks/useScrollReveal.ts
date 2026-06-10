'use client';

import { useEffect, useRef } from 'react';

/**
 * Intersection Observer hook that adds `is-visible` class when elements
 * with `.reveal`, `.reveal-up`, `.reveal-scale`, or `.stagger-children`
 * enter the viewport.
 *
 * Each element is observed only once (unobserved after triggering).
 */
export function useScrollReveal() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observerRef.current?.unobserve(entry.target);
          }
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const selectors = '.reveal, .reveal-up, .reveal-scale, .stagger-children';
    const elements = document.querySelectorAll(selectors);

    for (const el of elements) {
      observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  /**
   * Call after dynamic content renders to pick up new reveal elements.
   */
  const refresh = () => {
    if (!observerRef.current) return;
    const selectors = '.reveal, .reveal-up, .reveal-scale, .stagger-children';
    const elements = document.querySelectorAll(selectors);
    for (const el of elements) {
      observerRef.current.observe(el);
    }
  };

  return { refresh };
}
