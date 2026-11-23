# Competitor Teardown — Dental Analytics and Reporting Products

Research date: 2026-11-21. Audience: engineers and product designers planning the Reports & Analytics module.
Scope: 15 named products plus 3 adjacent entrants — what each ships (catalog, filters, standout features), how results
become actions, what users complain about, and what is worth adopting. KPI formulas are deliberately not repeated here;
see the sibling `dental_kpi_dictionary.md`.

## 0. How to read this

| Tag | Meaning |
|---|---|
| (H) | Vendor help-center / manual page retrieved and read |
| (M) | Vendor marketing page retrieved and read |
| (P) | Press release or trade-press article retrieved |
| (S) | Search-result snippet only — the page blocked retrieval or was not opened. Lower confidence |
| (R) | Review-site aggregate (G2, Capterra, Software Advice) seen through search snippets; these sites block direct retrieval |
| [unverified] | Not confirmed in any source reviewed |

- Source keys such as `[DI-4]` resolve in section 9.
- "Not found" never means "absent". Vendor feature names and packaging change often; marketing pages overstate.
- Planet DDS help pages return HTTP 403 to fetchers; they were read through the public Help Center JSON API
  (`support.planetdds.com/api/v2/help_center/en-us/articles/<id>.json`). The human-readable URL is cited.

---

## 1. Executive takeaways

1. **Two product families.** (a) Analytics overlays that read someone else's PMS (Dental Intelligence, Practice by
   Numbers, Jarvis, Weave, Adit, Sikka). (b) Reporting native to the PMS (Dentrix, Dentrix Ascend, Open Dental,
   Eaglesoft, Curve, CareStack, tab32, Denticon, Oryx). Overlays win on UX and actionability; natives win on trust.
2. **The #1 complaint about overlays is "numbers do not match the PMS"**, caused by nightly syncs and independent
   metric definitions. Vendors publish reconciliation guides to cope `[DI-13][DI-14][DEN-4]`. A native module with one
   governed metric layer (dashboards and reports computing from the same definitions) removes the largest pain in the market.
3. **Every analytics-first product ships the same five things:** a morning huddle, provider scorecards, goal tracking,
   opportunity lists (unscheduled treatment / recall / A/R), and drill-down to patients. These are table stakes.
4. **The legacy tool's own analytics layer is the easiest thing to beat.** Denticon Practice Analytics (DPA) is Microsoft
   Power BI Embedded, refreshes about 1 AM PST, has 8 fixed dashboards, and explicitly cannot create metrics, visuals,
   tables or reports `[DEN-1][DEN-2]`.
5. **Legacy PMS reporting = large catalogs of parameterized print reports.** Eaglesoft V16 documents 180 reports in 9
   content categories `[ES-1]`; Open Dental lists 50+ standard reports plus raw SQL `[OD-2][OD-4]`. Complaints are
   findability and static output, not missing data.
6. **2026 is the year of natural-language assistants.** Dental Intelligence Explorer (public June 2026), Dentrix Ascend
   MCP "Ask" (preview, April 2026), Archy Intelligence, Sikka DentalLLM, Practice by Numbers PiQ / RiQ Assistants
   `[DI-7][DI-16][ASC-8][AR-1][SK-1][PBN-7]`.
7. **Predictive patient scoring has arrived.** Dental Intelligence Attendance Score and Acceptance Score `[DI-11]`;
   Denticon Patient Insights (no-show / late-cancel risk, via Truro Analytics) `[DEN-9]`.
8. **Custom report builders are where users complain most** (Dentrix Ascend Power Reporting: confusing, multiple paths
   yielding different numbers) `[ASC-R1]`. A builder needs templates, guardrails and one semantic model.
9. **Closing the loop is the frontier:** list -> task -> outreach -> outcome -> attributed dollars. Dental Intelligence
   "Team Tasks Results" reports scheduled and collected dollars per task and per team member `[DI-11]`; Practice by
   Numbers logs call outcomes `[PBN-2]`.
10. **In-product benchmarks are rare and shallow.** Practice by Numbers shows percentile ladders (not normalized for
    size or region) `[PBN-6]`; Weave shows Top / Average / Your Practice `[WV-1]`; Sikka sells zip-level fee
    percentiles `[SK-3]`. Cross-office benchmarking inside one organization is a low-risk first step.
11. **Scheduled delivery is thinly documented market-wide** (Dental Intelligence auto-emails Daily/Weekly/Monthly
    reports; Jarvis emails Morning Huddle and End of Day) `[DI-9][JAR-2]`. A solid subscription engine is a cheap differentiator.
12. **Open data access matters to DSOs:** tab32 exposes a BigQuery warehouse with direct SQL and BI connectors
    `[T32-1]`; Open Dental exposes SQL with 1,000+ example queries `[OD-4]`; Denticon offers a direct data share on request `[DEN-2]`.

---

## 2. Product teardowns

### 2.1 Dental Intelligence (DI) — analytics overlay, market reference

Positioning: end-to-end "practice performance" platform (analytics + engagement + payments + AI); vendor claims 10,000+
practices `[DI-1][DI-12]`. Integrations listed: Eaglesoft, Dentrix, Dentrix Ascend, Denticon, Fuse, Open Dental `[DI-1]`.

