/**
 * E2E: Plan Tiers — Readiness Check Visibility
 *
 * Covers task 6.5:
 *   Pro plan:  iCal/OTA + Carta Digital shown as "Opcional"
 *   Starter:   OTA and Pro Features categories hidden
 *
 * Environment:
 *   E2E_PRO_EMAIL / E2E_PRO_PASSWORD      — Pro-tier test account
 *   E2E_STARTER_EMAIL / E2E_STARTER_PASSWORD — Starter-tier test account
 *
 * If credentials are not set, the corresponding test is skipped.
 */
import { test, expect, type Page } from '@playwright/test';

// ─── Credentials ─────────────────────────────────────────────────

const PRO_EMAIL = process.env.E2E_PRO_EMAIL ?? '';
const PRO_PASSWORD = process.env.E2E_PRO_PASSWORD ?? '';
const STARTER_EMAIL = process.env.E2E_STARTER_EMAIL ?? '';
const STARTER_PASSWORD = process.env.E2E_STARTER_PASSWORD ?? '';

// ─── Helpers ─────────────────────────────────────────────────────

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/.*(dashboard|software).*/, { timeout: 15000 });
}

async function goToReadiness(page: Page) {
  await page.goto('/dashboard/readiness');
  await page.waitForLoadState('networkidle');
}

// ─── Pro Plan Scenarios ──────────────────────────────────────────

test.describe('Pro Plan — OTA + Carta Digital visible as Optional (6.5)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!PRO_EMAIL, 'E2E_PRO_EMAIL not set');
    test.skip(!PRO_PASSWORD, 'E2E_PRO_PASSWORD not set');
    await loginAs(page, PRO_EMAIL, PRO_PASSWORD);
    await goToReadiness(page);
  });

  test('OTA category section is present', async ({ page }) => {
    // The OTA category header is an h3 with text "OTA"
    const otaHeading = page.locator('h3').filter({ hasText: /^OTA$/i });
    await expect(otaHeading).toBeVisible({ timeout: 10000 });
  });

  test('Funciones Pro category section is present', async ({ page }) => {
    // The Pro features category header is "FUNCIONES PRO" (capitalized via CSS)
    const proHeading = page.locator('h3').filter({ hasText: /Funciones Pro/i });
    await expect(proHeading).toBeVisible({ timeout: 10000 });
  });

  test('OTA and Carta Digital items display "Opcional" badge', async ({ page }) => {
    // In Pro plan, iCal/OTA and Carta Digital are Optional (not Required)
    // "Opcional" badges should be visible somewhere on the page
    const optionalBadges = page.getByText('Opcional');
    const count = await optionalBadges.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('iCal/OTA item exists with "Opcional" label', async ({ page }) => {
    // The iCal/OTA check item has text about "OTA" or "iCal" in its label
    const otaItem = page.getByText(/OTA|iCal/).first();
    await expect(otaItem).toBeVisible({ timeout: 10000 });

    // Within the OTA category section, find the Optional badge
    // The badge is a span with "Opcional" text next to items
    const otaSection = page.locator('h3').filter({ hasText: /^OTA$/i }).locator('..');
    const optionalInOta = otaSection.locator('..').getByText('Opcional');
    await expect(optionalInOta.first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Starter Plan Scenarios ──────────────────────────────────────

test.describe('Starter Plan — OTA + Carta Digital hidden (6.5)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!STARTER_EMAIL, 'E2E_STARTER_EMAIL not set');
    test.skip(!STARTER_PASSWORD, 'E2E_STARTER_PASSWORD not set');
    await loginAs(page, STARTER_EMAIL, STARTER_PASSWORD);
    await goToReadiness(page);
  });

  test('OTA category section is NOT visible', async ({ page }) => {
    // Starter plan should not render the OTA category heading
    const otaHeading = page.locator('h3').filter({ hasText: /^OTA$/i });
    await expect(otaHeading).not.toBeVisible({ timeout: 5000 });
  });

  test('Funciones Pro category section is NOT visible', async ({ page }) => {
    // Starter plan should not render Pro features category
    const proHeading = page.locator('h3').filter({ hasText: /Funciones Pro/i });
    await expect(proHeading).not.toBeVisible({ timeout: 5000 });
  });

  test('"Opcional" badges are NOT present (Starter has no optional items)', async ({
    page,
  }) => {
    // In Starter, all required items are mandatory; nothing marked Optional
    // Some items could show N/A, but "Opcional" should be absent
    const optionalBadges = page.getByText('Opcional');
    await expect(optionalBadges).toHaveCount(0, { timeout: 5000 });
  });

  test('only basic categories are visible (Hotel, Habitaciones, etc.)', async ({
    page,
  }) => {
    // These core categories should always be present
    const coreCategories = page.locator(
      'h3:has-text("HOTEL"), h3:has-text("HABITACIONES"), h3:has-text("POLÍTICAS")',
    );

    // OTA and Funciones Pro should be absent
    const proCategories = page.locator(
      'h3:has-text("OTA"), h3:has-text("Funciones Pro")',
    );

    const coreCount = await coreCategories.count();
    const proCount = await proCategories.count();

    expect(coreCount).toBeGreaterThanOrEqual(2);
    expect(proCount).toBe(0);
  });
});

// ─── Cross-Tier Regression ──────────────────────────────────────

test.describe('Cross-Plan Consistency', () => {
  test('Pro plan does not show "N/A" on OTA items', async ({ page }) => {
    test.skip(!PRO_EMAIL, 'E2E_PRO_EMAIL not set');
    test.skip(!PRO_PASSWORD, 'E2E_PRO_PASSWORD not set');

    await loginAs(page, PRO_EMAIL, PRO_PASSWORD);
    await goToReadiness(page);

    // In Pro, OTA items should show "Opcional", not "N/A"
    const otaSection = page.locator('h3').filter({ hasText: /^OTA$/i }).locator('..');
    const naBadgeInOta = otaSection.locator('..').getByText('N/A');
    await expect(naBadgeInOta).toHaveCount(0);
  });
});
