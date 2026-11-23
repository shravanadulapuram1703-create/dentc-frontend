# Legacy (Denticon) report outputs — Daily Reports and My Reports

Research input for the Reports & Analytics module plan. Researched 2026-11-22.

**Question answered:** for each report in the legacy `Daily Reports` (12) and `My Reports` (5) menus, what does the
generated report actually contain — purpose, columns, grouping, subtotals / totals, what each criterion changes, who runs
it and when, and known quirks. We hold screenshots of the criteria screens only; this file reconstructs the outputs.

Sibling documents (not repeated here): `denticon_analytics_and_dso.md` (menu structure, My Favorites, security rights,
recommended routines, DPA), `dental_kpi_dictionary.md`, `compliance_and_financial_semantics.md`.

---

## 0. Method, evidence tags, confidence scale

| Tag | Meaning |
|---|---|
| `[Pn]` | Planet DDS Help Center article text (read in full through the Help Center's public article API — the HTML pages return 403 to fetchers). |
| `[Pn·img]` | Read from a screenshot or sample-report image embedded in that article. Unlike the earlier research pass, the embedded images **were** opened; they include real report outputs dated 2010–2026. |
| `[Tn]` | Third-party page about Denticon (analytics vendor guide, DSO helpdesk). `[Tn·img]` = its screenshot of Denticon. |
| `[Cn]` | Comparable system documentation (SoftDent, Dentrix, Dentrix Ascend, Open Dental, WinOMS) or general bookkeeping reference. Used only for INFERRED items. |
| `[L1]` `[L2]` | Our verified criteria transcriptions: `legacy/daily_reports.json` and `legacy/my_reports.json` (the latter appeared during this work and matches the two first-reader transcriptions on all 48 controls). |
| **(S)** | Seen only as a search-result summary. Lower confidence. |
| **[unverified]** | No source; analyst inference. Do not treat as fact. |
| **[conflict]** | The vendor's own documents disagree. |

Confidence rating per report:

- **DOCUMENTED** — the output layout was seen in a vendor screenshot, or is described column by column in vendor text.
- **PARTIALLY DOCUMENTED** — purpose and some output facts are documented; a variant or the exact column list is inferred.
- **INFERRED** — no vendor description of the output; reconstructed from the criteria screen plus a named comparable report.

Could not be read: `M13 End of Day Reporting.pdf` (17 MB, over the fetch limit) `[P53]`; the three report webinars (video
only, no captions) `[P53]`; a DSO training page on a login-gated Google Site; the Dentrix Enterprise 11.0 Reports
Reference (TLS error) `[C9]`. Sample images are several UI generations old in places — the year of each sample is given.

Report names, option names and column headers are reproduced exactly (they are identifiers). Everything else is paraphrased.

---

## 1. What planners most need to know

1. **Layout evidence now exists for 13 of the 17 reports** (section 2). Still reconstructed: `Peg Board Day Sheet`,
   `Claims Printed`, `Missing Progress Notes`, and the column layout of `Scheduled Production`.
2. **Each menu item is a report family.** The printed title changes with the criteria: `Daily Journal - Detail`,
   `Daily Journal - Summary`, `Production by Codes`, `Production by Codes - Provider`, `Production by Provider`,
   `Collection Report by Code - Detail`, `Collection Report By Provider - Detail`, `Patient Progress Notes` `[P4·img][P8·img][P9·img][P10·img][P12·img][T1·img][P27·img]`.
3. **One page furniture everywhere:** practice-group name, report title, `Office : <name>` sections, and a footer that
   echoes the criteria (`From`, `Thru`, `Offices`, `Providers`, `Codes`, `Users`, starred option notes), `Printed :`
   timestamp, `PlanetDDS (c) 2003 - <year>`, `Page : n of m` (section 3.1).
4. **Money is signed by A/R impact:** charges positive, payments negative, adjustments carry their own sign. The
   recurring summary block is `Est. Pat. | Est. Ins. | Total` with sections `Charges`, `Payments`, `Adjustments` (section 3.2).
5. **Production adjustments print as charges.** An adjustment whose `Sub Type` is `Production` appears in the `Charges`
   column of the Daily Journal and under `Total Production Adjustments` on the Production Report `[P4][P13][P10·img]`.
6. **Criteria are dynamic.** Sections appear, disappear or unlock with other choices (`PROVIDERS` picker, `SORT BY`,
   `Page Break by Provider`, `Include Z-Codes`, `CHECK TYPE`, `GROUP BATCH CHECKS`). Our default-state screenshots miss these (section 6).
7. **Our `Special Transaction Report` transcription is short one row:** a `Sort By` (`Patient LastName` / `Patient ID` /
   `Date`) row sits below `Group By` `[P35][P36·img]`.
8. **`Routing Slip` is a one-page patient face sheet**, not a list: demographics, alerts, recalls, visit counts, aging grid,
   primary / secondary coverage, ortho plan, flash alerts, procedure codes `[P25·img]`.
9. **`Daily Audit` is an exception list whose success state is an empty report**; only procedure codes flagged
   `Visit Code` count as a ledger transaction `[P32][P33]`.
10. **`My Reports` are restricted self-service variants** of five reports, driven by the user's `Report Access Provider` `[P40]`.
11. **Legacy defects worth not copying:** ratio totals that are not ratios (`Eff. Rate $`), three different meanings of
    "Provider", two conflicting goal sources for `Scheduled Production`, a layout-preserving Excel export with merged
    cells, an option named `Exclude Patient Type` documented as an include filter (section 9).

---

## 2. Confidence summary

| # | Report (exact name) | Menu | Confidence | Best evidence | Comparable used |
|---|---|---|---|---|---|
| A1 | `Peg Board Day Sheet` | Daily Reports | INFERRED | Glossary definition `[P3]`; criteria `[L1]` | SoftDent `Daysheet` `[C1]`; Dentrix `Day Sheet (Charges and Receipts)` `[C2]`; pegboard day sheet `[C8]` |
| A2 | `Daily Journal` | Daily Reports | DOCUMENTED | Detail and Summary samples, 2022 / 2024 `[P4·img][P5·img][P6·img]` | — |
| A3 | `Production Report` | Daily Reports | DOCUMENTED (Code, Provider); PARTIALLY (Category, Carrier, Detail) | Samples 2010 / 2016 / 2022 / 2023 `[P8·img][P9·img][P10·img][T1·img]` | — |
| A4 | `Collection Report` | Daily Reports | PARTIALLY DOCUMENTED | By Code sample `[P12·img]`; By Provider tail `[T1·img]` | — |
| A5 | `Deposit Slip` | Daily Reports | DOCUMENTED | Samples 2012 / 2020 / 2022 `[P16·img][P17·img][P18·img][T1·img]`; options `[P14]` | — |
| A6 | `Scheduled Production` | Daily Reports | PARTIALLY DOCUMENTED | Three figures defined `[P21][P22]`; layout not seen | Dentrix Ascend scheduled-production reports `[C3]` |
| A7 | `Routing Slip` | Daily Reports | DOCUMENTED | Sample 2023 `[P25·img]`; info tooltip `[P23·img]` | — |
| A8 | `Progress Notes` | Daily Reports | PARTIALLY DOCUMENTED | Detail samples (2010) `[P27·img]`; Unsigned / Missing not seen | — |
| A9 | `Production Analysis Report` | Daily Reports | DOCUMENTED (columns in text) | `[P31]` | — |
| A10 | `Daily Audit` | Daily Reports | DOCUMENTED (columns in text) | `[P32][P33]` | — |
| A11 | `Claims Printed` | Daily Reports | INFERRED | Criteria `[L1]`; Denticon `Claims Listing` sample `[P39·img]` | WinOMS `Claim Submission` `[C7]`; Open Dental `Claims Not Sent` `[C6]` |
| A12 | `Special Transaction Report` | Daily Reports | DOCUMENTED | PDF and Excel samples 2025 `[P36·img][P37·img]`; options `[P35]` | — |
| B1 | `Daily Journal` | My Reports | PARTIALLY DOCUMENTED | Same layout as A2; restriction rule `[P40]` | — |
| B2 | `Time Clock Report` | My Reports | DOCUMENTED (Detail); text only for the other two formats | Sample 2020 `[P41·img][P42·img]`; `[P41]` | — |
| B3 | `Missing Progress Notes` | My Reports | INFERRED | Criteria `[L2]`; `[P1][P2]` | Daily Audit `[P32]`; Open Dental incomplete-note report [unverified] |
| B4 | `Appointment Detail by User` | My Reports | PARTIALLY DOCUMENTED | Parent `Appointment Detail` sample 2026 `[P45·img]` | — |
| B5 | `Production Report` | My Reports | DOCUMENTED by reference to A3 | `[P40]`; A3 samples | — |

---

## 3. Cross-cutting output conventions

### 3.1 Viewer, page furniture, export

| Aspect | Observed behaviour | Source |
|---|---|---|
| Criteria screen | `denticon.com/ASPX/NewReports.aspx?RptName=Daily%20Reports` (also `My%20Reports`, `Management%20Reports`, `Appointment%20Reports`, `Search%20Report`). Left `SELECT REPORT` radio grid, right `REPORT CRITERIA`, `CLEAR CRITERIA`, `PRINT / PREVIEW`, `ADD TO MY FAVORITES` (shown as `UPDATE MY FAVORITES` when opened from a favorite). The redesigned menu is documented from October 2021; the Daily Reports list is the same 12 items in 2021, 2023 and 2025 screenshots. | `[P11·img][P7·img][P36·img][P15·img]` |
| Report window | Opens a separate `Report Viewer` window at `reports.denticon.com/ReportViewer/ReportFrame.aspx?rptPath=/PoWReports/<ReportName>&args=<semicolon-separated values>` (hosts `r1.`, `reportsazvm.`; folders `PoWReports`, `PoWReportsBeta`, `PoWReportsPrm`, `PoWReports004`). PDF is shown in the browser PDF viewer with an `Export to:-` bar (Word icon; an older shot also has Excel). | `[P16·img][P4·img][P36·img][T1·img]` |
| Internal report names | `NewDlyJournalS` (Daily Journal - Summary), `NewDlyJournalDByTransP…` (Daily Journal - Detail), `NewDlyDepSlip` (Deposit Slip), `NewDlyRoutingSlip2` (Routing Slip), `DlySpecialTransactionRpt` / `…RptXls` (Special Transaction Report), `ProductionByCode` (Production by Codes [- Provider]), `DlyCollD` (Collection Report … Detail). One definition per criteria variant, separate definition for Excel. | same images |
| Header | Line 1 practice-group name, line 2 report title (varies with criteria), then `Office : <office name>` as the outer group on multi-office reports. | all samples |
| Footer | Criteria echo: `From` / `Thru` (or `Transaction From` / `Transaction Thru`, `From Appt Date`), `Offices` (OIDs), `Providers`, `Codes`, `Users`, `Operatories`, `Payment Types`, `Check Type`, `FeeID`; starred notes for options (`* Includes UCR`, `* Show Patient`, `* Show Responsible Party`, `* With Adjustments(Collection)`, `* Detail Report`); report title; `Printed : <date time>`; `PlanetDDS (c) 2003 - <year>`; `Page : n of m`. `Special Transaction Report` echoes criteria at the **top** instead. | `[P8·img][P9·img][P16·img][P45·img][T1·img][P36·img]` |
| `PRINT FORMAT` = `Excel` | Downloads a file (`Denticon_DlySpecialTransactionRptXls`; the article calls it a CSV in Excel format). The sheet keeps the report layout: merged title cells, header and footer rows, static totals, columns spread over non-adjacent spreadsheet columns. Users are told to unmerge the title and replace totals with formulas when combining files. | `[P37][P37·img][P49]` |
| Size / freshness | Very large outputs fail with a "file size is too large to download" message; the documented workaround is smaller ranges (six months, three offices, three payment types) stitched in Excel. Reports come from a separate Report Server that can lag behind entry. | `[P49][P50]` |
| Rights | `Reports - Daily Reports Screen Full Control` (run) / `View Only` (see list and parameters only); `Reports – My Reports – Full Control`. | `[P52][P12][P40]` |

### 3.2 Money conventions

| Convention | Detail | Source |
|---|---|---|
| Sign | Charges positive; payments negative; adjustments signed by effect on the balance (credit adjustments and write-offs negative; refunds, reversals, finance / contract charges positive). Collections KPIs are obtained by adding absolute `Total Payments` and `Total Adjustments`. | `[P4·img][P12·img][T1·img][T1]` |
| Deposit Slip | Prints payments as positive amounts. | `[P16·img][P17·img]` |
| Summary block | Columns `Est. Pat.` / `Est. Ins.` / `Total`: charges split into estimated patient and estimated insurance portions; payments fall in the patient or insurance column by payer. Sections `Charges` (line `Services` plus one line per production adjustment code → `Total Charges :`), `Payments` (one line per payment code → `Total Payments :`), `Adjustments` (one line per adjustment code → `Total Adjustments :`). | `[P4·img][P5·img][P6·img][T1·img]` |
| Adjustment classes | `Setup > Payment/Adjustment Types`: `Type` (Payment / Adjustment), `Sub Type` (`Production` / `Collection`, or for payments e.g. `Third Party Financing`), `Class` (e.g. `Care Credit`). Four combinations: Prod −, Prod +, Coll −, Coll +. Production adjustments change charges, net production, provider production reports; collection adjustments change income and collection reports. The description text has no effect. | `[P4][P13][P20]` |
| Procedure flags | `Visit Code` (counts as a tracked visit), `Ledger Code` (posts to ledger), `A/R Code` (appears on A/R reports; a ledger code that is not an A/R code posts with zero fee). `Z` codes are office-defined codes (retail products, non-treatment items such as broken-appointment fee). | `[P34][P33][T1·img]` |
| UCR | The office's standard fee; `UCR` columns use the office default UCR fee schedule, or the schedule chosen in `Fee Schedule To Compare`. | `[P12][P8·img]` |

### 3.3 Shared vocabulary

**Dates**

| Date basis | Meaning | Used by |
|---|---|---|
| `Transaction Date` | Ledger date of the line; normally the posting date but editable `[P14]`. The glossary and the Special Transaction article call it the date entered `[P51][P35]` **[conflict]**. | Daily Journal, Deposit Slip, Special Transaction Report |
| `Created Date` | System entry timestamp; not editable; payment allocation follows it, which is why back-dated payments land in a later period on allocation reports `[P51]`. | Daily Journal |
| `Payment Date` | The date a payment applies to; editable for back-dated payments `[P14]`. | Deposit Slip |
| `Service Date` | Date the service was completed; differs from the transaction date when back-dated `[P35]`. | Special Transaction Report |
| `DOS Date` / `Created On Date` / `Appointment Date` | Note date of service / note entry date / appointment date. | Progress Notes, Appointment Detail by User |
| `Report Date` | Single day. | Peg Board Day Sheet |

**"Provider" means different things per report**

| Report | Provider semantics | Source |
|---|---|---|
| Daily Journal | `Prdr` = provider on each ledger line (one patient's payments can split across two providers). | `[P4·img]` |
| Production Report | Provider of record on the procedure (the `Prdr` column of the Ledger). | `[P8]` |
| Special Transaction Report | `Tran Prdr` / `Transaction Provider`. | `[P36·img][P37·img]` |
| Collection Report | Provider on the payment line; whether it is the transaction or the allocation provider is not stated [unverified]. | `[T1]` |
| Progress Notes | Picker is labelled `Preferred Provider`. | `[L1][P27·img]` |
| Daily Audit | Article says the provider is the Preferred Provider, and defines the column as provider on transaction date **[conflict]**. | `[P32]` |
| Appointment Detail | Group header = appointment provider; separate column `Pref Provider`. | `[P45·img]` |
| Glossary | "Provider" in reports = the patient's preferred dentist, not the treating clinician. | `[P51]` |

**Patient type is two concepts:** `PATIENT TYPE` `Both / General / Ortho` (Daily Journal) is the ortho-patient flag `[L1][P25]`;
`EXCLUDE PATIENT TYPE` (Special Transaction Report) and the `Pat Type` column are the user-defined patient types, printed as
comma-separated abbreviations `[P32][P37·img]`.

**Office / Office Group:** `Office` = one or more offices picked from all offices the user can access (default the
logged-in OID); `Office Group` = groups from `Setup > Office Groups` (default ALL) `[P14][P32]`.

**Picker dialogs (`SELECT`)** `[P11·img]`: `SEARCH OFFICES` — `INCLUDE ALL` checkbox, `SORT BY` (`Office Name` / `Office ID`),
`SEARCH TEXT` + `CLEAR SEARCH`, dual list `OFFICE` → `SELECTED OFFICE` with `>>` / `<<`, Ctrl+click multi-select, a note that the
report prints only for offices the user can access, `APPLY` / `CANCEL`. `SEARCH CODE` — `INCLUDE ALL`, `CATEGORY` radios
(`Diagnostic`, `Restorative`, `Periodontics`, `Maxilo Prosth`, `Prosth. fixed`, `Orthodontics`, `Other`, `Preventive`,
`Endodontics`, `Prosth. remov`, `Implant Serv`, `Oral Surgery`, `Adjunct Serv`, `All Medical`), `SORT BY` (`Code` / `Desc`),
dual list `CODE` → `SELECTED CODE`. With `INCLUDE ALL` ticked the lists are disabled and the criteria box shows `ALL`. These 14
categories are presumably the domain of every `Category` option below [unverified].

---

## 4. Daily Reports (`daily_reports`)

### A1. Peg Board Day Sheet

**Confidence: INFERRED** (output). Purpose is PARTIALLY DOCUMENTED.

**What the vendor documents.** Only a glossary entry: a Day Sheet is a report of all transactions recorded for the day;
its paper predecessor tracked patient accounts receivable — what was collected and what the patient still owed — and was
held on a peg board `[P3]`. The report is absent from the recommended end-of-day list `[P1]`, from "Denticon Reporting
101" `[P2]` and from the 24 articles of the Daily Reports section `[P55]`; Help Center searches for the name return nothing else.

**Criteria `[L1]`:** `PRINT FORMAT` (PDF / Excel), `OFFICE/GROUP`, `PROVIDER` (ALL), `REPORT DATE` — one date, default today.
No transaction-type filter, no format, no grouping, no sort. The single date is the distinguishing feature.

**Inferred output** (from the pegboard form, SoftDent `Daysheet`, Dentrix `Day Sheet (Charges and Receipts)`):

| Block | Likely content | Basis |
|---|---|---|
| Posting lines | One row per posting on the report date: patient / account (ID, name), provider, code and description, previous balance, charge, payment, adjustment, new balance | Pegboard columns: previous balance, charges, payments, adjustments, new balance `[C8]`; SoftDent main section (`ID and Name`, `Dr`, `Code and Description`, `Prod`, `Charges`, `Prod Adj`, `Cash`, `Check`, `Credit`, `Pay Adj`) `[C1]` |
| Day totals / proof of posting | Column totals and the check `previous balance + charges − payments − adjustments = new balance` | `[C8]` |
| A/R control | Previous receivables total, today's change, new receivables total | SoftDent `Previous Receivables Total` / `Today's Receivables` / `New Receivables Total` `[C1]` |
| Provider recap (possible) | Production, adjustments, collections per provider | SoftDent `Provider Summary` `[C1]`; Dentrix Ascend day sheet by organisation / location / provider `[C3]` |

**Nearest Denticon-documented relative:** `Executive Day Sheet` (Monthly Reports). One row per transaction type — `Services`,
then every adjustment / fee code — with columns `Type` | `Production` | `Collections` | `Adjustments` | `A. R. Impact`, per
`Office :`, date range, footer `From` / `Thru` / `Office` `[P48·img]`. It is the documented way to see money per adjustment
code and sales tax collected `[P48]`. Its `A. R. Impact` column supports the reading that "day sheet" reports in this product
are about balance movement.

| Criterion | Expected effect [unverified] |
|---|---|
| `Report Date` | One closed day; balance-forward logic is only meaningful for a single day |
| `Provider` | Limits postings to the chosen provider(s); totals no longer tie to office A/R |
| `Office/Group` | One sheet per office plus a group total |

**Who / when:** bookkeeper or office manager at end of day, as the paper-era balancing sheet [unverified]. Dentrix guidance
for the equivalent report is to match it against analytics using procedure date `[C2]`.

**Sources:** `[P3][P1][P2][P48][L1][C1][C2][C3][C8]`.

---

### A2. Daily Journal

**Confidence: DOCUMENTED** (both layouts seen); three options unverified.

**Purpose.** Snapshot of charges, payments and adjustments for a date or range, for one office or an office group, in a
`Summary` and a `Detail` version `[P4]`. It is the vendor's primary end-of-day check: day's production = Detail with only
`Services`; day's collection = Detail with only `Payments`; multi-office and by-provider variants `[P1]`.

**Detail layout** — title `Daily Journal - Detail` `[P4·img][P5·img]`:

| # | Column | Content |
|---|---|---|
| 1 | `Pat ID/ Chart #` | Patient identifier |
| 2 | `Patient Name` | |
| 3 | `Prdr` | Provider short ID on the ledger line |
| 4 | `Code` | Procedure code, or the payment / adjustment code |
| 5 | `Description` | Code description |
| 6 | `Th` | Tooth |
| 7 | `Surf` | Surface |
| 8 | `UCR` | UCR fee of the procedure (0.00 on payments and adjustments) |
| 9 | `Charges` | Services, **and production adjustments** (signed) |
| 10 | `Payment` | Payments (negative) |
| 11 | `Adjust` | Other adjustments (signed) |
| 12 | `User` | User who entered the line |

Grouping and totals: `Office : <name>` → `Transaction Date: <date>` → lines → `Total for, <date>` (`UCR`, `Charges`, `Payment`,
`Adjust`) → `Total for Office : <name>` → `Summary for <office>` (the `Est. Pat.` / `Est. Ins.` / `Total` block of section 3.2) →
`Grand Total :` → `Grand Total Summary :`.

**Summary layout** — title `Daily Journal - Summary` `[P4·img][P6·img]`: per `Office :` only the `Est. Pat.` / `Est. Ins.` /
`Total` block (`Charges`, `Payments`, `Adjustments` with one line per code and a total line each), then `Grand Total Summary :`.
No patient names `[P6]`.

Observed in samples: a charge can print as two lines for one procedure, suffixed `- Patient` and `- Pri Ins.`, each with its
own amount and entering user (ortho contract billing) `[P5·img]`; a contract-billing debit prints in `Adjust` with a positive
amount `[P4·img]`.

| Criterion `[L1]` | Effect on output | Source |
|---|---|---|
| `REPORT FORMAT` Detail / Summary | Line listing with names vs code-level totals | `[P4][P6]` |
| `OFFICE/GROUP` | One `Office :` section per office, then grand totals | `[P4·img][P1]` |
| `Provider`, `User` pickers | Restrict lines by `Prdr` / by entering `User` | `[P2][P1]` |
| Date basis `Transaction Date` / `Created Date` | Which date selects and groups the lines; `Created Date` reproduces the old `Daily Journal by User – Detail (by created date)` and catches back-dated entries | `[P1][P40]` |
| `PATIENT TYPE` Both / General / Ortho | Ortho-flagged patients only, or excluded [unverified] | `[L1]` |
| `TRANSACTION TYPES` Services / Payments / Adjustments | Removes the unticked classes from lines and summary | `[P5][P6][P1]` |
| `Show AR` (greyed) | Greyed in every screenshot seen (Detail, Office, any transaction mix). On the Executive Summary the same option appends Total A/R; enabling rule here unknown [unverified] | `[L1][P5·img][P7·img][P54]` |
| `Include Resp. Party Type` | Adds the responsible-party type to each line [unverified] | `[L1]` |
| `Show Datewise Summary` | Adds a per-day recap when the range spans several days | `[P5]` |
| `GROUP BY` None / Provider / User (+ `Page Break`) | Sections per provider or per user (old `Daily Journal by Provider`, `Daily Journal by User – Detail`); page break only when grouped | `[P1][P2][L1]` |

**Who / when** `[P2][P1][T2]`: front office and clinical staff daily at end of day as `Daily Journal by Provider - Detail`
(find providers with charges who did not work; confirm services are what each doctor normally performs; exclude payments;
pick only providers who worked today); management daily / weekly as `Daily Journal - Summary` by office or group. One DSO runs
it each morning to correct providers and again at night for collection, production and adjustment totals `[T2]`.

**Quirks:** production adjustments in `Charges` is expected behaviour; if an adjustment with `Sub Type` `Collection` shows
there, the vendor asks for a ticket `[P4]`. Recent entries can be missing while the Report Server lags `[P50]`.

**Sources:** `[P1][P2][P4][P5][P6][P7][P13][P40][P54][T2][L1]`.

---

### A3. Production Report

**Confidence: DOCUMENTED** for `Production By` Code and Provider; **PARTIALLY DOCUMENTED** for Category, Carrier and the Detail format.

**Purpose.** Completed procedures posted to the ledger in the date range, plus production adjustments; no payments, no
collection adjustments, no scheduled work `[P8]`. The posting date decides the period `[P47]`. One report replaced
`Production by Provider Detail`, `Production by Provider Summary`, `Production by Codes`, `Production by Codes - Provider` and
`Production by Category` `[P11][P2]`.

**Layouts seen**

| Variant (title) | Columns, left to right | Grouping and totals | Source |
|---|---|---|---|
| `Production by Codes` (By Code, no grouping) | `Code`, `Description`, `#Perf`, `Charges $`, `Avg $`, `Total Dur. (Units)`, `Avg. Dur. (Units)`, `Eff. Rate $`, `Per %` | `Office : <name>` → code rows → `Total for, <office> [ <OID> ] :` → `Total Production Adjustments :` | `[P9·img]` (2022) |
| `Production by Codes - Provider` (By Code, Group By Provider) | Same, plus a compare-fee column after `Charges $` when `Include UCR` is on | `Provider :- <name>` → code rows → `Total for <provider> :` → that provider's `Total Production Adjustments :` with one line per adjustment code → `Grand Total :` → overall `Total Production Adjustments :` list | `[P10·img]` (2010), `[T1·img]` (2023) |
| `Production by Provider` (By Provider, Summary) | `Provider`, `ShortID`, `#Perf`, `Charges $`, compare-fee column (headed with the fee schedule name), `Avg $`, `Total Dur. (Units)`, `Avg. Dur. (Units)`, `Eff. Rate $`, `Per %` | One row per provider → `Total :` | `[P8·img]` (2016) |

Column definitions `[P8]`, checked against the samples:

| Column | Definition |
|---|---|
| `#Perf` | Count of procedures |
| `Total Dur.` | Sum of the `DUR` (duration) units entered on the Treatment Plan or Transaction screen; defaults to 0 |
| `Avg. Dur.` | `Total Dur.` ÷ `#Perf` |
| `Eff. Rate $` | `Charges` ÷ `Total Dur.`; rows with zero duration show the charge amount itself `[P8·img][P9·img]` |
| `Avg $` | `Charges` ÷ `#Perf` |
| `Per %` | Row charges ÷ charges of its group; a provider total row shows provider ÷ grand total (sample arithmetic confirms) `[P8·img][P10·img]` |
| Compare-fee column | Count × fee from `Fee Schedule To Compare`; footer shows `FeeID` and `* Includes UCR` `[P8·img][P10]` |

**Dynamic criteria** (not visible in our default-state screenshot):

| State | Changes | Source |
|---|---|---|
| `PRODUCTION BY` = Code | `REPORT FORMAT` locked to Summary; `CODES` picker; `GROUP BY` None / Provider / Carrier available; `Include UCR` available; `Include Z-Codes` and `Fee Schedule To Compare` unlock when `Include UCR` is ticked | `[P11·img][P10·img][T1·img]` |
| + `GROUP BY` = Provider | Checkbox reads `Page Break by Provider` (ticked in the sample); a `PROVIDERS` picker appears beside `CODES` | `[T1·img]` |
| `PRODUCTION BY` = Provider (seen with `Detail` selected) | `Detail` becomes selectable; `GROUP BY` Provider / Carrier greyed; `CODES` replaced by `PROVIDERS`; new `SORT BY` (`Transaction Date` / `Patient Lastname`); `Include UCR`, `Include Z-Codes` greyed | `[P11·img]` |
| `PRODUCTION BY` = Category / Carrier | Not seen; expect category / carrier pickers [unverified] | — |

| Criterion | Effect on output | Source |
|---|---|---|
| `PRODUCTION BY` Code / Provider / Category / Carrier | Row dimension and title | `[P11][P8]` |
| `REPORT FORMAT` Detail | Itemises each completed procedure per provider (old `Production by Provider Detail`); columns not seen — expect date, patient, code, tooth, surface, charge [unverified] | `[P11]` |
| `GROUP BY` Provider / Carrier | Outer sections with their own totals and adjustment lists | `[P10·img]` |
| `Include UCR` + `Fee Schedule To Compare` | Adds the compare-fee column. Used to price production at a "provider pay" fee schedule | `[P10]` |
| `Include Z-Codes` | Includes office-defined `Z…` codes as rows | `[T1·img][P34]` |
| `OFFICE/GROUP` | One `Office :` section per office; Office Group gives the enterprise view | `[P9][P9·img]` |

**Who / when** `[P2][P8][P10][T1]`: management monthly / quarterly / yearly (by code: number of codes rendered and charges per
code for fee negotiation; by code by provider: revenue mix and clinical coaching; by category: high-level mix); offices that
pay on production daily. An analytics vendor reconciles net production as `Grand Total` charges plus `Total Production
Adjustments` `[T1]`.

**Quirks:** accuracy depends on the right provider on each procedure and on durations being entered `[P8]`; production totals
cannot be compared with Income Allocation `[P47]`; total-row `Eff. Rate $` is a true ratio in the by-provider sample but an
accumulated, meaningless figure in by-code samples `[P8·img][P9·img][T1·img]`.

**Sources:** `[P2][P8][P9][P10][P11][P34][P47][T1][L1]`.

---

### A4. Collection Report

**Confidence: PARTIALLY DOCUMENTED** (By Code layout seen; By Provider summary tail seen; None / Carrier / Summary inferred).

**Purpose.** Money collected in a date range, optionally with collection adjustments, by provider, carrier or code `[P12]`.
Formerly `Daily Collection` (recommended daily as Detail, `Collection by: Provider`) `[P1]`.

**By Code** — title `Collection Report by Code - Detail` `[P12·img][P12]`:

| Column | Definition |
|---|---|
| `Code` | Procedure or adjustment code that was collected against |
| `Descr` | Description |
| `# Perf` | Times performed in the range |
| `UCR` | Office default UCR fee (ADA codes only) |
| `Amount` | Amount charged |
| `Est Ins` | Estimated insurance payment |
| `Payments` | Paid by patients (negative) |
| `Ins. Pay` | Paid by insurance (negative) |
| `Adjust` | Adjustment applied to the code |

Grouping: `Office : <name>` → one row per code → `Total:`. Because rows are the codes collected against, this variant
presumably depends on payment allocation to procedure lines [unverified].

**By Provider** — title `Collection Report By Provider - Detail` `[T1·img]`: provider sections with payment lines (the
one-office sample run was 188 pages), ending in a summary block listing each payment code with patient / insurance / total amounts →
`Total Payments :`, then `Adjustments` listing each collection adjustment code → `Total Adjustments :`. Footer: `Offices`,
`Provider`, `Payment Type`, `* With Adjustments(Collection)`. Detail line columns were not visible [unverified]. Comparable
for the unseen variants: Open Dental `Daily Payments` — columns `Date`, `Paying Patient`, `Provider`, `Clinic`, `Check#`,
`Amount`; insurance and patient payments in separate sections, grouped by payment type with a subtotal each `[C4]`.

| Criterion `[L1]` | Effect on output | Source |
|---|---|---|
| `REPORT FORMAT` Detail / Summary | Lines vs totals only [unverified for Summary] | `[P1]` |
| `Payment Types` picker | Restricts to chosen payment codes | `[P49]` |
| `COLLECTION BY` None / Provider / Carrier / Code (+ `Page Break`) | Grouping dimension and title; By Code changes the column set | `[P12]` |
| `Include Adjustments(Collection)` (default on) | Adds collection adjustments and the footer note | `[T1·img]` |
| `OFFICE/GROUP` | One section per office | `[P1]` |

**Who / when:** end of day with the Daily Journal payments run `[P1]`; analytics reconciliation = payments total + collection
adjustments total, office-wide and per provider `[T1]`.

**Quirks:** no provider picker on the base screen `[L1]`; a full-year, all-office run is the vendor's own example of the
file-size failure `[P49]`; totals cannot be compared with Income Allocation because allocation follows procedures, not
deposits `[P47]`. A separately documented "Daily Collections Report" (patients scheduled on a date with balances due) is a
different report; which product it belongs to is unclear **(S)** `[P58]`.

**Sources:** `[P1][P12][P47][P49][P58][T1][L1]`.

---

### A5. Deposit Slip

**Confidence: DOCUMENTED.**

**Purpose.** Shows income for a time range by income type; used daily to prove the amount deposited to the bank and to
check that all cash and all posted checks are present; also the way to find a check number (browser find) `[P14][P15][P16][P2]`.
One report replaced `Deposit Slip`, `Deposit Slip - Credit Card`, `Deposit Slip - Care Credit` and `Deposit Slip - Direct Deposit` `[P17][P18][P19]`.

**Layout** `[P16·img]` (2020), `[P17·img][P18·img]` (2012), `[T1·img]` (2022):

| Block | Content |
|---|---|
| Header | Practice name; title `Deposit Slip`; office name, address, phone; run date in long form; older variants an `Account No :` line |
| Section per payment type | e.g. `Checks`: columns `Patient`, `Bank #`, `Check #`, `Amount`. Card and financing sections: `Patient Name (Chart #)`, `Amount`, sub-headed by payment code |
| Date groups | `Transaction Date: <date>` (older: `Date :`) → lines → `Total Checks, <date>:` |
| Totals | `Total for <payment code> :`, `Grand Total For Checks:`, `Grand Total:` |
| Footer | `Transaction From` / `Transaction Thru`, `Payment Types`, `Offices`, `Providers`, `Users`, `Check Type`, `* Show Patient` or `* Show Responsible Party` |

| Criterion | Effect on output | Source |
|---|---|---|
| `Provider`, `User` | Both filters always apply | `[P14]` |
| Date basis `Transaction Date` / `Payment Date` | Ledger date vs the date the payment applies to (back-dated payments) | `[P14]` |
| `PAYMENT TYPES`: `Cash` (default), `Check`, `Credit Card`, `CareCredit`, `Direct Deposit`, `Internal Financing`, `None` | One section per ticked type; `None` = payment types whose type field is blank. Mapping comes from `Setup > Payment/Adjustment Types` | `[P14][L1][T1·img]` |
| `CHECK TYPE` Both / Patient Checks / Insurance Checks | Enabled only when `Check` is ticked; patient checks are those posted in Transaction Entry, insurance checks those posted in the Insurance Payment screen | `[P14][T1·img]` |
| `GROUP BATCH CHECKS` → `Batch ID(Batch Insurance Payment)` / `Check#` | Enabled by its own checkbox; expected to collapse a bulk insurance check into one line per batch or check number [unverified output] | `[P14][L1]` |
| `OTHER OPTIONS` `Show Responsible Party` (default) / `Show Patient` / `None` | Name shown per payment: family, patient account, or no names (totals only) | `[P14]` |

**Who / when:** front office, every end of day, all payment types or one at a time `[P2][T2]`; one DSO compares it with the
card processor's report for balancing `[T2]`; analytics deposit amount = `Grand Total` with all types ticked `[T1]`.

**Quirks:** a payment code only appears under a type if its `Sub Type` / `Class` are set — a legacy `PMT PAT-Care Credit`
code with blank `SubType` never reaches the CareCredit section and cannot be re-typed once used; the fix is a new code
(`Type` Payment, `SubType` Third Party Financing, `Class` Care Credit) `[P20]`. "Show Cash" in older guidance is today's
`Cash` checkbox `[P2]`.

**Sources:** `[P2][P14][P15][P16][P17][P18][P19][P20][T1][T2][L1]`.

---

### A6. Scheduled Production

**Confidence: PARTIALLY DOCUMENTED** (figures defined; layout not seen).

**Purpose.** Compares scheduled production, actual production and the daily / monthly goal `[P21]`; projects revenue for
future days and exposes slow days — "total production dollars on schedule for future dates" `[P2]`. Formerly
`Daily Scheduled Production`, in the "prepare for tomorrow" group `[P1]`.

| Figure | Definition | Source |
|---|---|---|
| Scheduled Production | Total of the procedures attached to appointments | `[P21]` |
| Actual Production | Total of procedures posted to the ledger | `[P21]` |
| `Estimated Prod.` (Estimated Production) | Monthly goal ÷ 20 (assumed working days) `[P21]`; or the monthly `Production` goal ÷ the provider's working days `[P22]` **[conflict]** | `[P21][P22]` |

Goal sources **[conflict]**: `Setup > Providers > Provider Goals` (per office and month: `Daily Goal` × `Working Days` =
`Monthly Goal`, `AUTOFILL`, `Open Saturdays ?` / `Open Sundays ?`) is named by `[P21]`, but the newer FAQ says that screen feeds
Practice Analytics while this report reads `Setup > Providers > Per Office Settings > Production` (`Production Goals`, one
amount per month per provider and office); an entry in one does not update the other `[P22][P21·img][P22·img]`.

**Inferred layout:** one row per provider (and per day when the range spans days) with scheduled, actual and estimated
amounts and office totals [unverified]. Comparable: Dentrix Ascend `Scheduled Production - Today`, `… - Remaining Month`,
`Scheduled Production By Month Report` (gross scheduled production = sum of charges of scheduled procedures, by provider) `[C3]`.

**Criteria `[L1]`:** `PRINT FORMAT`, `OFFICE/GROUP`, `PROVIDER`, `DATE RANGE` only — no grouping or format options.

**Who / when:** front office daily; management weekly for the coming week `[P2]`.

**Sources:** `[P1][P2][P21][P22][C3][L1]`.

---

### A7. Routing Slip

**Confidence: DOCUMENTED** (sample output and the info tooltip seen).

**Purpose.** A per-patient sheet for each appointment, printed at end of day for the next day, carrying what staff need
when the patient arrives `[P2][P1]`. Also printable for one patient from the Patient Overview (`Print Reports > Routing Slip`)
and from the Scheduler (right-click `Print > Routing Slip`, with `Current appointment only` / all appointments in the day for
the current location / for all locations, an `Appointment Date` and `Include Completed Procedures`) `[P23][P24·img]`.

**Layout** — title `Routing Slip`, `OP:` (operatory) top right `[P25·img]` (2023):

| Section | Fields |
|---|---|
| `Patient Information` (`Pat ID`, `Office`) | Name, address, `DOB`, `Age`, `Pat Since`, `Sex`, `Pat Type`; `Ref by`, `Ref Type`, `# of Ref`, `Lst Ref`, `Lst Ref Amt`; phones (H) (C) (W); `Email`; `Med Alerts` box; `Pat Notes` box |
| `Scheduled Appointment` | `Date`, `Time`, `Provider`, `Reason`, `Appt Notes` |
| `Recalls` | Grid `Date`, `Sche. Dt.`, `Reason` |
| `Next Appointment` | `Date`, `Time`, `Prdr` |
| `Visits` | `First Visit`, `Last Visit`, `Last Missed`, `#Missed`, `#Cancelled` |
| `Preferred` | `Provider`, `Hygienist` |
| `Responsible Party` | Name, address, phones |
| `Billing Information` | `Billing Type`; `Last Stmt Date`, `Last Stmt Amt`, `Last Pay Date`, `Last Pay Amt`, `Last Ins Pay Date`, `Last Ins Pay Amt`; aging grid `Current`, `Over 30`, `Over 60`, `Over 90`, `Over 120`, `Balance`, `Est Pat.`, `Est Ins.` with a row `Account Balance` and a row for the patient |
| `Primary Carrier`, `Secondary Carrier` (each with `Eligible :`) | `Carrier`, `Employer`, `Subscriber`, `Sub ID`, `Sub DOB`, `Rel To Sub`; `Yearly Max`, `Rem Max`, `Yearly Ded`, `Rem Ded`, `Group No.` |
| `Ortho Plan Details` (ortho-flagged patients) | `Code`, `Fee`, `Treatment Start Date`, `Treatment End Date`, `Banding Date`, `Desr`; `Ortho-Patient Payment Plan` and `Ortho - Insurance Payment Plan`, each with `Plan Amount`, `Down Pay`, `Next Per Amt`, `Next Date`, `Rem. Total Amt`, `Rem. # Of Pay` |
| `Flash Alerts` | `Message`, `Block Charge` |
| Procedure area | Appointment procedures (headed `Appointment Procedures`) or the provider's default routing-slip codes, then treatment-plan codes |

| Criterion `[L1]` | Effect on output | Source |
|---|---|---|
| `OFFICE/GROUP` | Office only; `Office Group` is disabled | `[L1][P23·img]` |
| `DATE RANGE`, `Provider`, `Operatory` | Which appointments get a slip | `[P23]` |
| `Patient` + `SEARCH` | One patient; blank = every patient with an appointment in the range | `[P23]` |
| `REPORT BY` `Next Scheduled Appointment` / `Next Scheduled Recall` | Which of the two prints in the next-appointment block | `[P23]` |
| `Recommended` (info icon) | Procedure codes: appointment codes if present, otherwise the appointment provider's default codes, otherwise blank; then treatment-plan codes from Accepted plans, otherwise from Diagnosed plans, otherwise blank | `[P23·img]` |
| `Active Treatment Plan` / `Codes` | Print the active treatment plan, or procedure codes only | `[P23]` |
| `Include Completed Procedures` | Adds already-completed procedures | `[L1][P24·img]` |
| `SORT BY` Appointment Date / Provider (Last Name) – Appointment Date / Operatory – Appointment Date / Patient Last Name | Print order of the slips | `[L1]` |
| `Print Blank Routing Slip` | Empty form for photocopying (outage preparation) | `[P23][P57]` |

**Setup dependencies:** provider default codes live in `Setup > Providers > Provider Setup > Edit`, routing-slip section
(code, quantity, `Copy Routing Slip From`); they print only when the appointment has no services attached `[P26]`. Block
appointments for events do not produce a slip **(S)** `[P59]`. A read-only backup site serves today's slips from the previous
night's copy during outages **(S)** `[P57]`.

**Quirks:** the only Daily report without `PRINT FORMAT` (PDF only) `[L1]`; the rights article lists routing slips under the
appointment-reports right, a leftover of its old menu location `[P52]`. For comparison, Open Dental prints routing slips per
appointment or for a whole day by provider and clinic, on a user-editable sheet layout `[C5]`; no layout editor is documented for the legacy slip [unverified absence].

**Sources:** `[P1][P2][P23][P24][P25][P26][P52][P57][P59][L1]`.

---

### A8. Progress Notes

**Confidence: PARTIALLY DOCUMENTED** (Detail layout seen in 2010 samples; Unsigned and Missing layouts not seen).

**Purpose.** Audit that clinical notes were entered and signed; lists the notes entered so they can be reviewed quickly;
also the way to print every note for a period, for example for a treatment facility `[P2][P27]`. One report replaced
`Patient Progress Notes`, `Unsigned Progress Notes Report` and `Missing Progress Notes` `[P1]`.

**Detail layout** — title `Patient Progress Notes` `[P27·img]`:

| Column | Content |
|---|---|
| `Pat ID` | Patient ID (one sample prints the patient name under it) |
| `Patient Name` or `Primary Carrier` | The two samples differ in the second column |
| `Notes` | Full note text |
| `Created By` | User ID of the author |

Grouping and totals: `Created On: <date>` → notes → `Sub total for, <date> : <count>` → `Total Notes: <count>`. Footer `From Date` /
`Thru`, `Printed By: <user>`.

| Criterion `[L1]` | Effect on output | Source |
|---|---|---|
| `PROGRESS NOTES TO PRINT` Detail | Every note in the range | `[P2][P27]` |
| … Unsigned | Notes entered but not signed, for the chosen range and criteria. The `Interactive Reports > Unsigned Progress Notes` twin shows only today's appointments, is tied to the preferred provider and the current office, and offers `REVIEW & SIGN` | `[P28][P29]` |
| … Missing | Appointments without a note; unlocks `Appointment Date` and `APPOINTMENTS TO INCLUDE` [unverified — both are greyed under Detail] | `[L1][P27·img]` |
| Date basis `DOS Date` / `Created On Date` / `Appointment Date` | Which date selects and groups | `[L1]` |
| `APPOINTMENTS TO INCLUDE` `Only with Missing Progress Notes` / `ALL` | Exceptions only, or every appointment with its note status [unverified] | `[L1]` |
| `Preferred Provider` picker | Filters by the patient's preferred provider | `[L1][P51]` |
| `Page Break by Patient` | One patient per page | `[P27]` |
| `OFFICE/GROUP` | One or several locations | `[P2]` |

**Context rules:** a note can be edited only on the day it was entered and only in the office where it was entered; notes
lock at the end of the day (around midnight Pacific) or when signed; a signed note can be struck out but not edited `[P30][P28]`.

**Who / when:** clinical and front-office staff daily `[P2][P1]`.

**Sources:** `[P1][P2][P27][P28][P29][P30][P51][L1]`.

---

### A9. Production Analysis Report

**Confidence: DOCUMENTED** (columns defined in text; no sample image).

**Purpose.** Production mix by ADA category or by carrier `[P31]`.

| `ANALYSIS BY` | Columns | Definitions |
|---|---|---|
| `Category` | `Category`, `Provider $`, `Practice Group $`, `Prov. Prod/ Total Prov. Prod. (%)`, `Prov. Prod/ Prac. Grp Prod. (%)` | `Category` = ADA category of the code (from `Setup > Procedure Codes`); `Provider $` = the provider's gross production in the category; `Practice Group $` = the office's gross production in the category; first % = category share of the provider's total; second % = provider's share of the office's production in that category |
| `Carrier` | `Carrier`, `# Patient`, `# of Claims`, `Avg. Production per Pat`, `Avg. Collection per Pat` | `# Patient` = patients attached to the carrier who were seen in the range; `# of Claims` = claims created for the carrier in the range; averages = carrier gross production / gross collection ÷ `# Patient` |

Layout inference: provider sections with one row per category [unverified]; no totals row is documented `[P31]`.

**Criteria `[L1]`:** `ANALYSIS BY`, `PRINT FORMAT`, `OFFICE/GROUP`, `PROVIDER`, `DATE RANGE`, `CATEGORY` picker (active for
Category), `CARRIER` picker (active for Carrier).

**Quirk:** the column is named "Practice Group" but defined at office level; with an office group selected the denominator
is unclear [unverified].

**Sources:** `[P31][L1]`.

---

### A10. Daily Audit

**Confidence: DOCUMENTED** (options and columns in text; no sample image).

**Purpose.** Finds what is missing from patient visits in a date range: patients with an appointment but no ledger
transaction, no progress note, or no signed note — and the reverse combinations `[P32]`.

| Column | Meaning `[P32]` |
|---|---|
| `Appt Date` | Appointment date |
| `Tran Date` | Ledger transaction date |
| `PN DOS Date` | Progress-note date of service |
| `Pat ID`, `Name` | Patient |
| `Last Visit` | Last appointment date |
| `Pat Type` | Patient types on file, abbreviated |
| `Provider` | Provider, abbreviated (see conflict in 3.3) |
| `Ledger Transaction` | ✓ / X — a ledger transaction exists for the scheduled procedures |
| `Appt` | ✓ / X — an appointment exists in the same office on the same day as the ledger entry |
| `PN` | ✓ / X — a progress note was added in the same office on the same day |
| `PN With Sig` | ✓ / X — the note was signed in the same office on the same day |

| Criterion | Effect on output | Source |
|---|---|---|
| `PATIENT HAS` (choose one) ALL / Appointment / Transaction in Ledger / Progress Notes | Population: patients with that record at the selected office(s) in the range; ALL = any of the three | `[P32]` |
| `BUT MISSING` (any) Appointment / Transaction in Ledger / Progress Notes / Progress Notes with Signature | Tests applied; a row prints when a ticked item is missing | `[P32]` |
| `SORT BY` Date / Patient Lastname / Provider | Date = the date type of the `PATIENT HAS` choice (ALL → appointment date); Lastname sorts within each office | `[P32]` |
| `GROUP BY` None / Provider (+ `Page Break`) | One section per provider; `Page Break` is ticked automatically so each provider gets only their own list | `[P32]` |

**Success state:** an empty report — every appointment, transaction, note and signature is complete `[P32]`.

**Who / when** `[P2][T2]`: front office at end of day (scheduled patients have a ledger transaction and the appointment was
not missed / cancelled); assistants and providers at end of day, sorted by provider, to sign notes — offices that do not
sign notes ignore the last column; one DSO runs it every morning for the previous day.

**Quirks:** a posted procedure still shows X under `Ledger Transaction` when its code is not flagged `Visit Code` `[P33]`;
matching is same-office and same-day `[P32]`; "shows transactions that are Ledger Codes" `[P2]`.

**Sources:** `[P2][P32][P33][P34][T2][L1]`.

---

### A11. Claims Printed

**Confidence: INFERRED.** No vendor description found: the exact phrase returns no relevant Help Center article, and the
report is absent from `[P1]`, `[P2]` and the Daily Reports section `[P55]`.

**Criteria `[L1]`:** `REPORT FORMAT` (Detail / Summary), `PRINT FORMAT`, `OFFICE/GROUP`, `PROVIDER`, `DATE RANGE` (no date-basis
selector), `CARRIER` (`Carriers` picker, ALL).

**Inferred output:** claims printed (generated on paper) in the date range. Detail = one line per claim under a carrier
header with carrier subtotals; Summary = count and amount per carrier [unverified]. The most likely column model is
Denticon's own `Claims Listing` (Insurance Reports > `Claims List`) `[P39·img]` (2011 sample):

| Column | Content |
|---|---|
| `Chart #` | Also carries an `ORTHO` marker |
| `Patient / Subscriber` | |
| `Patient - Subscriber DOB` | |
| `Sub ID` | |
| `Claim #` | |
| `Claim Sent - DOS` | Sent date and date of service |
| `Claim Amt`, `Est. Ins`, `Recv. Amt.`, `Rem. Amt.` | |
| `Status` | e.g. Sent |

Grouping there: `Carrier : <name>  Ph : <phone>` → claims → `Total for <carrier> [ <count> ] :`; footer `From` / `Thru`, patient
name range, `Carrier`, `Provider`, `Claim Type`, `Claim amt over`. Its date range is the claim **generated** date, not the
date of service `[P39]`.

**Workflow context:** `Utilities > Batch Claims Processing` → `Create Batch Claims` → `Outstanding E-claims` (`Transmit Claims`)
and `Outstanding Paper Claims` (`Print / Preview`, then `Update as Sent`, which removes them from the list and writes a ledger
line) `[P38]`. Printing alone does not mark a claim sent `[P38]`.

**Comparables:** Carestream WinOMS `Claim Submission` report (tracks outstanding claims and lists the claims printed on a
day) `[C7]`; Open Dental `Claims Not Sent` (`Clinic`, `Date of Service`, `Claim Type`, `Claim Status`, `Patient Name`,
`Carrier Name`, `Claim Fee`, `Proc Codes`) `[C6]`.

**Who / when:** billing staff at end of day to confirm the day's paper claims went out [unverified].

**Sources:** `[P38][P39][C6][C7][L1]`.

---

### A12. Special Transaction Report

**Confidence: DOCUMENTED** (PDF and Excel outputs seen).

**Purpose.** A filtered transaction finder over procedure codes and payment / adjustment codes, by provider, user,
insurance plan, patient range and age `[P35]`. Documented uses: counting procedures for fee negotiation; codes by provider
and age (for example an exam code charged to ages 0–3; sealants done today) `[P2]`; finding every account that received a
finance charge on a date `[P36]`; building a per-payment HSA / FSA receipt in Excel `[P37]`.

**PDF layout** `[P36·img]` (2025): criteria block at the top (`Patient Name Range`, `Date Range`, `Providers`,
`Payment/Adjust`, `Procedure Codes`, `Excluded Pat Types`, `Group By`), then `Office: <name>`, then:

| Column | Content |
|---|---|
| `Date` | Transaction or service date |
| `Patient ID`, `Patient Name` | |
| `Pat Type` | Patient types, comma-separated |
| `Tran Prdr` | Transaction provider |
| `UCR` | |
| `PRIM`, `SEC` | Primary / secondary insurance portions [unverified meaning] |
| `AMOUNT` | Transaction amount |

Group header per `Group By` value, e.g. `Code: <code> - <description>`. Group totals were below the visible area [unverified].

**Excel layout** `[P37·img]`: one flat row per transaction — `Office Name`, `Code` (code - description), `Date`, `Patient ID`,
`Patient Name`, `Pat Type`, `Transaction Provider`, `UCR`, `PRIM`, `SEC`, `AMOUNT` — with the group value repeated as a column
(`PRIM` was hidden behind a menu in the Excel screenshot and is taken from the PDF layout).

| Criterion | Effect on output | Source |
|---|---|---|
| `Provider`, `User` | Transactions recorded under those providers and / or users | `[P35]` |
| Date basis `Transaction Date` / `Service Date` | Entered date vs completed date | `[P35]` |
| `PATIENT NAME RANGE` (`AAAAA`–`ZZZZZ`) | Alphabetical range; enter the same patient twice for one patient | `[P35][P37]` |
| `EXCLUDE PATIENT TYPE` (default None) | Patient-type filter; the article describes it as including only the selected types **[conflict with the label]** | `[P35]` |
| `PAYMENT/ADJ CODES` (default None; `NONE` button) | Adds chosen payment / adjustment codes; None leaves them out | `[P35][P36]` |
| `INSURANCE PLANS/SUB TYPES` | Specific plans or subtypes (medical / dental) | `[P35]` |
| `CODE/CATEGORY` Code / Category (default ALL; `NONE` button) | Procedure codes, or ADA categories; None leaves procedures out | `[P35][P36]` |
| `Age Range` From / To | Patient age filter | `[P35][P2]` |
| `Amount` dropdown (`All Amount`) + value | Amount comparison; other dropdown values not documented [unverified] | `[L1][P36·img]` |
| `Group By` Code / Username / Insurance Plan / Transaction Provider | Group header and order | `[P35]` |
| **`Sort By` Patient LastName / Patient ID / Date** | Order inside each group. **Missing from our transcription** | `[P35][P36·img]` |

**Who / when:** management, as needed `[P2]`.

**Sources:** `[P2][P35][P36][P37][L1]`.

---

## 5. My Reports (`my_reports`)

**Mechanism.** `My Reports` limits a user to their own activity and to one linked provider. The link is the user field
`Report Access Provider` (`Setup > Security > Users`); the right is `Reports – My Reports – Full Control`; running a
provider-specific report with no linked provider raises an error telling the user that no Corresponding Provider is set
`[P40]`. Elsewhere (Daily, Management, Treatment Plan, Appointment reports) any user with the menu right can pick any
provider `[P40]`. The pre-2021 list was: user-specific `Daily Journal by User – Detail`, `Daily Journal by User(created date) –
Detail`, `Appointment Detail by User`, `Time Clock Report`; provider-specific `Daily Journal By Provider Detail`,
`Production By Codes`, `Production By Provider`, `Production By Category` `[P40]`. The current list is five items — `Daily Journal`,
`Time Clock Report`, `Missing Progress Notes`, `Appointment Detail by User`, `Production Report` `[L2][P42·img]`.

### B1. Daily Journal (My Reports)

**Confidence: PARTIALLY DOCUMENTED** (layout = A2 Detail; restriction semantics from `[P40]`; dropdown values not seen).

| Criterion `[L2]` | Effect on output | Source |
|---|---|---|
| `REPORT BY` dropdown (default `User`) | `User` = lines entered by the logged-in user; the other value is presumably `Provider` = lines of the linked provider (the old list had both variants) [unverified] | `[P40]` |
| Date basis `Transaction Date` / `Created Date` | Folds in the old "(created date)" variant | `[P40][P1]` |
| `PATIENT TYPE`, `TRANSACTION TYPES` | As A2 | — |
| `PRINT` `Patient ID` / `Patient Chart#` | Which identifier fills the first column (`Pat ID/ Chart #`) | `[L2][P4·img]` |
| `Show Datewise Distribution` | Per-day recap; A2 calls it `Show Datewise Summary` | `[L2][P5]` |

No `REPORT FORMAT`, no provider / user pickers, no `GROUP BY`: the output is the Detail layout of A2 for one user or one
provider [unverified]. **Use:** a user or manager reviewing what that user entered `[P1]`.

**Sources:** `[P1][P40][L2]`.

### B2. Time Clock Report

**Confidence: DOCUMENTED** for Detail (sample seen); Summary and Employee Total Only from text.

**Detail layout** `[P41·img][P42·img]` (2020):

| Column | Content |
|---|---|
| `Employee` | Last,First |
| `Over time Type` | `Daily` or weekly |
| `Hourly Rate`, `Over time Rate` | From the user's time-clock setup |
| `In`, `In Office` | Clock-in date-time and office (blank in the sample) |
| `Out`, `Out Office` | Clock-out date-time and office (blank in the sample) |
| `Total Hrs:Mins` | hh:mm of the pair |
| `Total Hours` | Decimal hours |

One row per in / out pair → `Total:` per employee per day → `Grand Total:`. Footer `From` / `Thru`, `Users`, `* Detail Report`
and a note that weekly overtime is not considered in this format.

| `REPORT FORMAT` | Output | Source |
|---|---|---|
| `Detail` | Every punch; used to audit gross hours and wages | `[P41]` |
| `Summary` | One line per user per day; overtime computed from the user's setting | `[P41]` |
| `Employee Total Only` (older text: "Total") | One line per employee for the range | `[P41][P42]` |

Setup `[P44]`: per user `Time Clock Pay Rate`, `Time Clock Overtime Method` (`D` = hours over 8 in a day, `W` = hours over 40 in
a week), `Time Clock Overtime Rate`; corrections in `Utilities > User Functions > Time Clock Editor` with the right
`Utilities – Time Clock Edit Full Control`.

**My Reports vs Management Reports:** the Management Reports version has a `USER` picker; the My Reports version has none
(own hours only) `[P41·img][P42·img][L2]`. `Group By Office` is greyed while `Office` is selected `[L2]`; presumably available
with `Office Group` [unverified].

**Quirks:** the vendor states the time clock is user-specific and that the office of a punch is not tracked or reported
`[P43]`, yet the report has `In Office` / `Out Office` columns, an office filter and `Group By Office` **[conflict]**; feature
limited to premium-subscription clients `[P41]`.

**Sources:** `[P41][P42][P43][P44][L2]`.

### B3. Missing Progress Notes

**Confidence: INFERRED** (output). Same criteria block as `Progress Notes` → `Missing` (A8).

**Criteria `[L2]`:** `PRINT FORMAT`, `OFFICE/GROUP`, `Provider` (ALL), `APPOINTMENT DATE RANGE`, `APPOINTMENTS TO INCLUDE`
(`Only with Missing Progress Notes` / `ALL`).

**Inferred output:** one row per appointment in the range — date / time, patient ID and name, provider, appointment status —
with a note-present indicator; exceptions only by default, all appointments with `ALL`; count totals [unverified]. It is
the single-test equivalent of `Daily Audit` with `PATIENT HAS` = Appointment and `BUT MISSING` = Progress Notes `[P32]`. The
vendor describes its ortho twin `Missing Ortho Visits` as similar to the missing-progress-notes and daily-audit reports
**(S)** `[P56]`.

**Quirk:** the screen shows a `Provider` picker defaulting to ALL even inside My Reports, so the "own data only" rule is not
visible in the criteria `[L2]`.

**Who / when:** providers and assistants daily, to finish notes before they lock `[P2][P30]`.

**Sources:** `[P1][P2][P30][P32][P56][L2]`.

### B4. Appointment Detail by User

**Confidence: PARTIALLY DOCUMENTED** (parent report output seen; by-user grouping inferred).

**Purpose.** Confirms that a user is entering appointments `[P1]`; the documented use is tracking hygienists who book the
next recall visit at the date of service — `Appointment Detail` filtered by user and by created date `[P46]`.

**Parent layout** — title `Appointment Detail` `[P45·img]` (2026):

| Column | Content |
|---|---|
| `Time / Len (min)` | Start time, length |
| `Appt Status` | e.g. Scheduled |
| `Operatory` | |
| `Patient / Pat ID [Chart#]` | Name, ID, and a `Bal :` amount |
| `Pref Provider` | Patient's preferred provider |
| `Carrier` | `P :` and `S :` carrier with phone |
| `Procedure (Code Th Surf Descr)` | Procedures on the appointment |
| `Notes` | Appointment notes |

Grouping and totals (counts): `Office : <name>` → `Provider : <name> : <ID>` → day header (long date) → rows → `Total for, <date> :`
→ `Total for, <provider> :` → `Total for, <office> :` → `Grand Total :`. Footer `From Appt Date` / `Thru`, `Offices`, `Providers`,
`Operatories`, `Users`.

**By-user variant:** the parent screen has `GROUP BY` `Provider` / `User` and `PAGE BREAK BY` `None` / `Date` / `Provider` / `User`
`[P46·img]`; the My Reports report is presumably the `User` grouping limited to the logged-in user (the creator of the
appointment) [unverified].

| Criterion `[L2]` | Effect on output | Source |
|---|---|---|
| Date basis `Appointment Date` / `Created On Date` | Appointments on those dates vs appointments created on those dates | `[P46]` |
| `Provider`, `Operatory` | Filters | `[L2]` |
| `Include Cancelled Appointments` (ticked by default here; unticked in the parent) | Adds cancelled appointments; missed ones are always included | `[P45][L2][P46·img]` |
| `Include Patient Phone Number` (ticked by default here) | Adds phone numbers for call-backs | `[P2][L2]` |

Parent-only options: `APPOINTMENT TYPE` Regular / Archived, `Only AppointNow Appointments`, `Include Patient Home Office`,
`CANCELLATION REASON` `[P46·img]`.

**Sources:** `[P1][P2][P45][P46][L2]`.

### B5. Production Report (My Reports)

**Confidence: DOCUMENTED by reference** to A3; restriction from `[P40]`.

| Criterion `[L2]` | Effect on output | Source |
|---|---|---|
| `CORRESPONDING PROVIDER` (read-only, empty in our screenshot) | Shows the linked `Report Access Provider`; output is limited to that provider. Empty = the user has no link and the run fails with the Corresponding Provider error | `[P40]` |
| `PRODUCTION BY` Code / Provider / Category | `Production by Codes`, `Production by Provider`, or by category, for the linked provider (no `Carrier`) | `[P40]`; layouts in A3 |
| `CODES` picker | Restricts codes | — |
| `Include UCR` + `Fee Schedule` (info icon) | Compare-fee column as in A3 | `[P10]` |

Not offered here: `REPORT FORMAT`, `GROUP BY`, `Page Break`, `Include Z-Codes`. **Use:** a dentist or hygienist reviewing only
their own production `[P40]`.

**Sources:** `[P40][L2]`; A3.

---

## 6. Corrections and additions to the criteria transcriptions

| Report | Finding | Source |
|---|---|---|
| `Special Transaction Report` | A `Sort By` row (`Patient LastName` / `Patient ID` / `Date`) exists below `Group By`; the transcription's truncation flag was right | `[P35][P36·img]` |
| `Daily Journal` (Daily Reports) | Nothing lies below `GROUP BY`; a 2023 screenshot shows empty space there, so the truncation flag can be cleared | `[P7·img]` |
| `Production Report` | Conditional controls: `PROVIDERS` picker, `SORT BY` (`Transaction Date` / `Patient Lastname`), label `Page Break by Provider`; `Detail` selectable only for `Production By` = Provider; `Include Z-Codes` and the fee-schedule dropdown unlock with `Include UCR` | `[P11·img][T1·img]` |
| `Deposit Slip` | `CHECK TYPE` unlocks when `Check` is ticked; `GROUP BATCH CHECKS` radios unlock with its checkbox | `[P14][T1·img]` |
| `Routing Slip` | The info icon beside `Recommended` explains the order of procedure codes (appointment codes → provider defaults → blank; then Accepted → Diagnosed plan codes) | `[P23·img]` |
| `Daily Audit` | `Page Break` is auto-ticked when `GROUP BY` = Provider | `[P32]` |
| `Progress Notes` | The provider row label really is `Preferred Provider`; `Appointment Date` and `APPOINTMENTS TO INCLUDE` are greyed under Detail | `[P27·img]` |
| `Time Clock Report` | The Management Reports copy has a `USER` picker; the My Reports copy does not | `[P41·img][P42·img]` |
| `Fee Schedule To Compare` | The greyed default differs per tenant (`ANTHEM ( 115 )`, `2022 UCR Master ( 272 )`, `CIGNA PPO HAMILTON ( 128 )`): presumably just the first fee schedule in the list [unverified] | `[P11·img][P8·img][L1]` |
| Favorites | The button reads `UPDATE MY FAVORITES` when the screen was opened from a saved favorite | `[P36·img][P15·img]` |

Menu facts read from screenshots (not available to the earlier research pass): Reports menu order — `Daily Reports`,
`Monthly Reports`, `Ledger Reports`, `Management Reports`, `Insurance Reports`, `Appointment Reports`, `Treatment Plan Reports`,
`Referral Reports`, `Recall Reports`, `Ortho Reports` / `Statements`, `Lists ▸` / `Interactive Reports ▸` / `Office Reports ▸` /
`Letters`, `Postcards`, `Labels` / `Custom Letter`, `Advanced Custom Letter`, `Custom Postcard` / `My Reports` / `Blank Insurance
Forms`, `Pat Reg/Medical Info Forms` / `My Favorites` / `Search Report` / `Reports (Old) ▸` `[P8·img]`. `Management Reports` list:
`Payment Plan Charges`, `Uncollected Copay`, `Audit Trail`, `Time Clock Report` `[P41·img]`. `Appointment Reports` list: `Appointment
List`, `Missed Appointments Not Marked As Missed`, `New Patients via Appointments`, `Lab Report`, `SmartAssist Report Card`,
`Appointments Confirmed Via Vendors`, `Appointment Time Stamps`, `Appointment Detail`, `Lab Cost Report` `[P46·img]`.

---

## 7. Old report names → current report and criteria

| Old name (pre-October 2021) | Current report | Criteria that reproduce it | Source |
|---|---|---|---|
| `Daily Journal-Detail`, `Daily Journal-Summary` | `Daily Journal` | `REPORT FORMAT` | `[P4][P1]` |
| `Daily Journal by Provider` | `Daily Journal` | `GROUP BY` Provider or the `Provider` picker | `[P1][P2]` |
| `Daily Journal by User – Detail` | `Daily Journal` | `GROUP BY` User or the `User` picker | `[P1]` |
| `Daily Journal by User – Detail (by created date)` | `Daily Journal` | Date basis `Created Date` | `[P1][P40]` |
| `Daily Collection` | `Collection Report` | `COLLECTION BY` Provider, Detail | `[P1]` |
| `Production by Provider Detail`, `Production by Provider Summary` | `Production Report` | `PRODUCTION BY` Provider + `REPORT FORMAT` | `[P11]` |
| `Production by Codes`, `Production by Codes - Provider`, `Production by Category` (Group Reports > Management Reports) | `Production Report` | `PRODUCTION BY` Code / Category, `GROUP BY` Provider, Office Group | `[P2][P9]` |
| `Deposit Slip - Credit Card`, `Deposit Slip - Care Credit`, `Deposit Slip - Direct Deposit` | `Deposit Slip` | `PAYMENT TYPES` | `[P17][P18][P19]` |
| `Daily Routing Slip`, `Routing Slips` (Appointment Reports) | `Routing Slip` | — | `[P1]` |
| `Patient Progress Notes`, `Unsigned Progress Notes Report`, `Missing Progress Notes` | `Progress Notes` | `PROGRESS NOTES TO PRINT` Detail / Unsigned / Missing | `[P1][P2]` |
| `Daily Scheduled Production` | `Scheduled Production` | — | `[P1]` |
| `Daily Audit Report` | `Daily Audit` | — | `[P1][P32]` |
| `Special Transaction Report` (Group Reports > Daily Reports) | `Special Transaction Report` | Office Group | `[P2]` |
| `Executive Summary`, `Executive Summary by Provider` (were under Daily Reports) | Monthly Reports > `Executive Summary` | `Group By` | `[P1][T1]` |
| `Appointment Pull Chart List` (was under Daily Reports) | Not in the current Daily Reports list | — | `[P1][L1]` |

`Peg Board Day Sheet` and `Claims Printed` appear in the current list but in no old-name source found.

---

## 8. Implications for our module (analyst recommendations, not sourced facts)

1. **One transaction-line dataset serves five legacy reports** (Daily Journal, Collection Report, Deposit Slip, Special
   Transaction Report, Production Report). Minimum fields (snake_case, matching the backend): `office_id`, `patient_id`,
   `chart_no`, `provider_id` (line provider), `preferred_provider_id`, `entered_by_user_id`, `code`, `description`, `tooth`,
   `surface`, `transaction_date`, `created_at`, `service_date`, `payment_date`, `transaction_class` (service / payment /
   adjustment), `adjustment_sub_type` (production / collection), `payment_type`, `check_no`, `bank_no`, `batch_id`,
   `ucr_fee`, `amount` (signed by A/R impact), `est_patient`, `est_insurance`, `duration_units`.
2. **Treat each legacy menu item as a report family with declared variants** (dimension, format, grouping) and derive the
   printed title from the criteria, as the legacy tool does.
3. **Express criteria dependencies declaratively** (`enabled_when`, `visible_when`, `default_when`) — the legacy rules in
   sections 4 and 6 are the acceptance list.
4. **Always echo criteria on the output and offer a flat export** (one header row, typed columns, no merged cells, totals
   as formulas or omitted). The legacy Excel export is the weakest point to beat.
5. **Define "provider" per report explicitly** (line provider, preferred provider, appointment provider, allocation
   provider) and show it in the column header.
6. **Compute ratios from totals** (`Eff. Rate`, averages, percentages) with zero-denominator guards.
7. **Turn the exception reports into work queues**: Daily Audit, Unsigned / Missing Progress Notes and Claims Printed should
   open the patient, the note or the claim from the row, with an explicit empty "all clear" state.
8. **Peg Board Day Sheet and Claims Printed need a product decision**, not parity guessing: specify them from the comparable
   reports in A1 and A11 and confirm against a live legacy printout when one is available.

---

## 9. Gaps, conflicts and open questions

| # | Item | Status |
|---|---|---|
| 1 | `Peg Board Day Sheet` output — no vendor description, no sample | INFERRED; needs a real printout |
| 2 | `Claims Printed` output and its date basis (printed date, created date, sent date); whether e-claims are included | INFERRED |
| 3 | `Scheduled Production` column layout and row grain; which goal screen feeds `Estimated Prod.`; ÷ 20 or ÷ provider working days | **[conflict]** `[P21][P22]` |
| 4 | `Progress Notes` Unsigned and Missing layouts; `Missing Progress Notes` columns | Not seen |
| 5 | `Daily Journal`: what unlocks `Show AR`; what `Include Resp. Party Type` prints; exact `PATIENT TYPE` rule | [unverified] |
| 6 | `Collection Report`: Detail line columns for None / Provider / Carrier; Summary format; provider attribution | [unverified] |
| 7 | `Production Report`: Detail columns; By Category and By Carrier layouts; criteria for those two | [unverified] |
| 8 | `Special Transaction Report`: `Amount` dropdown values; meaning of `PRIM` / `SEC`; group totals; include vs exclude semantics of `EXCLUDE PATIENT TYPE` | **[conflict]** / [unverified] |
| 9 | `Daily Audit` provider column: preferred provider or provider on the transaction date | **[conflict]** `[P32]` |
| 10 | `Time Clock Report`: are `In Office` / `Out Office` populated; when is `Group By Office` enabled; Summary columns | **[conflict]** `[P43]` |
| 11 | My Reports: values of the `REPORT BY` dropdown; how the restriction applies to `Missing Progress Notes` and `Appointment Detail by User`, which still show a `Provider` picker | [unverified] |
| 12 | `Transaction Date` definition (entered date vs editable ledger date) | **[conflict]** `[P14][P35][P51]` |
| 13 | Sample images span 2010–2026; older layouts (Progress Notes, Claims Listing, Production by Provider) may have changed | Risk |
| 14 | The 17 MB end-of-day training deck and the report webinars could not be read; they probably show more outputs | Not read `[P53]` |

---

## 10. Sources

Planet DDS Help Center — articles at `https://support.planetdds.com/hc/en-us/articles/<id>`; images at
`https://support.planetdds.com/hc/article_attachments/<id>`. Read 2026-11-22.

- `[P1]` Which reports and activities does Denticon recommend to generate at the end of each day? — https://support.planetdds.com/hc/en-us/articles/115002085792
- `[P2]` Reports Matrix, with the PDF "Denticon Reporting 101" — https://support.planetdds.com/hc/en-us/articles/4415425089563-Reports-Matrix ; https://support.planetdds.com/hc/article_attachments/26183111395355 ; older copy https://www.planetdds.com/wp-content/uploads/2022/11/Reporting-Matrix.pdf
- `[P3]` Peg Board Day Sheet (Glossary of Terms) — https://support.planetdds.com/hc/en-us/articles/115002082472-Peg-Board-Day-Sheet
- `[P4]` Daily Journal: adjustments in the charges column — https://support.planetdds.com/hc/en-us/articles/31644959243803 ; images 31644952999067 (Summary), 31644952999579 (Detail)
- `[P5]` Production totals for a date range — https://support.planetdds.com/hc/en-us/articles/115002067531 ; images 7950789427867 (Detail), 16521672113947 (criteria)
- `[P6]` Monies collected in a date range — https://support.planetdds.com/hc/en-us/articles/115002073951 ; image 7765453217947 (Summary, payments)
- `[P7]` Balance payments and verify services — https://support.planetdds.com/hc/en-us/articles/115002070551 ; image 16983700662043 (criteria)
- `[P8]` Understanding the "Production by Provider" report — https://support.planetdds.com/hc/en-us/articles/115002069071 ; images 115002805352 (sample), 17371838648859 (criteria), 17371783720091 (Reports menu)
- `[P9]` Production for all codes in a time frame — https://support.planetdds.com/hc/en-us/articles/115002067551 ; image 4419447806619 (Production by Codes)
- `[P10]` Paying providers a set amount per completed procedure — https://support.planetdds.com/hc/en-us/articles/115002093932 ; images 115002805531 (Production by Codes - Provider), 16690596084379 (criteria)
- `[P11]` How to understand the new reports menu — https://support.planetdds.com/hc/en-us/articles/4408457645723-How-to-understand-the-new-reports-menu ; images 4408457633307, 4408457634971, 4408465672859, 4408811695003 (criteria states), 4408465694363 (SEARCH OFFICES), 4408811703707, 4408811721883 (SEARCH CODE)
- `[P12]` Collection by code — https://support.planetdds.com/hc/en-us/articles/32940042672283 ; image 32940026555547
- `[P13]` Adjustments in Denticon: Production vs. Collection Adjustments — https://support.planetdds.com/hc/en-us/articles/115002070031
- `[P14]` How can I create a deposit slip? — https://support.planetdds.com/hc/en-us/articles/115002086752-How-can-I-create-a-deposit-slip
- `[P15]` Daily deposit slip report — https://support.planetdds.com/hc/en-us/articles/115002079011 ; image 17287085963931 (criteria)
- `[P16]` Searching for a check number — https://support.planetdds.com/hc/en-us/articles/360044446012 ; image https://support.planetdds.com/hc/article_attachments/360059578871/mceclip0.png
- `[P17]` Credit card transactions — https://support.planetdds.com/hc/en-us/articles/115002079031 ; image 115002808071
- `[P18]` Third-party financing transactions — https://support.planetdds.com/hc/en-us/articles/115002079051 ; image 115002808091
- `[P19]` Direct deposit transactions — https://support.planetdds.com/hc/en-us/articles/115002079071
- `[P20]` Financing transactions missing from the Care Credit deposit slip — https://support.planetdds.com/hc/en-us/articles/115002095432
- `[P21]` Understanding the Scheduled Production report — https://support.planetdds.com/hc/en-us/articles/360049517211 ; images 17286836010779, 17286867498139
- `[P22]` Provider Production Goals Setup FAQ — https://support.planetdds.com/hc/en-us/articles/32106948279195 ; images 32106925719323, 32106948263963
- `[P23]` How do I print my routing slips? — https://support.planetdds.com/hc/en-us/articles/115002070671 ; images 17204913390107 (criteria), 17204855158683 (info tooltip)
- `[P24]` Routing Slips from the Scheduler — https://support.planetdds.com/hc/en-us/articles/360037544372 ; image 360083790292
- `[P25]` Distinguishing Ortho patients — https://support.planetdds.com/hc/en-us/articles/360029319631 ; image 19614699338651 (Routing Slip sample)
- `[P26]` Provider routing-slip procedures — https://support.planetdds.com/hc/en-us/articles/115002081552 ; Setup Guide, Edit Provider — https://support.planetdds.com/hc/en-us/articles/37669939193755
- `[P27]` Printing Progress Notes for every patient in a period — https://support.planetdds.com/hc/en-us/articles/115002093832 ; images 115002805331 (sample), 16857968488091 (criteria) ; facility variant https://support.planetdds.com/hc/en-us/articles/115002073451 ; image 115002814132 (sample)
- `[P28]` Interactive vs Daily Reports Unsigned Progress Notes — https://support.planetdds.com/hc/en-us/articles/30330672283163
- `[P29]` E-sign of Prog Notes on Unsigned Prog Note Report — https://support.planetdds.com/hc/en-us/articles/51881116218779
- `[P30]` Signature pad in Progress Notes (locking rules) — https://support.planetdds.com/hc/en-us/articles/115002089492
- `[P31]` How do we understand the Production Analysis report? — https://support.planetdds.com/hc/en-us/articles/30453948982171
- `[P32]` Daily Audit Report — https://support.planetdds.com/hc/en-us/articles/4404741110171-Daily-Audit-Report
- `[P33]` Daily Audit shows a missing ledger transaction — https://support.planetdds.com/hc/en-us/articles/31474162855323
- `[P34]` Procedure Code Setup screen — https://support.planetdds.com/hc/en-us/articles/115002065931
- `[P35]` What is the Special Transaction report? — https://support.planetdds.com/hc/en-us/articles/30717390364699
- `[P36]` Undoing finance charges (Special Transaction usage) — https://support.planetdds.com/hc/en-us/articles/35991068145819 ; images 36704356758171 (criteria), 36704356759963 (PDF output)
- `[P37]` HSA / FSA bill from the Special Transaction Report — https://support.planetdds.com/hc/en-us/articles/36030927904027 ; images 36031620247963, 36031620252187 (Excel output)
- `[P38]` Getting claims together for submission (batch claims) — https://support.planetdds.com/hc/en-us/articles/115002087072
- `[P39]` Claims List report — https://support.planetdds.com/hc/en-us/articles/115002077251 ; image 115002820892 (Claims Listing sample)
- `[P40]` Report Access Provider field and My Reports — https://support.planetdds.com/hc/en-us/articles/115002079291
- `[P41]` Time Clock report (hours worked) — https://support.planetdds.com/hc/en-us/articles/115002077091 ; images 360048776191 (sample), 16858298295323 (criteria)
- `[P42]` A single user viewing their own hours — https://support.planetdds.com/hc/en-us/articles/115002078711 ; images 16858360962331 (My Reports screen), 360048776131 (sample)
- `[P43]` Office location on time clock reports — https://support.planetdds.com/hc/en-us/articles/115002093512
- `[P44]` Time clock setup, editor and edit right — https://support.planetdds.com/hc/en-us/articles/115002093432 ; https://support.planetdds.com/hc/en-us/articles/115002077131 ; https://support.planetdds.com/hc/en-us/articles/115002077111
- `[P45]` Appointment Detail (monthly appointment count) — https://support.planetdds.com/hc/en-us/articles/36706153887131 ; image 51424282129435 (sample)
- `[P46]` Appointments created on a particular date — https://support.planetdds.com/hc/en-us/articles/115002066311 ; image 16520410106651 (criteria)
- `[P47]` Production Summary vs Income Allocation — https://support.planetdds.com/hc/en-us/articles/115002085292
- `[P48]` Executive Day Sheet (adjustments used; sales tax) — https://support.planetdds.com/hc/en-us/articles/115002085332 ; image 7950111228955 ; https://support.planetdds.com/hc/en-us/articles/115002074691
- `[P49]` Report Error: "File size is too large to download" — https://support.planetdds.com/hc/en-us/articles/49239504234011
- `[P50]` Transactions missing from a report (Report Server) — https://support.planetdds.com/hc/en-us/articles/115002079551
- `[P51]` Glossary: Provider — https://support.planetdds.com/hc/en-us/articles/115002068051 ; Transaction Date — https://support.planetdds.com/hc/en-us/articles/115002079371 ; Allocation Date — https://support.planetdds.com/hc/en-us/articles/115002086112 ; back-dated payment missing from Income Allocation — https://support.planetdds.com/hc/en-us/articles/115002069331
- `[P52]` Reports-related security rights — https://support.planetdds.com/hc/en-us/articles/115002075251
- `[P53]` Not readable: "13. End of Day Reporting" (PDF attachment, 17 MB) — https://support.planetdds.com/hc/en-us/articles/10601641608987-13-End-of-Day-Reporting ; webinars "07 Daily Reports" https://support.planetdds.com/hc/en-us/articles/115002075651 , "39 Reports Part 1" https://support.planetdds.com/hc/en-us/articles/360039020232 , "56 Reports" https://support.planetdds.com/hc/en-us/articles/360061512052
- `[P54]` Executive Summary vs Aging Report (`Show AR`) — https://support.planetdds.com/hc/en-us/articles/34417429197595
- `[P55]` Daily Reports section index — https://support.planetdds.com/hc/en-us/sections/39626192513947-Daily-Reports
- `[P56]` **(S)** Ortho report options (`Missing Ortho Visits`) — https://support.planetdds.com/hc/en-us/articles/360045117932
- `[P57]` **(S)** Outage preparation and backup routing slips — https://support.planetdds.com/hc/en-us/articles/26073074206747 ; https://support.planetdds.com/hc/en-us/articles/115002085812
- `[P58]` **(S)** "Daily Collections Report" (a different report) — https://support.planetdds.com/hc/en-us/articles/40354430715931-Daily-Collections-Report
- `[P59]` **(S)** Events and notes on the scheduler — https://support.planetdds.com/hc/en-us/articles/115002068931

Third-party pages about Denticon

- `[T1]` Jarvis Analytics, "Denticon and Jarvis: A report guide" (with screenshots of Denticon criteria and outputs) — https://www.jarvisuniversity.com/insights/denticon-and-jarvis-a-report-guide/
- `[T2]` Guardian Dentistry helpdesk, "Daily Denticon Checklist" — https://helpdesk.guardiandentistry.com/support/solutions/articles/151000229420-daily-denticon-checklist

Comparable systems and references (used only for INFERRED items)

- `[C1]` Carestream SoftDent, Daysheet report — https://help.carestreamdental.com/rh/web/server/SoftDent/projects_responsive/OH_DE1010/Daysheet.htm
- `[C2]` Dental Intelligence, "Reports in Dentrix" (Day Sheet (Charges and Receipts)) — https://educate.dentalintel.com/en/articles/635747-reports-in-dentrix
- `[C3]` Dentrix Ascend Reports Guide — https://hsps.pro/DentrixAscend/Help/dentrix_ascend_reports.htm
- `[C4]` Open Dental, Daily Payments report — https://www.opendental.com/manual/reportdailypayments.html
- `[C5]` Open Dental, Routing Slips — https://www.opendental.com/manual/routingslips.html
- `[C6]` Open Dental, Claims Not Sent report — https://www.opendental.com/manual/reportclaimsnotsent.html
- `[C7]` Carestream WinOMS, Printing Claims Submission Reports — https://help.carestreamdental.com/rh/web/server/WinOMS/projects_responsive/WinOMS_CS_OnlineHelp/Managing_Your_Practice/Optimizing_Your_Practice/Printing_Claims_Submission_Reports.htm
- `[C8]` Open Exam Prep, patient account bookkeeping: day sheets, posting and reconciliation — https://open-exam-prep.com/study-guides/aama-cma/medical-coding-billing-finance/patient-account-bookkeeping-posting-reconciliation
- `[C9]` **(S)** Dentrix Enterprise 11.0 Reports Reference (IHS; could not be opened) — https://www.ihs.gov/doh/edr/documents/Dentrix_Enterprise_11.0_Reports_Reference.pdf

Local inputs

- `[L1]` `docs/reports/module-plan/legacy/daily_reports.json` (verified criteria transcription, 12 reports, 151 controls)
- `[L2]` `docs/reports/module-plan/legacy/my_reports.json` (verified criteria transcription, 5 reports, 48 controls; identical in content to the two first-reader transcriptions)
