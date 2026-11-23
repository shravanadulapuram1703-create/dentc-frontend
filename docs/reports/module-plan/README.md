# Reports & Analytics module - master plan

Start here. This page explains the plan in plain language and points to the document that holds each detail.
Numbers in section 2 come only from [plan_inputs/facts.md](plan_inputs/facts.md) and the effort table of
[work_items.md](work_items.md); durations come from [12_roadmap.md](12_roadmap.md) and always name their staffing assumption.

## 1. What this is

The goal is a Reports & Analytics module for DentC that reproduces every report, filter and option of the legacy tool
(Denticon by Planet DDS) and then goes further: KPI dashboards, worklists that lead to action, scheduled delivery,
office comparison, a custom report builder and an assistant. To design it we analysed the legacy criteria screenshots
(16 categories), the DentC frontend and backend code and data, the vendor's public documentation, external research on
dental KPIs and analytics products, and the two reference dashboards. This folder holds the binding design brief (00),
seven design documents (02-08), the generated legacy inventory (01) and parity matrix (09), 17 report catalogs (16 legacy
families and the new analytics reports), the 825-item work register, the backend and frontend plans (10, 11) and the
phase-by-phase roadmap (12).

Terms used on this page:

| Term | Meaning |
|---|---|
| AD-n / PD-n | Architecture decision / product default of the brief ([00_design_brief.md](00_design_brief.md)); binding unless you change a PD |
| RG-n, G-n, BD-02, 08 OD-11 | Gap or open decision: RG = roadmap §11, G = this page §10, BD = brief, `08 OD-11` = open decision 11 of document 08 |
| Work item, register | One unit of work with an id (for example `DATA-57`), phase and size; the register ([work_items.md](work_items.md)) lists all 825 |
| Size S / M / L / XL | S up to 2 engineer-days, M up to 1 week, L up to 2 weeks, XL more; the register counts them as 2 / 5 / 10 / 20 engineer-days |
| Engineer-day | One engineer working one day; effort figures on this page are register sizes, an order of magnitude, not an estimate |
| S6 / S10 | Staffing scenarios of the roadmap: 6 or 10 backend engineers plus frontend, QA and client-success roles (section 4) |
| Gate G0..G5 | The sign-offs that must pass before the next phase is switched on for a client, for example a closed month, the accountant's countersignature, a 14-day rights readiness window; report comparisons are signed by the pilot's billing lead and accountant (financial) or office manager (operational) and countersigned by the product owner ([roadmap preamble](12_roadmap.md), §4.5) |
| M0.8, W3.0..W3.4, EX2-1b | Roadmap milestone, delivery wave inside P3, exit criterion of a gate |
| Canonical ledger | One table of every money movement with one sign convention, from which every balance and money report is computed |
| Bridge per account | A signed list that explains, account by account, why a balance changes when the canonical ledger replaces today's formulas |
| Roll-ups | Nightly pre-computed totals so dashboards answer in about a second |
| Rights in observation mode | Report rights are evaluated and logged but not yet enforced ("shadow"), so missing grants are found before switch-on |
| Data classes | A label per column (for example PHI, financial, contact) that decides masking, export and audit |
| Patient manifest | The list of patients whose data a run, export or delivery contained, stored with the audit record |
| Definition lint | An automatic check that refuses a report definition whose parameters do not match its legacy parity file |
| Golden cases | Fixed test data with known correct totals that every money report must reproduce |
| `report_key`, `rpt_*` | Stable name of a report (`daily.production_report`); reporting views in the database (`rpt_ledger_entries` ...) |
| `unknown_legacy` | A legacy control whose behaviour could not be read from the screenshots or documentation; confirmed on the live tool |
| UCR, A/R, BAA | Usual, customary and reasonable (office) fee; accounts receivable; business associate agreement (HIPAA contract with a vendor) |
| Tenant | One client organisation; each has its own service and database |
| XLSX | Excel file format |

## 2. The numbers

