# Implementation log

One entry per coding-agent session of the Reports & Analytics module, newest at the bottom. Every session reads the
last entries before starting and appends its own entry when it finishes ([13_agent_prompts.md](13_agent_prompts.md)
§0). Decisions go to [decisions_log.md](decisions_log.md), not here.

Entry format:

```markdown
## <YYYY-MM-DD> - <prompt id> - <short title>
- Repo / branch: <BE|FE|both> / reports/<...>
- Items done: <WORK-ITEM ids>  (thin part only, when the prompt says so)
- Items partial: <id>: <what is left>
- Checks: <command> -> <result>; ...
- Follow-ups: <items or questions for the next session>
- Plan errors found: <document section: what is wrong> (or "none")
```

---

## 2026-11-22 - 1.1 - Decisions before P0
- Repo / branch: FE / not committed (on the working branch)
- Items done: none (decisions only) - see decisions_log.md
- Checks: none
- Follow-ups: re-estimate durations after skeleton step S8 (agent-driven staffing); schedule the DATA-17 / DATA-25
  capture parts in P0 week 1 (RG-11); DATA-50 decision moved to P0
- Plan errors found: none

## 2026-11-22 - 1.2 - Agent briefs in both repositories
- Repo / branch: both / not committed (each repo's current working branch; no branch created because both have
  unrelated uncommitted work)
- Items done: none (setup) - "Reports & Analytics module" sections added to dentc-backend/CLAUDE.md (under
  Conventions) and dentc-frontend/CLAUDE.md (end); this log created
- Checks: none (documentation only)
- Follow-ups: next prompt S1 (backend: ENG-01, ENG-02, ENG-17, ENG-56) and S5 (frontend: UX-02, UX-01, UX-15) can start
  in parallel
- Plan errors found: none

## 2026-11-22 - S1 - Engine base, flags, dependencies, PostgreSQL tier, Redis namespace
- Repo / branch: BE / not committed (working branch `feature/uat-realse`; create `reports/s1-engine-base` at commit)
- Items done (thin parts of 10 §3.1):
  - ENG-01: `app/reports/` package, `app/reports/gate.py` (404 `reports_engine_disabled`; 503
    `reports_engine_misconfigured` + `details.missing[]` on staging/prod with local storage or no bucket),
    `app/api/v1/report_engine.py` with `GET /reports/catalog` (`list_report_catalog`, empty catalog), mounted always in
    `app/api/router.py`; settings `REPORTS_ENGINE_ENABLED`, `SERVICE_ROLE` (validator refuses `all` outside dev),
    `REPORT_STORAGE_BACKEND`, `GCS_BUCKET_REPORTS`; start-up check that no `/internal/` route is mounted on the API role;
    `app/schemas/report_engine.py` (`ReportCatalog`).
  - ENG-02 (complete): XlsxWriter, croniter, google-cloud-tasks, openpyxl in `requirements.txt`; `fastapi==0.128.0`
    pinned; `Content-Disposition` exposed; `--timeout ${GUNICORN_TIMEOUT:-120}` in `Dockerfile`.
  - ENG-17 (thin): `postgres:15` service in `docker-compose.yml` (port 5433); `tests/reports/pg/conftest.py` (baseline
    restore without psql, stamp, `alembic upgrade head`, template + per-session clone, guard: only `rpt_test_*`
    databases are created/dropped); `tests/reports/pg/test_pg_tier.py` (head check, PG >= 15, canary);
    `tests/pg/README.md`; CI job `reports-tests` in `deploy-cloud-run.yml` (postgres:15 service), `deploy` needs it;
    canary step proves a failing PG test fails the job once the baseline is committed.
  - ENG-56 (code part): `REDIS_NAMESPACE` prefix in `channel_for`, `tenant_channel_for`, `_parse_channel`
    (unchanged names when empty); start-up warning outside dev when Redis is on without a namespace.
- Items partial: ENG-01 (later start-up checks for background / schedules / e-mail; internal router in P2);
  ENG-17 (baseline files `tests/pg/baseline_schema.sql` + `baseline_revision.txt` - the user runs the read-only
  pg_dump per tests/pg/README.md; fault-injection harness; golden_small; nightly smoke; two-tenant isolation test);
  ENG-56 (rollout: set `REDIS_NAMESPACE` for every client in deploy config).
