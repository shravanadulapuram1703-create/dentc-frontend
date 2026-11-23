# Denticon analytics and report-menu structure, and DSO / multi-office analytics practice — research reference

Research input for the Reports & Analytics module plan. Researched 2026-11-21/22.

- **Part 1** — Planet DDS Denticon: reports menu, Interactive Reports, Office Reports, My Reports, My Favorites, Search Report,
  Denticon Practice Analytics (DPA) with metric definitions, Dentilytics, office groups, security rights, recommended routines.
- **Part 2** — DSO / multi-office analytics practice: roll-ups, same-store comparison, ranking, benchmarking, hierarchies,
  centralized billing / RCM dashboards, provider compensation reports, goal cascades, data governance.
- **Part 3** — Implications for our module (analyst recommendations, clearly separated from sourced facts).

Sibling documents (not repeated here): `competitor_analytics_teardown.md` (product-by-product teardown) and
`dental_kpi_dictionary.md` (KPI formulas and benchmark tables). This file goes deeper on Denticon's own structure and
on multi-location practice.

---

## 0. Evidence legend and method

| Tag | Meaning |
|---|---|
| `[Hn]` `[Dn]` `[On]` | Planet DDS Help Center article (H = reports / setup / security, D = Practice Analytics and Dentilytics, O = DentalOS). Read in full. |
| `[Vn]` | Vendor or industry page, read in full unless marked otherwise. |
| **(S)** | Seen only as a search-result summary; the page itself could not be opened (404). Lower confidence. |
| **[unverified]** | No source found, or an inference. Do not treat as fact. |
| **[conflict]** | A publisher's own documents disagree with each other, or a page is internally inconsistent. |

Method notes that affect confidence:

- `support.planetdds.com` returns HTTP 403 to page fetchers. Article text was read through the Help Center's public
  article API (same content, same article ids). Screenshots inside articles were **not** readable, so any fact that
  exists only in a screenshot (exact menu order, full list of menu items, every on-screen filter) is missing.
- The web-search budget shared by the research run was exhausted part-way through Part 2. Topics affected are listed in
  section 16.
- Report names, menu paths, field names and security-right names are reproduced exactly because they are identifiers.
  Descriptions are paraphrased.

---

## 1. Top findings for planners

1. Denticon's menu is a **flat list of category sub-menus plus four cross-cutting entry points** (`Search Report`,
   `My Favorites`, `My Reports`, `Interactive Reports`) and one tenant-specific folder (`Office Reports`) `[H1][H2][H4][H5][H6][H10]`.
2. The new reports menu collapsed separate summary / detail / group reports into **one report with criteria**
   (format, group-by, office or office-group selection, dynamic options, `Include All` defaults) `[H1]`.
3. **`Interactive Reports` are work queues, not printouts.** Only two are documented: `Eligibility Verification` and
   `Unsigned Progress Notes`, both with inline row actions `[H6][H7][H8]`.
4. **`Office Reports` is a per-customer custom-report folder.** Security rights exist per customer set (`ADRpts`,
   `BNRpts`, `GSRpts`, `HawaiiRpts`, `VHRpts`) and documented paths look like
   `Reports > Office Reports > [Location Name] Reports > ...` `[H9][H10][H13]`.
5. **`My Reports` is a restriction mechanism**, not a favorites list: a user linked through the `Report Access Provider`
   field can only run a fixed set of reports for self / the linked provider `[H5]`.
6. **`My Favorites` saves report criteria per user** and silently pins the office the user was logged into when saving `[H3][H4]`.
7. DPA is **eight fixed Power BI Embedded dashboards**, refreshed nightly (~1 AM PST), filter-only, no custom
   metrics or reports `[D1][D3]`. Its value is in the published metric logic (section 8), which is the most detailed
   public specification of a dental KPI engine found.
8. DPA's rules are precise and reusable: half-day / full-day working-day rule (4 hours), six-layer available-hours
   precedence, goal math with explicit zero / negative edge cases, 85 / 95 colour thresholds `[D1][D5][D6]`.
9. Planet DDS's own documentation **contradicts itself** in several places (thresholds for Actual vs Scheduled
   Production, A/R basis by dashboard, two reappointment methods, `Prod Chair Per Hour` divided by days). A dedicated
   troubleshooting article exists for DPA-versus-Reports mismatches `[D13]`. Reconciliation is the weak point to beat.
10. Multi-office correctness hinges on **which office a figure belongs to**: home office of the responsible party
    (`Aging by Home Office`), transaction office (production), office where the procedure was charged (income
    allocation), appointment office (SmartAssist) `[H24][H25][H29][H38]`.
11. Report access is governed by **per-sub-menu security rights with `Full Control` / `View Only`**, assigned to
    security groups per office; inclusive rights win when a user is in several groups `[H13][H16][H17]`.
12. Reports already trigger work: `Create Task` on Outstanding Claims / Aging by Home Office, `Send SMS/Email` from
    DPA detail reports, sign-from-report, eligibility check-from-report `[H53][H54][D21][H8][H6]`.
13. DSO tools converge on the same toolkit: Overview / By Location / By Region views, top-and-bottom ranking,
    customizable scorecards with templates and benchmarks, view-only sharing, goal tracking `[V4][V5][V7][V10]`.
14. The best public same-store and RCM methodology is Planet DDS's 2026 Deep Dive: same-store on locations active in
    both years, three averages (simple, trimmed, revenue-weighted), a five-component RCM Health Score, and a
    warning / target / elite threshold table `[V1]`.
15. Planet DDS's 2026 direction is **org groups + scoped admin roles + AI agents with an ROI dashboard** (DentalOS),
    not a report builder `[O3][O4][O5]`.

---

# PART 1 — Planet DDS Denticon

## 2. Reports menu structure

### 2.1 Top-level `Reports` menu

The exact on-screen order is only in screenshots **[unverified order]**. Each entry below is confirmed by at least one
article that names the path.

| Menu entry | Kind | What it holds | Source |
|---|---|---|---|
| `Search Report` | Utility | Keyword search across reports; results show a description and a direct link | `[H2]` |
| `My Favorites` | Per-user | Saved report criteria (name, breadcrumb, delete) | `[H3][H4]` |
| `My Reports` | Per-user, restricted | Fixed set of user- and provider-scoped reports | `[H5]` |
| `Daily Reports` | Category | Journals, collection, production, audit, deposit slip, progress notes, scheduled production | `[H10][H37][H42]` |
| `Monthly Reports` | Category | Executive Summary, aging family, Income Allocation, Waterfall, unallocated items | `[H11][H24][H29][H9]` |
| `Management Reports` | Category | Audit Trail, Time Clock, Uncollected Co-Pay | `[H22][H57][H9]` |
| `Insurance Reports` | Category | Outstanding Claims, Claims List, 835 Denial, capitation, unbilled / on-hold | `[H10][H39][H68]` |
| `Appointment Reports` | Category | Appointment Detail / List, time stamps, routing slips, SmartAssist Report Card | `[H10][H46][H38]` |
| `Treatment Plan Reports` | Category | Treatment Plan Analysis, Treatment Plan Status | `[H40][H9]` |
| `Referral Reports` | Category | Six referral reports | `[H51]` |
| `Recall Reports` | Category | Recall Due, Post-Op, Procedural Recall | `[H49][H50]` |
| `Ortho Reports` | Category | Five ortho reports | `[H52]` |
| `Ledger Reports` | Category | Patient- or responsible-party-specific ledger reports | `[H13]` |
| `Lists` | Category | Patient / Resp. Party, Provider, Procedure / Fee, Prescription, Employer, Office, Security lists | `[H13][H18][H69]` |
| `Statements` | Batch output | Print Statements, Email Statements, Update Stmt Dates | `[H11]` |
| `Letters`, `Custom Letter`, `Labels`, `Postcard`, `Custom Postcard`, `Blank Insurance Form` | Batch output / templates | Batch correspondence and template editors | `[H13][H11]` |
| `Interactive Reports` | Work queues | See section 3 | `[H6][H7]` |
| `Office Reports` | Tenant-specific | See section 4 | `[H10][H13]` |
| `Excel Reports` | Output family | Named only as a security right (reports generated in Excel format) | `[H13]` |
| `Reports (old)` > `Group Reports` > `Management Reports` / `Daily Reports` / `Other Reports` | Legacy menu still reachable | Enterprise (group) versions; `Other Reports` holds the User Activity Report | `[H9][H20][H53]` |

### 2.2 What the new reports menu changed `[H1]`

| Change | Detail |
|---|---|
| Variant consolidation | Separate summary, detail and group reports became one report with criteria. Example: `Production Report` replaces `Production by Provider Detail` and `Production by Provider Summary`; criteria choose summary or detail and by code, provider, category or carrier. |
| Multi-office inside the report | No separate group-reports section; applicable reports carry an office / office-group selector. |
| Dynamic options | Some options appear only when relevant to other selections. |
| Defaults | Many selectors default to `Include All`; narrowing requires `SELECT` then unchecking `Include All`. |

Navigation still references `Reports (old)` in current support material (2024 Reporting Matrix, 2026 Task Manager article),
so the consolidation is incomplete from the user's point of view `[H9][H53]`.

### 2.3 Report criteria vocabulary (union across documented reports)

| Criterion | Options documented | Source |
|---|---|---|
| Print Format | PDF, Excel; `Print/Preview` opens the output in a separate window | `[H36][H37][H39]` |
| Office / Group | `Office` (select; current office default) or `Office Group` (select; all by default); single, selected or all offices | `[H37][H36][H27]` |
| Provider | All by default, multi-select; provider and / or user combinations | `[H37][H36]` |
| Date basis | Date range; single `Report Date` (as-of) on some reports; transaction date vs service date; appointment date vs appointment-created date; claim-generated date | `[H11][H36][H48][H68]` |
| Format | Summary vs Detail | `[H43]` |
| Transaction classes | `Services`, `Payments`, `Adjustments` checkboxes; `Show Datewise Summary` | `[H44][H70]` |
| Group By / Sort By | Provider, code, username, insurance plan, transaction provider; sort by patient last name, patient id, date; page break per provider | `[H36][H37]` |
| Patient filters | Patient name range, exclude patient type, patient age | `[H36][H49]` |
| Code filters | Procedure codes, ADA category, payment / adjustment codes (with `None`), insurance plans / subtypes | `[H36][H42]` |
| Fee comparison | `Include UCR` plus fee-schedule picker | `[H31]` |
| Aging options | `Aging By` (Account AR / Patient AR), account balance over a threshold, `Include Balance Status`, `Include Contract Balance`, `Include Credit Balance`, `Show only Credit Balances`, select providers | `[H24][H25][H26][H60][H9]` |
| Buttons | `Print/Preview`, `Add Report to Favorites`, `Create Task` (selected reports) | `[H4][H53]` |

Operational limits: very large runs fail with a file-size error instead of output; guidance is to narrow offices or
use roughly six-month windows and stitch the Excel output manually `[H55]`. Report generation is unsupported on
Firefox, Safari, Brave, Opera and AVG Secure `[H56]`.

### 2.4 Help Center taxonomy of the Reporting area `[H74]`

The Help Center groups its reporting articles into these families, which is the closest public proxy for how Planet DDS
itself classifies report-related work: Daily Reports; Monthly - Yearly Reports; Management Reports; Insurance Reports;
Pre-Authorization Reports; Managed Care/Capitation Reports; Appointment Reports; Routing Slips; Treatment Plan Reports;
Referral Reports; Recall Reports; Procedural Recalls; Non-Dental Recalls; Aging Reports; Ledger Reports; Patient Reports;
Contract Reports; Lists - Patient, RP, Insurance, Fees and more; Interactive Reports; Reports Matrix; New Reports Menu;
Report Generation; Printing Problems; statements (Generating Periodic Statements, Update Statement Dates and Close Out,
Denticon Statement Services); correspondence (Letter Setup, Collection Letters, Recording Sent Letters, Deleting Letters,
Electronic Signing on Letters, Postcards, Label Size, Paper and Envelopes, HIPAA document).

Statements, letters, labels and postcards sit inside the reporting area, so batch patient correspondence is treated as
report output in the legacy tool.

---

## 3. Interactive Reports (every documented entry)

Only two reports are documented in the Help Center's `Interactive Reports` section. The Reporting Matrix explicitly
excludes interactive reports `[H9]`. Whether the menu contains others is **[unverified]**.

| Report | Population rule | Row actions | Filters | Source |
|---|---|---|---|---|
| `Eligibility Verification` | Patients with an appointment on the chosen date whose eligibility is **not verified**. Date defaults to today and can be set to a future date. | Quick patient overview; open carrier website (needs URL in carrier setup); view coverage details (primary or secondary, subscriber info); hover to read the latest eligibility note; hover to see the last eligibility report; run a real-time eligibility check; update eligibility status; update coverage when expired or ineligible; email / SMS the patient through two-way communication to request updated coverage via online registration | Insurance carrier (list limited to carriers present in the result) | `[H6]` |
| `Unsigned Progress Notes` | Notes for patients with appointments **today only** (notes are editable only on the day entered); keyed to the patient's preferred provider, who must be assigned to the office the report is run in | Edit the note from the report; `REVIEW & SIGN` opens the note summary; sign by Draw, Type or Load Signature (pad); the row leaves the queue once signed. Draw / Type signing needs the `ESIGNPROGRESSNOTES` site feature per PGID; pad signing does not | None documented | `[H7][H8]` |