| Surface | What it shows | Evidence |
|---|---|---|
| **Performance Board** | 9 tiles: Appointments, Production, Unscheduled Patients (pie by months since last visit: 0-6, 6-9, 9-12, 12-18, 18+), Restorative/Elective Case, Hygiene Case, New Patients (with Lost, Recaptured, Net Growth), Hygiene Re-Appointment, Cancellations, No-Shows. Total / Restorative / Hygiene / Other views. Ticker of up to 14 metrics (Prior Day's Production, Today's and Tomorrow's Scheduled Production, Active Patients, Pre-Appointment %, Perio Patient %, Production per Visit 90-day avg, YTD figures) | `[DI-4]` (H) |
| **Provider Pulse** | Per-provider Production, Production Same Day %, Production Per Hour / Day / Visit, Collections, Collections Same Day, Perio Presented % / Acceptance % / Visit %, Hygienist Visits Per Hour, Hygiene Re-Appointment %, Fluoride Treatment %, Presented %, Presented Dollars Average, Acceptance %, Acceptance % Dollars (and Same Day) | `[DI-3]` (H) |
| **Collections Board** | AR Aging (Accounts Receivable, Past Due, Patients Past Due, Est. Patient, Est. Insurance), Claims Aging (Avg. Age, Claims, Past Due), Annual Patient Value, Collections split patient/insurance, 90-Day Collection %, AR Days, AR Ratio; AR Aging Report and Credit Balance Report | `[DI-5]` (H) |
| **Morning Huddle** | Tabs Yesterday / Today / Tomorrow. Yesterday: editable metrics, "Patients Not Rescheduled" (new, existing, broken), stat tiles (Unscheduled Family Members, Unscheduled Treatment, AR Balance, Unscheduled Hygiene, Follow Up Attempts), month-to-date production forecast (completed + scheduled vs goal). Today/Tomorrow: schedule by provider or operatory, printable | `[DI-2]` (H) |
| **Scorecards** | User-built scorecards with a focus dimension: Locations, Providers, Procedure Codes, Referral Sources, Insurance Carriers, Team Members. Template gallery (AR Overview, Daily Flash Locations, Daily Flash Providers, Dentistry Benchmarks, Finance Review, High Producing Procedures, Hygiene and Perio, Insurance AR, Insurance Carrier Performance, Marketing Review, Operations Performance, Opportunities, Ortho, Providers Performance, Referral Source Review, Restorative, Scheduling Review, Team Tasks ...). Goal, trend (linear regression) and industry-benchmark toggles | `[DI-6]` (H) |
| **Patient Finder** | Filter-driven patient lists (see filters below) with saved Filters Library | `[DI-8]` (H) |
| **General Reports** | Daily / Weekly / Monthly role-grouped reports (practice, dentist, hygienist, front office) with automated email | `[DI-9]` (H) |
| **Explorer** | Conversational AI over practice data | `[DI-7]` (H) |
| **Team Tasks Results** | Outreach performance: scheduled dollars and collected payments per task and per team member | `[DI-11]` (H) |

Filters and segmentation: Location, Role, Provider, Production Type, custom date range (default current week) on Provider
Pulse; preset or custom ADA-code procedure filters `[DI-3]`. Scorecards group locations by region or brand, procedure codes
by ADA category, providers by location or role; default period "Last week" with 3 previous periods `[DI-6]`. Patient Finder
filter groups: status flags (new patient, guarantor, no email, no phone, forms missing, medical update due, visit not
confirmed), Age / Birthday, Future Visit (date, provider, operatory, scheduled or not), Hygiene Scheduled (including
"No - Recall past due"), Last Visit, Amount Due by aging bucket, Outstanding Treatment (min $, max $, procedure code,
exact match), CareCredit status `[DI-8][DI-11]`. Marketing cites 27 filter options `[DI-18]` (S).

Standout features
- **Suggested patients for an open slot:** click a green open block on tomorrow's schedule to get a ranked list; ranking
  uses reimbursement rates, A/R balances, unscheduled treatment, treatment-acceptance %, show rate, preferred weekday;
  "Snooze" hides a patient for 12 hours practice-wide `[DI-2]`.
- **Auto goals:** production goal = each provider's production-per-hour goal x scheduled clinical hours `[DI-3][DI-4]`.
- **Treatment Teams:** tag dentist + hygienist/assistant + treatment coordinator per visit so case-acceptance credit is
  attributed to the people present `[DI-2][DI-3]`.
- **Team-member scorecards** for non-providers, fed by task outcomes `[DI-6][DI-15]`.
- **Industry benchmarks** as a toggle on scorecards (dotted line) and on the Performance Board ticker; benchmark set
  covers Pre-Appointment %, New Patient Re-Appointment %, Hygiene Pre-Appointment %, Hygiene Re-Appointment %, Same Day
  Treatment $ Acceptance %, Treatment $ Acceptance %, Perio % `[DI-10]`.
- **AI:** Explorer answers plain-language questions, runs what-if scenarios, returns charts (PNG download), executive
  summaries, team emails and meeting briefs; accepts uploaded spreadsheets/PDFs; scope filters by date, location,
  provider, procedure code, referral source, carrier; needs Admin or Full Explorer permission; the help article carries an explicit
  accuracy caveat telling users to double-check important figures `[DI-7][DI-11]`. A scorecard-scoped assistant ("Dot") explains the open scorecard
  `[DI-6]`. Patient Finder "AI Filters" (beta) translates a typed request into existing filters `[DI-8]`.
- **Patient Scoring:** Attendance Score on appointment blocks; Acceptance Score on action-item lists `[DI-11]`.
- **Mobile app** (iOS/Android) exposes the huddle `[DI-2]`.

Actionability: magnifying-glass icon opens source data per metric; "Invite to Schedule" (email/text with follow-up) from
Appointments (cancelled/no-show), Unscheduled Patients, Hygiene Re-Appointment, Cancellations, No-Shows source lists —
needs the Engagement module `[DI-4]`. Patient Finder Bulk Actions (text/email), print, CSV export, save filter `[DI-8]`.
Collections Board "Create payment requests" bulk workflow with up to two follow-ups — needs DI Payments `[DI-5]`.

Weaknesses
- Data syncs nightly; boards are not real time; totals differ from PMS reports (rounding, inactive/deleted patients,
  date basis) — vendor publishes per-PMS reconciliation articles `[DI-5][DI-4][DI-13][DI-14]`.
- Multi-location limits: source data is unavailable when several locations are selected `[DI-4][DI-5]`; Provider Pulse
  reportedly fills only Production and Collections across multiple locations (S).
- Case-acceptance metrics are not retroactive; unmapped providers silently credit production to the treatment
  coordinator `[DI-3]`.
- General Reports cannot be printed in-app; Patient Finder export capped at 500 patients; scorecard CSV includes only
  expanded rows; shared scorecards are read-only `[DI-9][DI-8][DI-6]`.
- Reviews (R): numbers described as unreliable, limited report customization, overwhelming breadth, slow page loads;
  TechRadar notes iOS app complaints `[DI-R1][DI-R3][PBN-8]`. Note `[PBN-8]` is a competitor-authored summary.
- Pricing is not published; third-party figures about $399-$449 per month `[DI-P1]` (S) [unverified].

### 2.2 Practice by Numbers (PbN) — analytics overlay plus engagement

Positioning: "Practice IQ" (business intelligence) + "Revenue IQ" (opportunity mining) + communications, payments, AI.
KPI count claimed as 600+ on one page and 400+ on another `[PBN-1][PBN-3]`. PMS named: Dentrix, Dentrix Ascend,
Practice-Web, Eaglesoft, Open Dental, Curve `[PBN-1]`.

| Surface | What it shows | Evidence |
|---|---|---|
| **Practice IQ** | Practice Dashboards (enterprise SSO), Comprehensive KPIs, Track and Compare (peers), PiQ Insights (AI summaries, trend analysis). Metric families: production, collections, case acceptance, provider performance, reappointment, no-shows/cancellations, retention, profit/loss | `[PBN-1]` (M) |
| **Revenue IQ** | Revenue Finder (opportunities ranked by category with dollar potential: incomplete treatment, overdue recalls, ASAP patients, cancelled appointments); Patient Finder (filters or AI prompts; 40+ filters and custom tags); Smart Tasking & Follow-Ups; Campaigns; Saved Searches & Smart Filters; RiQ Assistant | `[PBN-2]` (M) |
| **Huddle page** | Yesterday / Today / Tomorrow / Day After Tomorrow. Yesterday: Production, Collections, Value Add, Pre-Appointment Rate, Production by Provider (Gross) chart, Provider Leaderboard. Today: scheduled patients, new patients, scheduled production, daily goals, Opportunities (Outstanding AR, Treatment Pending, families with no upcoming appointments); appointment list with tags (missing forms, birthdays, recalls, unscheduled treatment). Export, print, filter views | `[PBN-5]` (H), `[PBN-4]` (M) |
| **Enterprise Dashboard** | Cross-location view, custom dashboards per role, drill-downs, export, SSO | `[PBN-3]` (M) |
| **Cross Practice Statistics Panel** | Hover a KPI to see practice value, status, target, and the 10th/25th/50th/75th/90th percentile across PbN practices | `[PBN-6]` (H) |

Standout: percentile benchmarking on hover; role-specific custom dashboards; Smart Tasking that auto-assigns follow-ups,
buckets them overdue / due today / upcoming and records outcomes (no answer, scheduled, left voicemail) `[PBN-2]`; PiQ
and RiQ Assistants answer natural-language questions with KPI summaries, month-over-month and year-over-year trends,
charts and targeted patient lists `[PBN-7]`.

Actionability: lists -> tasks -> text/email campaigns (one-time or automated sequences) for unscheduled treatment,
overdue recall, unused benefits `[PBN-2]`.

Weaknesses: benchmarks are the 12-month monthly average across all PbN practices, not adjusted for size, type, location
or demographics `[PBN-6]`; Eaglesoft KPIs distorted without setup steps `[PBN-9]` (S); reviews (R) ask for more dashboard
and report customization and report PMS-sync delays and inaccuracies `[PBN-R1]`; scheduled reports, alerts, claims/AR
worklists not documented on vendor pages [unverified]; plans from $249/month per the vendor's own comparison page `[PBN-8]`.

### 2.3 Jarvis Analytics (Henry Schein One) — DSO-oriented overlay

Positioning: PMS-agnostic analytics for single practices through DSOs; powers the Dentrix Ascend "Profitability Insights
Suite"; 3,000+ locations claimed `[JAR-1][JAR-4]`. Integrates with 12-13 PMS including Dentrix, Dentrix Ascend, Dentrix
Enterprise, Eaglesoft, Open Dental, Denticon, Cloud 9 `[JAR-1][JAR-3]`.

| Module | What it shows | Evidence |
|---|---|---|
| Dashboard | Date presets; yesterday vs prior year and goals (daily flash); top locations and providers | `[JAR-2]` (M) |
| Snapshot | Each location's production and collections vs goals by line of business, Over/Under columns; build a report from 100+ metrics | `[JAR-1][JAR-2]` |
| KPIs | Library of 50+ KPIs (office, doctor, hygiene, specialty), weekly and monthly | `[JAR-1][JAR-2]` |
| Operations | 12 views: daily and per-procedure production, service-code utilization, payor mix; trailing-twelve-month trends and prior-year built in | `[JAR-2]` |
| Scorecards | Top and bottom 20% highlighted | `[JAR-1]` |
| Practice Potential | Evaluates Hygiene Recall, Case Acceptance, Retention, Collections | `[JAR-1]` |
| Tx Miner | Treatment plans; pending scheduled and unscheduled treatment | `[JAR-1]` |
| Hygiene Recall, Aging, Revenue Cycle Management, Marketing Matchback, Payroll, Appointments, Front Office | Recall worklist; A/R by aging bucket; RCM health; marketing spend tied to patient spend; provider payroll reporting | `[JAR-1]` |
| Morning Huddle, End of Day | Huddle report sent to inbox; pre-populated End of Day report emailed to a distribution list | `[JAR-1][JAR-2]` |

Standout: configurable metric calculations and "Create Your Own KPI" `[JAR-3]`; rank and compare locations and providers;
access provisioned by module, brand, office or region `[JAR-2]`; syncs several times a day `[JAR-3]`; "Workflows,
Reminders & Automations" push staff reminders for recare, unscheduled treatment, past-due accounts and claims `[JAR-2]`.

Weaknesses: small public review base; G2 summary cites data access speed (R) `[JAR-R1]`; pricing quote-only; export,
alerts, mobile and AI assistant not documented in sources reviewed [unverified]; no external peer benchmark documented
in-product (Henry Schein One publishes the Catalyst Index separately `[BM-1]`).

### 2.4 Dentrix Ascend (Henry Schein One) — cloud PMS, native reporting

| Surface | What it is | Evidence |
|---|---|---|
| **Insights dashboard** | Home > Reports > Insights. Metric groups: Recare, Billing, Production, Insurance, Schedule Optimization, Patient. Billing covers aged receivables, applied collections, adjustment summary; Schedule Optimization covers new patients, appointments, activation, case acceptance, referrals, broken appointments | `[ASC-2]` (H), (S) |
| **Power Reporting** | Pre-Built Analysis reports (pivot style), Pre-Built Interactive reports (row-level), and Report Builders for both. Add fields from a Fields panel, reorder in the layout panel, filter (Included list; "Is null"), save as custom report | `[ASC-3][ASC-4][ASC-5]` (H) |
| **Named reports** | Provider Production, Production Summary, Production Trends - Chart, Collection Success (current + past 11 months; 98% of net production suggested), Applied Collections, Adjustment Summary, Unapplied Credits, Insurance Utilization (patients with visits in past 12 months per plan; click count for line items), New Patients by Month - Chart, Active Patients in Recare (% in Recare, % in Perio), Recare Report, Unscheduled Treatment (interactive), Workflow Compliance, Day Sheet, Provider A/R Totals, Payment Location Cross-Reconciliation, Clinical Note Tasks | `[ASC-6][ASC-9][ASC-4]` (H) |
| **Patient List Report** | Routine list building; filters require Apply; CSV export | `[ASC-7]` (S) |
| **Profitability Insights Suite** | Jarvis-powered live KPI dashboard, drill-down, multi-location "Practice Performance Dashboard", role-based access, coaching; marketing cites 40+ prebuilt reports and dashboards and scheduling reports by role or location | `[JAR-4][ASC-1]` (M) |
| **Ascend MCP** | Three tiers: Ask (plain-language questions over clinical, operational and financial data — preview), Orchestrate (pre-built agents, e.g. Eligibility Pro, Image Verify), Build (custom workflows and dashboards — future). Announced 2026-04-28 | `[ASC-8]` (P) |

Filters: location, provider, date and any field in the Power Reporting model; reports include all locations the user can
access by default `[ASC-6]`. Export PDF / .xlsx / .csv; a "Data as of" button shows last and next sync (S) `[ASC-10]`.

Standout: two-mode builder (pivot vs row-level); an interactive guide that recommends a report by action and topic
`[ASC-9]`; Unscheduled Treatment interactive report with remaining-benefit filter, described as the most-opened power
report (S) `[ASC-10]`.

Weaknesses: Capterra's theme summary rates reporting as complex and unreliable (77% negative across 31 mentions);
reviewers call Power Reporting clumsy, say different reporting paths return different numbers so data is hard to trust,
and that some logic does not suit DSOs (R) `[ASC-R1]`. Power Reporting data is synced, not live `[ASC-10]`. Native huddle,
scorecards and benchmarks require the paid Jarvis-based suite.

### 2.5 Dentrix (desktop) and Dentrix Enterprise — legacy on-premise reports

| Surface | What it is | Evidence |
|---|---|---|
| Practice Advisor Report | Analysis > Practice Advisor. Monthly/MTD/YTD statistics for production, collections, scheduling, case acceptance, continuing care; includes benchmark recommendations per practice size (secondary source) | `[DTX-1]` (M), (S) |
| Daily Huddle Report | Prior-day snapshot of production, collections, case acceptance, new patients, scheduling plus progress to goal for today and rest of month; option sets can be saved and reused; "Scheduled Patients Setup" chooses columns | `[DTX-1]` |
| Day Sheet (Charges and Receipts) | Reports > Management; daily ledger transactions and production totals; adjustment-only variant | `[DTX-3][DI-13]` |
| Provider A/R Totals | Provider range, billing-type range, date range, Entry Date vs Procedure Date, MTD/YTD totals, daily summary, daily summary by provider, exclude empty days, adjustment-type mapping to production or collections | `[DTX-2]` (H) |
| Practice Analysis | Production Summary, Adjustment Summary and related summaries by date range | `[DTX-3]`, (S) |
| Aging / Insurance Aging, Audit Trail | Reports > Ledger; Maintenance > Audit Trail Reports | `[DTX-3]`, (S) |
| Collection Manager, Treatment Manager | Interactive lists: guarantors with balances (add columns such as Last Statement Date); patients with treatment plans filtered by insurance coverage, benefit-renewal month and minimum remaining benefit | `[DTX-3][DTX-7]` (S) |
| Dentrix Enterprise key reports | Aging/Credit Balance, Procedures Not Attached to Insurance, Provider A/R Totals, Continuing Care Display List, Unscheduled Appointment List, Day Sheet, Production Summary, Treatment Plan Approval; run via DXOne Reporting categories (Ledger, Analysis ...) with clinic selection | `[DTX-4]` (M), `[DTX-6]` (S) |

Strengths to copy: from/to ranges for provider and billing type with ALL defaults; explicit date-basis switch (entry vs
procedure date); per-report mapping of adjustment types to production vs collections; saved option sets `[DTX-2][DTX-1]`.
Weaknesses: output goes to a Batch Processor for print/preview `[DTX-2][DTX-3]`; no interactive drill-down, no scheduled
email, no cross-practice benchmarking documented; a third-party comparison says built-in Dentrix analytics lacks
benchmarking and multi-location roll-up `[3P-1]`. The Dentrix Enterprise Reports Reference PDF could not be opened (TLS
error) so the full Enterprise catalog is [unverified] here `[DTX-6]`.

### 2.6 Open Dental — open database, SQL-first

| Surface | What it is | Evidence |
|---|---|---|
| Standard Reports | **Production and Income** (Today, Yesterday, This Month, Last Month, This Year, More Options; Monthly Production Goal; Provider Payroll Summary/Detail). **Daily** (Adjustments, Incomplete Procedure Notes, Net Production Detail, Patient Portion Uncollected, Payments, Procedures, Routing Slips, Unfinalized Insurance Payment, Write-off). **Monthly** (Aging of A/R, Capitation Utilization, Claims Not Sent, Custom Aging, Finance Charge, Insurance Aging, Insurance Overpaid, Insurance Payment Plans Past Due, Outstanding Insurance Claims, Payment Plans, PPO Write-offs, Presented Treatment Production, Treatment Plan Presentation Statistics, Procedures Not Billed to Insurance, Procedures Overpaid, Receivables Breakdown, Unearned Income, Payment Plans Overcharged). **Lists** (Active Patients, Appointments, Birthday, Broken Appointments, Discount Plans, Insurance Plans, New Patients, Patient - Raw, Patient Notes, Prescriptions, Procedure Codes - Fee Schedules, Referral - Raw, Referral Analysis, Referred Procedure Tracking, Treatment Finder, Web Sched Appointments, Hidden Payment Splits, ERAs Automatically Processed). **Public Health** (FQHC Dental Sealant Measure, raw screening/population data) | `[OD-2]` (H) |
| Graphic Reports | 5 chart types — Production, Income, Accounts Receivable, New Patients, Broken Appointments — by practice, provider or clinic; customizable tabs and cells; PDF export; 6-12 month windows | `[OD-3]` (H) |
| User Query | Write and run SQL; Query Favorites; released queries runnable by ordinary users with editable variables; human-readable vs raw formatting; Go To Patient when a PatNum column exists; export .txt / .csv; 1,000+ example queries; custom queries written by the vendor for a fee | `[OD-4]` (H) |
| Report Server | Run heavy reports and user queries against a replica to protect the live database; not available on Open Dental Cloud | `[OD-5]` (H) |
| Treatment Finder | Patients with planned treatment and no appointment. Filters: Ins Month Start, Amount remaining over, TP date range, Clinics, Providers, Billing Type, Use Treating Provider, include secondary/no insurance, include patients with upcoming appointments, Code Range. Columns include Annual Max, Amt Used, Amt Pend, Amt Rem, TreatPlan, Carrier | `[OD-6]` (H) |
| Recall List | Filters by due range, reminder count, recall type, provider/clinic/site, Group Families; actions: email, postcards, labels, Web Sched link, commlog, schedule patient/family, set status; sibling lists for Reminders and Reactivations | `[OD-7]` (H) |
| Other | Standard Favorites; per-report [Locked] security; eService Activity Log; custom .rdl reports; custom URL menu entries; mobile report views (S) | `[OD-1][OD-2][OD-8]` |

Permissions worth copying: "Graphical Reports"; "Production and Income - View all Providers" (without it a provider sees
only their own numbers) `[OD-3]`; three query tiers — run released queries, User Query Admin, Command Query `[OD-4]`.

Weaknesses: anything beyond the catalog requires SQL, which reviewers say non-technical staff cannot do; limited number
of standard reports; text-based outputs; steep learning curve (R) `[OD-R1]`. No huddle, scorecards, benchmarks, scheduled
delivery or AI found in the manual.

### 2.7 Curve Dental — cloud PMS with bundled business analytics

- **KPI Dashboard:** six KPIs — AR, Collections, Production, New Patients, Recare, Treatment Plan Value `[CUR-1][CUR-4]` (M).
- **Operational Dashboards** grouped as Scheduling, Treatment Plans, Recare, Production, Referrals, Collections; updated
  daily; each has matching detailed reports `[CUR-1][CUR-5]`. Launch (2019) cited 14 operational dashboards and 50+ unique
  views across AR, collections, production and demographics `[CUR-3]` (P).
- **Playbook dashboards (2018):** KPI Dental Dashboard, Practice Review, and "Who's On Deck" (today's patients with
  birthdays, patient and insurance A/R, recare status, new patients, household members also visiting); "Reporting" role
  gates the financial ones `[CUR-4]`.
- **Reports:** pre-built library (financial, patient, recare, appointment, insurance, treatment plan); adjust columns,
  filters and date ranges, then save as a named template for one-click reuse `[CUR-2]`.
- **AI adjacency:** Pearl "Practice Intelligence" is available inside Curve (radiographic AI + practice analytics) `[CUR-6]` (P).
- Multi-location comparison is claimed in an FAQ `[CUR-1]`.
- Weaknesses: marketing mixes "real-time" with "updated daily" `[CUR-1]`; export, scheduling, drill-down and goals are not
  documented; reviews (R) cite limited report functionality and weak billing/financial reporting `[CUR-R1]`.

### 2.8 CareStack — cloud PMS with real-time analytics and scorecards

| Surface | What it is | Evidence |
|---|---|---|
| Analytics dashboards | Preloaded dashboards (daily collections, provider productivity, patient visits, production, operations); Custom Dashboards from scratch or templates; Metric Tiles; Multi-Metric Cards; "Build Your Own KPIs"; Flexible Filters (provider, location, time); "Underlying Data" one-click drill; trend analysis; role-based views; shareable dashboard templates; real-time updates | `[CS-1]` (M) |
| Operational Reports | Aging and Credit Balances; Daily Production Numbers (Income Allocation); End of Day; Appointments by Users; New Patient; Insurance Pending Procedures; Insurance Plans; Clock In/Clock Out. Filter by provider, user, location, date; organization / region / office views | `[CS-2]` (M) |
| Goals | Yearly production plan, monthly tracking, goals by provider or location, adjustable working days and hours | `[CS-2]` |
| Scorecards | Reusable scorecard definition: name, date range, focus type, service-type filters, metrics from a system metric library, drag ordering; regenerate on demand; downloadable | `[CS-3]` (M) |
| Practice Analytics (UK) | Revenue, Collections and NHS dashboards, six "supercards" each; drill to trends, clinician and location breakdowns, then underlying records; filters apply once across all cards | `[CS-4]` (M) |
| Custom Reporting (UK) | Support-assisted bespoke reports | `[CS-5]` (S) |

Standout: every figure traceable to its source record (audit traceability) `[CS-4]`; report visibility controlled per
report and per position `[CS-2]`; real-time data with no overnight refresh `[CS-1]`. Weaknesses: custom reports are
support-assisted rather than self-serve (UK page) `[CS-5]`; scheduled delivery, export formats, benchmarks and analytics AI
not documented (its AI suite is operational "teammates") `[CS-6]` (S); a Capterra summary says teams need training to
find the right report, interpret accounting terms and produce end-of-day and multi-location summaries (R) `[CS-R1]`.

### 2.9 tab32 — cloud PMS with an open data warehouse

- **Open Data Warehouse** on Google BigQuery: aggregates and normalizes data across locations; direct SQL access for DSO
  analytics teams; connectors to Tableau, Looker Studio, Power BI, Domo `[T32-1]` (M), `[T32-3]` (P). First announced 2020 `[T32-4]` (S).
- **Centralized Dashboards & KPIs** configurable by role, region or brand; pre-built executive / managerial / operational
  dashboards; "Benchmarking & Custom Reporting" by location, provider, region `[T32-1]`.
- **Report library** grouped into production, collection, patient and accounting (examples: Recall due, Aging by
  insurance) `[T32-2]` (M).
- **Open API & MCP server** for custom integrations and automations `[T32-1]`.
- Refresh: management reports nightly; real-time warehouse streaming is a premium option (S) [unverified].
- Weaknesses: advanced analytics sits in the multi-location "Summit" tier and assumes BI skills `[T32-1]`; individual
  dashboards are not named publicly; reviews (R) mention a hard learning curve and support issues `[T32-R1]`.

### 2.10 Eaglesoft (Patterson) — on-premise PMS, largest documented catalog

| Surface | What it is | Evidence |
|---|---|---|
| Report catalog (V16) | Clinical 13, Financial 35, Insurance 20, Patient 49, Providers 14, Referrals 14, Scheduler 11, Services 15, Tx/Rx/Lab 9 reports, plus All Reports search, My Favorites and Quick Reports tabs | `[ES-1]` (H) |
| Quick Reports | User-defined bundles run together, e.g. "Daily Office Review" = Production Reconciliation, Provider History, Deposit Report w/ Itemized Cash, Secondary Deposit Report, Adjustments by Type, Post Op Calls, Deleted Transactions | `[ES-1]` |
| Date-based reporting | Selected financial reports run by transaction range or date range (Day Sheet, Deposit Report, Production / Collection / Adjustment / Payment Reconciliation, Provider Productivity, Performance Summary ...) | `[ES-1]` |
| Report Graphs | Sales per Month (up to 36 months), Walkouts per Month, Patients Seen per Month, New Persons per Month, Collections per Month, Provider Productivity (month/year), Service Type Productivity (month/year) | `[ES-1]` |
| **Money Finder** | Query builder over appointment status, insurance status and treatment-plan status with about 20 presets (Maximize Insurance: >$200 benefits remaining and seen in 2 years; Dual Insurance List; Treatment Plan VIPs; Past Due Master; Current Due, Unscheduled; Failed and Cancelled Appointments; Sealants List by age; Last Visit Date ...) and code logic "has / lacks a planned / completed service" | `[ES-2]` (H) |
| **Trends** | Goal / Actual / Variance / YTD Actual / YTD Goal grid for practice and provider values: total and adjusted production, doctor days and hours, production per hour, hygiene production, collection %, A/R ratio and aging shares, new patients by source, amount diagnosed vs accepted (new vs patients of record), preventive-maintenance compliance. Imported values are color-coded; manual overrides flagged | `[ES-2]` |
| **SnapShot** | One-click graphs of current monthly totals; Production/Collection, Patient Production or A/R as a trend or month-vs-month comparison; chart type selectable | `[ES-2]` |
| **Revenue Opportunities** | Counts for overdue recalls, unscheduled future recalls, patients without recalls, Quick Fill List, planned and accepted treatments, A/R by category, with a what-if calculator (% of patients expected to comply x average spend per visit) | `[ES-2]` |
| SmartDoc | Auto-save chosen reports as PDF/JPG into document groups | `[ES-1]` |
| Patient Analysis | Active patients seen in the past 12 months, how many hold future appointments, splits by age, gender, insurance status and zip code, new patients per month and year | `[ES-4]` (P) |

Patterson's own "which report" guide sorts the catalog by intent — Financial (A/R, production, collections, deposits),
Patient (demographics, new patients, last visit, revenue opportunities), Services (completed services, counts, fees,
treatment-plan items), Insurance (history, outstanding claims, patients by carrier) `[ES-3]` (H). A suggested cadence
from a Patterson consultant: daily reconciliation, deposit and day-sheet reports plus unassigned credits and appointments
not walked out; weekly deleted transactions, adjustments by type, delinquent accounts, outstanding claims and
pre-authorizations; monthly or quarterly Patient Analysis, Money Finder, SnapShot, Trends, Revenue Opportunities `[ES-4]`.

Actionability: Money Finder outputs a report, letters, labels, postcards, envelopes, an export to the InContact outreach
module, or a SmartDoc batch; sort by patient, next appointment, recall date or zip `[ES-2]`.

Weaknesses: "day" semantics follow End-of-Day processing so third-party numbers disagree `[DI-14][PBN-9]`; some reports are
date-specific and cannot be re-run later `[ES-1]`; Trends needs manual entry of days/hours and a manual import `[ES-2]`;
reviewers say it is hard to find the right report and that template-based reports lag competitors (R) `[ES-R1]`; no
multi-location roll-up, scheduled email, benchmarks or AI documented.

### 2.11 Planet DDS Denticon — the legacy reference (DPA, Dentilytics, New Reports Menu)

**Denticon Practice Analytics (DPA)** — replaces Dentilytics Basic `[DEN-5]`; Power BI Embedded; refresh about 1 AM PST;
filters only — no new metrics, visuals, tables or reports; a direct data-share option exists via the customer success manager
`[DEN-2]` (H). Launched from Utilities > Launch > Denticon Practice Analytics `[DEN-8]`. Marketing positions it on native
data integrity, drill-down, huddle preparation and standardized reporting across locations `[DEN-11]` (M).

| # | Dashboard (reports) | Key content | Date / comparison |
|---|---|---|---|
| 1 | **Morning Huddle** — Today's Schedule, Previous Day's Performance, Where We Stand, Previous Month's Performance | Net Production MTD vs Goal; Collection % of Prod MTD; Total / New / Recare patients seen; Outstanding A/R; Case Acceptance % MTD; Utilization MTD; Daily Goal; Avg Daily Production; Daily Avg to Meet Monthly Goal; scheduled production today + next 2 working days; Exams Today (new D0150, recare, emergency D0140/D0160); Outstanding A/R of today's patients; Pending Tx $ of today's recare exams; SRP Opportunities; Reappointment %; non-reappointing patients by carrier; projected new and recare patients | Today; yesterday vs same day last week; MTD/YTD vs prior year or month |
| 2 | **Production Analysis** — Production Analysis, Scheduled Production, Production Detail | Net production vs weighted daily goal; avg daily and per-visit net production; same-day %; trends by provider type and procedure category (drill to ADA code); top 5 carriers; scheduled production per day / visit / hour and utilization; production to prorated goal; gross / adjustment / net by primary carrier | Yesterday or MTD; today + 7 days or to month end |
| 3 | **Collections Analysis** — Collections Analysis, Outstanding A/R, Outstanding Claims, Provider Collections | Collections % of production; gross, adjustment, net; by procedure type; top carriers; Collections Scorecard by office; Avg Days Sales Outstanding; % OTC collections; A/R patient vs insurance; aging Current/30+/60+/90+/120+ (provider view to 180+/270+/360+); claims by primary/secondary/tertiary; claims aging | Yesterday or MTD; as-of Current or Last Month |
| 4 | **Provider Breakdown** | Avg daily net production; collection %; case acceptance %; provider retention (12 mo); utilization; doctor days; daily production vs goal (Top 15 / Bottom 15 / All); actual vs scheduled production; production per visit; new and recare patients; missed / cancelled / no-show % | MTD or yesterday |
| 5 | **Treatment Plan Analysis** | Production by status Diagnosed / Accepted / Scheduled / Completed; % accepted, scheduled, completed of diagnosed fees; unscheduled patients with accepted and unaccepted plans; top referrals by specialty | MTD or yesterday |
| 6 | **Front Office** | Tiles: Net Production, Net Collection, Provider Utilization, Appointments, Unscheduled Treatment (incl. % preauthorized), Opportunities (unconfirmed next 7 days, no-shows last 7 days) | Yesterday / MTD / YTD |
| 7 | **Hygiene Recall** | Hygiene retention (12 mo) by child / prophy / SRP / perio; reappointment %; perio %; adjunctive therapy % (fluoride/varnish, laser, irrigation, Arestin); production per visit and per chair hour; quads and visits per day; hygienist vs goal | MTD / yesterday / YTD |
| 8 | **Patient Visit Analysis** | Visits, patients seen, reappointment %, utilization, production per visit; Active / Danger Zone (12-24 months) / Inactive (24+ months) segments; new, recare and emergency exams; patients by zip code map; missed / cancelled / no-show % | Yesterday / MTD / YTD |

Source for the table: `[DEN-1][DEN-3]` (H). Filters: office group, location, provider type, provider name, date range
`[DEN-10]`. Color rules: goal attainment below 85% red, 85-95% yellow, above 95% green; collections target 95% of
production; aging to 60 days green, to 90 yellow, 120+ red; patient counts green when above the comparison period
`[DEN-1]`. Drill-through exists on most tiles and aging bars (responsible-party and claim detail), but not on Previous
Month's Performance `[DEN-1]`. The "Danger Zone" patient list offers a Send Email/SMS button to start a follow-up campaign `[DEN-8]`.

**Dentilytics Basic** (legacy "My Page" dashboard): tabs Yesterday's Production, Today's Scheduled, Where We Stand;
metrics such as TX $ Diag, No reappointment %, Same Day Production, Pending Tx $ of today's continuing-care exams,
projected new patients; nightly update at 11:59 PM PST; metrics not customizable; provider daily goals entered up to 13
months ahead with Autofill of working days from the provider scheduler `[DEN-6]` (H). **Dentilytics Enterprise** is
described only as the fully customizable reporting tool — no further public detail [unverified] `[DEN-6]`.

**New Reports Menu:** separate summary, detail and group report sections were merged; one report now carries criteria for
summary vs detail and grouping (the Production Report replaces Production by Provider Detail and Summary and groups by
code, provider, category or carrier); office multi-select lives inside each applicable report; options appear dynamically;
reports default to "Include All" with a SELECT override `[DEN-7]` (H). Around it: My Favorites (saved criteria — a known
gotcha is that a favorite keeps the office it was saved in), output as PDF / Excel / web page, a "file size too large"
failure on big runs, and named reports such as Recall Due, Scheduled Recall, Appointment Detail, Capitation Utilization,
Scheduled Production, Special Transaction, Time Clock `[DEN-12]` (H).

**Denticon Patient Insights:** Truro Analytics risk scores for no-show and late-cancel shown in chart, schedule and
toolbar; models use appointment history, cancellation trends and communication responsiveness `[DEN-9]` (H). Roadmap copy
also mentions payment-risk and satisfaction predictions (S) `[DEN-14]` [unverified].

Weaknesses: fixed dashboards; not real time; top-N lists capped at 5 carriers; Provider Collections always shows current
A/R regardless of date range; ambiguous threshold bands `[DEN-1]`; a dedicated troubleshooting article exists for
mismatches between DPA and the Reports module (date logic, goals, adjustment signs, home office vs transaction office for
A/R, two reappointment methodologies) `[DEN-4]`; a G2 reviewer says analytics remains a struggle while another DSO
reviewer praises reporting (R) `[DEN-R1]`; navigation takes many clicks (R) `[DEN-R1]`.

### 2.12 Adit — communications platform with a Practice Analytics module

Catalog: Performance Dashboards; Morning Huddle (New Patients, Gross and Net Production, Production per Visit and per
Hour, Estimated Annual Production, Rescheduled Production, Unscheduled Active Patients, Unscheduled Opportunity,
Estimated Annual Opportunity); Patient Profiles; Follow Up Lists (lost patients, unscheduled treatment, overdue
follow-ups); Claims & Collections dashboard; Year Over Year Metrics; KPIs for reappointment rate, churn, production per
hour/visit, diagnostic and treatment acceptance, patient lifetime value, high-value patient segmentation (80/20)
`[AD-1]` (M). Lost-patient tracking can create automated follow-up tasks; AI Call Intelligence scores calls and flags
unhappy patients `[AD-1]`. Launched 2021 `[AD-2]` (S). Weaknesses: filters, exports, multi-location roll-up, custom
reports and benchmarks are not documented [unverified]; reviews (R) focus on messaging errors and integration friction
rather than analytics `[AD-R1]`.

### 2.13 Weave — communications platform with Practice Analytics (ADA Member Advantage endorsed, March 2026)

Catalog `[WV-2]` (M): Practice Analytics (patient conversion, treatment-plan acceptance, top office metrics,
cancellations, average time between treatments, actionable opportunity list, downloadable reports, Morning Huddle;
filters location and time period); Phone Analytics (volume, answer rate, duration, hourly patterns); Call Intelligence
(AI categorization, transcripts, summaries); Message Analytics; Review Analytics; Auto Recall Analytics (received but
did not book, not delivered because of bad contact data, booked after message). Practice Analytics detail: unscheduled
restorative and hygiene treatment plans with diagnosed %, accepted %, unscheduled revenue; hygiene reappointment;
recaptured and new patients `[WV-1][WV-3]`. Benchmarks shown as Top Practices / Average Practice / Your Practice `[WV-1]`.
Actions: message patients, click-to-schedule, send educational material from the list `[WV-1]`. Supported PMS at launch
(2023): Dentrix, Open Dental, Eaglesoft `[WV-4][WV-6]`. Endorsement `[WV-5]` (S).
Weaknesses: no A/R or claims analytics, no custom reports, narrow PMS coverage; Capterra's summary says teams needing
robust analytics may have to supplement it (R) `[WV-R1]`; benchmark values are not published `[WV-4]`.

### 2.14 Sikka (Optimizer X, Fee Survey) and other benchmarking sources

- **Optimizer X:** 590+ KPIs; Practice KPIs (hygiene production, case acceptance, patient analytics); Morning Meeting
  Report; Sikka Tracker Report (provider goals vs weekly actuals); Monthly Practice Details (monthly KPIs with comparison);
  Insurance Claims tracking, Practice Expenses, AR Aging; accounting integration with QuickBooks and Sage Intacct; AI
  Recommendation Report; "DentalLLM" chat assistant `[SK-1]` (M). 47K+ practices across verticals `[SK-2]`.
- **Fee Survey:** 700+ procedure codes with 50th / 60th / 70th / 80th / 90th and maximum percentile fees per zip code;
  3 zip codes per purchase; $495 one-time; delivered as PDF; guidance to lift fees below the 80th percentile `[SK-3]` (M).
- **Fee Optimizer:** falls back from 5-digit zip to 3-digit zip to county when the sample is thin; recommendation
  balances procedure frequency against profitability using 12 months of production; benchmarks are office (UCR) fees,
  not insurance payments `[SK-4]` (H).
- Weaknesses: thin public documentation of dashboards, goals, alerts and exports [unverified].

Other benchmark sources a product team can cite or license:

| Source | What it offers | Evidence |
|---|---|---|
| Henry Schein One Catalyst Index 2026 (1-7 locations) | Average vs top 10%: new-patient lead time 25 vs 4.5 days; case acceptance 42% vs 75%; retention 70% vs 94%; no-show 4% vs <1%; new patients per month 30 vs 81; collection rate 80% vs 97% | `[BM-1]` (M) |
| Planet DDS 2026 Deep Dive | 8,593 practices, 497 DSOs: practices with 75+ new patients/month grow 9.0%; growth stalls below 35/month; industry case completion 47%; some practices show 77.2% acceptance but 19.7% completion | `[DEN-13]` (P) |
| Dental Intelligence industry benchmarks | 7 percentage metrics surfaced in scorecards; values not public | `[DI-10]` (H) |
| Practice by Numbers cross-practice percentiles | 10/25/50/75/90th percentile per KPI, unnormalized | `[PBN-6]` (H) |
| Eaglesoft Trends guidance | Consultant-style guideline ratios embedded in documentation | `[ES-2]` (H) |

### 2.15 Oryx Dental Software — clinically oriented cloud PMS

"Dashboards and Analytics" (customizable dashboards for performance metrics, patient cases and opportunities),
"Customizable Advanced Reporting", "Performance Tracking", "Next Level Goal Planning", central reporting across locations
for enterprise customers `[OX-1]` (M). Pricing tiers list "Performance dashboard & configurable reports", "KPI
dashboard" (production goals, collection rates, scheduling trends) and "Morning huddle"; Pro $650, Automate $899, AI
$1,399 per month `[OX-2]` (M). Weaknesses: no public report catalog, filter list, export or scheduling documentation
[unverified]; small review base (R) `[OX-R1]`.

### 2.16 Adjacent entrants worth watching

| Product | Notable analytics ideas | Evidence |
|---|---|---|
| **Archy** (cloud PMS) | Dashboards computed from the live ledger so collections match; every number links to the claim, appointment or chart; "Archy Intelligence" natural-language questions; financial worklists (A/R aging, open denials, unscheduled treatment) filterable by carrier; unbilled procedures report; KPI and goal tracking; provider day sheets; download data or open "present mode" for meetings; most dashboards update within about 20 minutes | `[AR-1]` (M) |
| **NexHealth Insights** | Practice Health Summary with percent change; Production vs Collections with "uncollected gap"; Appointment Outcomes (show rate, miss rate; new vs returning); Lapsed Patients (6-12, 12-24, 24+ months) with revenue-potential estimate; breakouts by appointment type, patient type, provider; tracks reviews, campaigns, insurance verification, recall and waitlist conversion. No export yet | `[NX-1]` (M) |
| **Pearl Practice Intelligence** | Radiographic AI over current and historical images to surface undiagnosed or unscheduled treatment ("AI Opportunities"), with roll-ups by enterprise, region, location, provider | `[PL-1]` (S) |

---

## 3. Cross-cutting patterns

### 3.1 Morning huddle anatomy (union of DI, PbN, DPA, Dentrix, Adit, Weave, Sikka, Oryx)

| Block | Typical content | Seen in |
|---|---|---|
| Yesterday | Production, collections, same-day production, case acceptance, reappointment %, patients not rescheduled, follow-up attempts, provider leaderboard | DI, PbN, DPA, Dentrix |
| Month position | MTD production vs goal, forecast = completed + scheduled, daily average needed to hit the monthly goal, projected new patients | DI, DPA |
| Today | Schedule by provider or operatory, scheduled production vs daily goal, new patients, emergency and recare exams, open time | DI, PbN, DPA |
| Per-patient flags | Balance due, unscheduled treatment, recall due, unscheduled family members, missing forms, birthday, medical update due | DI, PbN, Curve |
| Opportunities | Outstanding A/R of today's patients, pending treatment dollars, SRP opportunities, unconfirmed appointments, yesterday's no-shows | DPA, PbN |
| Tomorrow (+1) | Same layout; suggested patients for open blocks | DI, PbN |
| Delivery | In-app, print, email to inbox, mobile app | DI, Jarvis, PbN |

### 3.2 Opportunity-list anatomy

Filters that recur across DI Patient Finder, Eaglesoft Money Finder, Open Dental Treatment Finder, Dentrix Treatment
Manager and PbN Patient Finder `[DI-8][ES-2][OD-6][DTX-7][PBN-2]`:
last visit window; next appointment (regular vs preventive) scheduled or not; recall due / past due; planned treatment
amount range and procedure code or code range; has / lacks a completed or planned service; insurance present, dual
coverage, remaining benefit above a threshold, benefit-year start month; A/R aging bucket; age range; provider (primary vs
treating), office/clinic, billing type; short-notice / ASAP flag; contactability (no phone, no email); financing status.
Outputs: sortable grid with benefit columns, saved filter, bulk text/email, letters/labels/postcards, export, open patient.

### 3.3 Metric definitions diverge — decide ours explicitly

| Concept | Variants observed |
|---|---|
| Active patient | Active status plus a completed visit in the last 18 months (DI `[DI-9]`); last visit within 12 months, with 12-24 months = Danger Zone and 24+ = Inactive (DPA `[DEN-1]`); "seen in the last 2 years" (Eaglesoft Money Finder presets `[ES-2]`); lapsed 6-12 / 12-24 / churned 24+ (NexHealth `[NX-1]`) |
| New patient | First completed visit with a billed ADA code (DI `[DI-4]`); scheduled today with no prior ledger transactions (Dentilytics Basic `[DEN-6]`); new until first appointment completed (Weave `[WV-3]`) |
| Cancellation vs no-show | Broken more than 24 hours ahead = cancellation; missed or broken inside 24 hours = no-show; D9986/D9987 on the ledger overrides (DI `[DI-4]`) |
| Reappointment | Booked the next hygiene visit before leaving (DI `[DI-3]`); DPA Morning Huddle V2 counts "no reappointment" when all future appointments are missed or cancelled, V1 only when none exist (`[DEN-4]`) |
| Case acceptance | Patients accepting all or part on the day presented, not retroactive (DI `[DI-3]`); accepted / scheduled / completed as a share of diagnosed fees (DPA `[DEN-1]`); accepted ÷ diagnosed, split new patients vs patients of record (Eaglesoft Trends `[ES-2]`) |
| Production goal | Scheduled clinical hours x production-per-hour goal (DI `[DI-4]`); daily goal x working days, weighted (DPA `[DEN-1]`); monthly goal ÷ 20 working days as "estimated production" (Denticon Scheduled Production `[DEN-12]`) |
| Collection % | 90-day collections vs gross or net production (DI `[DI-5]`); net collections ÷ net production, target 95% (DPA `[DEN-1]`); applied collections vs net production, 98% suggested (Ascend `[ASC-6]`) |
| Date basis | Entry date vs procedure date switch (Dentrix `[DTX-2]`); transaction range vs date range (Eaglesoft `[ES-1]`) |
| Adjustments | Each adjustment type mapped to production or collections per report run (Dentrix `[DTX-2]`) |

### 3.4 Data freshness

| Product | Freshness | Evidence |
|---|---|---|
| Dental Intelligence | Nightly sync; huddle cached once per day with manual cache clear | `[DI-5][DI-2]` |
| Denticon DPA / Dentilytics Basic | About 1 AM PST / 11:59 PM PST | `[DEN-2][DEN-6]` |
| Jarvis | Several syncs per day | `[JAR-3]` |
| Dentrix Ascend Power Reporting | Periodic sync with "Data as of" indicator | `[ASC-10]` (S) |
| Curve | Dashboards updated daily | `[CUR-1]` |
| tab32 | Nightly; streaming as premium (S) | [unverified] |
| CareStack | Real time | `[CS-1]` |
| Archy | About 20 minutes; some views real time | `[AR-1]` |

### 3.5 Pricing signals (mostly third-party; treat as [unverified])

Dental Intelligence about $399-$449/month per location (S) `[DI-P1]`; Practice by Numbers from $249/month `[PBN-8]`;
Jarvis quote-only, third-party estimate $300-$450 per location `[3P-1]`; Pearl Practice Intelligence from $549/month (S)
`[PL-1]`; Sikka Fee Survey $495 one-time `[SK-3]`; Oryx PMS $650-$1,399/month including dashboards `[OX-2]`. Nine of
fourteen analytics products in one index are quote-only `[3P-2]`.

---

## 4. Feature matrix

Legend: **Y** documented; **P** partial, limited, add-on or preview; **N** vendor states it is not available; **?** not found
in the sources reviewed (not proof of absence). Evidence is in the product sections above. "Opportunity / action lists"
covers unscheduled-treatment finders, recall managers, reactivation lists and follow-up queues.

**4a. Insight and workflow**

| Product | KPI dashboards | Morning huddle | Provider scorecards | Goal tracking | Drill-down to rows / patient | Opportunity / action lists | Bulk outreach from lists | A/R + claims aging / worklists | Multi-location roll-up |
|---|---|---|---|---|---|---|---|---|---|
| Dental Intelligence | Y | Y | Y | Y | Y | Y | Y | Y | P |
| Practice by Numbers | Y | Y | P | Y | Y | Y | Y | P | Y |
| Jarvis Analytics | Y | Y | Y | Y | Y | Y | P | Y | Y |
| Dentrix Ascend (native) | Y | P | P | P | Y | Y | ? | P | Y |
| Dentrix / Dentrix Enterprise | P | Y | P | Y | P | Y | P | Y | P |
| Open Dental | P | ? | P | P | P | Y | Y | Y | P |
| Curve Dental | Y | P | ? | P | P | P | ? | P | Y |
| CareStack | Y | ? | Y | Y | Y | P | P | Y | Y |
| tab32 | Y | ? | ? | ? | ? | P | P | P | Y |
| Eaglesoft | P | ? | P | Y | ? | Y | Y | Y | ? |
| Denticon (DPA + Reports) | Y | Y | Y | Y | Y | Y | P | Y | Y |
| Adit | Y | Y | ? | P | P | Y | P | Y | ? |
| Weave | Y | Y | ? | ? | P | Y | Y | ? | P |
| Sikka Optimizer X | Y | Y | P | Y | ? | ? | ? | Y | P |
| Oryx | Y | Y | ? | Y | ? | ? | ? | ? | Y |
| Archy (adjacent) | Y | ? | P | Y | Y | Y | ? | Y | P |
| NexHealth Insights (adjacent) | Y | ? | P | ? | P | P | ? | P | Y |

**4b. Platform**

| Product | Peer / industry benchmarks | Custom report or dashboard builder | SQL / warehouse / data share | Scheduled email delivery | Export | Alerts / RAG flags | Mobile | AI natural-language Q&A | Predictive scores |
|---|---|---|---|---|---|---|---|---|---|
| Dental Intelligence | Y | P | ? | Y | P | P | Y | Y | Y |
| Practice by Numbers | Y | Y | ? | ? | Y | ? | ? | Y | ? |
| Jarvis Analytics | P | Y | ? | Y | ? | P | ? | ? | ? |
| Dentrix Ascend (native) | ? | Y | P | P | Y | P | ? | P | ? |
| Dentrix / Dentrix Enterprise | P | ? | ? | ? | ? | ? | P | ? | ? |
| Open Dental | ? | P | Y | ? | Y | ? | P | ? | ? |
| Curve Dental | ? | P | ? | ? | ? | ? | ? | ? | ? |
| CareStack | ? | Y | ? | ? | P | ? | ? | ? | ? |
| tab32 | P | Y | Y | ? | Y | ? | ? | P | ? |
| Eaglesoft | ? | ? | ? | P | P | ? | ? | ? | ? |
| Denticon (DPA + Reports) | P | N* | P | ? | Y | P | ? | ? | Y |
| Adit | ? | ? | ? | ? | ? | P | P | ? | ? |
| Weave | Y | ? | ? | ? | Y | ? | Y | ? | ? |
| Sikka Optimizer X | Y | ? | P | ? | P | ? | ? | Y | ? |
| Oryx | ? | P | ? | ? | ? | ? | ? | ? | ? |
| Archy (adjacent) | ? | ? | P | ? | Y | P | ? | Y | ? |
| NexHealth Insights (adjacent) | ? | ? | ? | ? | N | ? | ? | ? | ? |

\* DPA only: its FAQ says new metrics, visuals, tables and reports cannot be created `[DEN-2]`. Dentilytics Enterprise is
described as customizable but is undocumented publicly.

Reading the matrix: no single product is "Y" across the board. The only product with documented benchmarks, scheduled
email, AI Q&A and predictive scores together is Dental Intelligence, and it is the one with the most accuracy
complaints. No PMS-native product documents all of: custom builder + scheduled delivery + benchmarks + AI Q&A.

---

## 5. Table stakes versus differentiators

**Table stakes (expected by any buyer; absence is disqualifying)**

1. Production, collections and adjustments by provider, office, procedure category/code and carrier, with summary/detail
   and group-by switches and an explicit date basis.
2. Day sheet / end-of-day, deposit and reconciliation reports that tie to the ledger.
3. A/R aging split patient vs insurance with standard buckets, plus credit balances.
4. Outstanding claims aging, claims not sent, procedures not billed to insurance.
5. Recall due / overdue lists and an unscheduled-treatment list that shows remaining insurance benefits.
6. New patients, active patients, referral-source analysis.
7. Appointment reports: broken, cancelled, no-show, scheduled production, unscheduled list.
8. KPI dashboard: production vs goal, collection %, new patients, case acceptance, hygiene reappointment,
   cancellations/no-shows, A/R.
9. Morning huddle with yesterday / today / tomorrow.
10. Provider-level performance view and provider/office goals.
11. Global filters for date range, office, provider, with prior-period comparison.
12. Drill-down from a number to the patient rows behind it.
13. Print and export (PDF, XLSX, CSV); favorites / saved criteria.
14. Role-based visibility of financial numbers, including "own numbers only" for providers.
15. Multi-office selection and roll-up for group practices.

**Differentiators (few competitors do them well)**

1. One governed metric layer so dashboards, reports, exports and AI answers always agree with the ledger.
2. Real-time (or near real-time) data with a visible "as of" timestamp.
3. Natural-language assistant that returns charts, tables, what-if estimates and drafted communications, scoped by
   permissions.
4. Predictive scores (attendance, acceptance, no-show risk) embedded in schedule and lists.
5. Ranked "who should fill this opening" suggestions.
6. Closed-loop outreach analytics: tasks, attempts, outcomes, dollars scheduled and collected per list and per staff member.
7. In-product benchmarks: cross-office inside the organization first, then peer percentiles and fee percentiles.
8. Self-serve custom KPI and scorecard builder with templates, sharing and multiple focus dimensions.
9. Guarded report builder (pivot and row-level modes) on the same semantic model.
10. SQL workspace / warehouse export / BI connectors for DSO analysts; agent access via an MCP-style interface.
11. Subscription engine: scheduled, role-based digests by email with attachments and links back to live views.
12. Treatment-team attribution and non-provider scorecards.
13. Treatment funnel that separates acceptance from completion.
14. Marketing and referral ROI ("matchback") and communication-funnel analytics.
15. Threshold alerts and anomaly flags with configurable red / yellow / green bands.
16. Present mode for team meetings; mobile huddle.

---

## 6. Feature ideas worth adopting

Priority: P0 = needed for parity at launch; P1 = strong differentiator soon after; P2 = advanced.

| # | Idea | Inspired by | Why it helps a dental business | Pri |
|---|---|---|---|---|
| 1 | Morning Huddle with Yesterday / Today / Tomorrow / Day-after tabs and an editable metric set | Dental Intelligence, Practice by Numbers, Denticon DPA | A 10-minute daily ritual that turns numbers into the day's actions | P0 |
| 2 | "Patients not rescheduled" split into new, existing and broken appointments | Dental Intelligence | Shows exactly who left yesterday without a next visit — the cheapest production to recover | P0 |
| 3 | Month-to-date forecast: completed + scheduled vs goal, and the daily average still needed | Dental Intelligence, Denticon DPA | Tells the team mid-month whether the goal is reachable and by how much per day | P0 |
| 4 | Per-patient huddle flags: balance, unscheduled treatment, recall due, unscheduled family members, missing forms, birthday | Practice by Numbers, Curve "Who's On Deck", Dental Intelligence | Front desk and clinicians address money, treatment and family scheduling while the patient is present | P0 |
| 5 | Opportunity tiles: A/R of today's patients, pending treatment dollars on today's recare exams, SRP opportunities, unconfirmed next 7 days, no-shows last 7 days | Denticon DPA | Converts the schedule into a same-day revenue checklist | P0 |
| 6 | Click an open schedule block to get ranked suggested patients, with a shared snooze | Dental Intelligence | Fills last-minute holes with patients most likely to accept, show and pay | P1 |
| 7 | Provider scorecard (production per hour / day / visit, same-day %, acceptance, hygiene and perio ratios) with drill to patients | Dental Intelligence Provider Pulse, Denticon Provider Breakdown | Fair, coachable comparison of clinicians; basis for compensation conversations | P0 |
| 8 | Auto goals = scheduled clinical hours x production-per-hour goal; monthly plan cascades to provider and office; working days autofilled from schedules | Dental Intelligence, CareStack, Dentilytics Basic | Goals stay realistic when schedules change; no spreadsheet upkeep | P0 |
| 9 | Scorecard builder with a focus dimension (office, provider, procedure code, referral source, carrier, team member), template gallery, sharing | Dental Intelligence Scorecards, CareStack Scorecards | Each role gets a repeatable like-for-like view; DSOs standardize reviews | P1 |
| 10 | Treatment-team attribution (dentist + hygienist/assistant + treatment coordinator per visit) | Dental Intelligence | Case-acceptance credit reaches the people who influence it; coordinators become measurable | P1 |
| 11 | Outreach results dashboard: scheduled and collected dollars per task type, automation and staff member | Dental Intelligence Team Tasks Results | Proves which follow-up work pays; justifies staffing and automation | P1 |
| 12 | Revenue Finder: opportunity categories ranked by dollar potential, with a what-if (% expected to comply x average visit value) | Practice by Numbers Revenue IQ, Eaglesoft Revenue Opportunities | Prioritizes the biggest recoverable revenue first and sizes the upside | P1 |
| 13 | Patient Finder with rich filters, presets, saved filter library, and "has / lacks a planned / completed code" logic | Eaglesoft Money Finder, Dental Intelligence Patient Finder, Open Dental Treatment Finder | Finds clinical gaps (root canal without crown, SRP without maintenance) and benefit-expiry targets | P0 |
| 14 | Insurance-aware lists: remaining benefit threshold, benefit-year start month, dual coverage | Open Dental Treatment Finder, Dentrix Treatment Manager, Eaglesoft | Year-end "use it or lose it" campaigns reliably raise acceptance | P0 |
| 15 | Natural-language-to-filter ("AI Filters") that produces editable, transparent filters | Dental Intelligence, Practice by Numbers | Non-technical staff build precise lists without learning the filter UI; results stay auditable | P1 |
| 16 | Smart tasks from any list: auto-assign, due buckets, logged outcomes (no answer, voicemail, scheduled) | Practice by Numbers | Nothing falls through; managers see effort and conversion | P1 |
| 17 | Bulk actions on any list: text/email campaign, letters/labels/postcards, payment request with follow-ups, invite-to-schedule link | Dental Intelligence, Eaglesoft, Open Dental | One click from insight to outreach across every channel the office uses | P0 |
| 18 | Patient lifecycle segments Active / Danger Zone / Inactive with one-click reactivation and lapsed-revenue estimate | Denticon DPA, NexHealth Insights | Catches patients before they are lost; quantifies the prize | P0 |
| 19 | Drill-through on every number to patient, claim or ledger rows, with a breadcrumb back | CareStack, Archy, Denticon DPA | Builds trust; lets staff act on the exact records | P0 |
| 20 | Configurable red/yellow/green thresholds per metric with sensible defaults | Denticon DPA | Managers scan for exceptions instead of reading every number | P0 |
| 21 | Comparison presets: same day last week, prior month, prior YTD, same month last year, trailing twelve months | Denticon DPA, Jarvis | Removes seasonality noise; standardizes "vs what" | P0 |
| 22 | Top N / Bottom N and top/bottom 20% leaderboards for offices and providers | Denticon DPA, Jarvis Scorecards | Regional managers see where to coach and whom to copy | P1 |
| 23 | Benchmark overlay: percentile ladder and "Top / Average / You" on each KPI, normalized by practice size and specialty | Practice by Numbers, Weave, Dental Intelligence | Owners learn whether a number is good, not just what it is | P2 |
| 24 | Fee benchmarking by zip-code percentile and a fee optimizer weighing frequency and profitability | Sikka | Underpriced fee schedules are silent revenue leaks | P2 |
| 25 | Metric glossary: definition and formula on every tile plus "which report reconciles this" | Dental Intelligence, Denticon Metrics Glossary | Ends arguments about what a number means; cuts support load | P0 |
| 26 | Organization-level metric settings (gross vs net production type, adjustment mapping to production or collections, date basis) | Jarvis, Dental Intelligence, Dentrix | Each organization's accounting policy is honored consistently everywhere | P0 |
| 27 | Custom KPI builder (formula over governed measures) | Jarvis, CareStack | DSOs track their own playbook metrics without engineering | P2 |
| 28 | Report builder with pivot and row-level modes, field picker, filters, save as custom — templates first | Dentrix Ascend Power Reporting | Long-tail questions answered self-serve; guardrails avoid the "clumsy" trap | P1 |
| 29 | One parameterized report instead of many: summary/detail toggle, group-by selector, inline office multi-select, dynamic options | Denticon New Reports Menu | Smaller catalog, easier to find, fewer duplicates to maintain | P0 |
| 30 | SQL workspace: released queries, three permission tiers, example library, friendly formatting, open-patient action, read replica | Open Dental | Power users and consultants extend reporting safely without slowing production | P2 |
| 31 | Warehouse export and BI connectors; agent access through an MCP-style interface | tab32, Dentrix Ascend MCP, Denticon data share | DSOs keep their BI investments; AI agents get governed read access | P2 |
| 32 | Scheduled digests: daily/weekly/monthly role-based emails, end-of-day report to a distribution list, huddle to inbox | Dental Intelligence, Jarvis | Owners who never log in still see the numbers; accountability by default | P1 |
| 33 | Quick Reports bundles plus favorites and auto-archive to a document store | Eaglesoft Quick Reports / SmartDoc, Denticon My Favorites | End-of-day and month-end close become one click with an audit trail | P1 |
| 34 | Analytics assistant: plain-language Q&A, charts, what-if, executive summary, drafted team email, saved threads, file upload, explicit accuracy caveat | Dental Intelligence Explorer, Archy Intelligence, Dentrix Ascend Ask, Sikka DentalLLM, Practice by Numbers PiQ/RiQ | Gives every owner an analyst; shortens question-to-decision time | P1 |
| 35 | "Explain this view" assistant scoped to the open scorecard or report | Dental Intelligence "Dot" | Lower-risk first AI step; answers stay grounded in visible data | P1 |
| 36 | Predictive scores on appointments and lists (attendance, acceptance, no-show / late-cancel risk) | Dental Intelligence Patient Scoring, Denticon Patient Insights | Confirmation effort and overbooking decisions go where risk is highest | P2 |
| 37 | Financial worklists: A/R aging, open denials, unbilled procedures as queues filterable by carrier | Archy, Open Dental, Dentrix Enterprise | Billing staff work a prioritized queue instead of reading a report | P0 |
| 38 | Collections analytics pack: 90-day collection %, A/R days, A/R ratio, over-the-counter %, patient vs insurance split, collections scorecard by office | Dental Intelligence Collections Board, Denticon DPA | Cash-flow health at a glance; spots offices with collection problems | P0 |
| 39 | Hygiene pack: reappointment %, perio %, adjunctive therapy %, fluoride %, retention by child / prophy / SRP / perio, production per chair hour | Denticon DPA Hygiene Recall, Dental Intelligence | Hygiene drives retention and restorative diagnosis; makes the department manageable | P0 |
| 40 | Treatment funnel Diagnosed -> Accepted -> Scheduled -> Completed with the acceptance-vs-completion gap | Denticon DPA, Planet DDS Deep Dive | Reveals whether the problem is presentation, scheduling or follow-through | P0 |
| 41 | Marketing matchback and referral-source scorecards; patients-by-zip map | Jarvis, Dental Intelligence, Denticon DPA | Spend goes to sources that yield producing patients | P2 |
| 42 | Communication funnel analytics (recall sent -> delivered -> booked; undeliverable contact data) | Weave Auto Recall Analytics, NexHealth Insights | Measures whether reminders and recalls actually create visits; exposes bad contact data | P1 |
| 43 | Present mode and print-ready huddle; mobile huddle view | Archy, Dental Intelligence | Works on the operatory TV or a phone; no export needed for meetings | P2 |
| 44 | "Data as of" timestamp and refresh control on every cached aggregate | Dentrix Ascend | Users know how current a number is; fewer mismatch tickets | P0 |
| 45 | Permission modes: hide production figures in huddle; providers see only their own numbers; per-report locks | Dental Intelligence, Open Dental, CareStack | Shares operational insight without exposing owner financials | P0 |
| 46 | Saved option sets per report, with the office stored as a variable rather than a fixed value | Dentrix Daily Huddle, Denticon My Favorites (inverse of its gotcha) | Reusable criteria that follow the user's working office | P0 |

---

## 7. Anti-patterns to avoid (drawn from competitor weaknesses)

| Anti-pattern | Where seen | Design response |
|---|---|---|
| Dashboards and reports computing the same metric differently | Denticon DPA vs Reports `[DEN-4]`; Dentrix Ascend (R) `[ASC-R1]`; DI vs PMS `[DI-13]` | One semantic layer; every tile links to the reconciling report |
| Nightly refresh presented as live | DI, DPA, Curve | Real-time where feasible; otherwise an "as of" stamp |
| Fixed dashboards with no customization | DPA `[DEN-2]`, Dentilytics Basic `[DEN-6]` | Editable metric sets, custom scorecards |
| Builder exposed without templates or guardrails | Ascend Power Reporting (R) | Start from templates; governed fields; preview totals |
| Top-N truncation without "show all" | DPA top 5 carriers `[DEN-1]` | Always offer full list and export |
| Filters that ignore the selected period for some widgets | DPA Provider Collections `[DEN-1]` | Label as-of widgets clearly; never mix silently |
| Export caps and print gaps | DI Patient Finder 500 rows; General Reports not printable `[DI-8][DI-9]` | Background export jobs with notification |
| Favorites that hard-code an office | Denticon `[DEN-12]` | Store "current working office" as a token |
| Large reports failing synchronously | Denticon "file size too large" `[DEN-12]` | Async report queue, pagination, streaming export |
| Benchmarks not normalized | PbN `[PBN-6]` | Cohort by size, specialty, region; show sample size |
| Multi-location view that drops detail | DI `[DI-4]` | Keep drill-down under any office selection |
| Manual goal and hours entry | Eaglesoft Trends `[ES-2]` | Derive from schedules and time clock; allow overrides |
| Ambiguous threshold bands | DPA `[DEN-1]` | Non-overlapping bands validated on save |
| AI answers without scope or caveats | General risk; DI publishes an accuracy caveat `[DI-7]` | Show filters used, source rows and definitions with every answer |

---

## 8. Gaps and unverified items

- Review sites (G2, Capterra, Software Advice) and several trade-press pages blocked retrieval; complaint evidence is
  snippet-level (R)/(S) and skewed toward what search surfaced. No Reddit or Dentaltown threads were retrieved.
- Dentrix Enterprise Reports Reference (IHS PDF) could not be opened; the Enterprise catalog here is partial.
- Dentilytics Enterprise has no public functional description beyond one sentence.
- Jarvis, Sikka Optimizer X, Oryx, Adit and tab32 publish marketing-level detail only; exports, scheduling, alerts and
  mobile are mostly "not found".
- Scheduled report delivery is asserted by marketing for the Dentrix Ascend analytics suite and by third parties for
  Practice by Numbers, without help-center confirmation.
- Pricing figures are third-party or vendor-comparison claims.
- Dental Intelligence's benchmark values and Weave's benchmark values are not public.
- Curve's current dashboard list post-2019 and "Ask CurveAI" analytics scope are unconfirmed.
- Feature availability differs by package (for example Dental Intelligence unified dashboard vs Analytics-only portal;
  Engagement or Payments modules required for some actions).

---

## 9. Sources

Dental Intelligence
- [DI-1] https://dentalintel.com/analytics
- [DI-2] https://intercom.help/dental-intel/en/articles/12002688-morning-huddle
- [DI-3] https://intercom.help/dental-intel/en/articles/12002677-provider-pulse
- [DI-4] https://intercom.help/dental-intel/en/articles/12002675-performance-board
- [DI-5] https://intercom.help/dental-intel/en/articles/12002668-collections-board
- [DI-6] https://intercom.help/dental-intel/en/articles/12002695-scorecards
- [DI-7] https://educate.dentalintel.com/en/articles/15192785-explorer
- [DI-8] https://educate.dentalintel.com/en/articles/14111673-patient-finder-filters-and-common-searches
- [DI-9] https://intercom.help/dental-intel/en/articles/12003267-general-reports
- [DI-10] https://intercom.help/dental-intel/en/articles/12579825-data-driven-benchmarks-to-guide-your-practice-growth
- [DI-11] https://educate.dentalintel.com/en/articles/16149827-september-1-2026-product-updates
- [DI-12] https://www.dentalintel.com/dso-home
- [DI-13] https://intercom.help/dental-intel/en/articles/635747-reports-in-dentrix
- [DI-14] https://intercom.help/dental-intel/en/articles/909502-reports-in-eaglesoft
- [DI-15] https://intercom.help/dental-intel/en/articles/16651312-team-tasks-results-report (S)
- [DI-16] https://www.drbicuspid.com/dental-business/industry-updates/product-updates/article/15828956/dental-intelligence-launches-new-ai-features (S)
- [DI-18] https://www.dentalintel.com/patient-finder (S)
- [DI-P1] https://dentalintel.com/resale-terms ; https://www.softwarepundit.com/node/72 ; https://www.selecthub.com/dental-software/dental-intel/ (S)
- [DI-R1] https://www.g2.com/products/dental-intelligence-analytics/reviews ; https://www.capterra.com/p/185878/Dental-Intelligence/reviews/ (R)
- [DI-R3] https://www.techradar.com/reviews/dental-intelligence (S)

Practice by Numbers
- [PBN-1] https://practicenumbers.com/business-analytics/practice-iq/
- [PBN-2] https://practicenumbers.com/business-analytics/revenue-iq/
- [PBN-3] https://practicenumbers.com/business-analytics/enterprise-dashboard/
- [PBN-4] https://practicenumbers.com/business-analytics/daily-huddle/ ; https://practicenumbers.com/operational-efficiency/daily-huddle/
- [PBN-5] https://help.practicenumbers.com/en/articles/10630289-updated-huddle-page
- [PBN-6] https://help.practicenumbers.com/en/articles/9980232-cross-practice-statistics-panel
- [PBN-7] https://practicenumbers.com/pbn-ai/ops-ai/
- [PBN-8] https://practicenumbers.com/compare/practice-by-numbers-vs-dental-intel/ (vendor-authored comparison)
- [PBN-9] https://help.practicenumbers.com/en/articles/9980097-eaglesoft-essentials (S)
- [PBN-R1] https://www.g2.com/products/practice-by-numbers/reviews (R)

Jarvis Analytics
- [JAR-1] https://jarvisanalytics.com/
- [JAR-2] https://www.jarvisanalytics.com/how-to-use-jarvis/
- [JAR-3] https://www.henryscheinone.com/products/jarvis-analytics/
- [JAR-4] https://www.dentrixascend.com/dental-solutions/practice-data-and-analytics/dentrix-ascend-profitability-insights-suite/
- [JAR-R1] https://www.g2.com/products/jarvis-analytics/reviews (R)

Dentrix Ascend
- [ASC-1] https://www.dentrixascend.com/dental-solutions/practice-data-and-analytics/
- [ASC-2] https://learn.dentrixascend.com/courses/financial-essentials-for-teams/lessons/financial-reporting/topic/exploring-the-insights-dashboard/
- [ASC-3] https://learn.dentrixascend.com/courses/administrative-essentials/lessons/power-reporting/topic/power-reporting-overview/
- [ASC-4] https://learn.dentrixascend.com/courses/administrative-essentials/lessons/power-reporting/topic/using-filters-to-customize-your-power-reports
- [ASC-5] https://learn.dentrixascend.com/courses/administrative-essentials/lessons/power-reporting/topic/adding-a-field-to-a-power-report/
- [ASC-6] https://learn.dentrixascend.com/production-collection-and-growth-how-did-you-do-last-year/
- [ASC-7] https://learn.dentrixascend.com/patient-list-report/ (S)
- [ASC-8] https://www.henryscheinone.com/about-us/press-release/dentrix-ascend-opens-mcp-layer/
- [ASC-9] https://learn.dentrixascend.com/courses/administrative-essentials/lessons/power-reporting/topic/deciding-which-report-to-use-in-dentrix-ascend/
- [ASC-10] https://learn.dentrixascend.com/tag/power-reports (S)
- [ASC-R1] https://www.capterra.com/p/177828/Dentrix-Ascend/reviews/ (R)

Dentrix and Dentrix Enterprise
- [DTX-1] https://henryschein.com/us-es/dental/business-solutions/practice-services-knowledge-center-articles/use-daily-huddle-to-track-practice-progress.aspx
- [DTX-2] https://hsps.pro/Dentrix/Help/mergedProjects/Office%20Manager/Office_Manager_Reports/Management_Reports/Provider_A_R_Totals_Report.htm
- [DTX-3] https://magazine.dentrix.com/5-dentrix-reports-every-office-should-use/
- [DTX-4] https://blog.dentrixenterprise.com/key-reports-to-check-the-health-of-your-organization/
- [DTX-6] https://www.ihs.gov/doh/edr/documents/Dentrix_Enterprise_11.0_Reports_Reference.pdf (not retrievable; S)
- [DTX-7] https://www.drbicuspid.com/dental-practice/article/15377142/ask-the-dentrix-expert-how-can-i-reach-out-to-patients-about-remaining-insurance-benefits (S)

Open Dental
- [OD-1] https://opendental.com/manual/reports.html
- [OD-2] https://opendental.com/manual/reportsstandard.html
- [OD-3] https://opendental.com/manual/reportsgraphic.html
- [OD-4] https://opendental.com/manual/queryoverview.html
- [OD-5] https://opendental.com/manual/reportserver.html
- [OD-6] https://opendental.com/manual/reporttreatfinder.html
- [OD-7] https://opendental.com/manual/recalllist.html
- [OD-8] https://opendental.com/manual/odtouchreports.html (S)
- [OD-R1] https://www.capterra.com/p/122350/Open-Dental/reviews/ ; https://www.g2.com/products/open-dental-software-open-dental-software/reviews (R)

Curve Dental
- [CUR-1] https://www.curvedental.com/business-analytics
- [CUR-2] https://curvedental.com/dental-report-software
- [CUR-3] https://www.dentalproductsreport.com/view/curve-dental-announces-curve-business-intelligence
- [CUR-4] https://curvedental.com/blog/the-all-new-playbook-basic-dental-dashboard
- [CUR-5] https://curvedental.com/blog/introducing-recare-referral-and-treatment-plan-dashboards
- [CUR-6] https://hellopearl.com/news/pearl-expands-ai-integration-with-curve-dental-to-include-practice-intelligence (S)
- [CUR-R1] https://www.capterra.com/p/98688/Curve-Dental-Hero/reviews/ ; https://www.g2.com/products/curve-hero/reviews (R)

CareStack
- [CS-1] https://carestack.com/dental-software/features/analytics
- [CS-2] https://carestack.com/dental-software/features/reporting ; https://carestack.com/dental-software/features/analytics-reporting
- [CS-3] https://carestack.com/en-GB/dental-software/features/scorecards
- [CS-4] https://carestack.com/en-GB/dental-software/features/practice-analytics
- [CS-5] https://carestack.com/en-GB/dental-software/features/custom-reporting (S)
- [CS-6] https://carestack.com/dental-software/ai-suite (S)
- [CS-R1] https://www.capterra.com/p/176206/CareStack/reviews/ (R)

tab32
- [T32-1] https://tab32.com/summit/
- [T32-2] https://tab32.com/
- [T32-3] https://cloud.google.com/blog/topics/healthcare-life-sciences/tab32-builds-dental-practice-management-platform-on-google-cloud
- [T32-4] https://www.newswire.com/news/tab32-announces-the-release-of-open-data-warehouse-for-dsos-21259894 (S)
- [T32-R1] https://www.capterra.com/p/149415/tab32/reviews/ ; https://www.g2.com/products/tab32/reviews (R)

Eaglesoft
- [ES-1] https://pattersonsupport.custhelp.com/euf/assets/Eaglesoft/Reports/Reporting_and_Date_Based_Reporting_Attendee_Handout.pdf
- [ES-2] https://pattersonsupport.custhelp.com/euf/assets/Eaglesoft/Money_Finder/Snapshot_Money_Finder_Trends_Revenue_Opportunities_16_rev0112.pdf
- [ES-3] https://pattersonsupport.custhelp.com/app/answers/detail/a_id/13796/~/guide-to-finding-the-optimal-eaglesoft-report
- [ES-4] https://www.dentaleconomics.com/practice/article/16391621/using-practice-management-reports-to-be-a-better-business-owner
- [ES-R1] https://www.capterra.com/p/60064/EagleSoft-13-00/reviews/ (R)

Planet DDS Denticon
- [DEN-1] https://support.planetdds.com/hc/en-us/articles/49789717199771-Understanding-the-Denticon-Practice-Analytics-Dashboards-A-Complete-Guide-to-Metrics-and-Reports
- [DEN-2] https://support.planetdds.com/hc/en-us/articles/13934611697947
- [DEN-3] https://support.planetdds.com/hc/en-us/articles/49834695041947-Getting-Started-with-Denticon-Practice-Analytics-DPA
- [DEN-4] https://support.planetdds.com/hc/en-us/articles/49834771623067
- [DEN-5] https://support.planetdds.com/hc/en-us/articles/49830353492123
- [DEN-6] https://support.planetdds.com/hc/en-us/articles/360003797371-How-am-I-able-to-understand-the-information-within-Dentilytics-Basic
- [DEN-7] https://support.planetdds.com/hc/en-us/articles/4408457645723-How-to-understand-the-new-reports-menu
- [DEN-8] https://support.planetdds.com/hc/en-us/articles/43708103359259
- [DEN-9] https://support.planetdds.com/hc/en-us/articles/51221557873691-Truro-Integration-with-Denticon-Patient-Insights
- [DEN-10] https://www.planetdds.com/wp-content/uploads/2023/06/Flyer-Denticon-Morning-Huddle-050923.pdf
- [DEN-11] https://web.planetdds.com/denticon-practice-analytics-demo
- [DEN-12] Help Center articles 38203450746139, 360059445452 (My Favorites), 115002088512 (Recall Due), 52118284530971 (Scheduled Recall), 36706153887131 (Appointment Detail), 115002087572 (Capitation Utilization), 360049517211 (Scheduled Production), 49239504234011 (file size error), 39982676222235 (Time Clock), 36030927904027 (Special Transaction), 32106948279195 (Provider goals) — https://support.planetdds.com/hc/en-us/articles/<id>. The Help Center spans several Planet DDS products; attribution of these FAQs to Denticon is inferred from their menu paths
- [DEN-13] https://www.planetdds.com/newsroom/2026-deep-dive-report
- [DEN-14] https://www.planetdds.com/roadmap-preview/ (S)
- [DEN-R1] https://www.g2.com/products/denticon ; https://www.capterra.com/p/35009/Denticon/reviews/ (R)

Adit
- [AD-1] https://adit.com/practice-analytics
- [AD-2] https://adit.com/adits-new-practice-analytics-module-makes-data-digestible-for-dentists (S)
- [AD-R1] https://www.softwareadvice.com/dental/adit-profile/reviews/ ; https://www.g2.com/products/adit (R)

Weave
- [WV-1] https://getweave.com/weave-practice-analytics
- [WV-2] https://www.getweave.com/reports
- [WV-3] https://www.getweave.com/want-to-quickly-increase-dental-treatment-acceptance-use-practice-analytics/
- [WV-4] https://www.marketscale.com/industries/healthcare/ada-endorsement-puts-weave-on-the-shortlist-for-dental-front-office-tech
- [WV-5] https://adanews.ada.org/ada-news/2026/march/ada-member-advantage-endorses-weave-as-patient-engagement-platform/ (S)
- [WV-6] https://www.dentalproductsreport.com/view/new-software-feature-from-weave-empowers-dental-practices (S)
- [WV-R1] https://www.capterra.com/p/141842/Weave/ ; https://www.g2.com/products/weave-weave/reviews (R)

Sikka and benchmarks
- [SK-1] https://sikka.ai/optimizer
- [SK-2] https://sikkasoft.com/dental-practice-optimizer
- [SK-3] https://www.sikka.ai/fee-survey
- [SK-4] https://help.sikka.ai/fee-optimizer-dental-faq
- [BM-1] https://www.henryscheinone.com/insights/ebook/2026-catalyst-index/

Oryx
- [OX-1] https://www.oryxdental.com/practice-management/
- [OX-2] https://www.oryxdental.com/pricing/
- [OX-R1] https://www.g2.com/products/oryx-dental-software (R)

Adjacent entrants and third-party comparisons
- [AR-1] https://www.archy.com/platform/dental-practice-analytics
- [NX-1] https://www.nexhealth.com/features/insights
- [PL-1] https://hellopearl.com/products/practice-intelligence (S)
- [3P-1] https://www.dentalbase.ai/blogs/practice-management/dental-analytics-platforms-compared-2026-guide (vendor-adjacent blog)
- [3P-2] https://denture-id.com/practice-management/practice-analytics/
