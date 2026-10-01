import { test, expect } from '@playwright/test';
import { checkA11y } from './support/axe';

/**
 * Authenticated smoke coverage. Uses the warm session from global-setup, so the
 * user is already logged in with a working office selected.
 *
 * This is the template Claude Code (via the Playwright MCP) extends into the
 * full 37-workflow suite from docs/qa/DentC_E2E_Test_Workflows.html:
 * patient search -> chart -> add procedure -> progress note, etc.
 */
test.describe('Authenticated smoke', () => {
  test('dashboard loads without uncaught errors, is accessible, and is visually stable', async ({
    page,
  }, testInfo) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (e) => pageErrors.push(e));

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    // Bounded: the app polls on intervals, so true network-idle may never fire.
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // No uncaught exceptions during load/hydration.
    expect(pageErrors, pageErrors.map((e) => e.message).join('\n')).toHaveLength(0);

    // Accessibility (color-contrast excluded for now — track the brand palette
    // separately so it doesn't block functional a11y gains).
    await checkA11y(page, testInfo, { disableRules: ['color-contrast'] });

    // Visual regression, desktop.
    await expect(page).toHaveScreenshot('dashboard-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
    });
  });

  test('dashboard is visually stable on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');
    // Bounded: the app polls on intervals, so true network-idle may never fire.
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
    });
  });

  test('scheduler route renders for a logged-in user', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (e) => pageErrors.push(e));

    await page.goto('/scheduler');
    await expect(page).toHaveURL(/\/scheduler/);
    // Bounded: the app polls on intervals, so true network-idle may never fire.
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    expect(pageErrors, pageErrors.map((e) => e.message).join('\n')).toHaveLength(0);
  });
});
