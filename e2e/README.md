# E2E / Visual / Accessibility tests (Playwright)

One free, self-run engine — **Playwright** — covers all three layers, and the
"AI" is **Claude Code driving Playwright via the Playwright MCP** (see
`../.mcp.json`) to author and self-heal specs from plain-English flow
descriptions.

## Prerequisites

- **Backend** running on `http://127.0.0.1:8000`.
- Dev server on `:5173` — started automatically by the `webServer` block in
  `../playwright.config.ts` (keep it on 5173 for backend CORS).
- Login defaults to the local-dev super-admin `admin`/`admin` (tenant 1).
  Override with env vars: `E2E_USERNAME`, `E2E_PASSWORD`, `E2E_BASE_URL`.

## Commands

```bash
npm run e2e            # run all tests (headless)
npm run e2e:ui         # interactive UI mode (great for authoring/debugging)
npm run e2e:update     # create/refresh visual baselines (run once, then commit)
npm run e2e:report     # open the last HTML report
```

## Layout

| Path | Purpose |
|---|---|
| `global-setup.ts` | Logs in once via the real form, saves the session to `.auth/state.json` |
| `support/axe.ts` | `checkA11y()` — fails on serious/critical WCAG 2.1 A/AA violations |
| `auth.spec.ts` | Login screen: E2E + visual + a11y (unauthenticated) |
| `smoke.spec.ts` | Authenticated smoke: dashboard/scheduler render, no uncaught errors, visual (desktop + mobile), a11y |
| `__screenshots__/` | Committed visual baselines |
| `.auth/` | Generated session (git-ignored) |

## Authoring new flows with AI

1. Start the app (backend + `npm run dev`).
2. Ask Claude Code to drive the **Playwright MCP** through a workflow from
   `../docs/qa/DentC_E2E_Test_Workflows.html`, then save it as a `*.spec.ts`
   here. Prefer role/label selectors — they double as accessibility signal.
3. Add `await expect(page).toHaveScreenshot()` on key screens and
   `await checkA11y(page, testInfo)` for the a11y gate.
4. `npm run e2e:update` to record baselines, review, and commit.

## First run

Visual specs fail the first time (no baseline). Run `npm run e2e:update` once to
record baselines, eyeball them, then commit `__screenshots__/`.