| What | Count | Source line in facts.md |
|---|---|---|
| Legacy categories / legacy reports | 16 / 118 | Legacy parity |
| Legacy criteria controls mapped | 1,054 (1,025 read from screenshots + 29 added from vendor documentation) | Legacy parity |
| Show / hide / enable rules mapped | 49 | Legacy parity |
| Control status | replicated 459, replicated with additions 541, superseded 26, help text 8, still to confirm on the legacy tool 20 | Legacy parity |
| Legacy reports per phase | P1 22, P2 26, P3 70 | Legacy parity |
| New analytics reports | 49 | New analytics reports |
| Metric keys | 340 (see gap G-1) | Metrics and dashboards |
| Dashboards | 16 | Metrics and dashboards |
| Work items | 825 in total; register problems 19, all phase inversions, still open in the register; the roadmap ships the affected parts later as known gaps (EX2-1b, W3.0; RG-04, decision 13) | Work items |

| Phase | P0 | P1 | P2 | P3 | P4 | P5 | Total |
|---|---|---|---|---|---|---|---|
| Work items | 89 | 194 | 174 | 311 | 41 | 16 | 825 |
| Engineer-days (register, S=2, M=5, L=10, XL=20; `work_items.md` effort table) | 477 | 846 | 898 | 1,225 | 257 | 104 | 3,807 |
| Relative effort points (S=1, M=3, L=8, XL=15; `facts.md`) - relative size, not days | 320 | 541 | 598 | 768 | 178 | 71 | 2,476 |

P3 is the heaviest phase; the roadmap releases it in five waves (W3.0..W3.4). Durations in section 4 use engineer-days.

## 3. The module in one page

| Part | What it is | Design document |
|---|---|---|
| Hub | One Reports area: search by report name and legacy alias, favorites and recents, category pages that look like the legacy screens, Library, Dashboards, Worklists, Schedules, Runs, Goals, Glossary, Builder, Administration, links to correspondence and forms. The Reports menu keeps the legacy order and names. | [07_ux_blueprint.md](07_ux_blueprint.md) §1-§3 |
| Runner and results | One generic page runs any report from its served definition: "classic" frame (legacy layout) or "enhanced" frame; result table with grouping, totals, drill to the record, chart and matrix views; PDF, XLSX and CSV from the same stored run. | [07_ux_blueprint.md](07_ux_blueprint.md) §4-§6 |
| Engine | Every report runs on the server (AD-1) from a declarative definition (AD-2). Fast runs return at once; slow runs go to a worker and notify the user; results are stored so screen and files always agree. | [02_architecture.md](02_architecture.md) |
| Filters | 1,054 legacy controls reduce to a shared set of parameter types and components (office or office group, providers, date ranges with a stated date basis, code pickers, output options), each with the legacy options and defaults. | [04_filter_framework.md](04_filter_framework.md) |
| Data layer | A canonical ledger of every money movement and reporting views (`rpt_*`) over indexed tables, reconciled against on-screen balances before any money report ships (AD-10); nightly roll-ups and snapshots later (AD-3). | [03_data_foundation.md](03_data_foundation.md) |
| KPIs | A governed metric registry: each KPI defined once (formula, date basis, attribution, direction, targets) and reused by dashboards, reports, alerts, builder and assistant. Definitions practices disagree on are organisation settings. | [05_metric_catalog.md](05_metric_catalog.md) |
| Dashboards | 16 dashboards (Main, Provider, My, Morning Huddle, production, collections and A/R, insurance, schedule, hygiene, treatment, patients, referrals, ortho, multi-office, executive, front office); every tile drills to a report that reconciles with it; goals, scorecards, alerts. | [06_dashboards.md](06_dashboards.md) §1-§5, §7 |
| Worklists | The legacy "Interactive Reports" become live work queues (recall due, unscheduled treatment, outstanding and denied claims, patient A/R, unsigned notes, ...) with outcomes, follow-ups and bulk text, e-mail and letters. | [06_dashboards.md](06_dashboards.md) §6 |
| Schedules and sharing | Saved views on the server, scheduled runs and digests, e-mail that carries only a login link (PD-12), sharing under the viewer's own rights. | [02_architecture.md](02_architecture.md) §8-§9, [07_ux_blueprint.md](07_ux_blueprint.md) §6 |
| Builder | Practices build their own reports from governed datasets with the same scope and exports; the legacy "Office Reports" become custom reports; custom KPIs. | [06_dashboards.md](06_dashboards.md) §9, [02_architecture.md](02_architecture.md) §11 |
| Assistant | Answers questions only through the metric registry (never free SQL), verifies every number, aggregates by default, can be switched off per client (PD-14). | [06_dashboards.md](06_dashboards.md) §8, [08_security_compliance.md](08_security_compliance.md) §9 |
| Security | A right per report and dashboard, office scope and provider restriction enforced on the server, data classes on columns, every run, export and delivery audited with a patient manifest. | [08_security_compliance.md](08_security_compliance.md) |

