// ============================================================================
// 🧪 Tests: Admin Layout Structure — No Nested Aside
// ============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readLayout(): string {
  return readFileSync(resolve(__dirname, '../../app/(admin)/layout.tsx'), 'utf-8');
}

describe('Admin layout structure', () => {
  const content = readLayout();

  it('has exactly one <aside> element total', () => {
    // The layout itself should NOT have an <aside> wrapping <Sidebar>.
    // SidebarView (inside Sidebar.tsx) has its own <aside> but that's in a different file.
    // This file should have zero <aside> elements.
    const asideMatches = content.match(/<aside/g);
    const count = asideMatches ? asideMatches.length : 0;
    expect(count).toBe(0);
  });

  it('does not wrap <Sidebar /> in <aside>', () => {
    expect(content).not.toMatch(/<aside[^>]*>[\s\S]*?<Sidebar/);
  });

  it('wraps sidebar area in a <div>', () => {
    expect(content).toMatch(/<div[^>]*>[\s\S]*?<Sidebar/);
  });
});