Contrast: `Reports > Daily Reports > Progress Notes` (option Unsigned) is the printable counterpart with date range and
other criteria `[H7]`. The two list different patients by design, which generated a support article.

Design reading: an interactive report = a filtered work queue + inline actions that mutate the record + automatic
removal when resolved.

---

## 4. Office Reports (every documented entry)

`Office Reports` holds **customer-specific report sets**. Evidence:

- The rights catalogue has separate `Full Control` / `View Only` rights per set — `Reports - Office Reports - ADRpts`,
  `BNRpts`, `GSRpts`, `HawaiiRpts`, `VHRpts` — each described as specialized reports for one named client. A further
  client set sits at top level as `Reports - DHA Reports Screen` `[H13]`.
- Paths in support material use a customer or location folder name `[H9][H10][H53]`.

| Documented report | Path | Purpose | Source |
|---|---|---|---|
| `Uncollected Copay` | `Reports / Office Reports / Hawaii Family Dental Reports / Uncollected Copay` | Find patients who did not pay the expected estimated patient portion and / or prior balance | `[H10]` |
| `Aging Report by Home Office` (patient receivables) | `Reports -> Office Reports -> Hawaii Family Dental Reports` | Same report as under Monthly Reports; supports `Create Task` | `[H53]` |
| `Next Appointment Booked Report (Excel)` | `Reports > Office Reports > [Location Name] Reports > ...` | Lists who did and did not leave with a next appointment; run daily; office and date range | `[H9]` |

The Reporting Matrix lists an `Uncollected Co-Pay Report` under `Reports > Management reports` (today's scheduled
patients with a balance, last payment date and amount, financial notes), so at least one custom report was later
promoted into a standard menu `[H9]`. The full content of any customer's folder is not public **[unverified]**.

---

## 5. My Reports, My Favorites, Search Report

| Feature | Behaviour | Controls | Source |
|---|---|---|---|
| `Search Report` | `Reports > Search Report`; enter a key term; results list report name (link to the report) and a description | None documented | `[H2]` |
| `My Favorites` | `Add Report to Favorites` on a report's criteria screen saves the criteria. The favorites page shows name, breadcrumb (menu path) and a delete icon; opening a favorite shows the criteria and `Print/Preview`. | Favorite keeps the office the user was logged into when it was saved; to run for another office the user edits the office selection each time `[H3]`. A broken favorite is fixed by delete and re-create `[H4]`. | `[H3][H4]` |
| `My Reports` | Restricts provider-related reporting to one provider. User-specific reports: `Daily Journal by User – Detail`, `Daily Journal by User (created date) – Detail`, `Appointment Detail by User`, `Time Clock Report`. Provider-specific reports printed only for the linked provider: `Daily Journal By Provider Detail`, `Production By Codes`, `Production By Provider`, `Production By Category`. | User field `Report Access Provider` (Setup > Security > Users); right `Reports – My Reports – Full Control`; an error is shown if no provider is linked | `[H5]` |

Notes: elsewhere (Daily, Management, Treatment Plan, Appointment reports) any user with the menu right may pick any
provider `[H5]`. No sharing of favorites between users and no scheduling of favorites is documented **[unverified absence]**.
A marketing page claims 100+ reports, role-specific dashboards and scheduling of key reports **(S)** `[D33]`.

---

## 6. Documented report catalogue by sub-menu

Purpose and filters as documented in support articles. This is not the full on-screen catalogue (the screenshots
supplied to the planning team remain the authority for field-level detail).

### 6.1 Daily Reports

| Report | Purpose | Documented criteria / output | Source |
|---|---|---|---|
| `Daily Journal` | Charges, payments, adjustments for a date or range | Summary (transaction, description, totals) or Detail (adds patient, provider, entering user, tooth / surface, UCR); office or office group; include Services / Payments / Adjustments; group by provider; datewise summary. Production adjustments appear in the charges column | `[H43][H44][H10]` |
| `Daily Journal by Provider`, `Daily Journal by User – Detail` (also by created date) | Per-provider and per-user audit of entries | Detail format; provider or user filter | `[H10][H5]` |
| `Collection Report` / `Daily Collection` | Money collected | `Collection By` provider, carrier or code. By-code columns: Code, Descr, #perf, UCR, Amount, Est Ins, Payments, Ins. Pay, Adjust | `[H42][H10]` |
| `Production Report` | Completed procedures | `Production By` code, provider, category, carrier; summary or detail; grouped by provider; `Include UCR` with fee schedule. By-provider columns: #Perf, Total Dur, Avg Dur, Eff Rate $ (charges ÷ duration), Avg $ | `[H1][H31][H32][H45]` |
| `Production Analysis Report` | Mix analysis | `Analysis By` Category: Provider $, Practice Group $, provider share of own total, provider share of office category. By Carrier: # Patient, # of Claims, Avg. Production per Pat, Avg. Collection per Pat | `[H28]` |
| `Executive Summary` (daily, by provider) | Management overview | Date range; office group variant | `[H10][H27]` |
| `Daily Audit` | Visits missing a ledger entry, appointment, note or signature | `Patient Has` (All / Appointment / Transaction In Ledger / Progress Notes) `But Missing` (Appointment / Transaction in Ledger / Progress Notes / Progress Notes with Signature); sort by date, patient, provider; group by provider with page break. Columns: Appt Date, Tran Date, PN DOS Date, Pat ID, Name, Last Visit, Pat Type, Provider, check marks for Ledger Transaction, Appt, PN, PN With Sig. An empty report is the success state | `[H37]` |
| `Special Transaction Report` | Counts of procedure and payment / adjustment codes by provider, user, plan, age | Office / group, provider / user, transaction vs service date, patient name range, exclude patient type, payment / adj codes, plans / subtypes, code / category, age; group by code, username, insurance plan, transaction provider | `[H36]` |
| `Scheduled Production` | Scheduled vs actual vs goal | Scheduled = procedures on appointments; Actual = posted to ledger; Estimated = monthly goal ÷ 20 average working days | `[H41]` |
| `Deposit Slip` (+ `Credit Card`, direct deposit, third-party financing variants) | Bank reconciliation | Date range; payment-type checkboxes; show cash | `[H62][H9]` |
| `Progress Notes` | Note audit | Detail, Missing, Unsigned options; date-of-service range; one or many offices | `[H9][H7]` |
| `Daily Routing Slip`, `Appointment Pull Chart List` | Next-day preparation | Date | `[H10]` |

### 6.2 Monthly Reports

| Report | Purpose | Documented criteria / output | Source |
|---|---|---|---|
| `Executive Summary` | One-page KPI summary per location (new patients, production, collection, adjustments, missed appointments) | Date range; single office or `Office Group`; `Show AR` option (off by default) | `[H27][H26][H9]` |
| `Executive Day Sheet` | Totals per adjustment code | Dates | `[H61]` |
| `Aging Report` | A/R aging for one office | Summary / Detail; select providers; contract balance, balance status, credit balance options; `Aging By` Account AR or Patient AR; balance threshold | `[H24][H25][H26][H60]` |
| `Aging by Home Office` | A/R aging attributed to the responsible party's home office, across locations | Variants: plain, include balance status, include contract balance, detail by provider, patient A/R. `Create Task` appears when `Aging By` = Patient AR | `[H24][H54]` |
| `Income Allocation` (Summary / Details) | Payments allocated to completed services; basis for collection-based provider pay | Date range, providers, offices or office group. Columns: Prov ID, Beginning Balance, Charges, Prod Adj (+/-), Payment, Prev Allocation, Income Adjust (+/-), End Balance, Non-Income, Income, plus an Unallocated row | `[H29][H30][H34]` |
| `Waterfall Report` | Collections by date-of-service month; used to predict collection rates and cash | Offices; at least a quarter of dates | `[H9]` |
| `Unallocated Payments/Adjustments Report` | Find unallocated items to clean up ledgers | Date range; can exclude credit balances | `[H9]` |

Reconciliation facts worth copying into our own documentation: Executive Summary and Aging totals match only when
`Show AR` and `Include Credit Balance` are both on and both use the same single date `[H26]`; Income Allocation is a live
report whose past periods change as allocations happen, and it cannot be compared with production or payment reports `[H33][H34]`.

### 6.3 Management, Insurance, Appointment, Treatment Plan

| Sub-menu | Report | Purpose and criteria | Source |
|---|---|---|---|
| Management | `Audit Trail Report` | Tracks edit, delete, close out, appointment reschedule and cut / copy / paste across Patient, Setup, Transactions, Treatment Plan. For appointments only delete, reschedule and cut / copy / paste are recorded. `Module Type` filter (for example Appointments) | `[H22][H71]` |
| Management | `Time Clock Report` | Detail (every punch), Summary (per day per user, overtime by user setting), Total (one line per employee). User-specific, not location-specific | `[H57]` |
| Management | `Uncollected Co-Pay Report` | Today's scheduled patients with a balance | `[H9]` |
| Management (old group menu) | `Production by Codes`, `Production by Codes - Provider`, `Production by Category` | Fee negotiation, clinical coaching, category overview | `[H9]` |
| Other Reports (old group menu) | `User Activity Report` — `Login Activity`, `All Activity` | Logins with IP address; every page visited with the patient in context; newest first | `[H20][H21]` |
| Insurance | `Outstanding Claims` (also for provider, pre-authorization, `- Excel`) | Unpaid claims; `Create Task` creates Task Manager work items | `[H11][H53][H68]` |
| Insurance | `Claims List` | Claims or pre-auths transmitted in a range (range = claim generated date) | `[H68]` |
| Insurance | `835 Denial Report` | Denied or partially paid ERA auto-payments; Summary or Detail; PDF or Excel; range up to one month; carriers. Columns include charges submitted, contract obligations, patient responsibility, other adjustment, actual allowed, paid, reason and remark codes. Enabled on request | `[H39]` |
| Insurance | `Claims not created`, `Procedures on Hold`, `Unbilled Report Due to No Insurance` | Daily claim hygiene | `[H10]` |
| Insurance | `Capitation Utilization`, `Capitation Payment` | Managed-care utilization (`Print All Codes` option) and payment history | `[H11][H68]` |
| Appointment | `Appointment Detail`, `Appointment Detail By User` | Non-cancelled appointments; by appointment date or created date; option to include cancelled; phone numbers; carrier and procedure codes | `[H47][H48][H9][H10]` |
| Appointment | `Appointment List` | Cancellation list, missed list, lab not received | `[H10][H9]` |
| Appointment | `Appointment Time Stamps` | In Reception, Available, In Operatory, Check Out times; Time Waiting, Reception to Operatory, Operatory to Checkout; Posted flag | `[H46]` |
| Appointment | `SmartAssist Report Card` | Per-appointment checklist: Payment, Email, Cell Phone, Eligibility, Medical History, HIPAA / Consent 1–4, Progress Notes, Ledger Posting, Next Appointment (check, X or N/A); options to include missed and cancelled; evaluates only the office of the appointment | `[H38]` |
| Appointment | `Appointment Call List`, `New Patient Thru Appointment`, `Routing Slips`, `Appointment Pull Chart List` | Rescheduling, incomplete new-patient records, next-day preparation | `[H10][H9]` |
| Treatment Plan | `Treatment Plan Analysis` | Count and amount per status: Diagnosed, Accepted, Unaccepted, Hold, Alternative (mutually exclusive), Pre-Auth Sent, Pre-Auth Closed, Scheduled, Completed; percentage section reads numerator-to-denominator and can exceed 100% | `[H40]` |
| Treatment Plan | `Treatment Plan Status Report` (Detail) | Patients with incomplete treatment and contact details; diagnosed date range, codes, status filters | `[H9][H11]` |

### 6.4 Referral, Recall, Ortho, Lists

| Sub-menu | Reports | Notes | Source |
|---|---|---|---|
| Referral | `Referral Summary Report`, `Referral Count Summary`, `Referral Production List`, `Referral Production Listing by Zipcode`, `Referred Out List`, `Referral Source List` | Date range and referral type (or specialty for referred-out). Production reports give visits, procedures, production, collection, adjustments per patient. Limited to the single office the report is run in; no cross-office history | `[H51]` |
| Recall | `Recall Due` (scheduled, not scheduled or both), `Post-Op Report`, `Procedural Recall Report` | Recall date range, patient age, provider, exclude patient types, recall codes (blank = all recallable codes). Depends on the recall code being attached to the future appointment. Post-Op covers only codes flagged Post-Op in setup; Procedural covers any chosen code | `[H49][H50]` |
| Postcard | `Recall Postcards` (due / overdue not scheduled; scheduled) | Monthly | `[H11]` |
| Ortho | `Ortho Daily Journal`, `Missing Ortho Visits`, `Ortho Report`, `Patients by Ortho Status with Time in Treatment`, `Ortho Compliance Report` | Visit history with archwires, compliance, hygiene; appointment vs ortho visit vs ledger audit; starts list; status with months in treatment; active contracts with no future appointment | `[H52]` |
| Lists | `Patient/Resp. Party List`: Active Patient List, Inactive Patient List, New Patient List, New Patients - By Referral, New Patients - By Referral Type, New Patient Thru Appointment, Patients on a Regular Payment Plan, Patients on Ortho Payment Plan, Patient List Grouped By (by last visit, option to include patients with no last visit), Online Registered Patients, Update Patient Insurance (Conversion) List - By Appointment | Counting and outreach lists | `[H69][H52][H9]` |
| Lists | `Security List`: `User List`, `Group Rights List` | Who has which group and which rights; needs the Lists Security reports right | `[H18][H19]` |