- Checks: `pytest tests/reports` -> 9 passed, 3 skipped (PG tier: no baseline / TEST_DATABASE_URL);
  `ruff check` on the new files -> clean; full suite -> 28 failed, 2 errors, all in pricing / procedure-code /
  treatment / ledger / e-mail tests (e.g. "Procedure code 'D1110' was not found", insurance_estimate 0 vs 60) that touch
  none of the S1 changes - consistent with the uncommitted pricing and treatment work on this branch, not caused by S1
  (judged by inspection; not re-run with S1 reverted).
- Decision recorded with the user: the local PostgreSQL tier will use the dev database server via TEST_DATABASE_URL;
  the tier only creates/drops its own `rpt_test_*` databases there (needs CREATEDB), never touches the dev database.
  Not exercised yet in this session.
- Follow-ups: user provides the baseline dump + revision; set TEST_DATABASE_URL and run `pytest tests/reports`;
  then S2 (DATA-01, DATA-02, DATA-04, DATA-05, DATA-06 thin).
- Plan errors found: none (note: 02 §12.2 lists `redis_store.py` for ENG-56 - the channel helpers live only in
  `app/services/messaging_events.py`).

## 2026-11-23 - S5 (part 1) - Module shell, engine probe, redirects, error boundary (UX-01)
- Repo / branch: FE / not committed (working branch `feature/uat-realse-v5`; create `reports/s5-module-shell` at commit)
- Scope decided with the user: UX-01 now; UX-02 spike + UX-15 styles in the next session (S5 part 2)
- Items done: UX-01
  - `src/features/reports/`: `ReportsEntry.tsx` (AppShell -> `ReportsErrorBoundary` -> Suspense -> lazy `routes.tsx`;
    `vite:preloadError` listener), `ReportsErrorBoundary.tsx` (stale chunk -> "A new version is available" + Reload;
    other errors -> message, never a blank app), `routes.tsx` (route set per engine state), `engine/engineState.ts` +
    `engine/useEngineAvailable.ts` (one catalog query per user and session; 404 -> off, 503
    `reports_engine_misconfigured` -> misconfigured with `details.missing[]` shown to admin/super_admin, anything else ->
    unknown with Retry), `legacyRedirects.ts` (07 §2.2 table, `LEGACY_REPORT_ID_MAP`, engine-off nav redirects),
    `pages/StatePages.tsx` (skeleton, not-found, unavailable, load-failed), `pages/EnginePlaceholders.tsx` (hub lists
    the catalog; runner placeholder until S7), `services/catalogService.ts`.
  - `src/App.tsx`: the 17 report routes replaced by one `/reports/*` route (`state.from` passed to /login).
  - `src/shared/config/queryClient.ts`: `meta.silent_error` skips the global error toast (planned in UX-03).
  - `server.js`: unknown `/assets/*` answers 404 instead of the index.html fallback.
- Engine-off behaviour change: the placeholder pages of `/reports/lists/{provider,security,setup,responsible-party}-list`,
  `/reports/interactive/*` and `/reports/office/*` now redirect to `/reports` (07 §2.3 "every other path"), while the
  nav's ledger / appointment / treatment-plan / insurance / patient-list targets still reach the old runner.
- INTERIM: `catalogService.ts` calls the generated client's mutator (`customInstance`) because `list_report_catalog`
  is not in the generated client yet; replace with the generated function at contract point C1.
