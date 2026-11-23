# Legacy report outputs — Monthly, Management, Ledger and Statements (Denticon by Planet DDS)

Research date: 2026-11-22. Audience: engineers and product designers of the Reports & Analytics module.

Scope: what the legacy tool actually **prints** for the 18 reports of four categories — `Monthly Reports`
(9), `Management Reports` (4), `Ledger Reports` (4) and `Statements` (1 screen). We hold screenshots of the
criteria screens only; this document reconstructs purpose, output columns, grouping, totals, option effects,
users and quirks from vendor documentation, vendor sample-report images and (where nothing exists) comparable
systems.

---

## 0. How to read this document

### 0.1 Evidence tags

| Tag | Meaning |
|---|---|
| `[D]` | Stated in vendor text (Planet DDS Help Center article, vendor PDF). |
| `[S]` | Read by us from a **vendor-published sample image** of the generated report or of the screen (image URL in Sources). Sample figures are the vendor's demo data. |
| `[C]` | From our own criteria-screen transcription (`docs/reports/module-plan/legacy/*.json` or the blind transcription). |
| `[T]` | Third-party guide (not the vendor). |
| `[I]` | Our inference. Always names the basis or the comparable report. |
| `[unverified]` | Could not be confirmed from a source we could open. |

### 0.2 Confidence rating per report

- **DOCUMENTED** — output layout confirmed from vendor text and / or a vendor sample image.
- **PARTIALLY DOCUMENTED** — purpose and some output facts confirmed; layout partly inferred.
- **INFERRED** — no vendor description of the output found; reconstructed from the criteria screen and a
  comparable report in another system.

### 0.3 Method notes (so the work can be repeated)

- The Help Center HTML pages (`support.planetdds.com/hc/...`) answer HTTP 403 to automated fetches. The same
  articles are readable through the public Help Center API:
  `https://support.planetdds.com/api/v2/help_center/en-us/articles/<id>.json`, section lists through
  `.../sections/<id>/articles.json`, search through `.../articles/search.json?query=...`.
- The key evidence is in **article images**, not in article text (most articles are "click here, then here").
  Images are served at `https://support.planetdds.com/hc/article_attachments/<id>`; we opened and read ~70 of
  them. Earlier research noted that screenshots were unreadable through the article API; they are readable when
  the attachment itself is fetched.
- Not read: the 17 MB training PDF `M13_End_of_Day_Reporting.pdf` (too large for the fetch tool) and all
  webinar videos (list in Sources `[V64]`, `[V65]`). A DSO training site on Google Sites that publishes a
  Denticon reporting guide requires a login and was not read.

---

## 1. Summary matrix

| # | Category | Report (exact legacy name) | Output grain | Confidence | Best evidence |
|---|---|---|---|---|---|
| 1 | Monthly | `Executive Summary` | One KPI block per office (optionally per provider) | DOCUMENTED | Vendor field guide (3 images) + 2025 sample |
| 2 | Monthly | `Executive Day Sheet` | One row per transaction type (services, each adjustment type, each payment type) per office | DOCUMENTED | 2020 and 2022 samples |
| 3 | Monthly | `Aging Report by Home Office` | 3 lines per responsible party (total / Ins / Pat) by aging bucket | DOCUMENTED (Detail) | 2019 PDF sample, 2023 Excel sample |
| 4 | Monthly | `Aging Report` | Same layout; different office attribution | DOCUMENTED (Detail) | 2019 and 2025 samples |
| 5 | Monthly | `Income Allocation` | Summary: one row per provider + `Unallocated` + `Total` | DOCUMENTED (Summary), PARTIAL (Detail) | 2012 and 2026 samples + vendor formulas |
| 6 | Monthly | `Allocation Detail` | Payment-to-procedure allocation lines | PARTIALLY DOCUMENTED, layout INFERRED | Glossary + one article |
| 7 | Monthly | `Unallocated Payment/Adjustments` | One line per unallocated payment / credit adjustment | PARTIALLY DOCUMENTED, layout INFERRED | Reporting 101 PDF |
| 8 | Monthly | `Daily Journal Summary by Allocation` | Daily-journal totals attributed by allocation | INFERRED | Criteria only |
| 9 | Monthly | `WaterFall Report` | Collections by date-of-service month | PARTIALLY DOCUMENTED, layout INFERRED | Reporting 101 PDF |
| 10 | Management | `Payment Plan Charges` | Periodic contract charges due on a billing date | INFERRED (workflow documented) | Utilities workflow articles |
| 11 | Management | `Uncollected Copay` | One row per scheduled patient with a patient balance | PARTIALLY DOCUMENTED | Reporting 101 PDF |
| 12 | Management | `Audit Trail` | One row per audited change | DOCUMENTED | 2017 and 2023 samples |
| 13 | Management | `Time Clock Report` | One row per punch pair; daily and grand totals | DOCUMENTED (Detail), PARTIAL (other formats) | 2020 sample |
| 14 | Ledger | `Ledger Report` | Account or patient ledger lines for a date range | PARTIALLY DOCUMENTED, layout INFERRED | How-to articles + Ledger screen guide |
| 15 | Ledger | `Super Bill` | Itemised services / payments / adjustments per patient | PARTIALLY DOCUMENTED, layout INFERRED | Glossary + how-to articles |
| 16 | Ledger | `Walkout Report` | "Statement of Services Rendered" per responsible party | DOCUMENTED | 2022 and 2023 samples |
| 17 | Ledger | `Account Allocation` | Payment allocation trail for one account | INFERRED | Criteria + ledger allocation screens |
| 18 | Statements | `Statements` | One statement per responsible party + a pre-run list | DOCUMENTED (statement), PARTIAL (Statement Report) | 2008, 2011, 2013, 2025 samples |

---

## 2. Cross-cutting facts

### 2.1 Report shell and rendering

| Fact | Detail | Source |
|---|---|---|
| Launch | `Reports` menu > category (`Daily Reports`, `Monthly Reports`, `Ledger Reports`, `Management Reports`, `Insurance Reports`, `Appointment Reports`, `Treatment Plan Reports`, `Referral Reports`, `Recall Reports`, `Ortho Reports`, `Statements`, `Lists >`, `Interactive Reports >`, `Office Reports >`, `Letters`, `Postcards`, `Labels`, `Custom Letter`, `Advanced Custom Letter`, `Custom Postcard`, `My Reports`, `Blank Insurance Forms`, `Pat Reg/Medical Info Forms`, `My Favorites`, `Search Report`, `Reports (Old) >`) | `[S]` 2023 menu screenshots `[V40]` `[V34]` |
| Criteria page | `SELECT REPORT` (radio list) + `REPORT CRITERIA` + `CLEAR CRITERIA`, `PRINT / PREVIEW`, `ADD TO MY FAVORITES`. URL pattern `.../ASPX/NewReports.aspx?RptName=Monthly%20Reports` (also `Ledger%20Reports`, `Management%20Reports`, `My%20Reports`) | `[S]` `[C]` |
| Output | A separate "Report Viewer" window showing a PDF. URL pattern `reports.denticon.com/ReportViewer/ReportFrame.aspx?rptPath=/PoWReports/<ReportName>&args=<PGID>;<OID>;...` — criteria are passed as a `;`-separated positional list | `[S]` `[V31]` `[V40]` |
| Viewer exports | Header strip `Export to:-` with an Excel (`X`) and a Word (`W`) icon, in addition to the PDF toolbar (download / print). Present even for reports that have no `PRINT FORMAT` section (Audit Trail, Walkout, Statement) | `[S]` `[V31]` `[V40]` `[V59]` |
| `PRINT FORMAT` = `Excel` | Downloads a spreadsheet instead of opening the viewer (file named e.g. `Denticon_DlySpecialTransactionRptXls`; the vendor describes an automatic download of a CSV / Excel file that opens in Protected View). Excel layouts are flat (one record per row, repeated key columns, title in a merged cell) and can contain columns the PDF does not (see Aging `Over 120+`) | `[D]` `[S]` `[V20]` `[V9]` |
| Internal report names seen | `LedWalkoutRPV1_New` (Walkout), `MagAuditTrail` (Audit Trail), `StatementRPV1_V1_withoutCC` and `StatementPrev_withoutCC` (Statement), `DlySpecialTransactionRptXls`. Prefix = category (`Led`, `Mag`, `Dly`) | `[S]` |
| Rendering engine | Looks like a report server rendering paginated reports (path + args) `[I]`; the vendor does not name it | — |
| Favourites | `ADD TO MY FAVORITES` saves the criteria; a favourite runs for the office it was saved in (earlier research `denticon_analytics_and_dso.md`) | — |
| Security rights | Separate rights per report category: `Reports - Daily Reports Screen Full Control`, `Reports - Monthly Reports Screen Full Control`, `Reports - Management Reports Screen Full Control`, `Reports - Ledger Reports Screen Full Control`, `Reports - Statements Screen Full Control` (each with a `View Only` variant that can view but not generate) | `[D]` `[V61]` `[V20]` |

### 2.2 Page furniture common to the PDF reports `[S]`

- Line 1: organisation name. Line 2: report title (larger). Then `Office : <office name or short id>` as a band
  or underlined label; multi-office runs repeat the report per office.
- Footer block echoing the criteria (`From`, `Thru`, `Office(s)`, `Providers`, report-specific flags such as
  `* Show AR.` or `* Includes accounts with Credit Balances.`), then a rule, the report title again,
  `Printed : <date time>`, `PlanetDDS (c) 2003 - <year>`, `Page : n of m`. Some builds add `By : <user>`.
- Money is printed with two decimals; the Executive Day Sheet uses `$` and parentheses for negatives, most
  other reports use a leading minus and no currency symbol.

### 2.3 Which office does a number belong to?

| Rule | Detail | Source |
|---|---|---|
| Transaction office (default) | Most reports count transactions **recorded in** the selected office(s). A $100 procedure charged at A and paid at B shows $100 owed at A and a $100 credit at B | `[D]` `[V5]` `[V7]` |
| Home office | `Aging Report by Home Office`, batch `Statements` and the Executive Summary new-patient counts follow the **home office** (of the responsible party for aging / statements; the preferred home office on the patient record for new patients) | `[D]` `[V5]` `[V52]` `[S]` `[V1]` |
| Allocation office | Income / allocation reports credit money to the office **where the procedure was charged**, regardless of where the payment was entered ("Allocation Office", "Production Office", "Collection Office" are distinct glossary terms) | `[D]` `[V14]` `[V21]` |
| Office vs Office Group | Every category offers `Office` / `Office Group`; in `Ledger Reports` the `Office Group` radio and the `SELECT` button are disabled in the vendor's own screenshots too, so the single-office lock is by design, not a side effect of our capture | `[S]` `[V40]` `[V45]` `[V47]` |

### 2.4 Which date does a number belong to?

| Report family | Date basis | Source |
|---|---|---|
| Production figures | Transaction date = date a procedure was posted as completed | `[D]` `[V21]` |
| Income Allocation / Allocation | **Created (entry) date** of the payment, not the (editable) transaction date. A payment entered Feb 1 and back-dated to Jan 15 appears in February | `[D]` `[V18]` `[V16]` |
| Aging | A single `Report Date` (as-of). Aging starts when a procedure is marked completed | `[D]` `[V8]` |
| Executive Summary A/R | "A/R as of" = end of the report range; matches Aging only when run for a single day | `[D]` `[V2]` |
| Statements | Itemise only transactions entered since the account's `Last Statement Date` | `[D]` `[V55]` |
| Super Bill (print-menu dialog) | Labelled `DOS Date Range` | `[S]` `[V46]` |

### 2.5 Signs and adjustment classes

- Payments are stored and printed **negative**; the vendor's field guide explains the minus sign as a
  reduction of the office's A/R `[S]` `[V1]`.
- Adjustment types have a `Sub Type` of `Production` or `Collection` (Setup > Payment/Adjustment Types).
  Production adjustments change charges and are reported **with production / in the Charges column**;
  collection adjustments change collections / income `[D]` `[V62]` `[V21]`.
- Adjustment and payment types also carry an **income flag** (`IsIncome = 1/0`); non-income items (the vendor's
  example: contract adjustments) are reported in the `Non Income` column of Income Allocation and never
  allocated `[D]` `[V15]` `[V14]`.
- The type lists are office-configurable; samples show names such as `ADJ OFF - Courtesy Discount`,
  `ADJ ON - Reinstate Balance`, `AUTO - Insurance Adjustment(P)`, `Balance Moved to Contract`,
  `Periodic Contract Billing`, `REFUND - Patient`, `REV PMT - Non-sufficient funds`, `TRANSFER - Payment From`,
  `PMT PAT-Cash`, `PMT INS - Check` `[S]` `[V3]` `[V4]`.

### 2.6 Aging buckets (two vendor definitions that differ by one day)

| Bucket label on reports | Glossary "Aging" `[V21]` | Article `[V8]` |
|---|---|---|
| `Current` | 0–30 days | 0–29 |
| `Over 30` | 31–59 | 30–59 |
| `Over 60` | 61–89 | 60–89 |
| `Over 90` | 91–119 | 90–119 |
| `Over 120` | more than 120 | 120+ |
| Excel-only `Over 120+` | adds 120 / 150 / 180 / 270 / 365-day buckets `[V9]` | |

The boundary days (30, 120) are inconsistent in the vendor's own material — fix the rule explicitly in our
implementation and document it.

