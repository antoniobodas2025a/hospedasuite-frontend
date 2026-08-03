// @vitest-environment jsdom
import '../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

class FakeIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '0px';
  readonly thresholds: readonly number[] = [0];
  private callback: IntersectionObserverCallback;
  private observed: Element[] = [];
  static instances: FakeIntersectionObserver[] = [];

  constructor(callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  unobserve(element: Element) {
    this.observed = this.observed.filter((el) => el !== element);
  }

  disconnect() {
    this.observed = [];
  }

  trigger(isIntersecting: boolean, intersectionRatio = 0) {
    this.callback(
      this.observed.map((target) => ({
        target,
        isIntersecting,
        intersectionRatio,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now(),
      })) as IntersectionObserverEntry[],
      this
    );
  }
}

function TestComponent({ once = false }: { once?: boolean }) {
  const { ref, isIntersecting, hasIntersected } = useIntersectionObserver<HTMLDivElement>({ once });
  return (
    <div>
      <div ref={ref} data-testid="observed" />
      <span data-testid="intersecting">{isIntersecting ? 'true' : 'false'}</span>
      <span data-testid="has-intersected">{hasIntersected ? 'true' : 'false'}</span>
    </div>
  );
}

describe('useIntersectionObserver', () => {
  afterEach(() => {
    vi.clearAllMocks();
    FakeIntersectionObserver.instances = [];
    globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  it('returns false before the element intersects', () => {
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('intersecting').textContent).toBe('false');
  });

  it('returns true when the observed element intersects', () => {
    const { getByTestId } = render(<TestComponent />);
    const instance = FakeIntersectionObserver.instances[0];
    act(() => instance.trigger(true, 0.5));
    expect(getByTestId('intersecting').textContent).toBe('true');
  });

  it('returns false when the element leaves the viewport', () => {
    const { getByTestId } = render(<TestComponent />);
    const instance = FakeIntersectionObserver.instances[0];
    act(() => instance.trigger(true, 0.5));
    act(() => instance.trigger(false, 0));
    expect(getByTestId('intersecting').textContent).toBe('false');
  });

  it('keeps hasIntersected true with once=true even after leaving viewport', () => {
    const { getByTestId } = render(<TestComponent once />);
    const instance = FakeIntersectionObserver.instances[0];
    act(() => instance.trigger(true, 0.5));
    act(() => instance.trigger(false, 0));
    expect(getByTestId('has-intersected').textContent).toBe('true');
    expect(getByTestId('intersecting').textContent).toBe('false');
  });
});
