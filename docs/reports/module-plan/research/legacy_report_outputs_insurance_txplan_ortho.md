# Legacy report outputs — Insurance, Treatment Plan and Ortho Reports (Denticon by Planet DDS)

Research date: 2026-11-22. Audience: engineers and product designers of the Reports & Analytics module.

Scope: what the legacy tool actually **prints** for 22 reports in three categories — `Insurance Reports` (13),
`Treatment Plan Reports` (4) and `Ortho Reports` (5). We hold screenshots of the criteria screens only; this document
reconstructs purpose, output columns, grouping, totals, option effects, users and quirks from vendor documentation,
vendor-published sample images and, where nothing exists, comparable systems.

Sibling documents (not repeated here): `legacy_report_outputs_monthly_mgmt_ledger_statements.md` and
`legacy_report_outputs_daily_my.md` (shared viewer and page-furniture facts, aging buckets, period locks),
`denticon_analytics_and_dso.md` (menu structure, My Favorites, rights, DPA), `dental_kpi_dictionary.md`,
`compliance_and_financial_semantics.md`.

---

## 0. How to read this document

### 0.1 Evidence tags

| Tag | Meaning |
|---|---|
| `[D]` | Stated in vendor text (Planet DDS Help Center article, vendor PDF, vendor blog). |
| `[S]` | Read by us from a **vendor-published image** — a generated sample report or a screen. Sample figures are the vendor's demo data; the year of each sample is given because several are old. |
| `[C]` | From our own criteria-screen transcriptions `[C1]` `[C2]` `[C3]`. |
| `[X]` | Comparable system documentation (Open Dental, SoftDent, Dentrix, Dentrix Enterprise, DentalXChange, Gaidge). Used only to shape INFERRED layouts. |
| `[I]` | Our inference. The basis is always named. |
| `[unverified]` | Could not be confirmed from any source we could open. |

Source ids: `[R..]` = Planet DDS, `[X..]` = comparable systems, `[C..]` = our transcriptions (section 11).
Report names, option labels and column headers are reproduced exactly (they are identifiers); vendor prose is paraphrased.

### 0.2 Confidence rating per report

- **DOCUMENTED** — output layout confirmed from a vendor sample image, or listed field by field in vendor text.
- **PARTIALLY DOCUMENTED** — purpose and some output facts confirmed; the column layout is reconstructed.
- **INFERRED** — no vendor description of the report; reconstructed from the criteria screen, the documented feature
  behind it and a named comparable report.

### 0.3 Method notes (repeatable)

- Help Center HTML pages return 403 to fetchers; the same articles are readable through the public Help Center API
  (`/api/v2/help_center/en-us/articles/<id>.json`, `/sections/<id>/articles.json`,
  `/api/v2/help_center/articles/search.json?locale=en-us&query=...`). All sections under `Reporting`, `Transactions`,
  `Setup`, `Utilities`, `Training Resources` were listed and searched for every report name in scope.
- Most evidence is in article **images** (`/hc/article_attachments/<id>`); about 75 were opened for this document.
- Read in full: the `Denticon Reporting 101` PDF `[R14]`, the Denticon University PDFs `M08 Non-graphical Treatment Plan`
  `[R54]` and `M13 End of Day Reporting` `[R66]` (text layer only; M13 does not cover any report in scope).
- Not readable: training and webinar videos, the in-app release notes, the Dentrix Enterprise 11.0 Reports Reference
  (TLS certificate error), two CareStack articles (403). See `[R65]`, `[X12]`, `[X13]`.

---

## 1. What planners most need to know

1. **Layout evidence exists for 12 of the 22 reports.** Sample images: `Claims List`, `Capitation Utilization` (Detail),
   `Benefits Used/Unused` (both modes), `Outstanding Claims` (PDF and Excel), `835 Denial Report` (three layouts),
   `Treatment Plan Status` (Detail), `Treatment Plan Analysis`, and the single-patient `Treatment Plan` document that
   shares the `Treatment Plan Proposal` criteria. Vendor field lists (no image): `Ortho Daily Journal`,
   `Missing Ortho Visits`, `Ortho Report`, `Patients by Ortho Status with Time in Treatment`. The other 10 are
   reconstructed (section 2).
2. **Eight insurance reports are stages of one claim funnel**, each an exception list for the next hand-off:
   `Unbilled Report Due to No Insurance` (no billing order) → `Procedures on Hold` (`H`) → `Claims Not Created` (billable,
   no claim) → `Claims Created Not Sent` (status `Q`) → `Claims List` (generated in a period) → `Outstanding Claims`
   (sent, unpaid, aged) → `EOB 835 Claims Reconcile Report` / `835 Denial Report` (remittance). Vendor status codes:
   `Q` Created Not Sent, `S` Sent, `A` Closed, `P` Partial Payment, `PS` / `PC` pre-auth sent / closed `[R15]`.
3. **Printed titles differ from menu names**: `Claims List` prints `Claims Listing`; `Benefits Used/Unused` prints
   `Benefits Used/Unused Report - Treatment Plan` or `... - Recall`; `Capitation Utilization` prints
   `Capitation Utilization - Detail`; `Treatment Plan Status` prints `Treatment Plan Status - Detail`; the proposal
   prints `Treatment Plan`.
4. **`Outstanding Claims` ages the estimated insurance amount, not the claim amount**: buckets `Curr`, `Over30`, `Over 60`,
   `Over 90`, `Over 120` sum to `Total` = `Est. Ins`; rows are grouped by carrier (with phone) under a `Dental Claims`
   band; each claim also prints `Group`, `Sub ID` and `Created By` `[R10]`. It is the only report here with `CREATE TASK`.
5. **`Outstanding Claims` is not reconcilable with Aging estimated insurance** by vendor statement: it omits secondary
   claims not yet created and procedures with no claim `[R10]`.
6. **Treatment-plan status is two-layered.** One exclusive status (`D` Diagnosed, `A` Accepted, `U` Unaccepted, `H` Hold,
   `L` Alternative, `R` Referred Out) plus additive flags `Scheduled` (`S`), `Completed` (`C`) and pre-auth `PS` / `PC`
   `[R40]` `[R41]` `[R49]`. Every treatment-plan report filters on the **diagnosed date**.
7. **`Treatment Plan Analysis` ratios are not acceptance rates.** A procedure stops counting under its exclusive status once
   it is scheduled or completed, pre-auth rows overlap the status rows, and ratios routinely exceed 100% (vendor example
   476.92%) `[R40]`.
8. **`Treatment Plan Status - Detail` is the unscheduled-treatment call list**: patient band with ID, chart and three
   phones; one line per planned procedure; subtotals per phase, plan and patient in `Est. Pat`, `Est. Ins`, `Total` `[R41]`.
9. **The treatment-plan proposal is a signable patient document**, not a list: patient / responsible-party / insurance
   header, procedures by plan and phase, discount and `Net Est Pat`, a remaining-benefits grid per coverage, the
   financial-disclosure text and signature lines; it opens in a signature viewer and is saved to patient notes `[R43]` `[R47]`.
10. **`Benefits Used/Unused` is a plan-anniversary report.** One block per patient with the treatment plan (or recall) and,
    per coverage, `Anni Dt`, family / individual maximum and deductible with remaining amounts; `99999` means unlimited `[R6]` `[R36]`.
11. **`835 Denial Report` is the best-documented output**: Summary by carrier, Detail by carrier → service code → reason
    code, and a flat Excel with CO / PR / OA reason codes and remark codes; enabled per tenant on request, one month
    maximum per run `[R1]`.
12. **`DPS` = Denticon Practice Services** (outsourced insurance verification requested per appointment, with an `On Hold`
    flag); **`RTE Sweep`** = the daily real-time-eligibility sweep of the schedule through DentalXChange (actor `Auto_RTE`).
    Neither report's output is documented `[R26]` `[R30]` `[R32]`.
13. **Ortho reports run on three clocks**: the ortho contract (`Ortho Start Date`), the Ortho Treatment Card (visits,
    status) and the scheduler (appointments). `Time in Treatment` = months from contract start to **today**; `Last Visit`
    means the last ortho-card visit on two reports and the general last visit on a third `[R56]`.
14. **Criteria are dynamic and tenant-dependent.** `Excel` disables `GROUP BY` on `Outstanding Claims` and locks
    `REPORT FORMAT` on `835 Denial Report`; `Include UCR` enables `Fee Schedule To Compare`; `835 Denial Report` appears
    in the list only when enabled; `Treatment Plan Status` is **not** truncated (two options only) (section 7).

---

## 2. Summary matrix

| # | Report (exact legacy name) | Printed title | Output grain | Confidence | Best evidence |
|---|---|---|---|---|---|
| 1 | `Claims List` | `Claims Listing` | One row per claim / pre-auth, grouped by carrier | DOCUMENTED | 2011 sample `[R5]` |
| 2 | `Capitation Utilization` | `Capitation Utilization - Detail` | One row per procedure for managed-care patients, grouped carrier → plan / group → date | DOCUMENTED (Detail); Summary INFERRED | 2008 sample + option text `[R8]` |
| 3 | `Claims Created Not Sent` | not seen | One row per claim in status `Q` | INFERRED | Claim-status vocabulary `[R15]` `[R16]`; `[X1]` `[X9]` `[X14]` |
| 4 | `Procedures on Hold` | not seen | One row per held procedure | PARTIALLY DOCUMENTED; layout INFERRED | Purpose + hold workflow `[R11]` `[R12]` `[R14]` |
| 5 | `DPS Eligibility Report` | not seen | One row per appointment needing / having a DPS verification | INFERRED | Verification form `[R26]` |
| 6 | `Capitation Payment` | not seen | One row per capitation payment | PARTIALLY DOCUMENTED; layout INFERRED | Purpose + payment entry screen `[R9]` `[R37]` |
| 7 | `Benefits Used/Unused` | `Benefits Used/Unused Report - Treatment Plan` / `- Recall` | One block per patient (per plan ID or recall) × coverage | DOCUMENTED | 2011–2012 samples `[R6]` |
| 8 | `Outstanding Claims` | `Outstanding Claims` | One row per open claim, grouped by carrier, aged | DOCUMENTED | 2023 PDF `[R10]`, Excel `[R4]` |
| 9 | `Claims Not Created` | not seen | One row per billable procedure without a claim | PARTIALLY DOCUMENTED; layout INFERRED | Purpose + cadence `[R11]` `[R12]` `[R21]`; `[X2]` `[X14]` |
| 10 | `Unbilled Report Due to No Insurance` | not seen | One row per procedure posted before insurance was attached | PARTIALLY DOCUMENTED; layout INFERRED | Purpose + fix workflow `[R2]` |
| 11 | `EOB 835 Claims Reconcile Report` | not seen | One row per 835 claim payment processed | PARTIALLY DOCUMENTED; layout INFERRED | Three content facts `[R22]` |
| 12 | `835 Denial Report` | not seen (vendor captions `835 Claim Denial - Summary / Detail`) | Summary: carrier. Detail: carrier → service code → reason code. Excel: one row per service line | DOCUMENTED | 2023 samples + field definitions `[R1]` |
| 13 | `RTE Sweep Details` | not seen | One row per automatic eligibility check | INFERRED | Sweep setting + eligibility popup `[R30]` `[R32]` |
| 14 | `Treatment Plan Proposal` | `Treatment Plan` | One document per patient | PARTIALLY DOCUMENTED (document layout DOCUMENTED; batch behaviour INFERRED) | 2023 and 2025 samples `[R43]` `[R44]` `[R47]` |
| 15 | `Treatment Plan Status` | `Treatment Plan Status - Detail` | One row per planned procedure, grouped by patient → plan → phase | DOCUMENTED (Detail); Summary INFERRED | 2013 sample `[R41]` |
| 16 | `Treatment Plan Analysis` | `Treatment Plan Analysis` | One block per office: count and amount per status + five ratios | DOCUMENTED | Sample + definitions `[R40]` |
| 17 | `Treatment Plan Detail` | not seen | Planned procedures for selected codes, with patient | PARTIALLY DOCUMENTED; layout INFERRED | Purpose + criteria `[R42]` |
| 18 | `Ortho Compliance Report` | not seen | One row per active-contract ortho patient with no future appointment | PARTIALLY DOCUMENTED; columns INFERRED | Purpose `[R56]` |
| 19 | `Ortho Daily Journal` | not seen | One row per ortho visit, by visit date | DOCUMENTED (field list, no image) | `[R56]` |
| 20 | `Patients by Ortho Status with Time in Treatment` | not seen | One row per ortho patient | DOCUMENTED (field list, no image) | `[R56]` |
| 21 | `Ortho Report` | not seen | One row per ortho patient (starts list) | DOCUMENTED (field list, no image) | `[R56]` |
| 22 | `Missing Ortho Visits` | not seen | One row per ortho appointment missing a visit and / or ledger entry | DOCUMENTED (field list, no image) | `[R56]` |

