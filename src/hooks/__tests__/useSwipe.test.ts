// @vitest-environment jsdom
import '../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSwipe from '../useSwipe';

describe('useSwipe', () => {
  let mockOnSwipeLeft: ReturnType<typeof vi.fn>;
  let mockOnSwipeRight: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSwipeLeft = vi.fn();
    mockOnSwipeRight = vi.fn();
  });

  it('returns touch event handlers', () => {
    const { result } = renderHook(() =>
      useSwipe({
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeRight: mockOnSwipeRight,
      })
    );

    expect(result.current.onTouchStart).toBeDefined();
    expect(result.current.onTouchMove).toBeDefined();
    expect(result.current.onTouchEnd).toBeDefined();
  });

  it('detects horizontal swipe left', () => {
    const { result } = renderHook(() =>
      useSwipe({
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeRight: mockOnSwipeRight,
      })
    );

    // Simular touch start
    act(() => {
      result.current.onTouchStart({
        touches: [{ clientX: 200, clientY: 100 }],
      } as any);
    });

    // Simular touch move
    act(() => {
      result.current.onTouchMove({
        touches: [{ clientX: 100, clientY: 100 }],
      } as any);
    });

    // Simular touch end (swipe left de 100px)
    act(() => {
      result.current.onTouchEnd({
        changedTouches: [{ clientX: 100, clientY: 100 }],
      } as any);
    });

    expect(mockOnSwipeLeft).toHaveBeenCalledTimes(1);
    expect(mockOnSwipeRight).not.toHaveBeenCalled();
  });

  it('detects horizontal swipe right', () => {
    const { result } = renderHook(() =>
      useSwipe({
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeRight: mockOnSwipeRight,
      })
    );

    // Simular touch start
    act(() => {
      result.current.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as any);
    });

    // Simular touch move
    act(() => {
      result.current.onTouchMove({
        touches: [{ clientX: 200, clientY: 100 }],
      } as any);
    });

    // Simular touch end (swipe right de 100px)
    act(() => {
      result.current.onTouchEnd({
        changedTouches: [{ clientX: 200, clientY: 100 }],
      } as any);
    });

    expect(mockOnSwipeRight).toHaveBeenCalledTimes(1);
    expect(mockOnSwipeLeft).not.toHaveBeenCalled();
  });

  it('ignores vertical swipes', () => {
    const { result } = renderHook(() =>
      useSwipe({
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeRight: mockOnSwipeRight,
      })
    );

    // Simular touch start
    act(() => {
      result.current.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as any);
    });

    // Simular touch move (vertical)
    act(() => {
      result.current.onTouchMove({
        touches: [{ clientX: 100, clientY: 200 }],
      } as any);
    });

    // Simular touch end
    act(() => {
      result.current.onTouchEnd({
        changedTouches: [{ clientX: 100, clientY: 200 }],
      } as any);
    });

    expect(mockOnSwipeLeft).not.toHaveBeenCalled();
    expect(mockOnSwipeRight).not.toHaveBeenCalled();
  });

  it('ignores short swipes below threshold', () => {
    const { result } = renderHook(() =>
      useSwipe({
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeRight: mockOnSwipeRight,
      })
    );

    // Simular touch start
    act(() => {
      result.current.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as any);
    });

    // Esperar un poco para que deltaTime sea significativo
    const originalDateNow = Date.now;
    let currentTime = 1000;
    Date.now = () => currentTime;

    // Simular touch move (solo 30px, debajo del threshold de 50px)
    currentTime += 200; // 200ms después
    act(() => {
      result.current.onTouchMove({
        touches: [{ clientX: 130, clientY: 100 }],
      } as any);
    });

    // Simular touch end
    currentTime += 100; // 100ms después (total 300ms)
    act(() => {
      result.current.onTouchEnd({
        changedTouches: [{ clientX: 130, clientY: 100 }],
      } as any);
    });

    // Restaurar Date.now
    Date.now = originalDateNow;

    // Velocidad = 30px / 300ms = 0.1px/ms (debajo del threshold de 0.5px/ms)
    // Distancia = 30px (debajo del threshold de 50px)
    // Por lo tanto, NO debería detectar el swipe
    expect(mockOnSwipeLeft).not.toHaveBeenCalled();
    expect(mockOnSwipeRight).not.toHaveBeenCalled();
  });

  it('detects fast swipes even if short distance', () => {
    const { result } = renderHook(() =>
      useSwipe({
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeRight: mockOnSwipeRight,
      })
    );

    // Simular touch start
    act(() => {
      result.current.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as any);
    });

    // Simular touch move (40px pero muy rápido)
    act(() => {
      result.current.onTouchMove({
        touches: [{ clientX: 140, clientY: 100 }],
      } as any);
    });

    // Simular touch end inmediatamente (velocidad alta)
    act(() => {
      result.current.onTouchEnd({
        changedTouches: [{ clientX: 140, clientY: 100 }],
      } as any);
    });

    // Con velocidad alta, debería detectar el swipe
    // (depende de la implementación del threshold de velocidad)
    expect(mockOnSwipeRight).toHaveBeenCalled();
  });

  it('handles missing callbacks gracefully', () => {
    const { result } = renderHook(() => useSwipe({}));

    // No debería lanzar error
    expect(() => {
      act(() => {
        result.current.onTouchStart({
          touches: [{ clientX: 100, clientY: 100 }],
        } as any);
      });

      act(() => {
        result.current.onTouchMove({
          touches: [{ clientX: 200, clientY: 100 }],
        } as any);
      });

      act(() => {
        result.current.onTouchEnd({
          changedTouches: [{ clientX: 200, clientY: 100 }],
        } as any);
      });
    }).not.toThrow();
  });

  it('cleans up refs on touch end', () => {
    const { result } = renderHook(() =>
      useSwipe({
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeRight: mockOnSwipeRight,
      })
    );

    // Primer swipe
    act(() => {
      result.current.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as any);
    });

    act(() => {
      result.current.onTouchMove({
        touches: [{ clientX: 200, clientY: 100 }],
      } as any);
    });

    act(() => {
      result.current.onTouchEnd({
        changedTouches: [{ clientX: 200, clientY: 100 }],
      } as any);
    });

    // Segundo swipe sin touch start (debería ignorarse)
    act(() => {
      result.current.onTouchEnd({
        changedTouches: [{ clientX: 200, clientY: 100 }],
      } as any);
    });

    // Solo debería haber detectado el primer swipe
    expect(mockOnSwipeRight).toHaveBeenCalledTimes(1);
  });
});
