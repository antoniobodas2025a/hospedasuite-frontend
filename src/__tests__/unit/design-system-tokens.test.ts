// ============================================================================
// 🧪 Tests: Design System Token Correctness
// Verifies globals.css :root/.dark token assignment follows Tailwind/shadcn convention
// ============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readGlobalsCSS(): string {
  return readFileSync(resolve(__dirname, '../../app/globals.css'), 'utf-8');
}

/**
 * Extract the content between a selector's opening brace and its closing brace.
 * Handles nested blocks (ignores them for this simple extraction).
 */
function extractBlock(css: string, selectorPattern: RegExp): string {
  const match = css.match(selectorPattern);
  if (!match) return '';
  const startIndex = match.index! + match[0].length;
  // Find matching closing brace
  let depth = 1;
  let i = startIndex;
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') depth--;
    i++;
  }
  return css.slice(startIndex, i - 1);
}

describe('globals.css token assignment', () => {
  const css = readGlobalsCSS();

  const rootBlock = extractBlock(css, /:root\s*\{/);
  const darkBlock = extractBlock(css, /\.dark\s*\{/);
  const layerRootBlock = extractBlock(css, /@layer\s+base\s*\{[^}]*:root\s*\{/);

  // =========================================================================
  // RED tests — currently FAIL because :root has dark tokens and .dark has light tokens
  // After the fix (swap), these should PASS

  it(':root block defines light background', () => {
    // Light background is ~white — oklch lightness ≥ 0.90
    const bgMatch = rootBlock.match(/--background:\s*oklch\(([\d.]+)/);
    expect(bgMatch).not.toBeNull();
    const lightness = parseFloat(bgMatch![1]);
    expect(lightness).toBeGreaterThanOrEqual(0.90);
  });

  it(':root block defines dark foreground', () => {
    // Dark foreground (text on light bg) — oklch lightness ≤ 0.40
    const fgMatch = rootBlock.match(/--foreground:\s*oklch\(([\d.]+)/);
    expect(fgMatch).not.toBeNull();
    const lightness = parseFloat(fgMatch![1]);
    expect(lightness).toBeLessThanOrEqual(0.40);
  });

  it('.dark block defines dark background', () => {
    const bgMatch = darkBlock.match(/--background:\s*oklch\(([\d.]+)/);
    expect(bgMatch).not.toBeNull();
    const lightness = parseFloat(bgMatch![1]);
    expect(lightness).toBeLessThanOrEqual(0.25);
  });

  it('.dark block defines light foreground', () => {
    const fgMatch = darkBlock.match(/--foreground:\s*oklch\(([\d.]+)/);
    expect(fgMatch).not.toBeNull();
    const lightness = parseFloat(fgMatch![1]);
    expect(lightness).toBeGreaterThanOrEqual(0.90);
  });

  // =========================================================================
  // Layer cleanup tests

  it('@layer base :root does not override --background', () => {
    expect(layerRootBlock).not.toContain('--background:');
  });

  it('@layer base :root does not override --foreground', () => {
    expect(layerRootBlock).not.toContain('--foreground:');
  });
});
