import { test, expect } from '@playwright/test';
import { checkA11y } from './support/axe';

/**
 * Login screen — exercised WITHOUT the stored session so the unauthenticated
 * entry point is covered for E2E, visual regression, and accessibility.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login screen', () => {
  test('renders, is accessible, and matches its visual baseline', async ({ page }, testInfo) => {
    await page.goto('/login');

    await expect(page.getByLabel('Username or Email Address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();

    // Accessibility
    await checkA11y(page, testInfo);

    // Visual regression (baseline created on first `npm run e2e:update`)
    await expect(page).toHaveScreenshot('login.png', { fullPage: true });
  });

  test('shows an inline error when submitted empty', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(
      page.getByText(/enter your username\/email and password/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
