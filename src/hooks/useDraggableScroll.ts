'use client';

import { useRef, useState, useCallback } from 'react';

export function useDraggableScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    setIsDragging(true);
    setStartX(e.pageX - ref.current.offsetLeft);
    setScrollLeft(ref.current.scrollLeft);
    ref.current.style.cursor = 'grabbing';
    ref.current.style.userSelect = 'none';
  }, []);

  const onMouseUp = useCallback(() => {
    if (!ref.current) return;
    setIsDragging(false);
    ref.current.style.cursor = 'grab';
    ref.current.style.removeProperty('user-select');
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !ref.current) return;
      e.preventDefault();
      const x = e.pageX - ref.current.offsetLeft;
      const walk = (x - startX) * 2; // Velocidad de scroll (2x)
      ref.current.scrollLeft = scrollLeft - walk;
    },
    [isDragging, startX, scrollLeft],
  );

  return {
    ref,
    events: {
      onMouseDown,
      onMouseUp,
      onMouseLeave: onMouseUp,
      onMouseMove,
    },
    style: { cursor: 'grab' as const },
  };
}