---

## 3. Cross-cutting facts

### 3.1 Viewer, internal names, export

| Fact | Detail | Evidence |
|---|---|---|
| Viewer | Separate "Report Viewer" window at `reports.denticon.com/ReportViewer/ReportFrame.aspx?rptPath=/PoWReports/<name>&args=<PGID>;<OID>;...`; header strip `Export to:-` with Excel and Word icons | `[S]` `[R10]` |
| Internal names seen | `NewOutstandingClaims` (Outstanding Claims PDF), `TxPlnTreatPlanPatUCR` (Treatment Plan), Excel sheet `GrpXlsClaimsAge` (Outstanding Claims Excel) | `[S]` `[R10]` `[R43]` `[R4]` |
| Argument string | Outstanding Claims: `4745;101;false;06/03/2023;ALL;ALL;A;EP;...` — group, office, a boolean, report date, providers, carriers, a letter, sent types `E`+`P`. Position meanings beyond the obvious are `[I]` | `[S]` `[R10]` |
| Signable report | `Treatment Plan` opens in `ReportSignatureFrame.aspx` with `Patient Signature` and `Dentist Signature` pads (`Sign` / `Clear` / `Done`) and `Save PDF file`; the signed copy is re-rendered (`ReportViewer2005.aspx?EXP=WRITEPDF`) with signature, `Patient or Parent/Guardian` and `Date` lines, and logged as a `System Notes` entry with an attachment | `[S]` `[D]` `[R43]` `[R47]` |
| Excel output | A download (older article: Microsoft Excel must be installed); flat rows with repeated keys; can carry columns the PDF lacks (`Recv Amt`, `Claim Note`, carrier phone, provider) | `[D]` `[S]` `[R4]` |
| Viewer save-as | The viewer can print or save as PDF, Excel or web page (stated for Capitation Utilization) | `[D]` `[R8]` |
| Security rights | `Reports - Insurance Reports Screen Full Control` / `View Only`; `Reports - Treatment Plan Reports Screen Full Control` / `View Only`; `Reports - Excel Reports Full Control` / `View Only`; enterprise `Reports - Group Reports Ins Screen ...`. No right for Ortho Reports is listed | `[D]` `[R63]` |

### 3.2 Page furniture seen in these categories `[S]`

- Line 1 organisation (group) name, line 2 report title, then `Office : <name>` (Outstanding Claims, Treatment Plan
  Analysis) or `Office: <name>` with `Total for Office, <name>` (835 Denial summary). Capitation Utilization prints an
  office block instead: address, `Ph # :`, `Tax ID :`, `Facility ID :`.
- Footer criteria echo. Examples: Claims Listing — `From`, `Thru`, `Pat From`, `Thru`, `Carrier`, `Provider`,
  `Claim Type : EP`, `Claim amt over`. Outstanding Claims — `Report Date`, `Offices`, `Providers`, `Carriers`,
  `Claim Sent Type : EClaim and Paper`, `Claim Amt Over/Equal`. Treatment Plan Status — `From`, `Thru`, `Providers`,
  `Tx Plan`, `Exclude Tx Plan : S,C`, `Exclude Pat Type`. Benefits — `Anni Date From`, `Thru`, `Ex Resp. Type`,
  `Providers`.
- Then the title again, `Printed : <date time>`, `PlanetDDS (c) 2003 - <year>`, `Page : n of m`.

### 3.3 Criteria shared by most reports

| Criterion | Effect on output | Evidence |
|---|---|---|
| `PRINT FORMAT` (`PDF` / `Excel`) | PDF → viewer. Excel → flat download. Excel can disable layout options (section 7) | `[S]` `[R4]` `[R1]` |
| `OFFICE/GROUP` + picker | One or more offices, or an office group; PDF prints an `Office :` section per office, Excel adds an `Office` / `Office Name` column | `[S]` `[R10]` `[R1]` `[R4]` |
| `PROVIDER`, `CARRIER` pickers | Filters, echoed in the footer (`Providers : ALL`, `Carriers : ALL`). Pickers default to `Include All`; narrowing needs `SELECT` then unticking `Include All` | `[S]` `[D]` `[R62]` |
| `GROUP BY` (`None` / `Provider`) | Adds a provider grouping level `[I]`; greyed when `Excel` is chosen on Outstanding Claims | `[S]` `[R4]` |
| `EXCLUDE PATIENT TYPE` / `EXCLUDE RESPONSIBLE PARTY TYPE` | Removes patients / accounts of the picked types; echoed as `Exclude Pat Type` / `Ex Resp. Type` | `[S]` `[R41]` `[R6]` |
| `ADD TO MY FAVORITES` | Saves the criteria; one version per report, later changed with `Update My Favorites` | `[D]` `[R66]` |

### 3.4 Claims vocabulary

| Term | Meaning | Evidence |
|---|---|---|
| Bill column `D` / `DD` | Procedure is claimable to one plan / to primary and secondary. Set when insurance is attached **at posting**; a procedure posted earlier has billing order `None` and cannot be claimed until edited (`Advanced` → Billing Order `Dental`) | `[D]` `[R2]` `[R19]` |
| Bill column red `H` | `Hold Claim` ticked on the procedure (Ledger or Transaction Entry). Blocks claim generation until unticked; a reason note can be added | `[D]` `[R11]` |
| Claim status letters | `Q` Created, Not Sent · `S` Sent · `A` Closed · `P` Partial Payment · `PS` Pre Auth Sent · `PC` Pre Auth Closed | `[D]` `[R15]` |
| Ledger claim text | `Pri Claim – Created, Not Sent ($x)` after `Save`; `Pri Claim – Recreated ($x)` after `E-Claim`. Either way the claim must still be transmitted from `Utilities > Batch Claims Processing` | `[D]` `[R16]` |
| Office-defined `Claim Status` | Follow-up statuses created in `Setup > Misc Setup > Claim Status`, entered with `Update Status` on a claim, history kept; surfaced as `Claim Note` in the Outstanding Claims Excel | `[D]` `[S]` `[R17]` `[R4]` |
| Pre-auth statuses | `PS` created (sent / not sent), `PC` covered, `PU` uncovered; one status shared by all coverages for the same procedures | `[D]` `[R52]` |
| Sent type | `EClaim`, `Paper` (footer codes `E`, `P`) | `[C]` `[S]` `[R5]` |
| Coverage order | Primary, Secondary, Tertiary, Quaternary (`Ty` = `P` ...) | `[C]` `[S]` `[R10]` |
| ERA 835 flow | ERA files are fetched from DentalXChange every 2 hours; auto-post runs once daily at 1:00 AM Pacific; future-dated payments wait for the pay date; a payment for an already closed claim lands on the account and allocates to the next open claim | `[D]` `[R22]` `[R23]` `[R25]` |

### 3.5 Treatment-plan vocabulary

| Term | Meaning | Evidence |
|---|---|---|
| Exclusive status | `D` Diagnosed (default on entry), `A` Accepted, `U` Unaccepted, `H` Hold, `L` Alternative, `R` Referred Out | `[D]` `[S]` `[R40]` `[R41]` `[R48]` `[R49]` |
| Additive flags | `Scheduled` (`S`), `Completed` (`C`), `Internal Referral`, `External Referral` | `[S]` `[R49]` |
| Pre-auth status | `Sent` (`PS`) / `Closed` (`PC`) | `[S]` `[D]` `[R49]` `[R40]` |
| Dates per planned procedure | Diagnosed, Start, Accepted, Scheduled, End, Pre-Auth; scheduling and pre-auth dates are filled by the system | `[S]` `[D]` `[R49]` |
| IDs | `Tx Plan ID` (alternative plans), `Phase ID` (sequence), `Order ID` (priority within a phase); optional descriptions on plan and phase print on the proposal | `[D]` `[R50]` `[R48]` |
| Other fields | Treatment Counselor, Treating Provider, Treating Office, Fee, Est. Ins, Discount %, Fee Schedule Used, Created / Modified By and On, ICD-10 codes, Notes | `[S]` `[R49]` |
| Estimation | Benefits are estimated per `Tx Plan ID` in phase order; unaccepted items lose their billing order and stop consuming benefits | `[D]` `[R53]` `[R48]` |

### 3.6 Benefits and managed care

| Fact | Evidence |
|---|---|
| Plan fields `Fam Max`, `Ind Max`, `Fam Ded`, `Ind Ded`; patient-level remaining `... Rem` | `[S]` `[R6]` `[R43]` |
| `Ind Max Rem` drops when a procedure with estimated insurance is posted and is trued up by the difference when the insurance payment is entered | `[D]` `[R38]` |
| Remaining amounts reset per plan anniversary month through `Setup > Close Out` (`Reset Insurance Benefits`); the vendor resets only January-1 plans; offices must reset the others | `[D]` `[R13]` `[R39]` |
| Unlimited maximum is entered as `99999` (managed care) and prints as `99999.00` / `99,999.00` | `[D]` `[S]` `[R36]` `[R6]` |
| A managed-care fee schedule holds two amounts per code — patient amount (co-pay) and insurance amount (supplemental fee); blank / blank = non-covered | `[D]` `[R35]` |
| Capitation payments are entered in `Transactions > Capitation Payment` against a pseudo-account `Account, Capitation`; each posts a payment line and an offsetting adjustment line | `[D]` `[S]` `[R37]` |

### 3.7 Eligibility vocabulary

| Fact | Evidence |
|---|---|
| RTE (real-time eligibility) runs through DentalXChange; what comes back depends on the carrier | `[D]` `[R28]` `[R33]` |
| Office setting `# of Days Before Appt. to Check Eligibility` (vendor best practice 2) makes the system sweep the schedule daily and update the plan status | `[D]` `[R29]` `[R30]` |
| Status values `Eligible`, `Not Eligible`, `Unknown`; appointment icons `P` / `S` green, gray, red; status expires a month after the last check | `[S]` `[D]` `[R32]` `[R33]` `[R28]` |
| Each check records an actor and time: a user, `Auto_RTE`, or `Auto-Expired`; the payer message is kept (sample: subscriber not found) | `[S]` `[R32]` |
| DPS = Denticon Practice Services; `DPS Ins. Verification` is a per-appointment request with a form and an `On Hold` flag, answered within 24–48 hours | `[D]` `[S]` `[R26]` `[R27]` |
| AutoEligibility (DentalXChange Eligibility AI) replaces the nightly RTE for subscribers: nightly sync up to 10 days ahead plus 15-minute refresh | `[D]` `[R34]` |

### 3.8 Ortho vocabulary

| Fact | Evidence |
|---|---|
| Flags: ortho patient (icon), ortho office, ortho provider, ortho assistant (user) | `[D]` `[R58]` `[R30]` `[R60]` |
| Ortho Treatment Card — visit history columns `Tran Date`, `Dr`, `Asst`, `Oral Hygiene`, `Compliance`, `Procedures`, `UAW`, `LAW`, `Elastics`, `Appliance`, `Visit Notes`, `Next Visit Procedures`, `Interval`, `Duration`, `Notes`; header counters `Treatment Start Date`, `Time in Treatment(Months)`, `Missed Appointments`, `Broken Brackets` | `[S]` `[R57]` |
| Ortho treatment plan — `Skeletal Diag`, `Dental Diag`, `Appliance`, `Status`, `Crowding/Spacing`, `Overbite`, `Overjet`, `Tx Plan Notes`, questionnaire; one plan per day; "newest plan" supplies `Ortho Status` | `[S]` `[D]` `[R57]` `[R56]` |
| Saving a visit auto-posts the `Ortho Visit Code` (best practice `D8670A`, usually no fee) to the ledger | `[D]` `[R57]` `[R31]` |
| Ortho contract — `Treatment Start Date`, `Treatment End Date`, `Banding Date`, patient and insurance payment plans | `[D]` `[R59]` |
| Ortho status value list | `[unverified]` — not shown in any source |

### 3.9 Old names still used in vendor and client material

