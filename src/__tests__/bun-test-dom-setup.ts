// Bun test setup for DOM environment using jsdom
import { JSDOM } from 'jsdom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

// Expose DOM globals
Object.defineProperty(globalThis, 'document', {
  value: dom.window.document,
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, 'window', {
  value: dom.window,
  writable: true,
  configurable: true,
});
globalThis.navigator = dom.window.navigator;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
globalThis.Text = dom.window.Text;
globalThis.Comment = dom.window.Comment;
globalThis.DocumentFragment = dom.window.DocumentFragment;
globalThis.Element = dom.window.Element;
globalThis.Event = dom.window.Event;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.KeyboardEvent = dom.window.KeyboardEvent;
globalThis.InputEvent = dom.window.InputEvent as unknown as typeof globalThis.InputEvent;
globalThis.FormData = dom.window.FormData as unknown as typeof globalThis.FormData;
globalThis.URL = dom.window.URL;
globalThis.URLSearchParams = dom.window.URLSearchParams;
globalThis.location = dom.window.location;
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.ResizeObserver = dom.window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
globalThis.IntersectionObserver = dom.window.IntersectionObserver || class { observe() {} unobserve() {} disconnect() {} };
globalThis.matchMedia = dom.window.matchMedia?.bind(dom.window) || ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
}));

// Clean up rendered components between tests to avoid DOM state leakage
afterEach(() => cleanup());
