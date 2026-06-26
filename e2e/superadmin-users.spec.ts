/**
 * E2E: Superadmin Users Page
 *
 * Covers task 7.2:
 *   - Navigate to /admin/users (superadmin auth)
 *   - Verify table renders with headers
 *   - Test search by email
 *   - Test grant role modal opens
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

/** Navigate to /admin/users after login */
async function goToUsers(page: Page) {
  await page.goto('/admin/users');
  await page.waitForLoadState('networkidle');
}

// ─── Tests ───────────────────────────────────────────────────────

test.describe('Superadmin Users Page (7.2)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToUsers(page);
  });

  test('page renders with heading "Usuarios"', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Usuarios' }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('table headers are present', async ({ page }) => {
    const headers = ['Email', 'Rol', 'Hotel', 'Creado', 'Acciones'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('search by email input is present and functional', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Buscar por email/);
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await searchInput.fill('test@example.com');
    await expect(searchInput).toHaveValue('test@example.com');

    // The "Limpiar" button should appear when there's a search term
    const clearButton = page.getByRole('button', { name: /Limpiar/ });
    await expect(clearButton).toBeVisible({ timeout: 3000 });
  });

  test('"Otorgar Rol" button is visible', async ({ page }) => {
    const grantButton = page.getByRole('button', { name: /Otorgar Rol/ });
    await expect(grantButton).toBeVisible({ timeout: 5000 });
  });

  test('"Crear Superadmin" button is visible', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /Crear Superadmin/ });
    await expect(createButton).toBeVisible({ timeout: 5000 });
  });

  test('grant role modal opens on "Otorgar Rol" click', async ({ page }) => {
    const grantButton = page.getByRole('button', { name: /Otorgar Rol/ });
    await grantButton.click();

    // The GrantRoleModal dialog should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // The dialog should contain the grant form
    const dialogTitle = page.getByRole('heading', { name: /Otorgar|Grant/ });
    await expect(dialogTitle).toBeVisible({ timeout: 3000 });
  });

  test('table renders user rows or empty state', async ({ page }) => {
    const hasTableBody = await page.locator('tbody tr').count();
    const hasEmptyState = await page
      .getByText(/No hay usuarios/)
      .isVisible()
      .catch(() => false);

    expect(hasTableBody > 0 || hasEmptyState).toBeTruthy();
  });
});