### 2.7 Period locks that change what reports can show

| Function | Where | Effect | Source |
|---|---|---|---|
| `Update Statement Dates` | `Reports > Statements` | Inserts `Statement Sent - $X.XX` in the ledgers of responsible parties who received a statement, sets `Last Statement Date`, locks their data on or before that date | `[D]` `[V54]` `[V55]` |
| `Close Out` | `Setup > Close Out` (`New Closing Date`, `Close All Offices`) | Locks **all** accounts through the date; no ledger line; cannot be reversed; recommended at least monthly, dated the last day of the prior month | `[D]` `[V54]` `[V63]` `[V27]` |
| Both dates | Shown on the Statements screen as `Last Statement Date` and `Last Close Out Date` | | `[D]` `[S]` |

### 2.8 Menu history — why the names look the way they do

A 2020 vendor screenshot shows the **old** `Management Reports` list `[S]` `[V15]`: `Aging - Detail`,
`Aging - Summary`, `Aging by Provider - Detail`, `Aging by Provider - Summary`, `Aging by Home Office`,
`Aging by Home Office with Balance Status`, `Aging with Rem. Contract Bal.`,
`Aging with Rem. Contract Bal. by Home Office`, `Treatment Plan Analysis`, `Audit Trail Report`,
`Regular Payment Plan Charges Report`, `Collection by Code`, `Patient Receivables Aging Report by Home Office`,
`Production by Codes`, `Production by Codes - Provider`, `Production by Codes - Carrier`,
`Production by Provider`, `Production by Category - Detail`, `Production by Category - Summary`,
`Production Analysis by Category`, `Income Allocation - Detail`, `Income Allocation - Summary`,
`Allocation Report`, `Unallocated Payments/Adjustments Report`, `Uncollected Copay Report`.

| Old name (2020) | Current report + option `[I]` unless tagged |
|---|---|
| `Aging - Detail`, `Aging - Summary` | `Aging Report` + `REPORT FORMAT` |
| `Aging by Provider - Detail / Summary` | `Aging Report` + `GROUP BY PROVIDER` (vendor still writes "Aging Report – Detail (Select Provider(s))" `[D]` `[V5]`) |
| `Aging by Home Office` | `Aging Report by Home Office` |
| `Aging by Home Office with Balance Status` | + `Include Balance Status` (`[D]` `[V5]` "Aging by Home Office (Include Balance Status)") |
| `Aging with Rem. Contract Bal.` (+ `by Home Office`) | + `Include Contract Balances` (`[D]` `[V5]` "(Include Contract Balance)") |
| `Patient Receivables Aging Report by Home Office` | `Aging Report by Home Office` + `AGING BY` = `Patient AR` (`[D]` `[V5]` "Aging by Home Office – Patient A/R") |
| `Income Allocation - Detail / Summary` | `Income Allocation` + `REPORT FORMAT` |
| `Allocation Report` | `Allocation Detail` |
| `Unallocated Payments/Adjustments Report` | `Unallocated Payment/Adjustments` |
| `Regular Payment Plan Charges Report` | `Payment Plan Charges` (`PLAN TYPE` = `Regular`; `Ortho` added later) |
| `Uncollected Copay Report` | `Uncollected Copay` |
| `Audit Trail Report` | `Audit Trail` |

Consequences: older vendor articles and client SOPs still use the old names and the path
`Reports / Management Reports / ...` for reports that now live under `Monthly Reports`; `Uncollected Copay`
was at one point a per-client report under `Reports / Office Reports / <client> Reports` `[D]` `[V26]`.

### 2.9 Vendor-recommended cadence (who runs what, when)

| Report | Role | Frequency | Recommended parameters | Source |
|---|---|---|---|---|
| `Executive Summary` | Management / C-level | Daily (end of day) and month end; year end | Date range; `SELECT` > `Select All` offices | `[D]` `[V25]` `[V27]` `[V28]` |
| `Aging Report - Detail` | Front office; management | Daily / weekly / monthly | `Detail`; balance threshold; **`Include Balance Status`** | `[D]` `[V25]` |
| `Aging Report - Summary` | Management | Daily / weekly / monthly | `Include Credit Balance`, so that the total is the real A/R | `[D]` `[V25]` |
| `Aging by Home Office` | Multi-location | Month end, year end (single-location: `Aging-Detail`) | | `[D]` `[V27]` `[V28]` |
| `Income Allocation - Summary` | Management (provider pay) | Monthly / per pay period | Pay period as date range; pay on `Income` × compensation % | `[D]` `[V25]` `[V14]` |
| `Unallocated Payments/Adjustments Report` | Management, billing staff | Daily / weekly / monthly | Date range; optionally exclude credit balances | `[D]` `[V25]` |
| `Waterfall Report` | Management / C-level | Quarterly and yearly | Office(s); date range of at least a quarter | `[D]` `[V25]` |
| `Uncollected Co-Pay Report` | Management | Daily (end of day) | | `[D]` `[V25]` |
| `Statements` | Billing | Monthly, followed by `Update Statement Dates` | | `[D]` `[V27]` `[V48]` |
| `Walkout Report` | Front desk | At check-out, per patient | | `[D]` `[V41]` |
| `Time Clock Report` | Manager / payroll | Per pay period `[I]` | | `[V34]` |
| `Audit Trail` | Owner, office manager, auditor | As needed (fraud / error review) | | `[D]` `[V32]` |

---

## 3. Monthly Reports (`montly_reports`)

### Executive Summary

**Confidence: DOCUMENTED** (base layout and every metric definition); `Group By Provider` / `Page Break`
output is INFERRED.

**Purpose.** One-page management KPI summary per location: patient counts, appointments, production,
collection, adjustments, provider-type split, averages, referral sources, MTD / YTD ledger totals and
(optionally) the A/R ageing snapshot `[D]` `[V1]` `[V25]`.

**Used by / when.** Owner, regional manager, C-level. Daily at end of day, at month end and for year-end
information `[D]` `[V25]` `[V27]` `[V28]`. Daily variants exist under `Daily Reports` (`Executive Summary`,
`Executive Summary by Provider`) `[D]` `[V26]`.

**Output layout** — header: organisation name, `Executive Summary`, band `Office : <office>`. Three-column
body: label, bold figure, sub-figure column. Vendor definitions are from the annotated field guide `[S]` `[V1]`;
labels from the 2025 sample `[S]` `[V2]`; sample values are the vendor's.

| Line (exact label) | Vendor definition | Sample | Suggested key (ours) |
|---|---|---|---|
| `New Patients :` | Patients **added into the system** (created date) in the range; attributed by the patient's preferred home office | 2 | `new_patients_created` |
| `New Patients by First Visit Date :` | Patients whose **first visit** falls in the range; same office rule | 2 | `new_patients_first_visit` |
| `Patients Seen :` | Patients with a procedure in the ledger whose Procedure Code Setup has `Ledger Code` = yes **and** `Visit Code` = yes | 24 | `patients_seen` |
| `Avg Patients Seen Per Day :` | `Patients Seen` ÷ office working days (days with a procedure in the ledger in the range) | 24 | `avg_patients_seen_per_day` |
| `Patient Visits :` | Patient-day visits; equals `Patients Seen` for a single date, higher for a range when a patient comes more than once | 24 | `patient_visits` |
| `Total Procedures Done :` | Procedures in the ledger with `Ledger Code` = yes (`Visit Code` not considered) | 54 | `procedures_done` |
| `Total Chair Hours :` | Total appointment duration (appointment length) where the appointment has a completed transaction; missed and cancelled excluded | 1,060.00 | `chair_time` |
| `Missed Appointments :` | Appointments in the range marked missed | 2 | `missed_appointments` |
| `Cancelled Appointments :` | Appointments in the range marked cancelled | 12 | `cancelled_appointments` |
| `Production :` | Ledger items in the range, net of all production adjustments (visit-code procedures) | 3,768.90 | `production_net` |
| `  Patient :` | Estimated patient portion = Production − Insurance | 1,817.68 | `production_est_patient` |
| `  Insurance :` | Estimated insurance portion = Production − Patient | 1,951.22 | `production_est_insurance` |
| `Non visit code transactions :` | Ledger items where `Ledger Code` = yes and `Visit Code` = no | 3.61 | `production_non_visit` |
| `Total :` | Production + non visit code transactions | 3,772.51 | `production_total` |
| `Collection :` | Payments in the range = patient + insurance; negative = A/R reduced | -853.93 | `collection_total` |
| `  Patient :` | Ledger items where ledger type = `P` | -853.93 | `collection_patient` |
| `  Insurance :` | Ledger items where ledger type = `I` | 0.00 | `collection_insurance` |
| `Adjustments :` `(Collection)` | Total collection adjustments | 35.86 | `collection_adjustments` |
| `Dentist Production :` | Production transactions attributed to a dentist provider | 3,239.23 | `production_dentist` |
| `  Non visit code transactions :` | Non-visit production attributed to a dentist | 0.00 | |
| `Hygienist Production :` | Production attributed to a hygienist provider | 529.67 | `production_hygienist` |
| `  Non visit code transactions :` | Non-visit production attributed to a hygienist | 3.61 | |
| `Total :` | Dentist + hygienist (incl. non-visit) | 3,772.51 | |
| `Average Production Per Patients Seen :` | Production ÷ Patients Seen | 157.04 | |
| `Average Production Per Chair Hours :` | Production ÷ Chair Hours | 3.56 | |
| `Average Production Per Procedures Done :` | Production ÷ Procedures Done | 69.79 | |
| `Average Production Per Patient Visits :` | Production ÷ Patient Visits | 157.04 | |

Further blocks:

| Block | Layout | Definition | Source |
|---|---|---|---|
| `Referrals :` | Table: referral source name · `New Patients` · `Production`; `Total :` row | New Patients = first visit date in range. Production = ledger items with ledger type = Charge plus production adjustments; **does not consider the Visit Code flag**. Total = sum of listed referrals. Present in the vendor guide, absent from the 2025 sample (which had no new patients) — probably printed only when referral data exists `[I]` | `[S]` `[V1]` |
| MTD / YTD | Table with columns `MTD`, `YTD`; rows `Charges`, `Non-Visit code Transactions` (2025: `Non-Visitcode Transactions`), `Payments`, `Adjustments` (2025: `Adjs`) | MTD = first of the month through the end of the report range; YTD = Jan 1 through the end of the report range. Charges = Ledger Code yes + Visit Code yes, plus all production adjustments; Payments = ledger type Payment (patient + insurance); Adjustments = collection adjustments | `[S]` `[V1]` `[V2]` |
| `A/R as of : <date>` | One row: `Current` · `Over30` · `Over60` · `Over90` · `Over120` · `Total A/R`; then `Estimated Insurance :` and `Estimated Patient :` (totals only) | Printed only when `Show AR` is ticked | `[S]` `[D]` `[V2]` |
| Footer | `From:`, `Thru:`, `Offices: <ids>`, `Providers : ALL`, `* Show AR.` | | `[S]` `[V2]` |

**Criteria → output.**

| Criterion `[C]` | Effect | Source |
|---|---|---|
| `Office` / `Office Group` + `SELECT` | One KPI block per selected office (the vendor pitches it as a single report holding the KPIs of every location); figures reflect activity **within the named location**. Whether a consolidated all-offices block is appended is `[unverified]` | `[D]` `[V1]` `[V25]` |
| `Provider` | Limits the figures to selected providers; footer shows `Providers : ALL` by default | `[S]` |
| `Start Date` / `End Date` | Range for the counts and money; MTD / YTD are derived from the **end** date | `[S]` `[V1]` |
| `Show AR` (default off) | Adds the `A/R as of` block and the footer flag `* Show AR.` | `[D]` `[V2]` |
| `GROUP BY` = `None` / `Provider` | `None` = office totals; `Provider` = the values per provider `[T]` `[T1]`. Layout per provider `[I]`: the KPI block repeated under a provider header | `[T]` |
| `Page Break` (enabled only with `Provider`) | Each provider starts on a new page `[I]` | `[C]` |

**Quirks.**
- `Show AR` is off and the Aging Report's `Include Credit Balance` is off by default, so the two A/R totals
  disagree out of the box. They match only with both ticked **and** the Executive Summary run for a single day
  equal to the Aging `Report Date` `[D]` `[V2]`.
- Three different "new patient" notions coexist (created date, first visit date, referral block by first
  visit) `[S]` `[V1]`.
- `Total Chair Hours` in the vendor's demo is 1,060.00 for 24 visits and `Average Production Per Chair Hours`
  is 3.56 = 3,768.90 ÷ 1,060 — the figure behaves like **minutes**, not hours `[I]`; unit `[unverified]`.
- The vendor guide's own text for the `Insurance` line says "Total Estimated Patient portion" (copy error).
- Patients Seen ignores missed / cancelled appointments `[unverified]` (seen only as a search snippet).
- Third-party mapping: an analytics vendor reconciles its "Patient Visits" to `Patient Visits` and its "New
  Patient Visits" to `New Patients by First Visit Date` `[T]` `[T1]`.

**Sources.** `[V1]` `[V2]` `[V25]` `[V26]` `[V27]` `[V28]` `[T1]`.

---

### Executive Day Sheet

**Confidence: DOCUMENTED** (columns and row structure from two samples); closing totals row `[unverified]`.