| Old name | Current report + option | Evidence |
|---|---|---|
| `Outstanding Claims - Excel` | `Outstanding Claims` + `PRINT FORMAT` = `Excel` | `[D]` `[S]` `[R4]` |
| `Outstanding Claim Report for Provider` | `Outstanding Claims` + `GROUP BY` = `Provider` | `[D]` `[R18]`; mapping `[I]` |
| `Pre-Auth Outstanding Claims` | `Outstanding Claims` + `Pre-Authorization` | `[D]` `[R13]` `[R18]` |
| `Benefits Used/Unused - Recall` | `Benefits Used/Unused` + `Recall` | `[D]` `[S]` `[R6]` |
| `Capitation Utilization - Detail` | `Capitation Utilization` + `REPORT FORMAT` | `[D]` `[S]` `[R13]` `[R8]` |
| `Treatment Plan Status - Detail`, `Treatment Plan Status Report – Detail` | `Treatment Plan Status` + `REPORT FORMAT` | `[D]` `[R13]` `[R14]` `[R41]` |
| Paths `Reports (old) > Insurance Reports > Procedures on Hold`, `Reports (old) > Treatment Plan Reports > ...` | Same reports in the new menu | `[D]` `[R14]` |

A 2022 vendor blog names "Capitation utilization by provider", "Outstanding claims by provider" and "Treatment plan status
by code" among its most popular ready-made reports — the provider-grouped and code-filtered variants are the ones in
common use. It also names an "Ortho revenue report", which matches none of the five current `Ortho Reports` `[D]` `[R67]`.

### 3.10 Vendor-recommended cadence

| Report | Role | Frequency | Recommended parameters | Evidence |
|---|---|---|---|---|
| `Claims Not Created` | Billing, front office | End of day; weekly review; one run per day of service | — | `[D]` `[R12]` `[R11]` `[R21]` |
| `Procedures on Hold` | Front office | Daily | Today's date | `[D]` `[R12]` `[R14]` |
| `Unbilled Report Due to No Insurance` | Front office, billing | End of day | — | `[D]` `[R12]` |
| `Outstanding Claims` (claims and pre-auth) | Billing | Month end, on the default date | — | `[D]` `[R13]` |
| `Capitation Utilization - Detail` | Managed-care offices | Month end, sent to the carrier | — | `[D]` `[R13]` `[R8]` |
| `Benefits Used/Unused` | Front office, treatment coordinator | Before the benefit rollover (year end) | Anniversary range of the next rollover | `[D]` `[R6]` |
| `835 Denial Report` | Billing / RCM | One month maximum per run | — | `[D]` `[R1]` |
| `EOB 835 Claims Reconcile Report` | Billing / RCM | When ERA payments look missing | — | `[D]` `[R22]` |
| `Treatment Plan Status - Detail` | Front office | Daily, weekly, monthly; month-end list | `Accepted`, exclude `Completed` and / or `Scheduled` | `[D]` `[R14]` `[R13]` |
| `Treatment Plan Analysis` | Management / C-level | Daily, weekly, monthly | Diagnosed range, default filters | `[D]` `[R14]` |
| Ortho reports | Ortho coordinator `[I]` | Not stated | — | `[R56]` |

---

## 4. Insurance Reports (`insurance_reports`)

Vendor screenshots (2023) show 12 entries without `835 Denial Report`, in a different order from our capture; the
tenant with the 835 report enabled shows our 13-entry order `[S]` `[R1]` `[R2]`.

### Claims List

| | |
|---|---|
| Purpose | List of all claims — or pre-authorizations — **generated** in a date range, for audit and follow-up `[D]` `[R5]` `[R7]` |
| Confidence | DOCUMENTED (layout from a 2011 sample; current layout not re-verified) |
| Printed title | `Claims Listing` `[S]` |
| Grain | One row per claim; group = carrier |

**Output layout** `[S]` `[R5]` (2011)

| # | Column | Content |
|---|---|---|
| 1 | `Chart #` | Patient chart number |
| 2 | `Patient / Subscriber` | Two names, slash-separated |
| 3 | `Patient - Subscriber DOB` | Two dates |
| 4 | `Sub ID` | Subscriber id |
| 5 | `Claim #` | Claim number |
| 6 | `Claim Sent - DOS` | Claim sent date and date of service |
| 7 | `Claim Amt` | Amount billed on the claim |
| 8 | `Est. Ins` | Estimated insurance |
| 9 | `Recv. Amt.` | Insurance received so far |
| 10 | `Rem. Amt.` | In every sample row = `Est. Ins` − `Recv. Amt.` (a 100.00 claim with 0.00 estimate shows 0.00 remaining) `[I]` |
| 11 | `Status` | `Sent` on every sample row; other values presumably follow the status letters in 3.4 `[I]` |

**Grouping and totals** `[S]`: band `Carrier : <name>   Ph : <phone>`; subtotal `Total for <carrier> [ n ] :` where `n`
is the claim count, with sums of columns 7–10. A grand total is not visible on the sample page `[unverified]`.

**Criteria → output**

| Criterion | Effect | Evidence |
|---|---|---|
| `CLAIM/PRE-AUTH` | `Pre-Authorization` lists pre-auth claims instead of claims | `[D]` `[R7]` |
| `CLAIM TYPE` (`Both` / `Dental` / `Medical`) | Filters dental vs medical claims | `[C]` `[I]` |
| `DATE RANGE` | Date the claim was **generated**, not the date of service | `[D]` `[R5]` |
| `NAME RANGE` | Patient last-name range; footer `Pat From` / `Thru` | `[S]` |
| `CLAIM AMOUNT OVER OR EQUAL TO` | Minimum claim amount; footer `Claim amt over` | `[S]` |
| `CARRIER` | Carrier filter; footer `Carrier` | `[S]` |
| `CLAIM SENT TYPE` | `EClaim` / `Paper`; footer `Claim Type : EP` | `[S]` |
| `Include Resolved Claims` | Adds closed claims; by default only unresolved ones are listed | `[I]` `[unverified]` |

**Users and cadence**: insurance coordinator; as needed (claims generated in a period, pre-auth tracking) `[D]` `[R5]` `[R7]`.

**Quirks**: the 2011 footer echoes `Provider : ALL` although today's criteria have no provider picker `[S]` `[C]`; some
demo rows show `ORTHO` in `Chart #` (likely demo chart numbers, meaning not established) `[S]`.

### Capitation Utilization

| | |
|---|---|
| Purpose | Managed-care (DHMO) carriers require a monthly report of patients seen and services used; some procedures earn a supplemental reimbursement. The office sends this report to the carrier `[D]` `[R8]` |
| Confidence | DOCUMENTED for `Detail` (2008 sample); `Summary` INFERRED |
| Printed title | `Capitation Utilization - Detail` `[S]` |
| Grain | One row per procedure performed for a managed-care patient |

**Output layout** `[S]` `[R8]` (2008)

- Header: office name, address lines, `Ph # :`, `Tax ID :`, `Facility ID : <value>`.
- Columns: `Patient Name` · `Sub ID` · `Sub DOB` · `Tran. Date` · `Code` · `Description` · `Th` · `Surf` · `Prdr` ·
  `Office Default` · `Co - Pay` · `Sup. Fee.`
- `Co - Pay` and `Sup. Fee.` correspond to the two amounts of the managed-care fee schedule (patient amount and
  supplemental insurance amount) `[D]` `[R35]`; `Office Default` is taken to be the comparison (UCR) fee — all zero in
  the sample `[I]`. `Th` shows a tooth number or a quadrant (`UL`, `LL`).

**Grouping and totals** `[S]`: `Carrier : <name>` → `Plan ID : <id>   Group No : <no>` → `Tran Date : <date>`; totals
`Total for <group no> :`, `Total for carrier - <name> :`, `Grand Total :` over the three money columns.

**Criteria → output**