---

## 7. Report-to-action hooks already present in Denticon

| Hook | Where | What it does | Source |
|---|---|---|---|
| `Create Task` | `Outstanding Claims` (claims and pre-auth), `Aging by Home Office` with Patient AR, Claim Details screen | Creates Task Manager tasks of type Outstanding Claim, Outstanding Pre-Auth or Patient AR Follow-Up; batch or single; task auto-closes when the claim is closed or deleted | `[H53][H54]` |
| Task Manager | `Utilities > Launch > Task Manager` | Update priority, status, assignee, due date, action, notes; history; filters by action, status, assignee, carrier; supervisor dashboard of counts by status and user with due-date ageing; own PDF / Excel report | `[H53]` |
| `Send SMS/Email` | DPA detail reports | Select patients, name the campaign, pick delivery date (next day at the earliest), SMS or email, template. Campaigns are stored with a `DPA_Campaign` prefix. Requires the DPA bundle and Automated Campaigns. As of October 2025: unscheduled patients with accepted and with unaccepted treatment plans; Active / Inactive / Danger Zone patients; unconfirmed appointments; no-show appointments | `[D21][D22]` |
| Sign from report | Interactive `Unsigned Progress Notes` | Review and sign without opening each chart | `[H8]` |
| Verify from report | Interactive `Eligibility Verification` | Real-time eligibility check and status update | `[H6]` |
| Outreach outcome reporting | `Utilities > Launch > Automated Campaigns` | Summary Report and Excel Detail Report per campaign type; custom range up to one year; range matched against either the event date (appointment, recall, birthday) or the touchpoint (send) date; office filter; counts of confirmed, cancelled, unconfirmed, emails opened, missing contact details, opt-outs | `[H67]` |

---

## 8. Denticon Practice Analytics (DPA)

### 8.1 Platform facts

| Fact | Detail | Source |
|---|---|---|
| What it is | Built-in dashboard suite; replaces and expands Dentilytics Basic; aimed at DSO executives, office managers, front office, providers, billing teams | `[D23][D25]` |
| Launch point | `Utilities > Launch > Denticon Practice Analytics` | `[D22]` |
| Engine | Microsoft Power BI Embedded | `[D3]` |
| Refresh | Daily, about 1 AM PST | `[D3]` |
| Customisation | Filters only. No new metrics, visuals, tables or reports. No integration with other analytics modules; a direct `Data Share` exists | `[D3][H65]` |
| Hierarchy | Scorecards drill Office Group > Office > Provider; filters for location or group, provider type, provider name, date range | `[D5][D31]` |
| Packaging | Sold as a `Dashboard Bundle`; enabled per PGID as a site feature. Marketed on native data integrity, drill-down, huddle preparation and standardized reporting across locations | `[D21][D12][D32]` |
| Dashboards | Morning Huddle, Production Analysis, Collections Analysis, Provider Breakdown, Treatment Plan Analysis, Front Office, Hygiene Recall, Patient Visit Analysis | `[D1][D2]` |
| Access control | No DPA-specific security right is documented **[unverified]** | — |

### 8.2 Date ranges and comparison logic `[D1][D4][D26]`

| Selection | Comparison | Notes |
|---|---|---|
| Yesterday | Same day last week | — |
| MTD (default) | Prior month, same period (MoM) | The current day counts as a working day in MTD — a deliberate change from Dentilytics Basic `[D13]` |
| YTD | Prior year, same period | Front Office, Hygiene Recall, Patient Visit Analysis |
| Today | None | Morning Huddle, Today's Schedule view |
| As of Date | — | Outstanding A/R and Outstanding Claims: Current or Last Month |
| Today + next 7 days (default) / until month end | — | Scheduled Production report |

Change formula: (current − prior) ÷ prior × 100; when prior is zero the denominator is replaced by 1 `[D4]`.

### 8.3 Common calculation rules (the metric engine) `[D1][D5][D6][D10]`

| Concept | Rule |
|---|---|
| Net Production | Gross Production + Production Adjustment |
| Net Collections | Gross Collection + Collection Adjustment; shown as an absolute value `[D5][D7]` |
| Visit | A posted procedure whose code is flagged as a visit code |
| Count of visits | For each day, patients with a visit code in the ledger; summed over the range |
| New patient | Distinct patients whose First Visit Date is in the range. The Morning Huddle exam count for new patients instead counts D0150 appointments where First Visit Date is empty `[D16]` |
| Recare patient | D0120 or D0145 |
| Emergency exam | D0140 or D0160 |
| Hygiene patient codes | D4341, D4342, D1120, D4910, D1110, D4355 |
| Provider Working Days | Per provider, per day: total appointment length up to 4 hours = 0.5 day, more than 4 hours = 1.0 day. Cancelled, blocked and missed appointments excluded |
| Provider Working Hours | Total appointment length per provider per day in hours, same exclusions |
| Provider Available Hours | Applied in order: provider schedule; minus enterprise (PGID) holidays; minus office holidays; plus office-open exceptions; minus provider holidays; plus provider in-office exceptions |
| Daily Goal (provider) | Entered in `Setup > Providers > Provider Goals` |
| Daily Goal (office) | Sum of provider monthly goals ÷ office monthly working days (from the office schedule) |
| Daily Goal over several months | Sum over months of (daily goal × provider working days of that month) ÷ total working days |
| Goal Amount | Daily Goal × Provider Working Days, per provider |
| Monthly Goal | Daily Goal × Total Provider Working Days configured for the month |
| Daily Average to Meet Monthly Goal | (Monthly Goal − Net Production MTD) ÷ remaining provider working days. Always for the current month. Goal 0 gives 0; 0 remaining days treated as 1; negative remaining days returns the Daily Goal |
| Goal % when goal is zero | YTD goal attainment is set to 100% |

### 8.4 Colour thresholds

| Metric family | Red | Yellow | Green | Source |
|---|---|---|---|---|
| Net Production vs Goal; Collections % of Production (target 95%) | below 85% | 85–95% | above 95% | `[D1][D27]` |
| Reappointment % | below 85% | 85–95% | above 95% | `[D4][D18]` |
| A/R aging and claims aging buckets | beyond 90 days | 61–90 days | 1–60 days. The Current bucket is uncoloured and a $0 bucket shows N/A | `[D1][D17]` |
| Patient counts (total, new, recare) | not higher than comparison | — | higher than comparison | `[D1]` |
| Avg daily net production (provider, hygienist) | at or below daily goal | — | above daily goal | `[D1]` |
| Missed / cancelled / no-show % | increased or unchanged | — | decreased | `[D1]` |
| Scheduled production by date (bars) | below daily average needed | — | at or above | `[D1]` |
| Actual vs Scheduled Production | **[conflict]** below 70% in the glossary; below 135% in the newer guides | 70–90% vs 135–149% | 90% and above vs 150% and above (target 150%) | `[D8][D19][D1]` |

### 8.5 Dashboards and metric definitions

**Morning Huddle** — four views `[D1][D5][D20][D24]`. Version 2 adds Previous Month's Performance (no drill-through).

| View | Metric | Definition |
|---|---|---|
| Today's Schedule | Net Production MTD vs. Goal | Net Production MTD ÷ Goal Amount MTD × 100 |
| | Collection % of Prod MTD | Net Collection MTD ÷ Net Production MTD × 100 |
| | Total / New / Recare Patients Seen MTD | Distinct patients with a visit code; first-visit patients; D0120 / D0145 transactions |
| | Outstanding A/R | All uncollected balances as of today **by patient home office**, Account AR type, credit balances included |
| | Case Acceptance Rate % MTD | Treatment plans Accepted, Scheduled or Completed ÷ all treatment plans (the glossary excludes Alternative and Referred Out) × 100 |
| | Utilization MTD | Provider Working Hours ÷ Provider Available Hours × 100 |
| | Avg Daily Production MTD | Net Production MTD ÷ Provider Working Days MTD |
| | Daily Goal; Daily Avg to Meet Monthly Goal | Section 8.3. Providers with a goal but no MTD transactions are left out of the goal |
| | Scheduled Production Today / Next Working Day / 2nd Working Day | Sum of appointment fee amounts; each provider's own next working days are used |
| | Exams Today | New patient (D0150), recare (D0120 / D0145), emergency (D0140 / D0160), total |
| | Outstanding A/R of Today's Patients | Sum of balances of patients scheduled today, across the whole account regardless of transaction office; grouped by appointment office and provider; patients with balance or patient portion of zero or less are ignored |
| | Pending Tx $ of Today's Scheduled Recare Exams | Fees of accepted, unscheduled, incomplete treatment for today's recare patients |
| | SRP Opportunities | Distinct patients scheduled today for D4910 with none of D4341, D4342, D1120, D1110, D4355 in the past 24 months |
| | Active Provider toggle | `Active Provider MTD` (any appointment this month that is not cancelled, missed or blocked) vs `Active Provider Today` |
| Previous Day's Performance | Net Production, Net Collections, patients seen (total, new, recare), Daily Goal | As above for yesterday; only providers with appointments yesterday are counted |
| | Same Day Net Production | (Net Production − Scheduled Production) ÷ Scheduled Production; scheduled includes only appointments created on or before yesterday; missed excluded |
| | Reappointment % | Patients with an appointment and a transaction yesterday who hold a future appointment that is not cancelled or missed |
| | Count of Patients by Insurance Carrier | Patients who did not reappoint, by primary carrier |
| Where We Stand | MTD block plus Total Production per Day Needed to Achieve Monthly Goal | As above |
| | Total New (or Recare) Patients Projected this Month | MTD count + (MTD count ÷ working days MTD) × remaining working days |
| | New / Recare Patients Seen YTD; YoY Comparison | YTD counts vs same YTD last year; last month vs same month last year |
| | Net Production YTD vs. Goal; Net Collections YTD; Collection % of Prod YTD | YTD versions |
| Previous Month's Performance | Same metric set frozen as of the last day of the previous month | Added because MTD metrics read near zero at the start of a month |

Scorecard visibility rule: an office group, office or provider appears only if any scorecard metric or sub-metric is
non-zero; hidden providers stay selectable in the right-hand filter panel `[D5][D14]`.

**Production Analysis** — three reports `[D1][D6]`.

| Report | Metrics |
|---|---|
| Production Analysis | Net Production; Net Production vs. Goal; Daily Average to Meet Monthly Goal; Avg. Daily Net Production (÷ working days); Avg. Net Production per Visit (visit-code production ÷ visits); Same Day Net Production %; Net Production by Date and Provider Type (toggle for all specialties vs one line per specialty); Net Production by Procedure Category (drill to ADA code); Top Insurance Carriers by Net Production (top 5 by primary carrier, full list in detail) |
| Scheduled Production | Scheduled Production; Avg Daily Scheduled Production; Avg Scheduled Production per Visit; Avg Scheduled Production per Hour; Scheduled Utilization % (scheduled hours ÷ available hours); Production to Goal (net production through yesterday + scheduled production, against a prorated goal bar that spans months when the range does); Scheduled Production by Date |
| Production Detail | Patient Count, Gross Production, Production Adjustment, Net Production by primary insurance plan carrier |

**Collections Analysis** — four reports `[D1][D7][D17]`.

| Report | Metrics |
|---|---|
| Collections Analysis | Collections as a % of Production; Gross Collections (patient + insurance payments before adjustments); Collections Adjustment; Net Collections; Net Collections by Procedure Types (drill category to code); Top Insurance Carriers (top 5 by insurance payment and adjustment); Collections Scorecard by office |
| | Avg. Days Sales Outstanding = Outstanding A/R ÷ (Net Collections ÷ business days in range), business days = Monday–Friday; zero denominator treated as 1 |
| | % OTC Collections = patient payments ÷ estimated patient amount where the payment's allocated date equals the estimate's transaction date; computed per day then cumulated; estimated patient amount = fee − estimated insurance |
| | % Patient/Gross Collections = patient payments ÷ gross collections |
| Outstanding A/R (as-of date) | Total Outstanding A/R **by transaction office**; Avg. Days Sales Outstanding; patient vs insurance split; Top Carriers by Outstanding Insurance A/R; A/R Aging buckets Current, 30+, 60+, 90+, 120+ with drill-through to responsible-party detail |
| Outstanding Claims (as-of date) | Total and count of open claims; top 5 carriers; split by claim type Primary / Secondary / Tertiary (including Quaternary); Claims Aging with drill-through to patient-level claim detail |
| Provider Collections | The collection metrics per provider; A/R aging extended to 180+, 270+, 360+; A/R and claims values always show current values regardless of the selected dates |

**Provider Breakdown** `[D1][D8][D19]`

