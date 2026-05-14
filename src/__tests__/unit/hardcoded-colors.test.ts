// ============================================================================
// 🧪 Tests: Zero Hardcoded Colors in Dashboard & Layout Components
// Verifies spec requirement: no zinc-*, bg-[#, border-white/, bg-white/, ring-white/
// ============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COMPONENT_DIR = resolve(__dirname, '../../components');

interface FileCheck {
  path: string;
  name: string;
}

const filesUnderTest: FileCheck[] = [
  { path: 'dashboard/DashboardKPIs.tsx', name: 'DashboardKPIs' },
  { path: 'dashboard/DashboardPanel.tsx', name: 'DashboardPanel' },
  { path: 'dashboard/CalendarPanel.tsx', name: 'CalendarPanel' },
  { path: 'dashboard/CheckoutPanel.tsx', name: 'CheckoutPanel' },
  { path: 'dashboard/ReportsPanel.tsx', name: 'ReportsPanel' },
  { path: 'dashboard/HousekeepingPanel.tsx', name: 'HousekeepingPanel' },
  { path: 'dashboard/POSPanel.tsx', name: 'POSPanel' },
  { path: 'dashboard/RoomEditorModal.tsx', name: 'RoomEditorModal' },
  { path: 'dashboard/ForensicBookPanel.tsx', name: 'ForensicBookPanel' },
  { path: 'dashboard/CRMBoard.tsx', name: 'CRMBoard' },
  { path: 'dashboard/GuestsPanel.tsx', name: 'GuestsPanel' },
  { path: 'dashboard/InventoryPanel.tsx', name: 'InventoryPanel' },
  { path: 'dashboard/SettingsPanel.tsx', name: 'SettingsPanel' },
  { path: 'layout/Sidebar.tsx', name: 'Sidebar' },
  { path: 'layout/MobileNav.tsx', name: 'MobileNav' },
];

function readComponent(relativePath: string): string {
  return readFileSync(resolve(COMPONENT_DIR, relativePath), 'utf-8');
}

// Patterns that MUST NOT appear in any component after migration
const FORBIDDEN_PATTERNS = [
  { pattern: /zinc-\d+/g, label: 'zinc-NNN' },
  { pattern: /border-white\//g, label: 'border-white/NN' },
  { pattern: /bg-\[#/g, label: 'bg-[#hex]' },
  { pattern: /bg-white\//g, label: 'bg-white/NN' },
  { pattern: /ring-white\//g, label: 'ring-white/NN' },
  { pattern: /color="zinc"/g, label: 'color="zinc"' },
];

describe('Hardcoded color elimination', () => {
  for (const file of filesUnderTest) {
    describe(`${file.name}.tsx`, () => {
      const content = readComponent(file.path);

      for (const { pattern, label } of FORBIDDEN_PATTERNS) {
        it(`contains no ${label}`, () => {
          const matches = content.match(pattern);
          const matchCount = matches ? matches.length : 0;
          if (matchCount > 0) {
            // Report which lines contain the forbidden pattern for debugging
            const lines = content.split('\n')
              .map((line, i) => ({ line, num: i + 1 }))
              .filter(({ line }) => pattern.test(line))
              .map(({ num, line }) => `  L${num}: ${line.trim()}`)
              .join('\n');
            expect.fail(`${file.name} has ${matchCount} forbidden ${label}:\n${lines}`);
          }
        });
      }
    });
  }
});
