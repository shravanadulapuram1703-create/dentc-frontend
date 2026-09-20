import { chromium, type FullConfig } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { STORAGE_STATE } from '../playwright.config';

/**
 * Logs in ONCE through the real login form and saves the resulting session
 * (access_token / refresh_token / me_full / access_ctx / working office) to
 * STORAGE_STATE. Every test then starts fully authenticated with a working
 * office already seeded by AuthContext (seedWorkingOffice on session restore),
 * so no per-test password typing and no office-selection dance.
 *
 * Credentials default to the documented local-dev super-admin (admin/admin,
 * tenant 1). Override with E2E_USERNAME / E2E_PASSWORD / E2E_BASE_URL.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const USERNAME = process.env.E2E_USERNAME ?? 'admin';
const PASSWORD = process.env.E2E_PASSWORD ?? 'admin';

export default async function globalSetup(_config: FullConfig) {
  const dir = dirname(STORAGE_STATE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL: BASE_URL });
  try {
    await page.goto('/login');
    await page.getByLabel('Username or Email Address').fill(USERNAME);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // A successful login redirects to /dashboard (or the change-password screen
    // on a forced first-login reset — not expected for the seeded admin).
    await page.waitForURL('**/dashboard', { timeout: 30_000 });
    // Let AuthContext finish seeding me_full / access_ctx / current_office.
    await page.waitForLoadState('networkidle');

    await page.context().storageState({ path: STORAGE_STATE });
  } catch (err) {
    throw new Error(
      'E2E global-setup login failed. Check that the backend is running on ' +
        ':8000 and the dev server on :5173, and that the credentials are valid.\n' +
        `Tried ${USERNAME}/**** at ${BASE_URL}/login.\n` +
        `Original error: ${(err as Error).message}`,
    );
  } finally {
    await browser.close();
  }
}