| Criterion | Effect | Evidence |
|---|---|---|
| `REPORT FORMAT` (`Detail` / `Summary`) | `Summary` layout not documented; taken to keep the carrier / plan totals and drop patient lines | `[I]` `[unverified]` |
| `DATE RANGE` | Transaction date of the procedures (`Tran. Date`) | `[S]` `[I]` |
| `FACILITY ID` | Free text printed in the header as `Facility ID :` (the carrier's id for the office) | `[S]` `[I]` |
| `Include UCR` + `Fee Schedule To Compare` | Ticking `Include UCR` reveals a list of fee schedules; the chosen one is shown for comparison | `[D]` `[R8]` |
| `Print All Codes` | Ticked: all codes including z-codes (internal extra-service codes). Unticked: only codes to be reported to the carrier | `[D]` `[R8]` |
| `Include Fees Charged` (default on) | Shows the fees associated with the reported procedures | `[D]` `[R8]` |
| `Print Office Address` | Prints the office location block in the header | `[D]` `[R8]` |
| `Show Billing Provider For Hygienist` | Not documented. Taken to print the billing provider instead of a hygienist in `Prdr` (carriers accept only dentists as treating providers) | `[I]`; context `[R64]` |
| `GROUP BY` `Provider` | Adds a provider level | `[I]` |

**Users and cadence**: managed-care offices, month end `[D]` `[R13]`. Comparable: Open Dental Capitation Utilization
(carrier, subscriber, patient, code, tooth, surface, date, `UCR Fee`, `Co-Pay`) `[X4]`; SoftDent Capitation Insurance
Company Encounter adds patients-seen and procedure counts `[X8]`.

### Claims Created Not Sent

| | |
|---|---|
| Purpose | Claims that were created (saved) but never transmitted or printed — status `Q`, ledger text `Created, Not Sent` — so they can be batched and sent `[I]`; vocabulary `[D]` `[R15]` `[R16]` |
| Confidence | INFERRED — no vendor article names this report |
| Grain | One row per claim |

**Reconstructed layout (INFERRED)** — basis: the `Claims Listing` family `[R5]` plus Open Dental `Claims Not Sent`
(clinic, date of service, claim type, claim status, patient, carrier, claim fee, procedure codes) `[X1]`, Dentrix
Enterprise `Insurance Claims Not Sent` (totals for primary, secondary and combined; filing-deadline column) `[X9]` and
Dentrix `Insurance Claims to Process` (created but not printed or sent; oldest claim first) `[X14]`.

- Likely columns: patient / subscriber, claim #, created date, date of service, coverage order, claim amount, estimated
  insurance, status; carrier band with phone; subtotal per carrier with claim count; provider level when `GROUP BY` =
  `Provider`.

**Criteria → output**

| Criterion | Effect | Evidence |
|---|---|---|
| `CREATED ON DATE RANGE` | Date the claim was created (not DOS, not sent date) | `[C]` |
| `CLAIM TYPE`, `PROVIDER`, `CARRIER`, `NAME RANGE`, `CLAIM AMOUNT OVER OR EQUAL TO` | Filters, as on `Claims List` | `[C]` `[I]` |
| `GROUP BY` | `None` / `Provider` | `[C]` |

**Users and cadence**: billing, daily before batch submission `[I]`. **Quirk**: a claim saved with `E-Claim` reads
`Recreated`, not `Created, Not Sent`, but still waits in Batch Claims Processing — whether the report includes it is
`[unverified]` `[R16]`.

### Procedures on Hold

| | |
|---|---|
| Purpose | Shows procedures whose billing the office put on hold, so the hold can be released and a claim generated `[D]` `[R12]` `[R14]` |
| Confidence | PARTIALLY DOCUMENTED (purpose, workflow); layout INFERRED |
| Grain | One row per held procedure |

**Documented behaviour** `[D]` `[R11]`: `Hold Claim` is a tick on the procedure (Ledger date link or Transaction Entry);
a red `H` shows in the Bill column; the hold lasts until unticked; a note explaining the hold can be added; held
procedures also surface on `Claims Not Created`; the ledger filter `Unbilled Procedures` shows them on screen `[R20]`.

**Reconstructed layout (INFERRED)**: patient (id), date, code, description, tooth / surface, provider, fee, estimated
insurance, carrier, hold note. Whether `DATE RANGE` is date of service or transaction date is `[unverified]`.

**Users and cadence**: front office, daily, run for today's date `[D]` `[R14]`.

### DPS Eligibility Report

| | |
|---|---|
| Purpose | Worklist / audit of insurance-verification requests to the vendor's verification service (DPS), by appointment `[I]`; feature `[D]` `[R26]` |
| Confidence | INFERRED — the report itself is not described anywhere |
| Grain | One row per appointment (per coverage `[unverified]`) |

**Documented feature** `[D]` `[S]` `[R26]` `[R27]`: the appointment window has a `DPS Ins. Verification` button that
opens `Subscriber / Insurance Verification`: appointment date and time, patient name, SSN / member id, DOB, phone,
email, provider; for primary and for secondary insurance — subscriber name, id, DOB, `Patient Is Subscriber`, carrier
name and address, `Verify Type` (sample value `Re-verification`), employer, group number; an **`On Hold`** tick;
`Submit`. The service researches benefits by web, fax and phone and usually answers within 24–48 hours.

**Reconstructed layout (INFERRED)**: appointment date and time, appointment created date, provider, patient (id, DOB,
phone), carrier, subscriber, subscriber id, group, employer, verify type, on-hold flag, request / verification status.

**Criteria → output**

| Criterion | Effect | Evidence |
|---|---|---|
| `DPS ELIGIBILITY` → `On Hold` | Only requests flagged `On Hold` on the verification form | `[S]` `[I]` |
| `DATE RANGE TYPE` | `Appointment Date`, `Appointment Created Date` or `Both` — which date range(s) select the appointments | `[C]` |
| `Include patients with no insurance` | Adds appointments of patients with no plan attached | `[C]` `[I]` |

### Capitation Payment

| | |
|---|---|
| Purpose | History of the capitation payments recorded from managed-care carriers `[D]` `[R9]` |
| Confidence | PARTIALLY DOCUMENTED (purpose, source data); layout INFERRED |
| Grain | One row per capitation payment |

**Source data** `[S]` `[D]` `[R37]`: `Transactions > Capitation Payment` — carrier (listed as carrier + capitation fee
schedule), `Use Payment Code Of` (e.g. `CAP PYMT`), `Use Adjustment Code Of` (e.g. `ADJ ON - Capitation Adjustment`),
`Date`, `Amount`, `Check #`, `Bank #`, `EOB #`, `Notes`. Each payment posts two ledger lines on `Account, Capitation`:
`Pay. : <carrier>` (negative) and `Adj. : <carrier>` (positive, offsetting), with office, provider and user. The
capitation ledger shows 25 rows per page and has its own date filter and download.

**Reconstructed layout (INFERRED)**: date, carrier, payment code / description, check #, bank #, EOB #, amount, user;
subtotal per carrier and grand total. Comparable: SoftDent `Capitation Collections Summary` (capitation payments,
patient payments, supplemental insurance payments, total, patients seen, average collection per patient) `[X7]`.

**Criteria**: `DATE RANGE` (payment date `[I]`), `CARRIER`, `OFFICE/GROUP` `[C]`.

### Benefits Used/Unused

| | |
|---|---|
| Purpose | Find patients who still have annual insurance benefits before the plan's rollover, and who either have a treatment plan or are due for recall `[D]` `[R6]` |
| Confidence | DOCUMENTED (both modes, samples dated 2011–2012) |
| Printed title | `Benefits Used/Unused Report - Treatment Plan` / `Benefits Used/Unused Report - Recall` `[S]` |
| Grain | One block per patient per treatment-plan ID (or recall item), one line per coverage |

**Output layout — `Treatment Plan` mode** `[S]` `[R6]`

| Column group | Columns |
|---|---|
| Patient | `Patient Name` (with `Chart # :` underneath) · `Phones` (`(H)`, `(C)`, `(W)`) |
| `Treat Pln` | `ID` · `Charges` (total charges of that plan ID) |
| Coverage | `Carrier` (prefixed `P :` or `S :`) · `Anni Dt` |
| Maximums | `Fam Max` · `Fam Max Rem` · `Ind Max` · `Ind Max Rem` |
| Deductibles | `Fam Ded` · `Fam Ded Rem` · `Ind Ded` · `Ind Ded Rem` |

The 2011 images label two headers `Fax Max Rem` and `Ins Max Rem`; the 2023 treatment-plan document uses `Fam Max Rem`
and `Ind Max Rem`, so the old labels are typos `[S]` `[I]`.

**Output layout — `Recall` mode** `[S]`: same benefit columns; the `Treat Pln` group is replaced by `Recall` → `Date` ·
`Code` · `Reason`, and `Chart#` is its own column. Primary and secondary coverage print as two lines.

**Grouping and totals**: no group bands or totals in either sample `[S]`.

**Criteria → output**

| Criterion | Effect | Evidence |
|---|---|---|
| `TREATMENT PLAN/RECALL` | Chooses the layout and population | `[D]` `[S]` |
| `ANNIVERSARY DATE RANGE` | The plan's anniversary — the next date benefits roll over; default = first day of next month through one year later minus a day | `[D]` `[C]` `[R6]` |
| `PROVIDER` | Footer `Providers` | `[S]` |
| `EXCLUDE RESPONSIBLE PARTY TYPE` | Footer `Ex Resp. Type` | `[S]` |
| Recall-mode extras | The 2011 Recall footer echoes `Recall Date From / Thru`, `Max Over` and `Recall Codes` — criteria that do not exist on the `Treatment Plan` state we captured | `[S]`; current screen `[unverified]` |

**Users and cadence**: front office and treatment coordinators near year end (or monthly for non-calendar plans) `[D]` `[R6]`.

**Quirks**: remaining amounts are only as good as the office's benefit-reset routine (3.6); `99999.00` rows are
unlimited plans, not real balances; remaining maximum already nets posted procedures with estimated insurance, not
only paid claims `[D]` `[R38]` `[R39]` `[R36]`. Comparable: Open Dental Treatment Finder (`Annual Max`, `Amt Used`,
`Amt Pend`, `Amt Rem`, `TreatPlan`, carrier; filter `Amount remaining over`) `[X5]`.

### Outstanding Claims

| | |
|---|---|
| Purpose | All claims sent but not yet recorded as paid, for follow-up; `Pre-Authorization` gives outstanding pre-auths `[D]` `[R3]` `[R10]` `[R13]` |
| Confidence | DOCUMENTED (PDF printed 6/3/2023; Excel sample c. 2015) |
| Printed title / internal name | `Outstanding Claims` / `NewOutstandingClaims` `[S]` |
| Grain | One row per open claim; group = carrier |

**PDF layout** `[S]` `[R10]`

- Header: organisation, `Outstanding Claims`, `Office : <name>`, then a band `Dental Claims` (a `Medical Claims` band is
  presumed for medical claims `[I]`).
- Columns: `Claim Sent / DOS` · `Patient Name / DOB` · `Subscriber Name / DOB` · `Chart #` · `Claim #` · `Ty` · `UCR` ·
  `Claim $` · `Est. Ins` · `Curr` · `Over30` · `Over 60` · `Over 90` · `Over 120` · `Total`.
- Each claim prints extra lines: `Group: <no>` under the patient, `Sub ID: <id>` under the subscriber, and
  `Created By: <user>` at the right.
- `Ty` = coverage order (`P` on every sample row). `UCR` and `Claim $` can differ (530.00 vs 326.00).
- **Aging**: the bucket columns carry `Est. Ins`, and `Total` = `Est. Ins` (1,822.00 claim, 1,500.00 estimate →
  `Over 120` 1,500.00, `Total` 1,500.00). A claim with 0.00 estimate is still listed with zero buckets. Age basis (sent
  date vs DOS) cannot be told from the sample — every row is older than 120 days on both `[unverified]`; comparables age
  from the sent date `[X3]`.

**Grouping and totals**: band `Carrier : <name>   Ph : <phone>`. Carrier and grand totals are not on the sample's first
page `[unverified]`; `GROUP BY` `Provider` presumably adds a provider level `[I]`.

**Footer** `[S]`: `Report Date`, `Offices`, `Providers`, `Carriers`, `Claim Sent Type : EClaim and Paper`,
`Claim Amt Over/Equal`, title, `Printed`, `PlanetDDS (c) 2003 - 2023`, `Page : 1 of 42`.

**Excel layout** `[S]` `[R4]` (read from a low-resolution image; spellings approximate): row 1 organisation,
`User ID : <user>`, title, then one row per claim — `Office` · `Carrier Name` · `Carrier Phone` · `Provider` · `Patient` · `Pat ID` ·
`Pat DOB` · `Subscriber` · `Sub DOB` · `Sub ID` · `Group #` · `DOS` · `Claim Sent` · `Claim #` · `UCR` · `Claim$` · `Est Ins` ·
`Recv Amt` · `Curr` · `Over30` · `Over60` · `Over90` · `Over120` · `Total` · `Claim Note`. `Claim Note` holds the latest
office claim status with timestamp and user. Sheet name `GrpXlsClaimsAge`.

**Criteria → output**

| Criterion | Effect | Evidence |
|---|---|---|
| `CLAIM/PRE-AUTH` | Claims or pre-authorizations | `[D]` `[R13]` `[R18]` |
| `CLAIM TYPE` | Both / Dental / Medical | `[C]` |
| `REPORT DATE` | Single as-of date; vendor advises running on the default date for a "right now" figure | `[D]` `[R13]` |
| `CLAIM AMOUNT OVER OR EQUAL TO` | Minimum; footer `Claim Amt Over/Equal` | `[S]` |
| `CLAIM SENT TYPE` | `EClaim`, `Paper`; footer text | `[S]` |
| `OTHER OPTIONS` `Current` … `Over 120` | Which age buckets to include | `[C]` `[I]` |
| `PRINT FORMAT` = `Excel` | Flat workbook; `GROUP BY` becomes greyed | `[S]` `[R4]` |
| `GROUP BY` `Provider` | The former "Outstanding Claim Report for Provider" | `[D]` `[R18]` `[I]` |
| `CREATE TASK` | Creates Task Manager tasks of type `Outstanding Claim` (or `Outstanding Pre-Auth`) for the claims on the report, after a confirmation stating the count; a task closes automatically when its claim is closed or deleted. Task grid: priority, due date, status, action, patient, office, provider, claim DOS, claim amount, est. ins, carrier, assignee, last updated | `[D]` `[S]` `[R18]` |

**Users and cadence**: billing; month end `[D]` `[R13]`.

**Quirks**: not comparable with Aging estimated insurance — it omits secondary claims not yet created and unclaimed
procedures `[D]` `[R10]`. The analytics add-on defines "Outstanding Claims" as of a date with carrier, claim-type and
30+ / 60+ / 90+ / 120+ aging breakdowns `[D]` `[R61]`. Comparable: Open Dental Outstanding Insurance Claims (carrier,
phone, type, assigned user, patient, dates sent, tracking status, amount; bulk tracking update) `[X3]`.

### Claims Not Created

| | |
|---|---|
| Purpose | Procedures that should have a claim but do not, so that claims get created and sent `[D]` `[R12]` `[R21]` |
| Confidence | PARTIALLY DOCUMENTED (purpose, cadence, one inclusion rule); layout INFERRED |
| Grain | One row per posted procedure × coverage level without a claim |

**Documented behaviour**: procedures held with `Hold Claim` appear here `[D]` `[R11]`; recommended daily, or one run per
day of service at week end, and weekly as a standing check `[D]` `[R11]` `[R21]`; secondary claims are created only
when the procedure carries `DD` and the primary claim is closed `[D]` `[R19]`.

**Reconstructed layout (INFERRED)** — basis: Open Dental `Procedures Not Billed to Insurance` (patient, status,
procedure date, description, clinic, amount) `[X2]` and Dentrix `Procedures Not Attached to Insurance` (grouped by
patient, procedure date, filing-deadline column) with its companion `Secondary Ins Claims Not Created` `[X14]`: patient
(id), date of service / transaction date, code, description, provider, fee, estimated insurance, Bill value (`D`,
`DD`, `H`), coverage level, carrier. The legacy tool folds the secondary / tertiary / quaternary cases into one report
through the `CLAIM TYPE` ticks `[C]`.

**Criteria → output**

| Criterion | Effect | Evidence |
|---|---|---|
| `REPORT DATE` radio `ALL` / `DOS Date` / `Transaction Date` + single date | `ALL` = every unclaimed procedure; otherwise one day, by date of service or by transaction date | `[C]`; single-day use `[D]` `[R11]` |
| `CLAIM TYPE` `Primary` / `Secondary` / `Tertiary` / `Quaternary` | Coverage levels whose missing claims are listed | `[C]` `[I]` |

### Unbilled Report Due to No Insurance

| | |
|---|---|
| Purpose | Patient records whose procedures were posted **before** insurance was attached (billing order `None`, no `D` in Bill), which must be edited before a claim can be generated `[D]` `[R2]` `[R12]` |
| Confidence | PARTIALLY DOCUMENTED (purpose, fix workflow); layout INFERRED |
| Grain | One row per such procedure |

**Fix workflow the report feeds** `[D]` `[R2]` `[R19]`: open the procedure → `Advanced` → Billing Order `None` →
`Dental` → accept the recalculation → save; for a missed secondary, delete the primary claim and payment, set the
secondary billing order, recreate.

**Reconstructed layout (INFERRED)**: patient (id), procedure date, code, description, provider, fee, current carrier.
Comparable: Open Dental option to include procedures completed before insurance was added `[X2]`.

**Criteria**: `DATE RANGE` only (date basis `[unverified]`), `OFFICE/GROUP`, `PRINT FORMAT` `[C]`.

### EOB 835 Claims Reconcile Report

| | |
|---|---|
| Purpose | Reconcile ERA (835) payments received from DentalXChange against what was auto-posted `[D]` `[R22]` |
| Confidence | PARTIALLY DOCUMENTED (content facts); layout INFERRED |
| Grain | One row per 835 claim payment processed `[I]` |

**Documented content** `[D]` `[R22]` (the vendor calls it "EOB Claim Reconcile Report"): lists all processed payments
for the selected date range; indicates whether each was auto-posted; gives the reason when it was not. Context: files
fetched every 2 hours, auto-post at 1:00 AM Pacific; a payment absent from this report after its pay date indicates a
failed download.

**Reconstructed layout (INFERRED)** — basis: `[R22]`, DentalXChange matched / unmatched claim payments `[X10]`, Open
Dental ERA claims-paid grid (received flag, patient, date of service, claim identifier, payer control number, claim
fee, insurance paid, patient portion, deductible, write-off) `[X6]`: carrier, check / EFT number, payment date, file
received date, patient, claim id, date of service, billed amount, paid amount, matched flag, posted flag, resulting
claim status, reason not posted.

**Criteria → output**

| Criterion | Effect | Evidence |
|---|---|---|
| `835 CLAIM MATCHING STATUS` (`Both` / `Matched` / `UnMatched`) | Whether the 835 claim payment was matched to a claim | `[C]` `[I]` |
| `CLAIM STATUS` (`ALL` / `Partial Closed` / `Closed`) | Claim state after posting (status `P` vs `A`) | `[C]` `[I]`; letters `[R15]` |
| `DATE RANGE` radio | `By Payment Date` or `By File Received on Date` | `[C]` |
| `Show Details UCR` (default on) | Not documented; taken to add service-line detail with the billed (UCR) amount | `[unverified]` |
| `CARRIER` | Filter | `[C]` |

**Quirks**: an 835 payment for a claim already closed is posted to the account and allocates to the next open claim, so
ledger and EOB can show different dates of service `[D]` `[R23]`. The per-claim EOB (`Print EOB Detail` from the ledger
date link) loads only for the patient whose ledger is selected; opened from another family member's context it prints
blank `[D]` `[R24]`.

### 835 Denial Report

| | |
|---|---|
| Purpose | ERA 835 auto-payments that were denied or partially paid, to find and fix claim problems `[D]` `[R1]` |
| Confidence | DOCUMENTED (2023 samples and field definitions) |
| Availability | Enabled per tenant on request to support or the account manager; date range up to one month `[D]` |

**Summary (PDF)** `[S]`: `Office: <name>`; columns `Carrier / Carrier ID` · `Charges Submitted` · `Other Adjust` ·
`Contract Obligations` · `Patient Responsibility` · `Actual Allowed` · `Paid Amount`; one row per carrier (name with id
in parentheses); `Total for Office, <name> :`.

**Detail (PDF)** `[S]`: band `Carrier: <name> (<id>)`; per **service code** a bold line (code, description, `Count`,
`Charges Submitted`, `Actual Allowed`, `Paid Amount`) followed by one line per **reason code** (code, description,
count, `Other Adjust`, `Contract Obligations`, `Patient Responsibility`); `Total for carrier, <name>:` with count and
all six amounts.

**Detail (Excel)** `[S]` `[D]`: one row per service line — `Office Name` · `Carrier Name` · `CarrierID` · `PatientID` ·
`ClaimID` · `DOS` · `SvcCode` · `CLMChargeSubmitted` · `Reason Code` · `Reason Code Desc` · `CO Reason Code` (+ description)
· `Other Reason Code` · `Other Reason Code Desc` · `Remark Code` · `Remark Code Desc` · `PatAdj` · `COAdj` · `OtherAdj` ·
`ActualAllowed` · `Paid Amount`; last row `Total : <row count>` with sums.

**Field definitions** `[D]` `[R1]` (paraphrased)

| Field | Definition |
|---|---|
| Charges Submitted | Amount the office submitted for the procedure |
| Contract Obligations (CO) | Difference between billed and allowed when in network — the contractual write-off; not owed by the patient |
| Patient Responsibility | Portions owed by the patient: deductible, co-pay, co-insurance, certain denials, no coverage on the date of service |
| Other Adjustment | Adjustment that is neither contractual nor patient responsibility |
| Actual Allowed | Maximum plan allowance; not applicable to non-participating dentists |
| Paid Amount | Amount the carrier paid |
| Reason Code / Remark Code | Code and text of the adjustment or denial reason; remark codes add information. Sample values: `96`, `169`, `1`, `2`, `16`, `45`, `149`; `N255`, `N37`, `N587` — the standard 835 adjustment and remark code sets `[I]` |
| Count | Number of reason codes per service |

**Criteria → output**

| Criterion | Effect | Evidence |
|---|---|---|
| `REPORT FORMAT` | `Summary` / `Detail` for PDF; greyed with `Detail` marked when `Excel` is selected (only "Detail-Excel" is documented) | `[D]` `[S]` |
| `DATE RANGE` | Up to one month | `[D]` |
| `CARRIER` | Carriers to include | `[D]` |
| `EXCLUDE REASON CODE` | Removes lines with the picked reason codes (for example routine contractual adjustments) | `[C]` `[I]` |
| Defaults | The vendor's own screenshot shows the state we captured: `Excel` selected and the office box `ALL` | `[S]` |

### RTE Sweep Details

| | |
|---|---|
| Purpose | Results of the automatic real-time-eligibility sweep of upcoming appointments `[I]`; feature `[D]` `[R30]` |
| Confidence | INFERRED — the report is not described anywhere |
| Grain | One row per automatic eligibility check (appointment × coverage) `[I]` |

**Documented feature** `[D]` `[S]`: for DentalXChange clients the system sweeps the schedule a configured number of
days ahead and runs real-time eligibility for patients with a plan, updating the plan status `[R29]` `[R30]`. The
stored result shows `Checked by: Auto_RTE`, the check time, `PAYER`, `SUBSCRIBER` and an `ERROR` text when the payer
rejects the inquiry `[R32]`. An ineligible result can raise a blocking flash alert `[R31]`. Offices on AutoEligibility
no longer use the nightly RTE `[R34]`.

**Reconstructed layout (INFERRED)**: check date-time (`CREATED ON DATE RANGE`), office, appointment date, patient,
carrier / payer id, subscriber, coverage order, result (`Eligible` / `Not Eligible` / `Unknown`), payer error text.
Comparable: the vendor's interactive `Eligibility Verification` screen (name, appointment provider, time, carrier,
subscriber, eligibility status, last check and actor) `[R32]`; CareStack pending-eligibility report `[X12]`.

