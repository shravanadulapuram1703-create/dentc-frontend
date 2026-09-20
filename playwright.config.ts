import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for dentc-frontend E2E / visual / accessibility tests.
 *
 * One engine drives all three layers the team asked for:
 *   - E2E user flows      -> normal page interactions + assertions
 *   - visual regression   -> expect(page).toHaveScreenshot()
 *   - accessibility       -> @axe-core/playwright (see e2e/support/axe.ts)
 *
 * The AI angle: Claude Code drives Playwright via the Playwright MCP server
 * (see .mcp.json) to author and self-heal these specs from plain-English flow
 * descriptions — turning docs/qa/DentC_E2E_Test_Workflows.html into real tests.
 *
 * Requires: backend on :8000 and the Vite dev server on :5173 (started for you
 * by the `webServer` block below; must stay on 5173 for backend CORS).
 */

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

/** Warm, authenticated session captured once by e2e/global-setup.ts. */
export const STORAGE_STATE = 'e2e/.auth/state.json';

export default defineConfig({
  testDir: './e2e',
  // Colocate visual baselines next to each spec (e2e/__screenshots__/...).
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  // Authenticated screens are data-heavy and the app polls on intervals; give
  // full-page screenshot + axe scans room so they aren't flaky.
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    // Small tolerance for font/anti-alias jitter across machines.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' },
  },

  // Log in once, reuse the session for every test.
  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL: BASE_URL,
    storageState: STORAGE_STATE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Uncomment to widen browser/viewport coverage once specs are stable:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
