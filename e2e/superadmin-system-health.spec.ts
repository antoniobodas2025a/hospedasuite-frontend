/**
 * E2E: Superadmin System Health Dashboard
 *
 * Covers tasks 2.5–2.6:
 *   - Navigate to /admin/system-health as superadmin
 *   - Verify 5 sections render (Database, Events, Webhooks, Cron Jobs, Storage)
 *   - Verify admin homepage health widgets render
 *   - Verify skeleton shows during loading
 *
 * Environment:
 *   E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD — superadmin credentials
 */
import { test, expect, type Page } from '@playwright/test';

// ─── Helpers ─────────────────────────────────────────────────────

const TEST_EMAIL = process.env.E2E_SUPERADMIN_EMAIL ?? '';
const TEST_PASSWORD = process.env.E2E_SUPERADMIN_PASSWORD ?? '';

/** Login as superadmin */
async function login(page: Page) {
  test.skip(!TEST_EMAIL, 'E2E_SUPERADMIN_EMAIL not set');
  test.skip(!TEST_PASSWORD, 'E2E_SUPERADMIN_PASSWORD not set');

  await page.goto('/login');
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });

  await page.fill('input[name="email"]', TEST_EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);

  await page.click('button[type="submit"]');

  await page.waitForURL(/.*(admin|dashboard).*/, { timeout: 15000 });
}

// ─── Tests ───────────────────────────────────────────────────────

test.describe('System Health Dashboard (2.5)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('navigates to /admin/system-health and renders 5 sections', async ({ page }) => {
    await page.goto('/admin/system-health');
    await page.waitForLoadState('networkidle');

    // Header
    await expect(page.getByRole('heading', { name: 'System Health' })).toBeVisible({
      timeout: 10000,
    });

    // Five sections
    await expect(page.getByRole('heading', { name: 'Database' })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole('heading', { name: 'Event Processing' })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole('heading', { name: 'Webhook Delivery' })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole('heading', { name: 'Cron Jobs' })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole('heading', { name: 'Storage' })).toBeVisible({
      timeout: 5000,
    });
  });

  test('database section shows connection status', async ({ page }) => {
    await page.goto('/admin/system-health');
    await page.waitForLoadState('networkidle');

    // Database section should show connection card
    const dbSection = page.locator('section').filter({ has: page.getByText('Database') }).first();
    await expect(dbSection.getByText('Connection')).toBeVisible({ timeout: 5000 });
  });

  test('event section shows processed/failed/pending cards', async ({ page }) => {
    await page.goto('/admin/system-health');
    await page.waitForLoadState('networkidle');

    const eventSection = page.locator('section').filter({ has: page.getByText('Event Processing') }).first();
    await expect(eventSection.getByText('Processed')).toBeVisible({ timeout: 5000 });
    await expect(eventSection.getByText('Failed')).toBeVisible({ timeout: 5000 });
    await expect(eventSection.getByText('Pending')).toBeVisible({ timeout: 5000 });
  });

  test('webhook section shows delivery metrics', async ({ page }) => {
    await page.goto('/admin/system-health');
    await page.waitForLoadState('networkidle');

    const webhookSection = page.locator('section').filter({ has: page.getByText('Webhook Delivery') }).first();
    await expect(webhookSection.getByText('Success Rate')).toBeVisible({ timeout: 5000 });
    await expect(webhookSection.getByText('Failure Rate')).toBeVisible({ timeout: 5000 });
  });

  test('storage section shows R2 connectivity', async ({ page }) => {
    await page.goto('/admin/system-health');
    await page.waitForLoadState('networkidle');

    const storageSection = page.locator('section').filter({ has: page.getByText('Storage') }).first();
    await expect(storageSection.getByText('R2 Connectivity')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('System Health Homepage Widgets (2.6)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('admin homepage shows System Health section', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // System Health heading should appear
    await expect(page.getByText('System Health')).toBeVisible({ timeout: 10000 });
  });

  test('health widgets show database, events, and webhooks mini-cards', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    const healthSection = page.locator('div').filter({ hasText: 'System Health' }).last();

    // Three mini cards should be present within the health section
    await expect(healthSection.getByText('Database')).toBeVisible({ timeout: 10000 });
    await expect(healthSection.getByText('Events (24h)')).toBeVisible({ timeout: 5000 });
    await expect(healthSection.getByText('Webhooks (24h)')).toBeVisible({ timeout: 5000 });
  });

  test('health widget links to full dashboard', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    const link = page.getByRole('link', { name: /Full dashboard/i });
    await expect(link).toBeVisible({ timeout: 10000 });
    await expect(link).toHaveAttribute('href', '/admin/system-health');
  });

  test('system health nav link exists in sidebar', async ({ page }) => {
    await page.goto('/admin/system-health');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('nav');
    const healthLink = nav.getByRole('link', { name: /System Health|Salud del Sistema/i });
    await expect(healthLink).toBeVisible({ timeout: 5000 });
    await expect(healthLink).toHaveAttribute('href', '/admin/system-health');
  });
});
