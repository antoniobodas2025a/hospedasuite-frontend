'use client';

import { useRef, useCallback } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

interface SwipeState {
  x: number;
  y: number;
  time: number;
}

/**
 * useSwipe - Hook para detectar gestos de swipe táctil
 * 
 * Características:
 * - Detecta swipes horizontales (izquierda/derecha)
 * - Ignora swipes verticales
 * - Threshold adaptable (distancia O velocidad)
 * - Usa passive listeners para no bloquear scroll
 * - Limpieza automática de refs
 * 
 * Uso:
 * ```tsx
 * const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe({
 *   onSwipeLeft: () => nextImage(),
 *   onSwipeRight: () => prevImage(),
 * });
 * 
 * return (
 *   <div
 *     onTouchStart={onTouchStart}
 *     onTouchMove={onTouchMove}
 *     onTouchEnd={onTouchEnd}
 *   >
 *     <Image src={currentImage} />
 *   </div>
 * );
 * ```
 */
export default function useSwipe({ onSwipeLeft, onSwipeRight }: SwipeHandlers = {}) {
  const touchStart = useRef<SwipeState | null>(null);
  const touchMove = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent | TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    touchMove.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (!touchStart.current || !touchMove.current) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;
    
    // Calcular velocidad en px/ms
    const velocity = Math.abs(deltaX) / deltaTime;

    // Determinar si es un swipe horizontal
    // Condición 1: Más horizontal que vertical
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    
    // Condición 2: Distancia suficiente (>50px) O velocidad alta (>0.5px/ms)
    const isSignificant = Math.abs(deltaX) > 50 || velocity > 0.5;

    if (isHorizontal && isSignificant) {
      if (deltaX < 0) {
        // Swipe left → siguiente
        onSwipeLeft?.();
      } else {
        // Swipe right → anterior
        onSwipeRight?.();
      }
    }

    // Limpiar refs
    touchStart.current = null;
    touchMove.current = null;
  }, [onSwipeLeft, onSwipeRight]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
