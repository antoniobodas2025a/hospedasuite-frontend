import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  /** Keep `hasIntersected` true after the first intersection. */
  once?: boolean;
}

interface UseIntersectionObserverResult<T extends HTMLElement> {
  ref: React.RefObject<T | null>;
  isIntersecting: boolean;
  hasIntersected: boolean;
}

/**
 * Generic IntersectionObserver hook for lazy-loading or tracking visibility.
 *
 * @example
 * const { ref, isIntersecting, hasIntersected } = useIntersectionObserver({ rootMargin: '200px', once: true });
 */
export function useIntersectionObserver<T extends HTMLElement>(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverResult<T> {
  const { once, ...observerOptions } = options;
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry?.isIntersecting ?? false;
      setIsIntersecting(visible);
      if (visible) {
        setHasIntersected(true);
      }
    }, observerOptions);

    observer.observe(element);

    return () => observer.disconnect();
  }, [observerOptions]);

  return {
    ref,
    isIntersecting,
    hasIntersected: once ? hasIntersected || isIntersecting : isIntersecting,
  };
}
