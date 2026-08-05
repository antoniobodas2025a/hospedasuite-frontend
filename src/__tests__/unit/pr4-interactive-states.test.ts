import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Static contract test for PR4 Motion & Visual Design System.
 *
 * Verifies that every interactive element (button, link, input, select,
 * textarea) inside the PR4-affected components declares either a visible
 * hover state (`hover:`) or a visible focus state (`focus-visible:` /
 * `focus:outline`).  The global focus-visible rules in `src/styles/motion.css`
 * cover the focus ring, so this test ensures the hover side is not forgotten.
 */

const files = [
  'src/components/ota/RoomCard.tsx',
  'src/components/ota/BookingWidget.tsx',
  'src/components/ota/RoomsListWithFilters.tsx',
  'src/components/ota/room-detail/room-detail-gallery.tsx',
  'src/components/ota/InlineDatePicker.tsx',
  'src/components/ota/RoomInfoPanel.tsx',
  'src/components/ui/ProgressIndicator.tsx',
  'src/components/ui/CelebrationAnimation.tsx',
  'src/components/ui/SkeletonLoader.tsx',
];

function isInsideString(
  char: string,
  inString: string | null,
  escaped: boolean
): string | null {
  if (escaped) return inString;
  if (inString) {
    if (char === inString) return null;
    return inString;
  }
  if (char === '"' || char === "'" || char === '`') return char;
  return inString;
}

function extractTagBody(source: string, startIndex: number): string {
  let inString: string | null = null;
  let braceDepth = 0;
  let escaped = false;
  for (let i = startIndex; i < source.length; i++) {
    const char = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    const newInString = isInsideString(char, inString, false);
    if (newInString !== inString) {
      inString = newInString;
      continue;
    }
    if (inString) continue;
    if (char === '{' || char === '(') {
      braceDepth++;
      continue;
    }
    if (char === '}' || char === ')') {
      braceDepth--;
      continue;
    }
    if (char === '>' && braceDepth === 0) {
      return source.slice(startIndex, i + 1);
    }
  }
  return source.slice(startIndex);
}

function extractClassNameValue(tagBody: string): string {
  const idx = tagBody.indexOf('className=');
  if (idx === -1) return '';
  let i = idx + 'className='.length;
  const opener = tagBody[i];
  if (opener === '"' || opener === "'" || opener === '`') {
    i++;
    let escaped = false;
    for (; i < tagBody.length; i++) {
      const char = tagBody[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === opener) {
        return tagBody.slice(idx + 'className='.length + 1, i);
      }
    }
    return '';
  }
  if (opener === '{') {
    i++;
    let braceDepth = 1;
    let escaped = false;
    let inString: string | null = null;
    for (; i < tagBody.length; i++) {
      const char = tagBody[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      const newInString = isInsideString(char, inString, false);
      if (newInString !== inString) {
        inString = newInString;
        continue;
      }
      if (inString) continue;
      if (char === '{') {
        braceDepth++;
        continue;
      }
      if (char === '}') {
        braceDepth--;
        if (braceDepth === 0) {
          return tagBody.slice(idx + 'className='.length + 1, i);
        }
      }
    }
    return '';
  }
  return '';
}

function isHiddenInput(tagBody: string): boolean {
  return /^<input\b/.test(tagBody) && /type=["']hidden["']/.test(tagBody);
}

function hasVisibleHoverOrFocus(className: string): boolean {
  return (
    /hover:/.test(className) ||
    /focus-visible:/.test(className) ||
    /focus:outline/.test(className)
  );
}

describe('PR4 interactive elements have visible hover or focus states', () => {
  files.forEach((relativePath) => {
    it(`verifies ${relativePath}`, () => {
      const filePath = resolve(process.cwd(), relativePath);
      const source = readFileSync(filePath, 'utf-8');

      const tagStartRegex = /<(button|a|input|select|textarea)\b/g;
      const offenders: { line: number; tag: string; className: string }[] = [];

      let match: RegExpExecArray | null;
      while ((match = tagStartRegex.exec(source)) !== null) {
        const tagBody = extractTagBody(source, match.index);
        if (isHiddenInput(tagBody)) continue;

        const className = extractClassNameValue(tagBody);
        if (!hasVisibleHoverOrFocus(className)) {
          const line = source.slice(0, match.index).split('\n').length;
          offenders.push({
            line,
            tag: tagBody.split('\n')[0].slice(0, 120),
            className: className.slice(0, 120),
          });
        }
      }

      expect(offenders).toEqual([]);
    });
  });
});
