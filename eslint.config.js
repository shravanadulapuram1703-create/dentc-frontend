import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

// Migration-era debt rules kept as warnings so CI gates on real breakage
// (parse errors, undefined vars, etc.) without a mass cleanup of an
// AI-generated codebase. Tighten over time.
const relaxed = {
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-unused-vars': [
    'warn',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z_]' },
  ],
  '@typescript-eslint/no-empty-object-type': 'warn',
  '@typescript-eslint/ban-ts-comment': 'warn',
  '@typescript-eslint/no-wrapper-object-types': 'warn',
  '@typescript-eslint/no-require-imports': 'warn',
  'no-empty': 'warn',
  'no-empty-pattern': 'warn',
  'prefer-const': 'warn',
}

export default tseslint.config(
  globalIgnores([
    'dist',
    'src/api/generated/**', // build output — never hand-linted
    '**/*.optimized.*',
    'server.js',
    'ecosystem.config.js',
    'playwright-report',
    'test-results',
    'e2e/.auth',
    'e2e/__screenshots__',
  ]),

  // ---- Application source (browser, TypeScript + React) ----
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactRefresh.configs.vite,
    ],
    // Use the classic hook rules only (as warnings); the react-hooks v7
    // "recommended" preset adds strict react-compiler rules that this
    // codebase violates pervasively — track them later, don't block CI now.
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    rules: {
      ...relaxed,
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },

  // ---- Office-key parsing lives in ONE place ----
  // `currentOffice` is the display key "OFF-<id>"; parsing it inline (parseInt /
  // Number / regex) produced four disagreeing copies and a NaN home_office_id.
  // Use officeKeyToId() from src/services/officeLookup.ts or useOfficeScope().
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/features/office-scope/**', 'src/services/officeLookup.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name=/^(parseInt|Number)$/] > Identifier[name=/^currentOffice/]",
          message:
            'Parse office keys with officeKeyToId() (src/services/officeLookup.ts) or read useOfficeScope().office_id.',
        },
        {
          selector:
            "CallExpression[callee.property.name=/^(match|replace)$/][callee.object.name=/^currentOffice/]",
          message:
            'Parse office keys with officeKeyToId() (src/services/officeLookup.ts) or read useOfficeScope().office_id.',
        },
      ],
    },
  },

  // ---- Build/config files & scripts (Node globals, TS-aware) ----
  {
    files: ['*.{js,ts}', 'scripts/**/*.{js,mjs,ts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      sourceType: 'module',
    },
    rules: relaxed,
  },

  // ---- Playwright E2E tests (Node + browser context) ----
  {
    files: ['e2e/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node, ...globals.browser },
      sourceType: 'module',
    },
    rules: relaxed,
  },
)