**Purpose.** A type-by-type day sheet: for the date range it lists the money for **services**, **every
production adjustment type**, **every collection adjustment type** and **every payment type**, with the effect
on A/R. The vendor recommends it to see which adjustment codes were used (and for how much) and how much
sales tax was charged `[D]` `[V3]` `[V4]`. It is the modern form of the peg-board day sheet, which the glossary
describes as the paper-era daily journal of every transaction `[D]` `[V21]`.

**Used by / when.** Office manager, bookkeeper, owner; daily or for any range (month-end adjustment review)
`[I]`.

**Output layout** `[S]` `[V3]` `[V4]` — header: organisation name, `Executive Day Sheet` (the 2020 build printed
`Day Sheet` in the footer), `Office : <office name>`.

| Column | Content |
|---|---|
| `Type` | Row label: `Services`, then each adjustment / payment type name (right-aligned) |
| `Production` | Amount for `Services` and for production-class adjustment types; `--` otherwise |
| `Collections` | Amount for payment types; `--` otherwise |
| `Adjustments` | Amount for collection-class adjustment types; `--` otherwise |
| `A. R. Impact` | Signed effect of the row on receivables (sample: `Services` $56,144.66 → $56,144.66; `$Test Production Adj` ($75.00) → ($75.00); `FEE - Finance Charge (Account)` $608.21 → $608.21; `Sales Tax` $0.80 → $0.80) |

Row order in the samples: (1) `Services`; (2) production adjustment types (`ADJ OFF - Admin Adjustment`,
`ADJ OFF - Bankruptcy`, `ADJ OFF - Courtesy Discount`, `ADJ ON - Capitation Adjustment`,
`AUTO - Insurance Adjustment(P)`, `Decrease Production`, `Employee Discount`, `Family Discount`,
`FEE - Finance Charge (Account)`, `FEE - Late Charge`, ...); (3) collection adjustment types
(`AUTO - Xfer Ins Amt To Patient`, `Balance Moved to Contract`, `Cancel Contract (+)`, `Cancel Contract (-)`,
`Care Credit Fee`, `Contract DownPayment`, `Credit Adjustment`, `Debit Adjustment`, `FEE - NSF Bank Fee`,
`Periodic Contract Billing`, `Previous Balance`, `Previous Balance, Credit`, `REFUND - Insurance`,
`REFUND - Patient`, `REV PMT - Non-sufficient funds`, `Sales Tax`, `Trade Of Service-collection`,
`TRANSFER - Payment From`, `TRANSFER - Payment to`); (4) payment types (`PMT PAT-Cash`, `PMT PAT-Check`,
`PMT PAT-E Check`, `PMT-AUTO-Master Card/Visa`, `PMT INS - Check`, `PMT INS - Capitation Check`,
`PMT INS - Check To Prev Bal`, `Check To Previous Balance`, ...).

**Grouping / totals.** One section per office. **Every configured type is printed even at $0.00**, which is
why a single-office sample runs to 5 pages. A grand-total row is likely on the last page but is not visible in
the two published pages `[unverified]`.

**Criteria → output.** `PRINT FORMAT` `PDF` / `Excel`; `Office` / `Office Group`; `Start Date` / `End Date`
(footer `From`, `Thru`, `Office`). No provider filter `[C]`.

**Quirks.** Type names are tenant data (the demo has `$Test Production Adj`, `Dental Of MI`, `Do Not Use`).
`Sales Tax` and contract movements appear as collection adjustments; finance and late fees as production-class
rows. Zero rows are not suppressed.

**Sources.** `[V3]` `[V4]` `[V21]`.

---

### Aging Report by Home Office

**Confidence: DOCUMENTED** for `Detail` (PDF and Excel); `Summary` and `GROUP BY PROVIDER` layouts are
PARTIALLY DOCUMENTED.

**Purpose.** Accounts receivable by **responsible party**, split into estimated insurance and estimated
patient portions and aged into buckets, for the responsible parties whose **home office** is the selected
office — **all** of their transactions are considered wherever they were recorded. The vendor's recommended
aging report for multi-location organisations because it avoids false balances and credits `[D]` `[V5]` `[V7]`
`[V8]`.

**Used by / when.** Front office and billing for collection calls (daily / weekly); management for the A/R
snapshot; month end and year end; also the reference when a statement is missing (compare the balance on
`Aging` and `Aging by Home Office` with the ledger) `[D]` `[V25]` `[V27]` `[V51]`.

**Output layout — `Detail`, PDF** `[S]` `[V8]` `[V2]`. Title `Aging by Home Office` (2019 build) /
`Aging Report by Home Office - Detail` (Excel title, 2023).

| Column (as printed) | Content | Suggested key (ours) |
|---|---|---|
| `Resp Party` > `ID`, `Name` | Responsible party (account) id and "Last, First" | `responsible_party_id`, `responsible_party_name` |
| `Type` | Responsible Party Type code (demo values `CA`, `IN`, `AA`, `OO`; meaning is tenant-defined `[unverified]`) | `responsible_party_type` |
| `Lst Pay Date` / `Lst Pay Amount` (2025: one stacked column `Lst Pay Dt/ Amt.`) | Last payment date and amount | `last_payment_date`, `last_payment_amount` |
| `Lst Stmt Date` | Last statement date (set by `Update Statement Dates`) | `last_statement_date` |
| (unlabelled) | Row tag: blank = total, `Ins:` = estimated insurance, `Pat:` = estimated patient | `portion` |
| `Current`, `Over 30`, `Over 60`, `Over 90`, `Over 120` | Balance per bucket | `bucket_current` ... `bucket_over_120` |
| `Total Bal.` | Row total | `total_balance` |

Each responsible party is a **three-line block** separated by a dashed rule: line 1 = identity + account
totals; line 2 = phones (`(H):`, `(C):`) and the `Ins:` amounts; line 3 = the `Pat:` amounts. In the 2025
build line 2 starts with `Type : <code>` and the last-payment amount, and line 3 with the phone.

**Totals** (last page) `[S]` `[V2]`: `Total Accounts with A/R : <n>`, then `Total :`, `Ins:` and `Pat:` rows
across all buckets.

**Footer** `[S]`: `Report Date`, `Start Name` / `End Name` (2019: `Frm Name` / `To Name`), `Patient Type`,
`Offices`, `Provider : N/A` (when not grouped), `Ex Resp Party Type : NONE`, `Aging : Current Over30 Over60
Over90 Over120` (2019 wording: `Accounts with Bal :`), `Account Balance Over : 0.00`, and
`* Includes accounts with Credit Balances.` when that option is on.

**Output layout — `Detail`, Excel** `[S]` `[V9]`: flat sheet, first column `Office`, then for each bucket a
triple `<bucket>`, `<bucket> Est. Ins`, `<bucket> Est. Pat`. With the Excel-only `Over 120+` option the sheet
carries `Over 120`, `Over 150`, `Over 180`, `Over 270`, `Over 365` triples.

**Output layout — `Summary`.** The vendor describes it as the organisation-level A/R snapshot: outstanding
patient and insurance balances for each selected office `[D]` `[V25]`. Layout `[I]`: one total block (total /
`Ins:` / `Pat:` by bucket) per office, without responsible-party lines.

**Criteria → output.**

| Criterion `[C]` | Effect on output | Source |
|---|---|---|
| `REPORT FORMAT` `Detail` / `Summary` | Per-account blocks vs office totals | `[D]` `[V25]` |
| `PRINT FORMAT` `PDF` / `Excel` | Excel = flat sheet; Excel also reveals the `Over 120+` checkbox (with an info icon) in place of `Over 120` | `[S]` `[D]` `[V9]` |
| `Office` / `Office Group` | Home offices whose responsible parties are listed | `[D]` `[V5]` |
| `GROUP BY PROVIDER` + `Preferred Provider` / `Transaction Provider` + `Provider` picker | Groups / subtotals the balances by provider — by the patient's preferred provider or by the provider on the transactions `[I]`; old menu had `Aging by Provider - Detail / Summary`. Footer `Provider : N/A` when off | `[S]` `[V15]` |
| `Report Date` | As-of date of the ageing | `[S]` |
| `PATIENT TYPE` `Both` / `General` / `Ortho` | Restricts to general or ortho patients; echoed in the footer | `[S]` |
| `RESPONSIBLE PARTY NAME RANGE` (`AAAAA`–`ZZZZZ`) | Alphabetical range on responsible-party last name | `[S]` `[V51]` |
| `EXCLUDE RESP. PARTY TYPE` | Drops accounts of the selected types; echoed as `Ex Resp Party Type` | `[S]` |
| `AGING BY` `Account AR` | Threshold label `Account Balance Over`; counts insurance + patient balances on the account; can include balances that belong to another office (e.g. a dependent whose home office differs) | `[D]` `[V6]` |
| `AGING BY` `Patient AR` | Threshold label becomes `Patient Balance Over`; only patient balances for this office; accounts with only an estimated insurance balance do not appear | `[D]` `[V6]` |
| Bucket checkboxes `Current` ... `Over 120` | Select accounts that have a balance in the ticked buckets (2019 footer wording `Accounts with Bal :`) | `[S]` `[V8]` |
| `Include Credit Balance` | Includes accounts whose total is negative; without it credits are left out and the grand total is higher than the "true AR" | `[D]` `[V2]` `[V25]` |
| `SHOW ONLY CREDIT BALANCES` | Lists only accounts with a negative total (the vendor's way to find credit balances) | `[D]` `[V11]` |
| `Exclude patients sent to collection.` | Drops accounts flagged "Sent to Collection" | `[C]` |
| `Exclude accounts where patient portion is paid & insurance portion is expected.` | Drops accounts whose remaining balance is expected entirely from insurance | `[C]` `[V51]` |
| `Include Balance Status` | Prints the account's **Balance Status** (a tenant-defined collections-stage note: 10-character code + description, set with the Ledger's `Balance Stat` button; setup in `Setup > Misc Setups > Balance Status`). Exact position on the page `[unverified]` | `[D]` `[V13]` `[V25]` |
| `Include Contract Balances` | Adds remaining payment-contract balances (regular / ortho contracts keep balances **off** the ledger until periodic charges post). Columns `[I]`: `Reg Cont. Bal.` / `Ort Cont. Bal.` as on the Walkout Report | `[D]` `[V5]` `[V24]` |
| `SORT BY` `Resp. Party Last name` / `Resp. Party ID` | Order of accounts. This row is clipped in our own screenshots; the vendor's full screenshots confirm both labels and that `SORT BY` is the **last** section | `[S]` `[V13]` `[V9]` |

**Quirks.**
- Only responsible parties appear; responsible-party ids differ from patient ids `[D]` `[V8]`.
- The estimated-insurance figures are **not** meant to match the `Outstanding Claims` report (which omits
  secondary insurance and claims not yet created) `[D]` `[V12]`.
- Contract adjustments are placeholders in the ledger's ageing detail and do not allocate until the contract
  posts `[D]` `[V23]`.
- A third-party reconciliation guide runs this family in three credit modes: include credits, exclude credits,
  credits only `[T]` `[T1]`.

**Sources.** `[V2]` `[V5]` `[V6]` `[V7]` `[V8]` `[V9]` `[V11]` `[V12]` `[V13]` `[V15]` `[V25]`.

---

### Aging Report

**Confidence: DOCUMENTED** for `Detail`; same caveats as above for `Summary` and provider grouping.

**Purpose.** The single-location ageing: the same responsible-party / insurance / patient / bucket layout, but
it evaluates **only the transactions recorded in the selected office(s)**. Recommended by the vendor for
single-location practices; explicitly **not recommended** for multi-location organisations `[D]` `[V5]` `[V27]`.

**Output layout.** Identical to `Aging Report by Home Office` — columns `Resp Party` (`ID`, `Name`), `Type`,
`Lst Pay Dt/ Amt.`, `Lst Stmt Date`, row tag (`Ins:` / `Pat:`), `Current`, `Over 30`, `Over 60`, `Over 90`,
`Over 120`, `Total Bal.`; three-line block per responsible party; `Total Accounts with A/R : n` and
`Total :` / `Ins:` / `Pat:` grand totals; footer with the criteria echo. Printed titles seen: `Aging Detail`
(2019), `Aging Report - Detail` (2025) `[S]` `[V8]` `[V2]`.

**Criteria.** Pixel-identical criteria panel to the home-office report `[C]`; every option behaves as in the
table above.

**Differences from the home-office variant.**

| Topic | `Aging Report` | `Aging Report by Home Office` |
|---|---|---|
| Transactions considered | Only those recorded at the selected office | All transactions of the account, any office |
| Account listed under | Each office where it has a non-zero office balance | The responsible party's home office only |
| Worked example (vendor) | $100 charge at A, $100 payment at B: A shows $100 due, B shows a $100 credit (with `Include Credit Balances`) although the ledger is $0 | Account does not appear ($0) |
| Sum across all offices | Equals organisation A/R only if credit balances are included | Equals organisation A/R |

**Quirks.** Accounts with a $0 ledger balance legitimately appear here in multi-location organisations
`[D]` `[V7]`. Default run excludes credit balances; see the Executive Summary reconciliation rule `[D]` `[V2]`.
`Account AR` can pull balances of dependants belonging to another office `[D]` `[V6]`.

**Sources.** `[V2]` `[V5]` `[V6]` `[V7]` `[V8]` `[V10]` `[V27]` `[V28]`.

---

### Income Allocation

**Confidence: DOCUMENTED** (`Summary`, including formulas); **PARTIALLY DOCUMENTED** (`Detail`).