---

## 5. Treatment Plan Reports (`treatmentplan_reports`)

All four filter on `DIAGNOSED DATE RANGE` — the date range in which procedures were entered into the plan (the
diagnosed date defaults to the entry date and can be back-dated) `[D]` `[R41]` `[R48]`.

### Treatment Plan Proposal

| | |
|---|---|
| Purpose | Print the patient-facing treatment plan (estimate and consent) for patients selected by name and diagnosed date `[I]`; single-patient version `[D]` `[R43]` |
| Confidence | PARTIALLY DOCUMENTED — the document layout is DOCUMENTED for the single-patient `Treatment Plan` report whose dialog carries the same options; that the batch report prints the same document per patient is INFERRED |
| Printed title / internal name | `Treatment Plan` / `TxPlnTreatPlanPatUCR` `[S]` |
| Grain | One document per patient |

**Document layout** `[S]` `[R43]` `[R44]` `[R47]` (2023 and 2025)

1. Organisation name; title `Treatment Plan`.
2. Box: `Patient :` · `Pat ID :` · `DOB :`.
3. Box: `Chart # :` · `Resp. Party :` with address · `Office Phone # :` · `Fax # :` · `Primary Insurance:` (and
   `Secondary Insurance:`).
4. Procedure grid. 2023: `Ord` · `Prdr` · `Prop. Dt` · `Start Dt` · `End Dt` · `Th` · `Surf` · `Code` · `Description` ·
   `Est Pat.` · `Est Ins.` · `Fee` · `UCR`. 2025: `Prdr` · `Prop. Dt` · `Th` · `Surf` · `Code` · `Description` · `Est Pat.` ·
   `Est Ins.` · `Fee` · `UCR` (the vendor removed `Order`, `Start Date` and similar fields from screen and report)
   `[D]` `[R48]`. `Prdr` is a provider code in 2023 and a full name in 2025.
5. Grouping `Treatment Plan : <id>` → `Phase : <id>`; totals `Total for Phase <n> :` and `Total for Treatment Plan <n> :`
   over `Est Pat.`, `Est Ins.`, `Fee`, `UCR`; below each, `Discount :` (when any) and `Net Est Pat :` (= `Est Pat.` −
   discount; 100.00 − 25.00 = 75.00).
6. Benefits grid: rows `Primary`, `Secondary`, `Tertiary`, `Quaternary` (as present); columns `Fam Max` · `Fam Max Rem` ·
   `Ind Max` · `Ind Max Rem` · `Fam Ded` · `Fam Ded Rem` · `Ind Ded` · `Ind Ded Rem`.
7. Financial-disclosure text (office letter of type `Financial Disclosure`; may contain merge fields such as tooth
   numbers) `[S]` `[D]` `[R45]` `[R46]`.
8. Signature line `Patient or Parent/Guardian` and `Date` (image and date when signed electronically).

**Markers** `[D]`: `*` next to a fee = a discount applies to that procedure `[R51]`; `~` next to a fee = the deductible
is being applied to that service `[R54]`. **`UCR` column** = the higher of the office UCR fee and the insurance fee
schedule fee `[D]` `[R44]`.

**Criteria → output**

| Criterion | Effect | Evidence |
|---|---|---|
| `NAME RANGE`, `DIAGNOSED DATE RANGE`, `PROVIDER`, `EXCLUDE PATIENT TYPE` | Select the patients and procedures (batch only) | `[C]` `[I]` |
| `TREATMENT PLAN ID`, `PHASE ID` | Limit to one plan / phase; a blank phase prints all phases of the plan (training-PDF note, partly legible in the text layer) | `[D]` `[R54]` |
| `ORDER ID` | Limit to one order id (batch screen only) | `[C]` `[I]` |
| `FINANCIAL DISCLOSURE` | Which disclosure letter prints; the list is alphabetical, hence the vendor tip to prefix a name with a period to make it the default | `[D]` `[R45]` |
| `Include Office UCR` | Shows the `UCR` column | `[S]` `[I]` |
| `Itemize Prices` | Per-procedure amounts vs totals only | `[I]` `[unverified]` |
| `Include Completed Procedures` | Adds completed items (the single-patient dialog has `Completed` among `Include Statuses`: `Diagnosed`, `Accepted`, `Unaccepted`, `Hold`, `Alternative`, `Completed`; defaults `Diagnosed` + `Accepted`) | `[S]` `[R43]` |
| `Print Responsible Party Address` | Prints the address in the header box | `[S]` `[I]` |
| Hidden third option row | Unknown. The single-patient dialog offers three things the visible batch criteria lack: `Print Account Name`, `Good Faith Estimate`, `X-Rays` (+ picker) | `[S]` `[R43]`; mapping `[unverified]` |

**Single-patient dialog (for reference)** `[S]` `[R43]` `[R48]`: `Good Faith Estimate`; tabs `SINGLE` / `MULTIPLE` (several
plan IDs); `Items to Print` `Selected` / `All` (newer builds); `Plan ID*`, `Phase ID`, `Financial Disclosure`,
`Include Statuses`, `Other Options`, `X-Rays`; buttons `PRINT/PREVIEW`, `EMAIL PATIENT`, `TEXT PATIENT`.

**Users**: treatment coordinators at case presentation. Since July 2026 the vendor also ships a chair-side
`Treatment Presentation (Accept/Sign & Pay)` flow with side-by-side options, payment and signature `[D]` `[R55]`.