| Metric | Definition |
|---|---|
| Avg. Daily Net Production; Collection as a % of Production; Case Acceptance %; Provider Utilization; Total Doctor Days | Per-provider versions of the common rules |
| Provider Retention Rate % (12 mo) | Patients with D0120 / D0145 in the same range 12 months earlier who had D0120 / D0145 again within the following 12 months ÷ that original cohort |
| Avg. Daily Net Production vs. Daily Goal by Providers | Bar chart Top 15, Bottom 15 or All (ties can exceed 15); tooltip shows daily goal, daily average needed, % to goal |
| Actual vs. Scheduled Production | Actual ÷ Scheduled × 100 |
| Scheduled Production Today / Next / 2nd working day | Always on an MTD basis |
| Production / Visit; New Patients; Recare Patients | Common rules |
| Missed Appt %, Cancelled Appt %, No Show Appt % | Count ÷ total appointments, blocked excluded. `No Show` = missed + cancelled |

**Treatment Plan Analysis** `[D1][D9]`

| Metric | Definition |
|---|---|
| Production Amount by Treatment Status | Total fees of Diagnosed, Accepted, Scheduled, Completed plans |
| Average Production Per Visit | Visit-code net production ÷ visits |
| Case Acceptance Rate | Plans Accepted, Scheduled or Completed ÷ all plans × 100 |
| Unscheduled Patients with Accepted (or Unaccepted) Treatment Plan | Fees of unscheduled, incomplete plans in that state |
| % Accepted, % Scheduled, % Completed | Fees in that status ÷ Diagnosed fees |
| Amount of Unscheduled Treatment Plans; % Unscheduled Patients with Treatment Plans | Unscheduled incomplete fees; ÷ Diagnosed fees |
| Top Referrals | Internal + external referral counts by specialty, by referring or referred provider's specialty |

**Front Office** — single page of tiles, each with drill-through `[D1][D10]`

| Tile | Content |
|---|---|
| Net Production | Amount, % vs goal, 7-day trend |
| Net Collection | Net collections; collections % of production; Outstanding AR of Today's Scheduled Patients; Outstanding A/R by Patient vs Insurance |
| Provider Utilization | Overall and by provider |
| Appointments | New Patients; Recare Patients; Hygiene appointments (D4910, D4341, D4342, D4355 or a hygienist provider); Daily Appointments by dentist and hygienist |
| Unscheduled Treatment | Patient Diagnosed count; Unscheduled Patients with Tx Plan (count and amount); Case Acceptance Rate; Percentage Preauthorized (preauthorized and covered patients ÷ unscheduled patients) |
| Opportunities | Unconfirmed Appointments, next 7 days (count and amount); No Show Appts, last 7 days (count and amount); no-shows by date |

**Hygiene Recall** `[D1][D11][D15]`

| Metric | Definition |
|---|---|
| Hygiene Retention Rate % (12 Months) | Distinct patients returning for D1120, D4910 or D1110 within 12 months ÷ distinct patients with any hygiene code in the same range 12 months earlier. Distinct patients, not visits |
| Total Hygiene Retention by patient type | Child D1120; Prophy D1110; SRP D4341 / D4342; Perio D4355 / D4910 (the complete guide also lists D4355 under Prophy **[conflict]**) |
| Adjunctive Therapy % | Hygiene patients with any adjunctive code ÷ hygiene patients. Fluoride / Varnish D1206, D1208; Laser D4999, D7465; Irrigation D4921; Arestin D4381. Each group also shown separately |
| Hygiene Reappointment % | Hygiene patients holding a future hygiene appointment ÷ hygiene patients |
| Perio % | Patients returning for D4355 or D4910 within 12 months ÷ the 12-month-earlier hygiene cohort |
| Prod Per Visit; Avg Quad Per Day; Avg Visits Per Day | Visit production ÷ visits; distinct patients with a quad code ÷ working days; visits ÷ working days |
| Prod Chair Per Hour | Net Production ÷ provider scheduled working **days** **[conflict]** with its name |
| Avg Daily Net Production vs Daily Goal by Hygienist | Top 15 / Bottom 15 / All |

**Patient Visit Analysis** `[D1][D18][D22]`

| Metric | Definition |
|---|---|
| Patient Visits; Total Patients Seen; Production Per Visit; Provider Utilization | Common rules |
| Reappointment % | Patients with a subsequent appointment at the same office ÷ appointments in range; patients whose only future appointments are missed or cancelled count as not reappointed |
| Active Patients | Last visit within 12 months |
| Danger Zone Patients | No visit in the last 12 months, last visit 12–24 months ago |
| Inactive Patients | No visit in 24 months, or no visit date |
| New vs Recare vs Emergency | Trend chart |
| Patients by Zip Code | Map and chart of patient count and net production |
| Missed, Cancelled, No Show Appointment % | As Provider Breakdown |

Drill-through is by right-click on the metric value then `Drillthrough`; named detail reports include A/R Aging Detail,
Claims Aging Detail, Case Acceptance Rate Details, Unscheduled Patients with Accepted Treatment Plan Details, Missed
Recall Details, and the Active / Inactive / Danger Zone list with a Status filter `[D20][D7][D16][D18][D22]`.

### 8.6 Goals `[D12][D14][D28][D29][H41]`

| Topic | Rule |
|---|---|
| Entry | `Setup > Providers > Provider Goals`: daily production goal and working days per provider per month, up to 13 months ahead; `Autofill` derives working days from the provider schedule; weekend-open checkboxes |
| Auto-population (DPA accounts only) | If no provider in an office has a goal for a month, goals and working days are filled for all providers of that office; if any provider has a non-zero goal, nothing is filled |
| Auto goal formula | Average over the last six months of (actual production ÷ days worked), using only months with production or working days; working days of 0 fall back to Autofill, then to 1; a negative average gives a goal of 0; on the last day of a month the current month is included in the six |
| Months covered | All months of the current year, or from the provider's effective schedule start when the Provider Effective Schedule feature is on |
| Legacy report rule | The `Scheduled Production` report estimates daily production as monthly goal ÷ 20 working days |

### 8.7 Dentilytics Basic and Enterprise (legacy) `[D28][D29][D30][D23]`

| Item | Detail |
|---|---|
| Tabs | Yesterday's Production, Today's Scheduled, Where We Stand |
| Refresh | Nightly at 11:59 PM PST; relies on providers posting to the ledger each day |
| Placement | Shown on `My Page` for Dentists, Office Managers and Corporate Managers, and at `Utilities > Launch > Dentilytics Basic`. A 2026 `My Page` article lists only My Tasks, Tickler and Announcements **[conflict]** `[H59]` |
| Metric quirks | New patient = on today's schedule with no previous ledger transactions; continuing-care exam = D0120 only; emergency = D0140 only; Same Day Production = actual − scheduled (an amount, not a %); no-reappointment % = seen yesterday and left with no future appointment; horizon limited to today and the next two business days |
| Customisation | None. `Dentilytics Enterprise` is named as the fully customizable tool with no further public documentation **[unverified]** |

---

## 9. Office groups and multi-office semantics

| Topic | Behaviour | Source |
|---|---|---|
| Identifiers | PGID = the account; OID = an office (as used in support articles) | `[O9][H38]` |
| Office groups | Defined in `Setup > Office Groups`; used to segment locations (for example by geography) for group reports. Optional — without groups, group reports run for all offices | `[H23]` |
| Reports documented with an office / office-group selector | Daily Journal, Daily Collection, Production Report, Daily Audit, Special Transaction Report, Progress Notes, Executive Summary, Income Allocation, aging family; enterprise variants are gated by the `Reports - Group Reports` rights | `[H10][H37][H36][H27][H30][H45][H13]` |
| DPA roll-up | Scorecard tables by Office Group / Office / Provider; office-level Collections Scorecard; top / bottom provider charts | `[D5][D1][D8]` |
| Office-group scoping (Nov 2026) | Labs and referrals can be limited per office or office group (`Setup > Account Info > ADVANCED > OFFICE GROUP SCOPING`) | `[H63]` |
| A/R attribution | `Aging by Home Office` assigns the whole account balance to the responsible party's home office; single-office aging can show a debit at one office and a credit at another for a zero-balance account. Planet DDS recommends the home-office family for every multi-location group | `[H24]` |
| Account AR vs Patient AR | Account AR includes insurance and patient balances and can pull in balances that belong to another office (a dependent with a different home office); Patient AR is limited to patient balances of this office | `[H25]` |
| Income allocation | Income is credited to the location where the procedure was charged, not where the payment was entered; unallocated credits stay with the entry office until allocated; run per location where the provider worked | `[H29]` |
| Payment allocation | Patient payments allocate first-in-first-out to the oldest item on the account; allocation date is the system creation date and ignores back-dating | `[H35]` |
| Referral production | Reported only within one office; history is lost when a patient's office or referral changes | `[H51]` |
| Visit checklist | SmartAssist Report Card checks only data in the office of the appointment, even when several offices are selected | `[H38]` |
| Time clock | User-specific, not location-specific | `[H57]` |
| Close out | `Setup > Close Out` locks data up to a date; `Close All Offices` for groups; recommended at least monthly | `[H11]` |
| Enterprise Executive Summary | Run with the `Office Group` option and selected locations; figures reflect activity within each named location | `[H27]` |
| DPA A/R basis | Morning Huddle A/R is by home office; Collections Analysis A/R is by transaction office | `[D5][D7][D13]` |

---

## 10. Security rights that control report access

### 10.1 Model

- Rights are attached to **security groups**, defined per office (`Setup > Security > Groups`), and users are assigned to
  groups (`Setup > Security > Users > Group Memberships`). One group per user is the recommended practice `[H18][H72]`.
- Many rights come as a pair: `Full Control` (can run) and `View Only` (can see the report list and parameters but not
  generate) `[H13][H16]`.
- A user in several groups receives the most permissive right `[H17]`.
- Office visibility is separate: the user's `Office Access` tab, a home office, permitted IPs `[O7][H73]`.
- `User Role/Type` (Dentist, Hygienist, Dental Assistant, Front Desk, Office Manager, Central Services, Corporate
  Management) drives personalisation only and does not change security `[H58]`.

### 10.2 Reports rights catalogue `[H13]`

Each line exists as `... Screen Full Control` and `... Screen View Only` unless noted.

| Right | Covers |
|---|---|
| `Reports - Daily Reports` | Daily reports (for example Daily Journal) |
| `Reports - Monthly Reports` | Monthly reports |
| `Reports - Management Reports` | Management reports (for example aging) |
| `Reports - Insurance Reports` | Insurance reports (for example outstanding claims) |
| `Reports - Appointment Reports` | Appointment reports (for example routing slips) |
| `Reports - Treatment Plan Reports` | Treatment plan reports |
| `Reports - Recall Reports` | Recall reports |
| `Reports - Referral Reports` | Referral reports |
| `Reports - Ledger Reports` | Patient- or responsible-party-specific ledger reports |
| `Reports - Statements` | Responsible-party statements |
| `Reports - Letters`, `Reports - Labels` | Batch letters and labels |
| `Reports - Custom Letter`, `Reports - Custom Postcard` | Add, edit, delete templates |
| `Reports - Blank Insurance Form` | Blank claim forms |
| `Reports - Excel Reports` | Reports in Excel format |
| `Reports - Group Reports`, `Reports - Group Reports Ins` | Enterprise-wide reports and enterprise insurance reports |
| `Reports - Lists - Patient List`, `Responsible Party List`, `Provider List`, `Procedure/Fee List`, `Prescription List`, `Employer List`, `Office List` | One right per list family |
| `Reports - Office Reports - ADRpts`, `BNRpts`, `GSRpts`, `HawaiiRpts`, `VHRpts`; `Reports - DHA Reports` | Customer-specific report sets |

Rights named in other articles: `Reports – My Reports – Full Control` `[H5]`; `Reports – Group Reports - Other Reports
Full Control` (User Activity Report) `[H21]`; the Lists Security reports right (User List, Group Rights List) `[H19]`.

Not found in the catalogue: rights for Interactive Reports, Ortho Reports, Search Report, My Favorites or DPA **[unverified]**.
The catalogue article dates from the older menu.

### 10.3 Adjacent rights

| Right | Effect | Source |
|---|---|---|
| `Utilities - Task Manager - Access / Create Task / Delete Task / Assign Task / Change Action of Task / Supervisor User` | Use of report-generated tasks; supervisors see all users' tasks and the dashboard | `[H53][H54][H14]` |
| `Setup - Close Out` | Lock data before a closing date | `[H15]` |
| `Setup - Office Groups Screen` | Create and edit office groups | `[H15]` |
| `Setup - Security Groups Screen`, `Setup - Security Users Screen` | Manage groups and users | `[H15]` |
| `Utilities - Denticon Download` | Order a data download | `[H14]` |

---

## 11. Recommended routines

### 11.1 End of day `[H10]`

| Goal | Report and criteria |
|---|---|
| Day's production | `Daily Journal` (Detail, Services only); `Daily Journal by Provider`. Multi-office: Detail or Summary with Office / Group = all or a group; optionally grouped by provider |
| Day's collection | `Daily Journal` (Detail, Payments only); `Daily Collection` (Detail, by provider); multi-office variants |
| Management view | `Executive Summary` (daily and by provider; monthly) |
| Visit completeness | `Daily Audit Report` |
| Uncollected patient portion | `Office Reports > ... > Uncollected Copay` |
| Payment-plan charges | Utilities: generate ortho, regular and by-practice contract charges |
| Clinical notes | `Patient Progress Notes`, `Unsigned Progress Notes Report`, `Missing Progress Notes` |
| Claims hygiene | `Claims not created`, `Procedures on Hold`, `Unbilled Report Due to No Insurance` |
| Labs | `Appointment List – Lab` |
| Broken appointments | `Appt Cancellation List`, `Missed Appointment List`, `Appointment Call List` |
| New patients | `New Patient Thru Appointment`, `New Patient List` |
| Prepare tomorrow | `Routing Slips`, `Appointment Detail`, `Daily Scheduled Production`, `Appointment Pull Chart List` |
| Staff accountability | `Daily Journal by User – Detail` (also by created date); `Appointment Detail By User` |

