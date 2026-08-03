import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('motion.css', () => {
  const motionCssPath = resolve(process.cwd(), 'src/styles/motion.css');
  const layoutPath = resolve(process.cwd(), 'src/app/layout.tsx');

  it('exists and contains global motion styles', () => {
    const css = readFileSync(motionCssPath, 'utf-8');
    expect(css).toContain('scroll-behavior: smooth');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('focus-visible');
  });

  it('disables animations when reduced motion is preferred', () => {
    const css = readFileSync(motionCssPath, 'utf-8');
    const reducedMotionBlock = css.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/
    );
    expect(reducedMotionBlock).toBeTruthy();
    const rules = reducedMotionBlock?.[1] ?? '';
    expect(rules).toMatch(/animation:\s*none/);
    expect(rules).toMatch(/transition:\s*none/);
  });

  it('provides a visible focus outline for interactive elements', () => {
    const css = readFileSync(motionCssPath, 'utf-8');
    expect(css).toContain('2px solid');
    expect(css).toContain('outline');
  });

  it('is imported in the root layout', () => {
    const layout = readFileSync(layoutPath, 'utf-8');
    expect(layout).toMatch(/import\s+['"]\.\.\/styles\/motion\.css['"]/);
  });
});
