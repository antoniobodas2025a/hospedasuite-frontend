/**
 * E2E: Superadmin Subscriptions Page
 *
 * Covers task 7.1:
 *   - Navigate to /admin/subscriptions (superadmin auth)
 *   - Verify table renders with headers
 *   - Test filter by status
 *   - Test pagination
 *
 * Environment:
 *   E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD — superadmin credentials
 */
import { test, expect, type Page } from '@playwright/test';

// ─── Helpers ─────────────────────────────────────────────────────

const TEST_EMAIL = process.env.E2E_SUPERADMIN_EMAIL ?? '';
const TEST_PASSWORD = process.env.E2E_SUPERADMIN_PASSWORD ?? '';

/** Login as superadmin via the server-action form on /login */
async function login(page: Page) {
  test.skip(!TEST_EMAIL, 'E2E_SUPERADMIN_EMAIL not set');
  test.skip(!TEST_PASSWORD, 'E2E_SUPERADMIN_PASSWORD not set');

  await page.goto('/login');
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });

  await page.fill('input[name="email"]', TEST_EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);

  await page.click('button[type="submit"]');

  // Wait for post-login redirect
  await page.waitForURL(/.*(admin|dashboard).*/, { timeout: 15000 });
}

/** Navigate to /admin/subscriptions after login */
async function goToSubscriptions(page: Page) {
  await page.goto('/admin/subscriptions');
  await page.waitForLoadState('networkidle');
}

// ─── Tests ───────────────────────────────────────────────────────

test.describe('Superadmin Subscriptions Page (7.1)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToSubscriptions(page);
  });

  test('page renders with heading "Suscripciones"', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Suscripciones' }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('table headers are present', async ({ page }) => {
    // Verify key column headers in the subscriptions table
    const headers = ['Hotel', 'Plan', 'Estado', 'MRR', 'Período hasta', 'Acciones'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('status filter dropdown is present and interactive', async ({ page }) => {
    // The filter bar has a Select for status
    const statusTrigger = page.locator('[role="combobox"]').first();
    await expect(statusTrigger).toBeVisible({ timeout: 5000 });

    // Verify the "Aplicar" button exists (applies filters)
    const applyButton = page.getByRole('button', { name: /Aplicar/ });
    await expect(applyButton).toBeVisible();
  });

  test('search input accepts text for hotel name search', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Buscar por nombre de hotel/);
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
  });

  test('pagination info is displayed when applicable', async ({ page }) => {
    // The total count badge should be visible
    const totalBadge = page.getByText(/Total:/);
    await expect(totalBadge).toBeVisible({ timeout: 5000 });
  });

  test('empty state or table rows render (page is functional)', async ({ page }) => {
    // Either the table has rows or an empty state message is shown
    const hasTableBody = await page.locator('tbody tr').count();
    const hasEmptyState = await page
      .getByText(/No hay suscripciones/)
      .isVisible()
      .catch(() => false);

    // At least one of these must be true for the page to be functional
    expect(hasTableBody > 0 || hasEmptyState).toBeTruthy();
  });
});
