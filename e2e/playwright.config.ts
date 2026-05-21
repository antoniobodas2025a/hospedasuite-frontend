import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration — HospedaSuite
 *
 * Tests run against production (https://www.hospedasuite.com).
 * No webServer needed because the target is the live deployment.
 *
 * Environment variables required:
 *   E2E_TEST_EMAIL    — login email for test account
 *   E2E_TEST_PASSWORD — login password for test account
 *
 * Plan-tier tests (plan-tiers.spec.ts) optionally use:
 *   E2E_PRO_EMAIL / E2E_PRO_PASSWORD
 *   E2E_STARTER_EMAIL / E2E_STARTER_PASSWORD
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: 'https://www.hospedasuite.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