### Treatment Plan Status

| | |
|---|---|
| Purpose | List treatment-planned procedures by status — chiefly to find patients with unscheduled or uncompleted treatment and call them `[D]` `[R41]` `[R14]` |
| Confidence | DOCUMENTED for `Detail` (2013 sample); `Summary` INFERRED |
| Printed title | `Treatment Plan Status - Detail` `[S]` |
| Grain | One row per planned procedure |

**Output layout** `[S]` `[R41]` (2013)

| # | Column | Content |
|---|---|---|
| 1 | `T ID` | Treatment plan id |
| 2 | `Ph` | Phase id |
| 3 | `Ord` | Order id |
| 4 | `Sts` | Exclusive status letter (`D` in the sample) |
| 5 | `PA Sts` | Pre-auth status |
| 6 | `Sch` | Scheduled flag (`N`) |
| 7 | `Com` | Completed flag (`N`) |
| 8 | `Diag. Dt / Accept Dt` | Diagnosed and accepted dates |
| 9 | `Start Dt / End Dt` | Start and end dates |
| 10 | `Th` | Tooth |
| 11 | `Surf` | Surface |
| 12 | `Code` | Procedure code |
| 13 | `Description` | Code description |
| 14 | `Prdr` | Provider code |
| 15 | `Est. Pat` | Estimated patient portion |
| 16 | `Est. Ins` | Estimated insurance portion |
| 17 | `Total` | = 15 + 16 |

**Grouping and totals** `[S]`: band `Patient : <name>   Pat ID : <id>   Chart# :   (H) : ...   (C) : ...   (W) : ...`;
subtotals `Total for Phase <n> :`, `Total for Plan <n> :`, `Total for Patient :` over columns 15–17. Patient blocks in
the sample follow diagnosed-date order (2/4, 2/6, 2/22), not name or id `[I]`. The sample ran to 12 pages for seven
months of one office.

**Footer** `[S]`: `From`, `Thru`, `Providers : ALL`, `Tx Plan : ALL`, `Exclude Tx Plan : S,C`, `Exclude Pat Type`.

**Criteria → output**

| Criterion | Effect | Evidence |
|---|---|---|
| `REPORT FORMAT` | `Detail` as above; `Summary` not documented — taken to print patient-level totals only | `[I]` `[unverified]` |
| `TREATMENT PLANS` (radio, `ALL` + 10 statuses) | Only procedures in that status; footer `Tx Plan` | `[S]` `[C]` |
| `EXCLUDE TREATMENT PLANS` (multi-select) | Removes procedures in the picked statuses; footer prints the codes (`S,C`). Dialog list: `Diagnosed ( D )`, `Hold ( H )`, `Pre-Authorized Closed ( PC )`, `Pre-Authorized Sent ( PS )`, `Referred Out ( R )`, `Unaccepted ( U )`, `Completed ( C )`, `Scheduled ( S )` and, above the visible part, Accepted and Alternative `[I]` | `[S]` `[R41]` |
| `CODES` | Limit to procedure codes | `[D]` `[R14]` |
| `TX COUNSELOR` | Limit to procedures of the picked treatment counselor(s) | `[C]`; field `[R48]` |
| `Include Inactive Patients` | Adds inactive patients | `[C]` |
| `Include internal plan id` | Not documented; taken to add the system's internal treatment-plan identifier | `[unverified]` |

**Vendor recipes**: exclude `Scheduled` and `Completed` to get everything not yet scheduled or done `[D]` `[R41]`; or set
`Accepted` and exclude `Completed` and / or `Scheduled` — which only works if staff actually mark plans `Accepted`
`[D]` `[R14]`.

**Users and cadence**: front office — daily, weekly, monthly; on the month-end list `[D]` `[R14]` `[R13]`.

### Treatment Plan Analysis

| | |
|---|---|
| Purpose | Summary per treatment-plan status: how many procedures and how much value sit in each status, with comparison ratios `[D]` `[R40]` `[R14]` |
| Confidence | DOCUMENTED (sample c. 2022 + definitions) |
| Printed title | `Treatment Plan Analysis` `[S]` |
| Grain | One block per office |

**Output layout** `[S]` `[R40]`: organisation, title, `Office : <name>`; table `Treatments` · `Count` · `Amount`; then a
`Percentage :` section with two columns (count ratio, amount ratio).

| Row (sample) | Count | Amount |
|---|---|---|
| `Diagnosed` | 203 | 91,394.50 |
| `Accepted` | 6 | 1,770.00 |
| `Unaccepted` | 4 | 1,738.00 |
| `Hold` | 4 | 603.00 |
| `Referred Out` | 13 | 1,450.00 |
| `Pre-Auth Sent` | 10 | 5,300.00 |
| `Scheduled` | 26 | 4,100.60 |
| `Completed` | 124 | 36,023.60 |

| Ratio line (each has a one-line explanation under it) | Count % | Amount % | Check |
|---|---|---|---|
| `Accepted to Diagnosed` | 2.96 % | 1.94 % | 6 / 203; 1,770 / 91,394.50 |
| `Unaccepted to Diagnosed` | 1.97 % | 1.90 % | 4 / 203 |
| `Scheduled to Accepted` | 433.33 % | 231.67 % | 26 / 6; 4,100.60 / 1,770 |
| `Pre - Authorized Closed to Pre - Authorized Sent` | 0.00 % | 0.00 % | — |
| `Completed to Scheduled` | 476.92 % | 878.50 % | 124 / 26; 36,023.60 / 4,100.60 |

**Row definitions** `[D]` `[R40]` (paraphrased)

- `Diagnosed`, `Accepted`, `Unaccepted`, `Hold`, `Alternative`: procedures with that status that are **not scheduled and
  not completed**. The five are mutually exclusive.
- `Pre-Auth Sent`, `Pre-Auth Closed`: procedures with that pre-auth status, not scheduled and not completed, **whatever
  their exclusive status** — so they overlap the rows above.
- `Scheduled`, `Completed`: all scheduled / all completed procedures; a procedure can be both; once either flag is set
  the procedure is no longer counted under its exclusive status.
- `Count` = number of procedures; `Amount` = their total value. Ratios read numerator first: (numerator / denominator) × 100.

**Row-set conflict**: the article defines `Alternative` and `Pre-Auth Closed` but not `Referred Out`; the sample shows
`Referred Out` but neither of those two; `Reporting 101` mentions Diagnosed, Alternative, Scheduled, Completed. Either
zero rows are suppressed or the row set changed between versions `[unverified]`.

**Criteria**: `DIAGNOSED DATE RANGE`, `OFFICE/GROUP` (one block per office `[S]`), `PROVIDER`, `EXCLUDE PATIENT TYPE`,
`Include Inactive Patients` `[C]`; vendor advice is to keep default filters `[D]` `[R14]`.

**Users and cadence**: management / C-level; daily, weekly, monthly; only meaningful if statuses are actively
maintained `[D]` `[R14]`.

**Quirks**: ratios above 100% are expected (work completed without ever being marked scheduled) and signal workflow
gaps, not performance `[D]` `[R40]`; the rows do not add up to the number of planned procedures. The analytics add-on
uses different definitions — `%Accepted` = accepted fee / diagnosed fee; `Case Acceptance Rate` = distinct plans
accepted, scheduled or completed / all plans `[D]` `[R61]`.

### Treatment Plan Detail

| | |
|---|---|
| Purpose | Find the patients who have particular procedure code(s) in their treatment plan `[D]` `[R42]` |
| Confidence | PARTIALLY DOCUMENTED (purpose, criteria, code picker); layout INFERRED |
| Grain | One row per planned procedure matching the selected codes `[I]` |

**Documented use** `[D]` `[S]` `[R42]`: set the date range in which the plan was entered, pick one or more codes, print.
The `CODES` picker (`SEARCH CODE`) offers `CATEGORY` radios (`Diagnostic`, `Restorative`, `Periodontics`, `Maxilo Prosth`,
`Prosth. fixed`, `Orthodontics`, `Other`, `Preventive`, `Endodontics`, `Prosth. remov`, `Implant Serv`, `Oral Surgery`,
`Adjunct Serv`, `All Medical`), `SORT BY` `Code` / `Desc`, a search box and a `CODE` → `SELECTED CODE` transfer list
with Ctrl-click multi-select. The box is empty by default — unlike `Treatment Plan Status`, where it shows `ALL` `[C]`.

**Reconstructed layout (INFERRED)** — basis: the `Treatment Plan Status - Detail` columns: code and description as the
group, then patient (id, phones), diagnosed date, tooth, surface, status, provider, estimated patient, estimated
insurance, fee. Whether an empty `CODES` box means all codes or blocks the run is `[unverified]`. Comparable: Open
Dental Treatment Finder `Code Range` filter `[X5]`.

**Users**: clinical leads and front office, as needed (recalls of a product or technique, campaign lists) `[I]`.

---

## 6. Ortho Reports (`ortho_reports`)

Field lists below come from one vendor article `[R56]`; no sample image of any ortho report was found. None of the five
has `REPORT FORMAT`, `GROUP BY` or option checkboxes except `Missing Ortho Visits` `[C3]`.

### Ortho Compliance Report

| | |
|---|---|
| Purpose | Identify patients overdue for a visit: patients with an **active ortho contract** and **no future appointment** `[D]` `[R56]` |
| Confidence | PARTIALLY DOCUMENTED (purpose); columns INFERRED |
| Grain | One row per patient |

**Criteria → output**: `NUMBER OF WEEKS SINCE LAST VISIT` (default 6) — threshold on time since the last visit `[C]` `[I]`;
`PROVIDER`; `OFFICE/GROUP`. No date range.

**Reconstructed columns (INFERRED)** — basis: the sibling ortho reports: `Pat ID`, `Pat Name`, phone / email,
`Ortho Status`, `Ortho Start Date`, `Last Visit`, weeks since last visit, provider. Comparable: Gaidge "Active Patients Without
an Appointment" (active patients with no appointment, and those not seen in over 12 weeks) `[X11]`.

### Ortho Daily Journal

| | |
|---|---|
| Purpose | Ortho visit history as recorded on the Ortho Treatment Card `[D]` `[R56]` |
| Confidence | DOCUMENTED (vendor field list; no image) |
| Grain | One row per ortho visit |

**Fields** `[D]` `[R56]`, in vendor order: `Pat ID` · `Pat Name` (last, first, middle initial) · `Doctor` (provider short
id) · `Assistant` (username) · `UAW` and `LAW` (upper / lower archwire description from Ortho Setup) · `Procedures`
(multi-line, all ortho procedures posted for the visit) · `Compliance` (short id) · `Oral Hygiene` (short id) ·
`Elastics` · `Appliance`.

**Grouping and order** `[D]`: all visit entries, separated by visit date, oldest to newest. Totals: none stated.

**Criteria**: `VISIT DATE` range, `PROVIDER`, `OFFICE/GROUP` `[C]`.

### Patients by Ortho Status with Time in Treatment

| | |
|---|---|
| Purpose | Patients with their ortho status and how long they have been in treatment `[D]` `[R56]` |
| Confidence | DOCUMENTED (vendor field list; no image) |
| Grain | One row per patient |

**Fields** `[D]` `[R56]`: `Pat ID` · `Pat Name` · `DOB` · `Cell Phone` · `Email` · `Last Visit` (date of service of the last
Ortho Treatment Card entry) · `Ortho Status` (from the newest ortho treatment plan) · `Ortho Start Date` (from the ortho
payment plan start date; the vendor notes it may need adjusting) · `Time in Treatment` (total months between the start
date and the **current date**; rounding rule not stated).

**Criteria**: `ORTHO START DATE` range, `PATIENT LAST VISIT` range, `ORTHO STATUS` picker; all four dates blank by
default `[C]`. Grouping by status is suggested by the name but not stated `[unverified]`.

### Ortho Report

| | |
|---|---|
| Purpose | List of patients who recently started ortho treatment; also usable to find patients with an ortho visit who have not started treatment `[D]` `[R56]` |
| Confidence | DOCUMENTED (vendor field list; no image) |
| Grain | One row per patient |

**Fields** `[D]` `[R56]`: `Pat ID` · `Pat Name` · `DOB` · `Cell Phone` · `Email` · `Ortho Status` · `Ortho Start Date` ·
`First Visit` (first Ortho Treatment Card entry) · `Last Visit` (last Ortho Treatment Card entry) · `Next Appt` (next
scheduled appointment).

