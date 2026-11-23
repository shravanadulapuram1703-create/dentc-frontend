# Reference screenshots — transcription and reference-product research

Research date: 2026-11-21. Audience: engineers and product designers planning the Reports & Analytics module.

**Inputs (local, read with image zoom crops; every number below was re-read at 2.6x–10x zoom and cross-checked by arithmetic where possible):**

| Ref | File | Size | What it shows |
|---|---|---|---|
| A | `<downloads>/reports/pdfs/drop_down_options.PNG` | 183 x 534 | Legacy tool (Denticon, Planet DDS) — the open **Reports** menu |
| B | `<downloads>/reports/pdfs/kpi_dash_ref.PNG` | 1363 x 642 | Reference analytics product — **Main Dashboard** |
| C | `<downloads>/reports/pdfs/kpi_dash_ref_2.PNG` | 1366 x 607 | Same product — **Provider Dashboard** |

**Confidence legend:** *(seen)* = read directly from the screenshot. *(computed)* = derived by arithmetic on transcribed values. *(inferred)* = my interpretation, not stated anywhere. **[unverified]** = could not be confirmed from any source. *(snippet)* = taken from a search-engine result summary because the page itself blocks automated fetching or is login-gated.

**Privacy note:** the two provider names visible in screenshot C are omitted here on purpose (called Provider A / Provider B). They add nothing to the plan.

---

## 0. Summary of what matters

1. The legacy **Reports** menu has **26 entries in 11 separator-delimited groups; 4 entries open a sub-menu** (Lists, Interactive Reports, Office Reports, Reports (Old)). The PDF set in the same folder covers 13 of the 26 entries; 13 have no reference material (section 1.5).
2. The reference product is **Oryx Dental Software** (oryxdental.com). "Ask Ori" is listed by the vendor as a feature included in every subscription; Ori is the vendor's oryx mascot (section 4).
3. Both reference dashboards are a single dense **metric x trailing-12-months matrix** (current month first, then 11 prior months, newest to oldest), with a grey info icon per metric, and only two actions: **Print** and **Export As CSV**. No totals, goals, comparisons, charts, filters or drill-down are visible.
4. **Main Dashboard: 20 metric rows visible in 6 blocks** (list is cut off at the bottom). **Provider Dashboard: 11 metric rows in 5 blocks, repeated per provider** (second provider block is cut off).
5. The vendor does **not** publish the metric definitions or the list of reports per category: its help center is login-gated (HTTP 401/403). Section 6 therefore gives, per metric, (a) what the screenshot numbers prove, (b) anything the vendor has published, and (c) the closest documented definition from a comparable analytics vendor.
6. The screenshot arithmetic reveals several things we must design for explicitly: a doctor/hygiene split by **provider role** with an unassigned residual; **net** figures hiding behind labels that do not say "net"; an hours-based metric that is non-zero while the hours row shows 0; and historic months that look like **frozen snapshots** with a changed formula/precision (sections 2.5 and 3.5).

---

## 1. Screenshot A — legacy "Reports" menu (Denticon)

### 1.1 Context *(seen)*

- Blue application menu bar. Visible top-level menus: **Reports ▾** (open, highlighted with a white outline), **Utilities ▾**, **Setup** (clipped at the right edge of the capture).
- The dropdown is a light-grey panel with a thin blue border; items are plain black text, no icons; sub-menu items carry a right-pointing black triangle (▶) at the right edge.
- Separator lines were confirmed by pixel scan: 10 horizontal rules at y = 204, 246, 269, 293, 350, 408, 428, 467, 488, 508 px.

### 1.2 Menu items in order *(seen)*

`PDF in folder` = which file under `<downloads>/reports/pdfs/` documents that entry.

| # | Menu item (exact label) | Sub-menu ▶ | Group | PDF in folder |
|---|---|---|---|---|
| 1 | Daily Reports | – | G1 | `daily_reports.pdf` |
| 2 | Monthly Reports | – | G1 | `montly_reports.pdf` (sic) |
| 3 | Ledger Reports | – | G1 | `ledger_reports.pdf` |
| 4 | Management Reports | – | G1 | `management_reports.pdf` |
| 5 | Insurance Reports | – | G1 | `insurance_reports.pdf` |
| 6 | Appointment Reports | – | G1 | `appointment_reports.pdf` |
| 7 | Treatment Plan Reports | – | G1 | `treatmentplan_reports.pdf` |
| 8 | Referral Reports | – | G1 | `refferal_reports.pdf` (sic) |
| 9 | Recall Reports | – | G1 | `recall_reports.pdf` |
| 10 | Ortho Reports | – | G1 | `ortho_reports.pdf` |
| | **— separator —** | | | |
| 11 | Statements | – | G2 | `statements_reports.pdf` |
| 12 | Lists | **▶** | G2 | `patients_list_reports.pdf`, `providers_list_reports.pdf`, `security_list_reports.pdf`, `setup_list_reports.pdf` |
| | **— separator —** | | | |
| 13 | Interactive Reports | **▶** | G3 | none |
| | **— separator —** | | | |
| 14 | Office Reports | **▶** | G4 | none |
| | **— separator —** | | | |
| 15 | Letters | – | G5 | none |
| 16 | Postcards | – | G5 | none |
| 17 | Labels | – | G5 | none |
| | **— separator —** | | | |
| 18 | Custom Letter | – | G6 | none |
| 19 | Advanced Custom Letter | – | G6 | none |
| 20 | Custom Postcard | – | G6 | none |
| | **— separator —** | | | |
| 21 | My Reports | – | G7 | `my_reports.pdf` |
| | **— separator —** | | | |
| 22 | Blank Insurance Forms | – | G8 | none |
| 23 | Pat Reg/Medical Info Forms | – | G8 | none |
| | **— separator —** | | | |
| 24 | My Favorites | – | G9 | none |
| | **— separator —** | | | |
| 25 | Search Report | – | G10 | none |
| | **— separator —** | | | |
| 26 | Reports (Old) | **▶** | G11 | none |

Totals: **26 items, 10 separators, 11 groups, 4 sub-menus.**

### 1.3 Structure reading *(inferred from grouping)*

| Group | Items | Nature |
|---|---|---|
| G1 | 10 "… Reports" entries | Report families by business area; each opens a screen with a report picker and criteria panel |
| G2 | Statements, Lists ▶ | Patient billing output and reference lists |
| G3 | Interactive Reports ▶ | On-screen work-lists that users act on, as opposed to printed output |
| G4 | Office Reports ▶ | Per-office custom reports |
| G5 | Letters, Postcards, Labels | Correspondence output (mail-merge) |
| G6 | Custom Letter, Advanced Custom Letter, Custom Postcard | Correspondence template authoring |
| G7 | My Reports | Reports scoped to the logged-in user |
| G8 | Blank Insurance Forms, Pat Reg/Medical Info Forms | Blank printable forms |
| G9 | My Favorites | Saved report shortcuts |
| G10 | Search Report | Find a report by name |
| G11 | Reports (Old) ▶ | Previous-generation menu tree kept for back-compat |

### 1.4 What the entries lead to — evidence beyond the screenshot

The sub-menu fly-outs are **not** visible in screenshot A. What is known from other evidence:

| Entry | Evidence | Source |
|---|---|---|
| Lists ▶ | Four list screens exist, titled **"Patient/Resp. Party List Reports"** (sections PATIENT LIST: Patient List; Patient List - Grouped By; Patient List - New Patient; Patients on Payment Plan; Patients Seen; Online Registered Patients; Patient's Notes; Update Patient Insurance (Conversion) List - By Appointment — and RESPONSIBLE PARTY LIST: Responsible Party List; Responsible Party - Sent to Collection; Responsible Party - Statements Sent; Responsible Party - Email Statement Error Report), **"Provider List Reports"** (Provider List; Provider Holidays; Provider Operatory; Provider Registration), **"Security List Reports"** (User List; Group List; Group Rights List; User-Group Membership), **"Setup List Reports"** (sections INSURANCE, PRESCRIPTION, PROCEDURE, FEE SCHEDULE, OFFICE, MISC …) | First page of the four `*_list_reports.pdf` files in the folder (cross-reference only; the per-PDF analysis documents own the detail). Vendor docs use the paths "Reports > Lists > Patient/Resp. Party List" and "Reports > Lists > Setup" *(snippet)* [S31][S32] |
| My Reports | Screen "My Reports" offers: Daily Journal; Appointment Detail by User; Time Clock Report; Production Report; Missing Progress Notes | First page of `my_reports.pdf` |
| Interactive Reports ▶ | Contains at least **Eligibility Verification** ("Reports > Interactive Reports > Eligibility Verification": consolidates all patients needing eligibility verification into one screen) | Planet DDS support *(snippet)* [S30]. Other children **[unverified]** |
| Office Reports ▶ | Children are **per-location containers**: "Reports > Office Reports > [Location Name] Reports > Next Appointment Booked Report (Excel)" — i.e. office-specific custom reports, Excel output | Planet DDS "Denticon Reporting 101" [S28] |
| Reports (Old) ▶ | Old tree with at least: **Treatment Plan Reports** (Treatment Plan Status - Detail; Treatment Plan Analysis), **Recall Reports** (Recall), **Insurance Reports** (Procedures on Hold), **Group Reports > Management Reports** (Production by Codes; Production by Codes - Provider; Production by Category), **Group Reports > Daily Reports > Management reports** (Special Transaction Report) | [S28] |
| My Favorites | Saved report configurations; a favourite opens for the office where it was saved | Planet DDS support *(snippet)* [S29]; detail **[unverified]** |
| Search Report | Report name search **[unverified]** (label only) | – |
| Letters / Postcards / Labels / Custom Letter / Advanced Custom Letter / Custom Postcard | Correspondence generation and template authoring **[unverified]** (labels only) | – |
| Blank Insurance Forms / Pat Reg/Medical Info Forms | Blank printable claim and registration / medical-history forms **[unverified]** (labels only) | – |

Vendor-documented menu paths that confirm what lives under the G1 families [S28]:

| Menu path (as written by the vendor) | Reports named there | Vendor-recommended cadence |
|---|---|---|
| Reports > Daily [Reports] | Daily Audit; Daily Journal (Detail / Summary; group or filter by provider; by Office or Office Group); Deposit Slip; Scheduled Production; Progress Notes (detail / missing / unsigned) | Daily (end of day); Scheduled Production daily or weekly |
| Reports > Monthly Reports | Aging (Detail / Summary); Income Allocation - Summary; WaterFall Report; Executive Summary; Unallocated Payments/Adjustments Report | Daily / weekly / monthly; Waterfall quarterly and yearly; Income Allocation monthly |
| Reports > Management reports | Uncollected Co-Pay Report | Daily (end of day) |
| Reports > Appointment Reports | Appointment Detail(s); Appointment List (Cancelled List / Missed List); New Patients via Appointments; Routing Slips; Lab Reports (Report Type "Not Received") | Daily; New Patients via Appointments weekly |
| Reports > Lists > Patient List | Update Patient Insurance (Conversion) List - By Appointment | Daily, 2 days prior |
| Scheduler drop down > Call List | Call List (Show Cancelled / Show Missed / Show Off Call List) — a report-like list that lives outside the Reports menu | Weekly |

The same vendor document organises reports by **audience** (Front Office, Back Office, Clinical, Management/C-level) and describes "Executive Summary" as "Summary of KPIs (NPs, Production, Collection, Adjustments, Missed Appts, etc.) for a specific date range", run for one or all offices [S28]. That audience grouping is a ready-made model for role-based default report sets.

An article titled "How to understand the new reports menu" exists on the vendor support site but returns HTTP 403 to automated fetch [S33] — worth a manual read.

### 1.5 PDF coverage versus the menu

- **Covered (13 entries, 16 PDFs):** items 1–12 and 21.
- **Not covered (13 entries):** Interactive Reports ▶, Office Reports ▶, Letters, Postcards, Labels, Custom Letter, Advanced Custom Letter, Custom Postcard, Blank Insurance Forms, Pat Reg/Medical Info Forms, My Favorites, Search Report, Reports (Old) ▶.
- The user's requirement is that no option in the legacy reports may be left out; for the 13 uncovered entries the plan can only reproduce the *label and intent* until more screenshots are supplied.

---

## 2. Screenshot B — reference product "Main Dashboard"

### 2.1 Page chrome *(seen)*

| Zone | Content (left to right) |
|---|---|
| Header bar (light grey) | Logo: a ring made of a teal arc and a navy arc. Search box with magnifier and placeholder **"Search for a Patient"**. Right side, five square icon buttons on pale-blue tiles: (1) three-person group icon, (2) calendar icon, (3) circled question mark (help), (4) megaphone with a teal badge **"10"** (announcements / unread count), (5) gear (settings). Then a pill button **"Ask Ori"** with a round avatar of a cartoon antelope on a teal disc. Then a green avatar disc with initials **"RL"**. |
| Category band (pale blue, full width) | Five evenly spaced text links: **Financial Reports · Patient Reports · Clinical Reports · Other Reports · Saved Reports**. None is shown in an active state. |
| Tab strip (inside a centred ~1000 px container) | **Main Dashboard** (active: white tab, blue top border) · **Provider Dashboard** |
| Action row (right-aligned, above the table) | **Print** (red button) · **Export As CSV** (blue button) |
| Table | Described in 2.2–2.4 |
| Right edge, mid-height | Small blue vertical tab with a double chevron/check glyph — handle of a collapsed side drawer (purpose **[unverified]**) |
| Bottom-right corner | Small blue link-styled text **"recon livewell"** — tenant / practice label |

Absent from the visible screen: date-range picker, office/location selector, provider filter, goal entry, comparison toggle, chart, column totals, any row drill-down affordance.

### 2.2 Column structure *(seen)*

- First column: metric label, preceded by a small grey circled info/help glyph (tooltip trigger) on **every** row. The header cell above the labels is empty.
- **12 month columns, newest to oldest, left to right.** Header is two lines, bold: month name, then year in parentheses.

| Col | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Header | November (2026) | October (2026) | September (2026) | August (2026) | July (2026) | June (2026) | May (2026) | April (2026) | March (2026) | February (2026) | January (2026) | December (2025) |

- Column 1 is the **current, in-progress month** (month-to-date): its values are roughly a third of a normal month for production while Working Hours is 1,119 against ~1,620 for a full month *(computed)*. The window is therefore "current month + previous 11 months", rolling.
- No Total / YTD / average / prior-year / goal / variance column.

### 2.3 Metric rows in order *(seen; format column inferred from the values)*

Blocks are separated by an empty white gap row. Rows are zebra-striped with thin rules; labels are bold.

| # | Block | Row label (exact) | Value format | Observed range (full months) |
|---|---|---|---|---|
| 1 | 1 Gross production | Gross Production | currency, no symbol | 195,950 – 283,487.36 |
| 2 | 1 | Doctor Gross Production | currency | 143,022 – 228,433.92 |
| 3 | 1 | Hygiene Gross Production | currency | 43,275.42 – 68,130.34 |
| 4 | 2 Net production | Net Production | currency | 110,135.34 – 175,124.25 |
| 5 | 2 | Doctor Net Production | currency | 84,191.31 – 148,604.44 |
| 6 | 2 | Hygiene Production | currency (it is the hygiene **net** figure — see 2.5) | 23,451.7 – 32,175.27 |
| 7 | 3 Gross collection | Gross Collection | currency | 108,763.2 – 172,625.43 |
| 8 | 3 | Doctor Gross Collection | currency | 84,223.66 – 141,937.1 |
| 9 | 3 | Hygiene Gross Collection | currency | 14,894.76 – 38,999.86 |
| 10 | 4 Total collection | Total Collection | currency | 107,832.48 – 163,965.11 |
| 11 | 4 | Doctor Collection | currency | 80,635.47 – 133,664.48 |
| 12 | 4 | Hygiene Collection | currency | 14,500.26 – 38,646.21 |
| 13 | 5 Capacity and schedule | Working Hours | hours, integer | 1,405 – 1,678 |
| 14 | 5 | Production Per Visit | currency per visit (2 decimals Mar–Nov, integers Dec–Feb) | 311.34 – 717 |
| 15 | 5 | Total Scheduled Production | currency | 118,193.75 – 179,542.95 |
| 16 | 5 | Hygiene Scheduled Production | currency | 22,894.9 – 32,300.26 |
| 17 | 5 | Doctor Scheduled Production | currency | 90,668.96 – 149,462.06 |
| 18 | 6 Rates | Case Acceptance (%) | percent, integer; "%" only in the label | 33 – 52 |
| 19 | 6 | Hygiene Reappointment (%) | percent, integer | 90 – 96 |
| 20 | 6 | Treatment Reappointment (%) | percent, integer | 36 – 47 |

**Block sizes: 3 / 3 / 3 / 3 / 5 / 3+.** Ordering quirk: blocks 1–4 list Doctor before Hygiene; block 5 lists Hygiene Scheduled before Doctor Scheduled.

### 2.4 Full value transcription *(seen — reproduced exactly as displayed, including inconsistent decimals)*

| Row | Nov-26 | Oct-26 | Sep-26 | Aug-26 | Jul-26 | Jun-26 | May-26 | Apr-26 | Mar-26 | Feb-26 | Jan-26 | Dec-25 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Gross Production | 92,066.81 | 256,378.9 | 283,487.36 | 215,730 | 267,132.99 | 195,950 | 211,867.41 | 283,324.29 | 253,511.94 | 265,798.29 | 209,945.94 | 281,366.53 |
| Doctor Gross Production | 51,547 | 203,397.7 | 228,433.92 | 160,917 | 204,644 | 143,022 | 168,591.99 | 217,247.31 | 185,381.6 | 207,233.92 | 156,017.94 | 215,467.54 |
| Hygiene Gross Production | 40,469.81 | 52,981.2 | 55,053.44 | 54,663 | 62,488.99 | 52,848 | 43,275.42 | 66,076.98 | 68,130.34 | 58,564.37 | 53,928 | 65,898.99 |
| Net Production | 56,110.93 | 165,732.83 | 174,793.6 | 127,154.34 | 161,218.53 | 110,135.34 | 125,748.27 | 173,814.03 | 141,920.44 | 175,124.25 | 124,494.84 | 164,793.99 |
| Doctor Net Production | 35,973.88 | 137,906.76 | 148,604.44 | 100,051.4 | 131,163.97 | 84,191.31 | 102,296.57 | 141,638.76 | 109,995.74 | 147,030.41 | 98,029.19 | 132,885.23 |
| Hygiene Production | 20,087.05 | 27,826.07 | 26,189.16 | 26,952.94 | 30,054.56 | 25,873.03 | 23,451.7 | 32,175.27 | 31,924.7 | 28,093.84 | 26,465.65 | 31,908.76 |
| Gross Collection | 79,588.34 | 152,477.37 | 172,625.43 | 114,257.36 | 108,763.2 | 114,964.99 | 122,246.89 | 132,908.93 | 120,937.89 | 145,600.87 | 131,231.76 | 144,303 |
| Doctor Gross Collection | 59,741.28 | 124,977.98 | 141,937.1 | 89,349.19 | 93,868.44 | 84,223.66 | 94,053.59 | 108,767.97 | 93,652.58 | 117,116.75 | 92,231.9 | 115,744.82 |
| Hygiene Gross Collection | 19,797.06 | 27,499.39 | 30,652.83 | 24,722.67 | 14,894.76 | 30,741.33 | 28,193.3 | 24,140.96 | 27,285.31 | 28,484.12 | 38,999.86 | 28,558.18 |
| Total Collection | 76,809.14 | 147,829.53 | 163,965.11 | 112,170.26 | 107,832.48 | 111,226 | 119,188.6 | 132,302.730 | 116,122.55 | 142,606.670 | 125,838.150 | 137,002.3 |
| Doctor Collection | 57,178.18 | 120,900.06 | 133,664.48 | 87,652.34 | 93,332.22 | 80,635.47 | 91,401.8 | 108,278.61 | 89,190.14 | 114,393.31 | 87,191.940 | 108,771.030 |
| Hygiene Collection | 19,580.960 | 26,929.47 | 30,265.13 | 24,332.42 | 14,500.26 | 30,590.530 | 27,786.8 | 24,024.12 | 26,932.41 | 28,213.36 | 38,646.21 | 28,231.27 |
| Working Hours | 1,119 | 1,622 | 1,612 | 1,678 | 1,619 | 1,612 | 1,625 | 1,612 | 1,630 | 1,405 | 1,500 | 1,538 |
| Production Per Visit | 287.75 | 453.23 | 474.16 | 319.42 | 391.33 | 311.34 | 360.7 | 415.26 | 338.74 | 717 | 646 | 700 |
| Total Scheduled Production | 54,858.16 | 163,455.21 | 161,289.37 | 140,389.14 | 165,037.22 | 118,193.75 | 120,769.09 | 177,428.58 | 137,863.74 | 179,542.95 | 129,345.82 | 163,753.33 |
| Hygiene Scheduled Production | 19,544.24 | 26,606.18 | 26,746.77 | 27,417.06 | 31,539.72 | 27,444.79 | 22,894.9 | 32,300.26 | 31,869 | 30,080.89 | 27,355.38 | 31,195.18 |
| Doctor Scheduled Production | 35,263.92 | 136,849.03 | 134,542.6 | 112,822.08 | 133,497.5 | 90,668.96 | 97,874.19 | 145,128.32 | 105,994.74 | 149,462.06 | 101,990.44 | 132,558.15 |
| Case Acceptance (%) | 41 | 52 | 49 | 45 | 42 | 38 | 35 | 36 | 38 | 43 | 33 | 42 |
| Hygiene Reappointment (%) | 95 | 94 | 96 | 90 | 91 | 96 | 94 | 93 | 95 | 96 | 95 | 93 |
| Treatment Reappointment (%) | 45 | 39 | 36 | 40 | 45 | 39 | 36 | 46 | 46 | 47 | 40 | 41 |

### 2.5 What the numbers prove *(computed)*

| Check | Result | Reading |
|---|---|---|
| Gross Production − (Doctor Gross + Hygiene Gross) | 0.00 in 9 of 12 months; **50 / 150 / 80** in Nov / Aug / Jun | "Gross" is the sum of a doctor bucket and a hygiene bucket **plus a small third bucket** that has no row of its own (production by a provider that is neither doctor nor hygiene type, or unassigned) |
| Net Production − (Doctor Net + "Hygiene Production") | 0.00 in 9 months; 50 / 150 / 71 in Nov / Aug / Jun | Row 6 "Hygiene Production" is the hygiene **net** production; the label drops the word |
| Gross Collection − (Doctor + Hygiene Gross Collection) | 0.00 in 9 months; 50 / 35.50 / 185.50 in Nov / Sep / Aug | Same three-bucket structure for collections; collections are attributed to providers |
| Total Collection − (Doctor + Hygiene Collection) | identical residuals (50 / 35.50 / 185.50) | Same |
| Total Scheduled − (Hygiene + Doctor Scheduled) | 0.00 in 9 months; 50 / 150 / 80 in Nov / Aug / Jun | Same |
| Gross Collection − Total Collection | always positive: 606.20 – 8,660.32 (0.5% – 5.1% of gross) | "Total Collection" is a **net** collection figure — gross receipts less something (refunds, reversals, collection adjustments) *(inferred)* |
| Net ÷ Gross Production | 56.0% – 65.9% | Net = gross less write-offs/adjustments of roughly 34–44% (a PPO-heavy fee mix) *(inferred)* |
| Total Scheduled ÷ Net Production | 92.3% – 110.4% | Scheduled production is valued near **net** fees, and is not a subset of completed production (it exceeds net production in 6 of the 12 months) *(inferred)* |
| Net Production ÷ Production Per Visit | **exactly 195.00** for November; non-integers for every earlier month (e.g. 365.67, 398.08) | For the live month, Production Per Visit = Net Production ÷ visits. Earlier months do not reconcile to current production values, i.e. they look like **stored month-end snapshots** while the production rows are live *(inferred)* |
| Production Per Visit, Dec–Feb vs Mar–Nov | integers 700 / 646 / 717, then 2-decimal values 311–474 | Precision **and** level change in March 2026 — a formula or denominator change that is not flagged anywhere on screen *(inferred)* |
| Net Production ÷ Working Hours | 68 – 125 per hour (full months) | Too low to be provider clinical hours; "Working Hours" at practice level is more likely chair/operatory hours or all-staff hours **[unverified]** |
| Derived, not shown on screen | Collection ratio (Total Collection ÷ Net Production): 66.9% – 101.1% for full months. Hygiene share of gross: 19.4% – 27.0% | Two standard KPIs the matrix has the inputs for but does not display (at least not above the fold) |

### 2.6 Presentation observations *(seen)*

- **Number formatting is inconsistent**: trailing zeros are dropped ("256,378.9", "215,730") yet some cells show three decimals ("19,580.960", "132,302.730", "142,606.670", "125,838.150", "87,191.940", "108,771.030"). No currency symbol. Values are **left-aligned** under the month header, so magnitudes do not line up.
- Percent rows show bare integers; the unit lives only in the label.
- The current partial month is not marked as month-to-date.
- The table sits in a fixed-width centred container, leaving wide empty margins on a 1363 px viewport.

### 2.7 Cut-off *(seen)*

The capture ends mid-way through row 20 ("Treatment Reappointment (%)"), which is clipped by the bottom edge, and the browser scrollbar thumb is at the top. **More rows almost certainly exist below** (what they are is **[unverified]**).

---

## 3. Screenshot C — reference product "Provider Dashboard"

### 3.1 Page chrome *(seen)*

Same page, scrolled about 35 px (the header bar is out of view; only the lower edge of the "Ask Ori" pill shows). Same category band, same tab strip with **Provider Dashboard** active, same **Print** / **Export As CSV** buttons, same right-edge drawer tab, same "recon livewell" label bottom-right.

### 3.2 Per-provider block structure *(seen)*

- The page is a **vertical stack of one table per provider**. Each table has its own header row: the top-left cell is the **provider's full name as an underlined blue hyperlink** (destination **[unverified]**), followed by the same 12 month headers as the Main Dashboard (November (2026) … December (2025)).
- Every provider table repeats the same 11 metric rows in the same 5 blocks.
- **Columns are not aligned between provider tables**: each table auto-sizes its own columns (Provider B's months sit at different x-positions from Provider A's).
- No provider filter, sort, search, role grouping or "hide inactive" control is visible. Provider B is almost entirely zeros and is still listed second.
- No practice total, no ranking, no side-by-side comparison of providers.

### 3.3 Metric rows per provider, in order *(seen; format inferred)*

| # | Block | Row label (exact) | Value format | Provider A, full-month range |
|---|---|---|---|---|
| 1 | 1 Money | Provider Gross Production | currency | 131,050 – 228,235.92 |
| 2 | 1 | Provider Net Production | currency | 80,192.1 – 148,560.44 |
| 3 | 1 | Provider Total Collection | currency | 78,764.240 – 132,677.84 |
| 4 | 2 Volume | Provider Total Appointments | count | 165 – 224 |
| 5 | 2 | Provider Seen Patients | count | 140 – 188 |
| 6 | 3 Productivity | Provider Working Hours | hours | 0 in all 12 months |
| 7 | 3 | Provider Production Per Visit | currency per visit | 259.49 – 1,111 |
| 8 | 3 | Provider Scheduled Production | currency | 86,447.33 – 149,462.06 |
| 9 | 3 | Provider Hourly Production | currency per hour | 0 – 863.55 |
| 10 | 4 Same day | Provider Same Day Treatment | currency, whole units *(inferred — see 3.5)* | 3,042 – 32,667 |
| 11 | 5 Rate | Treatment Reappointment Per Dentist (%) | percent, integer | 34 – 48 |

**Block sizes: 3 / 2 / 4 / 1 / 1.** The gap between block 2 and block 3 is rendered as an empty *shaded* row with rules, unlike the other gaps which are white — a styling inconsistency.

Compared with the Main Dashboard, the provider table has no Gross Collection row (Total Collection only), no Case Acceptance row and no hygiene-specific row (no Hygiene Reappointment per hygienist). As far as visible, the same row set is used for every provider regardless of provider type, including the row labelled "… Per Dentist".

### 3.4 Values *(seen)*

**Provider A (first block — a doctor-type provider):**

| Row | Nov-26 | Oct-26 | Sep-26 | Aug-26 | Jul-26 | Jun-26 | May-26 | Apr-26 | Mar-26 | Feb-26 | Jan-26 | Dec-25 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Provider Gross Production | 51,547 | 203,397.7 | 228,235.92 | 160,917 | 204,644 | 131,050 | 168,591.99 | 217,247.31 | 185,183.6 | 207,233.92 | 155,380.44 | 208,599.54 |
| Provider Net Production | 35,973.88 | 137,906.76 | 148,560.44 | 100,051.4 | 131,163.97 | 80,192.1 | 102,296.57 | 141,638.76 | 109,948.74 | 147,030.41 | 97,391.69 | 129,797.36 |
| Provider Total Collection | 57,092.18 | 120,316.24 | 132,677.84 | 85,891.130 | 92,335.22 | 78,764.240 | 91,119.99 | 105,585.66 | 87,737.100 | 113,373.28 | 81,957.36 | 101,575.59 |
| Provider Total Appointments | 49 | 203 | 204 | 201 | 223 | 166 | 200 | 224 | 204 | 177 | 165 | 189 |
| Provider Seen Patients | 46 | 176 | 172 | 171 | 188 | 147 | 175 | 172 | 155 | 154 | 140 | 158 |
| Provider Working Hours | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Provider Production Per Visit | 719.48 | 677 | 748.69 | 475.45 | 612.03 | 489.51 | 509.97 | 641.11 | 259.49 | 1,111 | 957 | 1,104 |
| Provider Scheduled Production | 35,263.92 | 136,849.03 | 134,542.6 | 112,822.08 | 133,497.5 | 86,447.33 | 97,874.19 | 135,588.8 | 105,968.74 | 149,462.06 | 101,990.44 | 129,470.28 |
| Provider Hourly Production | 299.78 | 780.86 | 863.55 | 602.8 | 741.75 | 470.04 | 607.1 | 815.95 | 607.44 | 0 | 0 | 685 |
| Provider Same Day Treatment | 21,945 | 11,015 | 14,740 | 8,048 | 18,593 | 3,042 | 13,875 | 14,050 | 20,324 | 32,667 | 12,145 | 9,930 |
| Treatment Reappointment Per Dentist (%) | 48 | 40 | 34 | 40 | 43 | 38 | 34 | 45 | 45 | 48 | 38 | 37 |

**Provider B (second block — only the first 5 rows are visible before the capture ends):**

| Row | Nov-26 | Oct-26 | Sep-26 | Aug-26 | Jul-26 | Jun-26 | May-26 | Apr-26 | Mar-26 | Feb-26 | Jan-26 | Dec-25 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Provider Gross Production | 0 | 125 | 112 | 25 | 6,684 | 0 | 0 | 0 | 8,935 | 0 | 4,016 | 0 |
| Provider Net Production | 0 | 108 | 31 | 25 | 3,743.21 | 0 | 0 | 0 | 4,247.33 | 0 | 1,896.21 | 0 |
| Provider Total Collection | 0 | 247 | 2,720.48 | 210.38 | 714 | 448 | 1,614 | 798.79 | 909.67 | 788.42 | 732.14 | 738.2 |
| Provider Total Appointments | 0 | 0 | 0 | 0 | 24 | 0 | 0 | 0 | 25 | 1 | 22 | 0 |
| Provider Seen Patients | 0 | 0 | 0 | 0 | 24 | 0 | 0 | 0 | 25 | 1 | 22 | 0 |

### 3.5 What the numbers prove *(computed)*

| Check | Result | Reading |
|---|---|---|
| Main "Doctor Gross Production" − Provider A gross | 0.00 in 7 of 12 months (198 / 11,972 / 198 / 637.50 / 6,868 in Sep / Jun / Mar / Jan / Dec) | The Main Dashboard "Doctor …" rows are **sums of provider-level rows over doctor-type providers** — the doctor/hygiene split is by provider role, not by procedure category |
| Main "Doctor Net Production" − Provider A net | 0.00 in the same 7 months | Same |
| Main "Doctor Scheduled Production" − Provider A scheduled | 0.00 in 8 of 12 months | Same |
| Provider B production vs Main "Doctor" rows | Provider B's amounts are **not** included in the Doctor totals (e.g. Jul: 204,644 doctor total = Provider A alone, while B has 6,684) | Provider B is typed neither as doctor nor (given the scale) as the hygiene department — some providers fall outside both buckets |
| Provider Net Production ÷ Production Per Visit | **exactly 50.00** for November; 203.70, 198.43, 210.44 … for earlier months; 423.71 for March | Live month = net production ÷ visits. "Visits" (50) is a third count, different from Total Appointments (49) and Seen Patients (46). Earlier months again look like snapshots; March is anomalous |
| Provider Net Production ÷ Hourly Production | **exactly 120.00** hours for November; 166 – 190 hours for full months | Hourly Production = net production ÷ hours, **from an hours source that is not the "Provider Working Hours" row** (which shows 0 everywhere). Two hour concepts exist; one is unpopulated |
| Hourly Production in Feb and Jan | 0 while production is 147,030.41 and 97,391.69 | Missing hours for those months render as 0 rather than "no data" |
| Same Day Treatment ÷ Provider Gross | 2.3% – 15.8% for full months | Values up to 32,667 against at most 224 appointments cannot be counts — it is a **currency amount** in whole units *(inferred)* |
| Seen Patients ÷ Total Appointments | 76% – 94% | Appointments count schedule entries; Seen counts unique patients *(inferred)* |
| Provider B collections with zero production | e.g. Jun 448, May 1,614, Apr 798.79 with no production or appointments | Collections trail production and stay attributed to the producing provider — a provider can show collections in months with no activity |

### 3.6 Cut-off *(seen)*

Provider B's table is cut after "Provider Seen Patients". The page continues with the rest of Provider B and, presumably, one table per remaining provider (count **[unverified]**).

---

## 4. Identifying the reference product

**Conclusion: Oryx Dental Software (oryxdental.com), a cloud dental practice-management system.** Confidence: high.

| Evidence | Detail | Source |
|---|---|---|
| "Ask Ori" is a named product feature | Listed first under "Included in Every Subscription"; also the first item on the "Oryx Pro" pricing card | [S1] [S2] |
| Ori is the vendor's mascot, an oryx | Blog post dated 2026-10-14: Ori is the company's oryx mascot, named by employees in June 2025, and customers will be "seeing a lot more of Ori very soon". The avatar on the button is a cartoon antelope | [S3] |
| Navigation matches | A third-party billing-training guide for Oryx describes: hover the **gear** icon (upper right) → **Reports**; the page opens on **"Saved Reports"**; tabs **Financial, Patient, Clinical, Other** | [S4] *(snippet; page is login-gated)* |
| Report categories match | Vendor FAQ: reporting comprises financial, clinical and patient reports plus custom reports | [S5] |
| Dashboard content matches | Vendor FAQ: the dashboard shows "production, collection, new patients, scheduled visits, procedure mix, case acceptance, and recare", filterable by date or provider | [S5] |
| Metric vocabulary matches | Vendor marketing graphics use "Dentist · Total Production" and "Hygienist · Total Production"; vendor KPI articles centre on case acceptance and hygiene reappointment | [S6] [S7] [S8] |
| Logo | Ring logo in teal and navy, consistent with the vendor's mark *(seen; visual match only)* | – |

Not found anywhere public: the exact strings "Main Dashboard", "Provider Dashboard", or any of the 31 metric labels. The vendor's documentation site (`oryxdentalsoftware.zendesk.com`) answers HTTP 403 on pages and 401 on its API, i.e. it requires a customer login [S9]; the vendor also refers to a support portal ("Oryx Realm") and "Oryx Academy" with no public URL [S5] [S2].

---

## 5. What is publicly documented about the reference product's reporting

### 5.1 Packaging — which plan carries which reporting capability [S2]

| Plan (US list price, 2026-11) | Reporting-related inclusions (vendor wording) |
|---|---|
| Oryx Pro — $650/mo | "Ask Ori"; "Dashboards & reports"; in the comparison table: "Performance dashboard & configurable reports" — "Track production, collections, and scheduling trends in real time with reports you configure once and check every day." |
| Oryx Automate — $899/mo | "Morning huddle & KPI dashboards"; "KPI dashboard" — "See production goals, collection rates, and scheduling trends in one configurable dashboard your whole team can check daily." |
| Oryx AI — $1,399/mo | Clinical AI only (voice perio charting, transcribe & summarize, exam charting, imaging AI); no analytics AI is listed |
| Oryx Enterprise — custom | "multi-location reporting, API access, advanced analytics" [S5]; "Central reporting and standards across every location" [S2] |

Plans include up to 2 providers; hygienists are not counted as providers [S2] — consistent with the product treating doctors and hygienists as different provider classes.

### 5.2 Reports area — navigation and behaviour

| Fact | Source |
|---|---|
| Entry point: gear icon (upper-right icon row) → "Reports" | [S4] *(snippet)* |
| Landing view: "Saved Reports"; other tabs Financial, Patient, Clinical, Other. (Screenshots B/C show a "Main Dashboard / Provider Dashboard" tab pair under the same category band — whether the dashboards are the landing content or a sub-view of one category is **[unverified]**) | [S4] *(snippet)*; screenshots |
| Each category exposes its reports in a **dropdown**; the report **generates automatically with default filters**; an **"Apply Filters"** button re-runs it | [S4] *(snippet)* |
| Reports can be configured once and reused ("configurable reports"); custom reports can be built "around your specific needs, such as unscheduled treatment"; the vendor says owners need no "coding or technical background" | [S2] [S10] |
| A customer describes being able to "prompt the system and get exactly the report I need" — suggests prompt-driven report creation; mechanism **[unverified]** | [S10] |
| Dashboards: Print and Export As CSV | Screenshots B/C |

### 5.3 Report categories — what each is known to contain

The vendor publishes no report catalogue. Everything confirmed is below; the rest is unknown.

| Category | Confirmed contents | Source | Unknown |
|---|---|---|---|
| **Financial Reports** | **Aging Report** is the first option in the dropdown. Output: columns are aging groups plus a total; bottom row "Total Outstanding Balances". Vendor also names "AR" and "production" as standard business reports | [S4] *(snippet)* [S10] | Full list, filters, columns |
| **Patient Reports** | Category exists. Vendor-described patient lists that plausibly live here: overdue hygiene / recare lists, follow-up lists, new patients | [S5] [S11] | Everything specific **[unverified]** |
| **Clinical Reports** | Category exists. Vendor-described clinical outputs: unscheduled treatment / "unscheduled procedures" (given as a *custom report* example), risk-assessment reports (four categories: periodontal, biomechanical, functional, dentofacial), referral reports (default template or custom), lab-case reports "with different filters" | [S10] [S12] | Which of these sit under this tab **[unverified]** |
| **Other Reports** | Category exists | [S4] *(snippet)* | Contents **[unverified]** |
| **Saved Reports** | Default landing view; holds reports the practice has configured and saved | [S4] *(snippet)* [S2] | Sharing, scheduling, ownership rules **[unverified]** |

### 5.4 Other reporting surfaces the vendor shows publicly

| Surface | Content | Source |
|---|---|---|
| Dashboard tiles (marketing graphic) | "Total · Collected", "Dentist · Total Production", "Hygienist · Total Production", "Total Production 80.5% of goal", procedure mix ("Crowns 34% ($8,925)", "Prophy 48% ($5,400)") | [S6] [S13] |
| Outstanding Balances widget | "Outstanding Balances 3 of 10" with patient, chart number, balance | [S6] |
| Production per Location chart | Bars per location with series **Scheduled / Production / Collection** | [S6] |
| Weekly Aging Report (RCM service deliverable) | Insurance and Patient balances in **0–30 / 31–60 / 61–90 / 90+** buckets, two weekly snapshots and a **Change** row | [S6] [S13] |
| Goal planning | "Track revenue goals, progress on your objectives, and other key indicators in one place."; an older reseller page says goals can be set per provider and per procedure type | [S14] [S15] (reseller page, low confidence) |
| Morning Huddle task board | Medical history updates, consent forms, eligibility checks, unconfirmed appointments, outstanding balances, patients with no future appointment, lab cases due | [S16] [S17] |
| Recare dashboard | List of patients overdue with no appointment, with recall, last exam and last prophy dates | [S18] [S17] |
| Audit log | Columns User, Action, Object, Date (login, view chart, edit appointment, report generated, backup) | [S6] |
| Comparison claim vs a legacy competitor | "Built-in dashboards and reports show production, collections, and recall data inside the platform without exporting to a spreadsheet or a separate reporting tool." | [S19] |

### 5.5 "Ask Ori"

| Question | Answer | Source |
|---|---|---|
| Does it exist as a product feature? | Yes — listed in every plan | [S1] [S2] |
| What does it do? | **Not described anywhere public** as of 2026-11-21. It is absent from the vendor's AI page, which lists only AI Transcribe & Summarize, AI Exam Charting, AI-Powered Imaging and AI Voice Perio Charting | [S20] |
| Is it an analytics assistant? | **[unverified]**. The only hint is the customer quote about prompting the system for a report | [S10] |

For comparison, two competitors do describe a data-question assistant: Dentrix Ascend "Ask Ascend" ("turns everyday practice questions into instant answers — eligibility gaps, clinical trends, operational priorities — without building reports") [S26], and Dental Intelligence "Explorer" (conversational; example prompts "Why was production down last month?", "Which patients have the most unscheduled treatment?", "What are my top 20 billing codes?"; can draft a brief, a team email or huddle insights; 2026-06-26) [S27].

### 5.6 Data access and caveats

- Data export on request: structured data as CSV, documents and images in original formats [S5]; after termination one export "in a commercially reasonable format" within 30 days [S21].
- A third-party analytics vendor that reads the product's API reports that **insurance payment dates come back as the invoice/claim creation date, not the date the payment was received**, and that transactions are retrievable only at invoice level (no line-item dates) [S22]. Whatever the in-app dashboards do, this is a concrete example of the payment-date ambiguity that makes collection reports disagree — our model must store payment received date, posting date and service date separately.
- Third-party review snippets: one reviewer finds reports "user-friendly", another says "forms and reports can be challenging/counterintuitive to look at/search through", and one mentions needing to refresh the whole page to get updates [S23] *(snippet)*.

---

## 6. Metric definitions — evidence table

No vendor definition exists in public for any of the 31 rows (the on-screen info tooltips would have them, but their text is not in the screenshots). The table gives the best available evidence. `Suggested key` is a snake_case identifier for our own metric registry, not something from the reference product.

### 6.1 Main Dashboard

| # | Label | Suggested key | Proven by the screenshot | Closest documented definition (comparable vendor) |
|---|---|---|---|---|
| 1 | Gross Production | `gross_production` | Doctor + Hygiene + small unassigned residual | "Total monetary value of all dental services provided within a specified time period" [S24]; total gross production for all providers before adjustments and write-offs [S25] |
| 2 | Doctor Gross Production | `doctor_gross_production` | Sum over doctor-type providers | "Dentist Production (Gross)": sum of gross production for users with the dentist role [S25] |
| 3 | Hygiene Gross Production | `hygiene_gross_production` | Sum over hygiene-type providers | "Hygienist Production (Gross)" [S25]. Note the alternative convention of splitting by procedure code category (restorative / hygiene / other) used by the same vendor's Performance Board [S36] |
| 4 | Net Production | `net_production` | 56–66% of gross | "Gross – Adjustments (e.g., discounts, write-offs)" [S24]; net production with three dating options — adjustments by procedure date, by entry date, or a smoothed 90-day average [S25] [S37] |
| 5 | Doctor Net Production | `doctor_net_production` | As 4, doctor-type providers | [S25] |
| 6 | Hygiene Production | `hygiene_net_production` | It is the **net** hygiene figure | [S25] |
| 7 | Gross Collection | `gross_collection` | Always ≥ Total Collection | "Collections: Payments added to patient ledgers" [S37] |
| 8 | Doctor Gross Collection | `doctor_gross_collection` | Collections attributed to doctor-type providers | Collection "by provider for the period selected" [S35] |
| 9 | Hygiene Gross Collection | `hygiene_gross_collection` | As 8, hygiene | [S35] |
| 10 | Total Collection | `net_collection` | Gross Collection minus 0.5–5.1% | "Collections Net: Payments added to ledgers, plus or minus adjustments configured as collections adjustments" [S37] |
| 11 | Doctor Collection | `doctor_net_collection` | As 10, doctor | [S37] |
| 12 | Hygiene Collection | `hygiene_net_collection` | As 10, hygiene | [S37] |
| 13 | Working Hours | `working_hours` | ~1,400–1,680 per month; unit basis unclear | "Clinical Hours Actual" (actual hours when set) vs "Clinical Hours Scheduled" [S37] |
| 14 | Production Per Visit | `production_per_visit` | Live month = Net Production ÷ visits | "Production per Visit (Gross): Gross production ÷ total patient visits", plus net variants [S25]; "$ per Appointment = Gross Production ÷ Number of appointments" [S24] |
| 15 | Total Scheduled Production | `scheduled_production` | ~Net-fee valued; not a subset of completed production | "the total gross value of all procedures attached to the appointments on your schedule for a given period" [S38]; "Production Scheduled … may be the sum of appointment amounts or of procedures, depending on the PMS" [S37]; legacy tool: "Shows total production dollars on schedule for future dates" [S28] |
| 16 | Hygiene Scheduled Production | `hygiene_scheduled_production` | Hygiene share of 15 | [S37] |
| 17 | Doctor Scheduled Production | `doctor_scheduled_production` | Doctor share of 15 | [S37] |
| 18 | Case Acceptance (%) | `case_acceptance_pct` | 33–52 | The reference vendor's own blog gives **two different formulas**: accepted treatment value ÷ proposed treatment value [S7], and accepted plans ÷ presented plans x 100 [S8]. Peers publish both a dollar version ("Tx Acceptance %: dollars accepted ÷ dollars presented") and a patient version ("Patient Acceptance %") [S25] [S24] |
| 19 | Hygiene Reappointment (%) | `hygiene_reappointment_pct` | 90–96 | Reference vendor blog: hygiene patients who rebook before leaving ÷ total hygiene patients seen x 100 [S7]. Peer: "Percentage of hygiene visits that are reappointed before or on the date of the appointment", with an explicit hygiene-visit code list (D1110, D1120, D4341, D4342, D4346, D4355, D4910 …) [S37] [S36] |
| 20 | Treatment Reappointment (%) | `treatment_reappointment_pct` | 36–47 | **No public definition found, vendor or peer.** Nearest concepts: "Scheduled Treatment: R/E procedures presented and scheduled for a future visit the same day" [S36]. Working assumption **[unverified]**: patients with outstanding treatment who leave with their next treatment appointment booked ÷ such patients seen |

### 6.2 Provider Dashboard

| # | Label | Suggested key | Proven by the screenshot | Closest documented definition (comparable vendor) |
|---|---|---|---|---|
| 1 | Provider Gross Production | `provider_gross_production` | Rolls up into Main "Doctor Gross Production" | "Gross Production by provider for the period selected" [S35] |
| 2 | Provider Net Production | `provider_net_production` | Rolls up into Main "Doctor Net Production" | [S25] |
| 3 | Provider Total Collection | `provider_net_collection` | Persists in months with no production | "the amount of money collected by provider for the period selected" [S35] |
| 4 | Provider Total Appointments | `provider_appointments` | Larger than Seen Patients | "Appointments are defined by the number of blocks on the schedule"; a patient can count for multiple appointments [S34] [S36] |
| 5 | Provider Seen Patients | `provider_patients_seen` | 76–94% of appointments | "Patients Seen: Number of patients a provider had procedures associated with" [S37] |
| 6 | Provider Working Hours | `provider_working_hours` | 0 in every month — unpopulated | Clinical hours actual vs scheduled [S37] |
| 7 | Provider Production Per Visit | `provider_production_per_visit` | Live month = Provider Net Production ÷ visits (50) | Production from the ledger ÷ total patient visits for that provider [S35] |
| 8 | Provider Scheduled Production | `provider_scheduled_production` | Rolls up into Main "Doctor Scheduled Production" | [S38] [S37] |
| 9 | Provider Hourly Production | `provider_production_per_hour` | Live month = Net Production ÷ 120 h; hours come from a source other than row 6 | "the provider's Gross Production divided by the provider's actual Clinical Hours" [S35] |
| 10 | Provider Same Day Treatment | `provider_same_day_treatment_amount` | Currency; 2–16% of gross | "Production Same-Day: Dollar amount produced where the treatment was not treatment planned or scheduled in advance" [S37]; "Same Day Treatment: R/E procedures added and completed the same day" [S36]; "Procedures accepted and completed on the day they were presented" [S24] |
| 11 | Treatment Reappointment Per Dentist (%) | `provider_treatment_reappointment_pct` | 34–48; close to but not equal to the practice value | None found (see Main row 20) |

### 6.3 Published benchmarks from the reference vendor (marketing content, not product behaviour)

| KPI | Vendor-stated target | Source |
|---|---|---|
| Collection ratio (payments ÷ adjusted production) | 98% or higher | [S7] |
| Dentist daily production / hourly production | about $3,500–5,000 per day; $500–800 per hour | [S7] |
| Hygiene share of daily production | 25–35% | [S7] |
| Case acceptance | 75–80% [S7]; 70% or higher [S8]; national average 50–60%, elite 70–80%+ [S39] | – |
| Hygiene reappointment | 90%+ for high performers, 80% minimum [S7] [S8] | – |
| No-show / cancellation | 5% or less [S7]; about 10% average [S8]; about 15% industry average [S39] | – |
| Patient retention | 80% or higher | [S7] [S8] |
| Annual patient value | $600–800 per active patient | [S7] |
| Chair utilisation | 75–85% of available hours | [S7] |

The vendor's three articles give three different numbers for the same benchmark (case acceptance, cancellations). Benchmarks must be stored with source and date, never hard-coded.

---

## 7. Implications for our module

**Replicate (parity with the references):**

1. A dense **metric x period matrix** as one first-class view, practice-level and per-provider, exportable — it is the format the user pointed to.
2. The legacy menu's **26 entries** as a navigable catalogue, including the "meta" entries: My Reports (user-scoped), My Favorites (saved shortcuts), Search Report, and an audience grouping (front office / back office / clinical / management) [S28].
3. The reference product's five categories — Financial, Patient, Clinical, Other, Saved — are a cleaner top level than the legacy list; the legacy families map into them.

**Improve on (each is a visible weakness in the references):**

| Reference weakness (evidence) | What we should do instead |
|---|---|
| No definition visible; tooltips only (B/C) | A metric registry: key, label, unit, format, formula, date basis, attribution rule, version; tooltip **and** a glossary page |
| Labels that hide "net" ("Hygiene Production", "Total Collection") (2.5) | Explicit gross / net naming everywhere |
| Totals do not reconcile because of an unshown third bucket (2.5) | Show an "Other / unassigned" row, or a reconciliation line, so parts always sum to the total |
| Doctor/hygiene split depends on provider typing (3.5) | Make the split rule explicit and selectable: by provider role or by procedure category |
| Hours row shows 0 while an hours-based metric is non-zero; missing data renders as 0 (3.5) | One hours model with a declared source (schedule template, time clock, appointment duration); render "not configured" / "no data", never a silent 0 |
| Historic months look like snapshots with an unflagged formula change (2.5) | Decide and document period-close semantics; store snapshots with a definition version; mark restated or redefined periods |
| Inconsistent decimals, left-aligned numbers, no currency symbol, unmarked month-to-date (2.6) | Central formatters; right-aligned tabular numerals; "MTD" marker on the open period |
| Fixed trailing-12-months only; no totals, YTD, prior-year, goal or variance (2.2) | Period grain and range selectors; total / average / YTD columns; year-over-year and goal variance; sparklines and conditional formatting |
| No filters (office, provider, role), every provider listed including empty ones, columns misaligned between provider tables (3.2) | Office and provider filters honouring the working-office model; hide-inactive toggle; one aligned grid; ranking and side-by-side comparison; office benchmarking |
| No drill-down | Every cell opens the underlying transactions, appointments or patients |
| Print and CSV only | CSV, XLSX and PDF; scheduled delivery; saved views with sharing |
| Assistant button with undocumented scope (5.5) | A governed natural-language layer that answers only from registered metrics and cites the definition used |

---

## 8. Unverified items and known gaps

1. Exact definitions of all 31 dashboard metrics in the reference product (tooltip text not captured; vendor docs gated).
2. Rows below the fold on the Main Dashboard, and the number of provider tables on the Provider Dashboard.
3. The report lists inside Financial / Patient / Clinical / Other, beyond "Aging Report".
4. Whether the two dashboards are the Reports landing view, and where the "Saved Reports" list sits relative to them.
5. What "Ask Ori" can do.
6. Unit basis of "Working Hours" and the hours source behind "Provider Hourly Production".
7. Whether "Provider Same Day Treatment" is gross or net currency.
8. Sub-menu contents of Interactive Reports, Office Reports and Reports (Old) in the legacy tool beyond the items cited in 1.4; behaviour of My Favorites and Search Report; the six correspondence entries and two blank-form entries.
9. The legacy vendor's own article explaining the new Reports menu [S33] and its analytics-dashboard metric guide [S40] could not be opened (HTTP 403 to automated fetch).

---

## Sources

Reference product — vendor pages (oryxdental.com), all fetched 2026-11-21:

- [S1] Features overview — https://www.oryxdental.com/features-overview/
- [S2] Pricing — https://www.oryxdental.com/pricing/
- [S3] "Meet Ori: How a Little Oryx Became the Heart of Our Herd" (2026-10-14) — https://www.oryxdental.com/meet-ori-how-a-little-oryx-became-the-heart-of-our-herd/
- [S5] FAQs — https://www.oryxdental.com/faqs/
- [S6] Home page (dashboard, aging and audit-log preview graphics) — https://www.oryxdental.com/
- [S7] "Dental Practice KPIs: The 9 Main Metrics to Track" (2026-04-23) — https://www.oryxdental.com/dental-practice-kpis-the-9-main-metrics-to-track/
- [S8] "6 Essential KPIs DSOs Should Track for Success" (2025-02-11) — https://www.oryxdental.com/key-kpis-for-dso-success/
- [S9] Vendor help center (HTTP 403 / API 401 — login required) — https://oryxdentalsoftware.zendesk.com/hc/en-us
- [S10] Windham Cosmetic Dentistry case study (2026-10-21) — https://www.oryxdental.com/windham-cosmetic-dentistry-case-study/
- [S11] "How to Increase Productivity in Your Dental Office" (2025-12-14) — https://www.oryxdental.com/how-to-increase-productivity-in-your-dental-office/
- [S12] Clinical management — https://www.oryxdental.com/clinical-management/
- [S13] Startup practices (dashboard and weekly aging graphics) — https://www.oryxdental.com/startup-dental-practices/
- [S14] Practice management — https://www.oryxdental.com/practice-management/
- [S16] Revenue automation (Morning Huddle and claims graphics) — https://www.oryxdental.com/revenue-automation/
- [S18] Patient engagement (recare dashboard mention) — https://www.oryxdental.com/patient-engagement/
- [S19] Comparison page — https://www.oryxdental.com/oryx-vs-dentrix/
- [S20] AI page — https://www.oryxdental.com/ai/
- [S39] "Oryx's Guide to Business Excellence in Dentistry" (2025-08-06) — https://www.oryxdental.com/oryxs-guide-to-business-excellence-in-dentistry/
- Also consulted, nothing reporting-specific beyond the above: https://www.oryxdental.com/news-education/ , https://www.oryxdental.com/dsos/ , https://www.oryxdental.com/revenue-cycle-management/ , https://www.oryxdental.com/services-support/ , https://www.oryxdental.com/morning-huddle-ideas/ , https://www.oryxdental.com/webinars-events/

Reference product — third parties:

- [S4] Dental ClaimSupport training, "Oryx" patient AR reports guide (login-gated; content from search-result summary) — https://training.dentalclaimsupport.com/oryx-pt-ar-reports/
- [S15] Reseller page describing dashboard and goals (low confidence) — https://easydentalclaims.com/practice-management-tools/
- [S17] Third-party product listing (Morning Huddle, recare list captions; "last verified" 2026-11-21) — https://aidentaltools.com/tools/oryx/
- [S21] Third-party comparison quoting the customer agreement on data export (checked 2026-10) — https://dentalsupplierguide.com/us/articles/oryx-vs-curve-dental/
- [S22] TeamCare, "Oryx: Understanding Insurance Payment Dates in Reports" — https://support.teamcaredental.com/articles/9431461717-oryx-understanding-insurance-payment-dates-in-reports
- [S23] G2 reviews (page blocks automated fetch; quotes from search-result summary) — https://www.g2.com/products/oryx-dental-software/reviews

Comparable-vendor metric definitions and assistants:

- [S24] Practice by Numbers, "Practice IQ Home Dashboard — complete guide" — https://help.practicenumbers.com/en/articles/11842471-practice-iq-home-dashboard-complete-guide
- [S25] Dental Intelligence, "Morning Huddle Metrics" (2026-04-22) — https://educate.dentalintel.com/en/articles/14434058-morning-huddle-metrics
- [S26] Dentrix Ascend AI page ("Ask Ascend") — https://www.dentrixascend.com/ai/
- [S27] Dental Intelligence, Explorer announcement (2026-06-26) — https://dentalintel.com/blog-posts/theyre-finally-here-meet-explorer-and-ai-receptionist
- [S34] Dental Intelligence, "Performance Board: Overview" — https://learn.dentalintel.com/en/articles/6060970-performance-board-overview
- [S35] Dental Intelligence, "Provider Pulse: Navigating your Dashboard and Metric Definitions" — https://learn.dentalintel.com/en/articles/6173979-provider-pulse-navigating-your-dashboard-and-metric-definitions
- [S36] Dental Intelligence, "Performance Board" — https://educate.dentalintel.com/en/articles/12002675-performance-board
- [S37] Dental Intelligence, "Scorecards Metrics Glossary" (2026-07-01; first 100,000 characters read) — https://educate.dentalintel.com/en/articles/15773167-scorecards-metrics-glossary
- [S38] TeamCare, "How is Scheduled Production calculated?" — https://support.teamcaredental.com/articles/9201273115-how-is-scheduled-production-calculated

Legacy tool (Planet DDS / Denticon):

- [S28] Planet DDS, "Denticon Reporting 101 — What reports matter to each staff member in the office" (PDF, 9 pages; file metadata 2024-11-24) — https://www.planetdds.com/wp-content/uploads/2022/11/Reporting-Matrix.pdf (redirects to https://assets.ctfassets.net/00qtuar9jg9j/31Z0oe3B1FYKOESPROVVSC/d2d3e7d55a3c5025de9a0630d639ff11/Reporting-Matrix.pdf)
- [S29] Planet DDS support, reporting section (My Favorites behaviour comes from a search-result summary of this support site; the specific article URL was not captured, the section link is the nearest pointer) — https://support.planetdds.com/hc/en-us/sections/39626159143195-Reporting
- [S30] Planet DDS support, "Interactive Report - Eligibility Verification" (search-result summary) — https://support.planetdds.com/hc/en-us/articles/20825080284443-Interactive-Report-Eligibility-Verification
- [S31] Planet DDS support, patient list reports under Reports > Lists > Patient/Resp. Party List (search-result summary) — https://support.planetdds.com/hc/en-us/articles/115002082912-Is-there-a-report-which-will-help-our-office-know-the-number-of-patient-records
- [S32] Planet DDS support, insurance lists under Reports > Lists > Setup (search-result summary) — https://support.planetdds.com/hc/en-us/articles/115002067751-How-are-we-able-to-locate-a-report-to-understand-which-patients-are-associated-to-an-insurance-plan-insurance-carrier-or-employer
- [S33] Planet DDS support, "How to understand the new reports menu" (HTTP 403; title only) — https://support.planetdds.com/hc/en-us/articles/4408457645723-How-to-understand-the-new-reports-menu
- [S40] Planet DDS support, "Understanding the Denticon Practice Analytics Dashboards: A Complete Guide to Metrics and Reports" (HTTP 403; title only) — https://support.planetdds.com/hc/en-us/articles/49789717199771-Understanding-the-Denticon-Practice-Analytics-Dashboards-A-Complete-Guide-to-Metrics-and-Reports

Local evidence:

- Screenshots A/B/C listed at the top of this document; zoom crops under the session scratchpad `zoom/_refs/`.
- First-page crops of `patients_list_reports.pdf`, `providers_list_reports.pdf`, `security_list_reports.pdf`, `setup_list_reports.pdf` and `my_reports.pdf` (screen titles and report-picker labels only).