### 11.2 End of month and end of year `[H11][H12]`

| When | Activity |
|---|---|
| Monthly | Close out (optionally all offices); reset insurance benefits for plans whose anniversary is not 1 January; batch statements (print, email, then update statement dates) |
| Monthly reports | `Aging-Detail` (single location) or `Aging by Home Office` (multi-location); `Outstanding Claims` (also pre-auth); recall due not scheduled and recall postcards; `Treatment Plan Status Report – Detail`; `Deposit Slip-Credit Card`; `Capitation Utilization - Detail` for managed-care offices |
| Year end | December monthly set plus `Executive Summary` for the year; benefit reset; ADA code changes; fee-schedule update with an archived copy |

Reports with a single `Report Date` should be run for the default date to capture a point-in-time figure `[H11]`.

### 11.3 Persona matrix (from the *Denticon Reporting 101* attachment) `[H9]`

| Persona | Report | Cadence | Key parameters |
|---|---|---|---|
| Front office | Daily Audit Report | Daily, end of day | Patient has appointments; sort by provider |
| | Daily Journal by Provider – Detail | Daily, end of day | Detail; only providers who worked today |
| | Deposit Slip | Daily, end of day | Show cash; each payment type |
| | Appointment Details Report | Daily | All columns; phone numbers |
| | Update Patient Insurance (Conversion) List – By Appointment | Daily, two days ahead (converted practices) | Date range |
| | Next Appointment Booked (Excel) | Daily | Office and date range |
| | Treatment Plan Status – Detail | Daily, weekly, monthly | Diagnosed range; Accepted, excluding Completed and Scheduled |
| | Recall Due / Overdue but Not Scheduled | Daily | Recall range; exclude scheduled |
| | Appointment Detail; Appointment List (cancelled, missed) | Daily | Appointment type Regular |
| | Call List (Scheduler) | Weekly | Date presets, duration, provider, show cancelled / missed / off call list |
| | Scheduled Production | Daily | Office and date range |
| | New Patients via Appointments | Weekly | Date range |
| | Aging Report – Detail | Daily | Detail; balance threshold; include balance status |
| | Patient Progress Notes (detail, missing, unsigned) | Daily | Date of service; offices |
| | Contract Charges (utility) | Daily | Only if auto-charge is off |
| | Procedures On-Hold | Daily | Today |
| | Routing Slip | Daily, end of day | Next day |
| Back office | Daily Audit Report | Daily, end of day | Missing notes and signed notes |
| | Lab Reports | Daily, two days ahead | Type: not received |
| Clinical | Daily Journal by Provider – Detail; Daily Audit Report; Lab Reports; Patient Progress Notes | Daily | As above, filtered to the provider |
| | Production by Codes – Provider | Monthly, quarterly, yearly | Date range, providers |
| Management / C-level | Daily Journal – Summary | Daily, weekly | By office or office group |
| | Uncollected Co-Pay Report | Daily, end of day | — |
| | Special Transaction Report | As needed | Sort by code |
| | Treatment Plan Analysis | Daily, weekly, monthly | Diagnosed range, defaults |
| | Income Allocation – Summary | Monthly | Pay period; Income column × compensation % |
| | Waterfall Report | Quarterly, yearly | Offices; at least a quarter |
| | Executive Summary | Daily and month end | Date range; all offices |
| | Aging Report – Detail and Summary | Daily, weekly, monthly | Include credit balance for true A/R |
| | Unallocated Payments/Adjustments Report | Daily, weekly, monthly | Date range |
| | Scheduled Production | Weekly | Office and date range |
| | Production by Codes; by Codes – Provider; by Category | Monthly, quarterly, yearly | Date range |

---

## 12. Data export, extensibility and platform direction

| Topic | Detail | Source |
|---|---|---|
| Per-report output | PDF and Excel; some reports have a separate Excel variant (`Outstanding Claims - Excel`); a dedicated right covers Excel output | `[H36][H68][H13]` |
| Size limits | Large multi-office, long-range runs fail; manual chunking advised | `[H55]` |
| Data Share | Direct database share on Azure SQL with logins for third-party providers; arranged through the customer success manager | `[H65][D3]` |
| Nightly data download | BCP files over SFTP with IP whitelisting | `[H64]` |
| Data download utility | Ordered from Utilities; gated by a right | `[H14]` |
| DPA | Closed: no custom reports, no external analytics integration | `[D3]` |
| DentalOS (Oct 2026) | Positioned as one platform across every location `[O11]`. Organization > organization groups (by region or brand) > locations; roles Super Admin, Group Admin (sees and administers only assigned groups; audit log limited to own group), User (assigned per location); permissions `Purchasing Authority` and `Can Add Locations`; SSO, MFA, IP allowlist; audit log with CSV export | `[O4][O5][O6][O8][O9]` |
| Dashboard tiles per role | Super Admin toggles which tiles Group Admins and Users see | `[O10][O1]` |
| AI Workforce | Agents: Confirmation Agent, Recall Agent, Cancellation Recovery Agent, Missed Rescheduling Agent, AI Receptionist. Agent Dashboard: ROI overview with time-range selector, per-agent activity, usage page, export, adjustable ROI settings; statuses Active, Trial, Collecting data, Paused | `[O2][O3]` |
| Predictive scores | Denticon Patient Insights (Truro Analytics): no-show and late-cancel risk scores shown in chart, schedule, charting and toolbar | `[H66]` |
| RCM Zero (Oct 2025) | DSO revenue-cycle platform: automated eligibility, estimates, claim scrubbing and submission, payment posting, denial handling; enterprise dashboards for leadership; integrates with Denticon and Cloud 9 | `[V3]` |

---

## 13. Weak points in Denticon's own documentation (opportunities for us)

| # | Weak point | Source |
|---|---|---|
| 1 | Thresholds for Actual vs Scheduled Production differ across three official articles | `[D1][D8][D19]` |
| 2 | Two A/R bases (home office vs transaction office) under the same label | `[D5][D7][D13]` |
| 3 | Two reappointment methods (Morning Huddle versions; Patient Visit Analysis uses a different denominator) | `[D13][D18]` |
| 4 | `Prod Chair Per Hour` is divided by days; `No Show Appt %` includes cancellations | `[D11][D8]` |
| 5 | Case acceptance is plan-count based in most places, described as an amount in one glossary; the denominator includes every historical plan, so old backlog depresses the rate | `[D5][D9][D16]` |
| 6 | Legacy reports and DPA disagree (goal ÷ 20 working days vs schedule-derived days; D0120-only recare vs D0120 / D0145) | `[H41][D28][D1]` |
| 7 | Executive Summary and Aging only match with two non-default options | `[H26]` |
| 8 | Income Allocation is not period-stable and cannot be reconciled with production or payment reports | `[H33][H34]` |
| 9 | Referral production has no cross-office history | `[H51]` |
| 10 | Favorites pin an office; no documented sharing or scheduling | `[H3]` |
| 11 | DPA is refreshed nightly and filter-only; carrier tiles show a top 5 with the full list only behind drill-through; Provider Collections ignores the date range for A/R | `[D3][D1]` |
| 12 | Large reports fail outright instead of running asynchronously | `[H55]` |
| 13 | Customer-specific reports require vendor-built folders and per-customer rights | `[H13]` |

---

# PART 2 — DSO / multi-office analytics practice

## 14. What DSO-focused products ship

### 14.1 Capability matrix

| Vendor / product | Roll-up levels and views | Ranking and scorecards | Goals | RCM views | Access scoping | Other | Source |
|---|---|---|---|---|---|---|---|
| Planet DDS — Denticon, DPA, DentalOS | Office Group > Office > Provider | Top 15 / Bottom 15 providers; office-level Collections Scorecard | Provider daily goals, auto-populated; daily average needed | Collections Analysis (A/R, claims, provider collections); Task Manager; 835 Denial Report; RCM Zero enterprise dashboards | Security groups per office; office access; Report Access Provider; DentalOS Group Admin | Power BI Embedded; Azure SQL Data Share; AI agents with ROI | `[D1][D8][H13][H53][O5][V3]` |
| Dental Intelligence — Analytics DSO | Performance Board and Collections Board: Overview, By Location, By Region; Tiled layout (2–10 locations) and Wide layout (11–30) | DSO Reports: Operations Summary, Top 20 / Bottom 20 (with middle 60%), Provider, Appointments; Scorecards (300+ metrics; focus on locations, providers, procedure codes, referral sources, carriers; group by Region or Brand; templates; industry-benchmark toggle; trends tab) | `Operations Report: Goals` weekly to yearly | RCM Report: Summary, Adjustments and Write-Offs, Claims, AR Guarantor List, Claims Aging (0–30, 31–60, 61–90, 90+), Patient Payments, Payors; AR DSO dashboard by region or location | Multi-location views require full dashboard access at every selected location; scorecards only for locations the user can access; regions configured by vendor support | Shared scorecards are view-only and can be duplicated; CSV export; Scorecards AI assistant; adoption report (logins, huddle length, follow-up ROI) | `[V4][V5][V6][V7][V8]` |
| Jarvis Analytics (Henry Schein One) | Single practice or all practices aggregated | Operations module (12 views) with colour coding of top and bottom 20%, trailing-twelve-month trends and prior-year data; Scorecards; top locations and providers across the enterprise | Snapshot compares each location with goals using over / under columns | Aging and RCM modules | Access provisioned within a module, brand, office or region | 50+ KPI library (Office, Doctor, Hygiene, Specialty), 100+ metrics for report building; Morning Huddle and End of Day emailed automatically; Payroll module; PMS-agnostic | `[V10][V11][V12]` |
| Dentrix Ascend Profitability Insights Suite | Practice Performance Dashboard with multi-location reporting; practice-level or enterprise-wide KPIs | — | — | Production vs collections, collection trends | Admins configure who sees which data or module | Near-real-time updates | `[V13]` |
| Practice by Numbers | Consolidated dashboards with drill-down to one provider; cross-location comparison of production, collections, case acceptance | Identify top-performing teams; uniform huddles and team scorecards | — | — | Single sign-on across practices | 400+ KPIs; exportable dashboards | `[V14][V15]` |
| CareStack | Reports for the whole organization, a region or one office; roll-ups by region or across the DSO | Enterprise Dashboards, Scorecards, Trend Analysis, Huddle boards, Opportunity Miner | Goal Setting | Aging, credit balances, insurance pending procedures | Report access levels: hide all, per-report, full (Super Admin); audit trails | Clinician Payroll; centralised call centre; API portal | `[V17][V18][V19]` |
| tab32 | Per-location or aggregated across all locations | — | — | — | — | Open Data Warehouse: SQL analytics on a BigQuery-based data lake; BI for executive, regional and in-location teams; ML with SQL (2020 announcement) | `[V16]` |
| Overjet — DSO Analytics | Enterprise > practice > provider > patient | Clinic and clinician compared on the same measures | — | — | — | Combines AI radiograph findings with PMS data; case acceptance by practice, provider and recommendation type; treatment-planning rates; missed-care opportunities; claim denials named among board-level metrics | `[V20][V21][V23]` |
| Pearl — Practice Intelligence | Enterprise, region, location, provider | Funnel visualizations and conversion metrics from treatment planning to completion | — | — | — | Pairs diagnostic AI with PMS data; lists Denticon among native integrations | `[V24]` |

### 14.2 Consolidated roll-ups and region hierarchies

Observed patterns:

- **Three-view convention**: one consolidated overview, a per-location breakdown, a per-region breakdown; layouts change
  with the number of locations (tiles for up to about 10, wide tables for 11–30) `[V5][V6]`.
- **Totals and averages** are both shown for the selected set `[V5]`.
- **Hierarchy needs configuration** and is often vendor-assisted: DI regions are created by its support team `[V5]`;
  Denticon uses `Setup > Office Groups` `[H23]`; DentalOS organization groups are set up during onboarding `[O9]`.
- **More than one grouping dimension is needed**: region, brand, acquisition cohort (original practices vs acquisitions)
  `[V7]`; Jarvis scopes by brand, office or region `[V10]`; DentalOS groups by region or brand `[O9]`.
- **Drill path**: region > clinic > provider; a regional total only flags a problem, it does not locate it `[V21]`.
- **Comparability needs standard definitions** before roll-up: identical treatment-code usage for case acceptance,
  identical appointment categories for schedule efficiency, identical adjustment treatment for collection % `[V21][V23]`.

### 14.3 Same-store comparison