**Criteria**: `ORTHO START DATE` range, `PATIENT FIRST VISIT` range, `ORTHO STATUS`; dates default to today `[C]`.

### Missing Ortho Visits

| | |
|---|---|
| Purpose | Audit, like the missing-progress-notes and daily-audit reports: every ortho patient with an appointment should have an Ortho Visit on the card **and** a ledger entry `[D]` `[R56]` |
| Confidence | DOCUMENTED (vendor field list; no image) |
| Grain | One row per appointment |

**Fields** `[D]` `[R56]`: `Appt Date` · `Pat ID` · `Pat Name` · `Last Visit` (the patient's general last visit, **not** the
last ortho visit) · `Ortho Status` · `Provider` (provider on the appointment) · `Visit Provider` (provider on the ortho
visit) · `Ledger Transaction` (Yes / No for the appointment date) · `Ortho Visit` (Yes / No for the appointment date).

**Criteria → output**: `MISSING` ticks `Ledger Transaction` / `Ortho Visit` — which gaps qualify a row `[C]` `[I]`;
`APPOINTMENT DATE RANGE`; `APPOINTMENT PROVIDER` and `VISIT DOCTOR` filter the two provider columns `[C]` `[I]`.

**Quirk**: saving an ortho visit auto-posts the configured `Ortho Visit Code`, so a "ledger missing, visit present" row
points at configuration (no visit code) or a deleted transaction `[D]` `[R57]` `[R31]` `[I]`.

---

## 7. Corrections and additions to the criteria transcriptions

| # | Report | Finding | Evidence |
|---|---|---|---|
| 1 | `Treatment Plan Status` | Not truncated. A full-height vendor screenshot shows exactly two `OTHER OPTIONS` (`Include Inactive Patients`, `Include internal plan id`) and blank space below | `[S]` `[R41]` |
| 2 | `Treatment Plan Proposal` | The hidden third option row remains unread; candidates from the single-patient dialog: `Print Account Name`, `Good Faith Estimate`, `X-Rays` | `[S]` `[R43]` |
| 3 | `Outstanding Claims` | Selecting `Excel` greys both `GROUP BY` radios | `[S]` `[R4]` |
| 4 | `835 Denial Report` | `Excel` selected, `REPORT FORMAT` greyed with `Detail` marked, office `ALL` — identical in the vendor's screenshot, so this is the report's normal opening state; Excel exists only as Detail | `[S]` `[D]` `[R1]` |
| 5 | Report list | `835 Denial Report` is listed only for tenants that asked for it; without it the list has 12 entries in another order | `[S]` `[D]` `[R1]` `[R2]` |
| 6 | `Capitation Utilization` | `Fee Schedule To Compare` becomes available once `Include UCR` is ticked (confirmed by vendor text) | `[D]` `[R8]` |
| 7 | `Benefits Used/Unused` | `Recall` mode historically had `Recall Date` range, `Max Over` and `Recall Codes`; capture the `Recall` state of the screen | `[S]` `[R6]` |
| 8 | `Treatment Plan Status` | `EXCLUDE TREATMENT PLANS` opens a dialog titled `SELECT TREATMEN PLAN` (sic) with a `NONE` tick, search, and a status list with codes | `[S]` `[R41]` |
| 9 | `Treatment Plan Detail` / `Status` | `CODES` opens `SEARCH CODE` (category radios, sort, search, transfer list) | `[S]` `[R42]` |
| 10 | `Treatment Plan Proposal` | `FINANCIAL DISCLOSURE` lists letters of type `Financial Disclosure` assigned to the office (`Setup > Offices > Office Assignment > Letters`); the leading period is a vendor-recommended sort trick, not a system value | `[D]` `[R45]` `[R46]` |
| 11 | All | Pickers open on `Include All`; a narrower selection needs `Include All` unticked | `[D]` `[R62]` |
| 12 | `DPS Eligibility Report` | `On Hold` corresponds to the `On Hold` tick on the `Subscriber / Insurance Verification` form | `[S]` `[R26]` |

---

## 8. Reconciliation rules and traps

| # | Rule / trap | Evidence |
|---|---|---|
| 1 | `Outstanding Claims` total ≠ Aging estimated insurance, by design | `[R10]` |
| 2 | `Outstanding Claims` buckets carry estimated insurance, not billed amount; zero-estimate claims are listed with zeros | `[S]` `[R10]` |
| 3 | `Claims List` date range = claim generated date, not date of service | `[R5]` |
| 4 | Held procedures appear on both `Procedures on Hold` and `Claims Not Created` | `[R11]` |
| 5 | A secondary claim cannot exist unless the procedure was posted with both plans attached (`DD`) | `[R19]` |
| 6 | Pre-auth status is shared by all coverages of the same procedures | `[R52]` |
| 7 | An 835 payment for a closed claim allocates to the next open claim; ledger and EOB dates can disagree | `[R23]` |
| 8 | 835 auto-post runs once a day; a same-day reconcile report can lag the clearinghouse | `[R22]` |
| 9 | Remaining benefits depend on the monthly reset routine; `99999` = unlimited; remaining maximum nets estimates on posted work | `[R36]` `[R38]` `[R39]` |
| 10 | Capitation payments post with an offsetting adjustment — treat as a separate tender class, not patient or claim collections | `[S]` `[R37]` |
| 11 | `Treatment Plan Analysis` rows overlap and ratios are not acceptance rates; expect values above 100% | `[R40]` |
| 12 | Treatment-plan `UCR` = the higher of office UCR and the insurance fee schedule | `[R44]` |
| 13 | Insurance estimates are computed per `Tx Plan ID` in phase order; unaccepted items drop out of the estimate | `[R53]` `[R48]` |
| 14 | Ortho: `Ortho Start Date` comes from the contract, `Ortho Status` from the newest card plan, `Time in Treatment` runs to today; `Last Visit` has two meanings | `[R56]` |
| 15 | RTE status expires after a month; AutoEligibility tenants do not run the nightly RTE, so a sweep report can be empty | `[R28]` `[R34]` `[I]` |

---

## 9. Implications for our module (analyst recommendations, not sourced facts)

| Legacy behaviour | Keep | Improve |
|---|---|---|
| Eight separate claim-funnel reports | The stage definitions and vendor status vocabulary (users know them) | One claims-pipeline view with stage counts and amounts, drill-down per stage, age in stage, owner; legacy names as saved views |
| `Outstanding Claims` + `CREATE TASK` | Carrier grouping with phone, aging buckets, coverage order, created-by, task creation | State the age basis explicitly; add billed vs estimated toggle, last follow-up status inline, carrier scorecards (days to pay, denial rate) |
| `835 Denial Report` | Summary by carrier, detail by service code and reason code, CO / PR / OA split | Trend by reason code, top codes by provider and office, link to the claim and to a rework queue; no one-month cap |
| `EOB 835 Claims Reconcile Report` | Posted / not posted with reason | Deposit-level reconciliation (check / EFT total vs posted total), unmatched queue with suggested matches |
| `Benefits Used/Unused` | Per-coverage maximum / deductible grid by anniversary | Combine with unscheduled accepted treatment value; flag unlimited plans; outreach actions from the list |
| `Treatment Plan Analysis` | Count and amount per status | Replace overlapping rows with a true funnel (diagnosed → accepted → scheduled → completed) by cohort of diagnosed date; acceptance and completion rates by provider and counselor |
| `Treatment Plan Status - Detail` | Patient band with phones, phase / plan / patient subtotals | Sort by value or age, exclude already-contacted, contact logging, counselor ownership |
| Ortho reports | The five questions (visits, missing visits, starts, time in treatment, no next appointment) | Estimated vs actual treatment months, patients past estimated completion, missed-appointment and broken-bracket counts already tracked on the card |
| Eligibility reports | Appointment-driven worklist | One eligibility board: status, last check, actor, payer error, days to appointment |

---

## 10. Gaps, unverified items and open questions

- No vendor output sample or description for: `Claims Created Not Sent`, `Procedures on Hold`, `DPS Eligibility Report`,
  `Capitation Payment`, `Claims Not Created`, `Unbilled Report Due to No Insurance`, `EOB 835 Claims Reconcile Report`,
  `RTE Sweep Details`, `Treatment Plan Detail`, `Ortho Compliance Report`; nor for the `Summary` formats of
  `Capitation Utilization` and `Treatment Plan Status`. Their layouts above are inferences.
- No image of any ortho report; grouping, totals and sort order beyond the vendor text are unknown; the ortho status
  value list is unknown.
- Old samples: `Claims Listing` (2011), `Benefits Used/Unused` (2011–2012), `Capitation Utilization - Detail` (2008),
  `Treatment Plan Status - Detail` (2013). Current layouts may have changed.
- Unknown option effects: `Include Resolved Claims`, `Show Details UCR`, `Show Billing Provider For Hygienist`,
  `Itemize Prices`, `Include internal plan id`, the aging-bucket ticks on `Outstanding Claims`, an empty `CODES` box on
  `Treatment Plan Detail`.
- Unknown date bases: `Procedures on Hold` and `Unbilled Report Due to No Insurance` date ranges; the age basis of
  `Outstanding Claims`; whether its `Report Date` reconstructs history or only shifts the aging.
- `Treatment Plan Analysis` row set (Alternative, Referred Out, Pre-Auth Closed) is inconsistent across vendor sources.
- Whether carrier and grand totals print on `Outstanding Claims` and `Claims Listing`; whether medical claims form a
  separate band.
- Sources known but not read: webinars and training videos, in-app release notes, Dentrix Enterprise Reports Reference,
  two CareStack articles (`[R65]`, `[X12]`, `[X13]`).

---

## 11. Sources

Help Center articles were read on 2026-11-22 through the article API. Images are at
`https://support.planetdds.com/hc/article_attachments/<id>` (ids listed after "img").

### Planet DDS

