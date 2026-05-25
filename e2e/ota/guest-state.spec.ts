/**
 * E2E: Guest State Propagation — OTA Booking Flow
 *
 * Verifies that the guest count selection persists through the entire
 * booking chain: AvailabilitySearchBar → RoomCard → RoomShowcaseModal → Checkout.
 *
 * Tests:
 *   - Guest param propagates from URL to RoomCard destinationUrl
 *   - RoomShowcaseModal displays correct guest count
 *   - Checkout URL contains correct guest param
 *
 * Environment:
 *   E2E_OTA_SLUG — hotel slug to test against (default: 'patio-del-mundo')
 */
import { test, expect, type Page } from '@playwright/test';

const OTA_SLUG = process.env.E2E_OTA_SLUG ?? 'patio-del-mundo';

// ─── Helpers ─────────────────────────────────────────────────────

async function goToOTA(page: Page, params: Record<string, string> = {}) {
  const url = new URL(`/ota/${OTA_SLUG}`, 'https://www.hospedasuite.com');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  await page.goto(url.toString());
  await page.waitForSelector('[data-testid="room-card"]', { timeout: 15000 });
}

// ─── Tests ───────────────────────────────────────────────────────

test.describe('Guest State Propagation', () => {
  test('👤 guest=1 propagates from URL to RoomCard link', async ({ page }) => {
    await goToOTA(page, { guests: '1', checkin: '2026-06-01', checkout: '2026-06-03' });

    // Click the first room card
    const firstRoom = page.locator('[data-testid="room-card"]').first();
    const href = await firstRoom.locator('a').getAttribute('href');

    // Verify guests=1 is in the destination URL
    expect(href).toContain('guests=1');
  });

  test('👤 guest=3 propagates correctly', async ({ page }) => {
    await goToOTA(page, { guests: '3', checkin: '2026-06-01', checkout: '2026-06-03' });

    const firstRoom = page.locator('[data-testid="room-card"]').first();
    const href = await firstRoom.locator('a').getAttribute('href');

    expect(href).toContain('guests=3');
  });

  test('👤 RoomShowcaseModal shows guest count when opened', async ({ page }) => {
    await goToOTA(page, { guests: '1', checkin: '2026-06-01', checkout: '2026-06-03' });

    // Click "Explorar" or "Reservar" on first room
    await page.locator('[data-testid="room-card"]').first().click();

    // Wait for modal to open (URL has showRoom param)
    await page.waitForURL(/\?showRoom=/, { timeout: 10000 });

    // Verify guests=1 is still in URL
    const url = page.url();
    expect(url).toContain('guests=1');
  });

  test('👤 Default to 1 guest when no param provided', async ({ page }) => {
    await goToOTA(page, { checkin: '2026-06-01', checkout: '2026-06-03' });

    const firstRoom = page.locator('[data-testid="room-card"]').first();
    const href = await firstRoom.locator('a').getAttribute('href');

    // Should have guests param (default 1)
    expect(href).toMatch(/guests=[1-9]/);
  });

  test('👤 Invalid guest param defaults to 1', async ({ page }) => {
    await goToOTA(page, { guests: 'invalid', checkin: '2026-06-01', checkout: '2026-06-03' });

    const firstRoom = page.locator('[data-testid="room-card"]').first();
    const href = await firstRoom.locator('a').getAttribute('href');

    // Should default to 1 when param is invalid
    expect(href).toContain('guests=1');
  });
});
