/**
 * E2E: Superadmin Dashboard
 *
 * Covers task 7.3:
 *   - Navigate to /admin (superadmin auth)
 *   - Verify metric cards render
 *   - Verify quick action links work
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

/** Navigate to /admin */
async function goToDashboard(page: Page) {
  await page.goto('/admin');
  await page.waitForLoadState('networkidle');
}

// ─── Tests ───────────────────────────────────────────────────────

test.describe('Superadmin Dashboard (7.3)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToDashboard(page);
  });

  test('page renders with heading "Centro de Comando"', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Centro de Comando' }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('financial metric cards are visible', async ({ page }) => {
    // MRR card
    await expect(page.getByText('MRR (Suscripciones Base)')).toBeVisible({
      timeout: 5000,
    });

    // Comisiones card
    await expect(page.getByText('Comisiones Channel')).toBeVisible({
      timeout: 5000,
    });

    // Total expected card
    await expect(page.getByText('Corte Mensual Esperado')).toBeVisible({
      timeout: 5000,
    });
  });

  test('subscription health metric cards are visible', async ({ page }) => {
    // Trial expiring card
    await expect(page.getByText('Pruebas por Vencer')).toBeVisible({
      timeout: 5000,
    });

    // Churn rate card
    await expect(page.getByText('Tasa de Churn')).toBeVisible({
      timeout: 5000,
    });

    // Past due card
    await expect(page.getByText('Pagos Vencidos')).toBeVisible({
      timeout: 5000,
    });

    // Cancelled card
    await expect(page.getByText('Canceladas')).toBeVisible({
      timeout: 5000,
    });
  });

  test('quick actions section is visible', async ({ page }) => {
    await expect(page.getByText('Acciones Rápidas')).toBeVisible({
      timeout: 5000,
    });

    // Suscripciones link
    const subscriptionsLink = page.getByRole('link', { name: /Suscripciones/ });
    await expect(subscriptionsLink).toBeVisible({ timeout: 5000 });
    await expect(subscriptionsLink).toHaveAttribute('href', '/admin/subscriptions');

    // Usuarios link
    const usersLink = page.getByRole('link', { name: /Usuarios/ });
    await expect(usersLink).toBeVisible({ timeout: 5000 });
    await expect(usersLink).toHaveAttribute('href', '/admin/users');
  });

  test('sidebar nav links for subscriptions and users are present', async ({ page }) => {
    // Check the sidebar nav contains the new links
    const nav = page.locator('nav');

    // Suscripciones link in sidebar
    const subsNavLink = nav.getByRole('link', { name: /Suscripciones/ });
    await expect(subsNavLink).toBeVisible({ timeout: 5000 });
    await expect(subsNavLink).toHaveAttribute('href', '/admin/subscriptions');

    // Usuarios link in sidebar
    const usersNavLink = nav.getByRole('link', { name: /Usuarios/ });
    await expect(usersNavLink).toBeVisible({ timeout: 5000 });
    await expect(usersNavLink).toHaveAttribute('href', '/admin/users');
  });

  test('"Alta Rápida de Propiedad" section renders', async ({ page }) => {
    await expect(
      page.getByText('Alta Rápida de Propiedad'),
    ).toBeVisible({ timeout: 5000 });
  });

  test('"Propiedades Registradas y Libro Mayor" section renders', async ({ page }) => {
    await expect(
      page.getByText('Propiedades Registradas y Libro Mayor'),
    ).toBeVisible({ timeout: 5000 });
  });
});