**Purpose.** A provider-level receivable roll-forward that shows how much **collected money was allocated to
each provider's completed work** in the period. It is the vendor's prescribed basis for collection-based
provider pay: the provider is paid on the `Income` column, the right-most column `[D]` `[V14]` `[V15]` `[V17]`.
The vendor's own framing is a per-provider A/R summary.

**Used by / when.** Owner, payroll, regional finance. Monthly or per pay period; run **for each location where
the provider treated**, and for all offices when providers work across offices of one account `[D]` `[V14]`
`[V16]` `[V25]`.

**Output layout — `Summary`** `[S]` `[V14]` `[V15]`. Title `Income Allocation Report - Summary`;
`Office : <name>`; one row per provider (zero rows included), then an `Unallocated` row and a `Total :` row;
footer `From`, `Thru`, `Providers : ALL`.

| Column (2026 build) | Vendor definition (2022 PDF) | Suggested key (ours) |
|---|---|---|
| `Prov ID` | Provider id | `provider_code` |
| `Last, First Name` | Provider name | `provider_name` |
| `Beginning Balance` | Provider beginning balance (production charged, not yet collected) | `beginning_balance` |
| `Charges (+)` | Production within the date range | `charges` |
| `Production Adjust (+)` | Production adjustments > 0 with `IsIncome = 1` | `production_adjust_pos` |
| `Production Adjust (-)` | Production adjustments < 0 with `IsIncome = 1` | `production_adjust_neg` |
| `Payments (-)` | Payments within the date range (patient and insurance) | `payments` |
| `Prev Alloc (-)` | Amount allocated to charges and adjustments **before the From date** (ignores production adjustments) — i.e. money that was unallocated earlier and got allocated now | `prev_allocation` |
| `Prev Alloc Prod Adj (-)` | Amount allocated to previous production adjustments | `prev_allocation_prod_adj` |
| `Income Adj (-)` | Collection adjustments < 0 with `IsIncome = 1` | `income_adjust_neg` |
| `Prev Alloc Income Adj (-)` | Not in the 2012 layout or the vendor's definitions; by analogy, collection adjustments allocated to earlier-period charges `[I]` | `prev_allocation_income_adj` |
| `Income Adj (+)` | Collection adjustments > 0 with `IsIncome = 1` | `income_adjust_pos` |
| `Ending Balance` | Provider balance as of the To date | `ending_balance` |
| `Non Income` | All non-income transactions (`IsIncome = 0`), independent of allocation (such items are never allocated) | `non_income` |
| `Income` | Provider income — the pay base | `income` |
| `Unallocated` row | All unallocated amounts (prepayments / credits not yet applied to completed work) | |

Formulas:

```text
Vendor (2022 PDF):
  End Bal = Beg Bal + Charges + Positive Prod Adj - Negative Prod Adj - Payment
            - Prev Allocation - Prev Allocation Prod Adj - Negative Coll Adj + Positive Coll Adj
  Income  = Payment + Prev Allocation + Negative Coll Adj - Positive Coll Adj

Checked by us against the published samples:
  2012 sample, provider 00HJ: 19,862.88 + 1,503.00 - 1,465.00 - 72.00 + 207.00 = 20,035.88   (matches)
                              Income = 1,465.00 + 72.00 - 207.00 = 1,330.00                    (matches)
  2026 sample, provider CSDMD (new column present):
    Income = 9,222.25 + 0.00 + 1,848.34 + 89.00 - 5,956.05 = 5,203.54                          (matches)
      -> Income now also adds "Prev Alloc Income Adj (-)"
    Ending = 250,788.56 + 34,772.40 - 9,222.25 - 51.50 - 1,848.34 - 89.00 + 5,956.05 + (-1,277.70)
           = 279,028.22                                                                         (matches)
      -> Ending Balance also adds the signed "Non Income" column (not in the vendor formula)
```

**Output layout — `Detail`.** Old name `Income Allocation - Detail`. The vendor uses it to find payments that were made
outside the date range yet allocated inside it, and back-dated payments, and tells staff to read the
**`Pay Date`, `Allo Date` (allocation date) and `Proc Date`** of each line `[D]` `[V16]` `[V20]`. Layout `[I]`:
grouped by provider; one line per allocation = payment or collection adjustment (payer / patient, code,
amount) against a procedure (patient, code, procedure date) with the three dates and the allocated amount;
provider subtotals reconciling to the Summary row.

**Criteria → output.** `REPORT FORMAT` `Detail` / `Summary`; `Office` / `Office Group` (defaults to the
logged-in office; multiple offices or a group allowed); `Provider` (default all); `Start Date` / `End Date`
`[C]` `[D]` `[V17]`. No `PRINT FORMAT` section — export through the viewer.

**Quirks (important for our design).**
- **By created date**: back-dated payments land in the period they were entered `[D]` `[V18]`.
- **By production office**: allocation follows the office where the procedure was charged, not where the
  money was taken `[D]` `[V14]`.
- **Live report**: reallocations (`Patient > Reallocate Account`), adjustments and late entries change totals
  after a run; a pay run is not reproducible unless frozen `[D]` `[V16]`.