| Source | Method |
|---|---|
| Planet DDS 2026 Deep Dive `[V1]` | Growth computed on a same-store basis, 2025 vs 2024. 3,294 of 8,593 practices had a year-over-year comparison. DSO size counts locations active in **both** years; single-location groups excluded from DSO tiers; tier growth is revenue-weighted. Three aggregates are reported side by side for 2025: simple average 6.6%, trimmed mean 4.9%, revenue-weighted 4.0%. 63% of practices grew; a distribution table spans from worse than −10% (13.6%) to over +10% (33.5%). |
| General finance definition `[V30]` | Sales of a fixed set of stores open in both periods, current vs prior period, as a percentage change; newly opened stores are excluded so that expansion does not mask the performance of existing locations. No minimum operating period is prescribed. |
| Overjet `[V22]` | Treats same-store growth as organic growth from owned locations and decomposes it into case acceptance, hygiene capture, diagnostic utilization and provider adoption; compares best location with portfolio median, and similar-patient-mix offices with each other. |

No DSO-specific published rule for de novo ramp periods or acquired-practice inclusion was found **[unverified]**.

### 14.4 Ranking, leaderboards and scorecards

| Technique | Example | Source |
|---|---|---|
| Top / bottom buckets | Top 20, bottom 20 and middle 60% of locations on KPIs, monthly to yearly | `[V4]` |
| Colour-coded tails | Top and bottom 20% highlighted across 12 operations views | `[V10]` |
| Top-N / bottom-N toggle | Top 15, Bottom 15, All providers or hygienists | `[D8][D11]` |
| Quartile performance bands | Best Practice, Strong, At Risk, High Opportunity by daily production quartile | `[V1]` |
| Composite score | RCM Health Score 0–100: five equally weighted components (A/R over 90, days in A/R, OTC collection rate, bad-debt rate, patient-pay collection rate), each scored 0–20 relative to the peer population; tiers Strong 75–100, Above Average 50–75, Below Average 25–50, Poor 0–25 | `[V1]` |
| Configurable scorecards | Rows = locations, providers, procedure codes, referral sources or carriers; columns = chosen metrics; grouping by region or brand; drill to location, provider, procedure code, referral source, trend; side-by-side practice comparison | `[V7][V8][V9]` |
| Templates by meeting | Daily flash, weekly operations review, monthly finance or executive review, quarterly strategic review, marketing review | `[V7]` |
| Comparison windows | Last week, trailing 4 weeks, last 6 months, quarter vs same quarter last year; 8–12 week windows recommended to smooth weekly noise | `[V7]` |
| Volatility ranking | Coefficient of variation of daily production (standard deviation ÷ mean); most consistent decile CV ≤ 0.19, most volatile CV ≥ 0.83 | `[V1]` |

### 14.5 Benchmarking

Internal benchmarking (location vs group average, vs top performers, vs own baseline) is universal `[V7][V22]`. External
benchmarks are offered as an optional overlay on percentage metrics `[V7]` or published as annual reports.

**Planet DDS 2026 Deep Dive — operating vitals** (8,593 practices, 497 DSOs; about 97% of chairs are DSO-affiliated) `[V1][V2]`

| Metric | 2025 | 2024 |
|---|---|---|
| Case acceptance rate | 58% | 57% |
| Case completion rate (plans from H1 finished by year end) | 47% | 42% |
| New patients per month (average) | 46 | 43 |
| Cancellation rate | 12.9% | 15.5% |
| No-show rate | 6.9% | 7.4% |
| Hygiene reappointment rate | 63% | 60% |
| Daily production per practice | $8,764 | $8,436 |

**Planet DDS threshold table (warning / target / elite)** `[V1]`

| Metric | Warning | Target | Elite |
|---|---|---|---|
| Daily production volatility (CV) | above 0.5 | 0.3–0.5 | below 0.3 |
| New patients per month | below 35 | 35–75 | 75+ |
| Revenue per chair (annual) | below $100K | $150K–$200K | $300K+ |
| Acceptance-to-completion gap | above 30 pp | 10–30 pp | below 20 pp (as printed) |
| Friday vs Tuesday production | below 60% | 70–80% | above 80% |
| Cancellation rate | above 20% | 10–15% | below 10% |
| OTC collection rate | below 80% | 80–95% | above 95% |
| A/R aged over 90 days | above 50% of A/R | 15–30% | below 15% |
| Same-day claim rate | below 20% | 40–80% | above 80% |
| Bad-debt rate | above 5% | 1–3% | below 1% |

**Henry Schein One 2026 Catalyst Index** `[V25][V26]`

| KPI | Average | Top 10% |
|---|---|---|
| New patients per month | 39 | 82 |
| Patient retention rate | 58% | 90% |
| No-show rate | 3% | below 1% |
| Cancellation rate | 5% | below 1% |
| Case acceptance rate | 45% | 75% |
| New-patient appointment lead time | 23 days | 7 days |
| Reappointment rate | 76% | 92% |
| Collection rate (groups of 8+ locations: average 72%, top 10% 97%) | 72% | 97% |

The two sets disagree sharply on cancellation rate (12.9% vs 5%) and case acceptance (58% vs 45%), which shows that
external benchmarks are only usable when the definition travels with the number.

Other Deep Dive constructs worth reusing: dollar vs count case acceptance (by case-value tier); growth by new-patient
band; revenue per chair by segment; size-and-efficiency quadrants; peak-day and seasonality analysis; a revenue-leakage
index (cancellation, no-show, collection, completion); case-acceptance sensitivity tables (production lift per point)
`[V1]`.

### 14.6 Centralized billing and RCM dashboards

| Element | Detail | Source |
|---|---|---|
| Cash-conversion waterfall | Gross production > contractual and insurance adjustments (structural) > time-of-service (OTC) gap > bad-debt write-offs > A/R over 90 days at risk > estimated cash. 2025 chart for 497 DSOs: $6.794B gross; −$532M (7.8%); −$222M (3.3%); −$245M (3.6%); −$329M (4.8%); $5.466B cash. The report's own table shows different stage amounts **[conflict]** | `[V1]` |
| Efficiency metric | Net-adjusted collections against net production (about 88–89% on the platform; median 88.9%), not gross-basis collection | `[V1]` |
| OTC collection rate | Share of patient-responsible balances collected at point of service; platform median 91.3%, mean 87.9% | `[V1]` |
| Same-day claim rate | Claims sent on the date of service; 37.4% of DSOs send fewer than 20% same day (average lag 10.4 days) vs 3.0 days for those above 80% | `[V1]` |
| Composite health score | See 14.4; median 50.5; only 9.1% of DSOs score Strong | `[V1]` |
| Recovery sizing | Opportunity per practice per year by tier, closing gaps to targets (OTC 90%, bad debt 1%, 45% recovery of A/R over 90) | `[V1]` |
| RCM KPI set (industry article) | A/R over 90 days below 15%; clean-claim rate (best groups above 70%, defined as no further touch after first submission); collection days under 30 (top teams under 15); claim-level denial rate below 5% for the best, above 10% for many; claim yield (payer payment ÷ expected fee) above 90% | `[V27]` |
| Work queues | Tasks generated from claims and A/R reports with assignee, due date, action, supervisor dashboard by user and status | `[H53]` |
| Claim and A/R lists | Open claims by insurer or location; guarantor list with contacts; claims aging; adjustments and write-offs by type, location and provider; payer mix with time to collect and write-offs by insurer | `[V4]` |
| Denial analytics | ERA 835 denials by carrier, service code, reason code and remark code with contract, patient and other adjustment amounts | `[H39]` |
| Drivers of cross-location variance | Documentation and coding at point of care, fragmented billing workflows, weak visibility of aging and denials by payer and location | `[V26]` |

### 14.7 Provider compensation reports

| Model / tool | Detail | Source |
|---|---|---|
| ADA model list | Straight salary; salary plus commission; straight commission on total production, adjusted (billable) production or collections; net profit after contract-specified expenses such as lab fees | `[V28]` |
| ADA definitions | Total production = office fee; adjusted production = contractually collectible amount; collections = net amount collected. Worked crown example: $1,500 fee, $1,000 allowed, $950 collected. 35% of adjusted production = $350; 30% of total production = $450. The page's figure for 35% of collections is arithmetically inconsistent (35% × $950 = $332.50) **[conflict]** | `[V28]` |
| Typical formulas (Dental Economics, Jan 2023) | Collections: most common offer 35% of collections; variant 35% of collections less 35% of lab fees (nets about 33%), or a straight 33%. Production: about 25% of net production (after write-offs and discounts). Fixed: base salary plus incentive above a collections multiple (example 3:1). Hybrid formulas for specialty procedures. In-office milled units may carry a stated per-unit cost | `[V29]` |
| Denticon — collection-based pay | `Income Allocation – Summary`; pay on the `Income` column for the pay period; run for each location where the provider treated; credits count only once allocated to completed services | `[H29][H30][H9]` |
| Denticon — production-based pay | `Production Report` by provider: completed procedures and production adjustments only, with counts, duration and effective rate | `[H32]` |
| Denticon — per-procedure pay | Create a dedicated fee schedule holding the amount paid per code, then run `Production Report` by code grouped by provider with `Include UCR` and that schedule | `[H31]` |
| CareStack Clinician Payroll | Fields: Gross and Net Revenue, Additions, Deductions, Earned Share, Minimum Guarantee, Estimated Gross, Gross Amount, Lab Cost Percentage, Estimated Lab Cost. Pay periods monthly, weekly, fortnightly, custom. Workflow: Pending Review (when lab cases or guarantees apply) > Published; batch void; per-location payout breakdown; payroll history | `[V19]` |
| Jarvis | Lists a Payroll module (no detail retrieved) **[unverified detail]** | `[V11]` |

Hygienist-specific compensation structures were not researched **[unverified]**.

### 14.8 Goal cascades

| Layer | Practice | Source |
|---|---|---|
| Provider | Daily production goal × scheduled working days; half-day rule; auto-seeding from six-month history | `[D5][D12]` |
| Office | Sum of provider monthly goals ÷ office working days; daily average needed for the rest of the month; projection of month-end new and recare patients | `[D5][D1]` |
| Office group / enterprise | Same metrics aggregated up the hierarchy; year-to-date attainment | `[D1][D31]` |
| Tracking cadence | Weekly, monthly, quarterly, yearly goal report; over / under columns per location | `[V4][V10]` |
| Setting method | Establish a baseline per metric, then set goals from top-performer levels; refine and track for practices and providers | `[V7][V12]` |
| Adoption goals | Utilization and adoption tracked per site with same-day flags; 90-day pilots on 3–5 locations (vendor guidance) | `[V21][V22]` |

No vendor documents a formal top-down allocation of an enterprise target to regions and offices **[unverified]**.

### 14.9 Data governance — who sees which offices

| Mechanism | Example | Source |
|---|---|---|
| Location-level entitlement | Multi-location dashboards require full access at every selected location; scorecards can include only accessible locations | `[V5][V6][V7]` |
| Scoped administrators | Group Admin sees and administers only assigned organization groups; cannot grant elevated permissions; audit log limited to own group | `[O5][O8]` |
| Assignment granularity | Users per location, Group Admins per organization group, Super Admins everything | `[O6]` |
| Scope dimensions | Module, brand, office, region | `[V10]` |
| Report-level access | Hide all, per-report, or full; per-sub-menu rights with run vs view-only | `[V17][H13]` |
| Provider self-scope | A user linked to one provider can run provider reports only for that provider | `[H5]` |
| Sharing | Shared scorecards are view-only; recipients duplicate to customize | `[V7]` |
| Role-based surfaces | Dashboard tiles toggled per role; role type used for personalization separately from security | `[O10][H58]` |
| Auditability | User activity report (logins with IP, pages visited with patient context); audit trail of edits and deletions; platform audit log with CSV export | `[H20][H22][O8]` |
| Definition governance | Standardize clinical and documentation data at the source so figures are comparable and auditable for boards | `[V23]` |
| Security claims | HIPAA, HITECH, PIPEDA support and encryption at rest and in transit are advertised by analytics vendors | `[V10]` |

### 14.10 AI-assisted insight in multi-location products

| Pattern | Example | Source |
|---|---|---|
| Risk scores in workflow | No-show and late-cancel risk shown where staff schedule | `[H66]` |
| Autonomous agents with ROI reporting | Confirmation, recall, cancellation recovery, missed-appointment and receptionist agents; ROI dashboard with adjustable ROI settings | `[O3]` |
| Assistant on scorecards | Pattern analysis and statistical-significance help | `[V7]` |
| Clinical AI joined to PMS data | Missed-care opportunities, treatment-planning rate, acceptance by recommendation type, funnel from diagnosis to completion | `[V20][V24]` |
| ML on a warehouse | Predicting no-shows and treatment-plan adherence across locations (vendor claim) | `[V16]` |

---

# PART 3 — Implications for our module (analyst recommendations, not sourced facts)

## 15. What to build from this evidence

Identifiers below follow the project's snake_case rule.