- `[R1]` ERA 835 Denial Report — https://support.planetdds.com/hc/en-us/articles/19719314803739-ERA-835-Denial-Report — img `19719361605787` (criteria), `19719314796571` (Summary), `19719346141851` (Detail), `20085797173147`, `20085803429147` (Excel)
- `[R2]` Correcting the billing order / Unbilled Report Due to No Insurance — https://support.planetdds.com/hc/en-us/articles/115002084892 — img `16687057428635` (criteria), `16687065605915` (Reports menu)
- `[R3]` How can I generate a list of all insurance claims not paid? — https://support.planetdds.com/hc/en-us/articles/115002070591-How-can-I-generate-a-list-of-all-insurance-claims-not-paid — img `16520511749659`
- `[R4]` Report of claim statuses ("Outstanding Claims - Excel") — https://support.planetdds.com/hc/en-us/articles/115002085392 — img `17086871617051` (criteria, Excel), `115002787991` (Excel sample)
- `[R5]` Which report lists all claims transmitted? (Claims List) — https://support.planetdds.com/hc/en-us/articles/115002077251 — img `16687120785179` (criteria), `115002820892` (sample, 2011)
- `[R6]` Report of patients with benefits remaining (Benefits Used/Unused) — https://support.planetdds.com/hc/en-us/articles/115002090532 — img `16687454446747` (criteria), `115002800431` (Treatment Plan sample), `115002817292` (Recall sample)
- `[R7]` Can I get a report of pre-authorization claims? — https://support.planetdds.com/hc/en-us/articles/115002065611-Can-I-get-a-report-of-pre-authorization-claims — img `17891732391451`
- `[R8]` Managed-care monthly report (Capitation Utilization) — https://support.planetdds.com/hc/en-us/articles/115002087572 — img `17109526937755` (criteria), `360055316172` (Detail sample, 2008)
- `[R9]` How can I find a history of our capitation payments? — https://support.planetdds.com/hc/en-us/articles/115002087532-How-can-I-find-a-history-of-our-capitation-payments — img `17109591143579`
- `[R10]` Why does my outstanding claim report differ from the aging detail report? — https://support.planetdds.com/hc/en-us/articles/115002066471 — img `16059294127259` (Outstanding Claims PDF, 2023), `16059251212571` (criteria)
- `[R11]` Placing and Removing Claim Holds — https://support.planetdds.com/hc/en-us/articles/32264703006875
- `[R12]` Reports recommended at the end of each day — https://support.planetdds.com/hc/en-us/articles/115002085792
- `[R13]` Reports recommended at the end of each month / year — https://support.planetdds.com/hc/en-us/articles/115002068151
- `[R14]` Reports Matrix and "Denticon Reporting 101" PDF — https://support.planetdds.com/hc/en-us/articles/4415425089563-Reports-Matrix , https://www.planetdds.com/wp-content/uploads/2022/11/Reporting-Matrix.pdf
- `[R15]` Audit Trail claim status letters — https://support.planetdds.com/hc/en-us/articles/115002082952
- `[R16]` Difference between "Save" and "E-Claim" — https://support.planetdds.com/hc/en-us/articles/360000943231
- `[R17]` Using and creating claim statuses — https://support.planetdds.com/hc/en-us/articles/115002084172 , https://support.planetdds.com/hc/en-us/articles/115002084152
- `[R18]` Enhanced Task Manager — https://support.planetdds.com/hc/en-us/articles/360002419792-How-do-we-use-the-Enhanced-Task-Manager-screen — img `360003032451`, `33968688508443`
- `[R19]` Bill column `D` / `DD`; secondary claim not created — https://support.planetdds.com/hc/en-us/articles/115002087172 , https://support.planetdds.com/hc/en-us/articles/360052486792
- `[R20]` Ledger filters (`Unbilled Procedures`) — https://support.planetdds.com/hc/en-us/articles/360028499112
- `[R21]` Claim for archived procedures (weekly Claims Not Created check) — https://support.planetdds.com/hc/en-us/articles/35207651415835
- `[R22]` ERA Auto-Post Process has not posted payments (EOB Claim Reconcile Report) — https://support.planetdds.com/hc/en-us/articles/47409871188379
- `[R23]` ERA 835 auto payment posted to the wrong claim — https://support.planetdds.com/hc/en-us/articles/32026162036763
- `[R24]` EOB for an 835/ERA payment is blank — https://support.planetdds.com/hc/en-us/articles/36262751730971
- `[R25]` Blog (2021): Denticon 835 Auto Post — https://www.planetdds.com/blog/denticon-835-auto-post-streamline-your-claims-process/
- `[R26]` Instant Eligibility vs DPS "Insurance Eligibility Verification" — https://support.planetdds.com/hc/en-us/articles/115002066551 — img `14581538375195` (appointment, `DPS Ins. Verification`), `14581591964827` (verification form with `On Hold`)
- `[R27]` Who to contact for DPS — https://support.planetdds.com/hc/en-us/articles/115002083852
- `[R28]` How does the Real-Time Eligibility feature work? — https://support.planetdds.com/hc/en-us/articles/115002085652-How-does-the-Real-Time-Eligibility-feature-work — img `58975705312155`
- `[R29]` # of Days Before Appt. to Check Eligibility — https://support.planetdds.com/hc/en-us/articles/360044866531 — img `18279959910811`
- `[R30]` Denticon Setup Guide – Office Setup — https://support.planetdds.com/hc/en-us/articles/37669915467419-Denticon-Setup-Guide-Office-Setup
- `[R31]` Denticon Setup Guide – Account Setup — https://support.planetdds.com/hc/en-us/articles/37669881129499-Denticon-Setup-Guide-Account-Setup
- `[R32]` Interactive Report – Eligibility Verification — https://support.planetdds.com/hc/en-us/articles/20825080284443-Interactive-Report-Eligibility-Verification — img `20825036886683` (screen), `20825036910235` (`Auto_RTE` popup), `20825036916251` (status list)
- `[R33]` Eligibility icons on appointments — https://support.planetdds.com/hc/en-us/articles/115002089932
- `[R34]` AutoEligibility — https://support.planetdds.com/hc/en-us/articles/53595636792603 , https://support.planetdds.com/hc/en-us/articles/35395388943131 , https://support.planetdds.com/hc/en-us/articles/26167191326747
- `[R35]` Managed Care / Capitation plans vs other plans — https://support.planetdds.com/hc/en-us/articles/115002071351
- `[R36]` How do I set up a Managed Care insurance plan? — https://support.planetdds.com/hc/en-us/articles/115002087612
- `[R37]` Entering and viewing capitation payments — https://support.planetdds.com/hc/en-us/articles/115002087552 (img `35165752838171`), https://support.planetdds.com/hc/en-us/articles/115002085072 (img `36352767173787`)
- `[R38]` How Denticon tracks the insurance maximum remaining — https://support.planetdds.com/hc/en-us/articles/30169430819995
- `[R39]` Resetting and updating benefits — https://support.planetdds.com/hc/en-us/articles/115002090752 , https://support.planetdds.com/hc/en-us/articles/115002091072
- `[R40]` How do we understand the Treatment Plan Analysis report? — https://support.planetdds.com/hc/en-us/articles/115002091392-How-do-we-understand-the-Treatment-Plan-Analysis-report — img `7956605633435`
- `[R41]` List of uncompleted / unscheduled treatment (Treatment Plan Status - Detail) — https://support.planetdds.com/hc/en-us/articles/115002082892 — img `15626525421339` (criteria), `19320820121499` (exclude dialog), `115002781411` (sample, 2013)
- `[R42]` Patients with a specific code in the treatment plan (Treatment Plan Detail) — https://support.planetdds.com/hc/en-us/articles/115002090292 — img `19320816481307`, `19320844071195`
- `[R43]` Print a treatment plan for a single patient — https://support.planetdds.com/hc/en-us/articles/115002074091 — img `19320889972251` (dialog), `15626318090139` (document in viewer), `19320884422555` (notes)
- `[R44]` UCR fee on the Treatment Plan Report — https://support.planetdds.com/hc/en-us/articles/36537735521435 — img `36537735515675`, `36537721983259` (2025)
- `[R45]` Making "Treatment Plan Disclosure" the default — https://support.planetdds.com/hc/en-us/articles/115002090652 — img `19322365506843`
- `[R46]` Financial Disclosures not available for Treatment Plans — https://support.planetdds.com/hc/en-us/articles/36315877136667
- `[R47]` Signing the treatment plan on a signature pad — https://support.planetdds.com/hc/en-us/articles/115002089832 — img `15316019864987`, `15316057326619`
- `[R48]` Guide to the treatment plan screen — https://support.planetdds.com/hc/en-us/articles/30253096222235-Is-there-a-guide-to-understanding-the-treatment-plan-screen — img `31878005833755`, `31878014597531`
- `[R49]` Letters in the Treatment Plan columns — https://support.planetdds.com/hc/en-us/articles/115002084832 — img `19262387655835` (Edit Treatment Plan)
- `[R50]` Treatment Plan IDs, Phase IDs, Order IDs — https://support.planetdds.com/hc/en-us/articles/115002085192
- `[R51]` Treatment plan discounts — https://support.planetdds.com/hc/en-us/articles/115002090232 , https://support.planetdds.com/hc/en-us/articles/115002073671
- `[R52]` Pre-authorization statuses — https://support.planetdds.com/hc/en-us/articles/360041810852 , https://support.planetdds.com/hc/en-us/articles/43494950525339 , https://support.planetdds.com/hc/en-us/articles/42908451657627
- `[R53]` TID estimation — https://support.planetdds.com/hc/en-us/articles/50687459095067
- `[R54]` Denticon University `M08 Non-graphical Treatment Plan` PDF — https://support.planetdds.com/hc/article_attachments/10602234983707
- `[R55]` Denticon Treatment Presentation (Accept/Sign & Pay) — https://support.planetdds.com/hc/en-us/articles/51549621423131
- `[R56]` Ortho report options — https://support.planetdds.com/hc/en-us/articles/360045117932
- `[R57]` Ortho Treatment Card — https://support.planetdds.com/hc/en-us/articles/360042670411-Ortho-Treatment-Card — img `16274844341531`, `16274860238107`
- `[R58]` Ortho Treatment Card setup — https://support.planetdds.com/hc/en-us/articles/360042106592
- `[R59]` Orthodontic payment plan fields — https://support.planetdds.com/hc/en-us/articles/115002088692 , https://support.planetdds.com/hc/en-us/articles/115002094132
- `[R60]` Distinguishing ortho patients — https://support.planetdds.com/hc/en-us/articles/360029319631 — img `19614699338651`
- `[R61]` Practice Analytics glossaries — https://support.planetdds.com/hc/en-us/articles/23679864262299 (Collections Analysis), https://support.planetdds.com/hc/en-us/articles/23917936940699 (Treatment Plan Analysis)
- `[R62]` How to understand the new reports menu — https://support.planetdds.com/hc/en-us/articles/4408457645723
- `[R63]` Reports-related security rights — https://support.planetdds.com/hc/en-us/articles/115002075251
- `[R64]` Fees to print on claims; hygienist as treating provider; Billing Provider — https://support.planetdds.com/hc/en-us/articles/115002090412 , https://support.planetdds.com/hc/en-us/articles/115002065751 , https://support.planetdds.com/hc/en-us/articles/115002069491
- `[R65]` Not read (video or in-app only): webinars `40 Reports Part 2 - Outstanding AR and Treatment` (360039835452), `28 Remaining Insurance Benefits` (360020445731), `10 Treatment Plans` (115002091992), `05 Claims Processing` (115002091952), `70 Ortho Module` (10880210682267); ortho training videos (13482956461339, 13482974697371) — https://support.planetdds.com/hc/en-us/articles/<id> ; video index http://videos.planetdds.com/training/insurance.html ; release notes https://support.planetdds.com/hc/en-us/articles/115002068751
- `[R66]` Denticon University `M13 End of Day Reporting` PDF (read; no report in scope) — https://support.planetdds.com/hc/article_attachments/10601620951451
- `[R67]` Blog (2022): Most powerful Denticon features for DSOs and group practices, reporting section — https://www.planetdds.com/blog/most-powerful-denticon-features-for-dsos-and-group-practices-of-the-why-denticon-series-2/

### Comparable systems (used only for INFERRED layouts)

- `[X1]` Open Dental, Claims Not Sent Report — https://opendental.com/manual/reportclaimsnotsent.html
- `[X2]` Open Dental, Procedures Not Billed to Insurance — https://opendental.com/manual/reportprocsnotbilledins.html
- `[X3]` Open Dental, Outstanding Insurance Claims Report — https://www.opendental.com/manual/reportoutins.html
- `[X4]` Open Dental, Capitation Utilization Report — https://www.opendental.com/manual/reportcapitation.html
- `[X5]` Open Dental, Treatment Finder Report — https://opendental.com/manual/reporttreatfinder.html
- `[X6]` Open Dental, ERA window — https://opendental.com/manual/era.html
- `[X7]` Carestream SoftDent, Capitation Collections Summary — https://help.carestreamdental.com/rh/web/server/SoftDent/projects_responsive/OH_DE1010/CapColSum.htm
- `[X8]` Carestream SoftDent, Capitation Insurance Company Encounter — https://help.carestreamdental.com/rh/web/server/SoftDent/projects_responsive/OH_DE1010/CapInsCoEnctr.htm
- `[X9]` Dentrix Enterprise blog, Insurance Claims Not Sent Report — https://blog.dentrixenterprise.com/improve-cash-flow-by-catching-unsubmitted-claims
- `[X10]` DentalXChange help, Electronic Remittance Advice — https://help.dentalxchange.com/DentalXChangeHelp/ElectronicRemittanceAdvice.htm
- `[X11]` Gaidge, Advanced Treatment Efficiency Metrics — https://help.gaidge.com/article/163-advanced-treatment-efficiency-metrics
- `[X12]` CareStack (page returned 403; search summary only) — https://carestack.zendesk.com/hc/en-us/articles/32985688581780-Generate-Pending-Eligibility-or-Verification-Report , https://carestack.zendesk.com/hc/en-us/articles/33084569837076-Generate-Insurance-Pending-Procedures-Report
- `[X13]` Dentrix Enterprise 11.0 Reports Reference (not readable, TLS certificate error) `[unverified]` — https://www.ihs.gov/doh/edr/documents/Dentrix_Enterprise_11.0_Reports_Reference.pdf
- `[X14]` Dentrix Magazine, unbilled-procedure and unsent-claim reports (`Procedures Not Attached to Insurance`, `Secondary Ins Claims Not Created`, `Insurance Claims to Process`) — https://magazine.dentrix.com/dont-leave-money-on-the-table/

### Our criteria transcriptions

- `[C1]` `docs/reports/module-plan/legacy/insurance_reports.json` (verified; 13 reports, 130 controls)
- `[C2]` `docs/reports/module-plan/legacy/treatmentplan_reports.json` (verified version, used instead of the first-reader file; 4 reports, 50 controls)
- `[C3]` `docs/reports/module-plan/legacy/ortho_reports.json` (verified version; 5 reports, 36 controls)
