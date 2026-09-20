import { defineConfig, mergeConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config';

/**
 * Vitest inherits the app's Vite config (React plugin, `@` alias) but must NOT
 * collect the Playwright E2E specs under `e2e/**` — those import from
 * `@playwright/test` and are run by `npm run e2e`, not Vitest. Without this
 * exclusion Vitest's default spec glob picks them up and fails.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      exclude: [...configDefaults.exclude, 'e2e/**'],
    },
  }),
);
