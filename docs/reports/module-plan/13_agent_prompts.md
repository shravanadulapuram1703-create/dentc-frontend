# 13 - Coding-agent prompt pack

Copy-paste prompts that drive the implementation of this plan with a coding agent (Claude Code), step by step, in
the order of [10_backend_plan.md](10_backend_plan.md), [11_frontend_plan.md](11_frontend_plan.md) and
[12_roadmap.md](12_roadmap.md). Each prompt is one session and ends with tested, reviewable changes on a branch.

Contents: [0 How to run](#0-how-to-run-these-prompts) · [1 One-time setup](#1-one-time-setup-prompts) ·
[2 Walking skeleton](#2-walking-skeleton-p0-weeks-1-3) · [3 P0](#3-p0---foundations-and-correctness) ·
[4 Generic epic prompt](#4-the-generic-epic-prompt-p1-p5) · [5 Report-family prompt](#5-report-family-prompt-one-report-per-session) ·
[6 Phase lists P1-P5](#6-phase-sequences-p1-p5) · [7 Gate prompts](#7-gate-prompts) · [8 Utility prompts](#8-utility-prompts)

---

## 0. How to run these prompts

**Workspace.** Open one Claude Code session with both repositories available (start in the frontend repository and
add the backend folder to the session, or the reverse). Every prompt below names its repository. Replace the two
placeholders once, in your head or with find-and-replace:

| Placeholder | Meaning |
|---|---|
| `<BE>` | the backend repository folder (dentc-backend) |
| `<FE>` | the frontend repository folder (dentc-frontend); the plan lives in `<FE>/docs/reports/module-plan` |

**Rules for every session (already in the prompts, repeated here for you):**

1. **One prompt = one session = one branch.** Branch names: `reports/<step-id>` (for example `reports/s1-engine-base`,
   `reports/e0-07-canonical-ledger`). Start a new session for the next prompt. Short context gives better work.
2. **Order matters.** Run the prompts in the order listed. A prompt names the items it needs; if the agent finds a
   dependency not done, it stops and says so instead of building around it.
3. **Parallel lanes.** Prompts marked with the same lane letter in one table can run at the same time in separate
   sessions, each in its own git worktree (ask: "use a worktree"). Never run two sessions that edit the same files.
4. **Databases.** Migrations and tests run against a **local** PostgreSQL (the test tier of ENG-17) or SQLite. Never
   run migrations, repairs or resets against the shared UAT database or a client database from an agent session;
   production-side steps are written as `scripts/ops/` scripts that a person runs (10 §5).
5. **You review and merge.** The agent commits on its branch only when you say so; you open the PR and merge. Merge
   backend contract changes before the frontend prompt that runs `npm run api:sync` against them.
6. **Progress log.** Every session appends one entry to `<FE>/docs/reports/module-plan/implementation_log.md`
   (items done, items partly done, tests added, follow-ups). The next session reads it first.

**What to do when a prompt finishes:** read the agent's report, run the app or tests if it asks you to, merge, then
take the next prompt. If the agent reports a design gap, decide it (or ask the agent to propose options) before
moving on; record the decision in the log.

---

## 1. One-time setup prompts

### Prompt 1.1 - Record the decisions that must be settled before P0 (no code)

> Run in: either repository. Branch: `reports/decisions-p0`.

```text
We are starting the implementation of the Reports & Analytics module planned in <FE>/docs/reports/module-plan.
Read README.md sections 1, 4 and 6, and 12_roadmap.md section 6 ("Decisions needed") and the P0 section
"Decisions before P0 starts".

Then ask me, one question at a time with the recommended default first, every decision the roadmap says must be
settled before P0 (staffing scenario, event-capture start, PD-2, PD-1/PD-3 and code classes, PD-10/PD-11, the office
rule for users without office assignments, Denticon export and control totals, pilot organisation and accountant).
Write my answers to <FE>/docs/reports/module-plan/decisions_log.md as a table: decision id, question, answer,
date, effect on the plan (section links). Where my answer differs from the default, list the documents and work items
the roadmap says are affected. Do not change any other file. Finish with a short summary of what is now decided and
what is still open.
```

### Prompt 1.2 - Agent briefs in both repositories

> Run in: both repositories. Branch: `reports/agent-brief` in each.

```text
Prepare both repositories for a long implementation programme driven by coding-agent sessions.

1. Read <FE>/docs/reports/module-plan/README.md, 00_design_brief.md, decisions_log.md, and the "Scope" and
   "Workstreams" sections of 10_backend_plan.md and 11_frontend_plan.md.
2. In <BE>, add a section "Reports & Analytics module" to the repository's CLAUDE.md (create it if missing) of at
   most 40 lines: where the plan lives (absolute path to <FE>/docs/reports/module-plan), which documents decide what
   (02 engine, 03 data, 04 parameters, 05 metrics, 06 dashboards, 08 security, catalog/*.md report specs,
   catalog/parity/*.parity.json legacy mappings), the new packages app/reports/ and app/reporting/sql/, the flag
   REPORTS_ENGINE_ENABLED, the rule that report SQL reads only rpt_* views inside one read-only REPEATABLE READ
   transaction, office scope via report_scope.allowed_offices(), snake_case fields, migrations tested on the local
   PostgreSQL tier only, production steps as scripts/ops/ scripts, and "update implementation_log.md at the end".
3. In <FE>, add the matching section to CLAUDE.md (at most 30 lines): the module lives in src/features/reports/,
   services wrap the generated Orval client only, `npm run api:sync` points C0..C9 of 11 §3.4, fixtures synced from
   the backend contract tests, the 0.75 zoom utilities, `npx tsc -b`, `npx eslint`, `npm test`, Playwright specs.
4. Create <FE>/docs/reports/module-plan/implementation_log.md with a header explaining the entry format
   (date, prompt id, branch, items done / partial, checks run with results, follow-ups).
Keep both sections factual and short; link to the plan instead of copying it. Show me the diff; do not commit.
```

---

## 2. Walking skeleton (P0 weeks 1-3)

Source: [10 §3](10_backend_plan.md#3-the-walking-skeleton) and [11 §3](11_frontend_plan.md#3-the-walking-skeleton-on-the-frontend-side).
Goal: `daily.production_report` (summary by code) runs end to end - definition, validate, inline run, snapshot,
screen, CSV, PDF - with audit and the office rule. Backend prompts S1-S4 run in order; frontend prompts S5-S7 start
as soon as their contract point exists.

| Step | Lane | Repo | Prompt | Items (thin parts per 10 §3.1) |
|---|---|---|---|---|
| S1 | A | BE | Engine base and test tier | ENG-01, ENG-02, ENG-17, ENG-56 (flag gate, deps, PostgreSQL CI tier) |
| S2 | B | BE | Reporting SQL package and first views | DATA-01, DATA-02 thin, DATA-04 thin, DATA-05 thin, DATA-06 thin |
| S3 | A | BE | Definition, validate, security thin | ENG-03, ENG-04, ENG-05, ENG-06, FLT-01 (3 types), FLT-04, SEC-01 (daily), SEC-03, SEC-04, SEC-05, ENG-07, ENG-19 |
| S4 | A | BE | Run, snapshot, artifacts, lint, first report | ENG-08..ENG-15, ENG-57, ENG-18 first rules, ENG-20 (production), throwaway PDF adapter |
| S5 | C | FE | Module shell, spike, styles | UX-02, UX-01, UX-15 |
| S6 | C | FE | Contract drop C0, model, tooling, services | C0, UX-04, UX-13, FLT-04/05 (TS), UX-03 after C2 |
| S7 | C | FE | Runner, params, results, CSV | FLT-10..FLT-15, UX-07, UX-08, UX-09, UX-10 |

### Skeleton prompt template (use for S1-S7)

```text
Implement walking-skeleton step <S-id> of the Reports & Analytics module: <step title>.
Repository: <BE or FE>. Branch: reports/<s-id>-<short-name>.

Read first, in this order:
- <FE>/docs/reports/module-plan/implementation_log.md (what earlier sessions did)
- the skeleton section: 10_backend_plan.md §3.1 and §3.2 (backend) or 11_frontend_plan.md §3.1-§3.4 (frontend)
- the work items <ITEM-IDS> in work_items.md (title, acceptance, depends_on) and the sections of the design
  documents they cite (02_architecture.md, 03_data_foundation.md, 04_filter_framework.md, 08_security_compliance.md,
  07_ux_blueprint.md)
- the existing code the plan names (it says which files exist and which are [NEW]).

Scope: only the THIN part of each item described in the skeleton table ("Done check of the thin part");
the "Deferred to the full item" column stays for later prompts. If a dependency is missing, stop and tell me.

Then:
1. Write a short implementation plan (files to add/change, tests, migration names) and wait for my OK.
2. Implement it. Follow the repository CLAUDE.md conventions (snake_case data fields, office scope, generated
   client on the frontend). Backend: Alembic revisions tested with upgrade and downgrade on the local PostgreSQL
   tier; never touch the UAT or a client database. Frontend: services over src/api/generated only.
3. Add the tests the done check needs (pytest on the PostgreSQL tier / vitest / Playwright with route mocks).
4. Run the checks: backend `pytest` (the reports suites and anything you touched) and `alembic upgrade head` +
   `alembic downgrade -1` on the local tier; frontend `npx tsc -b`, `npx eslint <changed paths>`, `npm test`.
5. Append an entry to implementation_log.md, then report: what was done per item (thin part complete or not),
   checks with their results, follow-ups, and anything in the plan that turned out wrong.
Do not commit until I say so.
```

Fill-ins for the template:

| Step | `<step title>` | `<ITEM-IDS>` |
|---|---|---|
| S1 | engine package, feature flag, dependencies, PostgreSQL test tier and CI job | ENG-01, ENG-02, ENG-17, ENG-56 |
| S2 | reporting SQL package, view helper, readiness table, thin code flags, four dimensions, thin `rpt_charges` with R-01 for the charge leg; golden_small seed | DATA-01, DATA-02, DATA-04, DATA-05, DATA-06 |
| S3 | definition schema, expression evaluator with shared vectors, three parameter types and date presets, catalog/definition/validate endpoints, rights registry for the daily family, single `authorize()`, `allowed_offices()`, OpenAPI snapshot and definition fixture | ENG-03, ENG-04, ENG-05, ENG-06, ENG-07, ENG-19, FLT-01, FLT-04, SEC-01, SEC-03, SEC-04, SEC-05 |
| S4 | read-only report session, scoped dataset handle, executor with group-by-code subtotals, report_runs and inline run, snapshot paging, artifacts with CSV and proxy download, audit outbox row per run, parity lint first rules (phase map + interim mode), the old `production` report on the engine, throwaway PDF adapter over `app/services/pdf_report.py`, golden case `summary_by_code.json` | ENG-08, ENG-09, ENG-10, ENG-11, ENG-12, ENG-13, ENG-14, ENG-15, ENG-18, ENG-20, ENG-57 |
| S5 | library spike S-1, module shell with lazy routes and engine probe, reports stylesheet and overlay primitives | UX-02, UX-01, UX-15 |
| S6 | contract drop C0 (`npm run api:sync` against a backend running the S3 branch), definition model and fixtures, test tooling and fixture sync, date tokens and expression evaluator (TS halves), services after C2 | UX-04, UX-13, FLT-04, FLT-05, UX-03 |
| S7 | `ParamForm` and controls, enhanced runner `/reports/r/:report_key`, `ResultTable` over the print stream with paging, context line and states, CSV download | FLT-10, FLT-11, FLT-12, FLT-13, FLT-14, FLT-15, UX-07, UX-08, UX-09, UX-10 |

### Prompt S8 - Skeleton demo and P0 re-cut

```text
The walking skeleton should now be complete. Verify it end to end and re-cut the P0 plan.
1. Read implementation_log.md and 10_backend_plan.md §3.1 "What the skeleton proves".
2. Start the backend locally with REPORTS_ENGINE_ENABLED=true (tell me the command; I run servers myself if
   needed) and the frontend dev server, open /reports/r/daily.production_report, run it with defaults, download
   CSV and PDF, and confirm: screen, CSV and PDF totals equal; an unassigned office is refused with 403
   office_not_assigned; the run wrote one audit outbox row; with the flag off the module is hidden.
3. List every skeleton proof as passed / failed with evidence (test names, screenshots, query output).
4. Record the measured numbers the plan asks for (production query time with and without the first DATA-08
   index on the local tier, pool behaviour) in implementation_log.md.
5. Propose changes to the P0 build order (10 §4 P0) based on what you learned; do not edit the plan documents,
   list the proposed edits for me.
```

---

## 3. P0 - Foundations and correctness

Run after the skeleton. Each row uses the **generic epic prompt** of section 4 with the epic id filled in; the
"Lane" column shows what can run in parallel (separate sessions and worktrees). Order inside a lane is top to bottom.
Source: [10 P0 epics and build order](10_backend_plan.md#p0---foundations-and-correctness),
[11 P0](11_frontend_plan.md#p0---foundations-and-correctness).

| # | Lane | Repo | Epic | What it delivers |
|---|---|---|---|---|
| P0-1 | a | BE | E0.01 (rest), E0.02 (rest) | fail-closed start-up, cloud spike findings (ENG-21), Redis namespace, fault-injection harness |
| P0-2 | b | BE | E0.14 part 1: SEC-11, SEC-42 | outside door and tenant predicate (P0 entry conditions of 08) |
| P0-3 | c | BE | E0.03 (rest), E0.04 | readiness checker #1-#39, transaction-code catalog, code flags and groups, core dimensions |
| P0-4 | c | BE | E0.05 | reporting indexes as `scripts/ops/` steps (10 §5.2) |
| P0-5 | c | BE | E0.07 | canonical ledger, balance unification, reconciliation suite R-01..R-04 |
| P0-6 | c | BE | E0.06 | migrated-data repairs, policy decisions, ledger completeness (DATA-57 needs the Denticon decision) |
| P0-7 | d | BE | E0.09 (rest), E0.10 (rest) | all parameter types, tokens, forced values, executor banding and pivots |
| P0-8 | d | BE | E0.11 | option sources, payment / adjustment code sources |
| P0-9 | e | BE | E0.08 | rights catalog revision 2, principal, office and provider rules, data classes |
| P0-10 | d | BE | E0.12 (rest), E0.13 | admission limits, table snapshots, tick job, append-only audit store, manifests |
| P0-11 | e | BE | E0.14 part 2 | existing-surface defects, legacy route security, shadow rollout, security suite |
| P0-12 | d | BE | E0.15 | full parity lint over `catalog/parity/*.parity.json` |
| P0-13 | f | BE | E0.17 | metric registry, organisation settings, base measures |
| P0-14 | d | BE | E0.18 | `production`, `collections`, `patient-list` on the engine (other three in P1) |
| P0-15 | g | FE | F0.1, F0.8 | module shell, catalog-driven Reports menu, hub v1 |
| P0-16 | g | FE | F0.4 (rest), F0.5 | all parameter controls, classic frame, access gating |
| P0-17 | g | FE | F0.6 (rest), F0.7, F0.9 | results v1 complete, CSV, the P0 reports on the runner with redirects |
| P0-18 | h | analyst | E0.16 | parity tooling, live legacy verification (FLT-22, FLT-23, RPT-MENU-01) - see utility prompt 8.3 |
| P0-G | - | both | Gate G0 | gate prompt of section 7 |

---

## 4. The generic epic prompt (P1-P5)

Use for every backend `E<phase>.<nn>` and frontend `F<phase>.<n>` epic. Replace `<EPIC>`, `<REPO>` and keep the rest.

```text
Implement epic <EPIC> of the Reports & Analytics module. Repository: <REPO>. Branch: reports/<epic-id>.

Read first:
1. <FE>/docs/reports/module-plan/implementation_log.md and decisions_log.md.
2. The epic row and the build-order step of its phase in 10_backend_plan.md (backend epics E*) or
   11_frontend_plan.md (frontend epics F*): work items, size, epic dependencies, backend items it waits for.
3. Every work item of the epic in work_items.md (acceptance and depends_on), and the design-document sections the
   items cite. For report items, the report's section in catalog/<family>.md and its entries in
   catalog/parity/<category>.parity.json.
4. The existing code the plan names.

Before coding:
- Check every dependency (work items and epics) against implementation_log.md and the code. If one is missing,
  stop and tell me which, and what you would need to stub (never stub silently).
- Note any work item listed as a phase inversion in 12_roadmap.md (RG-04 and plan_inputs/facts.md "Register
  problems") and follow the roadmap's resolution.
- Give me a plan: work items in order, files, migrations, endpoints, tests, and how each acceptance criterion will
  be proven. Wait for my OK. If the epic is larger than about 3 days of agent work, propose a split into several
  sessions and do only the first part.

While coding:
- Backend: report SQL only over rpt_* views; one read-only REPEATABLE READ transaction per run; office scope from
  report_scope.allowed_offices(); snake_case; Alembic revisions with downgrade, run on the local PostgreSQL tier only;
  production data steps as scripts/ops/ scripts with a preflight; never connect to UAT or client databases.
- Frontend: src/features/reports/**, services over the generated client, fields bound to backend snake_case names,
  useOfficeScope(), uiZoom utilities; run `npm run api:sync` only at the contract point the plan names, against a
  backend running the merged contract.
- Keep definitions JSON and parity files consistent: every legacy control id is mapped as the parity file says.

Finish:
- Run the checks: backend pytest (reports suites + touched modules), parity lint, alembic upgrade/downgrade on the
  local tier; frontend `npx tsc -b`, `npx eslint` on changed paths, `npm test`, the Playwright specs of the epic.
- Append to implementation_log.md: items done / partial (with what is left), checks and results, follow-ups,
  plan errors found.
- Report the same to me. Do not commit until I say so.
```

---

## 5. Report-family prompt (one report per session)

The family epics (E1.13 Daily, E1.14 Ledger, E1.15 My Reports, E1.16 Statements, E2.13 Monthly, E2.14 Management,
E2.15 Insurance, E3.08-E3.10, E2.17 / E3.12 / E4.06 new reports) are too large for one session. First run the
**family base** prompt once per family, then the **one report** prompt per report in the order of the family's
catalog document.

### 5.1 Family base

```text
Implement the shared base of the <FAMILY> report family. Repository: <BE>. Branch: reports/<family>-base.
Read implementation_log.md, then catalog/<family-doc>.md completely (Overview, shared parameters, Data, the work-item
block at the end) and the family's header work items (RPT-<PREFIX>-01..09) in work_items.md.
Implement the header work items only: family registration, shared parameters and option sources, shared builders,
rights and data classes, attribution declarations, parity default tests scaffold. No individual report definitions
yet. Plan first and wait for my OK; then implement, test (pytest + parity lint), log and report as in the generic
epic prompt.
```

### 5.2 One report

```text
Implement the report <report_key> (<legacy name>) of the <FAMILY> family. Repository: <BE> (and <FE> only for the
FE-led items of this report, named in the catalog). Branch: reports/<report_key with dots replaced by dashes>.

Read implementation_log.md, then in catalog/<family-doc>.md the report's section completely (all ten sub-sections
including the generated PARITY table), its entries in catalog/parity/<category>.parity.json (every legacy control,
option map, default, enabled_when, dynamic_rules), and its work items in work_items.md.

Then:
1. Plan: the definition JSON (parameters with legacy_control_ids, formats, blocks, columns, totals), the datasets and
   any SQL it needs, the availability notes (READY / REPAIR / SCHEMA / APP) and what the report does until a
   missing DATA item lands, tests. Wait for my OK.
2. Implement the definition so the parity lint passes with EVERY legacy control of this report mapped exactly as
   the parity file says (status, param, option_map, default, enabled_when, dynamic rule behaviour).
3. Tests: parity default test, a golden case on golden_small for each format, the reconciliation tests the catalog
   names, the office-scope and rights tests.
4. If the catalog marks an open question for live legacy verification, do not guess: implement the documented
   default, mark it in the log as "verify on legacy", and continue.
5. Run the checks, log and report as in the generic epic prompt. Do not commit until I say so.
```

Report order per family: take the report sections of `catalog/<family-doc>.md` from top to bottom; the work-item
ids (RPT-<PREFIX>-10.., 40.., 70..) give the order inside the family.

---

## 6. Phase sequences P1-P5

Each line is one session with the generic epic prompt (section 4), unless it says "family" (section 5). Lanes with
different letters may run in parallel. Run the gate prompt at the end of each phase before starting the next one
for a client (building ahead on branches is fine).

### P1 - Daily financial core ([10 P1](10_backend_plan.md#p1---daily-financial-core), [11 P1](11_frontend_plan.md#p1---daily-financial-core), waves in [12 P1](12_roadmap.md#p1---daily-financial-core))

| # | Lane | Repo | Epic / prompt |
|---|---|---|---|
| P1-1 | a | BE | E0.18 rest: `appointments`, `treatment-plans`, `insurance-claims` on the engine (ENG-20 second half, RG-02) |
| P1-2 | b | BE | E1.01 ledger re-read, posting stamps, void metadata, tenant_id batch 1 |
| P1-3 | b | BE | E1.02 scheduling, visit, patient-activity, calendar and treatment-item facts |
| P1-4 | b | BE | E1.03 FIFO allocation core, claim and coverage facts, early event capture |
| P1-5 | b | BE | E1.04 statement runs, time clock and lab adapters, goals table, fees, alerts |
| P1-6 | a | BE | E1.05 artifact lifecycle, PDF kit and layouts, XLSX, logos, criteria echo (removes the skeleton PDF adapter) |
| P1-7 | a | BE | E1.06 saved views, favorites, drill, pivot, function datasets |
| P1-8 | a | BE | E1.07 runs with side effects, retention classes |
| P1-9 | c | BE | E1.08, E1.09 metric service v1, dashboard API v1, P1 metric pack |
| P1-10 | c | BE | E1.10 dashboard model, Main / Provider / My Dashboard definitions, first worklist |
| P1-11 | d | BE | E1.11 export controls, dashboard authorisation, access log, P1 security review |
| P1-12 | d | BE | E1.12 performance tier, golden_large |
| P1-13 | e | BE | family: Daily (E1.13) - base, then 12 reports |
| P1-14 | e | BE | family: Ledger (E1.14) - base, then 4 reports |
| P1-15 | e | BE | family: My Reports (E1.15) - base, then 5 reports |
| P1-16 | e | BE+FE | family: Statements (E1.16) - base, then `statements.statement_run` |
| P1-17 | e | BE | E1.17 parity default tests, access log and setup integrity reports |
| P1-18 | f | FE | contract point C4, then F1.1 results depth, F1.2 export dialog |
| P1-19 | f | FE | F1.5 shell additions, F1.3 saved views, URL state, favorites |
| P1-20 | f | FE | F1.4 drill-through and record routes |
| P1-21 | g | FE | contract point C5, then F1.6 dashboard frame and KPI components, F1.7 first dashboards |
| P1-22 | g | FE | F1.8 statements screen, F1.9 patient context and My Reports |
| P1-23 | g | FE | F1.10 migration and entry points, F1.11 filter accessibility |
| P1-G | - | both | Gate G1 (section 7) |

### P2 - Month-end, A/R and insurance

| # | Lane | Repo | Epic / prompt |
|---|---|---|---|
| P2-1 | a | BE | E2.01 tenant-wide allocations, A/R open items and ageing |
| P2-2 | a | BE | E2.02 deposits, day close and period lock, close snapshots |
| P2-3 | a | BE | E2.03 claim model additions, benefit usage, payer stamps, eligibility, ERA |
| P2-4 | a | BE | E2.04 audit events dataset, contract instalments |
| P2-5 | b | BE | E2.05 background path, reaper, retries, progress push |
| P2-6 | b | BE | E2.06 worker service role, per-client provisioning, observability |
| P2-7 | b | BE | E2.07 schedules and delivery; E2.08 run cache |
| P2-8 | c | BE | E2.09 P2 metric packs and snapshot writer; E2.10 P2 dashboards (backend) |
| P2-9 | d | BE | E2.11 write-once manifests, disclosure log, step-up, off-boarding |
| P2-10 | d | BE | E2.12 P2 option sources and run estimate |
| P2-11 | e | BE | family: Monthly (E2.13) - base, then 9 reports |
| P2-12 | e | BE+FE | family: Management (E2.14) - base, then 4 reports |
| P2-13 | e | BE | family: Insurance (E2.15) - base, then 13 reports |
| P2-14 | e | BE+FE | E2.16 P2 follow-ups of Daily, Ledger, Statements |
| P2-15 | e | BE | new reports P2 (E2.17): one report per session from catalog/analytics_reports.md |
| P2-16 | e | BE+FE | E2.18 correspondence parity (only if decision PD-15 / RG-21 keeps it in this programme) |
| P2-17 | f | FE | contract point C6, then F2.1 background runs and run tray, F2.2 schedules and subscriptions |
| P2-18 | f | FE | F2.3 sharing, administration, step-up |
| P2-19 | g | FE | F2.4 chart tiles and scorecard v1, F2.5 P2 dashboards, F2.6 insurance dashboard rebinding |
| P2-20 | g | FE | F2.7 family frontend touches and day-close list, F2.8 screens of owning features |
| P2-G | - | both | Gate G2 |

### P3 - Scheduling, clinical, patients and lists (in waves 3A, 3B, 3C)

| # | Lane | Repo | Epic / prompt |
|---|---|---|---|
| P3-1 | a | BE | E3.01 treatment stamps, recall engine, ortho, capacity and communication facts |
| P3-2 | a | BE | E3.02 referral model, patient lifecycle, list datasets, tenant_id batch 2 |
| P3-3 | b | BE | E3.03 live keyset paging, row and bulk actions, P3 option sources (unblocks the P2 items held by RG-04) |
| P3-4 | c | BE | E3.04 P3 metric packs |
| P3-5 | c | BE | E3.05 worklist backend, membership sync, bulk outreach, 17 worklists |
| P3-6 | c | BE | E3.06 goals service, Morning Huddle and topic dashboards |
| P3-7 | d | BE | E3.07 security review of the P3 definitions |
| P3-8 | e | BE | wave 3A family: Appointment (9), then Recall (4) |
| P3-9 | e | BE | wave 3B family: Treatment Plan (4), Ortho (5), Referral (8) |
| P3-10 | e | BE | wave 3C family: Patient lists (12), Provider lists (4), Security lists (4), Setup lists (20) |
| P3-11 | e | BE+FE | E3.11 row and bulk actions on the P1 / P2 families |
| P3-12 | e | BE | new reports P3 (E3.12): one report per session |
| P3-13 | e | BE+FE | E3.13 correspondence print, labels, forms (if kept) |
| P3-14 | f | FE | contract point C7, then F3.1 worklist page, F3.3 bulk actions |
| P3-15 | f | FE | F3.2 worklist content and my follow-ups |
| P3-16 | g | FE | F3.4 goals, F3.5 Morning Huddle and heatmap, F3.6 P3 dashboards |
| P3-17 | g | FE | F3.7 code picker extras, F3.8 correspondence workspace, F3.9 scheduler status and record routes |
| P3-18 | g | FE | F3.10 responsive and accessibility pass |
| P3-G | - | both | Gate G3 (all 118 legacy reports registered) |

### P4 - Analytics depth

| # | Lane | Repo | Epic / prompt |
|---|---|---|---|
| P4-1 | a | BE | E4.01 roll-up tables, refresh engine, snapshots |
| P4-2 | a | BE | E4.02 metric service on roll-ups, ranking, comparison period |
| P4-3 | a | BE | E4.03 targets, bands, benchmarks, P4 analytics pack |
| P4-4 | b | BE | E4.04 condition-based schedules, alerts and digests |
| P4-5 | b | BE | E4.05 scorecard v2, office comparison, outreach results (backend) |
| P4-6 | c | BE | E4.06 P4 reports and enhancements (one report per session) |
| P4-7 | d | FE | contract point C8, then F4.1 dashboard frame v2, F4.2 targets, scorecard v2, comparison |
| P4-8 | d | FE | F4.3 alerts, F4.4 outreach results and snapshot trends, F4.5 advanced letter templates |
| P4-G | - | both | Gate G4 |

### P5 - Builder and assistant

| # | Lane | Repo | Epic / prompt |
|---|---|---|---|
| P5-1 | a | BE | E5.01 custom-definition store, builder guardrails, custom KPIs, Office Reports |
| P5-2 | b | BE | E5.02 assistant tool endpoints, grounding, controls (only after decisions PD-14 and the vendor / BAA route) |
| P5-3 | c | FE | contract point C9, then F5.1 report builder, F5.3 Office Reports as custom reports |
| P5-4 | c | FE | F5.2 assistant surfaces (behind the kill switch) |
| P5-G | - | both | Gate G5 (module definition of done, 12 §10) |

---

## 7. Gate prompts

Run one at the end of each phase. Replace `<N>` with 0-5.

```text
Run the exit check of gate G<N> of the Reports & Analytics module. Do not write feature code in this session.

1. Read implementation_log.md, decisions_log.md, the exit criteria of P<N> in 12_roadmap.md ("Exit criteria
   (gate G<N>)"), 10_backend_plan.md and 11_frontend_plan.md ("Exit criteria" and "Tests and reconciliation checks
   that must be green" of P<N>).
2. Build a checklist with one row per criterion: criterion id, how it is proven, evidence (test names and results,
   lint output, reconciliation output, screenshots), status pass / fail / needs a person (for signatures such as
   accountant sign-off or legacy output comparisons).
3. Run every automated check you can locally: backend pytest (all reports suites), parity lint, the reconciliation
   suite on the local PostgreSQL tier; frontend tsc, eslint, npm test, Playwright reports specs; and in
   <FE>/docs/reports/module-plan: python -I tools/collect_work_items.py . and python -I tools/check_plan_coverage.py .
4. Compare the phase's work items in work_items.md with implementation_log.md and list every item not done or
   only partly done.
5. Write the checklist to <FE>/docs/reports/module-plan/gates/G<N>_checklist.md and report: pass / not yet, the
   failing criteria, the items left, and what a person must do (signatures, legacy captures, client switch-on).
```

---

## 8. Utility prompts

### 8.1 Contract sync point (frontend)

```text
Run contract sync point <Cx> of 11_frontend_plan.md §3.4. Repository: <FE>. Branch: reports/sync-<cx>.
The backend branch with items <ITEMS> is merged and running locally (I started it; base URL in the api:sync
script). Run `npm run api:sync`, commit nothing yet. Fix `npx tsc -b` errors caused by the new generated types,
re-run the fixture sync of UX-13 against the same backend commit, run `npm test`. Report the new operations, the
breaking changes and what you changed.
```

### 8.2 Resume an interrupted session

```text
Continue the Reports & Analytics work on branch <branch>. Read implementation_log.md (last entry), `git status`
and `git diff` of this branch, and the prompt that started it (<prompt id> in 13_agent_prompts.md). Tell me what is
done and what is left, then continue with the remaining part only.
```

### 8.3 Legacy verification capture (analyst + agent)

```text
I will paste screenshots of the legacy report <legacy name> (criteria screen, open dropdowns, sample output).
Read the report's open questions in catalog/<family-doc>.md and its unknown_legacy / TODO entries in
catalog/parity/<category>.parity.json and legacy/supplement.md. For each screenshot, tell me which questions it
answers and how. Then update legacy/supplement/<category>.supplement.json with the new evidence (quote the visible
text exactly), run python -I tools/validate_supplement.py . legacy/supplement/<category>.supplement.json,
python -I tools/apply_supplement.py . <category>, rebuild the skeleton and parity
(python -I tools/make_parity_skeleton.py legacy/index catalog/skeleton; python -I tools/build_parity.py . <category>)
and re-render the catalog tables. Report every changed mapping. Do not change report code in this session.
```

### 8.4 Plan drift check (every few weeks)

```text
Compare the implementation with the plan. Read implementation_log.md and decisions_log.md; regenerate the register
(python -I tools/collect_work_items.py .), the facts (python -I tools/make_facts.py .) and the name check
(python -I tools/check_names.py .) in <FE>/docs/reports/module-plan. List: items done that the plan still shows
as future, plan statements that the code contradicts (endpoint paths, dataset names, parameter keys), decisions in
the log that the documents do not reflect yet. Propose the document edits; do not edit the design documents
without my OK.
```

### 8.5 Code review before merge

```text
Review branch <branch> against main for the Reports & Analytics module. Check: the work items it claims in
implementation_log.md meet their acceptance in work_items.md; report SQL reads only rpt_* views in the read-only
session; every query is office-scoped through allowed_offices(); no PHI in logs or artifacts beyond the data class;
snake_case field parity between backend schemas and frontend services; migrations have downgrades and were not run
against shared databases; tests cover the acceptance. List findings by severity with file:line. Do not fix anything
unless I ask.
```