- Checks: `npx tsc -b` -> clean; `npx eslint src/features/reports src/App.tsx src/shared/config/queryClient.ts` ->
  clean; `npx vitest run src/features/reports` -> 8 passed; `npx playwright test e2e/reports-shell.spec.ts` (dev server
  :3000, real backend, catalog mocked) -> 5 passed (off, on, misconfigured, unknown, failed chunk); live check in the
  browser pane against the local backend (catalog 404 -> engine off): old Reports home renders, `/reports/ledger` ->
  `/reports/run/production`, unknown path -> `/reports`. Not verified: the `server.js` assets 404 against a production
  build (covered by spike check #10 in S5 part 2).
- Seen, not caused by S5: toast "Insufficient role for this operation" on every page for the front_desk test user
  (403 on `GET /users/8/time-clock-config` from the top-bar time clock).
- Follow-ups: S5 part 2 = UX-02 spike (installs @tanstack/react-table, @tanstack/react-virtual) then UX-15 styles;
  UX-11 nav and UX-05 hub follow in S7 / P0.
- Plan errors found: 11 §3.2 lists UX-01 before contract point C0 - true, but the probe still needs an interim
  catalog call until C1 (noted above).

## 2026-11-23 - S5 (part 2) - Library spike S-1 (UX-02) and module styles (UX-15)
- Repo / branch: FE / not committed (working branch; create `reports/s5-spike-styles` at commit)
- Items done: UX-02, UX-15
  - UX-02: findings in `spikes/S-1_library_spike.md` (all 12 checks answered). Pinned exactly in `package.json`:
    `@tanstack/react-table` 9.3.1 (OD-2 = v9), `@tanstack/react-virtual` 3.14.28, `@radix-ui/react-dialog` 1.1.15
    (was only transitive). Harness removed; the column-state wrapper kept as
    `src/features/reports/results/useResultTable.ts` (91 lines, no casts, clean under noUncheckedIndexedAccess).
  - UX-15: `src/features/reports/styles/reports.css` (layer tokens, `.rpt-root` container, compact control rules
    inside `@layer base`, react-day-picker caption-select fix, Radix popper counter-zoom scoped to `.rpt-layer`, print
    sheet of 07 §9.9); container sizes `--container-rpt-sm/md/lg` in `src/styles/globals.css` (@theme must be in the
    main stylesheet); wrappers `ui/RptDialog.tsx`, `ui/RptPopover.tsx` (RptPopover, RptTooltip, RptTooltipProvider),
    `ui/SidePanel.tsx`; engine-on routes wrapped in `.rpt-root`; print-target classes `app-global-nav` (GlobalNav root)
    and `app-messaging-panel` (ChatPanel root).
- Spike findings that change the plan (not yet edited into 07 - needs your OK):
  - Radix/Floating UI popovers land at 0.75 x the anchor position under the global zoom; fixed by the counter-zoom
    rule (07 §9.5 assumed placement was correct). The messaging EmojiPicker probably has this bug today (unverified).
  - The global `!important` select rule breaks react-day-picker's caption dropdowns; fixed by the layered rule.
  - The messaging panel overlays the content (no `marginRight` shrink) at 1024 and 1700 px viewports (07 §9.5 says it
    shrinks the content).
  - Under the zoom Chrome snaps 1 px and 2 px borders to the same 1.33 px.
- Checks: `npx tsc -b` -> clean; `npx eslint src/features/reports` -> clean (GlobalNav keeps its 9 old warnings);
  `npx vitest run src/features/reports` -> 8 passed; `npx playwright test e2e/reports-shell.spec.ts` -> 8 passed (5 shell
  + 3 styles: compact controls, print sheet incl. "other screens print as before", popover anchoring);
  `npm run build` -> ok, module chunk `routes` 2.0 kB gzip, spike not emitted; production `server.js`: missing asset
  -> 404 text/plain; CSP allows blob PDF iframe and blob download links (no violations). Not executed: an actual file
  save and the print dialog; Edge separately; frame-rate profiling.
- Follow-ups: S2 (backend views) waits for the baseline dump; S6 (contract drop C0, definition model, test tooling)
  can start once the backend runs the S1/S3 branch; UX-14 (silent refresh) is part of F0.2.
- Plan errors found: 07 §9.5 (popover placement assumption; messaging panel shrink), 07 §10.1 react-virtual version
  (3.14.28 installed, 3.14.26 planned).

## 2026-11-23 - doc update - Spike S-1 results folded into 07_ux_blueprint.md (approved by the user)
- §9.5 Popovers row: placement under the zoom needs the popper counter-zoom (`.rpt-layer`); EmojiPicker note.
- §9.5 Compact controls row: react-day-picker caption-select rule; border snapping note for tests.
- §9.5 Width changes row: the messaging panel overlays the content (no `marginRight` shrink observed).
- §10.1: TanStack Table 9.3.1 and react-virtual 3.14.28 marked installed / pinned with v9 API notes; react-dialog now a
  direct dependency; intro notes the spike update.
- §10.2: outcome summary with a link to `spikes/S-1_library_spike.md`.
- Checks: `python -I tools/collect_work_items.py .` -> 825 items, 19 known problems (unchanged).