- **Not reconcilable** with production reports (which show only posted treatment) or with payment / collection reports
  (today's deposit may pay an older procedure); a prepayment is collection but not allocation until a
  procedure posts `[D]` `[V19]` `[V21]`.
- The "production" inside this report may be the production that payments were allocated to, not the
  production rendered `[D]` `[V19]`.
- Insurance payments are not FIFO (they apply to their claim line); patient payments go FIFO to the oldest
  item with an unallocated patient portion unless a line is chosen `[D]` `[V21]`.

**Sources.** `[V14]` `[V15]` `[V16]` `[V17]` `[V18]` `[V19]` `[V20]` `[V21]` `[V25]`.

---

### Allocation Detail

**Confidence: PARTIALLY DOCUMENTED** (existence and meaning); **layout INFERRED**.

**What the vendor says.**
- Glossary, "Collection vs Allocation": collections are payments reported as deposits; allocation is the part
  of a collection (or collection adjustment) applied to production with a value above $0. A prepayment shows a
  value on the collection report but nothing on the **allocation detail report** `[D]` `[V21]`.
- The "Allocation report" shows the payments received together with what they paid for: money collected **and
  entered** in the date range that applies to completed procedures with payment due; an overpayment does not
  appear until it pays a completed procedure; its collection numbers cannot be matched to a collection report
  `[D]` `[V19]`.
- Old menu name: `Allocation Report` `[S]` `[V15]`.

**Criteria** `[C]`: `Office` / `Office Group`; `Provider`; `Start Date` / `End Date`; `PAYMENT TYPES` checkboxes
`Cash`, `Check`, `Credit Card`, `CareCredit`, `Direct Deposit`, `Internal Financing` (all on) — the same tender
classes as the daily `Deposit Slip` `[D]` `[V25]` `[T]` `[T1]`; `Show Datewise Summary` (on).

**Inferred output `[I]`.**

| Element | Inference | Basis |
|---|---|---|
| Line | One row per allocation: payment date, patient / responsible party, payment type and code (check number), payment amount → procedure date, patient, code, tooth, **allocation provider**, allocated amount | Vendor description (payments plus what they paid for) `[V19]`; ledger `Payment Allocation` pop-up reachable from the `Amount` / `Provider` cell `[V22]` `[V23]` |
| Grouping | By provider (filter exists) and / or by payment type (filter exists), within office | Criteria |
| `Show Datewise Summary` | A closing section with one line per date (allocated amount by payment type and total) | Option label |
| Totals | Per provider / payment type, per office, grand total; should equal `Income` components of Income Allocation for the same office, providers and dates | Shared allocation basis |
| Excludes | Unallocated prepayments (those are on `Unallocated Payment/Adjustments`) | `[D]` `[V21]` |

**Comparable reports.** Open Dental `Daily Payments` — payments grouped by payment type with per-provider
splits and subtotals per type; columns `Date`, `Paying Patient`, `Provider`, `Clinic`, `Check#`, `Amount`
`[C2]`. Carestream SoftDent "Payment Allocation Report" `[unverified]` (found by title only).

**Sources.** `[V15]` `[V19]` `[V21]` `[V22]` `[V23]` `[C2]`.

---

### Unallocated Payment/Adjustments

**Confidence: PARTIALLY DOCUMENTED** (purpose and parameters); **layout INFERRED**.

**What the vendor says.** The report lists every unallocated payment and adjustment in a date range so that
staff can make the corrections needed to balance patient ledgers. Parameters: date range; credit balances can
be excluded. Run daily, weekly, monthly `[D]` `[V25]`.

**Concepts behind it** `[D]` `[V21]` `[V22]`.
- Unallocated = collected money (or a credit adjustment) with **no procedure or adjustment to apply against**
  — pre-collected money, deposits, overpayments. It "resides" with the office that entered it until a
  completed procedure absorbs it, possibly in another period or office.
- On screen such a payment shows `Unallocated` in the `Provider` column; a partially allocated payment shows
  `***` (or the single provider's name).
- Fixes: wait for the procedure to post, add a `TRANSFER - Payment To` adjustment under the right provider, or
  `Patient > Reallocate Account` (available only when balances disagree) `[V24]`.

**Criteria → output** `[C]`.

| Criterion | Effect `[I]` |
|---|---|
| `Print all unallocated payment/adjustments as of today` | Ignores the date range: every currently unallocated item (as-of snapshot) |
| `Start Date` / `End Date` | Items entered in the range that are (still) unallocated |
| `Exclude Credit Balances` | Drops accounts whose total balance is a credit — leaves the items that are unallocated although the account still **owes** money, i.e. the ones that are posting errors and need a manual fix |
| `Include Inactive Patients` | Adds inactive patients (excluded by default) |
| `Office` / `Office Group` | Office that entered / holds the money |

**Inferred output `[I]`.** One line per unallocated payment or credit adjustment: date entered, responsible
party and patient (id, name), code / description (payment or adjustment type), transaction provider, office,
original amount, **unallocated amount**, account balance; subtotals per responsible party; office and grand
totals. The grand total should tie to the `Unallocated` row of `Income Allocation - Summary` for an as-of run.

**Comparable reports.** Open Dental `Unearned Accounts` (columns `Guarantor`, `Type`, `Clinic`, `Amount`) and
`Line Item Unearned Income` (columns `Date`, `Patient`, `Type`, `Clinic`, `Prov`, `Amount`) `[C3]`; Dentrix
Provider Credit Balances (see `compliance_and_financial_semantics.md`).

**Sources.** `[V21]` `[V22]` `[V24]` `[V25]` `[C3]`.

---

### Daily Journal Summary by Allocation

**Confidence: INFERRED.** No vendor article, PDF or image describing this report was found (Help Center
search for the exact name returns 0 results).

**Known anchors.**
- `Daily Journal-Summary` (Daily Reports) gives, for a date range and an office or office group, the
  transactions entered with their ledger description and the totals of charges, payments and adjustments;
  `Daily Journal-Detail`
  adds patient, provider, the entering user, tooth / surface and UCR fees; production adjustments print in the
  `Charges` column as + / −, collection adjustments in `Adjustments` `[D]` `[V62]`.
- The Daily Journal attributes a payment to the office and provider it was **entered** under; allocation
  reports attribute it to the office / provider whose work it paid `[D]` `[V14]` `[V21]`.

**Criteria** `[C]`: `REPORT FORMAT` `Detail` / `Summary`; `PRINT FORMAT` `PDF` / `Excel`; `Office` /
`Office Group`; `Start Date` / `End Date`. No provider filter, no transaction-type filter.

**Inferred output `[I]`.**

| Element | Inference |
|---|---|
| Summary | Per office (and allocation provider), one row per transaction description / code with totals in `Charges`, `Payments`, `Adjustments` — where payments and collection adjustments are counted by **allocation** (allocation office / provider / date) instead of by entry; an `Unallocated` line for money not yet applied |
| Detail | The same, broken out per transaction line (date, patient, code, description, provider, amounts) |
| Totals | Per provider and office; grand totals. Charges should equal the Daily Journal; payments should equal Daily Journal payments minus newly unallocated plus previously unallocated now applied |
| Use | Month-end bridge between the Daily Journal (deposit view) and Income Allocation (provider-pay view) |

**Comparable reports.** Open Dental `Production and Income` (income by provider according to payment splits);
Dentrix `Day Sheet` with provider credit allocation (see `compliance_and_financial_semantics.md`). Treat
every element above as a hypothesis to verify on the live legacy tool.

**Sources.** `[V62]` `[V14]` `[V21]`.

---

### WaterFall Report

**Confidence: PARTIALLY DOCUMENTED** (purpose, cadence, parameters); **layout INFERRED**.

**What the vendor says.** Its purpose is to predict collection rates from how earlier months were collected
and to support cash-on-hand analysis; it breaks collections down by the **month of the date of service**
(`Service Date`) for the chosen range. Parameters: pick the office(s) and use a range of at least one quarter.
Run quarterly and yearly; audience management / C-level `[D]` `[V25]`.

**Criteria** `[C]`: `PRINT FORMAT` `PDF` / `Excel`; `Office` / `Office Group`; `Start Date` / `End Date`;
`OTHER OPTIONS` radio `Payments and Adjustments` / `Payments only` / `Adjustments only`.

**Inferred output `[I]`.**

| Element | Inference | Basis |
|---|---|---|
| Rows | One per **month of service** (date-of-service month of the production) in the range, with that month's production | Vendor wording: collections by date-of-service month |
| Columns | The months (or lag buckets: same month, +1, +2, ...) in which payments and / or adjustments were applied to that month's production — a triangular "waterfall" matrix | Generic waterfall / cash-flow report design; name |
| Measures | Amount collected per cell; cumulative % of the service month's production collected; remaining balance | Stated use: predict collection rates, cash on hand |
| Radio | Cells contain payments + adjustments, payments only, or adjustments only | Criteria |
| Totals | Column totals (cash received per month, by service-month origin), row totals, grand total; per office | |
| Depends on | Allocation of payments to procedures (the same engine as Income Allocation) | `[V21]` |

**Comparable reports.** DrChrono `Payment Waterfall Report` — a view of how payments arrive over time after
the charges were created, metric `Payments by Buckets %` = payments collected relative to total charges for the
period, tabs `Summary` / `Payment Details` / `Charge Details`, filters date / provider / office / payer `[C5]`.
A medical PM tool nicknames its cash-flow report the "Waterfall Report" with dates of service down the side and
posting dates across the top `[unverified]` (search snippet).

**Sources.** `[V25]` `[C5]`.

---

## 4. Management Reports (`management_reports`)

### Payment Plan Charges

**Confidence: INFERRED** (report output); the surrounding workflow is DOCUMENTED.

**Anchors.**
- Old menu name `Regular Payment Plan Charges Report` (2020) `[S]` `[V15]`.
- Periodic charges are generated in `Utilities > Generate Contract Charges >`
  `Generate Regular Payment Plan Charges` / `Generate Ortho Payment Plan Charges` / `Generate Charges by
  Practice` (multi-location): set `Show Periodic Charges as of`, click `Go`, tick patients (header checkbox =
  all), then `Post Periodic Charges` / `Post Patient Ortho Periodic Charges` /
  `Post Insurance Ortho Periodic Charges`. The ortho screen has separate lists
  `Generate Ortho Primary Insurance Payment Plan Charges` and
  `Generate Ortho Secondary Insurance Payment Plan Charges`; each row has a `Bill Date`. The screen shows every
  patient with a periodic charge due. Card-on-file plans are validated by the processor first (a `Val`
  error icon explains a decline) `[D]` `[V37]` `[V25]` `[V26]`.
- Contracts keep the balance **off the ledger** (`Balance Moved to Contract`); each periodic charge posts as
  `Periodic Contract Billing`; other ledger types: `Contract DownPayment`, `Cancel Contract (+)` / `(-)`
  `[S]` `[V4]` `[V24]`.
- The related list report `Reports > Lists > Patient/Resp. Party List > Patients on Payment Plan` (regular /
  ortho, by setup date) shows whether a credit card is on file `[D]` `[V38]`.

**Criteria → output** `[C]`.

| Criterion | Effect `[I]` |
|---|---|
| `PRINT FORMAT` `PDF` / `Excel` | Viewer PDF or spreadsheet |
| `Office` / `Office Group` | Offices whose contracts are listed |
| `Billing Date` (single date) | Charges whose bill date is on (or due as of) this date — the report twin of `Show Periodic Charges as of` |
| `PLAN TYPE` `Regular` / `Ortho` | Regular payment plans or ortho payment plans |
| `Ortho Patient`, `Ortho Primary`, `Ortho Secondary` (enabled for `Ortho`) | Which ortho charge streams to list: patient-portion charges, primary-insurance periodic charges, secondary-insurance periodic charges — mirroring the three posting lists |

**Inferred output `[I]`.** One line per contract charge due: bill date, patient (id, name), responsible party,
contract / plan reference, provider, periodic billing amount, remaining contract balance, number of payments
left, credit-card-on-file flag; for `Ortho` a section per selected stream (patient / primary / secondary) with
carrier for the insurance streams; subtotals per stream and office, grand total. Use: daily pre-posting check
("do I post these?") and a record of what will hit ledgers / claims on the billing date.

**Comparable reports.** Open Dental `Payment Plans Report` — columns `Provider`, `Guarantor`, `Ins`, `Princ`,
`Accum Int`, `Paid`, `Balance`, `Due Now`, `Bal Not Due`, optional `Fam Balance`; filters plan type (insurance /
patient / both), hide completed, providers, clinics; grouped by clinic with clinic totals `[C4]`.

**Sources.** `[V15]` `[V24]` `[V25]` `[V26]` `[V37]` `[V38]` `[V39]` `[C4]`.

---

### Uncollected Copay

**Confidence: PARTIALLY DOCUMENTED** (purpose and several output facts); remaining columns INFERRED.

**What the vendor says.**
- Purpose: check that staff collect the patient copays of the day's schedule, to help A/R. Content: every
  patient on today's schedule who has a patient balance due — pre-existing or created today — with the
  account's last payment date and amount and the account's financial notes, which print in a
  **`Financial Notes` column**. Run daily as an end-of-day report `[D]` `[V25]`.
- End-of-day checklist goal: spot patients who did not pay the expected estimated patient portion and / or a
  previous balance `[D]` `[V26]`.

**Criteria → output** `[C]`.

| Criterion | Effect |
|---|---|
| `REPORT FORMAT` `Detail` / `Summary` | Per-patient lines vs totals `[I]` |
| `PRINT FORMAT` `PDF` / `Excel` | |
| `Office` / `Office Group` | Offices whose scheduled / treated patients are checked |
| `Start Date` / `End Date` | Visit / appointment dates considered (default today) |
| `Patient Balance Greater Than` (0.00) | Minimum **patient** balance for a row to print |

**Output.** Documented elements: one row per patient on the schedule in the range with a patient balance;
last payment date; last payment amount; a `Financial Notes` column `[D]`. Inferred columns `[I]`: appointment
date / time, patient id and name, responsible party, provider, today's charges, estimated patient portion for
today, amount collected today, prior patient balance, total patient balance; totals of balances; `Summary` =
count of patients and total uncollected per office / day.

**Comparable report.** Open Dental `Patient Portion Uncollected` — columns `Date`, `Patient Name`,
`Procedure`, `Fee`, `Patient`, `Adjustment`, `Patient Paid`, `Uncollected`; dollar columns totalled; shows the
uncollected patient balance for procedures completed in a date range `[C1]`. Note the grain differs: Open
Dental is per **procedure**, the legacy report is per **scheduled patient / account** and includes
pre-existing balance.

**Quirks.** Was originally shipped as a client-specific report under `Office Reports` `[D]` `[V26]`. Relies on
the estimated patient portion, so its quality depends on insurance estimation. A vendor FAQ definition quoted
by a search engine (insured patients who left the copay unpaid) could not be found on the page
`[unverified]`.

**Sources.** `[V15]` `[V25]` `[V26]` `[C1]`.

---

### Audit Trail

**Confidence: DOCUMENTED** (two sample outputs, 2017 and 2023).

**Purpose.** Review changes made to records: edits, deletions, close-outs, appointment reschedules and
cut / copy-paste, across `Appointments`, `Patient`, `Setup`, `Transactions` and `Treatment Plan`. Users cannot
alter the entries. It is **not** a log of every entry and keystroke `[D]` `[V29]` `[V31]`
`[V32]`.

**Used by / when.** Owner / office manager / compliance, as needed — suspected removed or altered
transactions, deleted appointments, claim status changes `[D]` `[V32]` `[V33]`.

**Output layout** `[S]` `[V31]` `[V32]` — header: organisation name, `Audit Trail`; landscape.

| Column group | Column | Content |
|---|---|---|
| `Updated` | `Date`, `Time` | When the change was made |
| `Updated` | `Pat Amt`, `Ins Amt` | Patient and insurance amounts after the change |
| `Original` | `Date` | Original transaction date of the record |
| `Original` | `Amt`, `Ins Amt` | Amounts before the change |
| | `Patient ID: Name` | e.g. `768: Mark WhiteHart` |
| | `Description` | Free-text event, see examples |
| | `Tran Amt.` | Transaction amount concerned (negative for payments / credit adjustments) |
| | `Type` | Module: `PATIENT` / `Patient`, `Transactions`, `Treatment Plan`, `Appointments` (and `Setup` per the text) |
| | `User` | User who made the change |

`Description` examples from the samples: `Updated Patient Information page`; `Patient re-activated by <user>`;
`Edit Procedure - <description>`; `Delete Procedure - <description>`; `Delete Payment - ADJ OFF - Courtesy
Discount`; `Edit TranDate from 08/02/2017 to 01/01/2016 <procedure>`; `Edit TxPlan - <procedure>`;
`Delete TxPlan - <procedure>`; `ReEstimate Txplan 1. New Fees:1`; `ClaimStatus changed from :Q to S.`;
`Claim Closed :Pri Claim - Sent (0.00) Closed: ...`; `Delete Insurance Claim`; `Re-schedule Appointment`;
`Unpost Appointment.`; `Delete Appointment-Created`; `Statement Unclosed - Statement Sent - $294.00`.

Claim status letters used in descriptions `[D]` `[V30]`: `Q` = Created, Not Sent; `S` = Sent; `A` = Closed;
`P` = Partial Payment; `PS` = Pre Auth Sent; `PC` = Pre Auth Closed (so `A to Q` = a closed claim reopened,
`A to S` = resubmitted).

**Grouping / totals.** Chronological list (by updated date and time); no grouping, no totals `[S]`. Footer:
`From`, `Thru`, `User : ALL`, `Audit Type : ALL`; the 2017 sample is 14 pages for two months.

**Criteria → output** `[C]`.

| Criterion | Effect | Source |
|---|---|---|
| `Office` / `Office Group` | Offices whose events are listed | `[C]` |
| `User` (default `ALL`) | Events by the selected users | `[S]` |
| `Start Date` / `End Date` | Updated-date range | `[S]` |
| `Patient` + `SEARCH` | Restrict to one patient; empty = all | `[C]` |
| `Audit Type` (default `ALL`) | Kind of action; the tracked actions are Edit, Delete, Close out, Reschedule Appointment, Cut/Copy – Paste Appointment — the exact dropdown values are `[unverified]` | `[D]` `[V29]` |
| `Module Type` (default `ALL`) | Module; `Appointments` is documented (used to list deleted appointments: look for `Delete Appointment-Created` in `Description`); the others are presumably `Patient`, `Setup`, `Transactions`, `Treatment Plan` `[I]` | `[D]` `[V33]` |

**Other entry point.** Patient `Print Reports` icon > `Audit Trail` opens a small dialog `Audit Trail Report`
with radios `Account` / `Patient` and `Start Date` / `End Date` — the vendor's preferred way to audit one
patient or one family account `[S]` `[D]` `[V31]`.

**Quirks.** No `PRINT FORMAT` section; export through the viewer (`MagAuditTrail`). The 2026 revision of the
vendor article says that for appointments only delete, reschedule and cut / copy-paste are recorded (ordinary
appointment edits are not) `[D]` `[V29]`. No before / after field values beyond dates and amounts.

**Sources.** `[V29]` `[V30]` `[V31]` `[V32]` `[V33]` `[V56]`.

---

### Time Clock Report

**Confidence: DOCUMENTED** (`Detail` sample); **PARTIALLY DOCUMENTED** (`Summary`, `Employee Total Only`).

**Purpose.** Hours worked per employee from the built-in time clock (a premium-subscription feature), to
audit gross hours and gross wages `[D]` `[V34]`.

**Output layout — `Detail`** `[S]` `[V34]` `[V35]` — header: organisation name, `Time Clock Report`.

| Column | Content |
|---|---|
| `Employee` | "Last,First" |
| `Over time Type` | The user's overtime rule (demo: `Daily`) |
| `Hourly Rate` | From the user's time-clock setup (demo 0.00) |
| `Over time Rate` | Ditto |
| `In` | Clock-in date and time |
| `In Office` | Office of the clock-in (blank in the demo) |
| `Out` | Clock-out date and time |
| `Out Office` | Office of the clock-out (blank in the demo) |
| `Total Hrs:Mins` | Duration `hh:mm` |
| `Total Hours` | Duration in decimal hours |

One row per punch pair; a `Total:` row after each employee-day; `Grand Total:` at the end. Footer: `From`,
`Thru`, `Users : ALL`, `* Detail Report`, `* Weekly Overtime calculations are not considered for this report`.

**Other formats** `[D]` `[V34]`.

| `REPORT FORMAT` | Vendor description |
|---|---|
| `Detail` | Every punch for all users over the date range; meant for auditing gross hours and gross wages |
| `Summary` | One summary per user **per day**; overtime follows the overtime setting of each user |
| `Employee Total Only` (text: "Total") | One line per employee for the date range |

Wage columns on `Summary` / `Employee Total Only` (regular hours, overtime hours, gross pay) are `[I]`.

**Criteria → output** `[C]`: `REPORT FORMAT` (3 options); `Office` / `Office Group`; `User` (default `ALL`);
`Start Date` / `End Date`; `Group By Office` (disabled for a single office; presumably groups employees by
office when several are selected `[I]`). The same report under `My Reports` (a user's own hours) additionally
offers `PRINT FORMAT` `PDF` / `Excel` `[S]` `[V35]`.

**Quirks.** The vendor states that the time clock is **user-specific, not location-specific** and that the
office of a clock in / out is not tracked or reported `[D]` `[V36]` — yet the report has `In Office` /
`Out Office` columns (empty in the demo) and a `Group By Office` option; behaviour `[unverified]`. Weekly
overtime is not computed on the Detail format.

**Sources.** `[V34]` `[V35]` `[V36]`.

---

## 5. Ledger Reports (`ledger_reports`)

Category-wide: the office is locked to the active office (`Office Group` and `SELECT` disabled, also in vendor
screenshots); name fields are pre-filled from the patient in context; the same four outputs are reachable per
patient from the toolbar `Print Reports` icon, whose menu is `Walkout Report`, `Superbill`, `Patient Ledger`,
`Account Ledger`, `Statement`, `Routing Slip`, `Treatment Plan`, `Perio Chart`, `Medical History`,
`Coll. Assignment`, `Letters`, `HIPAA Letters >`, `Labels >`, `Audit Trail`, `Clinical History` `[S]` `[V41]`
`[V46]`.

### Ledger Report

**Confidence: PARTIALLY DOCUMENTED** (how it is run and what a ledger line contains); **printed layout
INFERRED**.

**Purpose.** Print the ledger of one **account** (responsible party, all family members) or one **patient**
for a date range — e.g. when a patient asks how much they paid in the year, or because a statement does not
show ledger history `[D]` `[V47]`.

**Criteria → output** `[C]` `[S]`.

| Criterion | Effect | Source |
|---|---|---|
| `REPORT FORMAT` `Account Ledger` / `Patient Ledger` | Whole account vs one patient. In the vendor text the patient ledger is run by selecting the **patient**, the account ledger by selecting the **responsible party** | `[D]` `[V47]` |
| `Start Date` / `End Date` | Transactions in the range | `[D]` |
| `Responsible Party` + `SEARCH` | The single account | `[S]` |
| `Print all transactions (includes statements, ledger notes)` | Adds the non-financial ledger rows — `Statement Sent - $X.XX` lines, ledger notes (and probably claim lines) — that are otherwise omitted `[I]` | `[C]` |

From the print menu: `Patient Ledger` / `Account Ledger` open a dialog (`Patient Ledger Report`: `Date Range`,
`Start Date*`, `End Date*`, `Print / Preview`, `Cancel`) and ask whether to add a patient note `[S]` `[D]`
`[V47]`.

**What a ledger line holds (screen guide)** `[D]` `[V23]`: `Date` (date of service for procedures, claim
created date for claims, entry date for payments / adjustments), `Patient`, `Office`, `A` (`P` = patient,
`R` = responsible party), `Code` (procedure code, claim type `CLM-P` / `CLM-S`, or payment / adjustment code),
`TH`, `Surf`, `Type` (`P` = production, `C` = collection), note and EOB indicators, `Description`, `Bill`
(billing order `D`..`DDDD`, `M` / `MM` medical), `Duration`, `Provider`, `Est Pat`, `Est Ins`, `Amount`,
`Balance`, `User`. The account ledger can be sorted by transaction date or date of service.

**Inferred printed layout `[I]`.** Header with office and responsible party / patient, account number and the
date range; lines with date, patient, code, tooth, surface, description, provider, charge / credit amount and
running balance (possibly `Est Pat` / `Est Ins`); closing balance and the ageing / estimated-insurance /
estimated-patient summary as on the Walkout Report. Comparable: Dentrix `Family Ledger Report` (Office Manager
> Reports > Ledger; by guarantor, date range) `[unverified]` (found by title only).

**Quirks.** Voided transactions and unclosed statements show struck through in the ledger `[D]` `[V56]`
`[V63]`; whether they print is `[unverified]`.

**Sources.** `[V23]` `[V47]` `[V56]`.

---

### Super Bill

**Confidence: PARTIALLY DOCUMENTED** (definition, options, rules); **printed layout INFERRED** — no sample
image exists in the Help Center.

**Purpose.** An itemised hand-out for the patient listing all transactions for services rendered on a date or
in a date range — completed procedures, payments and adjustments — which the patient attaches to a claim filed
with the carrier on their own to get reimbursed. Because it relates to insurance claims it prints the
**insurance billing provider entered under Setup / Offices** `[D]` `[V21]`.

**Used by / when.** Front desk / billing on patient request: self-filed claims, tax or HSA / FSA receipts,
showing the patient the charges and payments after insurance paid less than estimated `[D]` `[V45]` `[V46]`.

**Criteria → output.**

| Criterion | Effect | Source |
|---|---|---|
| `PATIENT NAME RANGE` (`Start Name`, `End Name`) | One super bill per **patient** in the range (the other ledger reports are by responsible party) | `[C]` |
| `Start Date` / `End Date` | Labelled `DOS Date Range` in the print-menu dialog `Super Bill Report` | `[S]` `[V46]` |
| `TRANSACTION TYPES` `Services`, `Payments`, `Adjustment` | Which line types print. Payments only (untick the other two) = the vendor's "tax receipt" | `[D]` `[V46]` |
| `Include Previous Balance` (dialog only) | Adds a previous-balance line | `[S]` `[V46]` |
| Date range advice | Treatment date through the insurance payment posting date, so that all charges and payments show | `[D]` `[V45]` |

**Inferred printed layout `[I]`.** Office name / address and billing provider identity (name, licence / NPI /
tax id as needed on a claim); patient and subscriber / insurance details; lines with date of service, code,
tooth, surface, description, provider, fee, then payments and adjustments; totals for charges, credits and
balance. Diagnosis codes `[unverified]`.

**Quirks.** The office **logo does not print** on the Superbill (it does on the Walkout Report and
Statements) `[D]` `[V44]`. Menu spelling varies: `Super Bill` (Ledger Reports list), `Superbill` (print menu,
articles), `Super Bill Report` (dialog).

**Sources.** `[V21]` `[V44]` `[V45]` `[V46]`.

---

### Walkout Report

**Confidence: DOCUMENTED** (two sample outputs, 2022 and 2023).

**Purpose.** The patient's check-out receipt, printed title **`Statement of Services Rendered`**: today's (or
a range's) services, payments and adjustments, the account balance and ageing, statement messages and the
**next appointment** `[D]` `[V40]` `[V42]`.

**Used by / when.** Front desk at the end of every appointment. Entry points: right-click the appointment >
`Print` > `Walkout Report`; toolbar `Print Reports` icon > `Walkout Report`; `Reports > Ledger Reports >
Walkout Report` `[D]` `[V41]` `[V40]`.

**Output layout** `[S]` `[V41]` `[V40]`.

| Area | Content |
|---|---|
| Header | Office logo; office address, `Ph #`, `Fax #`; title; box `Date :`, `Account # :`, `Account Balance :`, `Office # :` (office short id); addressee = responsible party name and address; long date line (`Tuesday, August 9, 2022`) |
| Line table (default) | `Date` · `Description` · `Chart #` · `Patient Name` · `Check #` · `Code` · `Th` · `Surf` · `Charges` · `Credits` |
| Line table with both options on | `Date` · `Description` · `Patient Name` · `Check #` · `Code` · `Th` · `Surf` · `Est. Pat` · `Est. Ins` · `UCR` · `Charges` · `Credits` |
| First line | `Previous Balance` with the amount in `Credits` / balance column |
| Lines | Procedures (description, patient first name, code, tooth, amounts); patient payments named by tender (`American Express`); `Insurance Payment (Dos:02/11/23)`; adjustments (`ADJ OFF - Admin Adjustment`, `REFUND - Insurance`); contract movements (`Balance Moved to Contract`, `Contract DownPayment`) |
| Totals | `Total of Today's Activity :` and `Total Balance for the Account :` |
| Ageing grid | `Account Balance as of : <date>` — `Current` · `Over30` · `Over60` · `Over90` · `Over120` · `Total Balance`; rows `Estimated Insurance`, `Estimated Patient`; to the right `Reg Cont. Bal.` · `Ort Cont. Bal.` (regular and ortho contract balances) |
| `Messages :` | Statement messages (general + the ageing-specific one) |
| `Comments :` | Empty box |
| Next appointment table | `Patient Name` · `Next Appt Date` (weekday + date) · `Time` · `Next Appt Office` (name, address, phone — matters when the visit is at another location) · `Reason` |
| Footer | `Printed`, copyright, page |

**Criteria → output.**

| Criterion | Effect | Source |
|---|---|---|
| `RESPONSIBLE PARTY NAME RANGE` | One walkout per responsible party in the range (pre-filled with the patient in context) | `[C]` |
| `Start Date` / `End Date` | Transactions listed; default today | `[D]` |
| `Show charges break down` | Adds `Est. Pat` and `Est. Ins` per line | `[S]` `[V40]` |
| `Include UCR` | Adds a `UCR` column immediately left of the charges column | `[D]` `[V40]` |
| Print-menu dialog extras | Editable `General Message`, `Current Message`, `Over 30 Message`, `Over 60 Message`, `Over 90 Message`, `Over 120 Message`; option to add a note to the patient's Notes that a walkout was printed | `[S]` `[D]` `[V40]` `[V42]` |

**Viewer extras.** The walkout opens in a signature-capable viewer (`ReportSignatureFrame`) with
`Card Holder Signature` and `Dentist Signature` pads (`Sign`, `Clear`, `Done`) and `Save PDF file`; the vendor
positions the walkout as the receipt for card payments (the processor does not require a signature) `[S]` `[D]`
`[V43]`.

**Quirks.** Prints the logo `[D]` `[V44]`. The next appointment prints only if one exists in the Scheduler.
Column set changes with options (and `Chart #` disappears in the wide variant), so downstream parsing must not
rely on positions.

**Sources.** `[V40]` `[V41]` `[V42]` `[V43]` `[V44]`.

---

### Account Allocation

**Confidence: INFERRED.** No vendor description of this report's output was found.

**Criteria** `[C]`: office (locked); `Start Date` / `End Date`; one `Responsible Party`. No options.

**Anchors (documented screens with the same data).**
- Ledger: clicking a payment's `Amount` or `Provider` opens the `Payment Allocation` detail; `Edit Payment >
  Payment Allocation Detail` shows the allocated portions and the unallocated remainder (`Unallocated`)
  `[D]` `[V22]` `[V23]`.
- Ledger balances open `Aging Detail`: `DOS Date`, `Patient Name`, `Office`, `Code`, `Th`, `Surf`, `T`,
  `Description`, `Provider`, `Current`, `Over 30`, `Over 60`, `Over 90`, `Over 120`, `Balance`,
  `Contract Adjustments` `[D]` `[V23]`.
- `Patient > Reallocate Account` and its `Reallocation Report` (option `Completed/Cancelled`) `[D]` `[V16]`
  `[V24]`.
- Allocation rules: FIFO by patient then provider for patient payments; insurance payments to their claim
  line; adjustments are specific to patient, provider and location `[D]` `[V21]` `[V24]`.

**Inferred output `[I]`.** For the account and date range: each payment / credit adjustment (date entered,
code, description, payer, entering office, amount) followed by its allocation lines (procedure date of
service, patient, code, tooth, allocation provider, allocation office, allocation date, amount applied) and
any unallocated remainder; totals allocated / unallocated per payment and for the account. Use: explain to a
family where its money went, audit provider credit, and diagnose ledger-vs-ageing mismatches before a
reallocation or a `TRANSFER` adjustment.

**Comparable.** Open Dental payment splits / `Income Transfer` views and Dentrix split payments (see
`compliance_and_financial_semantics.md`); Open Dental `Daily Payments` shows the same split grain `[C2]`.

**Sources.** `[V16]` `[V21]` `[V22]` `[V23]` `[V24]`.

---

## 6. Statements (`statements_reports`)

### Statements

**Confidence: DOCUMENTED** (screen, workflow, printed statement); **PARTIALLY DOCUMENTED** (the
`PRINT STATEMENT REPORT` list).

**Purpose.** Batch-generate billing statements for responsible parties who owe money, optionally apply finance
charges first, then stamp and lock the statement period `[D]` `[V48]` `[V54]`.

**Used by / when.** Billing staff, monthly. Vendor sequence: `FINANCE CHARGES` (if configured) >
`PRINT STATEMENT REPORT` > `PRINT STATEMENTS` (save the PDF) > `UPDATE STATEMENT DATES` only after the
statements are confirmed correct `[D]` `[V48]`. Offices can outsource printing / mailing to the vendor's
statement service and / or email e-statements `[D]` `[V58]`.

**Screen — fields and their effect** (labels `[C]` `[S]` `[V49]`).

| Control | Effect | Source |
|---|---|---|
| `Statement Date` (info icon) | Billing date printed on the statement; ageing / "Total Due as of" date | `[S]` |
| `FINANCE CHARGES` | Opens the finance-charge run: `Finance Charge Date`, `Responsible Party Range`, `Exclude Responsible Party Type`, `Provider`, `Apply Finance Charge to` (`Patient Portion` / `Entire Balance`), `Apply`. Office settings (`Setup > Offices > Office Setup > Advanced`): `Annual Fin. Charge %`, `Minimum Balance`, `Minimum Fin. Charge`, `# of Days Before Applying Fin. Charge`. The type list contains `FEE - Finance Charge (Account)` `[S]` `[V3]` — presumably what the run posts `[I]` | `[D]` `[S]` `[V48]` `[V53]` |
| `Responsible Party Range` (`Start Name` `AAAAA`, `End Name` `ZZZZZ`) | Alphabetical range by responsible-party last name | `[D]` `[V51]` |
| `Account Balance Over` (5.00) | Minimum balance for a statement | `[D]` `[V51]` |
| `Include Credit Balances` | Also produce statements for accounts in credit `[I]` | `[C]` |
| `Suppress Aging` | Omit the ageing grid `[I]` | `[C]` |
| `Hide Insurance Shares` | Omit the estimated insurance / patient split `[I]` | `[C]` |
| `Hide Credit Card Section` | Omit the card fields of the remittance slip `[I]`; statement report variants named `..._withoutCC` exist `[S]` | `[S]` `[V59]` |
| `Sort by Resp.Party Lastname` / `Sort by Resp.Party ID` | Print order | `[C]` |
| `Last Statement Date`, `Last Close Out Date` | Read-only lock dates | `[D]` `[V54]` |
| `Print Reports` > `PAPER STATEMENT SENT` | Button (enabled in vendor screenshots, disabled in ours); presumably a report of paper statements sent `[I]` `[unverified]` | `[S]` |
| `Exclude accounts where statement was sent within last [n] days.` | No statement if one was sent within n days | `[D]` `[V51]` |
| `Exclude accounts where patient portion is paid and insurance portion is expected` (default on) | No statement if the balance is expected in full from insurance | `[D]` `[V51]` |
| `Exclude patients Sent to Collection.` | No statement for accounts flagged sent to collection | `[D]` `[V51]` |
| `Exclude Responsible Parties where the Patient has an open claim` | Only present when the account has the feature "Enable Advance Hold Statements with Open Claims" activated | `[D]` `[S]` `[V51]` |
| `Exclude Responsible Party Type` + `SELECT` | Excludes selected responsible-party types | `[D]` `[V51]` |
| Message boxes `General Message`, `Current Message`, `Over 30 Message`, `Over 60 Message`, `Over 90 Message`, `Over 120 Message` | Up to 100 characters each with a `Remaining Characters` counter; defaults from `Setup > Offices > Office Setup > Statement` tab. `General` prints on all statements; the others by the account's ageing (current; 30–59; 60–89; 90–119; more than 120 days). **Not rendered in our capture** although the "Maximum 100 characters per message" caption is | `[S]` `[D]` `[V49]` `[V57]` |
| `PRINT STATEMENT REPORT` | List of the accounts that are **eligible** under the current criteria, to review before printing | `[D]` `[V49]` |
| `PRINT STATEMENTS` | The statements PDF (batch) | `[D]` `[V48]` |
| `UPDATE STATEMENT DATES` | Writes `Statement Sent - $X.XX` to each recipient's ledger, sets `Last Statement Date`, locks data on or before the date | `[D]` `[V54]` |

**Printed statement — in-app layout** `[S]` `[V59]` `[V60]` (2013 and 2025 samples).

| Area | Content |
|---|---|
| Header | Title `Statement`; office logo and address; responsible party name and address (window-envelope position); box `Billing Date :`, `Account # :`, `Amount Due :`, `Office # :` |
| Payment box (older build, top right) | `Method of Payment` — `Check`, `Credit Card`, `Credit Card # :`, `CID :`, `Exp Date :`, `Name : (as it appears on the Credit Card)`, `Type of Card :`, `Signature :` |
| Tear line | `Detach here and Return this Portion of the Statement with your Payment` |
| Line table | `Date` · `Description` · `Chart #` · `Patient Name` · `Code` · `Th` · `Surf` · `Credits` · `Charges` |
| First line | `Last Statement Balance` dated with the previous statement date |
| Lines | Transactions since the last statement: procedures, payments (`$-190.39 Ins Chk <carrier>`, `$-8.03 Visa`), claim events (`Sec Claim - Sent (218.00)`) |
| Totals | `Total :` (credits, charges) and `Total Due as of <date> :` |
| Ageing grid | `Current` · `Over30` · `Over60` · `Over90` · `Over120` · `Total Balance`; rows `Estimated Insurance`, `Estimated Patient`; `Reg Cont. Bal.` · `Ort Cont. Bal.` |
| `Messages :` / `Comments :` | Messages by ageing; e.g. online-payment invitation, collections notice |

**Printed statement — vendor statement-service layout** `[S]` `[V60]` (2008 and 2011 samples): same header and
a postal barcode; line table `Date` · `Description` · `Patient Name` · `Code` · `TH` · `Surf` · [`Full Fee`] ·
`Charge` · `Ins Exp` · `Pat Por` · `Credit` · `Balance` (running); ageing grid without `Over120`; a bottom
remittance coupon with the `Method of Payment` block. The service can print the ledger amount only or the
ledger amount **plus the office UCR** (`Full Fee`); that option is not available on the in-app screen `[D]`.

**`PRINT STATEMENT REPORT` output.** No sample found. `[I]`: one row per eligible responsible party (id, name,
balance, ageing, estimated insurance / patient, last statement date) with a count and total — effectively the
ageing detail filtered by the statement criteria.

**Statement rules.**
- A statement goes to the **responsible party**; one consolidated statement per account from the responsible
  party's **home office**, using that office's settings and messages. The red note "Please update Statement
  Dates after Printing respective Office Statements" follows from this: the run is per office `[D]` `[V52]`.
- Statements itemise only transactions entered since `Last Statement Date`; skipping the update produces
  multi-page statements with years of history. Generating with one date and updating with another shows more
  than one month `[D]` `[V55]`.
- After the update, a reprint (`Print Reports` icon > `Statement`) shows only the `Last Statement Balance`
  line, not the items `[D]` `[V59]`.
- A responsible party is skipped when `Send Statements` is unticked on the responsible-party record, when the
  criteria exclude it, when the balance changed after the pull, or when the account has allocation issues
  `[D]` `[V51]`.
- `Patient > Unclose Last Statement` unlocks one account: the statement stays in the ledger struck through,
  appears on the Audit Trail and no longer appears in statement outputs `[D]` `[V56]`.
- Account option `Statement Update – Close out ALL statements including zero and credit balance statements`
  (`Setup > Account Info > Advanced`) also stamps zero and credit accounts `[D]` `[V56]`.
- Do not run `Update Statement Dates` or `Close Out` with **today's** date (locks today's entries) `[D]` `[V54]`.
- Logo prints on statements; a separate billing phone can be configured (`Use office statement address and
  phone`) `[D]` `[V44]` `[V57]`.

**E-statements** `[D]` `[V58]`: an email with a download link (no attachment) to responsible parties with an
email and `Send Statement` on (`No Email Statements` off); sent three days after the selected statement date,
on the paper schedule; optional online-payment link; the ledger records each statement as `Paper`, `Email` or
`Paper & Email` with a clickable date showing the statement, the address and the ageing `[V59]`.

**Follow-up reports** `[S]` `[D]` `[V49]` `[V50]`: `Reports > Lists > Patient/Resp. Party List >`
`Responsible Party - Statements Sent` (criteria `STATEMENT TYPE` `Paper` / `Email` / `Both`, `PRINT FORMAT`,
`OFFICE/GROUP`, `Statement Date`), `Responsible Party - Email Statement Error Report`,
`Responsible Party - Sent to Collection`, and `Responsible Party List` grouped by `Send Statement Status` =
`No`.

**Sources.** `[V3]` `[V44]` `[V48]`–`[V60]`.

---

## 7. Reconciliation rules and traps (consolidated)

| # | Rule / trap | Source |
|---|---|---|
| 1 | Executive Summary A/R = Aging total only with `Show AR` + `Include Credit Balance` + a single identical date | `[V2]` |
| 2 | Single-office `Aging Report` shows false balances and credits when charges and payments are in different offices; use the home-office variant for multi-location | `[V5]` `[V7]` |
| 3 | `Account AR` vs `Patient AR` changes both the threshold label and the population; totals can differ widely | `[V6]` |
| 4 | Aging estimated insurance ≠ Outstanding Claims total, by design | `[V12]` |
| 5 | Income Allocation is by **created date**, by **production office**, and **live**; it cannot be reconciled with production or collection reports | `[V14]` `[V16]` `[V18]` `[V19]` |
| 6 | Income (pay base) = payments + previous allocation + negative collection adjustments − positive collection adjustments; non-income items excluded | `[V15]` |
| 7 | Prepayments are collection but not allocation until a procedure posts; they sit in the `Unallocated` row / report | `[V21]` |
| 8 | Production adjustments print with charges; collection adjustments with adjustments — on the Daily Journal, the Executive Summary and the Executive Day Sheet | `[V62]` `[V1]` `[V3]` |
| 9 | Aging bucket boundaries are defined inconsistently by the vendor (0–29 vs 0–30; 120+ vs more than 120) | `[V8]` `[V21]` |
| 10 | Statements show only activity since `Last Statement Date`; reprints after the update show only the balance-forward line | `[V55]` `[V59]` |
| 11 | Contract balances are off-ledger until periodic charges post; they appear as separate `Reg Cont. Bal.` / `Ort Cont. Bal.` figures | `[V24]` `[V40]` |
| 12 | Time-clock office columns exist but the vendor says the office is not tracked | `[V36]` |
| 13 | Old and new report names coexist in vendor and client documentation | `[V15]` |

## 8. Implications for our module (brief)

| Legacy behaviour | Keep | Improve |
|---|---|---|
| Executive Summary KPI block | The exact metric set and definitions (they are the users' vocabulary) | Fix units (chair time), state one new-patient definition per tile, add trend / comparison, show A/R by default with the credit rule visible |
| Aging 3-line block (total / `Ins:` / `Pat:`) | The grain (responsible party) and the Ins / Pat split | One report with an explicit "attribute by: transaction office / home office" switch; extended buckets in every format; credit handling shown in the header; drill-down to ledger |
| Income Allocation roll-forward | Columns and formulas (payroll depends on them) | Period snapshots so a pay run is reproducible; show the created-date rule; drill from `Income` to allocation lines |
| Day sheet by type | One row per type with A/R impact | Suppress zero rows by default; add totals and class subtotals |
| Statements run | Criteria set, messages by ageing, lock step | Preview list with exclusion reasons per account; reprint with full detail; reversible lock with audit |
| Audit Trail | Updated vs original values, user, module | Field-level before / after, filters by action, export |
| Report-per-option menu history | — | Use options and saved views instead of separate reports; keep legacy names as searchable aliases |

## 9. Gaps and unverified items

- No vendor output sample or description for `Allocation Detail`, `Unallocated Payment/Adjustments`,
  `Daily Journal Summary by Allocation`, `WaterFall Report`, `Payment Plan Charges`, `Account Allocation`,
  `Ledger Report`, `Super Bill`, and for the `Summary` / grouped variants of Aging, Income Allocation
  (`Detail`), Uncollected Copay and Time Clock. Their layouts above are inferences.
- Dropdown values of Audit Trail `Audit Type` / `Module Type`; contents of the `SELECT` / `SEARCH` dialogs.
- Position and format of `Include Balance Status` and `Include Contract Balances` on the aging page.
- Whether multi-office Executive Summary and Day Sheet runs append a consolidated block; whether the Day Sheet
  has a totals row.
- Unit of `Total Chair Hours`.
- Purpose of `PAPER STATEMENT SENT`; layout of the Statement Report; why the message boxes are not rendered in
  our capture; tooltip of the `Statement Date` info icon.
- Sources known but not read: `M13_End_of_Day_Reporting.pdf` (17 MB), the webinar recordings `[V64]`, a
  login-protected DSO training site, the Dentrix Enterprise Reports Reference (TLS error on fetch).
- The verified `statements_reports.json` did not exist when this was written; the Statements section uses the
  first-reader transcription cross-checked against vendor screenshots. `montly_reports.json` (verified) agrees
  with the first-reader version; its two `[?]` sort labels are confirmed here.

## 10. Sources

All Help Center articles were read on 2026-11-22 through the article API; the public page is
`https://support.planetdds.com/hc/en-us/articles/<id>`. Sample images are at
`https://support.planetdds.com/hc/article_attachments/<id>` (ids listed after "img").

### Planet DDS Help Center and vendor PDFs

- `[V1]` How do we interpret and understand the Executive Summary report? — https://support.planetdds.com/hc/en-us/articles/115002094052-How-do-we-interpret-and-understand-the-Executive-Summary-report — img (field guide) `115002805931/7713fa5586f247a8ab379fc888cd4c5a`, `115002805951/781749ad7e9e46fbb4626fc9ee080055`, `115002822432/beaf972e482c4031834263ad84f7db0f`
- `[V2]` My Executive Summary doesn't match my Aging Report? — https://support.planetdds.com/hc/en-us/articles/34417429197595-My-Executive-Summary-doesn-t-match-my-Aging-Report-How-do-I-know-which-is-correct — img `34417429175195` (Executive Summary 2025), `34417429178139`, `34417425086747` (Aging Report - Detail 2025), `34417429188379`
- `[V3]` How are we able to generate a report to know which adjustments we've used? — https://support.planetdds.com/hc/en-us/articles/115002085332 — img `7950111228955` (Executive Day Sheet 2022), `16606530157851`
- `[V4]` We charge sales tax on some procedures. Is there a report to understand the amount we have collected? — https://support.planetdds.com/hc/en-us/articles/115002074691 — img `360051886932` (Day Sheet 2020, page 2)
- `[V5]` We are a multi-location operation, Which aging reports should I run? — https://support.planetdds.com/hc/en-us/articles/360003002172 — img `48362465637147`
- `[V6]` Aging by Account A/R or Patient A/R — https://support.planetdds.com/hc/en-us/articles/38057961810331-When-we-run-an-aging-report-there-are-options-to-run-the-aging-by-Account-A-R-or-Patient-A-R-What-is-the-difference-between-the-two
- `[V7]` Aging Report accounts with a $0 ledger balance (multi-location) — https://support.planetdds.com/hc/en-us/articles/115002081412-We-are-a-multi-location-operation-When-we-generate-our-Aging-Report-there-are-accounts-in-the-report-which-have-a-0-balance-in-the-ledger-What-is-wrong
- `[V8]` How can I know how much money is owed to the practice...? — https://support.planetdds.com/hc/en-us/articles/360029738592 — img `360032344852` (Aging by Home Office 2019), `360032345052` (Aging Detail 2019), `360032345092`
- `[V9]` Can We Run an Aging Report for Balances Over 120 Days? — https://support.planetdds.com/hc/en-us/articles/20465582790939-Can-We-Run-an-Aging-Report-for-Balances-Over-120-Days — img `20465574340891` (criteria, Excel mode), `20465591257371` (Excel output)
- `[V10]` How can I generate a list of all Responsible Parties who owe money to the practice? — https://support.planetdds.com/hc/en-us/articles/115002070511-How-can-I-generate-a-list-of-all-Responsible-Parties-who-owe-money-to-the-practice
- `[V11]` We have accounts which have credit balances... — https://support.planetdds.com/hc/en-us/articles/115002083432
- `[V12]` Why does my outstanding claim report differ from the outstanding claims shown on the aging detail report? — https://support.planetdds.com/hc/en-us/articles/115002066471-Why-does-my-outstanding-claim-report-differ-from-the-outstanding-claims-shown-on-the-aging-detail-report
- `[V13]` What is a Balance Status and how can it help with reports? — https://support.planetdds.com/hc/en-us/articles/32299501787163 — img `42712690417435` (full aging criteria screen, 2024)
- `[V14]` Understanding the Income Allocation Summary Report for Provider Payments — https://support.planetdds.com/hc/en-us/articles/115002081992-Understanding-the-Income-Allocation-Summary-Report-for-Provider-Payments — img `51539001685659` (Summary 2026), `51539047218587`
- `[V15]` Help Portal PDF (2022 edition of `[V14]`, with column definitions, formulas, the 2012 sample and the 2020 Management Reports menu) — https://www.planetdds.com/wp-content/uploads/2022/11/Help-Portal-We-pay-our-providers-based-on-collection.-What-is-the-best-report-to-use.pdf
- `[V16]` Why Monthly Income Allocation Balances May Differ — https://support.planetdds.com/hc/en-us/articles/30361817476763-Why-Monthly-Income-Allocation-Balances-May-Differ
- `[V17]` My office pays providers based on collection... — https://support.planetdds.com/hc/en-us/articles/115002070651-My-office-pays-providers-based-on-collection-How-can-I-determine-the-proper-numbers-to-know-what-each-provider-has-accrued
- `[V18]` Income Allocation-Summary: a check we posted is not appearing — https://support.planetdds.com/hc/en-us/articles/115002069331
- `[V19]` Production Summary vs Income Allocation production numbers — https://support.planetdds.com/hc/en-us/articles/115002085292
- `[V20]` Bill for only the procedures a payment applied towards (HSA/FSA) — https://support.planetdds.com/hc/en-us/articles/36030927904027 — img `36030902823963`
- `[V21]` Glossary of Terms: Collection vs Allocation (360025202571), Allocation (360025172131), Aging (115002088672), Allocation Date (115002086112), Allocation Office (115002086052), Allocation Order (115002086252), Allocated Payment (115002069731), Allocation Provider (115002089012), Collection (115002067851), Collection Office (115002069991), Income Adjustment (115002086092), Previous Allocation (115002086132), Production (115002083912), Production Adjustment (115002086072), Production Office (115002086032), Unallocated Payment (115002073891), Unallocated (115002070011), Superbill (115002066111), Responsible Party (115002088732), Transaction Date (115002079371), UCR (115002069391), Adjustments: Production vs. Collection (115002070031), Peg Board Day Sheet (115002082472) — each at https://support.planetdds.com/hc/en-us/articles/<id>
- `[V22]` I took a payment, but the provider is showing as unallocated — https://support.planetdds.com/hc/en-us/articles/26580149707419
- `[V23]` Guide to the fields displayed on the Ledger screen — https://support.planetdds.com/hc/en-us/articles/28786160012699-Is-there-a-guide-for-understanding-the-fields-displayed-on-Denticon-s-Ledger-screen
- `[V24]` Reallocate account unavailable / manual adjustments — https://support.planetdds.com/hc/en-us/articles/115002064911
- `[V25]` Reports Matrix + "Denticon Reporting 101" PDF — https://support.planetdds.com/hc/en-us/articles/4415425089563-Reports-Matrix , https://support.planetdds.com/hc/en-us/article_attachments/26183111395355 , https://www.planetdds.com/wp-content/uploads/2022/11/Reporting-Matrix.pdf
- `[V26]` Reports and activities recommended at the end of each day — https://support.planetdds.com/hc/en-us/articles/115002085792-Which-reports-and-activities-does-Denticon-recommend-to-generate-at-the-end-of-each-day
- `[V27]` ...at the end of each month, and at the end of each year — https://support.planetdds.com/hc/en-us/articles/115002068151-Which-reports-and-activities-does-Denticon-recommend-to-generate-at-the-end-of-each-month-and-at-the-end-of-each-year
- `[V28]` What should our office consider at the end of each year? — https://support.planetdds.com/hc/en-us/articles/115002069791-What-should-our-office-consider-at-the-end-of-each-year
- `[V29]` What type activities will the Audit Trail track? — https://support.planetdds.com/hc/en-us/articles/115002073211-What-type-activities-will-the-Audit-Trail-track
- `[V30]` Audit Trail claim status letters — https://support.planetdds.com/hc/en-us/articles/115002082952
- `[V31]` Transactions removed or altered within a record — https://support.planetdds.com/hc/en-us/articles/115002070411 — img `16059356221467` (Audit Trail 2023 in viewer), `16059341449627` (patient dialog)
- `[V32]` Transactions removed or altered within our office — https://support.planetdds.com/hc/en-us/articles/115002070431 — img `115002808612` (Audit Trail 2017), `16692709022363` (criteria)
- `[V33]` How do I print a list of appointments that have been deleted? — https://support.planetdds.com/hc/en-us/articles/360050586872-How-do-I-print-a-list-of-appointments-that-have-been-deleted
- `[V34]` How can we generate a Time Clock report...? — https://support.planetdds.com/hc/en-us/articles/115002077091 — img `360048776191` (sample), `16858298295323` (criteria)
- `[V35]` Single user viewing own time-clock hours (My Reports) — https://support.planetdds.com/hc/en-us/articles/115002078711 — img `360048776131`, `16858360962331`
- `[V36]` Why isn't the office location indicated on the time clock reports? — https://support.planetdds.com/hc/en-us/articles/115002093512
- `[V37]` Periodic contract charges: https://support.planetdds.com/hc/en-us/articles/115002094332 , /115002094492 , /115002072271 , /115002067591 , /36917572821659 , /115002094212 , /115002072251
- `[V38]` How do I obtain a list of patients on a payment plan? — https://support.planetdds.com/hc/en-us/articles/4403098488333-How-do-I-obtain-a-list-of-patients-on-a-payment-plan
- `[V39]` Ortho Payment Plan and Ortho Treatment Card report options — https://support.planetdds.com/hc/en-us/articles/360045117932
- `[V40]` Our patient wants a receipt for today's activities... — https://support.planetdds.com/hc/en-us/articles/115002089592 — img `16266313816731` (walkout 2023 in viewer), `16266317235739` (dialog), `16266336598427` (criteria), `16266327707291` (Reports menu)
- `[V41]` How can I quickly print a 'Walkout Report'...? — https://support.planetdds.com/hc/en-us/articles/360037544472 — img `7956120472731` (walkout 2022)
- `[V42]` Walkout shows the next appointment — https://support.planetdds.com/hc/en-us/articles/115002072991 , /115002073031 , /115002073011 — img `18842682989339` (print menu)
- `[V43]` Proving a credit card payment without a signature — https://support.planetdds.com/hc/en-us/articles/115002090452
- `[V44]` Which documents will show our logo? — https://support.planetdds.com/hc/en-us/articles/115002078171
- `[V45]` Insurance paid less than expected: bill the patient the difference — https://support.planetdds.com/hc/en-us/articles/115002071051 — img `19067711484699` (Super Bill criteria)
- `[V46]` Our patient has requested a tax receipt — https://support.planetdds.com/hc/en-us/articles/12951216825115 — img `16059491222427` (Super Bill Report dialog), `16059482329243`
- `[V47]` Printing a patient / account ledger — https://support.planetdds.com/hc/en-us/articles/360050692171 , https://support.planetdds.com/hc/en-us/articles/115002071191 — img `16059548753691`, `16059585350043`, `16266370216347`
- `[V48]` How do I generate my monthly statements? / How do I send monthly statements to all my patients? — https://support.planetdds.com/hc/en-us/articles/115002086772 , /115002072371 — img `21568272493339`, `21568267626779`
- `[V49]` Which accounts had a statement generated? — https://support.planetdds.com/hc/en-us/articles/115002083272 — img `16817829719067` (Statements screen with messages, 2023), `16817872568731` (Statements Sent criteria)
- `[V50]` Responsible Party accounts that did not get a statement (Send Statement flag) — https://support.planetdds.com/hc/en-us/articles/115002066891
- `[V51]` A few of our patients have not received statements... — https://support.planetdds.com/hc/en-us/articles/115002095592 — img `21546604454427`
- `[V52]` Multi-location practice: statements and statement settings — https://support.planetdds.com/hc/en-us/articles/25998167605147
- `[V53]` Finance Charge settings and applying charges — https://support.planetdds.com/hc/en-us/articles/360029548871 — img `21568129556379` (office Advanced tab)
- `[V54]` Update Statement Dates vs. Close Out — https://support.planetdds.com/hc/en-us/articles/115002072411 , /115002072591
- `[V55]` Multi-page statements / "Statement Sent" ledger line — https://support.planetdds.com/hc/en-us/articles/115002077871 , /115002072391
- `[V56]` Unclose a statement / statement sent on a $0 balance — https://support.planetdds.com/hc/en-us/articles/360028499432 , /360024256051
- `[V57]` Statement messages / billing office phone — https://support.planetdds.com/hc/en-us/articles/115002071851 , /4403872511771
- `[V58]` E-Statements — https://support.planetdds.com/hc/en-us/articles/360038576552
- `[V59]` How can we review the statement that was sent to a patient? — https://support.planetdds.com/hc/en-us/articles/37603299356315 — img `37603326473883` (statement 2025), `37603299347611`
- `[V60]` Contracted fee and office UCR on statements — https://support.planetdds.com/hc/en-us/articles/115002066731 — img `https://planetdds.zendesk.com/hc/article_attachments/115002781891/32e62949afef42f4b3abcc2de1842f23` (2011), `.../115002781911/eab7cb716b8d4fb8923ee2002b5aaa13` (2008, Full Fee), `.../115002800772/a0227f6023a147fe8b4cae05a4577546` (2013 in-app)
- `[V61]` Reports-related security rights — https://support.planetdds.com/hc/en-us/articles/115002075251
- `[V62]` Daily Journal: adjustments in the charges column — https://support.planetdds.com/hc/en-us/articles/31644959243803
- `[V63]` Close Outs — https://support.planetdds.com/hc/en-us/articles/115002084912 , /115002093712
- `[V64]` Webinar recordings (video only, not read): 08 Monthly Reports (115002091972), 31 Allocation, Production, and Collection (360025616971), 39 Reports Part 1 (360039020232), 40 Reports Part 2 (360039835452), 44 All About Statements! (360043763192), 45 All About the Ledger! (360044213911), 55 Payment Plans (360060165152), 56 Reports (360061512052) — https://support.planetdds.com/hc/en-us/articles/<id>
- `[V65]` Denticon University module PDF `M13_End_of_Day_Reporting.pdf` (17 MB, not read) — https://support.planetdds.com/hc/article_attachments/10601620951451

### Third party

- `[T1]` Jarvis Analytics, "Denticon and Jarvis: A report guide" — https://www.jarvisuniversity.com/insights/denticon-and-jarvis-a-report-guide/

### Comparable systems (used only for sections marked INFERRED)

- `[C1]` Open Dental, Patient Portion Uncollected Report — https://opendental.com/manual/reportdailypatportuncollected.html
- `[C2]` Open Dental, Daily Payments Report — https://opendental.com/manual/reportdailypayments.html
- `[C3]` Open Dental, Unearned Income Reports — https://www.opendental.com/manual/reportunearnedincome.html , https://www.opendental.com/manual/reportunearnedaccounts.html , https://www.opendental.com/manual/reportlineitemunearned.html
- `[C4]` Open Dental, Payment Plans Report — https://www.opendental.com/manual/reportpaymentplan.html
- `[C5]` DrChrono, Payment Waterfall Report — https://support.drchrono.com/home/payment-waterfall-report
- Dentrix / Dentrix Enterprise / Eaglesoft references are listed in `compliance_and_financial_semantics.md`; the Dentrix Enterprise 11.0 Reports Reference (https://www.ihs.gov/doh/edr/documents/Dentrix_Enterprise_11.0_Reports_Reference.pdf) could not be fetched in this pass `[unverified]`.