| # | Recommendation | Evidence it answers |
|---|---|---|
| 1 | **Report registry** with one definition per report and criteria-driven variants (`format`, `group_by`, `date_basis`, `office_scope`), each with `description`, `category`, `keywords`, `breadcrumb` so search, favorites and permissions hang off the same record | 2.2, 5 |
| 2 | **Explicit office scope on every run**: this office, my offices, an `office_group`, all offices — plus a visible **attribution basis** (`home_office_id`, `transaction_office_id`, `appointment_office_id`, `charge_office_id`) printed on the output | 9, 13 (#2) |
| 3 | **Office groups as many-to-many tags** with a type (region, brand, cohort, custom) so one office can sit in several hierarchies; self-service, no vendor ticket | 14.2 |
| 4 | **Saved views** that store criteria with a *relative* office scope (`current_office`) by default, shareable to roles and schedulable | 13 (#10) |
| 5 | **Provider self-scope** as a first-class permission (user linked to `provider_id`, reports restricted to self) | 5, 14.9 |
| 6 | **Permission model**: capability per report category with `run`, `view_definition`, `export`, `schedule`, `see_patient_detail`; most-permissive-wins across roles; data scope by office, group and provider | 10, 14.9 |
| 7 | **Interactive (work-queue) reports** as a separate type with row actions, resolution state and automatic removal: eligibility, unsigned notes, unscheduled treatment, recall due, outstanding claims, patient A/R | 3, 7 |
| 8 | **Report-to-action**: create task, start outreach campaign, sign, verify eligibility, open record — from any list report | 7 |
| 9 | **Tenant custom reports** through a builder and saved definitions instead of vendor-coded folders | 4, 13 (#13) |
| 10 | **One metric engine** shared by dashboards and reports, with a published definition, formula, edge-case rules and version per `metric_key`; the DPA rules in 8.3 are a ready starting specification | 8.3, 13 (#1–#8) |
| 11 | **Configurable thresholds and code sets** per organization (colour bands, recare / hygiene / adjunctive code groups, working-day rule) with sensible defaults | 8.4, 8.5 |
| 12 | **Reconciliation by design**: every dashboard tile drills to the report rows that sum to it; period-stable snapshots for closed periods; `as_posted` vs `as_of_now` toggles for allocation-based figures | 6.2, 13 (#7, #8) |
| 13 | **Same-store flag** per office and period (`is_comparable`) with a configurable ramp rule; show simple, trimmed and revenue-weighted aggregates | 14.3 |
| 14 | **Ranking and scorecards**: top / bottom N and percentile bands, rows = offices, providers, codes, referral sources, carriers; templates per meeting cadence; view-only sharing with duplicate | 14.4 |
| 15 | **Benchmarks**: internal (group average, top quartile, own baseline) first; external sets stored with source, year and definition, never mixed silently | 14.5 |
| 16 | **RCM cockpit**: cash-conversion waterfall, OTC rate, same-day claim rate, days in A/R, A/R over 90, denial analytics by carrier and reason, composite health score, work queues | 14.6 |
| 17 | **Provider compensation statements**: pay rules per provider (basis, percentage, lab deduction, guarantee), pay periods, per-office breakdown, review-then-publish workflow | 14.7 |
| 18 | **Goals**: provider > office > group roll-up, auto-seed from history, daily-needed and projection metrics, goal history | 8.6, 14.8 |
| 19 | **Async, chunk-free exports** with progress and delivery, plus scheduled delivery | 13 (#12) |
| 20 | **Routine packs**: end-of-day, end-of-month, year-end checklists per role that launch the right reports with the right criteria | 11 |
| 21 | **Audit of report usage** (who ran what, for which offices, exported or not) | 14.9 |
| 22 | **AI layer**: risk scores inside lists, anomaly and driver explanations on scorecards, outcome / ROI tracking for automated outreach | 14.10 |

---

## 16. Gaps, conflicts and unverified items

- Exact top-level order and complete item list of the `Reports` menu, and every on-screen filter, exist only in screenshots.
- Only two Interactive Reports are documented; the menu may hold more.
- The contents of any customer's `Office Reports` folder are not public.
- No security right was found for Interactive Reports, Ortho Reports, Search Report, My Favorites or DPA.
- No documentation of scheduling or sharing saved reports inside Denticon; the claim of 100+ reports and scheduled reports
  is from a marketing page that could not be opened **(S)**.
- `Dentilytics Enterprise` has no public documentation.
- Web search ran out before these were checked: DSO-specific same-store rules (de novo ramp, acquisitions), formal
  goal-allocation methods, hygienist compensation, Jarvis Payroll detail, DI Provider Pulse and goal features, CareStack
  and tab32 current DSO analytics, Sikka and ADA Health Policy Institute benchmark sets.
- Vendor pages are marketing; performance claims are not independently verified.
- Planet DDS documents contain internal conflicts (sections 8.4, 13, 14.6); numbers were taken as printed and flagged.

---

## Sources

Help Center articles were read on 2026-11-22. Base: `https://support.planetdds.com/hc/en-us/articles/`.

### Planet DDS Help Center — reports, setup, security

- `[H1]` How to understand the new reports menu — https://support.planetdds.com/hc/en-us/articles/4408457645723-How-to-understand-the-new-reports-menu
- `[H2]` How can we quickly find reports in Denticon? — https://support.planetdds.com/hc/en-us/articles/360020701671-How-can-we-quickly-find-reports-in-Denticon
- `[H3]` Saved reports in My Favorites run for the office they were set up in — https://support.planetdds.com/hc/en-us/articles/360059445452
- `[H4]` Saved a report to My Favorites but Print/Preview does nothing — https://support.planetdds.com/hc/en-us/articles/38203450746139
- `[H5]` Understanding the Report Access Provider field (My Reports) — https://support.planetdds.com/hc/en-us/articles/115002079291
- `[H6]` Interactive Report - Eligibility Verification — https://support.planetdds.com/hc/en-us/articles/20825080284443-Interactive-Report-Eligibility-Verification
- `[H7]` Interactive Unsigned Progress Notes vs Daily Reports version — https://support.planetdds.com/hc/en-us/articles/30330672283163
- `[H8]` E-sign of Prog Notes on Unsigned Prog Note Report — https://support.planetdds.com/hc/en-us/articles/51881116218779-E-sign-of-Prog-Notes-on-Unsigned-Prog-Note-Report
- `[H9]` Reports Matrix, with attachment "Denticon Reporting 101" (PDF) — https://support.planetdds.com/hc/en-us/articles/4415425089563-Reports-Matrix and https://support.planetdds.com/hc/article_attachments/26183111395355
- `[H10]` Reports and activities recommended at the end of each day — https://support.planetdds.com/hc/en-us/articles/115002085792
- `[H11]` Reports and activities recommended at the end of each month and year — https://support.planetdds.com/hc/en-us/articles/115002068151
- `[H12]` What should our office consider at the end of each year? — https://support.planetdds.com/hc/en-us/articles/115002069791
- `[H13]` Security rights, part 3 – Reports rights — https://support.planetdds.com/hc/en-us/articles/115002075251
- `[H14]` Security rights, part 6 – Utilities rights — https://support.planetdds.com/hc/en-us/articles/115002075311
- `[H15]` Security rights, part 4 – Setup rights — https://support.planetdds.com/hc/en-us/articles/115002075271
- `[H16]` Full control vs view only — https://support.planetdds.com/hc/en-us/articles/115002083332
- `[H17]` Users assigned to multiple security groups — https://support.planetdds.com/hc/en-us/articles/37657163933083
- `[H18]` Understanding the security rights in a security group (Group Rights List) — https://support.planetdds.com/hc/en-us/articles/115002069431
- `[H19]` I need a security right assigned to my user (Security List reports) — https://support.planetdds.com/hc/en-us/articles/30999043081883
- `[H20]` Monitoring user login activity (User Activity Report) — https://support.planetdds.com/hc/en-us/articles/115002093452
- `[H21]` Setup needed for User Activity Reports — https://support.planetdds.com/hc/en-us/articles/115002077151
- `[H22]` What activities will the Audit Trail track? — https://support.planetdds.com/hc/en-us/articles/115002073211
- `[H23]` How are office groups defined and used? — https://support.planetdds.com/hc/en-us/articles/115002067711-How-are-office-groups-defined-and-used
- `[H24]` Multi-location operation: which aging reports should I run? — https://support.planetdds.com/hc/en-us/articles/360003002172
- `[H25]` Aging by Account A/R vs Patient A/R — https://support.planetdds.com/hc/en-us/articles/38057961810331
- `[H26]` Executive Summary does not match Aging Report — https://support.planetdds.com/hc/en-us/articles/34417429197595
- `[H27]` How do we interpret the Executive Summary report? — https://support.planetdds.com/hc/en-us/articles/115002094052
- `[H28]` How do we understand the Production Analysis report? — https://support.planetdds.com/hc/en-us/articles/30453948982171
- `[H29]` Understanding the Income Allocation Summary Report for Provider Payments — https://support.planetdds.com/hc/en-us/articles/115002081992
- `[H30]` Paying providers based on collection — https://support.planetdds.com/hc/en-us/articles/115002070651
- `[H31]` Paying providers a set amount per completed procedure — https://support.planetdds.com/hc/en-us/articles/115002093932
- `[H32]` Understanding the Production by Provider report — https://support.planetdds.com/hc/en-us/articles/115002069071
- `[H33]` Production Summary vs Income Allocation differences — https://support.planetdds.com/hc/en-us/articles/115002085292
- `[H34]` Why Monthly Income Allocation Balances May Differ — https://support.planetdds.com/hc/en-us/articles/30361817476763-Why-Monthly-Income-Allocation-Balances-May-Differ
- `[H35]` How transactions should be entered so providers and accounts get paid properly — https://support.planetdds.com/hc/en-us/articles/360000367792
- `[H36]` What is the Special Transaction report? — https://support.planetdds.com/hc/en-us/articles/30717390364699
- `[H37]` Daily Audit Report — https://support.planetdds.com/hc/en-us/articles/4404741110171-Daily-Audit-Report
- `[H38]` What is the SmartAssist Report Card? — https://support.planetdds.com/hc/en-us/articles/4414927956251-What-is-the-SmartAssist-Report-Card
- `[H39]` ERA 835 Denial Report — https://support.planetdds.com/hc/en-us/articles/19719314803739-ERA-835-Denial-Report
- `[H40]` How do we understand the Treatment Plan Analysis report? — https://support.planetdds.com/hc/en-us/articles/115002091392
- `[H41]` Understanding the Scheduled Production report — https://support.planetdds.com/hc/en-us/articles/360049517211
- `[H42]` Collection by code — https://support.planetdds.com/hc/en-us/articles/32940042672283
- `[H43]` Daily Journal: adjustments in the charges column — https://support.planetdds.com/hc/en-us/articles/31644959243803
- `[H44]` Production totals for a date range (Daily Journal) — https://support.planetdds.com/hc/en-us/articles/115002067531
- `[H45]` Production for all codes completed in a time frame — https://support.planetdds.com/hc/en-us/articles/115002067551
- `[H46]` Appointment Time Stamps report — https://support.planetdds.com/hc/en-us/articles/36804736309787
- `[H47]` How many appointments were scheduled in a month (Appointment Detail) — https://support.planetdds.com/hc/en-us/articles/36706153887131
- `[H48]` Appointments created on a particular date — https://support.planetdds.com/hc/en-us/articles/115002066311
- `[H49]` Patients due but not scheduled (Recall Due) — https://support.planetdds.com/hc/en-us/articles/115002088512
- `[H50]` Post-Op Report vs Procedural Recall Report — https://support.planetdds.com/hc/en-us/articles/115002086792
- `[H51]` Referral reports (five articles) — https://support.planetdds.com/hc/en-us/articles/115002069131 , https://support.planetdds.com/hc/en-us/articles/115002069091 , https://support.planetdds.com/hc/en-us/articles/115002069151 , https://support.planetdds.com/hc/en-us/articles/115002085132 , https://support.planetdds.com/hc/en-us/articles/115002069171
- `[H52]` Ortho Payment Plan and Ortho Treatment Card report options — https://support.planetdds.com/hc/en-us/articles/360045117932
- `[H53]` How do we use the Enhanced Task Manager screen? — https://support.planetdds.com/hc/en-us/articles/360002419792-How-do-we-use-the-Enhanced-Task-Manager-screen
- `[H54]` Create Task button for Patient AR Follow-Up — https://support.planetdds.com/hc/en-us/articles/37759543710875
- `[H55]` Report Error: "File size is too large to download" — https://support.planetdds.com/hc/en-us/articles/49239504234011
- `[H56]` Report error HTTP status 503 (unsupported browsers) — https://support.planetdds.com/hc/en-us/articles/28732574961691
- `[H57]` Time Clock report; multi-location time clock — https://support.planetdds.com/hc/en-us/articles/115002077091 , https://support.planetdds.com/hc/en-us/articles/115002093512
- `[H58]` How can I change my 'User Role'? — https://support.planetdds.com/hc/en-us/articles/360031610771-How-can-I-change-my-User-Role
- `[H59]` My Page — https://support.planetdds.com/hc/en-us/articles/360052415832-My-Page
- `[H60]` Accounts with credit balances — https://support.planetdds.com/hc/en-us/articles/115002083432
- `[H61]` Which adjustments we've used (Executive Day Sheet) — https://support.planetdds.com/hc/en-us/articles/115002085332
- `[H62]` Daily deposit slip report; credit card transactions — https://support.planetdds.com/hc/en-us/articles/115002079011 , https://support.planetdds.com/hc/en-us/articles/115002079031
- `[H63]` Office Level Filtering for Referrals and Labs — https://support.planetdds.com/hc/en-us/articles/58789839729691-Denticon-Office-Level-Filtering-for-Referrals-and-Labs
- `[H64]` New SFTP Server for Nightly Data Download (BCP) — https://support.planetdds.com/hc/en-us/articles/35085414605339
- `[H65]` Data Share — https://support.planetdds.com/hc/en-us/articles/18946647873435-Data-Share
- `[H66]` Truro Integration (with Denticon Patient Insights) — https://support.planetdds.com/hc/en-us/articles/51221557873691-Truro-Integration-with-Denticon-Patient-Insights
- `[H67]` Denticon Automated Campaign Reporting Guide — https://support.planetdds.com/hc/en-us/articles/53085191759515-Denticon-Automated-Campaign-Reporting-Guide
- `[H68]` Insurance report how-tos: claims not paid, claim statuses (Outstanding Claims - Excel), claims transmitted (Claims List), pre-auth claims, managed-care utilization, capitation payments — https://support.planetdds.com/hc/en-us/articles/115002070591 , https://support.planetdds.com/hc/en-us/articles/115002085392 , https://support.planetdds.com/hc/en-us/articles/115002077251 , https://support.planetdds.com/hc/en-us/articles/115002065611 , https://support.planetdds.com/hc/en-us/articles/115002087572 , https://support.planetdds.com/hc/en-us/articles/115002087532
- `[H69]` Patient list reports: number of patient records; patients not seen for a period — https://support.planetdds.com/hc/en-us/articles/115002082912 , https://support.planetdds.com/hc/en-us/articles/115002067011
- `[H70]` Monies collected during a date range (Daily Journal) — https://support.planetdds.com/hc/en-us/articles/115002073951
- `[H71]` List of deleted appointments (Audit Trail Report, Module Type) — https://support.planetdds.com/hc/en-us/articles/360050586872
- `[H72]` Creating a login for a new user (one group per user advice) — https://support.planetdds.com/hc/en-us/articles/115002071431
- `[H73]` Attaching a user to several offices (Office Access tab) — https://support.planetdds.com/hc/en-us/articles/115002087712
- `[H74]` Help Center, Denticon > Reporting section (list of sub-sections) — https://support.planetdds.com/hc/en-us/sections/39626159143195-Reporting

### Planet DDS Help Center — Practice Analytics and Dentilytics

- `[D1]` Understanding the Denticon Practice Analytics Dashboards: A Complete Guide to Metrics and Reports — https://support.planetdds.com/hc/en-us/articles/49789717199771-Understanding-the-Denticon-Practice-Analytics-Dashboards-A-Complete-Guide-to-Metrics-and-Reports
- `[D2]` Getting Started with Denticon Practice Analytics (DPA) — https://support.planetdds.com/hc/en-us/articles/49834695041947-Getting-Started-with-Denticon-Practice-Analytics-DPA
- `[D3]` Denticon Practice Analytics FAQ — https://support.planetdds.com/hc/en-us/articles/13934611697947
- `[D4]` How to Use Date Ranges and Comparison Periods in DPA — https://support.planetdds.com/hc/en-us/articles/49834656066075
- `[D5]` Glossary: Morning Huddle — https://support.planetdds.com/hc/en-us/articles/23592864401563
- `[D6]` Glossary: Production Analysis — https://support.planetdds.com/hc/en-us/articles/23679680502299
- `[D7]` Glossary: Collections Analysis — https://support.planetdds.com/hc/en-us/articles/23679864262299
- `[D8]` Glossary: Provider Breakdown — https://support.planetdds.com/hc/en-us/articles/23679982811163
- `[D9]` Glossary: Treatment Plan Analysis — https://support.planetdds.com/hc/en-us/articles/23917936940699
- `[D10]` Glossary: Front Office — https://support.planetdds.com/hc/en-us/articles/23918621538459-Denticon-Practice-Analytics-Glossary-Front-Office
- `[D11]` Glossary: Hygiene Recall — https://support.planetdds.com/hc/en-us/articles/24482040036763
- `[D12]` Provider Goal Auto-Population — https://support.planetdds.com/hc/en-us/articles/16406221498395-Provider-Goal-Auto-Population
- `[D13]` Troubleshooting Data Discrepancies in DPA — https://support.planetdds.com/hc/en-us/articles/49834771623067
- `[D14]` Troubleshooting Goals and Provider Configuration Issues in DPA — https://support.planetdds.com/hc/en-us/articles/49834738684443
- `[D15]` Troubleshooting Hygiene Dashboard Issues in DPA — https://support.planetdds.com/hc/en-us/articles/49834757487643
- `[D16]` Troubleshooting Treatment Plan and Patient Visit Issues in DPA — https://support.planetdds.com/hc/en-us/articles/49834731153307
- `[D17]` Understanding Collections Analysis Metrics in DPA — https://support.planetdds.com/hc/en-us/articles/49834833815963
- `[D18]` Understanding Patient Visit Analysis Metrics in DPA — https://support.planetdds.com/hc/en-us/articles/49834792638235
- `[D19]` Understanding Provider Breakdown Metrics in DPA — https://support.planetdds.com/hc/en-us/articles/49834765008411
- `[D20]` Understanding the Morning Huddle Dashboard in DPA — https://support.planetdds.com/hc/en-us/articles/49834789216923
- `[D21]` How do I send messages directly from Denticon Practice Analytics? — https://support.planetdds.com/hc/en-us/articles/39745697797147
- `[D22]` Danger Zone Patient List FAQ — https://support.planetdds.com/hc/en-us/articles/43708103359259-Danger-Zone-Patient-List-FAQ
- `[D23]` What is Denticon Practice Analytics (DPA)? — https://support.planetdds.com/hc/en-us/articles/49830353492123
- `[D24]` Morning Huddle Version 1 vs Version 2 — https://support.planetdds.com/hc/en-us/articles/49830466119579
- `[D25]` Who is DPA designed for? — https://support.planetdds.com/hc/en-us/articles/49830416109339
- `[D26]` What date range options are available in the dashboards? — https://support.planetdds.com/hc/en-us/articles/49830514752539
- `[D27]` What do the color indicators mean? — https://support.planetdds.com/hc/en-us/articles/49830620434331
- `[D28]` Dentilytics Basic FAQs — https://support.planetdds.com/hc/en-us/articles/360003797371-How-am-I-able-to-understand-the-information-within-Dentilytics-Basic
- `[D29]` How do I enter provider goals for Dentilytics Basic? — https://support.planetdds.com/hc/en-us/articles/360022805492
- `[D30]` Practice analytic data from today not reflected on "My Page" — https://support.planetdds.com/hc/en-us/articles/30850633372827
- `[D31]` Morning Huddle Dashboard flyer (PDF) — https://www.planetdds.com/wp-content/uploads/2023/06/Flyer-Denticon-Morning-Huddle-050923.pdf
- `[D32]` Denticon Practice Analytics demo page — https://web.planetdds.com/denticon-practice-analytics-demo
- `[D33]` Denticon "insightful analytics" marketing page **(S)**, returned 404 on 2026-11-22 — https://planetdds.com/denticon/insightful-analytics

### Planet DDS Help Center — DentalOS

- `[O1]` Navigate the DentalOS Dashboard — https://support.planetdds.com/hc/en-us/articles/57857855069339-Navigate-the-DentalOS-Dashboard
- `[O2]` DentalOS AI Workforce Tile — https://support.planetdds.com/hc/en-us/articles/57858463196699
- `[O3]` Use the Agent Marketplace and Agent Dashboard in DentalOS — https://support.planetdds.com/hc/en-us/articles/57863888203291
- `[O4]` Understand Organization Groups and Locations in DentalOS — https://support.planetdds.com/hc/en-us/articles/57859410317595
- `[O5]` DentalOS: Group Admin and User Role Experience — https://support.planetdds.com/hc/en-us/articles/57864083832603
- `[O6]` Assign Location and Product Access to a User in DentalOS — https://support.planetdds.com/hc/en-us/articles/57865226088475
- `[O7]` Set Up a New User's Permissions in Denticon — https://support.planetdds.com/hc/en-us/articles/57864769925275
- `[O8]` View the DentalOS Audit Log — https://support.planetdds.com/hc/en-us/articles/57859737664923
- `[O9]` DentalOS Glossary — https://support.planetdds.com/hc/en-us/articles/57864597971611
- `[O10]` Control Which Dashboard Tiles Each Role Sees in DentalOS — https://support.planetdds.com/hc/en-us/articles/57859627385627
- `[O11]` DentalOS product page — https://www.planetdds.com/dentalos/

### Vendor and industry

- `[V1]` Planet DDS, 2026 Dental Industry Outlook: Deep Dive (PDF, May 2026) — https://www.planetdds.com/wp-content/uploads/2026/05/PDDS-2026-DSO-Outlook-DeepDive-051526.pdf
- `[V2]` Planet DDS newsroom, 2026 Deep Dive Report — https://planetdds.com/newsroom/2026-deep-dive-report
- `[V3]` Orthodontic Products, Planet DDS rolls out RCM Zero (7 Oct 2025) — https://orthodonticproductsonline.com/practice-products/software/practice-management-software/planet-dds-rolls-out-rcm-zero-to-eliminate-revenue-leakage-in-dental-support-organizations/
- `[V4]` Dental Intelligence, DSO Reports: Enterprise Reporting — https://learn.dentalintel.com/en/articles/6637485-dso-reports-enterprise-reporting
- `[V5]` Dental Intelligence, Analytics DSO: Multi-Location Performance Board — https://learn.dentalintel.com/en/articles/11366805-analytics-dso-multi-location-performance-board
- `[V6]` Dental Intelligence, Analytics DSO: Multi-Location Collections Board — https://learn.dentalintel.com/en/articles/10905775-analytics-dso-multi-location-collections-board
- `[V7]` Dental Intelligence, DSO: Use Scorecards to turn data into actionable insights across multiple locations — https://educate.dentalintel.com/en/articles/13117875-dso-use-scorecards-to-turn-data-into-actionable-insights-across-multiple-locations
- `[V8]` Dental Intelligence for DSOs: get started with the right tools — https://educate.dentalintel.com/en/articles/7980772-dental-intelligence-for-dsos-get-started-with-the-right-tools
- `[V9]` Dental Intelligence blog, A closer look at Scorecards for multi-location DSOs — https://dentalintel.com/blog-posts/a-closer-look-at-dental-intelligence-scorecards-for-multi-location-dsos
- `[V10]` Jarvis Analytics, How to use Jarvis — https://www.jarvisanalytics.com/how-to-use-jarvis/
- `[V11]` Jarvis Analytics home page — https://jarvisanalytics.com/
- `[V12]` Jarvis Analytics blog, 4 keys to DSO success using a dental KPI dashboard — https://www.jarvisanalytics.com/blog/4-keys-to-dso-success-using-a-dental-kpi-dashboard
- `[V13]` Dentrix Ascend, Profitability Insights Suite — https://www.dentrixascend.com/support/profitability-coaching
- `[V14]` Practice by Numbers, Enterprise Dashboard — https://practicenumbers.com/business-analytics/enterprise-dashboard/
- `[V15]` Practice by Numbers, Multiple practices — https://practicenumbers.com/use-cases/multiple-practices/
- `[V16]` tab32, Open Data Warehouse for DSOs (press release, 18 Nov 2020) — https://www.newswire.com/news/tab32-announces-the-release-of-open-data-warehouse-for-dsos-21259894
- `[V17]` CareStack, Analytics & Reporting — https://carestack.com/dental-software/features/analytics-reporting
- `[V18]` CareStack, Groups and DSOs — https://carestack.com/en-GB/who-we-serve/groups-dsos
- `[V19]` CareStack, Clinician Payroll — https://carestack.com/en-GB/dental-software/features/clinician-payroll
- `[V20]` Overjet, DSO Analytics launch (press release, 6 Aug 2024) — https://prnewswire.com/news-releases/overjet-launches-the-first-dso-analytics-suite-powered-by-ai-302214869.html
- `[V21]` Overjet blog, Regional dental practice performance tracking — https://www.overjet.com/blog/regional-dental-practice-performance-tracking
- `[V22]` Overjet blog, The metrics that make same-store growth fixable — https://www.overjet.com/blog/the-metrics-that-make-same-store-growth-fixable
- `[V23]` Overjet blog, Board-ready DSO metrics — https://www.overjet.com/blog/board-ready-dso-metrics-standardized-clinical-data
- `[V24]` Pearl, Practice Intelligence — https://hellopearl.com/products/practice-intelligence
- `[V25]` Henry Schein One, Dental practice performance checklist 2026 (Catalyst Index) — https://henryscheinone.com/insights/blogs/dental-practice-performance-checklist-2026
- `[V26]` Henry Schein One, DSO dental practice collection rate — https://www.henryscheinone.com/insights/blogs/dso-dental-practice-collection-rate/
- `[V27]` Group Dentistry Now, How To Measure Your RCM Success — https://www.groupdentistrynow.com/?p=24283
- `[V28]` American Dental Association, Getting paid: understand your dental salary and compensation — https://www.ada.org/resources/careers/employment-agreements-the-devils-in-the-details/getting-paid-understand-your-dental-salary-and-compensation
- `[V29]` Dental Economics, Options for associate compensation (11 Jan 2023) — https://www.dentaleconomics.com/practice/article/14074431/options-for-associate-compensation
- `[V30]` Corporate Finance Institute, Same-store sales — https://corporatefinanceinstitute.com/resources/valuation/same-store-sales/