## 4. The phases at a glance

Durations are build weeks from [12_roadmap.md](12_roadmap.md) §1 under two staffing scenarios: **S6** = 6 backend
engineers, 3 / 2 / 1 / 2 / 3 / 3 frontend engineers in P0..P5, QA 0.5-1, client-success 0.5; **S10** = 10 backend, 3
frontend in every phase, same QA. They are a floor, not a commitment: gate allowances, the XL range and contingency come
on top (roadmap §1). No calendar dates are given. Effort is register engineer-days.

| Phase | Outcome for the practice | Legacy reports at parity | New reports / dashboards / worklists | Items / engineer-days | Weeks S6 / S10 | Gate checks (summary) | Details |
|---|---|---|---|---|---|---|---|
| P0 Foundations and correctness | Balances include in-app insurance money (PD-2); new hub and Reports menu; three of today's six reports on the engine without row caps (the other three early in P1, RG-02); security defects closed; rights in observation mode | 0 | 0 / 0 / 0 | 89 / 477 | 20 / 19 | G0: balance bridge signed; ledger and balance reconciliation (R-01..R-04, R-10a, R-12, R-13) green; three reports on the engine | [roadmap P0](12_roadmap.md#p0---foundations-and-correctness) |
| P1 Daily financial core | Daily, Ledger, My Reports and Statements at legacy parity; PDF / XLSX / CSV; saved views and favorites on the server; Main, Provider and My dashboards | 22 | 2 / 3 / 1 | 194 / 846 | 39 / 24 | G1: legacy output comparison signed for six reports; allocation and ageing reconciliation (R-05, R-06, R-14, R-14b) green | [roadmap P1](12_roadmap.md#p1---daily-financial-core) |
| P2 Month-end, A/R and insurance | Monthly, Management and Insurance at parity; day close, period lock, deposits; background runs; scheduled delivery; production, collections and A/R, insurance and executive dashboards | 26 | 21 / 4 / 1 | 174 / 898 | 46 / 27 | G2: closed months reproduce; known gaps of EX2-1b recorded with their closing items; background runs on for the main client | [roadmap P2](12_roadmap.md#p2---month-end-ar-and-insurance) |
| P3 Scheduling, clinical, patients and lists | Every remaining legacy report; worklists with bulk outreach; Morning Huddle; production goals; topic dashboards | 70 | 18 / 8 / 17 | 311 / 1,225 | 60 / 36 | G3: all 118 legacy reports registered; EX2-1b gaps closed | [roadmap P3](12_roadmap.md#p3---scheduling-clinical-patients-and-lists) |
| P4 Analytics depth | Dashboards from roll-ups in about a second; targets and bands; ranked scorecards; office comparison; alerts | 0 (enhancements) | 8 / 1 / 0 | 41 / 257 | 13 / 13 | G4: 14 nightly roll-up rebuilds reconcile (R-16) | [roadmap P4](12_roadmap.md#p4---analytics-depth) |
| P5 Builder and assistant | Custom reports and KPIs; legacy Office Reports per organisation; assistant behind a kill switch | Office Reports per organisation | 0 / 0 / 0 | 16 / 104 | 13 (up to 19) / 13 (up to 19) | G5: module definition of done | [roadmap P5](12_roadmap.md#p5---builder-and-assistant) |
| Total | | 118 | 49 / 16 / 19 | 825 / 3,807 | 191 / 132 | | [roadmap §10](12_roadmap.md#10-definition-of-done-for-the-module) |

Each phase is switched on for a client only after the previous gate passed; the main client is the pilot
([roadmap §4](12_roadmap.md#4-release-and-rollout)). Full gate criteria (EX*, X*): roadmap, exit criteria of each phase.
Work breakdown: [10_backend_plan.md](10_backend_plan.md), [11_frontend_plan.md](11_frontend_plan.md); every item with its
phase and size: [work_items.md](work_items.md).

## 5. How legacy parity is guaranteed, and how to verify it yourself

| Step | What it is | Where |
|---|---|---|
| 1. Inventory | Every legacy criteria screen transcribed from the screenshots: report, section, control, options, default, greyed state; every control gets a stable id | [legacy/*.json](legacy/), [legacy/index/](legacy/index/), readable copy [01_legacy_inventory.md](01_legacy_inventory.md) |
| 2. Supplement | Controls, option values and show / hide rules that the screenshots do not show, taken from vendor documentation with quotes; merged into the index | [legacy/supplement/](legacy/supplement/), readable copy [legacy/supplement.md](legacy/supplement.md) |
| 3. Parity files | For every legacy control: the new parameter, its type, each legacy option mapped to a new value, the default, the status (replicated, with additions, superseded, help text, to confirm) | [catalog/parity/*.parity.json](catalog/parity/), built from [catalog/skeleton/](catalog/skeleton/) + [catalog/decisions/](catalog/decisions/) |
| 4. Specifications | One section per legacy report with columns, layout, data rules, open questions and work items; the parity table is generated into it | [catalog/*.md](catalog/) |
| 5. Matrix | Generated proof: every report with its `report_key` and phase, every control not copied one-to-one with the reason, deliberate default changes, action buttons, vendor additions, screens still to confirm | [09_parity_matrix.md](09_parity_matrix.md) |
| 6. In the product | The definition lint refuses a report whose parameters do not match its parity file (ENG-18, FLT-27); a parity default test checks the untouched form; a signed parity record per report (`docs/reports/parity_records/<report_key>.json`, M0.8) holds the legacy print comparison | [12_roadmap.md](12_roadmap.md) §5 |

Commands (run in Git Bash or another POSIX shell with Python 3 on the PATH, from `docs/reports/module-plan`; read-only
checks, safe to run any time):

```sh
# every legacy control of every category is mapped (16 categories)
for c in appointment_reports daily_reports insurance_reports ledger_reports management_reports montly_reports my_reports ortho_reports patients_list_reports providers_list_reports recall_reports refferal_reports security_list_reports setup_list_reports statements_reports treatmentplan_reports; do
  python -I tools/validate_parity.py legacy/index/$c.controls.json catalog/parity/$c.parity.json | head -1
  python -I tools/validate_catalog_doc.py . $c | head -1
done
# every vendor-documentation supplement and picker file carries its quotes
for f in legacy/supplement/*.supplement.json; do python -I tools/validate_supplement.py . $f | head -1; done
for f in legacy/supplement/pickers.*.json; do python -I tools/validate_pickers.py . $f | head -1; done
python -I tools/validate_signature_map.py legacy/index/signatures.json legacy/index/signature_map.json
python -I tools/check_plan_coverage.py .     # backend and frontend plans schedule every register item
```

Expected: 16 x `PARITY VALID`, 16 x `CATALOG VALID`, 16 x `SUPPLEMENT VALID`, 5 x `PICKERS VALID`,
`SIGMAP VALID mapped_signatures=358/358 ... controls_covered=1025/1025`,
`COVERAGE VALID register=825 10_backend_plan.md=825 11_frontend_plan.md=307` (the frontend plan lists only items with
frontend work). Not mechanically checked: `catalog/analytics_reports.md` (the 49 new reports) and
`catalog/other_menu_entries.md` have no structural validator (gap G-11). Regenerating files: section 9.

## 6. What we need from you (the product owner)

Decisions with recommended defaults, grouped by the latest moment they must be settled. Every design document is written
against the default; full list with the effect of a different answer: [roadmap §6](12_roadmap.md#6-decisions-needed).

| # | Decision | Recommended default | Settle by |
|---|---|---|---|
| 0 | Staffing scenario (every duration in section 4 depends on it) | S10 (staff report definitions first, risk R-04: 132 instead of 191 build weeks); under S6 at least 2 frontend engineers in P2 instead of 1 (single point of failure, risk R-19) | Before P0 |
| 1 | Event capture start (appointment, claim and treatment history cannot be back-filled) | Start the additive capture in P0 week 1 (RG-11); otherwise accept about 20 weeks of empty event-based columns | Before P0 |
| 2 | PD-2 in-app insurance payments in balances | Fix in P0 through the canonical ledger; balances users see will change, bridge per account signed | Before P0 |
| 3 | PD-1 / PD-3 production and collections basis; class of each payment and adjustment code | Keep posted fee and UCR; collections exclude adjustments and transfers, net of refunds; accountant signs the code classes | Provisional before P0, final before MET-04 |
| 4 | PD-10 / PD-11 report rights and provider restriction | Rights per category with per-report override; View Only runs and views; `report_access_provider_id` restricts My Reports and provider dashboards | Before P0 (PD-11 by P0 mid-point) |
| 5 | Office rule for users with no office assignment (roadmap §6.2, Security) | Strict (08 rule S-3) | Before P0 |
| 6 | Denticon export, control totals and legacy access (RG-12, RG-16) | Reload the 87,585 skipped migrated charges (DATA-57); offices print control totals for comparison months; move the export feasibility decision DATA-50 to P0; legacy-tool and export access with an end date per client becomes a P0 entry condition | Before P0 |
| 7 | Pilot organisation and named accountant | The main client; an office manager, billing lead and accountant who sign comparisons | Before P0 |
| 8 | PD-4..PD-8 ageing, active patient window, office and provider attribution, date basis | Brief defaults (18-month window, oldest-first ageing, office of service, treating provider, service date on dashboards) | Before P1 |
| 9 | BD-02 large statement batches in P1 | Keep statements in P1; oversized batches split by name range until background runs (P2) | Before P1 |
| 10 | PD-15 letters, postcards, labels and forms; and RG-21 | Stay with their owning features, the hub links to them; confirm whether this programme still builds the merge engine and templates (RPT-MENU-04, RPT-MENU-05, RPT-MENU-11, RPT-MENU-12, RPT-MENU-13) and whether RPT-MENU-11 belongs in P4 | Before P1 |
| 11 | PD-9 day close and period lock | New operational features, reversible by an administrator with audit; snapshots for point-in-time KPIs | Before P2 |
| 12 | PD-12 scheduled delivery | Login-gated link, no patient data in attachments | Before P2 |
| 13 | RG-04 register phase inversions (roadmap [§6.2](12_roadmap.md#62-remaining-open-decisions-of-the-design-documents-de-duplicated) Sequencing row 2) | Register kept, parts held (shipped as known gaps). Alternative recommended by the roadmap: move ENG-49 and SEC-36 to P2; move RPT-NEW-27, RPT-NEW-48, RPT-NEW-76 to P4; split RPT-DAILY-18 / RPT-DAILY-71 and the action parts of RPT-INS-07 / RPT-INS-77 | P2 planning |
| 14 | PD-13 benchmarking scope | Across offices and groups inside one organisation; no cross-organisation percentiles | Before P4 |
| 15 | PD-14 assistant scope | Registry only, never free SQL; aggregates by default | Before P5 |
| 16 | Assistant vendor route and BAA (08 OD-11) | Must be decided; the assistant stays off until then | Before P5 |
| 17 | "Optional pilots" in the brief's P5 (RG-08) | Define them or drop them; not planned today | Before P5 |

Legacy captures still needed (each owned by a work item, done one phase before the family is built;
full list [roadmap §7](12_roadmap.md#7-information-to-capture-from-the-live-legacy-tool), screens in
[09_parity_matrix.md](09_parity_matrix.md) §8):

- P0: the 13 menu entries without screenshots, including each organisation's Office Reports (FLT-23, RPT-MENU-01); Denticon control totals per office and month (DATA-57); the 20 controls still `unknown_legacy`.
- P1 families: Daily (RPT-DAILY-09), My Reports (RPT-MY-04), Ledger (RPT-LEDGER-07), Statements (RPT-STMT-09) open criteria questions and sample prints.
- P2 families: Monthly (RPT-MONTHLY-23, RPT-MONTHLY-52), Insurance (RPT-INS-09), Management: Audit Type and Module Type lists (RPT-MGMT-16); Payment Plan Charges print and Uncollected Copay Detail columns owned by FLT-23 until a verification item is added to `catalog/management_reports.md` (gap G-9).
- P3 families: cut-off screens (Treatment Plan Proposal, External Outgoing and Internal Referral Management), Appointment, Recall, Treatment Plan, Ortho, Referral and the four Lists families (RPT-APPT-09, RPT-RECALL-06, RPT-TX-04, RPT-ORTHO-06, RPT-REF-08, RPT-PLIST-09, RPT-PRLIST-09, RPT-SLIST-09, RPT-STLIST-09).
- Sample prints of the reports whose legacy output we could only infer (roadmap §5.4); if legacy access is ending, capture all phases in one pass, prints first.

## 7. Findings about today's system that shaped the plan

| # | Finding | Evidence |
|---|---|---|
| 1 | Today's six reports run in the browser and stop at 600-1,600 rows, so totals are wrong above the cap; exports carry no notice and no audit | [analysis/fe_existing_reports.md](analysis/fe_existing_reports.md) |
| 2 | Insurance payments posted in DentC are missing from every balance, collections and A/R figure; six balance formulas disagree | [analysis/be_data_financial.md](analysis/be_data_financial.md), [analysis/be_existing_reporting.md](analysis/be_existing_reporting.md) |
| 3 | There is no ledger table: money sits in eight stores with two sign conventions; legacy payment and adjustment codes were not migrated | [analysis/be_data_financial.md](analysis/be_data_financial.md) |
| 4 | Existing `/reports/*` routes accept any office and enforce no report right; report runs are not audited | [analysis/be_existing_reporting.md](analysis/be_existing_reporting.md) (office and rights), [analysis/be_platform.md](analysis/be_platform.md) (audit) |
| 5 | No job queue, worker, scheduler, XLSX writer or saved definitions; 30 s statement and 120 s request limits | [analysis/be_platform.md](analysis/be_platform.md) |
| 6 | Fact tables (about 1.37 M charges, 1.33 M payments) have no `tenant_id` and no reporting indexes | [analysis/be_platform.md](analysis/be_platform.md) |
| 7 | Appointment and claim status are free text with no history; migrated rows carry the migration time as created date | [analysis/be_data_scheduling.md](analysis/be_data_scheduling.md), [analysis/be_data_insurance.md](analysis/be_data_insurance.md) |
| 8 | No deposit, day close, period lock or snapshot exists, so closed months cannot be reproduced today | [analysis/be_data_financial.md](analysis/be_data_financial.md) |
| 9 | Frontend has no data grid, virtualisation, date library, code splitting or error boundary; saved views are wiped at logout; rights gating is built but off | [analysis/fe_cross_cutting.md](analysis/fe_cross_cutting.md) |
| 10 | Statements, batch letters and many server PDFs exist in the API with no screen; labels and scheduler prints exist nowhere | [analysis/fe_report_like_outputs.md](analysis/fe_report_like_outputs.md) |

All findings in one place: [analysis/00_findings_digest.md](analysis/00_findings_digest.md).

## 8. Document map

Readers: PO = product owner, BE = backend, FE = frontend, QA.

| File or folder | What it is | Who |
|---|---|---|
| `README.md` | This page | All |
| [00_design_brief.md](00_design_brief.md) | Binding decisions (AD-*), product defaults (PD-*), names, phase skeleton | All, PO first |
| [01_legacy_inventory.md](01_legacy_inventory.md) | Every legacy report, control, option and default (generated) | QA, BE |
| [02_architecture.md](02_architecture.md) | Engine, definitions, run lifecycle, exports, schedules, worker topology, API, testing | BE, FE |
| [03_data_foundation.md](03_data_foundation.md) | `rpt_*` datasets, money normalisation, repairs, schema additions, indexes, roll-ups, reconciliation | BE |
| [04_filter_framework.md](04_filter_framework.md) | Parameter types and components for every legacy control, dependency rules, defaults (partly generated by `tools/filter_map_generator/`, section 9) | BE, FE |
| [05_metric_catalog.md](05_metric_catalog.md) | Every KPI, formulas, organisation settings, goals, benchmarks | PO, BE |
| [06_dashboards.md](06_dashboards.md) | Dashboards, worklists, goals, alerts, assistant, builder from the user's view | PO, FE, BE |
| [07_ux_blueprint.md](07_ux_blueprint.md) | Hub, routes, menu, runner, results, frontend structure, libraries, migration | FE, PO |
| [08_security_compliance.md](08_security_compliance.md) | Rights, office scope, data classes, audit, export controls, defects to fix first | BE, QA |
| [09_parity_matrix.md](09_parity_matrix.md) | Generated proof of legacy coverage | PO, QA |
| [10_backend_plan.md](10_backend_plan.md) / [11_frontend_plan.md](11_frontend_plan.md) | Epics, tracks, staffing, exit criteria per phase | BE / FE |
| [12_roadmap.md](12_roadmap.md) | Phases, milestones, gates, rollout, parity acceptance, decisions, captures, risks, definition of done | PO, all |
| [13_agent_prompts.md](13_agent_prompts.md) | Copy-paste prompts that drive the implementation with a coding agent, session by session, in plan order | engineers |
| [work_items.md](work_items.md) / `work_items.json` | The register: every work item with phase, size, dependencies, source (generated) | BE, FE |
| [name_check.md](name_check.md) | Names used by one document but not defined by their owner (generated) | BE, FE |
| [plan_inputs/](plan_inputs/) | `facts.md` (generated counts), `design_summaries.md` (summary of every document), `needs_from_other_docs.md` (requests between documents) | All |
| [catalog/](catalog/) | One specification per legacy family (`daily_reports.md` ... `my_reports.md`), `analytics_reports.md` (49 new reports), `other_menu_entries.md` (menu entries without screenshots); edited directly, they are the source of truth | BE, FE, QA |
| `catalog/parity/`, `catalog/skeleton/`, `catalog/decisions/` | Parity files, their generated skeletons and the authors' mapping decisions | QA, BE |
| `catalog/parts/` | Historical source parts of the first assembly; stale (gap G-10), do not regenerate from them | Authors |
| `catalog/reference/` | Reference cards extracted from the design documents (generated) | Authors |
| [legacy/](legacy/) | Screenshot transcription (`*.json`), control index and signature map (`index/`), vendor-documentation supplement (`supplement/`, `supplement.md`) | QA, BE |
| [analysis/](analysis/) | Verified maps of today's frontend, backend, data and the reference dashboards; start with `00_findings_digest.md` | BE, FE |
| [research/](research/) | KPI dictionary, competitor teardown, analytics UX patterns, vendor analytics, compliance and financial semantics, architecture options, legacy output layouts | PO, all |
| [tools/](tools/) | Python generators and validators (section 9); `filter_map_generator/` builds the signature map and parts of 04 | Authors |
| `bash.exe.stackdump` | Stray crash dump, not part of the plan (gap G-7) | - |
| `../reports_audit.md`, `../reports_backend_devreport.md` | Earlier audit and gap notes of the old Reports screens, superseded by this folder | BE, FE |

## 9. How to keep the plan current

Fully generated files are never hand-edited: `01_legacy_inventory.md`, `09_parity_matrix.md`, `work_items.md` /
`work_items.json`, `plan_inputs/facts.md`, `name_check.md`, `legacy/index/*`, `legacy/supplement.md`,
`catalog/parity/*`, `catalog/skeleton/*`, `catalog/reference/*`. Change their source and re-run the chain from the step
that owns it. The catalog documents (`catalog/<family>.md`, `catalog/analytics_reports.md`) are edited directly; only
their parity tables are generated. Run from `docs/reports/module-plan` in Git Bash, with `python -I`.

| Order | Command | Writes | Re-run when |
|---|---|---|---|
| 1 | `tools/make_control_index.py legacy legacy/index` | `legacy/index/*.controls.json` (screenshot inventory only: this removes the supplement, so step 4 must follow) | A screenshot transcription changes |
| 2 | `tools/summarize_controls.py legacy/index legacy/index` | `control_patterns.md`, `signatures.json` | Only when the screenshot inventory changes, after 1 and before 4 (it must read the index without the supplement) |
| 3 | `tools/filter_map_generator/make_all.py map`; copy `out/signature_map.json` into `legacy/index/` by hand (FLT-22). `make_all.py doc` writes `out/04_filter_framework.md`; copy into `04_filter_framework.md` by hand | In `tools/filter_map_generator/`: `gen_head.py` (from `rev1_gen.py`), `gen_map.py`, `doc_template.md`, `out/signature_map.json`, `out/derived.json`, `out/04_filter_framework.md` | Shared parameter mapping changes; before 4 (reads the screenshot inventory) |
| 4 | `tools/apply_supplement.py .` | merges `legacy/supplement/*.json` into `legacy/index/*.controls.json` (removes its earlier additions first) | A vendor supplement changes, and always after 1; never follow it with 2 |
| 5 | `tools/render_legacy_md.py legacy 01_legacy_inventory.md`; `tools/render_supplement_md.py . legacy/supplement.md` | readable inventory and supplement | After 1 or 4 |
| 6 | `tools/make_parity_skeleton.py legacy/index catalog/skeleton` | `catalog/skeleton/*` | After 3 or 4 (needs the supplement applied) |
| 7 | `tools/build_parity.py . <category>` | `catalog/parity/<category>.parity.json` | A `catalog/decisions/*` file or a skeleton changes |
| 8 | `tools/assemble_catalog.py . <category>` (without `--force`: regenerates only the parity tables) or `tools/render_parity_tables.py` | parity tables inside `catalog/<family>.md` | After 7. Never run `assemble_catalog.py --force` or `tools/concat_parts.py catalog/parts/analytics_reports catalog/analytics_reports.md`: the parts are stale (G-10) and would overwrite direct edits, including four new-report specifications and their RPT-NEW work items |
| 9 | `tools/render_parity_matrix.py legacy/index catalog/parity 09_parity_matrix.md` | `09_parity_matrix.md` | After 7 or 8 |
| 10 | `tools/collect_work_items.py . --strict` | `work_items.md`, `work_items.json` | Any work-item table changes. Expected today: exit 1 listing the 19 phase inversions of RG-04 (files are still written); any other problem must be fixed before continuing |
| 11 | `tools/check_plan_coverage.py .`; `tools/check_names.py .` | `name_check.md` | After 10 or any rename |
| 12 | `tools/make_facts.py .` | `plan_inputs/facts.md` | Last, after 9 and 10; then update the numbers in this page, 10, 11 and 12 |
| - | `tools/make_reference_pack.py .` | `catalog/reference/*` | A design document changes and catalog authors need fresh cards |

`plan_inputs/design_summaries.md` and `plan_inputs/needs_from_other_docs.md` have no generator (gap G-5); update them by
hand when a design document is revised.

## 10. Gaps found in the design

The roadmap's own list is [12_roadmap.md §11](12_roadmap.md#11-gaps-found-in-the-design) (RG-01..RG-23). Found while
writing this page:

| # | Gap or contradiction | Where |
|---|---|---|
| G-1 | `facts.md` counts 340 metric keys in 05; 05 itself states 261 (227 fixed, 9 aliases, 21 slices, 4 synonyms). The counter in `tools/make_facts.py` and 05 disagree | facts, 05 |
| G-2 | 07 §1.2 says 15 worklists in 06 §6; 06 and the roadmap name 19 (17 in P3, `worklists.not_reappointed` P1, `worklists.day_close_checklist` P2) | 07, 06, 12 |
| G-3 | `facts.md` has no worklist count and no output-evidence count, so this page cannot quote them (see also RG-15) | `tools/make_facts.py` |
| G-4 | Two effort scales coexist: points S=1/M=3/L=8/XL=15 (`facts.md`) and engineer-days S=2/M=5/L=10/XL=20 (`work_items.md`, 12); this page uses engineer-days for durations | facts, register, 12 |
| G-5 | `plan_inputs/design_summaries.md` has an empty block for `analytics_reports.md`, and neither it nor `needs_from_other_docs.md` can be regenerated by a tool | plan_inputs |
| G-6 | 07 names 18 parameter types (04 as of an earlier revision); the 04 summary states 17 | 07, 04 |
| G-7 | A stray `bash.exe.stackdump` sits in the plan folder | folder |
| G-8 | `tools/filter_map_generator/make_all.py` writes the signature map and 04 only to its own `./out` (plus `gen_head.py`, `gen_map.py`, `doc_template.md` in its folder), so the chain has two manual copies (signature map, FLT-22 still open; 04) | tools |
| G-9 | The Management family has no general live-verification item: RPT-MGMT-16 covers only the Audit Type and Module Type lists; Payment Plan Charges print and Uncollected Copay Detail columns have no owner. Roadmap §7 and RG-20 name RPT-MGMT-01..RPT-MGMT-04 (skeleton, hub page, security profile, availability warnings) as the capture owners | `catalog/management_reports.md`, 12 §7, RG-20 |
| G-10 | `catalog/parts/analytics_reports/` is out of sync with `catalog/analytics_reports.md`: the document holds four specifications the parts lack (`insurance.claims_backlog_trend`, `analytics.cross_office_patient_flow`, `insurance.estimate_accuracy_analysis`, `statements.statement_collection_effectiveness`) with their RPT-NEW items; re-running `concat_parts.py` would drop them and leave 45 new reports in the register | catalog/parts, catalog |
| G-11 | `catalog/analytics_reports.md` and `catalog/other_menu_entries.md` have no structural validator; `tools/validate_catalog_doc.py` accepts only the 16 legacy categories | tools |
