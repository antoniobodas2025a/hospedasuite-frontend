// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import LazySection from '@/components/ota/LazySection';

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

  trigger(isIntersecting: boolean) {
    this.callback(
      this.observed.map((target) => ({
        target,
        isIntersecting,
        intersectionRatio: isIntersecting ? 1 : 0,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now(),
      })) as IntersectionObserverEntry[],
      this
    );
  }
}

afterEach(() => {
  FakeIntersectionObserver.instances = [];
  globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
  vi.clearAllMocks();
});

describe('LazySection', () => {
  it('renders the placeholder when the section is not yet intersecting', () => {
    const { getByTestId, queryByTestId } = render(
      <LazySection placeholder={<div data-testid="placeholder">Loading</div>} rootMargin="200px">
        <div data-testid="content">Heavy content</div>
      </LazySection>
    );

    expect(getByTestId('placeholder')).toBeInTheDocument();
    expect(queryByTestId('content')).not.toBeInTheDocument();
  });

  it('renders children once the section intersects', () => {
    const { getByTestId, queryByTestId } = render(
      <LazySection placeholder={<div data-testid="placeholder">Loading</div>}>
        <div data-testid="content">Heavy content</div>
      </LazySection>
    );

    const instance = FakeIntersectionObserver.instances[0];
    act(() => instance.trigger(true));

    expect(getByTestId('content')).toBeInTheDocument();
    expect(queryByTestId('placeholder')).not.toBeInTheDocument();
  });

  it('keeps children rendered after leaving the viewport when using once=true behavior', () => {
    const { getByTestId } = render(
      <LazySection placeholder={<div data-testid="placeholder">Loading</div>}>
        <div data-testid="content">Heavy content</div>
      </LazySection>
    );

    const instance = FakeIntersectionObserver.instances[0];
    act(() => instance.trigger(true));
    act(() => instance.trigger(false));

    expect(getByTestId('content')).toBeInTheDocument();
  });

  it('applies the provided min-height to reduce CLS while placeholder is visible', () => {
    const { getByTestId } = render(
      <LazySection placeholder={<div data-testid="placeholder">Loading</div>} minHeight="200px">
        <div data-testid="content">Heavy content</div>
      </LazySection>
    );

    const wrapper = getByTestId('placeholder').parentElement;
    expect(wrapper).toHaveStyle('min-height: 200px');
  });
});
