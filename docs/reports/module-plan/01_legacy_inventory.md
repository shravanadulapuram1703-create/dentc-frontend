# Legacy report inventory (Denticon) - every report, filter and option

Generated from the verified transcriptions in `legacy/*.json` (two blind readers plus a reconciling
third reader per category, all working from the original screenshots). This is the parity baseline:
every control listed here must exist in the new Reports module.

**Totals:** 16 categories, 118 reports, 1025 criteria controls.

## Contents

| # | Category | Reports | Controls | Reports in legacy list without a screenshot |
|---|---|---|---|---|
| 1 | [Daily Reports](#1-daily-reports) | 12 | 151 | - |
| 2 | [Monthly Reports](#2-monthly-reports) | 9 | 106 | - |
| 3 | [Ledger Reports](#3-ledger-reports) | 4 | 35 | - |
| 4 | [Management Reports](#4-management-reports) | 4 | 31 | - |
| 5 | [Insurance Reports](#5-insurance-reports) | 13 | 130 | - |
| 6 | [Appointment Reports](#6-appointment-reports) | 9 | 91 | - |
| 7 | [Treatment Plan Reports](#7-treatment-plan-reports) | 4 | 50 | - |
| 8 | [Referral Reports](#8-referral-reports) | 8 | 91 | - |
| 9 | [Recall Reports](#9-recall-reports) | 4 | 48 | - |
| 10 | [Ortho Reports](#10-ortho-reports) | 5 | 36 | - |
| 11 | [Statements](#11-statements) | 1 | 26 | - |
| 12 | [Lists - Patient](#12-lists---patient) | 12 | 85 | - |
| 13 | [Lists - Provider](#13-lists---provider) | 4 | 19 | - |
| 14 | [Lists - Security](#14-lists---security) | 4 | 11 | - |
| 15 | [Lists - Setup](#15-lists---setup) | 20 | 67 | - |
| 16 | [My Reports](#16-my-reports) | 5 | 48 | - |

## 1. Daily Reports

- Source: `daily_reports` (12 reports transcribed) - window title: "Daily Reports"
- Reports listed in the legacy screen: Peg Board Day Sheet, Daily Journal, Production Report, Collection Report, Deposit Slip, Scheduled Production, Routing Slip, Progress Notes, Production Analysis Report, Daily Audit, Claims Printed, Special Transaction Report
- Notes: Coverage: 12 screenshots, each showing a different one of the 12 listed reports selected, in list order (1.PNG Peg Board Day Sheet, 2 Daily Journal, 3 Production Report, 4 Collection Report, 5 Deposit Slip, 6 Scheduled Production = left column; 7 Routing Slip, 8 Progress Notes, 9 Production Analysis Report, 10 Daily Audit, 11 Claims Printed, 12 Special Transaction Report = right column). The selected radio of every screenshot was confirmed from the pixels. There are no popups, expanded dropdowns, scrolled second views or foreign screens, so the contents of every SELECT / SEARCH picker dialog and of the two dropdown lists (Amount on Special Transaction Report, Fee Schedule To Compare on Production Report) are NOT documented by these screenshots.  Screen chrome (identical in all 12): dark title bar with 'Daily Reports' at the left and 'PGID :2829 / OID :108' followed by a white printer icon at the far right. Blue sub-header 'SELECT REPORT' over the left panel and 'REPORT CRITERIA' over the right panel; the right end of the REPORT CRITERIA bar holds the grey-styled CLEAR CRITERIA button (refresh icon). A splitter / collapse handle with three vertical dots sits between the two panels. The bottom action bar of the criteria panel holds PRINT / PREVIEW (printer icon) and ADD TO MY FAVORITES (plus icon), both blue.  Report list: 12 radio items in a 2-column x 6-row grid; the dark panel below the grid is empty (checked pixel by pixel), so the list is not scrollable or clipped.  Text-rendering caveat: the bold dark section-header font draws a capital G almost exactly like a C at this resolution (the partly visible footer message suggests the page was captured at 75% browser zoom), so the pixels look like 'OFFICE/CROUP', 'DATE RANCE', 'CROUP BY', 'PROCRESS NOTES TO PRINT', 'BUT MISSINC', 'CATECORY', 'CODE/CATECORY', 'PATIENT NAME RANCE'. The greyed 'GROUP BATCH CHECKS' header on Deposit Slip and the mixed-case labels ('Office Group', 'Group By') show a clear G, so all of these are transcribed with G. The date digits '11' also render like 'TI' (the value is 11/21/2026).  Recurring patterns: PRINT FORMAT (PDF \| Excel, default PDF) is on 11 of 12 reports - missing only on Routing Slip. REPORT FORMAT (Detail \| Summary) appears only on Daily Journal, Production Report (Detail greyed, Summary selected), Collection Report and Claims Printed; Production Analysis Report has ANALYSIS BY in that slot. OFFICE/GROUP (Office \| Office Group radios, default Office, plus an unlabelled read-only box showing 108 = the current OID with a SELECT button) is on all 12; Office Group is greyed only on Routing Slip. A PROVIDER picker (default ALL) is on 10 reports - Production Report and Collection Report have none - and a User picker is added (section title PROVIDER/USER) on Daily Journal, Deposit Slip and Special Transaction Report; Progress Notes labels its provider row 'Preferred Provider'. Every date field shows 11/21/2026 (the capture day, i.e. the default is today); Peg Board Day Sheet has a single Report Date instead of a Start Date / End Date range. A date-basis radio precedes the range on Daily Journal (Transaction Date \| Created Date), Deposit Slip (Transaction Date \| Payment Date), Progress Notes (DOS Date \| Created On Date \| Appointment Date) and Special Transaction Report (Transaction Date \| Service Date). Apart from the office box (108), the read-only picker boxes (grey fill + blue SELECT) default to ALL, except EXCLUDE PATIENT TYPE and PAYMENT/ADJ CODES on Special Transaction Report which default to 'None'. A small 'Page Break' checkbox sits alone in the right half of the grouping row on Daily Journal, Production Report, Collection Report and Daily Audit and is greyed in every screenshot (grouping = None in all of them). Button icons: building icon for office / codes / payment types / payment-adj codes / insurance plans / code-category; single-person icon for provider / operatory / category / carrier(s); person-plus icon for user and exclude patient type; magnifier for SEARCH; circle-slash for NONE.  Disabled states were confirmed by pixel colour: disabled labels are mid-grey (RGB 161) against black for enabled ones; read-only / disabled boxes are grey (220,223,226) against (241,241,241) for editable fields. Controls greyed in the captured default state (what enables them is not shown): Show AR and Page Break (Daily Journal); Detail, Page Break, Include Z-Codes and the Fee Schedule To Compare dropdown (Production Report); Page Break (Collection Report); CHECK TYPE and the whole GROUP BATCH CHECKS block (Deposit Slip); Office Group (Routing Slip); Appointment Date and APPOINTMENTS TO INCLUDE (Progress Notes); the CARRIER SELECT button (Production Analysis Report); Page Break (Daily Audit); Age Range From / To and the amount value box (Special Transaction Report).  Truncation: the criteria area has a fixed height (about 481 px in every screenshot) with the action bar pinned below it and no scrollbar is ever drawn. Daily Journal (2.PNG) is visibly clipped - its GROUP BY row is cut by the action bar - and Special Transaction Report (12.PNG) fills the area exactly with its last row flush against (and about 2-3 px short at) the action bar, so both are flagged possibly_truncated; in both cases the overflow is only a few pixels, which is consistent with the visible row being the last one, but hidden rows cannot be ruled out. The other ten reports show blank space under their last section.  Footer: only 2.PNG shows a sliver of the page footer, and only the top 3-4 pixel rows of the glyphs are visible, so it cannot be read reliably. Best reading: '© 2026 Planet DDS \| Privacy Policy \| ... [?]' in black (Privacy Policy in link blue, followed by further unreadable text ending in digits) and, in red at the right, 'You have zoomed ... to 75%. This page is best viewed if zoomed to 100% [?]'. It is browser-zoom chrome of the host page, not report criteria.  Verification: third-reader pass over the original PNGs and enlarged crops. Readers A and B agreed on every report, section, control, option, default and enabled state (151 controls); their only differences were descriptive (SELECT icon wording, the label given to the Routing Slip info icon, the wording of the unreadable footer). A pixel-cluster sweep of every criteria panel found no control outside those listed here.

### 1.1 Peg Board Day Sheet

Screenshots: 1.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 1.PNG only. Smallest criteria set of the category: PRINT FORMAT (full width), OFFICE/GROUP \| PROVIDER (side by side), REPORT DATE (full width, single date). Large empty area between REPORT DATE and the action bar, nothing clipped. No greyed-out controls. No REPORT FORMAT, GROUP BY, SORT BY or OTHER OPTIONS section.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section at the top of the criteria panel. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of the panel, side by side with PROVIDER. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button (building icon) to its right. 108 is the same value as the OID shown in the title bar. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right half of the panel. Read-only grey box; blue SELECT button (single-person icon). |
| REPORT DATE | Report Date | Date | - | 11/21/2026 | yes | Single date only (no start/end range). Editable-style field with a calendar icon inside it at the right. |

### 1.2 Daily Journal

Screenshots: 2.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES - **Possibly truncated - more options may exist below the visible area**

> 2.PNG only. The criteria content is taller than the fixed-height criteria area: the last visible row (GROUP BY radios + Page Break) is cut horizontally by the PRINT / PREVIEW action bar (about 16 px visible against 22 px for the other radio rows, and no bottom border). No scrollbar is drawn, so anything below GROUP BY (for example a further section) would be hidden and can neither be confirmed nor ruled out. Everything above the cut is fully legible. Greyed in the default state: Show AR and Page Break. This is also the only screenshot in which a slice of the page footer is visible (see observations).

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT FORMAT | (unlabelled) | Radio | Detail / Summary | Detail | yes | Left half of the panel, side by side with PRINT FORMAT. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right half of the panel. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of the panel, side by side with PROVIDER/USER. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box under the Office / Office Group radios; blue SELECT button (building icon). |
| PROVIDER/USER | Provider | Picker | - | ALL | yes | Right half of the panel, first row. Read-only grey box; blue SELECT button (single-person icon). |
| PROVIDER/USER | User | Picker | - | ALL | yes | Right half of the panel, second row. Read-only grey box; blue SELECT button (person-plus icon). |
| DATE RANGE | (unlabelled) | Radio | Transaction Date / Created Date | Transaction Date | yes | Date-basis selector on the first row of the section, above Start Date / End Date. Full-width section. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. |
| PATIENT TYPE | (unlabelled) | Radio | Both / General / Ortho | Both | yes | - |
| TRANSACTION TYPES | Services | Checkbox | - | checked | yes | All three transaction-type checkboxes sit on one row and all are ticked. |
| TRANSACTION TYPES | Payments | Checkbox | - | checked | yes | - |
| TRANSACTION TYPES | Adjustments | Checkbox | - | checked | yes | - |
| OTHER OPTIONS | Show AR | Checkbox | - | unchecked | **no (greyed)** | Greyed out (box and label grey) in this default state; on its own row. What enables it is not visible. |
| OTHER OPTIONS | Include Resp. Party Type | Checkbox | - | unchecked | yes | On its own row. |
| OTHER OPTIONS | Show Datewise Summary | Checkbox | - | unchecked | yes | On its own row. |
| GROUP BY | (unlabelled) | Radio | None / Provider / User | None | yes | Left half of the row. The row is cut at its lower edge by the action bar (only about 16 px of a normal 22 px row are visible) but all three options are fully readable. |
| GROUP BY | Page Break | Checkbox | - | unchecked | **no (greyed)** | Small greyed-out checkbox alone in the right half of the GROUP BY radio row. Greyed while None is the selected grouping (that a grouping enables it is an inference, not shown). |

### 1.3 Production Report

Screenshots: 3.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 3.PNG only. No PROVIDER picker section on this report (provider appears only as a PRODUCTION BY / GROUP BY choice). Four greyed items in the default state (PRODUCTION BY = Code, GROUP BY = None, Include UCR unticked): the Detail radio, Page Break, Include Z-Codes and the Fee Schedule To Compare dropdown. Blank space remains below OTHER OPTIONS / FEE SCHEDULE TO COMPARE, nothing clipped.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT FORMAT | (unlabelled) | Radio | Detail / Summary | Summary | yes | Left half of the panel, side by side with PRINT FORMAT. The 'Detail' radio and its label are greyed out (disabled) in this state; 'Summary' is selected. What enables Detail is not visible. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right half of the panel. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Section spans the full width (this report has no PROVIDER section beside it). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box under the Office / Office Group radios; blue SELECT button (building icon). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. No date-basis radio on this report. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. |
| PRODUCTION BY | (unlabelled) | Radio | Code / Provider / Category / Carrier | Code | yes | Full-width section; all four options on one row. |
| GROUP BY | (unlabelled) | Radio | None / Provider / Carrier | None | yes | Left half of the row. |
| GROUP BY | Page Break | Checkbox | - | unchecked | **no (greyed)** | Small greyed-out checkbox alone in the right half of the GROUP BY radio row; greyed while None is selected. |
| CODES | (unlabelled) | Picker | - | ALL | yes | Unlabelled wide read-only grey box (spans about two thirds of the panel); blue SELECT button (building icon) to its right. |
| OTHER OPTIONS | Include UCR | Checkbox | - | unchecked | yes | Left half of the panel, side by side with FEE SCHEDULE TO COMPARE; first line. |
| OTHER OPTIONS | Include Z-Codes | Checkbox | - | unchecked | **no (greyed)** | Greyed out in this default state; second line, directly under Include UCR. What enables it is not visible. |
| FEE SCHEDULE TO COMPARE | Fee Schedule To Compare | Dropdown | - | CIGNA PPO HAMILTON ( 128 ) | **no (greyed)** | list collapsed - other values not visible. Right half of the panel beside OTHER OPTIONS. Dropdown is greyed out (grey fill, grey text, up/down chevrons at its right); the row label itself is black. Probably tied to Include UCR being unticked - inference only, the dependency is not shown. |

### 1.4 Collection Report

Screenshots: 4.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 4.PNG only. No PROVIDER picker section on this report. Only Page Break is greyed. Blank space below OTHER OPTIONS, nothing clipped.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT FORMAT | (unlabelled) | Radio | Detail / Summary | Detail | yes | Left half of the panel, side by side with PRINT FORMAT. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right half of the panel. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Section spans the full width (this report has no PROVIDER section beside it). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box under the Office / Office Group radios; blue SELECT button (building icon). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. No date-basis radio on this report. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. |
| PAYMENT TYPES | Payment Types | Picker | - | ALL | yes | Read-only grey box; blue SELECT button (building icon). |
| COLLECTION BY | (unlabelled) | Radio | None / Provider / Carrier / Code | None | yes | Left half of the row. |
| COLLECTION BY | Page Break | Checkbox | - | unchecked | **no (greyed)** | Small greyed-out checkbox alone in the right half of the COLLECTION BY radio row; greyed while None is selected. |
| OTHER OPTIONS | Include Adjustments(Collection) | Checkbox | - | checked | yes | Text exactly as shown - no space before the parenthesis. Ticked by default. |

### 1.5 Deposit Slip

Screenshots: 5.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 5.PNG only. No REPORT FORMAT section. CHECK TYPE (three radios) and the whole GROUP BATCH CHECKS block (header checkbox plus its two radios) are greyed in the default state where only Cash is ticked. Blank space below OTHER OPTIONS, nothing clipped.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section at the top of the panel. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of the panel, side by side with PROVIDER/USER. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box under the Office / Office Group radios; blue SELECT button (building icon). |
| PROVIDER/USER | Provider | Picker | - | ALL | yes | Right half of the panel, first row. Read-only grey box; blue SELECT button (single-person icon). |
| PROVIDER/USER | User | Picker | - | ALL | yes | Right half of the panel, second row. Read-only grey box; blue SELECT button (person-plus icon). |
| DATE RANGE | (unlabelled) | Radio | Transaction Date / Payment Date | Transaction Date | yes | Date-basis selector on the first row of the section. Full-width section. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. |
| PAYMENT TYPES | Cash | Checkbox | - | checked | yes | All seven payment-type checkboxes sit on one row; Cash is the only one ticked by default. |
| PAYMENT TYPES | Check | Checkbox | - | unchecked | yes | - |
| PAYMENT TYPES | Credit Card | Checkbox | - | unchecked | yes | - |
| PAYMENT TYPES | CareCredit | Checkbox | - | unchecked | yes | Written as one word. |
| PAYMENT TYPES | Direct Deposit | Checkbox | - | unchecked | yes | - |
| PAYMENT TYPES | Internal Financing | Checkbox | - | unchecked | yes | - |
| PAYMENT TYPES | None | Checkbox | - | unchecked | yes | Last checkbox in the payment-type row, literally labelled None. |
| CHECK TYPE | (unlabelled) | Radio | Both / Patient Checks / Insurance Checks | Both | **no (greyed)** | Left half of the panel, side by side with GROUP BATCH CHECKS. Whole group greyed out (Both shown selected in grey) in this default state. Greyed while the Check payment type is unticked - the link to Check is an inference, not shown. |
| GROUP BATCH CHECKS | GROUP BATCH CHECKS | Checkbox | - | unchecked | **no (greyed)** | Right half of the panel. The section header itself is a checkbox: a greyed-out box sits inside the grey header bar in front of the (also greyed) header text, so the label doubles as the section title. |
| GROUP BATCH CHECKS | (unlabelled) | Radio | Batch ID(Batch Insurance Payment) / Check# | Batch ID(Batch Insurance Payment) | **no (greyed)** | Row under the GROUP BATCH CHECKS header checkbox; whole group greyed out with Batch ID(Batch Insurance Payment) shown selected in grey. Text exactly as shown - no space before the parenthesis, and Check# with no space. |
| OTHER OPTIONS | (unlabelled) | Radio | Show Responsible Party / Show Patient / None | Show Responsible Party | yes | Full-width section; all three options on one row. |

### 1.6 Scheduled Production

Screenshots: 6.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 6.PNG only. Only four sections (PRINT FORMAT, OFFICE/GROUP \| PROVIDER, DATE RANGE); large empty area below DATE RANGE, nothing clipped. No greyed-out controls. No REPORT FORMAT, GROUP BY or OTHER OPTIONS.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section at the top of the panel. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of the panel, side by side with PROVIDER. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box under the Office / Office Group radios; blue SELECT button (building icon). |
| PROVIDER | Provider | Picker | - | ALL | yes | Right half of the panel. Read-only grey box; blue SELECT button (single-person icon). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. No date-basis radio on this report. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. |

### 1.7 Routing Slip

Screenshots: 7.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 7.PNG only. This is the only Daily report with NO PRINT FORMAT (PDF/Excel) section. Layout: OFFICE/GROUP \| PROVIDER, then DATE RANGE \| REPORT BY, then full-width OPERATORY, PATIENTS, OTHER OPTIONS, SORT BY. Only greyed item: the Office Group radio. A blank strip (about 23 px) is visible between the Print Blank Routing Slip row and the action bar, so nothing appears clipped.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of the panel, side by side with PROVIDER. The 'Office Group' radio and its label are greyed out (disabled) on this report - the only report in the category where that is so; only Office is selectable. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box under the Office / Office Group radios; blue SELECT button (building icon). |
| PROVIDER | Provider | Picker | - | ALL | yes | Right half of the panel. Read-only grey box; blue SELECT button (single-person icon). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Left half of the panel, side by side with REPORT BY. Field is narrower than on the full-width DATE RANGE sections; calendar icon inside the field. No date-basis radio. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. |
| REPORT BY | (unlabelled) | Radio | Next Scheduled Appointment / Next Scheduled Recall | Next Scheduled Appointment | yes | Right half of the panel, beside DATE RANGE; the two options are stacked vertically, one per line. |
| OPERATORY | Operatory | Picker | - | ALL | yes | Full-width section. Read-only grey box; blue SELECT button (single-person icon). |
| PATIENTS | Patient | Text | - | - | yes | Empty box with the lighter editable-field fill (same as the date fields, not the grey read-only picker fill); the blue SEARCH button to its right is the patient lookup. Whether the box accepts typing or is filled only through SEARCH cannot be told from the screenshot. Header is plural PATIENTS, row label singular Patient. |
| PATIENTS | SEARCH | Button | - | - | yes | Blue button with magnifier icon immediately right of the Patient box (patient search / lookup). |
| OTHER OPTIONS | (unlabelled) | Radio | Recommended / Active Treatment Plan / Codes | Recommended | yes | Three options stacked vertically at the left of the section, one per line. |
| OTHER OPTIONS | (unlabelled) | Other | - | - | yes | Info icon: small blue circle with a white 'i' directly after the 'Recommended' radio label (presumably a tooltip explaining Recommended); its tooltip text is not visible. |
| OTHER OPTIONS | Include Completed Procedures | Checkbox | - | unchecked | yes | Positioned to the right (about one third across the section), level with the 'Recommended' line. |
| SORT BY | (unlabelled) | Radio | Appointment Date / Provider (Last Name) – Appointment Date / Operatory – Appointment Date / Patient Last Name | Appointment Date | yes | All four options on one row. The separator in options 2 and 3 is a spaced dash that is wider than the hyphen used elsewhere (e.g. Include Z-Codes), so it is transcribed as an en dash; it could be a plain hyphen. |
| SORT BY | Print Blank Routing Slip | Checkbox | - | unchecked | yes | On its own row directly under the SORT BY radios (still inside the SORT BY section, no separate header). |

### 1.8 Progress Notes

Screenshots: 8.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 8.PNG only. Greyed in the default (Detail) state: the Appointment Date radio and both APPOINTMENTS TO INCLUDE radios. Header reads PROGRESS NOTES TO PRINT (the header font draws G like C, so the pixels look like PROCRESS). No REPORT FORMAT section. Blank space below OTHER OPTIONS, nothing clipped.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section at the top of the panel. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of the panel, side by side with PROVIDER. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box under the Office / Office Group radios; blue SELECT button (building icon). |
| PROVIDER | Preferred Provider | Picker | - | ALL | yes | Right half of the panel. Row label reads 'Preferred Provider' (not 'Provider') on this report although the header is PROVIDER. Read-only grey box; blue SELECT button (single-person icon). |
| PROGRESS NOTES TO PRINT | (unlabelled) | Radio | Detail / Unsigned / Missing | Detail | yes | Full-width section; all three options on one row. |
| DATE RANGE | (unlabelled) | Radio | DOS Date / Created On Date / Appointment Date | DOS Date | yes | Date-basis selector on the first row of the section. The 'Appointment Date' radio and its label are greyed out (disabled) in this default state (Detail selected above); DOS Date and Created On Date are enabled. That it belongs to the Missing choice is an inference, not shown. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. |
| APPOINTMENTS TO INCLUDE | (unlabelled) | Radio | Only with Missing Progress Notes / ALL | Only with Missing Progress Notes | **no (greyed)** | Whole group greyed out in this default state; 'Only with Missing Progress Notes' is shown selected in grey. Presumably becomes active for the Missing choice - inference, not shown. |
| OTHER OPTIONS | Page Break by Patient | Checkbox | - | unchecked | yes | - |

### 1.9 Production Analysis Report

Screenshots: 9.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 9.PNG only. Visible dependency: with ANALYSIS BY = Category the CATEGORY picker is active and the CARRIER picker's SELECT button is greyed. No REPORT FORMAT section; ANALYSIS BY occupies that top-left slot. Large empty area below CATEGORY / CARRIER, nothing clipped.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| ANALYSIS BY | (unlabelled) | Radio | Category / Carrier | Category | yes | Left half of the panel, side by side with PRINT FORMAT (the position where other reports show REPORT FORMAT). |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right half of the panel. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of the panel, side by side with PROVIDER. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box under the Office / Office Group radios; blue SELECT button (building icon). |
| PROVIDER | Provider | Picker | - | ALL | yes | Right half of the panel. Read-only grey box; blue SELECT button (single-person icon). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. No date-basis radio on this report. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. |
| CATEGORY | (unlabelled) | Picker | - | ALL | yes | Left half of the panel, side by side with CARRIER. Unlabelled read-only grey box; blue (active) SELECT button (single-person icon). Active while ANALYSIS BY = Category. |
| CARRIER | (unlabelled) | Picker | - | ALL | **no (greyed)** | Right half of the panel. Unlabelled read-only grey box showing ALL (box looks the same as the CATEGORY box); its SELECT button (single-person icon) is greyed out / disabled while ANALYSIS BY = Category. That it becomes active when Carrier is chosen is implied but not shown. |

### 1.10 Daily Audit

Screenshots: 10.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 10.PNG only. PATIENT HAS (radio) and BUT MISSING (checkboxes) together form the audit rule. On this report SORT BY comes before GROUP BY. Header reads BUT MISSING (rendered like MISSINC by the header font). Only Page Break is greyed. Blank space (about 57 px) below GROUP BY, nothing clipped.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section at the top of the panel. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of the panel, side by side with PROVIDER. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box under the Office / Office Group radios; blue SELECT button (building icon). |
| PROVIDER | Provider | Picker | - | ALL | yes | Right half of the panel. Read-only grey box; blue SELECT button (single-person icon). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. No date-basis radio on this report. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. |
| PATIENT HAS | (unlabelled) | Radio | ALL / Appointment / Transaction in Ledger / Progress Notes | ALL | yes | Full-width section; all four options on one row. |
| BUT MISSING | Appointment | Checkbox | - | checked | yes | All four BUT MISSING checkboxes sit on one row and all are ticked by default. |
| BUT MISSING | Transaction in Ledger | Checkbox | - | checked | yes | - |
| BUT MISSING | Progress Notes | Checkbox | - | checked | yes | - |
| BUT MISSING | Progress Notes with Signature | Checkbox | - | checked | yes | - |
| SORT BY | (unlabelled) | Radio | Date / Patient Lastname / Provider | Date | yes | 'Patient Lastname' is written with Lastname as one word. |
| GROUP BY | (unlabelled) | Radio | None / Provider | None | yes | Left half of the row. |
| GROUP BY | Page Break | Checkbox | - | unchecked | **no (greyed)** | Small greyed-out checkbox alone in the right half of the GROUP BY radio row; greyed while None is selected. |

### 1.11 Claims Printed

Screenshots: 11.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 11.PNG only. Large empty area below CARRIER, nothing clipped. No greyed-out controls.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT FORMAT | (unlabelled) | Radio | Detail / Summary | Detail | yes | Left half of the panel, side by side with PRINT FORMAT. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right half of the panel. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of the panel, side by side with PROVIDER. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box under the Office / Office Group radios; blue SELECT button (building icon). |
| PROVIDER | Provider | Picker | - | ALL | yes | Right half of the panel. Read-only grey box; blue SELECT button (single-person icon). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. No date-basis radio on this report. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. |
| CARRIER | Carriers | Picker | - | ALL | yes | Full-width section. Header is singular CARRIER, row label is plural 'Carriers'. Read-only grey box; blue SELECT button (single-person icon). |

### 1.12 Special Transaction Report

Screenshots: 12.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES - **Possibly truncated - more options may exist below the visible area**

> 12.PNG only. Layout pairs: OFFICE/GROUP \| PROVIDER/USER; DATE RANGE \| PATIENT NAME RANGE; EXCLUDE PATIENT TYPE \| PAYMENT/ADJ CODES; INSURANCE PLANS/SUB TYPES \| CODE/CATEGORY; then full-width OTHER OPTIONS. Truncation flag is precautionary: the criteria fill the fixed-height area completely and the last visible row (Group By) runs straight into the PRINT / PREVIEW bar with no bottom border and no blank strip (the row measures 26 px against 28-29 px for comparable rows), so the content is at or just over the visible height. No control is visibly cut and no scrollbar is drawn, but any further rows below Group By would be hidden. Greyed in the default state: the From / To age boxes and the amount value box. Headers DATE RANGE, PATIENT NAME RANGE and CODE/CATEGORY are transcribed with G (the header font draws G like C).

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section at the top of the panel. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of the panel, side by side with PROVIDER/USER. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box under the Office / Office Group radios; blue SELECT button (building icon). |
| PROVIDER/USER | Provider | Picker | - | ALL | yes | Right half of the panel, first row. Read-only grey box; blue SELECT button (single-person icon). |
| PROVIDER/USER | User | Picker | - | ALL | yes | Right half of the panel, second row. Read-only grey box; blue SELECT button (person-plus icon). |
| DATE RANGE | (unlabelled) | Radio | Transaction Date / Service Date | Transaction Date | yes | Left half of the panel, side by side with PATIENT NAME RANGE. Date-basis selector on the first row of the section. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Narrower field than on the full-width DATE RANGE sections; calendar icon inside the field. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field. |
| PATIENT NAME RANGE | Start Name | Text | - | AAAAA | yes | Right half of the panel. Editable-style (lighter) box pre-filled with AAAAA; blue SEARCH button to its right. |
| PATIENT NAME RANGE | SEARCH | Button | - | - | yes | Blue button with magnifier icon right of the Start Name box (patient lookup for the start of the name range). |
| PATIENT NAME RANGE | End Name | Text | - | ZZZZZ | yes | Editable-style (lighter) box pre-filled with ZZZZZ; blue SEARCH button to its right. |
| PATIENT NAME RANGE | SEARCH | Button | - | - | yes | Blue button with magnifier icon right of the End Name box (patient lookup for the end of the name range). |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | yes | Left half of the panel, side by side with PAYMENT/ADJ CODES. Unlabelled read-only grey box showing 'None' (mixed case); blue SELECT button (person-plus icon). No NONE button here. |
| PAYMENT/ADJ CODES | (unlabelled) | Picker | - | None | yes | Right half of the panel. Unlabelled read-only grey box showing 'None' (mixed case); blue SELECT button (building icon), followed by a NONE button. |
| PAYMENT/ADJ CODES | NONE | Button | - | - | yes | Blue button with circle-slash (ban) icon, right of the SELECT button; presumably resets the selection to None. |
| INSURANCE PLANS/SUB TYPES | (unlabelled) | Picker | - | ALL | yes | Left half of the panel, side by side with CODE/CATEGORY. Unlabelled read-only grey box; blue SELECT button (building icon). No NONE button here. |
| CODE/CATEGORY | (unlabelled) | Radio | Code / Category | Code | yes | Right half of the panel; first row of the section. |
| CODE/CATEGORY | (unlabelled) | Picker | - | ALL | yes | Row under the Code / Category radios. Unlabelled read-only grey box; blue SELECT button (building icon), followed by a NONE button. |
| CODE/CATEGORY | NONE | Button | - | - | yes | Blue button with circle-slash (ban) icon, right of the SELECT button; presumably sets the code/category selection to none. |
| OTHER OPTIONS | Age Range | Checkbox | - | unchecked | yes | First cell of the first OTHER OPTIONS row; followed on the same row by the From and To boxes. |
| OTHER OPTIONS | From | Number | - | 0 | **no (greyed)** | Right-aligned value in a box with the grey read-only/disabled fill (same grey as the picker boxes) while Age Range is unticked; presumably editable once Age Range is ticked - inference. |
| OTHER OPTIONS | To | Number | - | 999 | **no (greyed)** | Right-aligned value in a box with the grey read-only/disabled fill while Age Range is unticked. |
| OTHER OPTIONS | Amount | Dropdown | - | All Amount | yes | list collapsed - other values not visible. Right half of the same row as Age Range / From / To; light editable fill with a down chevron. |
| OTHER OPTIONS | (unlabelled) | Number | - | 0 | **no (greyed)** | Unlabelled numeric box immediately right of the Amount dropdown; right-aligned 0 with the grey read-only/disabled fill while the dropdown shows 'All Amount' (presumably the comparison amount for the other dropdown choices - inference). |
| OTHER OPTIONS | Group By | Radio | Code / Username / Insurance Plan / Transaction Provider | Code | yes | Second row of OTHER OPTIONS; 'Group By' is a row label here, not a grey section header. This is the last visible row, flush against the action bar. |

## 2. Monthly Reports

- Source: `montly_reports` (9 reports transcribed) - window title: "Monthly Reports"
- Reports listed in the legacy screen: Executive Summary, Executive Day Sheet, Aging Report by Home Office, Aging Report, Income Allocation, Allocation Detail, Unallocated Payment/Adjustments, Daily Journal Summary by Allocation, WaterFall Report
- Notes: Screenshot-to-report mapping: 1.PNG = Executive Summary, 2.PNG = Executive Day Sheet, 3.PNG = Aging Report by Home Office, 4.PNG = Aging Report, 5.PNG = Income Allocation, 6.PNG = Allocation Detail, 7.PNG = Unallocated Payment/Adjustments, 8.PNG = Daily Journal Summary by Allocation, 9.PNG = WaterFall Report. Every report in the list has exactly one screenshot; none shows a popup, an expanded dropdown or a scrolled second view, so the contents of the Office, Office Group, Provider and Exclude Resp. Party Type SELECT dialogs and of the SEARCH lookups are not visible in this category. (The folder key is spelled 'montly'.) Title bar: 'Monthly Reports' at the left; 'PGID :2829 / OID :108' followed by a printer icon at the far right. Panel headers: 'SELECT REPORT' (left) and 'REPORT CRITERIA' (right). A splitter / collapse handle (three vertical dots) sits on the border between the two panels. SELECT REPORT is a single column of 9 radio items (no second column) with a large empty area below the last one, so the list is not clipped or scrollable; the list text is pixel-identical in all 9 screenshots. Global actions are the same on every report: CLEAR CRITERIA (slate-grey button with a refresh icon at the right end of the REPORT CRITERIA header bar), PRINT / PREVIEW (blue, printer icon) and ADD TO MY FAVORITES (blue, plus icon) in a footer bar at the bottom right of the criteria panel. Captured at 75% browser zoom. Footer, visible only in 5.PNG: '© 2026 Planet DDS \| Privacy Policy \| Page Time Left (hh:mm:ss) 1:58:18' ('Privacy Policy' is a blue link), a red italic notice 'Your browser zoom is set to 75%. This screen is best viewed, if zoom is set to 100%.' and a browser status-bar URL 'https://a1.denticon.com/ASCX/#'. 6.PNG and 9.PNG include a 1-3 px blue strip above the title bar (capture offset only). Header glyph caveat: at this capture size the section-header typeface renders capital G almost like C, so the pixels look like 'OFFICE/CROUP', 'DATE RANCE', 'CROUP BY', 'ACINC BY', 'ACINC' and 'RESPONSIBLE PARTY NAME RANCE'. They are transcribed as OFFICE/GROUP, DATE RANGE, GROUP BY, AGING BY, AGING and RESPONSIBLE PARTY NAME RANGE: each of these glyphs carries a one-pixel spur at the lower right that the true C's (in OFFICE, CREDIT, BALANCES) do not have, and the same letter is an unambiguous G in 'GROUP BY PROVIDER', 'Office Group' and 'Aging Report'. Defaults: every date field shows 11/21/2026 (the capture date), the unlabelled office box shows 108 (= OID in the title bar), Provider shows ALL, Exclude Resp. Party Type shows None. Read-only picker boxes (108, ALL, None) have a darker grey fill than editable inputs (dates, Start Name / End Name, Account Balance Over). Disabled controls (confirmed by colour sampling on all nine screenshots): 'Page Break' on Executive Summary; the 'Preferred Provider / Transaction Provider' radios and the Provider SELECT button on both aging reports. Nothing else is greyed out. Recurring patterns: OFFICE/GROUP (Office / Office Group radios plus the unlabelled 108 box with SELECT) appears on all 9 reports; PRINT FORMAT (PDF / Excel, default PDF) only on Executive Day Sheet, both aging reports, Daily Journal Summary by Allocation and WaterFall Report; REPORT FORMAT (Detail / Summary, default Detail) only on both aging reports, Income Allocation and Daily Journal Summary by Allocation; a Provider picker (default ALL) on Executive Summary, Income Allocation, Allocation Detail and both aging reports; seven reports use DATE RANGE with Start Date and End Date, while the two aging reports use a single Report Date. Only real uncertainty: 'Aging Report by Home Office' (3.PNG) and 'Aging Report' (4.PNG) have pixel-identical criteria panels whose last section, SORT BY, is cut off by the action bar with no scrollbar drawn - only the top 2 pixel rows of its two radio labels show. They are given as best readings with [?] ('Resp. Party Last name', 'Resp. Party ID'; see the control notes for the pixel evidence) and both reports are flagged possibly_truncated because further SORT BY rows or sections may exist below the cut.

### 2.1 Executive Summary

Screenshots: 1.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Single screenshot (1.PNG). OFFICE/GROUP (left) and PROVIDER (right) are side by side; DATE RANGE, OTHER OPTIONS and GROUP BY are full width. No PRINT FORMAT or REPORT FORMAT section on this report. Blank panel space follows GROUP BY above the action bar, so nothing is cut off.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column, side by side with PROVIDER. Two radios on one row, no row label; Office carries the blue dot. The Office Group state was not captured. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | No visible label: read-only grey box (darker fill than editable inputs) on the row below the Office / Office Group radios, followed by a blue SELECT button (building icon). 108 equals the OID shown in the title bar. Picker popup not shown. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column, side by side with OFFICE/GROUP. Read-only grey box followed by a blue (enabled) SELECT button (person icon). Picker popup not shown. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | MM/DD/YYYY; editable box with a calendar icon at its right end. Shows the capture date. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | MM/DD/YYYY; editable box with a calendar icon at its right end. Shows the capture date. |
| OTHER OPTIONS | Show AR | Checkbox | - | unchecked | yes | Only control in this section. Enabled (dark border, white box, black label), unchecked. |
| GROUP BY | (unlabelled) | Radio | None / Provider | None | yes | Left half of the GROUP BY row. Two radios on one row, no row label. |
| GROUP BY | Page Break | Checkbox | - | unchecked | **no (greyed)** | Right half of the same GROUP BY row. Greyed out / disabled (grey box, grey label) while None is selected; presumably becomes available when Provider is chosen (inference - not shown). |

### 2.2 Executive Day Sheet

Screenshots: 2.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Single screenshot (2.PNG). Only three sections, all full width; no PROVIDER, REPORT FORMAT or OTHER OPTIONS section. Blank space below DATE RANGE, nothing cut off.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section. Two radios on one row, no row label. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section (no PROVIDER section beside it). Two radios on one row, no row label; Office carries the blue dot. The Office Group state was not captured. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | No visible label: read-only grey box (darker fill than editable inputs) on the row below the Office / Office Group radios, followed by a blue SELECT button (building icon). 108 equals the OID shown in the title bar. Picker popup not shown. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | MM/DD/YYYY; editable box with a calendar icon at its right end. Shows the capture date. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | MM/DD/YYYY; editable box with a calendar icon at its right end. Shows the capture date. |

### 2.3 Aging Report by Home Office

Screenshots: 3.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES - **Possibly truncated - more options may exist below the visible area**

> Single screenshot (3.PNG). Two-column layout, row by row: REPORT FORMAT \| PRINT FORMAT, OFFICE/GROUP \| PROVIDER, REPORT DATE \| PATIENT TYPE, RESPONSIBLE PARTY NAME RANGE \| EXCLUDE RESP. PARTY TYPE, AGING BY \| AGING, then full-width OTHER OPTIONS and SORT BY. TRUNCATED at the bottom: the SORT BY header is fully visible but its option row is cut by the PRINT / PREVIEW / ADD TO MY FAVORITES bar after 10 pixel rows, so the two sort labels are best readings and anything below (more SORT BY rows or further sections) is not visible. No scrollbar is drawn on the panel. The criteria panel is pixel-identical to the Aging Report panel in 4.PNG (verified by image difference: 0 differing pixels); the two screenshots differ only in which radio is selected in the left list.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT FORMAT | (unlabelled) | Radio | Detail / Summary | Detail | yes | Left column, side by side with PRINT FORMAT. Two radios on one row, no row label. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right column, side by side with REPORT FORMAT. Two radios on one row, no row label. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column, side by side with PROVIDER. Two radios on one row, no row label; Office carries the blue dot. The Office Group state was not captured. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | No visible label: read-only grey box (darker fill than editable inputs) on the row below the Office / Office Group radios, followed by a blue SELECT button (building icon). 108 equals the OID shown in the title bar. Picker popup not shown. |
| PROVIDER | GROUP BY PROVIDER | Checkbox | - | unchecked | yes | Sits inside the PROVIDER section-header bar, to the right of the section title (upper-case label). Right column. Enabled, unchecked. |
| PROVIDER | (unlabelled) | Radio | Preferred Provider / Transaction Provider | Preferred Provider | **no (greyed)** | First row under the header, no row label. Both radios and their labels are greyed out (disabled); Preferred Provider carries the grey selected dot. State shown is with GROUP BY PROVIDER unchecked; presumably enabled by ticking it (inference - not shown). |
| PROVIDER | Provider | Picker | - | ALL | **no (greyed)** | Second row. Read-only grey box showing ALL with a SELECT button (person icon) that is greyed out / disabled. The 'Provider' label (black) and the box look the same as on enabled pickers; only the button is visibly disabled. State shown is with GROUP BY PROVIDER unchecked; presumably enabled together with the radios above (inference - not shown). |
| REPORT DATE | Report Date | Date | - | 11/21/2026 | yes | Single date (no start/end range). MM/DD/YYYY; editable box with a calendar icon at its right end. Left column, side by side with PATIENT TYPE. Shows the capture date. |
| PATIENT TYPE | (unlabelled) | Radio | Both / General / Ortho | Both | yes | Right column. Three radios on one row, no row label. |
| RESPONSIBLE PARTY NAME RANGE | Start Name | Text | - | AAAAA | yes | Editable text box (light fill, same as the date fields - not a read-only picker box) followed by a blue SEARCH button. Left column, side by side with EXCLUDE RESP. PARTY TYPE. |
| RESPONSIBLE PARTY NAME RANGE | SEARCH | Button | - | - | yes | Blue button with magnifier icon immediately right of the Start Name box (lookup for the start name). Popup not shown. |
| RESPONSIBLE PARTY NAME RANGE | End Name | Text | - | ZZZZZ | yes | Editable text box (light fill) followed by a blue SEARCH button. |
| RESPONSIBLE PARTY NAME RANGE | SEARCH | Button | - | - | yes | Blue button with magnifier icon immediately right of the End Name box (lookup for the end name). Popup not shown. |
| EXCLUDE RESP. PARTY TYPE | (unlabelled) | Picker | - | None | yes | No row label (the section title acts as the label). Read-only grey box showing None, followed by a blue SELECT button (person-with-plus icon). Right column. Picker popup not shown. |
| AGING BY | (unlabelled) | Radio | Account AR / Patient AR | Account AR | yes | Left column, side by side with AGING. Two radios on one row, no row label. |
| AGING BY | Account Balance Over | Number | - | 0.00 | yes | Second row of AGING BY. Editable box (light fill) with the value right-aligned; no currency symbol or spinner visible. |
| AGING | SHOW ONLY CREDIT BALANCES | Checkbox | - | unchecked | yes | Sits inside the AGING section-header bar, to the right of the section title (upper-case label). Right column. Enabled, unchecked. |
| AGING | Current | Checkbox | - | checked | yes | First of five aging-bucket checkboxes on one row. |
| AGING | Over 30 | Checkbox | - | checked | yes | Same row as Current. |
| AGING | Over 60 | Checkbox | - | checked | yes | Same row as Current. |
| AGING | Over 90 | Checkbox | - | checked | yes | Same row as Current. |
| AGING | Over 120 | Checkbox | - | checked | yes | Same row as Current (last). |
| AGING | Include Credit Balance | Checkbox | - | unchecked | yes | Own row below the aging buckets. Singular 'Balance'. |
| OTHER OPTIONS | Exclude patients sent to collection. | Checkbox | - | unchecked | yes | Full-width section with one header and two columns of checkboxes. Left column, row 1. Label ends with a period. |
| OTHER OPTIONS | Exclude accounts where patient portion is paid & insurance portion is expected. | Checkbox | - | unchecked | yes | Left column, row 2. Label ends with a period. |
| OTHER OPTIONS | Include Balance Status | Checkbox | - | unchecked | yes | Right column, row 1. |
| OTHER OPTIONS | Include Contract Balances | Checkbox | - | unchecked | yes | Right column, row 2. |
| SORT BY | (unlabelled) | Radio | Resp. Party Last name [?] / Resp. Party ID [?] | Resp. Party Last name [?] | yes | CLIPPED ROW - best reading only. The bottom action bar (PRINT / PREVIEW, ADD TO MY FAVORITES) covers this row after its first 10 pixel rows, so only the upper arcs of two radio circles and the top 2 pixel rows of their labels are visible. First radio is the selected one (blue dot), second is unselected; no third radio and no right-column control exist anywhere else on the visible strip (whole row scanned). Visible glyph tops (capitals / ascenders only): option 1 = 'R... P..t. L..t' followed by about 27 px of label width in which nothing reaches capital height; option 2 = 'R... P..t. ID'. Evidence used for the reading: (a) the R-to-P-to-t tops and spacing are pixel-identical to the fully visible checkbox 'Include Resp. Party Type' in daily_reports/2.PNG, so the prefix is 'Resp. Party' with a space after the period; (b) the 'L..t' tops are pixel-identical to 'Last' in the fully visible radio 'Patient Lastname' of daily_reports/10.PNG; (c) no capital-letter top follows 'Last', which rules out 'Last Name'; (d) the second radio starts 53 px right of the L stem here but only 51 px after it in 'Patient Lastname' (same sub-pixel phase; the label-to-radio gap is a constant 9-10 px on every fully visible radio row), i.e. the hidden tail is about 2 px - one space at this font size - wider than 'name': hence 'Last name' (two words, lower-case n) rather than 'Lastname'. The lower-case letters themselves are hidden, so both labels keep [?]; text without ascenders after 'ID' could also be hidden. The Statements screen (statements_reports/1.PNG) offers the analogous pair 'Sort by Resp.Party Lastname' / 'Sort by Resp.Party ID'. Further SORT BY rows or sections may exist below the cut. |

### 2.4 Aging Report

Screenshots: 4.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES - **Possibly truncated - more options may exist below the visible area**

> Single screenshot (4.PNG). Two-column layout, row by row: REPORT FORMAT \| PRINT FORMAT, OFFICE/GROUP \| PROVIDER, REPORT DATE \| PATIENT TYPE, RESPONSIBLE PARTY NAME RANGE \| EXCLUDE RESP. PARTY TYPE, AGING BY \| AGING, then full-width OTHER OPTIONS and SORT BY. TRUNCATED at the bottom: the SORT BY header is fully visible but its option row is cut by the PRINT / PREVIEW / ADD TO MY FAVORITES bar after 10 pixel rows, so the two sort labels are best readings and anything below (more SORT BY rows or further sections) is not visible. No scrollbar is drawn on the panel. The criteria panel is pixel-identical to the Aging Report by Home Office panel in 3.PNG (verified by image difference: 0 differing pixels): same sections, controls, defaults and disabled states.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT FORMAT | (unlabelled) | Radio | Detail / Summary | Detail | yes | Left column, side by side with PRINT FORMAT. Two radios on one row, no row label. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right column, side by side with REPORT FORMAT. Two radios on one row, no row label. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column, side by side with PROVIDER. Two radios on one row, no row label; Office carries the blue dot. The Office Group state was not captured. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | No visible label: read-only grey box (darker fill than editable inputs) on the row below the Office / Office Group radios, followed by a blue SELECT button (building icon). 108 equals the OID shown in the title bar. Picker popup not shown. |
| PROVIDER | GROUP BY PROVIDER | Checkbox | - | unchecked | yes | Sits inside the PROVIDER section-header bar, to the right of the section title (upper-case label). Right column. Enabled, unchecked. |
| PROVIDER | (unlabelled) | Radio | Preferred Provider / Transaction Provider | Preferred Provider | **no (greyed)** | First row under the header, no row label. Both radios and their labels are greyed out (disabled); Preferred Provider carries the grey selected dot. State shown is with GROUP BY PROVIDER unchecked; presumably enabled by ticking it (inference - not shown). |
| PROVIDER | Provider | Picker | - | ALL | **no (greyed)** | Second row. Read-only grey box showing ALL with a SELECT button (person icon) that is greyed out / disabled. The 'Provider' label (black) and the box look the same as on enabled pickers; only the button is visibly disabled. State shown is with GROUP BY PROVIDER unchecked; presumably enabled together with the radios above (inference - not shown). |
| REPORT DATE | Report Date | Date | - | 11/21/2026 | yes | Single date (no start/end range). MM/DD/YYYY; editable box with a calendar icon at its right end. Left column, side by side with PATIENT TYPE. Shows the capture date. |
| PATIENT TYPE | (unlabelled) | Radio | Both / General / Ortho | Both | yes | Right column. Three radios on one row, no row label. |
| RESPONSIBLE PARTY NAME RANGE | Start Name | Text | - | AAAAA | yes | Editable text box (light fill, same as the date fields - not a read-only picker box) followed by a blue SEARCH button. Left column, side by side with EXCLUDE RESP. PARTY TYPE. |
| RESPONSIBLE PARTY NAME RANGE | SEARCH | Button | - | - | yes | Blue button with magnifier icon immediately right of the Start Name box (lookup for the start name). Popup not shown. |
| RESPONSIBLE PARTY NAME RANGE | End Name | Text | - | ZZZZZ | yes | Editable text box (light fill) followed by a blue SEARCH button. |
| RESPONSIBLE PARTY NAME RANGE | SEARCH | Button | - | - | yes | Blue button with magnifier icon immediately right of the End Name box (lookup for the end name). Popup not shown. |
| EXCLUDE RESP. PARTY TYPE | (unlabelled) | Picker | - | None | yes | No row label (the section title acts as the label). Read-only grey box showing None, followed by a blue SELECT button (person-with-plus icon). Right column. Picker popup not shown. |
| AGING BY | (unlabelled) | Radio | Account AR / Patient AR | Account AR | yes | Left column, side by side with AGING. Two radios on one row, no row label. |
| AGING BY | Account Balance Over | Number | - | 0.00 | yes | Second row of AGING BY. Editable box (light fill) with the value right-aligned; no currency symbol or spinner visible. |
| AGING | SHOW ONLY CREDIT BALANCES | Checkbox | - | unchecked | yes | Sits inside the AGING section-header bar, to the right of the section title (upper-case label). Right column. Enabled, unchecked. |
| AGING | Current | Checkbox | - | checked | yes | First of five aging-bucket checkboxes on one row. |
| AGING | Over 30 | Checkbox | - | checked | yes | Same row as Current. |
| AGING | Over 60 | Checkbox | - | checked | yes | Same row as Current. |
| AGING | Over 90 | Checkbox | - | checked | yes | Same row as Current. |
| AGING | Over 120 | Checkbox | - | checked | yes | Same row as Current (last). |
| AGING | Include Credit Balance | Checkbox | - | unchecked | yes | Own row below the aging buckets. Singular 'Balance'. |
| OTHER OPTIONS | Exclude patients sent to collection. | Checkbox | - | unchecked | yes | Full-width section with one header and two columns of checkboxes. Left column, row 1. Label ends with a period. |
| OTHER OPTIONS | Exclude accounts where patient portion is paid & insurance portion is expected. | Checkbox | - | unchecked | yes | Left column, row 2. Label ends with a period. |
| OTHER OPTIONS | Include Balance Status | Checkbox | - | unchecked | yes | Right column, row 1. |
| OTHER OPTIONS | Include Contract Balances | Checkbox | - | unchecked | yes | Right column, row 2. |
| SORT BY | (unlabelled) | Radio | Resp. Party Last name [?] / Resp. Party ID [?] | Resp. Party Last name [?] | yes | CLIPPED ROW - best reading only. The bottom action bar (PRINT / PREVIEW, ADD TO MY FAVORITES) covers this row after its first 10 pixel rows, so only the upper arcs of two radio circles and the top 2 pixel rows of their labels are visible. First radio is the selected one (blue dot), second is unselected; no third radio and no right-column control exist anywhere else on the visible strip (whole row scanned). Visible glyph tops (capitals / ascenders only): option 1 = 'R... P..t. L..t' followed by about 27 px of label width in which nothing reaches capital height; option 2 = 'R... P..t. ID'. Evidence used for the reading: (a) the R-to-P-to-t tops and spacing are pixel-identical to the fully visible checkbox 'Include Resp. Party Type' in daily_reports/2.PNG, so the prefix is 'Resp. Party' with a space after the period; (b) the 'L..t' tops are pixel-identical to 'Last' in the fully visible radio 'Patient Lastname' of daily_reports/10.PNG; (c) no capital-letter top follows 'Last', which rules out 'Last Name'; (d) the second radio starts 53 px right of the L stem here but only 51 px after it in 'Patient Lastname' (same sub-pixel phase; the label-to-radio gap is a constant 9-10 px on every fully visible radio row), i.e. the hidden tail is about 2 px - one space at this font size - wider than 'name': hence 'Last name' (two words, lower-case n) rather than 'Lastname'. The lower-case letters themselves are hidden, so both labels keep [?]; text without ascenders after 'ID' could also be hidden. The Statements screen (statements_reports/1.PNG) offers the analogous pair 'Sort by Resp.Party Lastname' / 'Sort by Resp.Party ID'. Further SORT BY rows or sections may exist below the cut. |

### 2.5 Income Allocation

Screenshots: 5.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Single screenshot (5.PNG). REPORT FORMAT full width; OFFICE/GROUP (left) and PROVIDER (right) side by side; DATE RANGE full width. No PRINT FORMAT and no OTHER OPTIONS section. Blank space below DATE RANGE, nothing cut off. This is the only screenshot that also shows the page footer below the panels (see observations).

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT FORMAT | (unlabelled) | Radio | Detail / Summary | Detail | yes | Full-width section (no PRINT FORMAT section beside it on this report). Two radios on one row, no row label. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column, side by side with PROVIDER. Two radios on one row, no row label; Office carries the blue dot. The Office Group state was not captured. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | No visible label: read-only grey box (darker fill than editable inputs) on the row below the Office / Office Group radios, followed by a blue SELECT button (building icon). 108 equals the OID shown in the title bar. Picker popup not shown. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column, side by side with OFFICE/GROUP. Read-only grey box followed by a blue (enabled) SELECT button (person icon). Picker popup not shown. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | MM/DD/YYYY; editable box with a calendar icon at its right end. Shows the capture date. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | MM/DD/YYYY; editable box with a calendar icon at its right end. Shows the capture date. |

### 2.6 Allocation Detail

Screenshots: 6.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Single screenshot (6.PNG). OFFICE/GROUP (left) and PROVIDER (right) side by side; DATE RANGE, PAYMENT TYPES and OTHER OPTIONS full width. No PRINT FORMAT or REPORT FORMAT section. Blank space below OTHER OPTIONS, nothing cut off.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column, side by side with PROVIDER. Two radios on one row, no row label; Office carries the blue dot. The Office Group state was not captured. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | No visible label: read-only grey box (darker fill than editable inputs) on the row below the Office / Office Group radios, followed by a blue SELECT button (building icon). 108 equals the OID shown in the title bar. Picker popup not shown. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column, side by side with OFFICE/GROUP. Read-only grey box followed by a blue (enabled) SELECT button (person icon). Picker popup not shown. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | MM/DD/YYYY; editable box with a calendar icon at its right end. Shows the capture date. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | MM/DD/YYYY; editable box with a calendar icon at its right end. Shows the capture date. |
| PAYMENT TYPES | Cash | Checkbox | - | checked | yes | Six checkboxes on a single row; this is the first. |
| PAYMENT TYPES | Check | Checkbox | - | checked | yes | Same row. |
| PAYMENT TYPES | Credit Card | Checkbox | - | checked | yes | Same row. |
| PAYMENT TYPES | CareCredit | Checkbox | - | checked | yes | Same row. Written as one word with a capital C in the middle. |
| PAYMENT TYPES | Direct Deposit | Checkbox | - | checked | yes | Same row. |
| PAYMENT TYPES | Internal Financing | Checkbox | - | checked | yes | Same row, last. |
| OTHER OPTIONS | Show Datewise Summary | Checkbox | - | checked | yes | Only control in this section; checked by default. |

### 2.7 Unallocated Payment/Adjustments

Screenshots: 7.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Single screenshot (7.PNG). All sections full width (single column). No PROVIDER, PRINT FORMAT or REPORT FORMAT section. Blank space below OTHER OPTIONS, nothing cut off.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section (no PROVIDER section beside it). Two radios on one row, no row label; Office carries the blue dot. The Office Group state was not captured. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | No visible label: read-only grey box (darker fill than editable inputs) on the row below the Office / Office Group radios, followed by a blue SELECT button (building icon). 108 equals the OID shown in the title bar. Picker popup not shown. |
| DATE RANGE | Print all unallocated payment/adjustments as of today | Checkbox | - | unchecked | yes | First row of the DATE RANGE section, above the Start Date / End Date rows. Presumably overrides the date range when ticked (inference - the date fields are shown enabled while it is unticked). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | MM/DD/YYYY; editable box with a calendar icon at its right end. Shows the capture date. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | MM/DD/YYYY; editable box with a calendar icon at its right end. Shows the capture date. |
| OTHER OPTIONS | Exclude Credit Balances | Checkbox | - | unchecked | yes | Row 1. |
| OTHER OPTIONS | Include Inactive Patients | Checkbox | - | unchecked | yes | Row 2. |

### 2.8 Daily Journal Summary by Allocation

Screenshots: 8.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Single screenshot (8.PNG). REPORT FORMAT (left) and PRINT FORMAT (right) side by side; OFFICE/GROUP and DATE RANGE full width. No PROVIDER and no OTHER OPTIONS section. Blank space below DATE RANGE, nothing cut off.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT FORMAT | (unlabelled) | Radio | Detail / Summary | Detail | yes | Left column, side by side with PRINT FORMAT. Two radios on one row, no row label. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right column, side by side with REPORT FORMAT. Two radios on one row, no row label. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section (no PROVIDER section beside it). Two radios on one row, no row label; Office carries the blue dot. The Office Group state was not captured. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | No visible label: read-only grey box (darker fill than editable inputs) on the row below the Office / Office Group radios, followed by a blue SELECT button (building icon). 108 equals the OID shown in the title bar. Picker popup not shown. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | MM/DD/YYYY; editable box with a calendar icon at its right end. Shows the capture date. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | MM/DD/YYYY; editable box with a calendar icon at its right end. Shows the capture date. |

### 2.9 WaterFall Report

Screenshots: 9.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Single screenshot (9.PNG). All sections full width (single column). No PROVIDER or REPORT FORMAT section. The report name is spelled 'WaterFall Report' (capital F) in the list. Blank space below OTHER OPTIONS, nothing cut off.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section. Two radios on one row, no row label. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section (no PROVIDER section beside it). Two radios on one row, no row label; Office carries the blue dot. The Office Group state was not captured. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | No visible label: read-only grey box (darker fill than editable inputs) on the row below the Office / Office Group radios, followed by a blue SELECT button (building icon). 108 equals the OID shown in the title bar. Picker popup not shown. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | MM/DD/YYYY; editable box with a calendar icon at its right end. Shows the capture date. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | MM/DD/YYYY; editable box with a calendar icon at its right end. Shows the capture date. |
| OTHER OPTIONS | (unlabelled) | Radio | Payments and Adjustments / Payments only / Adjustments only | Payments and Adjustments | yes | Three radios on one row, no row label; on this report OTHER OPTIONS holds a radio group, not checkboxes. |

## 3. Ledger Reports

- Source: `ledger_reports` (4 reports transcribed) - window title: "Ledger Reports"
- Reports listed in the legacy screen: Ledger Report, Super Bill, Walkout Report, Account Allocation
- Notes: Third-reader verified inventory. All 4 original screenshots, all pre-rendered zooms and additional tight crops were read. Readers A and B agreed on every report, section, control, option, default value and enabled state (their differences were wording only); each point was nevertheless re-checked on the pixels. A pixel scan of every screenshot (every pixel that differs from its row background in the criteria panel, the left panel, the title bar and the panel edges) found nothing beyond the controls listed here: no tiny right-edge checkbox (no 'Page Break'), no second column, no extra greyed-out control, no instruction or legend text, no scrollbar on either panel, no footer text. COVERAGE: 4 screenshots = 4 reports, each selected exactly once (blue radio dot located by pixel count): 1.PNG = Ledger Report, 2.PNG = Walkout Report, 3.PNG = Super Bill, 4.PNG = Account Allocation. All four are the normal two-panel screen - no popup, no expanded dropdown, no scrolled second view, no foreign screen - so the dialogs behind the SEARCH (responsible party / patient lookup) and SELECT (office) buttons are NOT documented by this category. TITLE BAR (identical in all 4): 'Ledger Reports' at the left; 'PGID :2829 / OID :108' followed by a white printer icon (icon only, no text) at the far right. LEFT PANEL 'SELECT REPORT': a 2 x 2 grid of radio cells - left column Ledger Report, Super Bill; right column Walkout Report, Account Allocation; the rest of the panel is uniform empty navy down to the window edge, so the list is NOT scrollable or clipped. A splitter / collapse grip (three dots in a notch) sits between the two panels at mid height. RIGHT PANEL 'REPORT CRITERIA': the grey-styled CLEAR CRITERIA button (refresh icon) sits at the right end of the blue header bar (same grey styling as in other categories, i.e. not a disabled state); the action bar at the bottom of the panel holds the blue PRINT / PREVIEW (printer icon) and ADD TO MY FAVORITES (plus icon) buttons, right-aligned. NO TRUNCATION: in every screenshot the first section header is fully visible under the panel border and the last criteria row is followed by 149 to 250 px of uniform blank space down to the action bar. LAYOUT: every section is full width (this category has no side-by-side section columns); rows are a label cell on the left and a value cell on the right, except the unlabelled radio and checkbox rows. RECURRING PATTERN (pixel-identical in all 4 screenshots): (1) OFFICE/GROUP = radios Office (selected) / Office Group (GREYED OUT), then an unlabelled read-only box '108' with a GREYED-OUT SELECT button: the office is locked to the current office (OID 108) and cannot be changed or widened to an office group. For comparison, daily_reports/1.PNG shows the same Office Group radio enabled and the same SELECT button blue, so the lock is specific to this category (or to the context it was opened from - not determinable from the screenshots). (2) DATE RANGE = Start Date / End Date, both '11/21/2026' = the capture day, i.e. both appear to default to today. PERSON FILTER differs per report: Ledger Report and Account Allocation take ONE 'Responsible Party' (box + SEARCH, value '[responsible party open at capture]'); Walkout Report takes a RESPONSIBLE PARTY NAME RANGE (Start Name / End Name, each with its own SEARCH, both '[name of the patient open at capture]'); Super Bill takes a PATIENT NAME RANGE (Start Name / End Name, each with its own SEARCH, both '[name of the patient open at capture]'). These values look pre-populated from the patient / account that was open when the screen was launched (inference) - context data, not generic defaults. TYPING CONVENTION: the name boxes have the light editable-field fill (#f1f1f1, same as the date boxes) and not the grey read-only fill of the office box (#dcdfe2), so they are recorded as text_input with each SEARCH button as a separate button control (same convention as the name-range fields in daily_reports.json); A and B had typed them as picker. Supporting evidence: daily_reports/12.PNG (Special Transaction Report, PATIENT NAME RANGE) shows the same kind of boxes holding the free-text bounds AAAAA / ZZZZZ, which indicates that name-range boxes take typed alphabetical bounds and that '[name of the patient open at capture]' here is a context pre-fill rather than the generic default. The office box + SELECT is recorded as picker with the button described in notes. REPORT-SPECIFIC OPTIONS: Ledger Report = REPORT FORMAT (Account Ledger / Patient Ledger) + OTHER OPTIONS 'Print all transactions (includes statements, ledger notes)'; Walkout Report = OTHER OPTIONS 'Show charges break down' + 'Include UCR'; Super Bill = TRANSACTION TYPES Services / Payments / Adjustment (all checked); Account Allocation = no extra options. ABSENT in this category: PRINT FORMAT (PDF / Excel), PROVIDER / USER pickers, PATIENT TYPE, GROUP BY, SORT BY, dropdowns, listboxes, Page Break checkboxes. RENDERING CAVEAT: in the bold section-header font the capital G shows almost no crossbar at this resolution, so the headers look like 'OFFICE/CROUP', 'DATE RANCE', '... NAME RANCE'; the pixel dump shows the G spur and they are transcribed as OFFICE/GROUP, DATE RANGE, RESPONSIBLE PARTY NAME RANGE, PATIENT NAME RANGE. Screenshot sizes: 1366x590, 1366x591, 1365x589, 1366x589 px (2.PNG has a 1 px blue sliver of the host page above the title bar; 3.PNG is shifted 1 px left). No reading needed a '[?]' marker.

### 3.1 Ledger Report

Screenshots: 1.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 1.PNG only. The whole criteria panel is visible: 5 full-width sections (REPORT FORMAT, OFFICE/GROUP, DATE RANGE, RESPONSIBLE PARTY, OTHER OPTIONS), then about 150 px of uniform blank space down to the action bar - nothing clipped at the top or bottom, no scrollbar. Only report of the category with a REPORT FORMAT section; captured state = Account Ledger. Filters on ONE responsible party (single box + SEARCH). No PRINT FORMAT, PROVIDER, GROUP BY or SORT BY section, no dropdowns, no side-by-side columns, no Page Break or other right-edge control (a pixel scan of the panel found nothing besides the controls listed). CLEAR CRITERIA = grey-styled button with a refresh icon at the right end of the blue REPORT CRITERIA bar; PRINT / PREVIEW (printer icon) and ADD TO MY FAVORITES (plus icon) = blue buttons at the bottom right.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT FORMAT | (unlabelled) | Radio | Account Ledger / Patient Ledger | Account Ledger | yes | First section of the panel, full width. Two radios side by side on one row, no row label. Both options are enabled (black labels, white radio for Patient Ledger); Account Ledger carries the blue dot. Only this state was captured: whether choosing Patient Ledger changes the sections below (for example the RESPONSIBLE PARTY section) is not shown in any screenshot. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section. Two radios side by side on one row, no row label. 'Office' is selected and active (blue ring and dot, black label). The 'Office Group' option is GREYED OUT / disabled (grey-filled radio, grey label), so the selection cannot be changed on this screen. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | **no (greyed)** | Unlabelled read-only box on the row directly below the Office / Office Group radios; shows the office id 108 (same number as 'OID :108' in the title bar). Standard grey read-only picker fill. Button to its right: 'SELECT' with a small building icon, GREYED OUT / disabled (grey fill instead of the usual blue) - the office cannot be changed here. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Value equals End Date and equals the capture day (default appears to be today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Pixel-identical to the Start Date box. |
| RESPONSIBLE PARTY | Responsible Party | Text | - | [responsible party open at capture] | yes | Label in the left cell; wide box in the right cell holding ONE responsible party in 'Last, First' form (a single account, not a range). The box has the light editable-field fill (same as the date boxes, not the grey read-only fill of the office box); whether it accepts typing or is filled only through the SEARCH button cannot be told from the screenshot. The value looks pre-filled from the patient / account that was open when the screen was launched (inference) - context data, not a generic default. |
| RESPONSIBLE PARTY | SEARCH | Button | - | - | yes | Blue enabled button with a magnifier icon immediately right of the Responsible Party box (responsible-party lookup). The dialog it opens is not shown in any screenshot. |
| OTHER OPTIONS | Print all transactions (includes statements, ledger notes) | Checkbox | - | unchecked | yes | Only control of the section; single full-width row. Empty box = unchecked. |

### 3.2 Walkout Report

Screenshots: 2.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 2.PNG only. The whole criteria panel is visible: 4 full-width sections (OFFICE/GROUP, DATE RANGE, RESPONSIBLE PARTY NAME RANGE, OTHER OPTIONS), then about 150 px of uniform blank space down to the action bar - nothing clipped, no scrollbar. No REPORT FORMAT section. Filters on a responsible-party NAME RANGE (Start Name / End Name, each with its own SEARCH button) instead of the single Responsible Party box used by Ledger Report and Account Allocation. No dropdowns, no side-by-side columns, no right-edge controls (pixel scan).

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | First section of the panel, full width. Two radios side by side on one row, no row label. 'Office' is selected and active. The 'Office Group' option is GREYED OUT / disabled (grey-filled radio, grey label). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | **no (greyed)** | Unlabelled read-only box below the Office / Office Group radios showing the office id 108 (matches 'OID :108' in the title bar); standard grey read-only picker fill. 'SELECT' button (building icon) to its right is GREYED OUT / disabled. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Equals the capture day (default appears to be today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Same value as Start Date. |
| RESPONSIBLE PARTY NAME RANGE | Start Name | Text | - | [name of the patient open at capture] | yes | Start of a RESPONSIBLE PARTY name range. Label in the left cell; wide box in the right cell with the light editable-field fill (same as the date boxes, not the grey read-only picker fill), followed by its own SEARCH button. The value looks pre-filled from the patient / account in context (inference), not a generic default. Whether the box accepts typing cannot be confirmed from this screenshot, but the same kind of name-range box in daily_reports/12.PNG (Special Transaction Report) holds the free-text bounds AAAAA / ZZZZZ, which suggests typed alphabetical bounds. |
| RESPONSIBLE PARTY NAME RANGE | SEARCH | Button | - | - | yes | Blue enabled button with a magnifier icon immediately right of the Start Name box (lookup for the start of the range). Dialog not shown. |
| RESPONSIBLE PARTY NAME RANGE | End Name | Text | - | [name of the patient open at capture] | yes | End of the RESPONSIBLE PARTY name range. Same light editable-field box as Start Name with the same value, followed by its own SEARCH button (row is pixel-identical to the Start Name row apart from the label). |
| RESPONSIBLE PARTY NAME RANGE | SEARCH | Button | - | - | yes | Blue enabled button with a magnifier icon immediately right of the End Name box (lookup for the end of the range). Dialog not shown. |
| OTHER OPTIONS | Show charges break down | Checkbox | - | unchecked | yes | First row of the section (own full-width row). 'break down' is written as two words. Empty box = unchecked. |
| OTHER OPTIONS | Include UCR | Checkbox | - | unchecked | yes | Second row of the section (own full-width row). Empty box = unchecked. UCR in capitals as displayed. |

### 3.3 Super Bill

Screenshots: 3.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 3.PNG only. The whole criteria panel is visible: 4 full-width sections (OFFICE/GROUP, DATE RANGE, PATIENT NAME RANGE, TRANSACTION TYPES), then about 170 px of uniform blank space down to the action bar - nothing clipped, no scrollbar. No REPORT FORMAT and no OTHER OPTIONS section. The range is by PATIENT name here (the other three reports filter by responsible party). All three transaction-type checkboxes are ticked by default. No dropdowns, no side-by-side columns, no right-edge controls (pixel scan).

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | First section of the panel, full width. Two radios side by side on one row, no row label. 'Office' is selected and active. The 'Office Group' option is GREYED OUT / disabled (grey-filled radio, grey label). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | **no (greyed)** | Unlabelled read-only box below the Office / Office Group radios showing the office id 108 (matches 'OID :108' in the title bar); standard grey read-only picker fill. 'SELECT' button (building icon) to its right is GREYED OUT / disabled. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Equals the capture day (default appears to be today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Same value as Start Date. |
| PATIENT NAME RANGE | Start Name | Text | - | [name of the patient open at capture] | yes | Start of a PATIENT name range (patient, not responsible party). Label in the left cell; wide box in the right cell with the light editable-field fill (same as the date boxes, not the grey read-only picker fill), followed by its own SEARCH button. The value looks pre-filled from the patient in context (inference), not a generic default. Whether the box accepts typing cannot be confirmed from this screenshot, but the identically titled PATIENT NAME RANGE section in daily_reports/12.PNG (Special Transaction Report) holds the free-text bounds AAAAA / ZZZZZ in the same kind of boxes, which suggests typed alphabetical bounds. |
| PATIENT NAME RANGE | SEARCH | Button | - | - | yes | Blue enabled button with a magnifier icon immediately right of the Start Name box (patient lookup for the start of the range). Dialog not shown. |
| PATIENT NAME RANGE | End Name | Text | - | [name of the patient open at capture] | yes | End of the PATIENT name range. Same light editable-field box as Start Name with the same value, followed by its own SEARCH button. |
| PATIENT NAME RANGE | SEARCH | Button | - | - | yes | Blue enabled button with a magnifier icon immediately right of the End Name box (patient lookup for the end of the range). Dialog not shown. |
| TRANSACTION TYPES | Services | Checkbox | - | checked | yes | First of three checkboxes laid out side by side on a single row; blue tick visible. |
| TRANSACTION TYPES | Payments | Checkbox | - | checked | yes | Second of the three checkboxes on the same row; blue tick visible. |
| TRANSACTION TYPES | Adjustment | Checkbox | - | checked | yes | Third of the three checkboxes on the same row; blue tick visible. Label is singular 'Adjustment' as displayed. |

### 3.4 Account Allocation

Screenshots: 4.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 4.PNG only. The whole criteria panel is visible: only 3 full-width sections (OFFICE/GROUP, DATE RANGE, RESPONSIBLE PARTY), then about 250 px of uniform blank space down to the action bar - nothing clipped, no scrollbar. Smallest criteria set of the category: same as Ledger Report minus REPORT FORMAT and OTHER OPTIONS. No checkboxes at all, no TRANSACTION TYPES, no dropdowns, no side-by-side columns, no right-edge controls (pixel scan).

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | First section of the panel, full width. Two radios side by side on one row, no row label. 'Office' is selected and active. The 'Office Group' option is GREYED OUT / disabled (grey-filled radio, grey label). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | **no (greyed)** | Unlabelled read-only box below the Office / Office Group radios showing the office id 108 (matches 'OID :108' in the title bar); standard grey read-only picker fill. 'SELECT' button (building icon) to its right is GREYED OUT / disabled. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Equals the capture day (default appears to be today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Same value as Start Date. |
| RESPONSIBLE PARTY | Responsible Party | Text | - | [responsible party open at capture] | yes | Label in the left cell; wide box in the right cell holding ONE responsible party in 'Last, First' form (a single account, not a range). Light editable-field fill (same as the date boxes, not the grey read-only fill of the office box); whether it accepts typing or is filled only through SEARCH cannot be told from the screenshot. Value looks pre-filled from the patient / account in context (inference). Row is pixel-identical to the Responsible Party row of Ledger Report. |
| RESPONSIBLE PARTY | SEARCH | Button | - | - | yes | Blue enabled button with a magnifier icon immediately right of the Responsible Party box (responsible-party lookup). Dialog not shown. |

## 4. Management Reports

- Source: `management_reports` (4 reports transcribed) - window title: "Management Reports"
- Reports listed in the legacy screen: Payment Plan Charges, Uncollected Copay, Audit Trail, Time Clock Report
- Notes: Third-reader verified inventory. All 4 original screenshots, the 8 pre-rendered zooms and additional tight crops (prefix c in the zoom folder) were read. Readers A and B agreed on every report, section, option, default value, enabled state and truncation flag; their differences were descriptive only (B alone recorded the size of 3.PNG and the RGB fill values, A hedged the G/C header glyph). One typing change was made against both readers: the Audit Trail Patient box has the light editable-field fill, so it is recorded as text_input with its SEARCH button as a separate button control (the convention already used in daily_reports.json and ledger_reports.json) instead of one picker - 31 controls instead of their 30. A pixel-cluster sweep of every screenshot (every pixel that is not one of the flat background colours, run with and without tolerance) found nothing beyond the items listed here: no tiny right-edge checkbox (no 'Page Break'), no extra greyed-out control, no instruction or legend text, no second list column, no scrollbar on either panel, no footer text. COVERAGE: 4 screenshots = 4 reports, each selected exactly once (blue radio dot located by pixel count): 1.PNG = Payment Plan Charges, 2.PNG = Uncollected Copay, 3.PNG = Audit Trail, 4.PNG = Time Clock Report, i.e. list order; every listed report has a screenshot. All four are the normal two-panel screen in its default state - no popup, no expanded dropdown, no scrolled second view, no foreign screen - so the Office / Office Group and User SELECT dialogs, the patient SEARCH dialog and the option lists of the Audit Type and Module Type dropdowns are NOT documented by this category. SCREEN CHROME (identical in all 4): dark title bar with 'Management Reports' at the left and 'PGID :2829 / OID :108' followed by a white printer icon (icon only, no text) at the far right. Blue sub-header bar: 'SELECT REPORT' over the left panel, 'REPORT CRITERIA' over the right panel with the grey-styled CLEAR CRITERIA button (refresh icon) at its right end (the same grey styling as in the other categories, i.e. not a disabled state). A splitter / collapse grip (three dots in a dark notch) sits on the border between the two panels at mid height. The action bar at the bottom of the criteria panel holds the blue PRINT / PREVIEW (printer icon) and ADD TO MY FAVORITES (plus icon) buttons, right-aligned. Below the panels there is only an empty grey strip; 2.PNG and 4.PNG show a full-width 1 px darker line in it (host-page chrome), no text. LEFT PANEL 'SELECT REPORT': a SINGLE column of exactly 4 radio rows separated by thin white lines (no second column in this category); the rest of the panel is uniform empty navy down to the window edge, so the list is NOT scrollable or clipped. NO TRUNCATION: in every screenshot the first section header is fully visible under the panel border and the last criteria row is followed by 161 to 207 px of uniform blank space down to the action bar. RECURRING PATTERNS: (1) OFFICE/GROUP on all 4 reports = radios Office (selected) / Office Group (enabled) plus an unlabelled read-only box '108' (the current office, same number as the OID in the title bar) with a blue SELECT button (building icon); it is full width on Payment Plan Charges and Uncollected Copay and the left half of a two-column block (beside USER) on Audit Trail and Time Clock Report. (2) USER (Audit Trail and Time Clock Report only) = row 'User' with a read-only box showing ALL and a blue SELECT button (person-plus icon), with an empty second row beneath it. (3) Dates: every date field shows 11/21/2026 (MM/DD/YYYY, the capture day, i.e. the default appears to be today) with a calendar icon inside the box; Payment Plan Charges has a single 'Billing Date' under REPORT DATE, the other three have Start Date / End Date under DATE RANGE. (4) PRINT FORMAT (PDF selected / Excel) exists only on Payment Plan Charges and Uncollected Copay; Audit Trail and Time Clock Report show no PRINT FORMAT section at all. (5) REPORT FORMAT exists only on Uncollected Copay (Detail / Summary) and Time Clock Report (Detail / Summary / Employee Total Only), Detail selected on both. (6) Report-specific options: Payment Plan Charges = PLAN TYPE Regular / Ortho plus the three checkboxes Ortho Patient / Ortho Primary / Ortho Secondary; Uncollected Copay = 'Patient Balance Greater Than' amount (0.00); Audit Trail = Patient lookup plus the Audit Type and Module Type dropdowns (both ALL); Time Clock Report = 'Group By Office' checkbox. ABSENT in this category: PROVIDER picker, PATIENT TYPE, TRANSACTION TYPES, GROUP BY and SORT BY sections, listboxes, Page Break checkboxes. DISABLED STATES (confirmed by pixel colour: greyed labels and checkbox borders are RGB 161 with a 209 box fill, enabled labels are black and enabled buttons blue 41,134,220): Ortho Patient, Ortho Primary and Ortho Secondary on Payment Plan Charges (captured with Plan Type = Regular) and Group By Office on Time Clock Report (captured with Office and the single office 108). What enables them is not shown; that Ortho enables the first three and that Office Group / several offices enables the last is an inference from the labels. Every other control - including every Office Group radio and every SELECT / SEARCH button - is enabled. VISUAL CONVENTION: read-only picker boxes (office 108, User ALL) are grey (220,223,226); editable fields - the date boxes, the balance box, the two dropdowns and the Audit Trail Patient box - are lighter (241,241,241). RENDERING CAVEAT: in the bold section-header font the capital G shows almost no crossbar at this resolution, so the headers look like 'OFFICE/CROUP' and 'DATE RANCE'; the pixel dump shows the G spur and the mixed-case labels 'Office Group' and 'Group By Office' show a clear G, so they are transcribed as OFFICE/GROUP and DATE RANGE. Layout seam: a 1 px line of panel background separates the REPORT DATE block from the PLAN TYPE header (1.PNG) and the DATE RANGE block from the PATIENT header (3.PNG); nothing is drawn in it. Screenshot sizes: 1366x590, 1366x591, 1364x586, 1366x590 px (3.PNG is shifted 2 px left; same content layout). No reading needed a '[?]' marker.

### 4.1 Payment Plan Charges

Screenshots: 1.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 1.PNG only (first radio of the list selected), default state. Five full-width sections stacked top to bottom - PRINT FORMAT, OFFICE/GROUP, REPORT DATE, PLAN TYPE, OTHER OPTIONS - with no side-by-side columns. No REPORT FORMAT section, no PROVIDER / USER section, no PATIENT section and no date range (a single Billing Date). The only greyed controls are the three Ortho checkboxes (captured with Plan Type = Regular; the Ortho state is not shown). About 187 px of uniform blank panel follow the checkbox row down to the action bar and there is no scrollbar - nothing clipped. A pixel sweep of the panel found no control besides those listed (nothing at the right edge, no Page Break). CLEAR CRITERIA = grey-styled button with a refresh icon at the right end of the blue REPORT CRITERIA bar; PRINT / PREVIEW (printer icon) and ADD TO MY FAVORITES (plus icon) = blue buttons at the bottom right.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | First section of the panel, full width. Two radios side by side on one row, no row label. PDF carries the blue dot; Excel is enabled (white radio, black label). |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section. Two radios side by side on one row, no row label. Office carries the blue dot; Office Group is enabled (white radio, black label). The Office Group state was not captured. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on its own row directly below the Office / Office Group radios; blue (enabled) SELECT button with a building icon to its right. 108 is the current office id (same number as 'OID :108' in the title bar). The dialog the button opens is not shown in any screenshot. |
| REPORT DATE | Billing Date | Date | - | 11/21/2026 | yes | A SINGLE date, not a Start / End range. Label in the left cell, date box in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY; the value is the capture day (the default appears to be today). |
| PLAN TYPE | (unlabelled) | Radio | Regular / Ortho | Regular | yes | Full-width section. Two radios side by side on one row, no row label. Regular carries the blue dot; Ortho is enabled (white radio, black label). The Ortho state was not captured, so what it changes in OTHER OPTIONS is not shown. |
| OTHER OPTIONS | Ortho Patient | Checkbox | - | unchecked | **no (greyed)** | GREYED OUT / disabled (grey box, grey label) in the captured state PLAN TYPE = Regular; the box is empty (unchecked). First of three checkboxes side by side on one row, left-aligned. Presumably enabled when Ortho is selected - inference from the labels, not visible in the screenshot. |
| OTHER OPTIONS | Ortho Primary | Checkbox | - | unchecked | **no (greyed)** | GREYED OUT / disabled (grey box, grey label) while PLAN TYPE = Regular; empty box. Second checkbox on the same row. |
| OTHER OPTIONS | Ortho Secondary | Checkbox | - | unchecked | **no (greyed)** | GREYED OUT / disabled (grey box, grey label) while PLAN TYPE = Regular; empty box. Third checkbox on the same row. |

### 4.2 Uncollected Copay

Screenshots: 2.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 2.PNG only (second radio of the list selected), default state. Layout: REPORT FORMAT (left half) and PRINT FORMAT (right half) share the first row; OFFICE/GROUP, DATE RANGE and OTHER OPTIONS are full width below. No PROVIDER / USER section and no PATIENT section. No greyed-out control anywhere. About 198 px of uniform blank panel follow the Patient Balance Greater Than row down to the action bar, no scrollbar - nothing clipped. A pixel sweep of the panel found no control besides those listed. Actions as in the other screenshots: grey-styled CLEAR CRITERIA (refresh icon) at the right end of the REPORT CRITERIA bar; blue PRINT / PREVIEW (printer icon) and ADD TO MY FAVORITES (plus icon) at the bottom right.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT FORMAT | (unlabelled) | Radio | Detail / Summary | Detail | yes | LEFT half of the first row of sections, side by side with PRINT FORMAT. Two radios on one row, no row label. Detail carries the blue dot; Summary is enabled (white radio, black label). |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | RIGHT half of the first row of sections, side by side with REPORT FORMAT. Two radios on one row, no row label. PDF carries the blue dot; Excel is enabled (white radio, black label). |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section. Two radios side by side on one row, no row label. Office carries the blue dot; Office Group is enabled (white radio, black label). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on its own row directly below the Office / Office Group radios; blue (enabled) SELECT button with a building icon to its right. 108 = current office id (the OID in the title bar). Dialog not shown. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section. Label in the left cell, date box in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY; equals End Date and the capture day (the default appears to be today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | On its own row directly below Start Date; same box with a calendar icon inside at its right end. |
| OTHER OPTIONS | Patient Balance Greater Than | Number | - | 0.00 | yes | Label in the left cell; editable-style box (light fill, same width as the date boxes) in the right cell with the value right-aligned and two decimals. No currency symbol, no spinner arrows, no icon. Only control of the section. |

### 4.3 Audit Trail

Screenshots: 3.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 3.PNG only (third radio of the list selected), default state. Layout: OFFICE/GROUP (left half) and USER (right half) side by side; then full-width DATE RANGE, PATIENT and OTHER OPTIONS. This report shows NO PRINT FORMAT section (no PDF / Excel choice) and NO REPORT FORMAT section. No greyed-out control anywhere. The option lists of Audit Type and Module Type are not exposed in any screenshot - only the default ALL - and must be obtained elsewhere. About 161 px of uniform blank panel follow the Module Type row down to the action bar, no scrollbar - nothing clipped. A pixel sweep of the panel found no control besides those listed. Actions as in the other screenshots: grey-styled CLEAR CRITERIA (refresh icon) at the right end of the REPORT CRITERIA bar; blue PRINT / PREVIEW (printer icon) and ADD TO MY FAVORITES (plus icon) at the bottom right. 3.PNG is 1364x586 px (shifted 2 px left compared with the others), same content layout.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | LEFT half of the first block, side by side with USER. Two radios on one row, no row label. Office carries the blue dot; Office Group is enabled (white radio, black label). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the second row of the left half, below the Office / Office Group radios; blue (enabled) SELECT button with a building icon to its right. 108 = current office id (the OID in the title bar). Dialog not shown. |
| USER | User | Picker | - | ALL | yes | RIGHT half of the first block, beside OFFICE/GROUP. Row label 'User', then a read-only grey box showing ALL, then a blue (enabled) SELECT button with a person-plus icon. The second row of the right half (level with the office box) is empty. The dialog the button opens is not shown in any screenshot. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section. Label in the left cell, date box in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY; equals End Date and the capture day (the default appears to be today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | On its own row directly below Start Date; same box with a calendar icon inside at its right end. |
| PATIENT | Patient | Text | - | - | yes | Full-width section. Label in the left cell; wide EMPTY box in the right cell (wider than the date boxes, same width as the two dropdowns below). The box has the light editable-field fill (same as the date boxes and dropdowns), not the grey read-only fill of the Office and User boxes, so it is recorded as text_input with its SEARCH button as a separate control. Whether the box accepts typing or is filled only through SEARCH cannot be told from the screenshot. Empty presumably means no patient filter (inference). |
| PATIENT | SEARCH | Button | - | - | yes | Blue enabled button with a magnifier icon immediately right of the Patient box (patient search / lookup). The dialog it opens is not shown in any screenshot. |
| OTHER OPTIONS | Audit Type | Dropdown | - | ALL | yes | list collapsed - other values not visible. Label in the left cell; dropdown with a chevron at its right end in the right cell, same width as the Patient box. Enabled (light fill, dark text). |
| OTHER OPTIONS | Module Type | Dropdown | - | ALL | yes | list collapsed - other values not visible. On its own row directly below Audit Type; identical dropdown (chevron at the right end, same width). Enabled. |

### 4.4 Time Clock Report

Screenshots: 4.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 4.PNG only (fourth / last radio of the list selected), default state. Layout: full-width REPORT FORMAT with three options; then OFFICE/GROUP (left half) and USER (right half) side by side; then full-width DATE RANGE and OTHER OPTIONS. This report shows NO PRINT FORMAT section (no PDF / Excel choice) and no PATIENT section. The only greyed control is the Group By Office checkbox. About 207 px of uniform blank panel follow the checkbox row down to the action bar, no scrollbar - nothing clipped. A pixel sweep of the panel found no control besides those listed. Actions as in the other screenshots: grey-styled CLEAR CRITERIA (refresh icon) at the right end of the REPORT CRITERIA bar; blue PRINT / PREVIEW (printer icon) and ADD TO MY FAVORITES (plus icon) at the bottom right.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT FORMAT | (unlabelled) | Radio | Detail / Summary / Employee Total Only | Detail | yes | First section, FULL width (not paired with another section). Three radios side by side on one row, no row label. Detail carries the blue dot; Summary and Employee Total Only are enabled (white radios, black labels). |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | LEFT half of the second block, side by side with USER. Two radios on one row, no row label. Office carries the blue dot; Office Group is enabled (white radio, black label). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the second row of the left half, below the Office / Office Group radios; blue (enabled) SELECT button with a building icon to its right. 108 = current office id (the OID in the title bar). Dialog not shown. |
| USER | User | Picker | - | ALL | yes | RIGHT half of the second block, beside OFFICE/GROUP. Row label 'User', then a read-only grey box showing ALL, then a blue (enabled) SELECT button with a person-plus icon. The second row of the right half (level with the office box) is empty. Dialog not shown. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section. Label in the left cell, date box in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY; equals End Date and the capture day (the default appears to be today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | On its own row directly below Start Date; same box with a calendar icon inside at its right end. |
| OTHER OPTIONS | Group By Office | Checkbox | - | unchecked | **no (greyed)** | GREYED OUT / disabled (grey box, grey label); the box is empty (unchecked). Only control of the section, left-aligned. Captured with OFFICE/GROUP = Office and the single office 108; presumably enabled when Office Group or several offices are chosen - inference from the label, not visible in the screenshot. |

## 5. Insurance Reports

- Source: `insurance_reports` (13 reports transcribed) - window title: "Insurance Reports"
- Reports listed in the legacy screen: Claims List, Capitation Utilization, Claims Created Not Sent, Procedures on Hold, DPS Eligibility Report, Capitation Payment, Benefits Used/Unused, Outstanding Claims, Claims Not Created, Unbilled Report Due to No Insurance, EOB 835 Claims Reconcile Report, 835 Denial Report, RTE Sweep Details
- Notes: Verification: third-reader pass over all 13 original screenshots, all 13 pre-rendered list / criteria zooms and about 70 extra crops at 3x-9x. Readers A and B agreed on every report, section, control, option, default and enabled state (13 reports, 85 sections, 130 controls); their only differences were descriptive wording. Everything was re-checked on the pixels: blue-mark detection for every selected radio and ticked checkbox, a census of every input box by fill and border colour, a census of every section header bar (full-width or split in two), an ink-blob map and a light-colour histogram of each criteria area, and contrast-stretched renders. No control, icon, note or greyed element exists outside those listed here.  Coverage: 13 screenshots = 13 different reports, one screenshot each, in list order (1.PNG Claims List, 2 Capitation Utilization, 3 Claims Created Not Sent, 4 Procedures on Hold, 5 DPS Eligibility Report, 6 Capitation Payment, 7 Benefits Used/Unused = left column; 8 Outstanding Claims, 9 Claims Not Created, 10 Unbilled Report Due to No Insurance, 11 EOB 835 Claims Reconcile Report, 12 835 Denial Report, 13 RTE Sweep Details = right column). The selected radio of every screenshot was located from the pixels. Every listed report has a screenshot. No screenshot shows a popup, an expanded dropdown, a scrolled second view or a foreign screen, so the contents of every SELECT / SEARCH dialog (office, office group, provider, carriers, responsible party type, reason code, name search) and the other values of the Fee Schedule To Compare dropdown are NOT documented by these screenshots. Only one state per report was captured, so the non-default states (Pre-Authorization, Office Group, Summary, Recall, Include UCR ticked, Appointment Created Date / Both, DOS Date / Transaction Date, By File Received on Date, PDF on 835 Denial Report) are not shown.  Screen chrome (pixel-identical in all 13): dark title bar with 'Insurance Reports' at the left and 'PGID :2829 / OID :108' followed by a white printer icon at the far right. Blue sub-header 'SELECT REPORT' over the left panel and 'REPORT CRITERIA' over the right panel; the right end of the REPORT CRITERIA bar holds the grey-styled CLEAR CRITERIA button (refresh icon) - grey is its normal look in every screenshot, not a disabled state. A splitter / collapse handle (three vertical dots on an arrow-shaped tab) sits on the border between the two panels. The action bar at the bottom of the criteria panel holds the blue buttons PRINT / PREVIEW (printer icon) and ADD TO MY FAVORITES (plus icon); Outstanding Claims alone adds CREATE TASK (plus icon) to their left. No footer text: below the panels there are only uniform window-edge strips.  Report list: 13 radio entries in a two-column grid (7 in the left column, 6 in the right; the cell under RTE Sweep Details is empty). The dark panel below the grid is empty and there is no scrollbar, so the list is not scrollable or clipped. The list text is pixel-identical in all 13 screenshots. Casing as displayed: 'Procedures on Hold' and 'Unbilled Report Due to No Insurance' use lower-case 'on' / 'to'.  Text-rendering caveat: the bold section-header font draws a capital G almost exactly like a C at this resolution, so the header pixels look like 'OFFICE/CROUP', 'DATE RANCE', 'NAME RANCE', 'CROUP BY', 'DPS ELICIBILITY', '835 CLAIM MATCHINC STATUS', 'UPCOMINC'. The mixed-case label 'Office Group' on every report shows a clear G and the same rendering was resolved the same way in the other categories, so these headers are transcribed with G (OFFICE/GROUP, DATE RANGE, NAME RANGE, GROUP BY, DPS ELIGIBILITY, 835 CLAIM MATCHING STATUS, UPCOMING). The date digits '11' also render like 'TI' (the value is 11/21/2026).  Recurring patterns: PRINT FORMAT (PDF \| Excel) is on all 13 reports - PDF selected on 12, Excel on 835 Denial Report; its position varies (full-width first section on 6 reports, right column of row 1 on 5, last section on Claims List, bottom-left on Outstanding Claims). REPORT FORMAT (Detail \| Summary) appears only on Capitation Utilization (enabled, Detail) and 835 Denial Report (both radios greyed, Detail marked). OFFICE/GROUP (Office \| Office Group radios, default Office, plus an unlabelled read-only box with a SELECT button, building icon) is on all 13; the box shows 108 (= the OID in the title bar) on 12 reports and ALL on 835 Denial Report. A PROVIDER picker (row label Provider, ALL, SELECT with single-person icon) is on 5 reports: Capitation Utilization, Claims Created Not Sent, DPS Eligibility Report, Benefits Used/Unused, Outstanding Claims. A CARRIER picker (row label Carriers, ALL, SELECT with single-person icon) is on 7 reports: Claims List, Capitation Utilization, Claims Created Not Sent, Capitation Payment, Outstanding Claims, EOB 835 Claims Reconcile Report, 835 Denial Report. GROUP BY (None \| Provider, default None) is on 3 reports: Capitation Utilization, Claims Created Not Sent, Outstanding Claims - none of them has a Page Break checkbox or any other right-edge control. NAME RANGE (Start Name AAAAA / End Name ZZZZZ, each an editable-style box with its own SEARCH button, magnifier icon) is on Claims List and Claims Created Not Sent. CLAIM AMOUNT OVER OR EQUAL TO (0.00) is on Claims List, Claims Created Not Sent and Outstanding Claims; CLAIM/PRE-AUTH and CLAIM SENT TYPE are on Claims List and Outstanding Claims. The title CLAIM TYPE is used with two meanings: Both \| Dental \| Medical radios (Claims List, Claims Created Not Sent, Outstanding Claims) and Primary / Secondary / Tertiary / Quaternary checkboxes (Claims Not Created). OTHER OPTIONS has different content on each of the 5 reports that have it. The two 'exclude' pickers default to None: EXCLUDE RESPONSIBLE PARTY TYPE (person-plus icon) on Benefits Used/Unused and EXCLUDE REASON CODE (building icon) on 835 Denial Report.  Date sections: a Start Date / End Date range titled DATE RANGE on Claims List, Capitation Utilization, Procedures on Hold, Capitation Payment, Unbilled Report Due to No Insurance, EOB 835 Claims Reconcile Report (preceded there by a By Payment Date \| By File Received on Date radio) and 835 Denial Report; titled CREATED ON DATE RANGE on Claims Created Not Sent and RTE Sweep Details; APPOINTMENT DATE RANGE plus APPOINTMENT CREATED DATE RANGE switched by DATE RANGE TYPE on DPS Eligibility Report; ANNIVERSARY DATE RANGE on Benefits Used/Unused. A single Report Date titled REPORT DATE is used on Outstanding Claims and on Claims Not Created (preceded there by an ALL \| DOS Date \| Transaction Date radio). All date fields are MM/DD/YYYY boxes with a calendar icon and show 11/21/2026 (the capture day, i.e. the default is today), except Benefits Used/Unused (12/01/2026 to 11/30/2027 = first day of the next month to one year later minus a day).  Enabled / disabled states were confirmed by pixel colour: editable fields have fill 241,241,241; read-only picker boxes and disabled fields have fill 220,223,226; disabled labels are mid-grey (161) against black for enabled ones. Controls greyed in the captured default states (what enables them is inferred, never shown): the Fee Schedule To Compare dropdown on Capitation Utilization (Include UCR unticked); both APPOINTMENT CREATED DATE RANGE dates on DPS Eligibility Report (DATE RANGE TYPE = Appointment Date); Report Date on Claims Not Created (radio = ALL); both REPORT FORMAT radios on 835 Denial Report (Excel selected). All SELECT and SEARCH buttons are blue (enabled) in every screenshot.  Truncation: the criteria area has a fixed height (about 481 px in every screenshot) with the action bar pinned below it, and no scrollbar is drawn anywhere. In all 13 screenshots the first section header is fully visible at the top and blank panel background separates the last section from the action bar (smallest gap about 27 px, under GROUP BY on Capitation Utilization), so no report is flagged possibly_truncated.

### 5.1 Claims List

Screenshots: 1.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 1.PNG only (default state, no popup). Row layout: [CLAIM/PRE-AUTH \| CLAIM TYPE], [OFFICE/GROUP full width], [DATE RANGE \| NAME RANGE], [CLAIM AMOUNT OVER OR EQUAL TO \| CARRIER], [CLAIM SENT TYPE \| OTHER OPTIONS], [PRINT FORMAT full width]. No PROVIDER section and no GROUP BY section on this report. Blank panel remains between PRINT FORMAT and the action bar, so nothing is clipped. No greyed-out controls.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| CLAIM/PRE-AUTH | (unlabelled) | Radio | Claims / Pre-Authorization | Claims | yes | Left column of row 1 (CLAIM TYPE is to its right). No row label. |
| CLAIM TYPE | (unlabelled) | Radio | Both / Dental / Medical | Both | yes | Right column of row 1. No row label. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Section spans the full panel width on this report (there is no PROVIDER section beside it). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button (building icon) to its right. 108 = current office id (same value as OID :108 in the title bar). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Left column (NAME RANGE is to its right). MM/DD/YYYY box with a calendar icon at its right end; the value equals the capture date (default appears to be today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box; same default as Start Date. |
| NAME RANGE | Start Name | Text | - | AAAAA | yes | Right column, beside DATE RANGE. Editable-style box (same light fill as the date fields, not the grey read-only picker fill) pre-filled with AAAAA; blue SEARCH button to its right. |
| NAME RANGE | SEARCH | Button | - | - | yes | Blue button with magnifier icon immediately right of the Start Name box (lookup for the start of the name range; its dialog is not shown). |
| NAME RANGE | End Name | Text | - | ZZZZZ | yes | Editable-style box pre-filled with ZZZZZ; blue SEARCH button to its right. |
| NAME RANGE | SEARCH | Button | - | - | yes | Blue button with magnifier icon immediately right of the End Name box (lookup for the end of the name range; its dialog is not shown). |
| CLAIM AMOUNT OVER OR EQUAL TO | (unlabelled) | Number | - | 0.00 | yes | Left column (CARRIER is to its right). Unlabelled editable box - the section header acts as its label; the value is right-aligned. |
| CARRIER | Carriers | Picker | - | ALL | yes | Right column, beside CLAIM AMOUNT OVER OR EQUAL TO. Header is singular CARRIER, row label is plural 'Carriers'. Read-only grey box; blue SELECT button (single-person icon). |
| CLAIM SENT TYPE | EClaim | Checkbox | - | checked | yes | Left column (OTHER OPTIONS is to its right). Written 'EClaim' (capital E and capital C, one word). |
| CLAIM SENT TYPE | Paper | Checkbox | - | checked | yes | Same row as EClaim. |
| OTHER OPTIONS | Include Resolved Claims | Checkbox | - | unchecked | yes | Right column, beside CLAIM SENT TYPE. The only option in this section. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width last section (on this report PRINT FORMAT sits at the bottom of the criteria, not at the top). |

### 5.2 Capitation Utilization

Screenshots: 2.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 2.PNG only (default state). Row layout: [REPORT FORMAT \| PRINT FORMAT], [OFFICE/GROUP \| PROVIDER] with the office picker row spanning the full width underneath, [DATE RANGE full], [FACILITY ID \| CARRIER], [INCLUDE UCR \| FEE SCHEDULE TO COMPARE], [OTHER OPTIONS full], [GROUP BY full]. Tallest criteria set of the category: the GROUP BY row is complete and ends about 27 px above the action bar with blank panel in between and no scrollbar, so nothing is clipped. Only greyed control: the Fee Schedule To Compare dropdown.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT FORMAT | (unlabelled) | Radio | Detail / Summary | Detail | yes | Left column of row 1 (PRINT FORMAT is to its right). No row label. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right column of row 1. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column of row 2 (PROVIDER is to its right). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on a full-width row below the radios (the row runs under both the OFFICE/GROUP and PROVIDER columns); blue SELECT button (building icon) to its right. 108 = current office id (same value as OID :108 in the title bar). |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column of row 2. Read-only grey box; blue SELECT button (single-person icon). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section. MM/DD/YYYY box with a calendar icon at its right end; the value equals the capture date (default appears to be today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box; same default as Start Date. |
| FACILITY ID | (unlabelled) | Text | - | - | yes | Left column (CARRIER is to its right). Unlabelled, empty editable box - the section header acts as its label. No placeholder text. |
| CARRIER | Carriers | Picker | - | ALL | yes | Right column, beside FACILITY ID. Header is singular CARRIER, row label is plural 'Carriers'. Read-only grey box; blue SELECT button (single-person icon). |
| INCLUDE UCR | Include UCR | Checkbox | - | unchecked | yes | Left column (FEE SCHEDULE TO COMPARE is to its right). Section header and checkbox label carry the same words. |
| FEE SCHEDULE TO COMPARE | Fee Schedule To Compare | Dropdown | - | CP-40 ( 135 ) | **no (greyed)** | list collapsed - other values not visible. Right column, beside INCLUDE UCR. The dropdown is greyed out (grey fill, light-grey text, up/down chevrons at its right end) while its row label is black. Value exactly as shown, with spaces inside the parentheses. Probably enabled only when Include UCR is ticked - inference, the dependency is not shown. |
| OTHER OPTIONS | Print All Codes | Checkbox | - | unchecked | yes | Full-width section; the four checkboxes sit on one row, in this order. |
| OTHER OPTIONS | Include Fees Charged | Checkbox | - | checked | yes | Second checkbox of the row; the only one ticked by default. |
| OTHER OPTIONS | Print Office Address | Checkbox | - | unchecked | yes | Third checkbox of the row. |
| OTHER OPTIONS | Show Billing Provider For Hygienist | Checkbox | - | unchecked | yes | Fourth checkbox of the row. |
| GROUP BY | (unlabelled) | Radio | None / Provider | None | yes | Full-width last section. No row label; nothing else in the row (no Page Break checkbox). |

### 5.3 Claims Created Not Sent

Screenshots: 3.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 3.PNG only (default state). Row layout: [CLAIM TYPE \| PRINT FORMAT], [OFFICE/GROUP \| PROVIDER] with the office picker row spanning the full width underneath, [CREATED ON DATE RANGE \| NAME RANGE], [CLAIM AMOUNT OVER OR EQUAL TO \| CARRIER], [GROUP BY full]. Compared with Claims List there is no CLAIM/PRE-AUTH, CLAIM SENT TYPE or OTHER OPTIONS section, the date section is titled CREATED ON DATE RANGE, and PROVIDER and GROUP BY are added. Large blank area below GROUP BY; nothing clipped. No greyed-out controls.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| CLAIM TYPE | (unlabelled) | Radio | Both / Dental / Medical | Both | yes | Left column of row 1 (PRINT FORMAT is to its right). No row label. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right column of row 1. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column of row 2 (PROVIDER is to its right). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on a full-width row below the radios (the row runs under both the OFFICE/GROUP and PROVIDER columns); blue SELECT button (building icon) to its right. 108 = current office id (same value as OID :108 in the title bar). |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column of row 2. Read-only grey box; blue SELECT button (single-person icon). |
| CREATED ON DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Left column (NAME RANGE is to its right). MM/DD/YYYY box with a calendar icon at its right end; the value equals the capture date (default appears to be today). |
| CREATED ON DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box; same default as Start Date. |
| NAME RANGE | Start Name | Text | - | AAAAA | yes | Right column, beside CREATED ON DATE RANGE. Editable-style box (same light fill as the date fields) pre-filled with AAAAA; blue SEARCH button to its right. |
| NAME RANGE | SEARCH | Button | - | - | yes | Blue button with magnifier icon immediately right of the Start Name box (lookup for the start of the name range; its dialog is not shown). |
| NAME RANGE | End Name | Text | - | ZZZZZ | yes | Editable-style box pre-filled with ZZZZZ; blue SEARCH button to its right. |
| NAME RANGE | SEARCH | Button | - | - | yes | Blue button with magnifier icon immediately right of the End Name box (lookup for the end of the name range; its dialog is not shown). |
| CLAIM AMOUNT OVER OR EQUAL TO | (unlabelled) | Number | - | 0.00 | yes | Left column (CARRIER is to its right). Unlabelled editable box - the section header acts as its label; the value is right-aligned. |
| CARRIER | Carriers | Picker | - | ALL | yes | Right column, beside CLAIM AMOUNT OVER OR EQUAL TO. Header is singular CARRIER, row label is plural 'Carriers'. Read-only grey box; blue SELECT button (single-person icon). |
| GROUP BY | (unlabelled) | Radio | None / Provider | None | yes | Full-width last section. No row label; nothing else in the row (no Page Break checkbox). |

### 5.4 Procedures on Hold

Screenshots: 4.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 4.PNG only (default state). Three full-width sections in a single column (PRINT FORMAT, OFFICE/GROUP, DATE RANGE); the rest of the panel is blank down to the action bar, nothing clipped. No PROVIDER, CARRIER, GROUP BY or OTHER OPTIONS section. No greyed-out controls.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width first section. No row label. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section (no PROVIDER section on this report). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button (building icon) to its right. 108 = current office id (same value as OID :108 in the title bar). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width last section. MM/DD/YYYY box with a calendar icon at its right end; the value equals the capture date (default appears to be today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box; same default as Start Date. |

### 5.5 DPS Eligibility Report

Screenshots: 5.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 5.PNG only (default state: DATE RANGE TYPE = Appointment Date). Row layout: [DPS ELIGIBILITY \| PRINT FORMAT], [OFFICE/GROUP \| PROVIDER] with the office picker row spanning the full width underneath, [DATE RANGE TYPE full], [APPOINTMENT DATE RANGE \| APPOINTMENT CREATED DATE RANGE], [OTHER OPTIONS full]. The two APPOINTMENT CREATED DATE RANGE inputs are greyed (fill 220,223,226 against 241,241,241 for the editable APPOINTMENT DATE RANGE inputs). 'DPS' is not expanded anywhere on the screen. Blank space below OTHER OPTIONS; nothing clipped.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| DPS ELIGIBILITY | On Hold | Checkbox | - | unchecked | yes | Left column of row 1 (PRINT FORMAT is to its right). The only control in this section. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right column of row 1. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column of row 2 (PROVIDER is to its right). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on a full-width row below the radios (the row runs under both the OFFICE/GROUP and PROVIDER columns); blue SELECT button (building icon) to its right. 108 = current office id (same value as OID :108 in the title bar). |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column of row 2. Read-only grey box; blue SELECT button (single-person icon). |
| DATE RANGE TYPE | (unlabelled) | Radio | Appointment Date / Appointment Created Date / Both | Appointment Date | yes | Full-width section, no row label. Appears to control which of the two date-range sections below is usable: with Appointment Date selected only APPOINTMENT DATE RANGE is editable (the other two states were not captured). |
| APPOINTMENT DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Left column (APPOINTMENT CREATED DATE RANGE is to its right). Editable (light fill) MM/DD/YYYY box with a calendar icon at its right end; the value equals the capture date. |
| APPOINTMENT DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Editable (light fill) box with a calendar icon at its right end; same default as Start Date. |
| APPOINTMENT CREATED DATE RANGE | Start Date | Date | - | 11/21/2026 | **no (greyed)** | Right column, beside APPOINTMENT DATE RANGE. Box is greyed out (grey fill like the read-only picker boxes) while DATE RANGE TYPE = Appointment Date; it still shows the date and a calendar icon, and its row label is black. |
| APPOINTMENT CREATED DATE RANGE | End Date | Date | - | 11/21/2026 | **no (greyed)** | Greyed out (grey fill) while DATE RANGE TYPE = Appointment Date; shows the date and a calendar icon. |
| OTHER OPTIONS | Include patients with no insurance | Checkbox | - | unchecked | yes | Full-width last section. Label in sentence case exactly as shown (lower-case 'patients with no insurance'). |

### 5.6 Capitation Payment

Screenshots: 6.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 6.PNG only (default state). Four full-width sections in a single column (PRINT FORMAT, OFFICE/GROUP, DATE RANGE, CARRIER); blank panel below, nothing clipped. No PROVIDER section. No greyed-out controls.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width first section. No row label. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section (no PROVIDER section on this report). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button (building icon) to its right. 108 = current office id (same value as OID :108 in the title bar). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section. MM/DD/YYYY box with a calendar icon at its right end; the value equals the capture date (default appears to be today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box; same default as Start Date. |
| CARRIER | Carriers | Picker | - | ALL | yes | Full-width last section (the read-only grey box is wider than in the two-column reports). Header is singular CARRIER, row label is plural 'Carriers'. Blue SELECT button (single-person icon). |

### 5.7 Benefits Used/Unused

Screenshots: 7.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 7.PNG only (default state). Row layout: [TREATMENT PLAN/RECALL \| PRINT FORMAT], [OFFICE/GROUP \| PROVIDER] with the office picker row spanning the full width underneath, [ANNIVERSARY DATE RANGE (* UPCOMING BENEFIT ROLLOVER PERIOD.) full], [EXCLUDE RESPONSIBLE PARTY TYPE full]. The parenthetical in the ANNIVERSARY header is the only explanatory note text in this category and is kept as part of the section title, exactly as displayed. Date defaults differ from every other report (12/01/2026 to 11/30/2027). Blank space below; nothing clipped. No greyed-out controls.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| TREATMENT PLAN/RECALL | (unlabelled) | Radio | Treatment Plan / Recall | Treatment Plan | yes | Left column of row 1 (PRINT FORMAT is to its right). No row label. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right column of row 1. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column of row 2 (PROVIDER is to its right). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on a full-width row below the radios (the row runs under both the OFFICE/GROUP and PROVIDER columns); blue SELECT button (building icon) to its right. 108 = current office id (same value as OID :108 in the title bar). |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column of row 2. Read-only grey box; blue SELECT button (single-person icon). |
| ANNIVERSARY DATE RANGE (* UPCOMING BENEFIT ROLLOVER PERIOD.) | Start Date | Date | - | 12/01/2026 | yes | Full-width section; the explanatory note '(* UPCOMING BENEFIT ROLLOVER PERIOD.)' is printed inside the section header bar itself, after ANNIVERSARY DATE RANGE. MM/DD/YYYY box with a calendar icon. Default is NOT today: it is the first day of the month after the capture date (captured 11/21/2026). |
| ANNIVERSARY DATE RANGE (* UPCOMING BENEFIT ROLLOVER PERIOD.) | End Date | Date | - | 11/30/2027 | yes | Calendar icon at the right end of the box. Default is one year minus one day after the Start Date. |
| EXCLUDE RESPONSIBLE PARTY TYPE | (unlabelled) | Picker | - | None | yes | Full-width last section. Unlabelled read-only grey box showing None; blue SELECT button with a person-plus icon to its right. Title is spelled out in full here (RESPONSIBLE PARTY, not RESP. PARTY). |

### 5.8 Outstanding Claims

Screenshots: 8.PNG - Actions: CLEAR CRITERIA, CREATE TASK, PRINT / PREVIEW, ADD TO MY FAVORITES

> 8.PNG only (default state). Row layout: [CLAIM/PRE-AUTH \| CLAIM TYPE], [OFFICE/GROUP \| PROVIDER] with the office picker row spanning the full width underneath, [REPORT DATE full], [CLAIM AMOUNT OVER OR EQUAL TO \| CARRIER], [CLAIM SENT TYPE \| OTHER OPTIONS], [PRINT FORMAT \| GROUP BY]. The only report in this category whose bottom action bar has an extra blue CREATE TASK button (plus icon), placed left of PRINT / PREVIEW. Uses a single as-of Report Date instead of a date range; OTHER OPTIONS holds the five aging-bucket checkboxes. Blank space below the last row; nothing clipped. No greyed-out controls.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| CLAIM/PRE-AUTH | (unlabelled) | Radio | Claims / Pre-Authorization | Claims | yes | Left column of row 1 (CLAIM TYPE is to its right). No row label. |
| CLAIM TYPE | (unlabelled) | Radio | Both / Dental / Medical | Both | yes | Right column of row 1. No row label. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column of row 2 (PROVIDER is to its right). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on a full-width row below the radios (the row runs under both the OFFICE/GROUP and PROVIDER columns); blue SELECT button (building icon) to its right. 108 = current office id (same value as OID :108 in the title bar). |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column of row 2. Read-only grey box; blue SELECT button (single-person icon). |
| REPORT DATE | Report Date | Date | - | 11/21/2026 | yes | Full-width section with a single as-of date (no start/end range). MM/DD/YYYY box with a calendar icon at its right end; the value equals the capture date (default appears to be today). |
| CLAIM AMOUNT OVER OR EQUAL TO | (unlabelled) | Number | - | 0.00 | yes | Left column (CARRIER is to its right). Unlabelled editable box - the section header acts as its label; the value is right-aligned. |
| CARRIER | Carriers | Picker | - | ALL | yes | Right column, beside CLAIM AMOUNT OVER OR EQUAL TO. Header is singular CARRIER, row label is plural 'Carriers'. Read-only grey box; blue SELECT button (single-person icon). |
| CLAIM SENT TYPE | EClaim | Checkbox | - | checked | yes | Left column (OTHER OPTIONS is to its right). Written 'EClaim' (capital E and capital C, one word). |
| CLAIM SENT TYPE | Paper | Checkbox | - | checked | yes | Same row as EClaim. |
| OTHER OPTIONS | Current | Checkbox | - | checked | yes | Right column, beside CLAIM SENT TYPE. First of five aging-bucket checkboxes on one row (Current, Over 30, Over 60, Over 90, Over 120), all ticked by default. |
| OTHER OPTIONS | Over 30 | Checkbox | - | checked | yes | Aging bucket, second in the row. |
| OTHER OPTIONS | Over 60 | Checkbox | - | checked | yes | Aging bucket, third in the row. |
| OTHER OPTIONS | Over 90 | Checkbox | - | checked | yes | Aging bucket, fourth in the row. |
| OTHER OPTIONS | Over 120 | Checkbox | - | checked | yes | Aging bucket, fifth in the row. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Left column of the last row (GROUP BY is to its right). |
| GROUP BY | (unlabelled) | Radio | None / Provider | None | yes | Right column of the last row, beside PRINT FORMAT. No row label; nothing else in the row (no Page Break checkbox). |

### 5.9 Claims Not Created

Screenshots: 9.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 9.PNG only (default state: REPORT DATE radio = ALL). Four full-width sections in a single column (PRINT FORMAT, OFFICE/GROUP, REPORT DATE, CLAIM TYPE). Only greyed control: the Report Date input. No PROVIDER, CARRIER or GROUP BY section. Large blank area below CLAIM TYPE; nothing clipped.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width first section. No row label. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section (no PROVIDER section on this report). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button (building icon) to its right. 108 = current office id (same value as OID :108 in the title bar). |
| REPORT DATE | (unlabelled) | Radio | ALL / DOS Date / Transaction Date | ALL | yes | First row of the section, no row label. 'ALL' is in capitals. Appears to control whether the Report Date box below is usable (it is greyed while ALL is selected). |
| REPORT DATE | Report Date | Date | - | 11/21/2026 | **no (greyed)** | Second row of the section; a single date, not a range. Box is greyed out (grey fill) while the radio above is on ALL, but still shows the date and a calendar icon; its row label is black. Presumably editable when DOS Date or Transaction Date is chosen - inference, those states were not captured. |
| CLAIM TYPE | Primary | Checkbox | - | checked | yes | Full-width last section; four checkboxes on one row, all ticked by default. On this report CLAIM TYPE means coverage order, not the Both / Dental / Medical choice used under the same title on other reports. |
| CLAIM TYPE | Secondary | Checkbox | - | checked | yes | Second in the row. |
| CLAIM TYPE | Tertiary | Checkbox | - | checked | yes | Third in the row. |
| CLAIM TYPE | Quaternary | Checkbox | - | checked | yes | Fourth in the row. |

### 5.10 Unbilled Report Due to No Insurance

Screenshots: 10.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 10.PNG only (default state). Three full-width sections in a single column - the same criteria set as Procedures on Hold (PRINT FORMAT, OFFICE/GROUP, DATE RANGE). Blank panel below; nothing clipped. No greyed-out controls.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width first section. No row label. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section (no PROVIDER section on this report). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button (building icon) to its right. 108 = current office id (same value as OID :108 in the title bar). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width last section. MM/DD/YYYY box with a calendar icon at its right end; the value equals the capture date (default appears to be today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box; same default as Start Date. |

### 5.11 EOB 835 Claims Reconcile Report

Screenshots: 11.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 11.PNG only (default state). Row layout: [PRINT FORMAT full], [835 CLAIM MATCHING STATUS \| CLAIM STATUS], [OFFICE/GROUP full], [DATE RANGE full: date-basis radio row, then Start Date and End Date], [OTHER OPTIONS \| CARRIER]. No PROVIDER section. Blank space below; nothing clipped. No greyed-out controls.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width first section. No row label. |
| 835 CLAIM MATCHING STATUS | (unlabelled) | Radio | Both / Matched / UnMatched | Both | yes | Left column of row 2 (CLAIM STATUS is to its right). No row label. 'UnMatched' is written with a capital M. |
| CLAIM STATUS | (unlabelled) | Radio | ALL / Partial Closed / Closed | ALL | yes | Right column of row 2, beside 835 CLAIM MATCHING STATUS. No row label. 'ALL' is in capitals. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section (no PROVIDER section on this report). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button (building icon) to its right. 108 = current office id (same value as OID :108 in the title bar). |
| DATE RANGE | (unlabelled) | Radio | By Payment Date / By File Received on Date | By Payment Date | yes | First row of the full-width DATE RANGE section, above the Start/End dates; no row label. Chooses which date the range applies to. 'on' is lower-case in 'By File Received on Date'. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | MM/DD/YYYY box with a calendar icon at its right end; the value equals the capture date (default appears to be today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box; same default as Start Date. |
| OTHER OPTIONS | Show Details UCR | Checkbox | - | checked | yes | Left column of the last row (CARRIER is to its right). Ticked by default; the only option in this section. |
| CARRIER | Carriers | Picker | - | ALL | yes | Right column of the last row, beside OTHER OPTIONS. Header is singular CARRIER, row label is plural 'Carriers'. Read-only grey box; blue SELECT button (single-person icon). |

### 5.12 835 Denial Report

Screenshots: 12.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 12.PNG only. Row layout: [REPORT FORMAT \| PRINT FORMAT], [OFFICE/GROUP full], [DATE RANGE full], [CARRIER full], [EXCLUDE REASON CODE full]. The captured state differs from every other report of the category in three ways: Excel (not PDF) is the selected print format, both REPORT FORMAT radios are greyed out with Detail marked, and the office box shows ALL instead of 108. Every other screenshot shows an untouched default form, so these are probably this report's own defaults, but a single screenshot cannot prove it. No PROVIDER section. Blank space below; nothing clipped.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT FORMAT | (unlabelled) | Radio | Detail / Summary | Detail | **no (greyed)** | Left column of row 1 (PRINT FORMAT is to its right). BOTH radios and both labels are greyed out (disabled); Detail is the one marked (grey dot inside a grey ring), Summary is an empty grey circle. Possibly locked because Excel is the selected print format - inference, only this one state was captured. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | Excel | yes | Right column of row 1. Excel is selected here - the only report in this category not showing PDF selected. The PDF radio and its label look enabled (black). Whether Excel is this report's built-in default or was chosen by the person capturing cannot be told from the screenshot. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section (no PROVIDER section on this report). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | ALL | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button (building icon) to its right. Shows ALL here - every other report in this category shows 108 (the current office id). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section. MM/DD/YYYY box with a calendar icon at its right end; the value equals the capture date (default appears to be today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box; same default as Start Date. |
| CARRIER | Carriers | Picker | - | ALL | yes | Full-width section (wide read-only grey box). Header is singular CARRIER, row label is plural 'Carriers'. Blue SELECT button (single-person icon). |
| EXCLUDE REASON CODE | (unlabelled) | Picker | - | None | yes | Full-width last section. Unlabelled read-only grey box showing None; blue SELECT button to its right with the same building icon as the office SELECT button. The reason-code list behind SELECT is not shown. |

### 5.13 RTE Sweep Details

Screenshots: 13.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 13.PNG only (default state). Three full-width sections in a single column (PRINT FORMAT, OFFICE/GROUP, CREATED ON DATE RANGE); blank panel below, nothing clipped. 'RTE' is not expanded anywhere on the screen. No greyed-out controls.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width first section. No row label. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section (no PROVIDER section on this report). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button (building icon) to its right. 108 = current office id (same value as OID :108 in the title bar). |
| CREATED ON DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width last section. MM/DD/YYYY box with a calendar icon at its right end; the value equals the capture date (default appears to be today). |
| CREATED ON DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box; same default as Start Date. |

## 6. Appointment Reports

- Source: `appointment_reports` (9 reports transcribed) - window title: "Appointment Reports"
- Reports listed in the legacy screen: Appointment List, Missed Appointments Not Marked As Missed, New Patients via Appointments, Lab Report, SmartAssist Report Card, Appointments Confirmed Via Vendors, Appointment Time Stamps, Appointment Detail, Lab Cost Report
- Notes: Third-reader verified inventory: all 9 original screenshots and all pre-rendered zooms were re-read, every A-vs-B difference was settled on the pixels, and each file was swept for missed elements with a colour scan of the criteria area (nothing beyond the controls listed here was found). COVERAGE: all 9 files are the same two-panel screen in its normal state - no popup, no expanded dropdown, no second view of the same report; each screenshot shows a different report selected (blue radio dot located in each file), so all 9 listed reports are covered exactly once: 1=Appointment List, 2=Missed Appointments Not Marked As Missed, 3=New Patients via Appointments, 4=Lab Report, 5=SmartAssist Report Card, 6=Appointments Confirmed Via Vendors, 7=Appointment Time Stamps, 8=Appointment Detail, 9=Lab Cost Report. TITLE BAR (identical in all 9): 'Appointment Reports' at the left; 'PGID :2829 / OID :108' followed by a printer icon at the right. No footer text (only a thin grey window-edge strip below the panels). LEFT PANEL 'SELECT REPORT': 9 radio entries in a two-column grid (5 in the left column, 4 in the right, bottom-right cell empty); 'Missed Appointments Not Marked As Missed' wraps onto two lines; large empty area below - the list is not scrollable or clipped. Casing as displayed: 'New Patients via Appointments' (lower-case via) but 'Appointments Confirmed Via Vendors' (capital Via). A splitter handle (three dots) sits between the two panels. RIGHT PANEL 'REPORT CRITERIA': grey CLEAR CRITERIA button (refresh icon) at the right end of the blue panel bar - same grey look in all 9 files, so it is its normal style, not a disabled state; blue PRINT / PREVIEW (printer icon) and '+ ADD TO MY FAVORITES' buttons sit in a grey action bar pinned to the bottom of the panel. No static instruction / legend text anywhere in the criteria panels. NOT VISIBLE ANYWHERE in this category: the contents of the Office / Office Group / Provider / User / Operatory / Lab / Vendors / Cancellation Reason / Patient Type / Resp. Party Type pickers and the other values of the 'Length' dropdown (only 'Any' is shown); only one state per report was captured, so controls that depend on a radio or checkbox choice (the other five list types of Appointment List, the other Lab Report types, Only AppointNow Appointments ticked, GROUP BY = User, Include Cancelled Appointments ticked) are seen only in their default-state enabled/disabled form. RECURRING DEFAULTS: PRINT FORMAT = PDF (options PDF, Excel) on 8 of 9 reports - none visible on Appointment List; OFFICE/GROUP = Office (options Office, Office Group) with an unlabelled read-only box showing 108 (= OID) + SELECT on all 9; a Provider picker (ALL) on 7 reports (absent on New Patients via Appointments and Appointments Confirmed Via Vendors); User / Lab / Vendors / Operatory / Cancellation Reason pickers = ALL; EXCLUDE PATIENT TYPE + EXCLUDE RESP. PARTY TYPE pickers = None on Appointment List (greyed), Missed Appointments Not Marked As Missed, Lab Report and Lab Cost Report; every date box = 11/21/2026 (the capture date, i.e. today) with a calendar icon. SELECT button icons: building (Office, Lab, Vendors, Cancellation Reason), single person (Provider, Operatory), person-plus (User, Exclude Patient Type, Exclude Resp. Party Type). DISABLED-STATE EVIDENCE (pixel colours, not just by eye): disabled SELECT buttons are grey (176,183,190) instead of blue (41,134,220); disabled radio / checkbox labels are grey (161,161,161) instead of black; disabled inputs and dropdowns use the fill 220,223,226 of the read-only picker boxes instead of the 241,241,241 of enabled inputs (calibrated against the other report categories: about 35 dropdowns there use the light fill, the only other grey one is a dependency-gated Fee Schedule dropdown in My Reports). Greyed controls exist only in 1.PNG (Appointment List: both Exclude SELECT buttons, Cancellation Reason SELECT, Operatory SELECT, Length dropdown, Status Missed / Cancelled, Include Off Call List, all four SORT BY radios), 4.PNG (Lab Report: Due Date box) and 8.PNG (Appointment Detail: Both / Appoint Now / Appoint Now API radios, the 'User' option of PAGE BREAK BY, Cancellation Reason SELECT). TWO REPORTS DO NOT FIT THE VIEWPORT: the criteria viewport has a fixed height (482 px between the panel border and the action bar in every file) and no scrollbar is drawn even when the content is taller. (a) Appointment List (1.PNG) was captured scrolled to its bottom end - it is the only screenshot (also compared with the criteria screens of the other report categories) whose content does not start with a 1 px light line followed by a full 25 px header: its first header bar is cut to a 10 px strip without text, so that title is unreadable (it cannot even be told whether the bar carries a title), and no PRINT FORMAT section is visible; unknown whether the report has none or it is hidden above. (b) Appointment Detail (8.PNG) is clipped at the BOTTOM: a third row under OTHER OPTIONS begins exactly at the edge (1 px sliver). Both need verification on the live system; the other seven reports end with empty panel space below their last section and are complete. FONT CAVEAT: in the bold caps section-header font the G is drawn almost like a C at this size, so the headers look like 'OFFICE/CROUP', 'DATE RANCE', 'APPOINTMENT DATE RANCE', 'CROUP BY', 'PACE BREAK BY'; a pixel comparison with real C glyphs (e.g. in CANCELLATION) shows the extra lower-right stroke of a G, so they are transcribed as OFFICE/GROUP, DATE RANGE, APPOINTMENT DATE RANGE, GROUP BY, PAGE BREAK BY. NAMING DIFFERENCES worth keeping: the date section is 'DATE RANGE' on six reports but 'APPOINTMENT DATE RANGE' on Lab Report, SmartAssist Report Card and Lab Cost Report; 'PROVIDER' vs 'PROVIDER/USER' (Appointment Detail only); the first-row selector is titled 'REPORT TYPE' (Lab Report, Lab Cost Report), 'REPORT FORMAT' (SmartAssist Report Card) or 'APPOINTMENT TYPE' (Appointment Detail: Regular / Archived), while on Appointment List 'APPOINTMENT TYPE' is a different section (Length dropdown + Status checkboxes); header 'APPOINT NOW' is two words whereas its checkbox says 'AppointNow'; the balance option is worded 'Include Patient Balance' on Appointment List but 'Show Patient Balance' on Missed Appointments Not Marked As Missed (both ticked by default). Not part of this category's 9 files: the parent folder also holds drop_down_options.PNG (the Reports menu), not transcribed here.

### 6.1 Appointment List

Screenshots: 1.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES - **Possibly truncated - more options may exist below the visible area**

> Only 1.PNG shows this report; state = 'Confirmation Call List' selected (the other five list types were not captured, so their enabled/disabled combinations are unknown). THE CLIPPING IS AT THE TOP, NOT THE BOTTOM: the criteria area was captured scrolled to its bottom end. Directly under the panel border there is only a 10 px strip of a full-width header bar (normal bars are 24-25 px) and the 1 px light line that tops the criteria content in every other screenshot is missing, i.e. the content sits about 16 px higher than normal while its last line ends exactly at the action bar. Consequences: (a) the title of the first section (the list-type radios) cannot be read - recorded as [?]; (b) it cannot be ruled out that more content lies above it. NO 'PRINT FORMAT' (PDF / Excel) section is visible for this report although the other 8 reports of the category have one - the pixels do not tell whether it does not exist here or is scrolled out of view above; verify on the live screen. The bottom edge is complete: SORT BY is the last section, followed by the closing 1 px line and the action bar. Layout top to bottom: [clipped full-width header] + list-type radios (full width); OFFICE/GROUP \| PROVIDER; DATE RANGE (full width); EXCLUDE PATIENT TYPE \| EXCLUDE RESP. PARTY TYPE; CANCELLATION REASON \| OPERATORY; APPOINTMENT TYPE (full-width header: Length on the left half, Status checkboxes on the right half); OTHER OPTIONS (full-width header: one checkbox in each half); SORT BY (full width). GREYED OUT in this state: SELECT buttons of EXCLUDE PATIENT TYPE, EXCLUDE RESP. PARTY TYPE, CANCELLATION REASON and OPERATORY; Length dropdown; Status checkboxes Missed and Cancelled; Include Off Call List; all four SORT BY radios. ENABLED: list-type radios, Office / Office Group + office SELECT, Provider SELECT, Start Date / End Date, Include Patient Balance (checked). Presumably the other list types enable other subsets (e.g. Cancellation Reason for Cancelled List) - inference only, not shown.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| [?] | (unlabelled) | Radio | Confirmation Call List / Call List / Pull Chart List / Cancelled List / Cancelled From Automated Campaigns / Missed List | Confirmation Call List | yes | List-type selector: one full-width row of six radios, all enabled (black labels). SECTION TITLE NOT READABLE (recorded as [?]): of the header bar above this row only the bottom 10 px strip is visible directly under the panel border (normal header bars are 24-25 px); the strip is full width, has no column divider and contains no text, so the title - if this header has one - is hidden above the viewport edge. Nothing was invented; for orientation only, the analogous selectors of Lab Report and Lab Cost Report are titled REPORT TYPE, but no such text is visible here. The selection evidently drives which criteria below are enabled (inference: only the 'Confirmation Call List' state was captured). |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column (PROVIDER section is to its right). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button with building icon. 108 = current office id (same as OID :108 in the title bar). |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column. Read-only grey box; blue SELECT button with single-person icon. The second row of this column is an empty filler row. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section. MM/DD/YYYY box with a calendar icon at its right end; the value equals the capture date (appears to default to today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box; same default as Start Date. |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | **no (greyed)** | Left column. Unlabelled read-only box showing None; its SELECT button (person-plus icon) is GREYED OUT / disabled in this state (Confirmation Call List selected). |
| EXCLUDE RESP. PARTY TYPE | (unlabelled) | Picker | - | None | **no (greyed)** | Right column. Unlabelled read-only box showing None; its SELECT button (person-plus icon) is GREYED OUT / disabled in this state. |
| CANCELLATION REASON | (unlabelled) | Picker | - | ALL | **no (greyed)** | Left column. Unlabelled read-only box showing ALL; its SELECT button (building icon) is GREYED OUT / disabled in this state. |
| OPERATORY | Operatory | Picker | - | ALL | **no (greyed)** | Right column. Read-only box showing ALL; its SELECT button (single-person icon) is GREYED OUT / disabled in this state. |
| APPOINTMENT TYPE | Length | Dropdown | - | Any | **no (greyed)** | Left half of the row under the full-width header. List collapsed - other values not visible. Drawn in the disabled style: fill RGB 220,223,226 with border 209,209,209, identical to the read-only picker boxes, whereas enabled inputs here and enabled dropdowns elsewhere in the tool (checked against the Referral Reports screenshots) use the lighter 241,241,241 fill. The 'Length' label, the value text and the chevron are not dimmed. |
| APPOINTMENT TYPE | Missed | Checkbox | - | unchecked | **no (greyed)** | Right half of the same row, after the black row label 'Status'. Checkbox and label greyed out / disabled in this state. |
| APPOINTMENT TYPE | Cancelled | Checkbox | - | unchecked | **no (greyed)** | Right half of the same row (row label 'Status'), immediately right of Missed. Checkbox and label greyed out / disabled in this state. |
| OTHER OPTIONS | Include Off Call List | Checkbox | - | unchecked | **no (greyed)** | Left half of the row under the full-width header. Checkbox and label greyed out / disabled in this state. |
| OTHER OPTIONS | Include Patient Balance | Checkbox | - | checked | yes | Right half of the same row. Enabled and ticked (blue check). |
| SORT BY | (unlabelled) | Radio | Appointment Date / Provider (Last Name) – Appointment Date / Patient Chart# / Patient Last Name | Appointment Date | **no (greyed)** | Full-width single row. ALL FOUR radios and their labels are greyed out / disabled in this state; 'Appointment Date' shows a grey filled dot (selected but disabled). The dash in the 2nd option is about 5 px wide with a space on each side - read as an en dash, could be a plain hyphen. 'Patient Chart#' has no space before #. |

### 6.2 Missed Appointments Not Marked As Missed

Screenshots: 2.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Only 2.PNG shows this report (default state). Layout: PRINT FORMAT (full width); OFFICE/GROUP \| PROVIDER; DATE RANGE (full width); EXCLUDE PATIENT TYPE \| EXCLUDE RESP. PARTY TYPE; OTHER OPTIONS (full width). Nothing greyed out. Large empty area between the last section and the action bar - content fully visible.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section (first row of the panel). |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column (PROVIDER section is to its right). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button with building icon. 108 = OID in the title bar. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column. Read-only grey box; blue SELECT button with single-person icon. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section. Calendar icon at the right end of the box; value = capture date. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box. |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | yes | Left column. Unlabelled read-only box showing None; blue (enabled) SELECT button with person-plus icon. |
| EXCLUDE RESP. PARTY TYPE | (unlabelled) | Picker | - | None | yes | Right column. Unlabelled read-only box showing None; blue (enabled) SELECT button with person-plus icon. |
| OTHER OPTIONS | Show Patient Balance | Checkbox | - | checked | yes | Full-width section; the only option in it; ticked by default. |

### 6.3 New Patients via Appointments

Screenshots: 3.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Only 3.PNG shows this report (default state). Smallest criteria set of the category: three full-width sections only (PRINT FORMAT, OFFICE/GROUP, DATE RANGE); no Provider picker and no other options. Nothing greyed out; large empty area below, then the action bar - content fully visible.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section (first row of the panel). |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section (no PROVIDER section beside it on this report). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button with building icon. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section. Calendar icon at the right end of the box; value = capture date. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box. |

### 6.4 Lab Report

Screenshots: 4.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Only 4.PNG shows this report (state: REPORT TYPE = 'Appointment List'; the other three report types were not captured). Layout: REPORT TYPE \| PRINT FORMAT; OFFICE/GROUP \| PROVIDER; DUE DATE \| LAB; APPOINTMENT DATE RANGE (full width); EXCLUDE PATIENT TYPE \| EXCLUDE RESP. PARTY TYPE. Only greyed control: the Due Date box. No OTHER OPTIONS section. Empty area below the last section, then the action bar - content fully visible.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT TYPE | (unlabelled) | Radio | Appointment List / Not Sent / Not Received / Due Date | Appointment List | yes | Left column of the first row (PRINT FORMAT is to its right). |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right column of the first row. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column (PROVIDER section is to its right). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button with building icon. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column. Read-only grey box; blue SELECT button with single-person icon. |
| DUE DATE | Due Date | Date | - | 11/21/2026 | **no (greyed)** | Left column (LAB section is to its right). GREYED OUT / disabled in this state: the box has the grey read-only fill (RGB 220,223,226), unlike the lighter enabled Start Date / End Date boxes (241,241,241); the calendar icon is still shown. Presumably enabled only when REPORT TYPE = 'Due Date' (inference - not verifiable from the screenshot). |
| LAB | Lab | Picker | - | ALL | yes | Right column. Read-only grey box; blue SELECT button with building icon. |
| APPOINTMENT DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section. Calendar icon at the right end of the box; value = capture date. |
| APPOINTMENT DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box. |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | yes | Left column. Unlabelled read-only box showing None; blue (enabled) SELECT button with person-plus icon. |
| EXCLUDE RESP. PARTY TYPE | (unlabelled) | Picker | - | None | yes | Right column. Unlabelled read-only box showing None; blue (enabled) SELECT button with person-plus icon. |

### 6.5 SmartAssist Report Card

Screenshots: 5.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Only 5.PNG shows this report (default state). Layout: REPORT FORMAT \| PRINT FORMAT; OFFICE/GROUP \| PROVIDER; APPOINTMENT DATE RANGE (full width); OTHER OPTIONS (full width, two stacked checkboxes). Nothing greyed out. Empty area below the last section, then the action bar - content fully visible.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT FORMAT | (unlabelled) | Radio | Detail / Summary | Detail | yes | Left column of the first row (PRINT FORMAT is to its right). |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right column of the first row. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column (PROVIDER section is to its right). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button with building icon. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column. Read-only grey box; blue SELECT button with single-person icon. |
| APPOINTMENT DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section. Calendar icon at the right end of the box; value = capture date. |
| APPOINTMENT DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box. |
| OTHER OPTIONS | Include Missed Appointments | Checkbox | - | unchecked | yes | Full-width section; first of two checkboxes stacked vertically. |
| OTHER OPTIONS | Include Cancelled Appointments | Checkbox | - | unchecked | yes | Second checkbox, on its own row below Include Missed Appointments. |

### 6.6 Appointments Confirmed Via Vendors

Screenshots: 6.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Only 6.PNG shows this report (default state). Four full-width sections: PRINT FORMAT; OFFICE/GROUP; DATE RANGE; VENDORS. No Provider picker. Nothing greyed out. Empty area below the last section, then the action bar - content fully visible.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section (first row of the panel). |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section (no PROVIDER section beside it on this report). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button with building icon. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section. Calendar icon at the right end of the box; value = capture date. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box. |
| VENDORS | Vendors | Picker | - | ALL | yes | Full-width section. Read-only grey box showing ALL; blue SELECT button with building icon. |

### 6.7 Appointment Time Stamps

Screenshots: 7.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Only 7.PNG shows this report (default state). Layout: PRINT FORMAT (full width); OFFICE/GROUP \| PROVIDER; DATE RANGE (full width). Nothing greyed out. Large empty area below, then the action bar - content fully visible.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section (first row of the panel). |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column (PROVIDER section is to its right). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button with building icon. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column. Read-only grey box; blue SELECT button with single-person icon. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section. Calendar icon at the right end of the box; value = capture date. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box. |

### 6.8 Appointment Detail

Screenshots: 8.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES - **Possibly truncated - more options may exist below the visible area**

> Only 8.PNG shows this report (default state). Largest criteria set of the category. Layout: APPOINTMENT TYPE \| PRINT FORMAT; APPOINT NOW (full-width header: checkbox on the left half, radio group on the right half); OFFICE/GROUP \| PROVIDER/USER; DATE RANGE (full width); OPERATORY (full width); GROUP BY \| PAGE BREAK BY; OTHER OPTIONS \| CANCELLATION REASON. Greyed out in this state: the Both / Appoint Now / Appoint Now API radios, the 'User' option of PAGE BREAK BY and the CANCELLATION REASON SELECT button. BOTTOM CLIPPED: the criteria content fills the fixed-height viewport and runs into the action bar. In the LEFT column, below 'Include Patient Phone Number' (row ends at y=536 in 8.PNG) comes the usual 2 px separator (y=537-538) and then a 1 px sliver in row colour (x 466-908, y=539) before the action bar starts at y=540; the right column shows plain empty panel background at the same height. That sliver is the top of a THIRD row under OTHER OPTIONS whose content is not visible (recorded as an 'other' placeholder control); further content below it cannot be excluded. No scrollbar is drawn. The related report 'Appointment Detail by User' in My Reports (my_reports/4.PNG) shows only the same two checkboxes in its OTHER OPTIONS, so it gives no hint about the hidden row. Must be checked on the live screen.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| APPOINTMENT TYPE | (unlabelled) | Radio | Regular / Archived | Regular | yes | Left column of the first row (PRINT FORMAT is to its right). |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right column of the first row. |
| APPOINT NOW | Only AppointNow Appointments | Checkbox | - | unchecked | yes | Full-width header; this checkbox is in the LEFT half of the row. The checkbox text writes AppointNow as one word, the header and the radios write 'Appoint Now'. |
| APPOINT NOW | (unlabelled) | Radio | Both / Appoint Now / Appoint Now API | Both | **no (greyed)** | RIGHT half of the same row. All three radios and their labels are GREYED OUT / disabled while 'Only AppointNow Appointments' is unchecked; 'Both' shows a grey filled dot (selected but disabled). Presumably enabled by ticking the checkbox (inference - not verifiable from the screenshot). |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column (PROVIDER/USER section is to its right). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button with building icon. |
| PROVIDER/USER | Provider | Picker | - | ALL | yes | Right column, first row. Read-only grey box; blue SELECT button with single-person icon. |
| PROVIDER/USER | User | Picker | - | ALL | yes | Right column, second row (below Provider). Read-only grey box; blue SELECT button with person-plus icon. |
| DATE RANGE | (unlabelled) | Radio | Appointment Date / Created On Date | Appointment Date | yes | Full-width section; radio row above the two date rows - chooses which date the range applies to. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box; value = capture date. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box. |
| OPERATORY | Operatory | Picker | - | ALL | yes | Full-width section. Read-only grey box showing ALL; blue (enabled) SELECT button with single-person icon (enabled here, unlike on Appointment List). |
| GROUP BY | (unlabelled) | Radio | Provider / User | Provider | yes | Left column (PAGE BREAK BY section is to its right). |
| PAGE BREAK BY | (unlabelled) | Radio | None / Date / Provider / User | None | yes | Right column. None, Date and Provider are enabled; the fourth option 'User' is GREYED OUT / disabled in this state (GROUP BY = Provider) - presumably it becomes available when GROUP BY = User (inference - not verifiable from the screenshot). |
| OTHER OPTIONS | Include Cancelled Appointments | Checkbox | - | unchecked | yes | Left column (CANCELLATION REASON section is to its right); first row. |
| OTHER OPTIONS | Include Patient Phone Number | Checkbox | - | unchecked | yes | Left column, second row - the last fully visible row of the panel. |
| OTHER OPTIONS | [?] | Other | - | - | yes | CLIPPED ROW - CONTENT NOT VISIBLE (placeholder so it is not lost; label recorded as [?]). Directly below 'Include Patient Phone Number' a THIRD row of this left column begins and is cut off by the action bar: only a 1 px sliver in row colour is visible (8.PNG y=539, x 466-908, right after the usual 2 px separator at y=537-538), exactly the row / 2 px separator / row pattern of the two rows above, while the right column shows empty panel background at the same height. Most likely one more checkbox, but nothing of it can be read and it could also be an empty row; its enabled state is unknown (true is only a filler value). Must be checked on the live screen. |
| CANCELLATION REASON | (unlabelled) | Picker | - | ALL | **no (greyed)** | Right column, beside OTHER OPTIONS. Unlabelled read-only box showing ALL; its SELECT button (building icon) is GREYED OUT / disabled in this state ('Include Cancelled Appointments' unchecked) - presumably enabled once cancelled appointments are included (inference - not verifiable from the screenshot). |

### 6.9 Lab Cost Report

Screenshots: 9.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Only 9.PNG shows this report (default state, REPORT TYPE = 'All'). Layout: REPORT TYPE \| PRINT FORMAT; OFFICE/GROUP \| PROVIDER; LAB (full width); APPOINTMENT DATE RANGE (full width); EXCLUDE PATIENT TYPE \| EXCLUDE RESP. PARTY TYPE; OTHER OPTIONS (full width). Nothing greyed out even though REPORT TYPE has date-specific options. No separate DUE DATE section (unlike Lab Report). Empty area below the last section, then the action bar - content fully visible.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT TYPE | (unlabelled) | Radio | All / Sent Date / Due Date / Received Date | All | yes | Left column of the first row (PRINT FORMAT is to its right). |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right column of the first row. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column (PROVIDER section is to its right). No row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on the row below the Office / Office Group radios; blue SELECT button with building icon. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column. Read-only grey box; blue SELECT button with single-person icon. |
| LAB | Lab | Picker | - | ALL | yes | Full-width section (on Lab Report the LAB section is a right-hand column instead). Read-only grey box showing ALL; blue SELECT button with building icon. |
| APPOINTMENT DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section. Calendar icon at the right end of the box; value = capture date. |
| APPOINTMENT DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon at the right end of the box. |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | yes | Left column. Unlabelled read-only box showing None; blue (enabled) SELECT button with person-plus icon. |
| EXCLUDE RESP. PARTY TYPE | (unlabelled) | Picker | - | None | yes | Right column. Unlabelled read-only box showing None; blue (enabled) SELECT button with person-plus icon. |
| OTHER OPTIONS | Exclude Lab Received | Checkbox | - | unchecked | yes | Full-width section; the only option in it. |

## 7. Treatment Plan Reports

- Source: `treatmentplan_reports` (4 reports transcribed) - window title: "Treatment Plan Reports"
- Reports listed in the legacy screen: Treatment Plan Proposal, Treatment Plan Status, Treatment Plan Analysis, Treatment Plan Detail
- Notes: Third-reader verified inventory. All 4 original screenshots (1366 px wide; 589, 582, 590 and 586 px high), the 8 pre-rendered zooms and 20 additional tight crops (prefix c in the zoom folder) were read. Readers A and B agreed on every report, section, control, option list, default value, enabled state and truncation flag (4 reports, 35 sections, 50 controls); their differences were note wording only. Every point was nevertheless re-checked on the pixels: the selected list radio of every file, blue-mark detection for every chosen criteria radio and ticked checkbox, fill colours of every input box, glyph dumps of the disputed header letters and of the dropdown / date values, vertical colour profiles of the option rows at the bottom of each criteria panel, and an ink-cluster map of every criteria panel, the title bar and the panel header bar. Nothing exists beyond the controls listed here: no tiny right-edge checkbox (no 'Page Break'), no GROUP BY / SORT BY, no extra column of controls, no greyed-out control, no instruction / warning / legend text, no scrollbar on either panel, no footer text. COVERAGE: 4 screenshots = 4 different reports, one screenshot each, in list order (1.PNG = Treatment Plan Proposal, 2.PNG = Treatment Plan Status, 3.PNG = Treatment Plan Analysis, 4.PNG = Treatment Plan Detail); every listed report has a screenshot. All four are the same two-panel screen in its normal state - no popup, no expanded dropdown, no scrolled second view, no foreign screen - so the contents of every SELECT dialog (Office, Office Group, Provider, Exclude Patient Type, Codes, Exclude Treatment Plans, TX Counselor), of the two name SEARCH lookups and of the FINANCIAL DISCLOSURE dropdown list are NOT documented by these screenshots. TITLE BAR (identical in all 4): 'Treatment Plan Reports' at the left; 'PGID :2829 / OID :108' followed by a white printer icon (no text) at the far right. LEFT PANEL: blue header 'SELECT REPORT'; exactly 4 reports as radio buttons in a 2 x 2 grid (left column: Treatment Plan Proposal, Treatment Plan Status; right column: Treatment Plan Analysis, Treatment Plan Detail). The rest of the panel is one uniform dark-blue colour down to the bottom edge, so the list is complete - not scrollable, nothing clipped. A splitter / collapse handle (three vertical dots) sits on the border between the two panels. RIGHT PANEL: blue header 'REPORT CRITERIA' with the slate-grey CLEAR CRITERIA button (refresh icon) at its right end - grey is its normal style on this screen, not a disabled state; a docked bar at the bottom right of the criteria panel holds the blue buttons PRINT / PREVIEW (printer icon) and ADD TO MY FAVORITES (plus icon). COMMON TO ALL 4 REPORTS: PRINT FORMAT (PDF / Excel, default PDF); OFFICE/GROUP (Office / Office Group radios, default Office, plus an unlabelled office picker showing 108 = the OID); PROVIDER (picker labelled 'Provider', value ALL); DIAGNOSED DATE RANGE (Start Date and End Date, both 11/21/2026 - apparently the capture day, i.e. default = current date; the date range is always titled DIAGNOSED DATE RANGE in this category); EXCLUDE PATIENT TYPE (picker, None); an OTHER OPTIONS checkbox section. REPORT-SPECIFIC: Treatment Plan Proposal adds NAME RANGE (Start Name AAAAA / End Name ZZZZZ, each with a SEARCH button), TREATMENT PLAN ID, PHASE ID, ORDER ID (three empty text boxes), a FINANCIAL DISCLOSURE dropdown (value '.Treatment Plan Disclosure', with a leading period) and four print-oriented checkboxes (Include Office UCR and Itemize Prices ticked; Include Completed Procedures and Print Responsible Party Address not ticked). Treatment Plan Status adds REPORT FORMAT (Detail / Summary, default Detail), the TREATMENT PLANS status radio grid (ALL default plus 10 statuses), EXCLUDE TREATMENT PLANS (None), CODES (ALL), TX COUNSELOR (ALL) and the checkbox 'Include internal plan id'. Treatment Plan Detail adds CODES (box empty). 'Include Inactive Patients' (unticked) is visible on Status, Analysis and Detail but not in the visible part of Proposal. TRUNCATION: the criteria area is a fixed-height viewport (about 482 px) with the action bar docked directly under it and no scrollbar drawn. In 1.PNG the top 5 px of a third, full-width OTHER OPTIONS row are visible before the action bar hides it, and in 2.PNG the second OTHER OPTIONS row is cut at its lower edge, so Treatment Plan Proposal and Treatment Plan Status are flagged possibly_truncated - more options may exist below that these screenshots do not show. 3.PNG and 4.PNG end with about 140 px of empty background and are complete. ICONS AND FILLS: building icon on the SELECT buttons of the office, CODES and EXCLUDE TREATMENT PLANS pickers; single-person icon on Provider; person-plus icon on EXCLUDE PATIENT TYPE and TX COUNSELOR; magnifier on SEARCH; calendar icon inside the date boxes; chevron on the dropdown. Picker value boxes use a darker grey read-only fill (RGB 220,223,226) while the name, ID and date boxes and the dropdown use the lighter editable fill (RGB 241,241,241). TYPING CONVENTION (same as the other category files): a light editable box followed by a SEARCH button is recorded as text_input plus a separate button control; a grey read-only box followed by SELECT is recorded as one picker. HEADER FONT: in the grey section-header bars the capital G is drawn almost like a C, so the headers look like 'OFFICE/CROUP', 'DIACNOSED DATE RANCE' and 'NAME RANCE' at normal zoom; the glyph differs from a true C only by a slightly heavier lower-right terminal, and the normal-text radio label 'Office Group' shows a clear G, so the titles are transcribed as OFFICE/GROUP, DIAGNOSED DATE RANGE and NAME RANGE. All controls in all four reports appear enabled.

### 7.1 Treatment Plan Proposal

Screenshots: 1.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES - **Possibly truncated - more options may exist below the visible area**

> Single screenshot (1.PNG, 1366 x 589); no popup, no expanded list, no second view. Layout top to bottom: PRINT FORMAT (full width); OFFICE/GROUP (left half) beside PROVIDER (right half) with the office picker on its own full-width row underneath; DIAGNOSED DATE RANGE (left) beside NAME RANGE (right); TREATMENT PLAN ID (left) beside PHASE ID (right); ORDER ID (left) beside FINANCIAL DISCLOSURE (right); EXCLUDE PATIENT TYPE (full width); OTHER OPTIONS (full-width header, checkboxes in a two-column grid). TRUNCATION (pixel-measured): the criteria viewport ends at y=538 and the docked action bar (PRINT / PREVIEW, ADD TO MY FAVORITES) starts at y=539. OTHER OPTIONS row 1 occupies y 485-506 and row 2 y 509-531; after a 2 px separator a THIRD row starts at y=534 with the same row fill, and only its top 5 px are visible. Unlike rows 1-2 it has no centre divider (x 910-911), so it is a single full-width row. A checkbox in it would begin about 5 px below the row top, exactly where the action bar begins, so whatever it holds is completely hidden. In 3.PNG and 4.PNG, where the option list is not clipped, no such row follows the last option (the lighter empty background follows instead), so this strip is a real further row: at least one more option probably exists below the four visible checkboxes and cannot be read from this screenshot. No scrollbar is drawn. All controls are enabled (nothing is greyed out apart from the normal read-only picker boxes). This report shows no REPORT FORMAT, no CODES and no 'Include Inactive Patients' in the visible area. CLEAR CRITERIA is the slate-grey button with a refresh icon in the REPORT CRITERIA header bar; PRINT / PREVIEW has a printer icon and ADD TO MY FAVORITES a plus icon.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section at the top of the criteria panel; both radios on one row, no row label. PDF carries the blue dot. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of the panel, side by side with PROVIDER. No row label. The header glyphs look like 'OFFICE/CROUP' because the header font draws G almost like C (see observations). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on its own row directly below the Office / Office Group radios (that row spans the full panel width, under both OFFICE/GROUP and PROVIDER); blue SELECT button with a building icon to its right. 108 equals the OID shown in the title bar. The SELECT dialog and the Office Group state are not shown in any screenshot. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right half of the panel, side by side with OFFICE/GROUP. Row label 'Provider' in the left cell, read-only grey box in the right cell; blue SELECT button with a single-person icon to its right. Dialog not shown. |
| DIAGNOSED DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Left half, side by side with NAME RANGE. Light editable box with a calendar icon inside its right end. The header glyphs look like 'DIACNOSED DATE RANCE' (font draws G like C). 11/21/2026 is apparently the capture day, i.e. the field defaults to the current date. |
| DIAGNOSED DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Left half, second row. Light editable box with a calendar icon inside its right end. Same value as Start Date. |
| NAME RANGE | Start Name | Text | - | AAAAA | yes | Right half, side by side with DIAGNOSED DATE RANGE. Label in the left cell; box in the right cell has the light editable-field fill (same as the date and ID boxes, not the grey read-only picker fill) and is pre-filled with AAAAA; a blue SEARCH button follows it. The header glyphs look like 'NAME RANCE' (font draws G like C). The header does not say whose name (patient or responsible party). |
| NAME RANGE | SEARCH | Button | - | - | yes | Blue button with a magnifier icon immediately right of the Start Name box (lookup for the start of the name range). Dialog not shown. |
| NAME RANGE | End Name | Text | - | ZZZZZ | yes | Right half, second row. Light editable-field box pre-filled with ZZZZZ; a blue SEARCH button follows it. |
| NAME RANGE | SEARCH | Button | - | - | yes | Blue button with a magnifier icon immediately right of the End Name box (lookup for the end of the name range). Dialog not shown. |
| TREATMENT PLAN ID | (unlabelled) | Text | - | - | yes | Left half, side by side with PHASE ID. Single empty box with the light editable-field fill; no row label (the section header is its only label), no placeholder text, no button, no spinner arrows. |
| PHASE ID | (unlabelled) | Text | - | - | yes | Right half, side by side with TREATMENT PLAN ID. Single empty box with the light editable-field fill; no row label (the section header is its only label), no placeholder text, no button, no spinner arrows. |
| ORDER ID | (unlabelled) | Text | - | - | yes | Left half, side by side with FINANCIAL DISCLOSURE. Single empty box with the light editable-field fill; no row label (the section header is its only label), no placeholder text, no button, no spinner arrows. |
| FINANCIAL DISCLOSURE | (unlabelled) | Dropdown | - | .Treatment Plan Disclosure | yes | Right half, side by side with ORDER ID. list collapsed - other values not visible. The displayed value really begins with a period character ('.Treatment Plan Disclosure') - the dot is present in the pixels. Light fill with a chevron at the right end of the box; no row label other than the section header. |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | yes | Full-width section (no right-hand neighbour on this report). Unlabelled read-only grey box; blue SELECT button with a person-plus icon to its right. Dialog not shown. |
| OTHER OPTIONS | Include Office UCR | Checkbox | - | checked | yes | Row 1, left column of a two-column checkbox grid (full-width header). Blue tick present. |
| OTHER OPTIONS | Itemize Prices | Checkbox | - | checked | yes | Row 1, right column. Blue tick present. |
| OTHER OPTIONS | Include Completed Procedures | Checkbox | - | unchecked | yes | Row 2, left column. Empty box. |
| OTHER OPTIONS | Print Responsible Party Address | Checkbox | - | unchecked | yes | Row 2, right column. Empty box. Directly below this row the top 5 px of a further (third, full-width) row are visible before the bottom action bar covers it - its content cannot be read (see report notes). |

### 7.2 Treatment Plan Status

Screenshots: 2.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES - **Possibly truncated - more options may exist below the visible area**

> Single screenshot (2.PNG, 1366 x 582); no popup, no expanded list, no second view. Layout top to bottom: REPORT FORMAT (left half) beside PRINT FORMAT (right half); OFFICE/GROUP (left) beside PROVIDER (right) with the office picker on a full-width row underneath; DIAGNOSED DATE RANGE (full width); TREATMENT PLANS (full width, 11 radios in a 6 x 2 grid); EXCLUDE TREATMENT PLANS (left) beside CODES (right); TX COUNSELOR (left) beside EXCLUDE PATIENT TYPE (right); OTHER OPTIONS (full width, one checkbox per row). TRUNCATION (pixel-measured): the criteria viewport ends at y=536 and the docked action bar starts at y=537. OTHER OPTIONS row 1 occupies y 496-517 (22 px); row 2 ('Include internal plan id') starts at y=520 and only 17 px of it are visible, so the content is taller than the viewport and further option rows may exist below that cannot be seen. No scrollbar is drawn. This is the only report of the category with REPORT FORMAT, the TREATMENT PLANS status filter, EXCLUDE TREATMENT PLANS and TX COUNSELOR, and the only one where the CODES box shows ALL. All controls are enabled (nothing greyed out apart from the normal read-only picker boxes); CLEAR CRITERIA is the slate-grey button with a refresh icon in the REPORT CRITERIA header bar.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT FORMAT | (unlabelled) | Radio | Detail / Summary | Detail | yes | Left half of the first row, side by side with PRINT FORMAT. No row label. Detail carries the blue dot. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right half of the first row, side by side with REPORT FORMAT. No row label. PDF carries the blue dot. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half, side by side with PROVIDER. No row label. The header glyphs look like 'OFFICE/CROUP' (font draws G like C). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on its own full-width row below the Office / Office Group radios; blue SELECT button with a building icon to its right. Dialog not shown. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right half, side by side with OFFICE/GROUP. Row label 'Provider', read-only grey box; blue SELECT button with a single-person icon. Dialog not shown. |
| DIAGNOSED DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section on this report (the right part of the row is empty). Light editable box with a calendar icon inside its right end. The header glyphs look like 'DIACNOSED DATE RANCE' (font draws G like C). |
| DIAGNOSED DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Second row. Light editable box with a calendar icon inside its right end. |
| TREATMENT PLANS | (unlabelled) | Radio | ALL / Diagnosed / Accepted / Alternative / Hold / Unaccepted / Pre-Authorized Sent / Scheduled / Completed / Referred Out / Pre-Authorized Closed | ALL | yes | Full-width section. ONE group of 11 single-select radio buttons (circles, not checkboxes) laid out in a 6-column x 2-row grid with no row label; only ALL carries the blue dot. Options are listed here row by row. Row 1: ALL, Diagnosed, Accepted, Alternative, Hold, Unaccepted. Row 2: Pre-Authorized Sent, Scheduled, Completed, Referred Out, Pre-Authorized Closed (the 6th cell of row 2, under Unaccepted, is empty). The same grid would also result from a column-by-column fill, in which case the underlying order is ALL, Pre-Authorized Sent, Diagnosed, Scheduled, Accepted, Completed, Alternative, Referred Out, Hold, Pre-Authorized Closed, Unaccepted - the screenshot cannot tell the two apart. |
| EXCLUDE TREATMENT PLANS | (unlabelled) | Picker | - | None | yes | Left half, side by side with CODES. Unlabelled read-only grey box; blue SELECT button with a building icon (same icon as the office SELECT) to its right. Dialog not shown, so the selectable values are unknown. |
| CODES | (unlabelled) | Picker | - | ALL | yes | Right half, side by side with EXCLUDE TREATMENT PLANS. Unlabelled read-only grey box showing ALL; blue SELECT button with a building icon to its right. Dialog not shown. |
| TX COUNSELOR | (unlabelled) | Picker | - | ALL | yes | Left half, side by side with EXCLUDE PATIENT TYPE. Unlabelled read-only grey box showing ALL; blue SELECT button with a person-plus icon to its right. Dialog not shown. |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | yes | Right half, side by side with TX COUNSELOR. Unlabelled read-only grey box; blue SELECT button with a person-plus icon to its right. Dialog not shown. |
| OTHER OPTIONS | Include Inactive Patients | Checkbox | - | unchecked | yes | Row 1. On this report the option rows are single-column (one checkbox per full-width row, no centre divider). Empty box. |
| OTHER OPTIONS | Include internal plan id | Checkbox | - | unchecked | yes | Row 2, full-width row. Wording is lower-case exactly as shown ('internal plan id'). Empty box. The row is cut off at its lower edge by the bottom action bar: the checkbox and the text are complete, only the row's bottom padding is missing, so further rows below it cannot be ruled out. |

### 7.3 Treatment Plan Analysis

Screenshots: 3.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Single screenshot (3.PNG, 1366 x 590); no popup, no expanded list, no second view. Smallest criteria set of the category. Layout top to bottom: PRINT FORMAT (full width); OFFICE/GROUP (left half) beside PROVIDER (right half) with the office picker on a full-width row underneath; DIAGNOSED DATE RANGE (full width); EXCLUDE PATIENT TYPE (full width); OTHER OPTIONS (full width, one checkbox). The option row ends at y=395 and about 140 px of empty lighter background follow before the action bar (y=539), so nothing is clipped and the criteria are complete. No REPORT FORMAT, CODES, NAME RANGE or status filter on this report. All controls are enabled; CLEAR CRITERIA is the slate-grey button with a refresh icon in the REPORT CRITERIA header bar.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section at the top; both radios on one row, no row label. PDF carries the blue dot. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half, side by side with PROVIDER. No row label. The header glyphs look like 'OFFICE/CROUP' (font draws G like C). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on its own full-width row below the Office / Office Group radios; blue SELECT button with a building icon to its right. Dialog not shown. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right half, side by side with OFFICE/GROUP. Row label 'Provider', read-only grey box; blue SELECT button with a single-person icon. Dialog not shown. |
| DIAGNOSED DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section (the right part of the row is empty). Light editable box with a calendar icon inside its right end. The header glyphs look like 'DIACNOSED DATE RANCE' (font draws G like C). |
| DIAGNOSED DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Second row. Light editable box with a calendar icon inside its right end. |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | yes | Full-width section. Unlabelled read-only grey box; blue SELECT button with a person-plus icon to its right. Dialog not shown. |
| OTHER OPTIONS | Include Inactive Patients | Checkbox | - | unchecked | yes | Only option in this section; single full-width row. Empty box. |

### 7.4 Treatment Plan Detail

Screenshots: 4.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Single screenshot (4.PNG, 1366 x 586); no popup, no expanded list, no second view. Layout top to bottom: PRINT FORMAT (full width); OFFICE/GROUP (left half) beside PROVIDER (right half) with the office picker on a full-width row underneath; DIAGNOSED DATE RANGE (full width); CODES (left) beside EXCLUDE PATIENT TYPE (right); OTHER OPTIONS (full width, one checkbox). Same as Treatment Plan Analysis plus the CODES picker. The option row ends at y=397 and about 140 px of empty lighter background follow before the action bar (y=541), so nothing is clipped and the criteria are complete. All controls are enabled; CLEAR CRITERIA is the slate-grey button with a refresh icon in the REPORT CRITERIA header bar.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section at the top; both radios on one row, no row label. PDF carries the blue dot. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half, side by side with PROVIDER. No row label. The header glyphs look like 'OFFICE/CROUP' (font draws G like C). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on its own full-width row below the Office / Office Group radios; blue SELECT button with a building icon to its right. Dialog not shown. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right half, side by side with OFFICE/GROUP. Row label 'Provider', read-only grey box; blue SELECT button with a single-person icon. Dialog not shown. |
| DIAGNOSED DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section (the right part of the row is empty). Light editable box with a calendar icon inside its right end. The header glyphs look like 'DIACNOSED DATE RANCE' (font draws G like C). |
| DIAGNOSED DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Second row. Light editable box with a calendar icon inside its right end. |
| CODES | (unlabelled) | Picker | - | - | yes | Left half, side by side with EXCLUDE PATIENT TYPE. Unlabelled read-only grey box that is completely EMPTY on this report (interior is one uniform fill colour - no 'ALL' text, unlike the CODES picker of Treatment Plan Status); blue SELECT button with a building icon to its right. Dialog not shown; the screen does not say what an empty box means. |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | yes | Right half, side by side with CODES. Unlabelled read-only grey box; blue SELECT button with a person-plus icon to its right. Dialog not shown. |
| OTHER OPTIONS | Include Inactive Patients | Checkbox | - | unchecked | yes | Only option in this section; single full-width row. Empty box. |

## 8. Referral Reports

- Source: `refferal_reports` (8 reports transcribed) - window title: "Referral Reports"
- Reports listed in the legacy screen: Referral Production List, Referred Out List, Referral Source List, External Outgoing Referral Management, Referral Summary Report, Referral Count Summary, Internal Referral Management, External Incoming Referral Management
- Notes: All 8 screenshots (1366 px wide, 582-589 px high) are plain, unscrolled views of the same Denticon screen, each with a different report selected (1.PNG..8.PNG = the 8 listed reports in list order), so every report has exactly one screenshot and none is missing. Title bar: 'Referral Reports' at the left; 'PGID :2829 / OID :108' followed by a printer icon at the far right. Left panel header 'SELECT REPORT' lists the 8 reports as radio buttons in a 2-column x 4-row grid; the list is fully visible (uniform empty dark area below it, no scrollbar, nothing clipped). A small splitter/collapse handle (three dots) sits on the divider between the two panels. Right panel header 'REPORT CRITERIA' carries a grey 'CLEAR CRITERIA' button (refresh icon) at its right end; a fixed action bar at the bottom of the criteria panel holds the blue buttons 'PRINT / PREVIEW' (printer icon) and 'ADD TO MY FAVORITES' (plus icon). No footer text. No dropdown is expanded and no picker popup is open in any screenshot, so the value lists behind REFERRAL TYPE, SPECIALTY, REFERRED TO/BY and behind every SELECT picker (offices, office groups, providers, referred-to / referred-from / referral-out-to sources, users, procedure codes, patient types) are not visible anywhere in this category and must be captured separately. Recurring patterns: every report starts with PRINT FORMAT (PDF / Excel, PDF selected). Office scope is an Office / Office Group radio pair (Office selected) plus an unlabelled read-only box with a blue SELECT button; the box defaults to 108 (the OID in the title bar). The section is titled OFFICE/GROUP, REFERRED FROM OFFICE/GROUP or REFERRED TO OFFICE/GROUP depending on the report, and Internal Referral Management shows both From (108) and To (ALL) side by side. Referral Source List is the only report where the office radios and SELECT button are greyed out. Date sections are titled PROCEDURE DATE RANGE (Referral Production List, Referral Summary Report, Referral Count Summary), REFERRED OUT DATE RANGE (Referred Out List) or REFERRAL DATE RANGE (the three Management reports); Referral Source List has no date range. Populated date fields show 11/21/2026 (apparently the capture date) with a calendar icon inside the field; the FIRST VISIT DATE RANGE fields are empty with a grey 'Select Date' placeholder. Multi-select filters are unlabelled read-only boxes (default ALL, or None for EXCLUDE PATIENT TYPE) with a blue SELECT button whose icon varies: building = office/office group and PROCEDURE CODES, single person = provider pickers, person-plus = USERS / REFERRED TO / REFERRED FROM / REFERRAL OUT TO / EXCLUDE PATIENT TYPE. Pickers, dropdowns and the radio rows have no field label of their own (label left empty; the section header serves as the label). Referral Summary Report and Referral Count Summary show identical criteria. Status vocabularies: External Outgoing and External Incoming use a 3-column checkbox grid (All, Accepted, Rejected, Pending, Cancelled, Completed, In Progress, Not Needed, Expired; only All checked); Internal uses radios (All, Completed, Incomplete; All selected); External Incoming adds CONTACT STATUSES (All, No Response, Patient To Call, Appointment Scheduled, Referral Refused; only All checked); 'Exclude Deleted Referrals' (checked) is visible on Internal and External Incoming. Text fidelity: at this resolution the bold upper-case section-header font draws capital G almost like C (the headers look like 'OFFICE/CROUP', 'DATE RANCE', 'CROUP BY'). A pixel-level comparison of the two glyphs inside the same header (the C of CODE vs the G of RANGE in ZIP CODE RANGE; the C of OFFICE vs the G of GROUP) shows the G carries a heavier lower-right spur that the C lacks, and the regular-weight radio label 'Office Group' shows a clear G, so these headers are transcribed as GROUP / RANGE / GROUP BY. Genuine legacy typo kept as displayed: 'REFFERED TO PROVIDER' (Internal Referral Management, 7.PNG); the same wording is spelt correctly as 'REFERRED TO PROVIDER' on External Incoming (8.PNG). The header 'FIRST VISIT DATE RANGE ( LEAVE BLANK FOR ALL PATIENTS )' is displayed with spaces inside the parentheses. Truncation: the criteria content runs underneath the fixed action bar and no scrollbar is drawn anywhere. In 7.PNG (Internal Referral Management) only the top 15 px of the GROUP BY header (with its text) is visible - its controls are hidden. In 4.PNG (External Outgoing Referral Management) the third STATUSES row ends flush against the bar with no closing separator line or blank panel background, so further rows/sections may be hidden. A scrolled capture of both reports is needed to complete them. The other six reports end with blank panel background above the action bar (only 16 px of it in 8.PNG) and are complete. A sweep of every ink cluster in each criteria panel found no further controls: no right-edge checkboxes such as Page Break, no icons beside fields other than the calendar icons, and no instruction text other than the FIRST VISIT header.

### 8.1 Referral Production List

Screenshots: 1.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Shown only in 1.PNG (radio 'Referral Production List' filled, left column row 1). PROCEDURE DATE RANGE (left half) and FIRST VISIT DATE RANGE ( LEAVE BLANK FOR ALL PATIENTS ) (right half) are side by side; every other section is full width. Blank panel space is visible below OTHER OPTIONS, so the criteria are complete. No dropdown is expanded, so REFERRAL TYPE values other than ALL are unknown.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | No row label; two radios on one line. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | No row label; radios on the line above the office box. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box on the row below the Office / Office Group radios; blue "SELECT" button (building icon) to its right. 108 matches the OID shown in the title bar. |
| PROCEDURE DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Left half of the panel (side by side with FIRST VISIT DATE RANGE). Calendar icon inside the field at the right. |
| PROCEDURE DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Left half of the panel. Calendar icon inside the field at the right. |
| FIRST VISIT DATE RANGE ( LEAVE BLANK FOR ALL PATIENTS ) | Start Date | Date | - | - | yes | Right half of the panel (side by side with PROCEDURE DATE RANGE). Field is empty and shows the placeholder text "Select Date"; calendar icon inside the field at the right. The instruction to leave blank for all patients is part of the section header text. |
| FIRST VISIT DATE RANGE ( LEAVE BLANK FOR ALL PATIENTS ) | End Date | Date | - | - | yes | Right half of the panel. Field is empty and shows the placeholder text "Select Date"; calendar icon inside the field at the right. |
| ZIP CODE RANGE | From | Text | - | - | yes | Short empty text box, no placeholder; full-width section. |
| ZIP CODE RANGE | Through | Text | - | - | yes | Short empty text box, no placeholder. |
| REFERRAL TYPE | (unlabelled) | Dropdown | - | ALL | yes | No own label (section header acts as label). List collapsed - other values not visible. |
| OTHER OPTIONS | Group By Zip Code | Checkbox | - | unchecked | yes | Only control in this section. |

### 8.2 Referred Out List

Screenshots: 2.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Shown only in 2.PNG (radio 'Referred Out List' filled, left column row 2). EXCLUDE PATIENT TYPE (left) and REFERRAL OUT TO (right) are side by side; other sections are full width. Large blank area below SPECIALTY, so the criteria are complete. No popup or expanded dropdown shown, so the patient-type list, the referral-out-to list and the specialty values are not visible.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | No row label; two radios on one line. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | No row label; radios on the line above the office box. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box below the Office / Office Group radios; blue "SELECT" button (building icon) to its right. |
| REFERRED OUT DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field at the right. Full-width section. |
| REFERRED OUT DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field at the right. |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | yes | Left half of the panel (side by side with REFERRAL OUT TO). Unlabelled read-only box showing "None"; blue "SELECT" button (person-plus icon) to its right. |
| REFERRAL OUT TO | (unlabelled) | Picker | - | ALL | yes | Right half of the panel (side by side with EXCLUDE PATIENT TYPE). Unlabelled read-only box showing "ALL"; blue "SELECT" button (person-plus icon) to its right. |
| SPECIALTY | (unlabelled) | Dropdown | - | ALL | yes | No own label (section header acts as label). List collapsed - other values not visible. |

### 8.3 Referral Source List

Screenshots: 3.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Shown only in 3.PNG (radio 'Referral Source List' filled, left column row 3). This is the only report in the category where the OFFICE/GROUP controls are disabled (radios and SELECT button greyed; box keeps the value 108). No date range for this report. REFERRED TO/BY (left) and REFERRAL TYPE (right) are side by side. Large blank area below, so the criteria are complete.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | No row label; two radios on one line. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | **no (greyed)** | Greyed out / disabled for this report: both radios and their labels are light grey; Office still shows as the selected (grey-filled) radio. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | **no (greyed)** | Unlabelled read-only box still showing 108 (box and text look the same as on the other reports); the "SELECT" button (building icon) to its right is greyed out / disabled - its fill is grey instead of the blue used on every other report. |
| REFERRED TO/BY | (unlabelled) | Dropdown | - | ALL | yes | Left half of the panel (side by side with REFERRAL TYPE). No own label. List collapsed - other values not visible. |
| REFERRAL TYPE | (unlabelled) | Dropdown | - | ALL | yes | Right half of the panel (side by side with REFERRED TO/BY). No own label. List collapsed - other values not visible. |

### 8.4 External Outgoing Referral Management

Screenshots: 4.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES - **Possibly truncated - more options may exist below the visible area**

> Shown only in 4.PNG (radio 'External Outgoing Referral Management' filled, left column row 4). Side-by-side pairs: REFERRED FROM PROVIDER \| REFERRED TO, and PROCEDURE CODES \| USERS; other sections full width. POSSIBLY TRUNCATED: the third row of the STATUSES checkbox grid (In Progress / Not Needed / Expired) ends flush against the fixed bottom action bar (pixel scan: the row fills y=519-538 and the bar starts at y=539). Rows 1 and 2 are each closed by a 2 px separator line, row 3 is not, and no blank panel background is visible beneath it - every complete report in this category shows blank panel background above the bar, and 7.PNG proves the bar hides content beneath it. More rows or sections may therefore exist below (for comparison, the sibling External Incoming report shows an 'Exclude Deleted Referrals' checkbox as a 4th STATUSES row), but nothing further is visible here and nothing was assumed. No scrollbar is drawn. A scrolled capture is needed to confirm the end of this report. Statuses are listed row by row (left to right); grid position is in each control's notes. Nothing is greyed out.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | No row label; two radios on one line. |
| REFERRED FROM OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | No row label; radios on the line above the office box. Full-width section. |
| REFERRED FROM OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box below the Office / Office Group radios; blue "SELECT" button (building icon) to its right. |
| REFERRAL DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field at the right. Full-width section. |
| REFERRAL DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field at the right. |
| REFERRED FROM PROVIDER | (unlabelled) | Picker | - | ALL | yes | Left half of the panel (side by side with REFERRED TO). Unlabelled read-only box showing "ALL"; blue "SELECT" button (single-person icon) to its right. |
| REFERRED TO | (unlabelled) | Picker | - | ALL | yes | Right half of the panel (side by side with REFERRED FROM PROVIDER). Unlabelled read-only box showing "ALL"; blue "SELECT" button (person-plus icon) to its right. |
| PROCEDURE CODES | (unlabelled) | Picker | - | ALL | yes | Left half of the panel (side by side with USERS). Unlabelled read-only box showing "ALL"; blue "SELECT" button with a building icon (the same glyph as on the office SELECT button, pixel-compared) to its right. |
| USERS | (unlabelled) | Picker | - | ALL | yes | Right half of the panel (side by side with PROCEDURE CODES). Unlabelled read-only box showing "ALL"; blue "SELECT" button (person-plus icon) to its right. |
| SPECIALTY | (unlabelled) | Dropdown | - | ALL | yes | No own label (section header acts as label). Full-width section. List collapsed - other values not visible. |
| STATUSES | All | Checkbox | - | checked | yes | Checkbox grid of 3 columns x 3 visible rows; this is row 1, column 1. Only checked box; the other status checkboxes are drawn enabled (not greyed) while All is checked. |
| STATUSES | Accepted | Checkbox | - | unchecked | yes | Row 1, column 2. |
| STATUSES | Rejected | Checkbox | - | unchecked | yes | Row 1, column 3. |
| STATUSES | Pending | Checkbox | - | unchecked | yes | Row 2, column 1. |
| STATUSES | Cancelled | Checkbox | - | unchecked | yes | Row 2, column 2. |
| STATUSES | Completed | Checkbox | - | unchecked | yes | Row 2, column 3. |
| STATUSES | In Progress | Checkbox | - | unchecked | yes | Row 3, column 1. Last visible row - it ends flush against the bottom action bar. |
| STATUSES | Not Needed | Checkbox | - | unchecked | yes | Row 3, column 2. |
| STATUSES | Expired | Checkbox | - | unchecked | yes | Row 3, column 3. |

### 8.5 Referral Summary Report

Screenshots: 5.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Shown only in 5.PNG (radio 'Referral Summary Report' filled, right column row 1). All sections full width. Criteria are identical to Referral Count Summary (6.PNG). Large blank area below REFERRAL TYPE, so the criteria are complete.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | No row label; two radios on one line. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | No row label; radios on the line above the office box. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box below the Office / Office Group radios; blue "SELECT" button (building icon) to its right. |
| PROCEDURE DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section (label column is wider here than in the other reports). Calendar icon inside the field at the right. |
| PROCEDURE DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field at the right. |
| REFERRAL TYPE | (unlabelled) | Dropdown | - | ALL | yes | No own label (section header acts as label). List collapsed - other values not visible. |

### 8.6 Referral Count Summary

Screenshots: 6.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Shown only in 6.PNG (radio 'Referral Count Summary' filled, right column row 2). All sections full width. Criteria are identical to Referral Summary Report (5.PNG). Large blank area below REFERRAL TYPE, so the criteria are complete.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | No row label; two radios on one line. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | No row label; radios on the line above the office box. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box below the Office / Office Group radios; blue "SELECT" button (building icon) to its right. |
| PROCEDURE DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section (label column is wider here than in the other reports). Calendar icon inside the field at the right. |
| PROCEDURE DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field at the right. |
| REFERRAL TYPE | (unlabelled) | Dropdown | - | ALL | yes | No own label (section header acts as label). List collapsed - other values not visible. |

### 8.7 Internal Referral Management

Screenshots: 7.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES - **Possibly truncated - more options may exist below the visible area**

> Shown only in 7.PNG (radio 'Internal Referral Management' filled, right column row 3). Side-by-side pairs: REFERRED FROM OFFICE/GROUP \| REFERRED TO OFFICE/GROUP, REFERRED FROM PROVIDER \| REFFERED TO PROVIDER, PROCEDURE CODES \| USERS; other sections full width. TRUNCATED: the last thing visible is the grey section header 'GROUP BY' - only the top 15 px of the header bar with its text (pixel scan: header starts at y=521, the fixed bottom action bar, which has the same fill colour, covers everything from y=536). NONE of the GROUP BY controls are visible and anything below it is unknown, so the GROUP BY section is listed with no controls. A scrolled screenshot is needed to capture them. No scrollbar is drawn. The header 'REFFERED TO PROVIDER' is a genuine legacy typo, kept as displayed. Nothing is greyed out.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | No row label; two radios on one line. |
| REFERRED FROM OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of the panel (side by side with REFERRED TO OFFICE/GROUP). No row label. |
| REFERRED FROM OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Left half. Unlabelled read-only box below the radios showing 108; blue "SELECT" button (building icon) to its right. |
| REFERRED TO OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Right half of the panel (side by side with REFERRED FROM OFFICE/GROUP). No row label. |
| REFERRED TO OFFICE/GROUP | (unlabelled) | Picker | - | ALL | yes | Right half. Unlabelled read-only box below the radios showing "ALL"; blue "SELECT" button (building icon) to its right. |
| REFERRAL DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field at the right. Full-width section. |
| REFERRAL DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field at the right. |
| REFERRED FROM PROVIDER | (unlabelled) | Picker | - | ALL | yes | Left half of the panel (side by side with REFFERED TO PROVIDER). Unlabelled read-only box showing "ALL"; blue "SELECT" button (single-person icon) to its right. |
| REFFERED TO PROVIDER | (unlabelled) | Picker | - | ALL | yes | Right half of the panel (side by side with REFERRED FROM PROVIDER). Header is misspelt in the legacy UI exactly as transcribed (REFFERED - the glyph bitmap reads R-E-F-F-E-R-E-D, whereas the left neighbour and 8.PNG read R-E-F-E-R-R-E-D). Unlabelled read-only box showing "ALL"; blue "SELECT" button (single-person icon) to its right. |
| PROCEDURE CODES | (unlabelled) | Picker | - | ALL | yes | Left half of the panel (side by side with USERS). Unlabelled read-only box showing "ALL"; blue "SELECT" button with a building icon (the same glyph as on the office SELECT button, pixel-compared) to its right. |
| USERS | (unlabelled) | Picker | - | ALL | yes | Right half of the panel (side by side with PROCEDURE CODES). Unlabelled read-only box showing "ALL"; blue "SELECT" button (person-plus icon) to its right. |
| SPECIALTY | (unlabelled) | Dropdown | - | ALL | yes | No own label (section header acts as label). Full-width section. List collapsed - other values not visible. |
| STATUSES | (unlabelled) | Radio | All / Completed / Incomplete | All | yes | No row label; three radios on one line (first row of the section). Unlike the two External reports, statuses here are radios, not checkboxes. |
| STATUSES | Exclude Deleted Referrals | Checkbox | - | checked | yes | Second row of the STATUSES section, below the radios. |
| GROUP BY | - | - | - | - | - | (no controls) |

### 8.8 External Incoming Referral Management

Screenshots: 8.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> Shown only in 8.PNG (radio 'External Incoming Referral Management' filled, right column row 4). REFERRED TO PROVIDER (left) and REFERRED FROM (right) are side by side; other sections full width. Unlike External Outgoing / Internal, no PROCEDURE CODES, USERS or SPECIALTY sections are visible for this report, and no GROUP BY. A 16 px strip of blank panel background (y=519-534) is visible between the last CONTACT STATUSES row and the action bar - the same background that fills the empty area of the short reports - so the criteria end there and the report is treated as complete, though the margin is small. Checkboxes are listed row by row (left to right); grid position is in each control's notes. Nothing is greyed out; the individual status checkboxes are drawn enabled while All is checked.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | No row label; two radios on one line. |
| REFERRED TO OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | No row label; radios on the line above the office box. Full-width section. |
| REFERRED TO OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box below the Office / Office Group radios; blue "SELECT" button (building icon) to its right. |
| REFERRAL DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field at the right. Full-width section. |
| REFERRAL DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Calendar icon inside the field at the right. |
| REFERRED TO PROVIDER | (unlabelled) | Picker | - | ALL | yes | Left half of the panel (side by side with REFERRED FROM). Unlabelled read-only box showing "ALL"; blue "SELECT" button (single-person icon) to its right. Spelt correctly here (REFERRED), unlike in Internal Referral Management. |
| REFERRED FROM | (unlabelled) | Picker | - | ALL | yes | Right half of the panel (side by side with REFERRED TO PROVIDER). Unlabelled read-only box showing "ALL"; blue "SELECT" button (person-plus icon) to its right. |
| STATUSES | All | Checkbox | - | checked | yes | Checkbox grid of 3 columns x 3 rows plus a 4th full-width row; this is row 1, column 1. |
| STATUSES | Accepted | Checkbox | - | unchecked | yes | Row 1, column 2. |
| STATUSES | Rejected | Checkbox | - | unchecked | yes | Row 1, column 3. |
| STATUSES | Pending | Checkbox | - | unchecked | yes | Row 2, column 1. |
| STATUSES | Cancelled | Checkbox | - | unchecked | yes | Row 2, column 2. |
| STATUSES | Completed | Checkbox | - | unchecked | yes | Row 2, column 3. |
| STATUSES | In Progress | Checkbox | - | unchecked | yes | Row 3, column 1. |
| STATUSES | Not Needed | Checkbox | - | unchecked | yes | Row 3, column 2. |
| STATUSES | Expired | Checkbox | - | unchecked | yes | Row 3, column 3. |
| STATUSES | Exclude Deleted Referrals | Checkbox | - | checked | yes | Row 4 of the STATUSES section, a single full-width row below the status grid (not a status value itself). |
| CONTACT STATUSES | All | Checkbox | - | checked | yes | Checkbox grid of 3 columns x 2 rows; this is row 1, column 1. Only checked box in this section. |
| CONTACT STATUSES | No Response | Checkbox | - | unchecked | yes | Row 1, column 2. |
| CONTACT STATUSES | Patient To Call | Checkbox | - | unchecked | yes | Row 1, column 3. |
| CONTACT STATUSES | Appointment Scheduled | Checkbox | - | unchecked | yes | Row 2, column 1. |
| CONTACT STATUSES | Referral Refused | Checkbox | - | unchecked | yes | Row 2, column 2. Row 2, column 3 is an empty cell. |

## 9. Recall Reports

- Source: `recall_reports` (4 reports transcribed) - window title: "Recall Reports"
- Reports listed in the legacy screen: Procedural Recall Report, Scheduled Recall Report, Recall Due Report, Post-Op Report
- Notes: Third-reader verified inventory. All 4 original screenshots (1363-1366 px wide, 584-589 px high), the 8 pre-rendered zooms and additional tight crops (prefix c in the zoom folder) were read. Readers A and B agreed on every report, section, control, option list, default value, enabled state and truncation flag (4 reports, 30 sections, 48 controls); their differences were note wording only. Every point was nevertheless re-checked on the pixels: the selected list radio of every file, blue-mark detection for every selected criteria radio and ticked checkbox, the fill colour of every button and input box, glyph dumps of every field value and of the disputed header letters, and a per-row scan of every pixel that differs from its row background in the criteria panel, the left panel, the title bar and the panel edges. Nothing exists beyond the controls listed here: no tiny right-edge checkbox (no 'Page Break'), no extra column of controls, no greyed-out control, no dropdown, no instruction / warning / legend text, no scrollbar on either panel and no footer text (below the panels 1.PNG, 3.PNG and 4.PNG show only a text-free light-grey frame strip a few pixels high; 2.PNG ends at the panels).  COVERAGE: 4 screenshots = 4 reports, each selected exactly once, in list order: 1.PNG = Procedural Recall Report, 2.PNG = Scheduled Recall Report, 3.PNG = Recall Due Report, 4.PNG = Post-Op Report. All four are the same two-panel screen in its default state - no popup, no expanded picker, no scrolled second view, no foreign screen. Consequently the contents of every SELECT dialog (offices, office groups, patient types, providers, hygienists, recall procedure codes) are NOT documented by these screenshots.  SCREEN CHROME (identical in all 4): dark title bar with 'Recall Reports' at the left and 'PGID :2829 / OID :108' followed by a white printer icon at the far right (the icon has no text, so it is not listed under actions). Left panel header 'SELECT REPORT' with exactly four radio entries in a 2 x 2 grid (left column: Procedural Recall Report, Scheduled Recall Report; right column: Recall Due Report, Post-Op Report); the rest of the left panel is a uniform empty dark area, so the list is neither clipped nor scrollable. A small splitter / collapse handle (three dots) sits on the border between the two panels. Right panel header 'REPORT CRITERIA' carries the CLEAR CRITERIA button (refresh icon) at its right end; it is grey in all four screenshots while every other button is blue, which appears to be its normal styling rather than a disabled state (not provable from the pixels). A fixed action bar at the bottom right of the criteria panel holds the blue buttons PRINT / PREVIEW (printer icon) and ADD TO MY FAVORITES (plus icon); the left part of that bar is empty.  RECURRING PATTERN: PRINT FORMAT (PDF / Excel, default PDF) and OFFICE/GROUP (Office / Office Group radios, default Office, plus an unlabelled picker showing 108 = the OID of the title bar) are identical in all four reports. Every report has one date-range section with Start Date and End Date (both 11/21/2026 = the capture day, i.e. the default appears to be today), an EXCLUDE PATIENT TYPE picker (default None) and an Include Inactive Patients checkbox (unchecked). DIFFERENCES: the date section is PROCEDURE DATE RANGE in Procedural Recall and Post-Op, SCHEDULED DATE RANGE in Scheduled Recall, and RECALL DATE RANGE with an extra radio pair Recall Date Range / No Recall Date in Recall Due. The provider filter is TRANSACTION PROVIDER in the two procedure-date reports and PREFERRED PROVIDER plus PREFERRED HYGIENIST in Scheduled Recall and Recall Due (all default ALL). RECALL PROCEDURE CODES (default ALL) and the Age Range checkbox (checked) with From 0 / To 999 exist in the three recall reports but not in Post-Op. SCHEDULED/NOT SCHEDULED (ALL / Scheduled / Not Scheduled, default ALL) exists only in Recall Due. This category has no REPORT FORMAT, GROUP BY or SORT BY section.  CONVENTIONS: none of the pickers has a row label of its own - the section header is the only caption - so label is left empty, as for unlabelled radio groups. A picker is a read-only box (grey fill 220,223,226) plus a blue SELECT button; the date boxes and the From / To boxes use the lighter editable fill (241,241,241). SELECT icons: building for the office picker and for RECALL PROCEDURE CODES, person-plus for EXCLUDE PATIENT TYPE, single person for the provider and hygienist pickers. Sections that sit side by side are listed row by row, left then right. All controls are enabled in every screenshot.  FONT CAVEAT: the bold uppercase header font draws G almost like C at this resolution, so the header pixels look like 'OFFICE/CROUP', '... DATE RANCE' and 'PREFERRED HYCIENIST'. A glyph-level comparison shows the small G spur at the lower right of that letter, which the genuine C in OFFICE, PROCEDURE, RECALL and SCHEDULED lacks, and the regular-weight radio label 'Office Group' under the first of those headers shows a clear capital G with its crossbar, so the titles are transcribed as OFFICE/GROUP, PROCEDURE / SCHEDULED / RECALL DATE RANGE and PREFERRED HYGIENIST.  TRUNCATION: only 3.PNG (Recall Due Report) is clipped - its last visible row, Include Inactive Patients, is cut by the bottom action bar after 13 of its 20 px and no scrollbar is drawn, so any control below that row would be invisible. The other three screenshots end with uniform blank panel above the action bar.

### 9.1 Procedural Recall Report

Screenshots: 1.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 1.PNG only (first radio of the left list column is the filled one), default state. Row layout: PRINT FORMAT (full width); OFFICE/GROUP (full width: radio row, then picker row); PROCEDURE DATE RANGE (full width: Start Date row, End Date row); EXCLUDE PATIENT TYPE (left half) \| TRANSACTION PROVIDER (right half); RECALL PROCEDURE CODES (full width); OTHER OPTIONS (full width: Age Range / From / To row, then Include Inactive Patients row). About 65 px of uniform blank panel follow the last row down to the action bar and there is no scrollbar, so nothing is clipped. No greyed-out control, no dropdown, no popup; the contents of the four SELECT dialogs (offices / office groups, patient types, providers, recall procedure codes) were not captured.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row, no row label. PDF carries the blue dot (pixel-checked). |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Two radios on one row, no row label. Office carries the blue dot. Presumably switches the picker on the next row between offices and office groups (dependency not visible). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on its own row directly below the Office / Office Group radios; blue SELECT button with a building icon to its right. 108 is the office id shown as 'OID :108' in the title bar (current office). |
| PROCEDURE DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Row label in the left cell; date box in the next cell (starts about one third across the panel) with a calendar icon inside the box at its right end. Light editable fill. 11/21/2026 is the capture day (the screenshot files are dated Nov 21, 2026), so the default appears to be today's date (inference). |
| PROCEDURE DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Row directly below Start Date, same layout: label cell, then date box with a calendar icon inside it. Same default as Start Date. |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | yes | LEFT half of a side-by-side row (TRANSACTION PROVIDER is the right half). No row label - the section header is the only caption. Read-only grey box showing None; blue SELECT button with a person-plus icon to its right. |
| TRANSACTION PROVIDER | (unlabelled) | Picker | - | ALL | yes | RIGHT half of the side-by-side row beside EXCLUDE PATIENT TYPE. No row label - the section header is the only caption. Read-only grey box showing ALL; blue SELECT button with a single-person icon to its right. |
| RECALL PROCEDURE CODES | (unlabelled) | Picker | - | ALL | yes | FULL-WIDTH section in this report (in the Scheduled Recall and Recall Due reports the same section is a right-half column). No row label. Wide read-only grey box (a little over half of the panel width) showing ALL; blue SELECT button with a building icon (same icon as the office SELECT button) to its right. |
| OTHER OPTIONS | Age Range | Checkbox | - | checked | yes | First cell of a row that also holds the From and To boxes (thin vertical divider after the checkbox cell). Blue tick present (pixel-checked). |
| OTHER OPTIONS | From | Number | - | 0 | yes | Same row as the Age Range checkbox: label 'From', then a box with the light editable fill showing 0 (lower age bound). Its state when Age Range is unticked is not shown. |
| OTHER OPTIONS | To | Number | - | 999 | yes | Same row, right of From: label 'To', then a box with the light editable fill showing 999 (upper age bound). Its state when Age Range is unticked is not shown. |
| OTHER OPTIONS | Include Inactive Patients | Checkbox | - | unchecked | yes | Own row below the Age Range row; empty box (no tick). Last control of the report - blank panel follows. |

### 9.2 Scheduled Recall Report

Screenshots: 2.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 2.PNG only (second radio of the left list column is the filled one), default state. Row layout: PRINT FORMAT (full width); OFFICE/GROUP (full width: radio row, then picker row); SCHEDULED DATE RANGE (full width: Start Date row, End Date row); EXCLUDE PATIENT TYPE (left half) \| PREFERRED PROVIDER (right half); PREFERRED HYGIENIST (left half) \| RECALL PROCEDURE CODES (right half); OTHER OPTIONS (full width: Age Range / From / To row, then Include Inactive Patients row). Sections are listed row by row, left then right. Compared with the Procedural Recall Report: the date section is SCHEDULED DATE RANGE, the provider filter is PREFERRED PROVIDER instead of TRANSACTION PROVIDER, a PREFERRED HYGIENIST picker is added and RECALL PROCEDURE CODES becomes a right-half column. About 65 px of uniform blank panel follow the last row and there is no scrollbar, so nothing is clipped. No greyed-out control, no dropdown, no popup; the contents of the five SELECT dialogs were not captured.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row, no row label. PDF carries the blue dot (pixel-checked). |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Two radios on one row, no row label. Office carries the blue dot. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on its own row directly below the Office / Office Group radios; blue SELECT button with a building icon to its right. 108 is the office id shown as 'OID :108' in the title bar (current office). |
| SCHEDULED DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Row label in the left cell; date box in the next cell (starts about one third across the panel) with a calendar icon inside the box at its right end. Light editable fill. 11/21/2026 is the capture day, so the default appears to be today's date (inference). |
| SCHEDULED DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Row directly below Start Date, same layout: label cell, then date box with a calendar icon inside it. Same default as Start Date. |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | yes | LEFT half of the first side-by-side row (PREFERRED PROVIDER is the right half). No row label - the section header is the only caption. Read-only grey box showing None; blue SELECT button with a person-plus icon to its right. |
| PREFERRED PROVIDER | (unlabelled) | Picker | - | ALL | yes | RIGHT half of the first side-by-side row beside EXCLUDE PATIENT TYPE. No row label. Read-only grey box showing ALL; blue SELECT button with a single-person icon to its right. |
| PREFERRED HYGIENIST | (unlabelled) | Picker | - | ALL | yes | LEFT half of the second side-by-side row (RECALL PROCEDURE CODES is the right half). No row label. Read-only grey box showing ALL; blue SELECT button with a single-person icon to its right. The header pixels look like 'PREFERRED HYCIENIST' because the bold header font draws G almost like C; the glyph has the G spur (see observations). |
| RECALL PROCEDURE CODES | (unlabelled) | Picker | - | ALL | yes | RIGHT half of the second side-by-side row beside PREFERRED HYGIENIST. No row label. Read-only grey box showing ALL; blue SELECT button with a building icon (same icon as the office SELECT button) to its right. |
| OTHER OPTIONS | Age Range | Checkbox | - | checked | yes | First cell of a row that also holds the From and To boxes (thin vertical divider after the checkbox cell). Blue tick present (pixel-checked). |
| OTHER OPTIONS | From | Number | - | 0 | yes | Same row as the Age Range checkbox: label 'From', then a box with the light editable fill showing 0. Its state when Age Range is unticked is not shown. |
| OTHER OPTIONS | To | Number | - | 999 | yes | Same row, right of From: label 'To', then a box with the light editable fill showing 999. Its state when Age Range is unticked is not shown. |
| OTHER OPTIONS | Include Inactive Patients | Checkbox | - | unchecked | yes | Own row below the Age Range row; empty box (no tick). Last control of the report - blank panel follows. |

### 9.3 Recall Due Report

Screenshots: 3.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES - **Possibly truncated - more options may exist below the visible area**

> 3.PNG only (first radio of the right list column is the filled one), default state. Largest criteria set of the category. Row layout: PRINT FORMAT (full width); OFFICE/GROUP (full width: radio row, then picker row); RECALL DATE RANGE (full width: radio row, Start Date row, End Date row); EXCLUDE PATIENT TYPE (left half) \| PREFERRED PROVIDER (right half); PREFERRED HYGIENIST (left half) \| RECALL PROCEDURE CODES (right half); SCHEDULED/NOT SCHEDULED (full width); OTHER OPTIONS (full width). Sections are listed row by row, left then right. TRUNCATION (bottom edge): the criteria content is taller than the visible criteria area - the last visible row (Include Inactive Patients, second row of OTHER OPTIONS) is cut by the fixed bottom action bar after 13 of its 20 px, which hides the bottom of its checkbox, the row's bottom border and anything that might follow. No scrollbar is drawn (the right edge of the criteria panel is pixel-identical to 2.PNG) and the top of the panel is complete (PRINT FORMAT header fully visible), so the hidden part is below. In the two sibling reports that have the Age Range row (1.PNG, 2.PNG) Include Inactive Patients is the last row of OTHER OPTIONS, so probably nothing follows here either, but that cannot be confirmed from this screenshot. No greyed-out control, no dropdown, no popup; the contents of the five SELECT dialogs were not captured.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row, no row label. PDF carries the blue dot (pixel-checked). |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Two radios on one row, no row label. Office carries the blue dot. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on its own row directly below the Office / Office Group radios; blue SELECT button with a building icon to its right. 108 is the office id shown as 'OID :108' in the title bar (current office). |
| RECALL DATE RANGE | (unlabelled) | Radio | Recall Date Range / No Recall Date | Recall Date Range | yes | Two radios on the first row of the section, above the Start Date / End Date rows; no row label. Recall Date Range carries the blue dot. Only this report has this radio pair. What happens to the two date boxes when No Recall Date is chosen is not shown. |
| RECALL DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Second row of the section. Row label in the left cell; date box in the next cell (starts about one third across the panel) with a calendar icon inside the box at its right end. Light editable fill, shown enabled while Recall Date Range is selected. 11/21/2026 is the capture day, so the default appears to be today's date (inference). |
| RECALL DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Third row of the section, same layout as Start Date (calendar icon inside the box). Shown enabled while Recall Date Range is selected. |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | yes | LEFT half of the first side-by-side row (PREFERRED PROVIDER is the right half). No row label - the section header is the only caption. Read-only grey box showing None; blue SELECT button with a person-plus icon to its right. |
| PREFERRED PROVIDER | (unlabelled) | Picker | - | ALL | yes | RIGHT half of the first side-by-side row beside EXCLUDE PATIENT TYPE. No row label. Read-only grey box showing ALL; blue SELECT button with a single-person icon to its right. |
| PREFERRED HYGIENIST | (unlabelled) | Picker | - | ALL | yes | LEFT half of the second side-by-side row (RECALL PROCEDURE CODES is the right half). No row label. Read-only grey box showing ALL; blue SELECT button with a single-person icon to its right. The header pixels look like 'PREFERRED HYCIENIST' because the bold header font draws G almost like C; the glyph has the G spur (see observations). |
| RECALL PROCEDURE CODES | (unlabelled) | Picker | - | ALL | yes | RIGHT half of the second side-by-side row beside PREFERRED HYGIENIST. No row label. Read-only grey box showing ALL; blue SELECT button with a building icon (same icon as the office SELECT button) to its right. |
| SCHEDULED/NOT SCHEDULED | (unlabelled) | Radio | ALL / Scheduled / Not Scheduled | ALL | yes | Full-width section; three radios on one row, no row label. ALL carries the blue dot. Only this report has this section. |
| OTHER OPTIONS | Age Range | Checkbox | - | checked | yes | First cell of a row that also holds the From and To boxes (thin vertical divider after the checkbox cell). Blue tick present (pixel-checked). |
| OTHER OPTIONS | From | Number | - | 0 | yes | Same row as the Age Range checkbox: label 'From', then a box with the light editable fill showing 0. Its state when Age Range is unticked is not shown. |
| OTHER OPTIONS | To | Number | - | 999 | yes | Same row, right of From: label 'To', then a box with the light editable fill showing 999. Its state when Age Range is unticked is not shown. |
| OTHER OPTIONS | Include Inactive Patients | Checkbox | - | unchecked | yes | Own row below the Age Range row. PARTIALLY CLIPPED: only the top 13 px of this 20 px row are visible before the bottom action bar covers it. The label text is fully readable and the top 9 of the checkbox's 12 pixel rows are visible; they are empty, including the rows where a tick would be drawn, so it is unchecked. Whether it is the last control cannot be seen. |

### 9.4 Post-Op Report

Screenshots: 4.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 4.PNG only (second radio of the right list column is the filled one), default state. Smallest criteria set of the category. Row layout: PRINT FORMAT (full width); OFFICE/GROUP (full width: radio row, then picker row); PROCEDURE DATE RANGE (full width: Start Date row, End Date row); EXCLUDE PATIENT TYPE (left half) \| TRANSACTION PROVIDER (right half); OTHER OPTIONS (full width, one row). Same criteria as the Procedural Recall Report minus the RECALL PROCEDURE CODES section and minus the Age Range / From / To row. About 150 px of uniform blank panel follow the last row down to the action bar and there is no scrollbar, so nothing is clipped. No greyed-out control, no dropdown, no popup; the contents of the three SELECT dialogs were not captured.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row, no row label. PDF carries the blue dot (pixel-checked). |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Two radios on one row, no row label. Office carries the blue dot. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on its own row directly below the Office / Office Group radios; blue SELECT button with a building icon to its right. 108 is the office id shown as 'OID :108' in the title bar (current office). |
| PROCEDURE DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Row label in the left cell; date box in the next cell (starts about one third across the panel) with a calendar icon inside the box at its right end. Light editable fill. 11/21/2026 is the capture day, so the default appears to be today's date (inference). |
| PROCEDURE DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Row directly below Start Date, same layout: label cell, then date box with a calendar icon inside it. Same default as Start Date. |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | yes | LEFT half of a side-by-side row (TRANSACTION PROVIDER is the right half). No row label - the section header is the only caption. Read-only grey box showing None; blue SELECT button with a person-plus icon to its right. |
| TRANSACTION PROVIDER | (unlabelled) | Picker | - | ALL | yes | RIGHT half of the side-by-side row beside EXCLUDE PATIENT TYPE. No row label. Read-only grey box showing ALL; blue SELECT button with a single-person icon to its right. |
| OTHER OPTIONS | Include Inactive Patients | Checkbox | - | unchecked | yes | Only control of OTHER OPTIONS in this report - there is NO Age Range / From / To row here (unlike the other three reports). Empty box (no tick); a large blank area follows. |

## 10. Ortho Reports

- Source: `ortho_reports` (5 reports transcribed) - window title: "Ortho Reports"
- Reports listed in the legacy screen: Ortho Compliance Report, Ortho Daily Journal, Patients by Ortho Status with Time in Treatment, Ortho Report, Missing Ortho Visits
- Notes: Third-reader verified inventory. All 5 original screenshots (1366 px wide, 580-594 px high), the 10 pre-rendered zooms and about 45 additional tight crops (prefix c in the zoom folder) were read. Readers A and B agreed on every report, section, control, option list, default value, enabled state and truncation flag (5 reports, 24 sections, 36 controls); their differences were note wording only. Every point was nevertheless re-checked on the pixels: the selected list radio of every file, blue-mark counts for every selected criteria radio and ticked checkbox, a colour census of every blue button, a fill-colour census of every input box, and a cluster map of every pixel in each criteria panel that is not one of the flat fill colours. Nothing exists beyond the controls listed here: no tiny right-edge checkbox (no 'Page Break'), no second column of controls, no greyed-out control, no instruction / warning / legend text, no dropdown, no listbox, no scrollbar on either panel and no footer text. COVERAGE: 5 screenshots = 5 reports, each selected exactly once, in list order: 1.PNG = Ortho Compliance Report, 2.PNG = Ortho Daily Journal, 3.PNG = Patients by Ortho Status with Time in Treatment, 4.PNG = Ortho Report, 5.PNG = Missing Ortho Visits. Every listed report has a screenshot. All five are the normal two-panel screen - no popup, no expanded dropdown, no opened picker, no scrolled second view, no foreign screen - so the dialogs behind the SELECT buttons (office / office group, provider, appointment provider, visit doctor, ortho status) and therefore the list of ortho status values are NOT documented by this category. Only one state per report was captured, so the non-default states (Excel, Office Group, unticked MISSING boxes) are not shown either. TITLE BAR (identical in all 5): 'Ortho Reports' at the left; 'PGID :2829 / OID :108' followed by a white printer icon (icon only, no text) at the far right. LEFT PANEL 'SELECT REPORT': 5 radio entries in a two-column bordered grid - left column: Ortho Compliance Report, Ortho Daily Journal, Patients by Ortho Status with Time in Treatment (the label wraps onto two lines); right column: Ortho Report, Missing Ortho Visits (the third right-hand cell is empty). The rest of the panel is uniform empty navy down to the window edge, so the list is NOT scrollable or clipped. A splitter / collapse grip (three dots in a notch) sits between the two panels. RIGHT PANEL 'REPORT CRITERIA': the grey-styled CLEAR CRITERIA button (refresh icon) sits at the right end of the blue header bar - same grey look in all 5 files and in the other report categories, so it is its normal style, not a disabled state; the blue PRINT / PREVIEW (printer icon) and ADD TO MY FAVORITES (plus icon) buttons sit in a grey action bar pinned to the bottom of the panel. Every criteria panel ends well above that bar, so no report is truncated. RECURRING PATTERNS: PRINT FORMAT (PDF / Excel, PDF selected) is on all 5 reports - first and full-width on four of them, top-right beside MISSING on Missing Ortho Visits. OFFICE/GROUP (Office / Office Group radios, Office selected, plus an unlabelled read-only box showing 108 with a building-icon SELECT button) is on all 5 reports. Provider-type pickers (row label + read-only box ALL + person-icon SELECT) exist only on Ortho Compliance Report (Provider), Ortho Daily Journal (Provider) and Missing Ortho Visits (Appointment Provider and Visit Doctor). The ORTHO STATUS picker (unlabelled box ALL + building-icon SELECT) exists on Patients by Ortho Status with Time in Treatment and on Ortho Report; these two reports are identical except for the second date header (PATIENT LAST VISIT vs PATIENT FIRST VISIT) and the date-box contents. None of the five reports has REPORT FORMAT, GROUP BY, SORT BY, PATIENT TYPE or OTHER OPTIONS sections. FILLS: picker boxes use the darker read-only grey fill (RGB 220,223,226); date boxes and the weeks box use the lighter editable fill (RGB 241,241,241). All labels are black and all SELECT buttons are blue, i.e. every control is enabled. DATE CONTENTS: Ortho Daily Journal, Ortho Report and Missing Ortho Visits show 11/21/2026 in every date box - the day the screenshots were captured, so these fields default to the current date (inference). Patients by Ortho Status with Time in Treatment shows all four date boxes blank with the placeholder 'Select Date'. TEXT-RENDERING CAVEAT: the small bold caps font of the grey section headers draws a capital G almost like a C, so the pixels look like 'OFFICE/CROUP', 'MISSINC' and 'APPOINTMENT DATE RANCE'. A pixel dump shows the disputed glyph is asymmetric (heavier lower-right terminal) while the true C in OFFICE and in SINCE is symmetric, the mixed-case radio label clearly reads 'Office Group', and the other verified categories carry the same header; the titles are therefore recorded as OFFICE/GROUP, MISSING and APPOINTMENT DATE RANGE. The value font draws '11' with flat-topped ones (can look like 'TI'); the dates read 11/21/2026. MINOR CAPTURE DIFFERENCES: 4.PNG includes a 5 px strip of the host application's bright-blue top bar above the title bar (white fragments, no legible text) and 5.PNG a 2 px line of it; 2.PNG is cropped about 4 px tighter at the top; 1.PNG, 4.PNG and 5.PNG end with a thin grey window-edge strip below the panels. None of this carries report content.

### 10.1 Ortho Compliance Report

Screenshots: 1.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 1.PNG only (first radio of the left list column is the filled one). Layout: PRINT FORMAT full width; OFFICE/GROUP (left half) beside PROVIDER (right half) with the office picker row spanning the full width underneath; NUMBER OF WEEKS SINCE LAST VISIT full width. This report has no date range - its only filter besides office and provider is the weeks threshold (shown as 6). The criteria end at the weeks input; a uniform empty area follows down to the action bar and there is no scrollbar, so nothing is clipped. Nothing is greyed out.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section, first in the panel. Two radios on one row, no row label. PDF carries the blue dot; Excel is enabled (white radio, black label). The Excel state was not captured. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of the panel (PROVIDER section is to its right). Two radios on one row, no row label. Office carries the blue dot; Office Group is enabled (white radio, black label). The Office Group state was not captured. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | On its own row directly below the OFFICE/GROUP + PROVIDER row; the row spans the full panel width. Unlabelled read-only grey box; blue SELECT button with a building icon to its right. 108 = current office id (same number as 'OID :108' in the title bar). The office / office-group selection dialog is not shown in any screenshot. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right half of the panel, beside OFFICE/GROUP. Row label 'Provider' in a label cell, then a read-only grey box showing ALL and a blue SELECT button with a person icon. The selection dialog is not shown in any screenshot. |
| NUMBER OF WEEKS SINCE LAST VISIT | (unlabelled) | Number | - | 6 | yes | Full-width section, last in the panel. Single unlabelled input box at the left (the section header is its only label); light editable fill (not the grey read-only picker fill); the value 6 is right-aligned. No spinner arrows, no unit text and no button beside it; the rest of the row is empty. |

### 10.2 Ortho Daily Journal

Screenshots: 2.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 2.PNG only (second radio of the left list column is the filled one). Same layout as Ortho Compliance Report except that the last section is VISIT DATE (Start Date / End Date, both 11/21/2026) instead of NUMBER OF WEEKS SINCE LAST VISIT. The criteria end at the End Date row; a uniform empty area follows down to the action bar and there is no scrollbar, so nothing is clipped. Nothing is greyed out. 2.PNG is cropped about 4 px tighter at the top than the other files (the top of the printer icon is cut; all title-bar text is complete).

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section, first in the panel. Two radios on one row, no row label. PDF carries the blue dot; Excel is enabled (white radio, black label). The Excel state was not captured. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of the panel (PROVIDER section is to its right). Two radios on one row, no row label. Office carries the blue dot; Office Group is enabled (white radio, black label). The Office Group state was not captured. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | On its own row directly below the OFFICE/GROUP + PROVIDER row; the row spans the full panel width. Unlabelled read-only grey box; blue SELECT button with a building icon to its right. 108 = current office id (same number as 'OID :108' in the title bar). The office / office-group selection dialog is not shown in any screenshot. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right half of the panel, beside OFFICE/GROUP. Row label 'Provider' in a label cell, then a read-only grey box showing ALL and a blue SELECT button with a person icon. The selection dialog is not shown in any screenshot. |
| VISIT DATE | Start Date | Date | - | 11/21/2026 | yes | Full-width section, last in the panel; the controls sit in its left part and the right part of both rows is empty. Label cell at the left, then a date box (light editable fill) with a blue calendar icon inside its right edge; format MM/DD/YYYY. 11/21/2026 is the day the screenshots were captured, i.e. the field is pre-filled with the current date (inference). |
| VISIT DATE | End Date | Date | - | 11/21/2026 | yes | Row directly below Start Date, same layout: date box with a blue calendar icon; pre-filled with the capture-day date. |

### 10.3 Patients by Ortho Status with Time in Treatment

Screenshots: 3.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 3.PNG only (third radio of the left list column is the filled one; in the list the name wraps onto two lines: 'Patients by Ortho Status with Time in' / 'Treatment'). Layout: PRINT FORMAT full width; OFFICE/GROUP full width (this report has no PROVIDER section); ORTHO START DATE (left half) beside PATIENT LAST VISIT (right half); ORTHO STATUS full width. All four date boxes are blank and show the grey placeholder 'Select Date', whereas the same four boxes on Ortho Report (4.PNG) show 11/21/2026. The screenshot cannot prove whether blank is this report's default or the criteria had been cleared before the capture; the other four screenshots look like untouched defaults, so blank is probably the default (inference). The right-hand date header reads PATIENT LAST VISIT here but PATIENT FIRST VISIT on Ortho Report - both confirmed at 12x zoom. A uniform empty area follows ORTHO STATUS down to the action bar and there is no scrollbar, so nothing is clipped. Nothing is greyed out.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section, first in the panel. Two radios on one row, no row label. PDF carries the blue dot; Excel is enabled (white radio, black label). The Excel state was not captured. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section on this report (no PROVIDER section beside it). Two radios on one row, no row label. Office carries the blue dot; Office Group is enabled (white radio, black label). The Office Group state was not captured. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | On the row directly below the Office / Office Group radios. Unlabelled read-only grey box; blue SELECT button with a building icon to its right. 108 = current office id (same number as 'OID :108' in the title bar). The office / office-group selection dialog is not shown in any screenshot. |
| ORTHO START DATE | Start Date | Date | - | - | yes | Left half of the panel (PATIENT LAST VISIT section is to its right). Label cell at the left, then a date box (light editable fill) with a blue calendar icon inside its right edge. The box is EMPTY: it shows only the lighter grey placeholder text 'Select Date'. |
| ORTHO START DATE | End Date | Date | - | - | yes | Row directly below Start Date, same layout. EMPTY: shows only the grey placeholder text 'Select Date' plus the blue calendar icon. |
| PATIENT LAST VISIT | Start Date | Date | - | - | yes | Right half of the panel, beside ORTHO START DATE. Label cell at the left, then a date box (light editable fill) with a blue calendar icon inside its right edge. The box is EMPTY: it shows only the lighter grey placeholder text 'Select Date'. |
| PATIENT LAST VISIT | End Date | Date | - | - | yes | Row directly below Start Date, same layout. EMPTY: shows only the grey placeholder text 'Select Date' plus the blue calendar icon. |
| ORTHO STATUS | (unlabelled) | Picker | - | ALL | yes | Full-width section, last in the panel. Unlabelled read-only grey box showing ALL (the section header is its only label); blue SELECT button to its right with the same building icon as the office SELECT button (not the person icon used by provider pickers). The list of ortho status values is not visible (dialog not opened in any screenshot). |

### 10.4 Ortho Report

Screenshots: 4.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 4.PNG only (first radio of the right list column is the filled one). Same layout as Patients by Ortho Status with Time in Treatment, but the right-hand date section is titled PATIENT FIRST VISIT (not PATIENT LAST VISIT) and all four date boxes are pre-filled with 11/21/2026. No PROVIDER section. A uniform empty area follows ORTHO STATUS down to the action bar and there is no scrollbar, so nothing is clipped. Nothing is greyed out. Only in this file a 5 px strip of the host application's bright-blue top bar is visible above the title bar (white fragments of clipped elements, no legible text); it is outside the report screen.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section, first in the panel. Two radios on one row, no row label. PDF carries the blue dot; Excel is enabled (white radio, black label). The Excel state was not captured. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section on this report (no PROVIDER section beside it). Two radios on one row, no row label. Office carries the blue dot; Office Group is enabled (white radio, black label). The Office Group state was not captured. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | On the row directly below the Office / Office Group radios. Unlabelled read-only grey box; blue SELECT button with a building icon to its right. 108 = current office id (same number as 'OID :108' in the title bar). The office / office-group selection dialog is not shown in any screenshot. |
| ORTHO START DATE | Start Date | Date | - | 11/21/2026 | yes | Left half of the panel (PATIENT FIRST VISIT section is to its right). Label cell at the left, then a date box (light editable fill) with a blue calendar icon inside its right edge; format MM/DD/YYYY. 11/21/2026 is the day the screenshots were captured, i.e. the field is pre-filled with the current date (inference). |
| ORTHO START DATE | End Date | Date | - | 11/21/2026 | yes | Row directly below Start Date, same layout: date box with a blue calendar icon; pre-filled with the capture-day date. |
| PATIENT FIRST VISIT | Start Date | Date | - | 11/21/2026 | yes | Right half of the panel, beside ORTHO START DATE. Label cell at the left, then a date box (light editable fill) with a blue calendar icon inside its right edge; format MM/DD/YYYY. 11/21/2026 is the day the screenshots were captured, i.e. the field is pre-filled with the current date (inference). |
| PATIENT FIRST VISIT | End Date | Date | - | 11/21/2026 | yes | Row directly below Start Date, same layout: date box with a blue calendar icon; pre-filled with the capture-day date. |
| ORTHO STATUS | (unlabelled) | Picker | - | ALL | yes | Full-width section, last in the panel. Unlabelled read-only grey box showing ALL (the section header is its only label); blue SELECT button to its right with the same building icon as the office SELECT button (not the person icon used by provider pickers). The list of ortho status values is not visible (dialog not opened in any screenshot). |

### 10.5 Missing Ortho Visits

Screenshots: 5.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 5.PNG only (second radio of the right list column is the filled one). Layout: row 1 = MISSING (left half) beside PRINT FORMAT (right half) - the only ortho report where PRINT FORMAT is not the first, full-width section; row 2 = OFFICE/GROUP (left half) beside APPOINTMENT PROVIDER (right half) with the office picker row spanning the full width underneath; then APPOINTMENT DATE RANGE (full width) and VISIT DOCTOR (full width). It is the only ortho report with checkboxes (MISSING: Ledger Transaction and Ortho Visit, both ticked) and with two separate provider pickers (Appointment Provider and Visit Doctor, both ALL). A uniform empty area follows VISIT DOCTOR down to the action bar and there is no scrollbar, so nothing is clipped. Nothing is greyed out. The header pixels look like 'MISSINC', 'OFFICE/CROUP' and 'APPOINTMENT DATE RANCE' because the header font draws G almost like C at this size (see observations); they are MISSING, OFFICE/GROUP and APPOINTMENT DATE RANGE.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| MISSING | Ledger Transaction | Checkbox | - | checked | yes | Left half of the panel, first row (PRINT FORMAT section is to its right). First of two checkboxes on one line; ticked (blue check mark). |
| MISSING | Ortho Visit | Checkbox | - | checked | yes | Same line, to the right of Ledger Transaction; ticked (blue check mark). |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right half of the panel, first row, beside MISSING - on this report PRINT FORMAT is neither full-width nor the first section. Two radios on one row, no row label. PDF carries the blue dot; Excel is enabled (white radio, black label). The Excel state was not captured. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of the panel (APPOINTMENT PROVIDER section is to its right). Two radios on one row, no row label. Office carries the blue dot; Office Group is enabled (white radio, black label). The Office Group state was not captured. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | On its own row directly below the OFFICE/GROUP + APPOINTMENT PROVIDER row; the row spans the full panel width. Unlabelled read-only grey box; blue SELECT button with a building icon to its right. 108 = current office id (same number as 'OID :108' in the title bar). The office / office-group selection dialog is not shown in any screenshot. |
| APPOINTMENT PROVIDER | Appointment Provider | Picker | - | ALL | yes | Right half of the panel, second row, beside OFFICE/GROUP. Row label 'Appointment Provider' in a label cell, then a read-only grey box showing ALL and a blue SELECT button with a person icon. The selection dialog is not shown in any screenshot. |
| APPOINTMENT DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section; the controls sit in its left part and the right part of both rows is empty. Label cell at the left, then a date box (light editable fill) with a blue calendar icon inside its right edge; format MM/DD/YYYY. 11/21/2026 is the day the screenshots were captured, i.e. the field is pre-filled with the current date (inference). |
| APPOINTMENT DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Row directly below Start Date, same layout: date box with a blue calendar icon; pre-filled with the capture-day date. |
| VISIT DOCTOR | Visit Doctor | Picker | - | ALL | yes | Full-width section, last in the panel; the controls sit in its left part and the rest of the row is empty. Row label 'Visit Doctor' in a label cell, then a read-only grey box showing ALL and a blue SELECT button with a person icon. The selection dialog is not shown in any screenshot. |

## 11. Statements

- Source: `statements_reports` (1 reports transcribed) - window title: "Statements"
- Reports listed in the legacy screen: -
- Notes: Third-reader verified inventory. The original screenshot, both pre-rendered crops and 23 extra crops (prefix c3_ in the zoom folder: 21 crops at 1.15x-12x plus two contrast-equalised halves) were read, and whole-image pixel scans were run (clusters of dark text/icon pixels, light boxes and borders, uniformity of every blank cell and margin, fill colours of every input, button, checkbox and radio). SCREEN TYPE: this category has a single screenshot (1.PNG) and it is NOT the standard report-selector screen - there is no left 'SELECT REPORT' radio list and no right 'REPORT CRITERIA' panel with grey section-header bars. report_list is therefore EMPTY ON PURPOSE (no list exists on screen) and reports_without_screenshot is empty; the whole screen is transcribed as the single entry reports[0], named 'Statements' after the title bar. It is a statement-run form (batch billing statements selected by responsible party) with two print outputs (PRINT STATEMENT REPORT, PRINT STATEMENTS), one maintenance action (UPDATE STATEMENT DATES), a FINANCE CHARGES button and a disabled PAPER STATEMENT SENT button under the row label 'Print Reports'. The pre-rendered crops simply split this form down the middle: 1_list.png = left table + red texts, 1_criteria.png = right table + footer buttons + title-bar identifiers. READERS: A and B agreed on the screen type, the empty report_list, the report name, every visible text, every default, the single disabled control, the three actions and the not-truncated verdict; all of it was re-checked on the pixels and confirmed. They differed only in modelling: (a) A recorded the row labels 'Responsible Party Range' and 'Print Reports' as static_text controls while B kept them in notes - kept as static_text here because they are visible captions that are not the label of any single control (hence 26 controls); (b) the info icon label (A a bracketed description, B 'i') - recorded with an empty label, as in the other categories, since the icon carries no text; (c) row 4 of the right table - the checkbox label is the exact text before the inline dropdown and the dropdown is labelled with the trailing text 'days.' (B had put a '[dropdown]' placeholder inside the checkbox label and left the dropdown unlabelled); (d) the wording of the placeholder section titles - shortened to '[no header] LEFT TABLE', '[no header] RIGHT TABLE', '[no header] BELOW THE TABLES'. TITLE BAR: 'Statements' at left; identifiers 'PGID :2829 / OID :108' at right, followed by an unlabeled white printer icon at the far right edge (not part of the form and not counted as an action). DEFAULTS AS DISPLAYED: Statement Date 11/20/2026 (both readers assumed this was the capture date, but it is one day BEFORE the 2026-11-21 capture date indicated by the file timestamp and by the 11/21/2026 date defaults on the other categories' screenshots taken the same evening - so it is apparently not a plain current-date default and its rule is unknown), Start Name AAAAA, End Name ZZZZZ, Account Balance Over 5.00, sort radio = 'Sort by Resp.Party Lastname', days dropdown = 0, Exclude Responsible Party Type = None, Last Statement Date blank, Last Close Out Date 12/31/2019. Checkboxes: only 'Exclude accounts where patient portion is paid and insurance portion is expected' is checked; the other seven are unchecked (Include Credit Balances, Suppress Aging, Hide Insurance Shares, Hide Credit Card Section, Exclude accounts where statement was sent within last ... days., Exclude patients Sent to Collection., Exclude Responsible Parties where the Patient has an open claim). ENABLED STATES: the only greyed-out control is the PAPER STATEMENT SENT button (grey fill RGB 176,183,190 versus blue RGB 0,108,187 on the seven other buttons); the 'None' box of the picker is a read-only grey box (RGB 225,225,225, grey text) but its SELECT button is enabled; the date, name and balance boxes and the days dropdown have the light editable fill (RGB 241,241,241) with black text. ABSENT: no office/group, provider, date-range, print-format, report-format, group-by or page-break controls exist on this screen; the office context presumably comes from the OID in the title bar (the red note speaks of 'respective Office Statements') - inference. MISSING MESSAGE INPUT: the red hint 'Maximum 100 characters per message' is shown without any message text box; the light-element scan found only six input boxes on the whole screen (date, Start Name, End Name, balance, days dropdown, None) and the area around and below the hint is pixel-uniform, so the statement message field(s) the hint refers to are not rendered in this state - their number and labels cannot be taken from this screenshot and should be confirmed on the live legacy screen. NOT SHOWN: the dialogs behind FINANCE CHARGES, the two SEARCH buttons and the SELECT button, the option list of the days dropdown and the tooltip of the info icon. CAPTURE: 1366x586 px; nothing lies below the container (blank page from y 479) except a uniform 3 px grey line on the last pixel rows (y 583-585, identical across all 1366 px - a frame border, not a scrollbar); no scrollbars, popups or expanded dropdowns. All text was legible after zooming; no uncertain readings remain.

### 11.1 Statements

Screenshots: 1.PNG - Actions: PRINT STATEMENT REPORT, PRINT STATEMENTS, UPDATE STATEMENT DATES

> 1.PNG only. NOT the usual SELECT REPORT / REPORT CRITERIA layout: the screenshot (1366x586 px) shows one single-purpose statement-run form with no report radio list, no 'REPORT CRITERIA' heading and no grey section-header bars. The name 'Statements' is the title-bar text (there is no filled report radio). The three section titles are descriptive placeholders prefixed '[no header]', NOT on-screen text. Layout: one light-grey rounded container holding two side-by-side bordered tables whose rows are a label cell plus a value cell, with alternating row shading. LEFT TABLE, 7 rows: (1) Statement Date + info icon - date box 11/20/2026 with calendar icon, FINANCE CHARGES button; (2) Responsible Party Range - Start Name AAAAA + SEARCH, End Name ZZZZZ + SEARCH; (3) Account Balance Over - 5.00; (4) checkbox Include Credit Balances - radio Sort by Resp.Party Lastname (filled); (5) checkbox Suppress Aging - radio Sort by Resp.Party ID; (6) checkbox Hide Insurance Shares - empty value cell; (7) checkbox Hide Credit Card Section - empty value cell. RIGHT TABLE, 8 rows: (1) Last Statement Date - blank; (2) Last Close Out Date - 12/31/2019; (3) Print Reports - greyed PAPER STATEMENT SENT button; (4)-(7) four full-width 'Exclude ...' checkbox rows (the first with an inline days dropdown showing 0; the second is the only checked box); (8) Exclude Responsible Party Type - read-only box 'None' + SELECT button. BELOW THE TABLES: red text 'Maximum 100 characters per message' (no message input is rendered), a thin horizontal rule, the red 'Note: ...' line, then a blue-grey footer strip with three right-aligned blue (enabled) buttons, left to right: PRINT STATEMENT REPORT (printer icon), PRINT STATEMENTS (printer icon), UPDATE STATEMENT DATES (document icon) - these are recorded as the actions. There is NO CLEAR CRITERIA, PRINT / PREVIEW or ADD TO MY FAVORITES button, and no print-format, report-format, office/group, provider or date-range selector on this screen. Only PAPER STATEMENT SENT is greyed out. Not truncated: the rounded bottom edge of the container and the footer strip are fully visible, the page below is blank and there is no scrollbar; the only open point is the missing message input(s) implied by the red hint. Verified by whole-image pixel scans: every cluster of text/icon pixels and every box or line on the screen corresponds to an element listed here (the only input boxes drawn are the date box, the two name boxes, the balance box, the days dropdown and the 'None' box). No dropdown is expanded and no popup is open.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| [no header] LEFT TABLE | Statement Date | Date | - | 11/20/2026 | yes | Row 1 of the left table (label cell + value cell). Editable date box (light fill, black text) with a calendar icon inside its right end. An info icon follows the label text (next control) and the FINANCE CHARGES button sits in the same value cell, to the right of the box. The value reads 11/20/2026 (confirmed at 12x zoom). It is one day EARLIER than the screenshot file's timestamp (2026-11-21) and than the 11/21/2026 date defaults on the other categories' screenshots captured the same evening, so it is apparently NOT a plain current-date default; what it represents (previous day, a stored statement date, or a page opened a day earlier) cannot be determined from the screenshot. |
| [no header] LEFT TABLE | (unlabelled) | Other | - | - | yes | Info icon: small blue circle with a white 'i' immediately after the row label 'Statement Date' (presumably a tooltip); its tooltip text is not visible in the screenshot. The icon carries no text, hence the empty label. |
| [no header] LEFT TABLE | FINANCE CHARGES | Button | - | - | yes | Blue (enabled) button with a white document icon, in the value cell of the Statement Date row, to the right of the date box. What it opens or runs is not shown in the screenshot. |
| [no header] LEFT TABLE | Responsible Party Range | Text note | - | - | yes | Row label in the label cell of row 2; it captions the Start Name / End Name pair in the value cell of the same row (a caption, not an instruction - recorded so the text is not lost, because the two inputs carry their own sub-labels). |
| [no header] LEFT TABLE | Start Name | Text | - | AAAAA | yes | Row 2 (row label 'Responsible Party Range'), first of two stacked lines in the value cell: sub-label 'Start Name', then the box, then a SEARCH button (next control). Editable-looking box: same light fill (RGB 241,241,241) and black text as the date and balance inputs, unlike the grey read-only box of the picker in the right table. |
| [no header] LEFT TABLE | SEARCH | Button | - | - | yes | Blue (enabled) button with a magnifier icon immediately right of the Start Name box (lookup for the start of the responsible party range). Dialog not shown. |
| [no header] LEFT TABLE | End Name | Text | - | ZZZZZ | yes | Row 2 (row label 'Responsible Party Range'), second stacked line directly under Start Name: sub-label 'End Name', then the box, then a SEARCH button (next control). Same editable-looking box as Start Name. |
| [no header] LEFT TABLE | SEARCH | Button | - | - | yes | Blue (enabled) button with a magnifier icon immediately right of the End Name box (lookup for the end of the responsible party range). Dialog not shown. |
| [no header] LEFT TABLE | Account Balance Over | Number | - | 5.00 | yes | Row 3: label in the label cell, editable box in the value cell; the value is right-aligned; no currency symbol and no spinner arrows. |
| [no header] LEFT TABLE | Include Credit Balances | Checkbox | - | unchecked | yes | Row 4, in the label (left) cell. The value cell of the same row holds the radio 'Sort by Resp.Party Lastname'. |
| [no header] LEFT TABLE | (unlabelled) | Radio | Sort by Resp.Party Lastname / Sort by Resp.Party ID | Sort by Resp.Party Lastname | yes | No group label. The two radios are stacked one per row in the value (right) cells of rows 4 and 5, beside the 'Include Credit Balances' and 'Suppress Aging' checkboxes; exactly one is filled (the first), so they form one group. Text is displayed with no space after 'Resp.' and with 'Lastname' as one word. This is the only sort choice on the screen. |
| [no header] LEFT TABLE | Suppress Aging | Checkbox | - | unchecked | yes | Row 5, in the label (left) cell. The value cell of the same row holds the radio 'Sort by Resp.Party ID'. |
| [no header] LEFT TABLE | Hide Insurance Shares | Checkbox | - | unchecked | yes | Row 6, in the label (left) cell. The value cell of this row is empty (pixel-uniform). |
| [no header] LEFT TABLE | Hide Credit Card Section | Checkbox | - | unchecked | yes | Row 7 (last row of the left table), in the label (left) cell. The value cell of this row is empty (pixel-uniform). |
| [no header] RIGHT TABLE | Last Statement Date | Text note | - | - | yes | Row 1 of the right table: read-only display row (label cell + value cell). The value cell is completely blank (pixel-uniform): no date is shown and no input box is drawn. |
| [no header] RIGHT TABLE | Last Close Out Date | Text note | - | 12/31/2019 | yes | Row 2: read-only display row; the value 12/31/2019 is plain text in the value cell (no input box). |
| [no header] RIGHT TABLE | Print Reports | Text note | - | - | yes | Row label in the label cell of row 3; the value cell holds only the PAPER STATEMENT SENT button (next control). Recorded so the caption is not lost (the button has its own text). |
| [no header] RIGHT TABLE | PAPER STATEMENT SENT | Button | - | - | **no (greyed)** | Row 3 (row label 'Print Reports'). GREYED OUT: grey fill (RGB 176,183,190) with pale text and a pale document icon, unlike every other button on the screen (blue, RGB 0,108,187), i.e. disabled in this state. The condition that enables it and what it does are not visible. |
| [no header] RIGHT TABLE | Exclude accounts where statement was sent within last | Checkbox | - | unchecked | yes | Row 4, full-width row (no separate label cell). The sentence continues inline: checkbox text, then a small dropdown showing 0 (next control), then the text 'days.' - the whole line reads 'Exclude accounts where statement was sent within last [0] days.' |
| [no header] RIGHT TABLE | days. | Dropdown | - | 0 | yes | list collapsed - other values not visible. Small inline dropdown (shows 0 with a down chevron) embedded in the row-4 sentence between 'within last' and the trailing text 'days.'; the label given here is that trailing text (the dropdown has no leading label of its own). It looks enabled (light fill, black text) even though its checkbox is unchecked. |
| [no header] RIGHT TABLE | Exclude accounts where patient portion is paid and insurance portion is expected | Checkbox | - | checked | yes | Row 5, full-width row. The ONLY checked checkbox on the whole screen (blue tick). No trailing period. |
| [no header] RIGHT TABLE | Exclude patients Sent to Collection. | Checkbox | - | unchecked | yes | Row 6, full-width row. The text ends with a period; 'Sent' and 'Collection' are capitalised as displayed. |
| [no header] RIGHT TABLE | Exclude Responsible Parties where the Patient has an open claim | Checkbox | - | unchecked | yes | Row 7, full-width row. No trailing period. |
| [no header] RIGHT TABLE | Exclude Responsible Party Type | Picker | - | None | yes | Row 8 (last row of the right table): label in the label cell; the value cell has a read-only grey box (fill RGB 225,225,225, grey text) showing None; button immediately to its right: SELECT (blue = enabled, user-plus icon: person silhouette with a + sign). The selection dialog and the list of responsible party types are not shown in the screenshot. |
| [no header] BELOW THE TABLES | Maximum 100 characters per message | Text note | - | - | yes | Red text, left-aligned, directly under the left table. NO message input is visible anywhere on the screen: a whole-image scan found only six input boxes (date, Start Name, End Name, balance, days dropdown, None) and the area to the right of and below this text is pixel-uniform. The statement message field(s) this hint refers to are therefore not rendered in this screenshot (possibly hidden or conditional) - their number and labels are unknown. |
| [no header] BELOW THE TABLES | Note: Please update Statement Dates after Printing respective Office Statements. | Text note | - | - | yes | Red text, left-aligned, below a thin horizontal rule that spans the container and directly above the footer button strip. |

## 12. Lists - Patient

- Source: `patients_list_reports` (12 reports transcribed) - window title: "Patient/Resp. Party List Reports"
- Reports listed in the legacy screen: Patient List, Patient List - New Patient, Patients Seen, Patient's Notes, Patient List - Grouped By, Patients on Payment Plan, Online Registered Patients, Update Patient Insurance (Conversion) List - By Appointment, Responsible Party List, Responsible Party - Statements Sent, Responsible Party - Sent to Collection, Responsible Party - Email Statement Error Report
- Notes: Third-reader verified inventory. All 13 original screenshots, all 26 pre-rendered zooms and additional tight crops were read. Readers A and B agreed on every report, section, control, option list, default value and enabled state (84 controls each; they differed only in report order and note wording); every point was nevertheless re-checked on the pixels. One typing change was made by the third reader: the Patient box + SEARCH button of Patient's Notes is recorded as text_input + button instead of one picker (see TYPING CONVENTION), which gives 85 controls. An automated pixel scan of every criteria panel (every pixel that is not one of the panel's flat fill colours, clustered into boxes) found nothing beyond the controls listed here: no tiny right-edge checkbox (no 'Page Break'), no extra column, no instruction / warning / legend text, no scrollbar, no footer text. COVERAGE: 13 screenshots = 12 reports, every report of the list is shown selected at least once (blue radio dot): 1.PNG and 9.PNG = Update Patient Insurance (Conversion) List - By Appointment (pixel-identical apart from a 6 px vertical shift - a duplicate capture); 2 = Patient List; 3 = Patient List - New Patient; 4 = Patients Seen; 5 = Patient's Notes; 6 = Patient List - Grouped By; 7 = Patients on Payment Plan; 8 = Online Registered Patients; 10 = Responsible Party List; 11 = Responsible Party - Sent to Collection; 12 = Responsible Party - Statements Sent; 13 = Responsible Party - Email Statement Error Report. All 13 are the normal two-panel screen: no popup, no expanded dropdown, no scrolled second view, no foreign screen. TITLE BAR (identical in all 13): 'Patient/Resp. Party List Reports' at the left; 'PGID :2829 / OID :108' followed by a white printer icon (icon only, no text) at the far right. LEFT PANEL: this category has NO 'SELECT REPORT' header. The panel holds two groups, each with its own blue header bar and its own two-column grid of radio cells: 'PATIENT LIST' (8 reports, 4 rows x 2 columns) and 'RESPONSIBLE PARTY LIST' (4 reports, 2 rows x 2 columns). report_list is given group by group - PATIENT LIST left column top-to-bottom, then its right column, then RESPONSIBLE PARTY LIST left column, then its right column - so the first 8 names belong to PATIENT LIST and the last 4 to RESPONSIBLE PARTY LIST. Two names wrap onto a second line inside their cell ('Update Patient Insurance (Conversion)' / 'List - By Appointment' and 'Responsible Party - Email Statement' / 'Error Report'). Each group ends with a thin divider line carrying a small blue '...' handle tab, and a vertical three-dot grip sits in a notch on the border between the left and right panels (collapse / resize handles). Below the second group the panel is uniform empty navy down to the window edge, so the list is NOT scrollable or clipped. RIGHT PANEL 'REPORT CRITERIA': the grey-styled CLEAR CRITERIA button (refresh icon) sits at the right end of the blue header bar - it is grey in all 13 screenshots, which is its normal styling (the other category inventories record the same), not a disabled state; the action bar at the bottom of the panel holds the blue PRINT / PREVIEW (printer icon) and ADD TO MY FAVORITES (plus icon) buttons, right-aligned. All three actions appear for every report. NO TRUNCATION: in every screenshot the first section header is fully visible under the panel border, the last criteria row is followed by blank panel space down to the action bar, and no scrollbar is drawn on either panel. RECURRING PATTERNS: (1) PRINT FORMAT = PDF (selected) / Excel on every report - either the full-width first section, or the right column of the first row beside REPORT BY, PLAN TYPE or STATEMENT TYPE. (2) OFFICE/GROUP = radios Office (selected) / Office Group, both ENABLED, then an unlabelled read-only box '108' (the OID of the title bar) with a blue, enabled SELECT button - on every report except Patient's Notes (in ledger_reports.json the same Office Group radio and SELECT button are greyed out; here they are not). In two-column layouts the OFFICE/GROUP header and radios occupy the left column beside PROVIDER / PREFERRED PROVIDER and the office box + SELECT row follows beneath, across the panel. (3) Every date box shows 11/21/2026 = the capture day (MM/DD/YYYY, calendar icon inside the box), i.e. dates appear to default to today. (4) Unlabelled controls: many sections have no row label, the grey section header being the only caption (all radio rows, the office box, INCLUDE / EXCLUDE PATIENT TYPE, EXCLUDE RESPONSIBLE PARTY TYPE, PRINT NOTES, and the REPORT BY, SEX, SPECIALTY and CREDIT CARD ON FILE dropdowns); labelled rows are Provider, Preferred Provider, Patient, Start Date / End Date, Statement Date, Statement Sent Date, From / To and Start / End. (5) SELECT button icons: building for the office box and for PRINT NOTES; single person for Provider / Preferred Provider; person-plus for INCLUDE / EXCLUDE PATIENT TYPE and EXCLUDE RESPONSIBLE PARTY TYPE; the SEARCH button has a magnifier. TYPING CONVENTION: read-only picker boxes are drawn with a grey fill (RGB 220,223,226); editable inputs (date boxes, dropdowns, Age From / To, balance Start / End and the Patient box of Patient's Notes) with a lighter fill (RGB 241,241,241). Grey box + SELECT is recorded as ONE picker with the button described in its notes; the light Patient box + SEARCH is recorded as text_input plus a separate SEARCH button, the same convention as in daily_reports.json, ledger_reports.json and management_reports.json. DISABLED CONTROLS: the only greyed-out items in the category are the 'Email' and 'Both' options of STATEMENT TYPE in Responsible Party - Statements Sent (12.PNG); the radio group is recorded enabled = true with the partial disabling described in its notes. Every SELECT / SEARCH button and every other radio, checkbox, dropdown and input is drawn in its normal enabled style (button fills sampled: all blue). NOT CAPTURED (needs follow-up screenshots): every dropdown is collapsed, so only the current value is known - REPORT BY ('Appointment' in Patient List - New Patient, 'Day' in Patients Seen, 'Attached to Provider' in Patient List - Grouped By, 'Created Date' in Responsible Party List), SEX ('------'), SPECIALTY ('ALL') and CREDIT CARD ON FILE ('Both'). No dialog is shown, so the contents behind the office, office-group, provider, patient-type, responsible-party-type and PRINT NOTES SELECT buttons and behind the patient SEARCH button are unknown. Whether changing REPORT BY (or REPORT TYPE / PLAN TYPE / Office Group) alters the sections below it cannot be told from these screenshots. ABSENT in this category: GROUP BY and SORT BY sections, listboxes, Page Break checkboxes, free-standing instruction text. Only two checkboxes exist: 'Include Patients With No Email' (Patient List, checked) and 'Include Inactive Accounts (All patients inactive in account)' (Responsible Party List, unchecked). RENDERING CAVEAT: in the bold section-header font the capital G shows almost no crossbar at this resolution, so the headers look like 'OFFICE/CROUP', 'ACE RANCE', 'DATE RANCE', 'APPOINTMENT DATE RANCE', 'CREATED DATE RANCE', 'PLAN SETUP DATE RANCE' and 'ACCOUNT BALANCE RANCE'; a native-resolution pixel dump shows a heavier lower-right terminal on those glyphs than on the true C of 'OFFICE', and they are transcribed OFFICE/GROUP, AGE RANGE, DATE RANGE and so on (same reading as in the other category inventories). Screenshot sizes: 1366x598, 1364x590, 1366x592, 1366x587, 1366x589, 1366x583, 1366x582, 1366x583, 1366x582, 1366x579, 1366x590, 1366x586 and 1365x581 px (for 1.PNG to 13.PNG); the thin grey strip at the very bottom of some screenshots is the window edge and carries no text. No reading needed a '[?]' marker.

### 12.1 Update Patient Insurance (Conversion) List - By Appointment

Screenshots: 1.PNG, 9.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 1.PNG and 9.PNG both show this report selected, in the same default state: after allowing for a 6 px vertical shift the two screenshots are pixel-identical over the whole window content (list and criteria), so 9.PNG adds nothing to 1.PNG. Four full-width sections: PRINT FORMAT; REPORT TYPE; OFFICE/GROUP; APPOINTMENT DATE RANGE. No provider, patient-type or other-options section. In the report list the name wraps onto two lines ('Update Patient Insurance (Conversion)' / 'List - By Appointment'). Nothing greyed out. Nothing is clipped: the last criteria row is followed by blank panel space down to the action bar (PRINT / PREVIEW, ADD TO MY FAVORITES), and there is no scrollbar.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | First section of the panel, full width. Two radios on one row, no row label. PDF carries the blue dot; both options enabled. |
| REPORT TYPE | (unlabelled) | Radio | Summary / Detail | Summary | yes | Full-width section. Two radios on one row, no row label. Summary carries the blue dot; both options enabled. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section. Two radios on one row, no row label, directly under the header. Office carries the blue dot; Office Group is enabled too (black label, normal empty radio). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box (grey read-only fill) on its own row directly below the Office / Office Group radios. Shows the office id 108 (same number as 'OID :108' in the title bar). Button to its right: blue 'SELECT' with a small building icon (enabled). The office / office-group selection dialog is not shown in any screenshot. |
| APPOINTMENT DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box (light editable-field fill) in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Value equals the capture day (default appears to be today). |
| APPOINTMENT DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box (light editable-field fill) in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Same value as Start Date (the capture day). |

### 12.2 Patient List

Screenshots: 2.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 2.PNG only (default state). Layout: PRINT FORMAT (full width); then four two-column rows - PATIENT STATUS \| PATIENT TYPE; OFFICE/GROUP \| PROVIDER (the office box + SELECT row sits beneath, across the panel); INCLUDE PATIENT TYPE \| EXCLUDE PATIENT TYPE; SEX \| AGE RANGE; then OTHER OPTIONS (full width). Richest criteria set of the category and the only report with PATIENT TYPE, SEX and AGE RANGE. No date range, REPORT BY or REPORT TYPE section. The header reads like 'ACE RANCE' in the screenshot font (capital G drawn like C) and is transcribed AGE RANGE. Nothing greyed out. Nothing is clipped: the last criteria row is followed by blank panel space down to the action bar (PRINT / PREVIEW, ADD TO MY FAVORITES), and there is no scrollbar.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | First section of the panel, full width. Two radios on one row, no row label. PDF carries the blue dot; both options enabled. |
| PATIENT STATUS | (unlabelled) | Radio | Active / Inactive / Both | Active | yes | Left column, side by side with PATIENT TYPE. Three radios on one row, no row label. Active carries the blue dot; all options enabled. |
| PATIENT TYPE | (unlabelled) | Radio | Both / General / Ortho | Both | yes | Right column, side by side with PATIENT STATUS. Three radios on one row, no row label. Both carries the blue dot; all options enabled. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column, side by side with PROVIDER. Two radios on one row, no row label, directly under the header. Office carries the blue dot; Office Group is enabled too (black label, normal empty radio). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box (grey read-only fill) on its own row directly below the Office / Office Group radios; that row runs across the full panel width (its right half, under the PROVIDER row, is empty). Shows the office id 108 (same number as 'OID :108' in the title bar). Button to its right: blue 'SELECT' with a small building icon (enabled). The office / office-group selection dialog is not shown in any screenshot. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column. Row label 'Provider' in the left cell; read-only box (grey read-only fill) showing ALL in the right cell; button to its right: blue 'SELECT' with a single-person icon (enabled). The provider selection dialog is not shown in any screenshot. |
| INCLUDE PATIENT TYPE | (unlabelled) | Picker | - | ALL | yes | Left column, side by side with EXCLUDE PATIENT TYPE. No row label - the section header is the only caption. Read-only box (grey read-only fill) showing ALL; button to its right: blue 'SELECT' with a person-plus icon (enabled). The patient-type selection dialog is not shown in any screenshot. |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | yes | Right column, side by side with INCLUDE PATIENT TYPE. No row label - the section header is the only caption. Read-only box (grey read-only fill) showing None (mixed case as displayed); button to its right: blue 'SELECT' with a person-plus icon (enabled). The patient-type selection dialog is not shown in any screenshot. |
| SEX | (unlabelled) | Dropdown | - | ------ | yes | Left column, side by side with AGE RANGE. No row label - the section header is the only caption. Collapsed dropdown (chevron at the right) whose displayed value is six hyphens (counted on the pixels), i.e. a blank / no-selection placeholder. list collapsed - other values not visible. |
| AGE RANGE | From | Number | - | - | yes | Right column, side by side with SEX. Label 'From' followed by a small EMPTY editable box (light editable-field fill); the 'To' label and box follow on the same row. No placeholder, unit or spinner shown - presumably a numeric age (inference; field type not verifiable from the screenshot). |
| AGE RANGE | To | Number | - | - | yes | Right column, same row as From. Label 'To' followed by a small EMPTY editable box identical to the From box. No placeholder, unit or spinner shown - presumably a numeric age (inference). |
| OTHER OPTIONS | Include Patients With No Email | Checkbox | - | checked | yes | Full-width section holding this single checkbox. Ticked (blue check mark) in the captured default state. |

### 12.3 Patient List - New Patient

Screenshots: 3.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 3.PNG only (state: REPORT BY = 'Appointment'; its other values were not captured). Layout: REPORT BY \| PRINT FORMAT side by side; then OFFICE/GROUP and APPOINTMENT DATE RANGE, each full width. No provider, patient-type or other-options section. Nothing greyed out. Nothing is clipped: the last criteria row is followed by blank panel space down to the action bar (PRINT / PREVIEW, ADD TO MY FAVORITES), and there is no scrollbar.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT BY | (unlabelled) | Dropdown | - | Appointment | yes | Left column of the first row, side by side with PRINT FORMAT. No row label - the section header is the only caption. Collapsed dropdown (chevron at the right). list collapsed - other values not visible. The date section below is titled APPOINTMENT DATE RANGE, which matches this value, so that title may change with the selection (inference - no other value was captured). |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right column of the first row, side by side with REPORT BY. Two radios on one row, no row label. PDF carries the blue dot; both options enabled. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section. Two radios on one row, no row label, directly under the header. Office carries the blue dot; Office Group is enabled too (black label, normal empty radio). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box (grey read-only fill) on its own row directly below the Office / Office Group radios. Shows the office id 108 (same number as 'OID :108' in the title bar). Button to its right: blue 'SELECT' with a small building icon (enabled). The office / office-group selection dialog is not shown in any screenshot. |
| APPOINTMENT DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box (light editable-field fill) in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Value equals the capture day (default appears to be today). |
| APPOINTMENT DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box (light editable-field fill) in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Same value as Start Date (the capture day). |

### 12.4 Patients Seen

Screenshots: 4.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 4.PNG only (state: REPORT BY = 'Day'; its other values were not captured). Layout: REPORT BY \| PRINT FORMAT; REPORT TYPE (full width); OFFICE/GROUP \| PROVIDER (the office box + SELECT row sits beneath, across the panel); DATE RANGE (full width) with its own Transaction Date / DOS Date radio row above the two date rows. Nothing greyed out. Nothing is clipped: the last criteria row is followed by blank panel space down to the action bar (PRINT / PREVIEW, ADD TO MY FAVORITES), and there is no scrollbar.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT BY | (unlabelled) | Dropdown | - | Day | yes | Left column of the first row, side by side with PRINT FORMAT. No row label - the section header is the only caption. Collapsed dropdown (chevron at the right). list collapsed - other values not visible. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right column of the first row, side by side with REPORT BY. Two radios on one row, no row label. PDF carries the blue dot; both options enabled. |
| REPORT TYPE | (unlabelled) | Radio | Summary / Detail | Summary | yes | Full-width section. Two radios on one row, no row label. Summary carries the blue dot; both options enabled. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column, side by side with PROVIDER. Two radios on one row, no row label, directly under the header. Office carries the blue dot; Office Group is enabled too (black label, normal empty radio). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box (grey read-only fill) on its own row directly below the Office / Office Group radios; that row runs across the full panel width (its right half, under the PROVIDER row, is empty). Shows the office id 108 (same number as 'OID :108' in the title bar). Button to its right: blue 'SELECT' with a small building icon (enabled). The office / office-group selection dialog is not shown in any screenshot. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column. Row label 'Provider' in the left cell; read-only box (grey read-only fill) showing ALL in the right cell; button to its right: blue 'SELECT' with a single-person icon (enabled). The provider selection dialog is not shown in any screenshot. |
| DATE RANGE | (unlabelled) | Radio | Transaction Date / DOS Date | Transaction Date | yes | Unlabelled radio row directly under the DATE RANGE header, above the Start Date / End Date rows; it selects which date the range applies to. Transaction Date carries the blue dot; both options enabled. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box (light editable-field fill) in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Value equals the capture day (default appears to be today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box (light editable-field fill) in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Same value as Start Date (the capture day). |

### 12.5 Patient's Notes

Screenshots: 5.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 5.PNG only (default state, no patient chosen). Four full-width sections: PRINT FORMAT; PRINT NOTES; PATIENT; DATE RANGE. The ONLY report of the category with no OFFICE/GROUP section - it is driven by a single patient lookup instead. Nothing greyed out. Nothing is clipped: the last criteria row is followed by blank panel space down to the action bar (PRINT / PREVIEW, ADD TO MY FAVORITES), and there is no scrollbar.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | First section of the panel, full width. Two radios on one row, no row label. PDF carries the blue dot; both options enabled. |
| PRINT NOTES | (unlabelled) | Picker | - | ALL | yes | Full-width section. No row label - the section header is the only caption. Read-only box (grey read-only fill) showing ALL; button to its right: blue 'SELECT' with the same small building-style icon as the office SELECT button of the other reports (enabled). The selection dialog is not shown in any screenshot, so the selectable values (presumably note types / categories - inference) are unknown. |
| PATIENT | Patient | Text | - | - | yes | Full-width section. Row label 'Patient' in the left cell; wide EMPTY box in the right cell. The box has the light editable-field fill (RGB 241,241,241 - same as the date boxes), not the grey read-only fill (RGB 220,223,226) of the PRINT NOTES box, so it is recorded as text_input with its SEARCH button as a separate control (same convention as the Patient lookups in daily_reports.json and management_reports.json; readers A and B had typed box + button as one picker). Whether the box accepts typing or is filled only through SEARCH cannot be told from the screenshot. |
| PATIENT | SEARCH | Button | - | - | yes | Blue enabled button with a magnifier icon immediately right of the Patient box (patient search / lookup). The dialog it opens is not shown in any screenshot. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box (light editable-field fill) in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Value equals the capture day (default appears to be today). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box (light editable-field fill) in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Same value as Start Date (the capture day). |

### 12.6 Patient List - Grouped By

Screenshots: 6.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 6.PNG only (state: REPORT BY = 'Attached to Provider'; its other values were not captured). Layout: REPORT BY \| PRINT FORMAT; PATIENT STATUS (full width); OFFICE/GROUP \| PROVIDER (the office box + SELECT row sits beneath, across the panel); INCLUDE PATIENT TYPE \| EXCLUDE PATIENT TYPE; SPECIALTY (full width). No date range, PATIENT TYPE, SEX, AGE RANGE or OTHER OPTIONS section. Nothing greyed out. Nothing is clipped: the last criteria row is followed by blank panel space down to the action bar (PRINT / PREVIEW, ADD TO MY FAVORITES), and there is no scrollbar.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT BY | (unlabelled) | Dropdown | - | Attached to Provider | yes | Left column of the first row, side by side with PRINT FORMAT. No row label - the section header is the only caption. Collapsed dropdown (chevron at the right). list collapsed - other values not visible. This is the 'grouped by' choice of the report; whether other values change the PROVIDER / SPECIALTY sections below is not shown (no other value was captured). |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right column of the first row, side by side with REPORT BY. Two radios on one row, no row label. PDF carries the blue dot; both options enabled. |
| PATIENT STATUS | (unlabelled) | Radio | Active / Inactive / Both | Active | yes | Full-width section in this report (no PATIENT TYPE section beside it). Three radios on one row, no row label. Active carries the blue dot; all options enabled. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column, side by side with PROVIDER. Two radios on one row, no row label, directly under the header. Office carries the blue dot; Office Group is enabled too (black label, normal empty radio). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box (grey read-only fill) on its own row directly below the Office / Office Group radios; that row runs across the full panel width (its right half, under the PROVIDER row, is empty). Shows the office id 108 (same number as 'OID :108' in the title bar). Button to its right: blue 'SELECT' with a small building icon (enabled). The office / office-group selection dialog is not shown in any screenshot. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right column. Row label 'Provider' in the left cell; read-only box (grey read-only fill) showing ALL in the right cell; button to its right: blue 'SELECT' with a single-person icon (enabled). The provider selection dialog is not shown in any screenshot. |
| INCLUDE PATIENT TYPE | (unlabelled) | Picker | - | ALL | yes | Left column, side by side with EXCLUDE PATIENT TYPE. No row label - the section header is the only caption. Read-only box (grey read-only fill) showing ALL; button to its right: blue 'SELECT' with a person-plus icon (enabled). The patient-type selection dialog is not shown in any screenshot. |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | yes | Right column, side by side with INCLUDE PATIENT TYPE. No row label - the section header is the only caption. Read-only box (grey read-only fill) showing None (mixed case as displayed); button to its right: blue 'SELECT' with a person-plus icon (enabled). The patient-type selection dialog is not shown in any screenshot. |
| SPECIALTY | (unlabelled) | Dropdown | - | ALL | yes | Full-width section; the dropdown sits at the left and is the same width as the REPORT BY dropdown. No row label - the section header is the only caption. Collapsed dropdown (chevron at the right) showing ALL in capitals. list collapsed - other values not visible. |

### 12.7 Patients on Payment Plan

Screenshots: 7.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 7.PNG only (default state, PLAN TYPE = Regular). Layout: PLAN TYPE \| PRINT FORMAT; OFFICE/GROUP \| PREFERRED PROVIDER (the office box + SELECT row sits beneath, across the panel); then PLAN SETUP DATE RANGE, EXCLUDE PATIENT TYPE and CREDIT CARD ON FILE, each full width. The provider section is titled PREFERRED PROVIDER here (row label 'Preferred Provider'), not PROVIDER. Nothing greyed out. Nothing is clipped: the last criteria row is followed by blank panel space down to the action bar (PRINT / PREVIEW, ADD TO MY FAVORITES), and there is no scrollbar.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PLAN TYPE | (unlabelled) | Radio | Regular / Ortho | Regular | yes | Left column of the first row, side by side with PRINT FORMAT. Two radios on one row, no row label. Regular carries the blue dot; both options enabled. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right column of the first row, side by side with PLAN TYPE. Two radios on one row, no row label. PDF carries the blue dot; both options enabled. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left column, side by side with PREFERRED PROVIDER. Two radios on one row, no row label, directly under the header. Office carries the blue dot; Office Group is enabled too (black label, normal empty radio). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box (grey read-only fill) on its own row directly below the Office / Office Group radios; that row runs across the full panel width (its right half, under the PREFERRED PROVIDER row, is empty). Shows the office id 108 (same number as 'OID :108' in the title bar). Button to its right: blue 'SELECT' with a small building icon (enabled). The office / office-group selection dialog is not shown in any screenshot. |
| PREFERRED PROVIDER | Preferred Provider | Picker | - | ALL | yes | Right column. Row label 'Preferred Provider' in the left cell; read-only box (grey read-only fill) showing ALL in the right cell; button to its right: blue 'SELECT' with a single-person icon (enabled). The provider selection dialog is not shown in any screenshot. |
| PLAN SETUP DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box (light editable-field fill) in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Value equals the capture day (default appears to be today). |
| PLAN SETUP DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box (light editable-field fill) in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Same value as Start Date (the capture day). |
| EXCLUDE PATIENT TYPE | (unlabelled) | Picker | - | None | yes | Full-width section in this report (there is no INCLUDE PATIENT TYPE section beside it); the box sits at the left. No row label - the section header is the only caption. Read-only box (grey read-only fill) showing None (mixed case as displayed); button to its right: blue 'SELECT' with a person-plus icon (enabled). The patient-type selection dialog is not shown in any screenshot. |
| CREDIT CARD ON FILE | (unlabelled) | Dropdown | - | Both | yes | Full-width section; the dropdown sits at the left. No row label - the section header is the only caption. Collapsed dropdown (chevron at the right). list collapsed - other values not visible. |

### 12.8 Online Registered Patients

Screenshots: 8.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 8.PNG only (default state). Four full-width sections: PRINT FORMAT; REPORT TYPE; OFFICE/GROUP; CREATED DATE RANGE. Same structure as 'Update Patient Insurance (Conversion) List - By Appointment' except that the date section is titled CREATED DATE RANGE and its label cells are wider. Nothing greyed out. Nothing is clipped: the last criteria row is followed by blank panel space down to the action bar (PRINT / PREVIEW, ADD TO MY FAVORITES), and there is no scrollbar.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | First section of the panel, full width. Two radios on one row, no row label. PDF carries the blue dot; both options enabled. |
| REPORT TYPE | (unlabelled) | Radio | Summary / Detail | Summary | yes | Full-width section. Two radios on one row, no row label. Summary carries the blue dot; both options enabled. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section. Two radios on one row, no row label, directly under the header. Office carries the blue dot; Office Group is enabled too (black label, normal empty radio). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box (grey read-only fill) on its own row directly below the Office / Office Group radios. Shows the office id 108 (same number as 'OID :108' in the title bar). Button to its right: blue 'SELECT' with a small building icon (enabled). The office / office-group selection dialog is not shown in any screenshot. |
| CREATED DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box (light editable-field fill) in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Value equals the capture day (default appears to be today). The label cell is wider in this report than in the other reports of the category, so the date box sits further right (box starts at about x=762 px instead of 613 px); nothing else is in the row. |
| CREATED DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box (light editable-field fill) in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Same value as Start Date (the capture day). Same wider label cell as Start Date. |

### 12.9 Responsible Party List

Screenshots: 10.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 10.PNG only (state: REPORT BY = 'Created Date'; its other values were not captured). Six full-width sections (no side-by-side columns): PRINT FORMAT; REPORT BY; OFFICE/GROUP; CREATED DATE RANGE; EXCLUDE RESPONSIBLE PARTY TYPE; OTHER OPTIONS. Nothing greyed out. Nothing is clipped: the last criteria row is followed by blank panel space down to the action bar (PRINT / PREVIEW, ADD TO MY FAVORITES), and there is no scrollbar.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | First section of the panel, full width. Two radios on one row, no row label. PDF carries the blue dot; both options enabled. |
| REPORT BY | (unlabelled) | Dropdown | - | Created Date | yes | Full-width section in this report (below PRINT FORMAT, not beside it); the dropdown sits at the left. No row label - the section header is the only caption. Collapsed dropdown (chevron at the right). list collapsed - other values not visible. The date section below is titled CREATED DATE RANGE, which matches this value, so that title may change with the selection (inference - no other value was captured). |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section. Two radios on one row, no row label, directly under the header. Office carries the blue dot; Office Group is enabled too (black label, normal empty radio). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box (grey read-only fill) on its own row directly below the Office / Office Group radios. Shows the office id 108 (same number as 'OID :108' in the title bar). Button to its right: blue 'SELECT' with a small building icon (enabled). The office / office-group selection dialog is not shown in any screenshot. |
| CREATED DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box (light editable-field fill) in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Value equals the capture day (default appears to be today). |
| CREATED DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Label in the left cell, date box (light editable-field fill) in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Same value as Start Date (the capture day). |
| EXCLUDE RESPONSIBLE PARTY TYPE | (unlabelled) | Picker | - | None | yes | Full-width section; the box sits at the left. No row label - the section header is the only caption. Read-only box (grey read-only fill) showing None (mixed case as displayed); button to its right: blue 'SELECT' with a person-plus icon (enabled). The responsible-party-type selection dialog is not shown in any screenshot. |
| OTHER OPTIONS | Include Inactive Accounts (All patients inactive in account) | Checkbox | - | unchecked | yes | Full-width section holding this single checkbox. Empty box = unchecked in the captured default state. The parenthesised explanation is part of the checkbox label. |

### 12.10 Responsible Party - Sent to Collection

Screenshots: 11.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 11.PNG only (default state). Three full-width sections: PRINT FORMAT; OFFICE/GROUP; ACCOUNT BALANCE RANGE. No date range - the report is filtered by office and account balance only. Nothing greyed out. Nothing is clipped: the last criteria row is followed by blank panel space down to the action bar (PRINT / PREVIEW, ADD TO MY FAVORITES), and there is no scrollbar.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | First section of the panel, full width. Two radios on one row, no row label. PDF carries the blue dot; both options enabled. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section. Two radios on one row, no row label, directly under the header. Office carries the blue dot; Office Group is enabled too (black label, normal empty radio). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box (grey read-only fill) on its own row directly below the Office / Office Group radios. Shows the office id 108 (same number as 'OID :108' in the title bar). Button to its right: blue 'SELECT' with a small building icon (enabled). The office / office-group selection dialog is not shown in any screenshot. |
| ACCOUNT BALANCE RANGE | Start | Number | - | 0.00 | yes | Label 'Start' in the left cell; small editable box (light editable-field fill) in the right cell, value right-aligned with two decimals. No currency symbol or spinner shown. |
| ACCOUNT BALANCE RANGE | End | Number | - | 999999.99 | yes | Label 'End' in the left cell; small editable box identical to the Start box, value right-aligned: six 9s, a decimal point and two 9s (digits counted on a 6x crop). No currency symbol or spinner shown. |

### 12.11 Responsible Party - Statements Sent

Screenshots: 12.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 12.PNG only (default state). Layout: STATEMENT TYPE \| PRINT FORMAT side by side; then OFFICE/GROUP and STATEMENT DATE, each full width. STATEMENT DATE is a single date, not a range. The only greyed-out items in the whole category are the Email and Both options of STATEMENT TYPE here (a pixel scan of all 13 screenshots found no other grey text, grey radio or grey button inside a criteria panel). Nothing is clipped: the last criteria row is followed by blank panel space down to the action bar (PRINT / PREVIEW, ADD TO MY FAVORITES), and there is no scrollbar.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| STATEMENT TYPE | (unlabelled) | Radio | Paper / Email / Both | Paper | yes | PARTIALLY DISABLED: 'Paper' is selected and active (blue ring and dot, black label); the 'Email' and 'Both' options are GREYED OUT / disabled (grey-filled radio circles, grey labels), so only Paper can be chosen in the captured state. The reason for the disabling is not shown on screen. Left column of the first row, side by side with PRINT FORMAT; three radios on one row, no row label. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Right column of the first row, side by side with STATEMENT TYPE. Two radios on one row, no row label. PDF carries the blue dot; both options enabled. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section. Two radios on one row, no row label, directly under the header. Office carries the blue dot; Office Group is enabled too (black label, normal empty radio). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box (grey read-only fill) on its own row directly below the Office / Office Group radios. Shows the office id 108 (same number as 'OID :108' in the title bar). Button to its right: blue 'SELECT' with a small building icon (enabled). The office / office-group selection dialog is not shown in any screenshot. |
| STATEMENT DATE | Statement Date | Date | - | 11/21/2026 | yes | ONE date, not a range (no Start / End pair). Row label 'Statement Date' in the left cell (same wording as the section header, in mixed case); date box (light editable-field fill) in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Value equals the capture day (default appears to be today). |

### 12.12 Responsible Party - Email Statement Error Report

Screenshots: 13.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 13.PNG only (default state). Three full-width sections: PRINT FORMAT; OFFICE/GROUP; STATEMENT SENT DATE (a single date, not a range). Smallest criteria set of the category (three sections, four controls). In the report list the name wraps onto two lines ('Responsible Party - Email Statement' / 'Error Report'). Nothing greyed out. Nothing is clipped: the last criteria row is followed by blank panel space down to the action bar (PRINT / PREVIEW, ADD TO MY FAVORITES), and there is no scrollbar.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | First section of the panel, full width. Two radios on one row, no row label. PDF carries the blue dot; both options enabled. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section. Two radios on one row, no row label, directly under the header. Office carries the blue dot; Office Group is enabled too (black label, normal empty radio). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box (grey read-only fill) on its own row directly below the Office / Office Group radios. Shows the office id 108 (same number as 'OID :108' in the title bar). Button to its right: blue 'SELECT' with a small building icon (enabled). The office / office-group selection dialog is not shown in any screenshot. |
| STATEMENT SENT DATE | Statement Sent Date | Date | - | 11/21/2026 | yes | ONE date, not a range (no Start / End pair). Row label 'Statement Sent Date' in the left cell (same wording as the section header, in mixed case); date box (light editable-field fill) in the right cell with a calendar icon inside the box at its right end. Format MM/DD/YYYY. Value equals the capture day (default appears to be today). |

## 13. Lists - Provider

- Source: `providers_list_reports` (4 reports transcribed) - window title: "Provider List Reports"
- Reports listed in the legacy screen: Provider List, Provider Holidays, Provider Operatory, Provider Registration
- Notes: Third-reader verified inventory. All 4 original screenshots, the 4 pre-rendered criteria zooms, the 4 list zooms and 13 extra renders (prefix c in the zoom folder: 5x-20x crops of the title bar, every section header, picker, dropdown and date box, plus a histogram-equalised copy of each full screenshot) were read. Readers A and B agreed on every report, section, control, option, default value, enabled state and truncation flag (4 reports, 19 controls); they differed only in the wording of notes. Everything was nevertheless re-checked on the pixels: the selected radio located in each file (left list, PDF, Office), fill colours of every box and button, and an exact-colour sweep of each criteria box (every pixel that is not one of the flat background colours, grouped into connected regions) which returned only the elements listed here - no 'Page Break' or other checkbox, no right-edge or second-column extras, no greyed-out control, no instruction or legend text, no scrollbar, no footer text. COVERAGE: 4 screenshots = 4 different reports, each selected exactly once, in list order: 1.PNG Provider List, 2.PNG Provider Holidays, 3.PNG Provider Operatory, 4.PNG Provider Registration. All are the normal two-panel screen in its default state - no popup, no expanded dropdown, no scrolled second view, no foreign screen - so the dialogs behind the SELECT buttons (office / office group, provider) and the option lists of the SPECIALTY and STATE dropdowns are NOT documented by this category. TITLE BAR (identical in all 4): 'Provider List Reports' at the left; 'PGID :2829 / OID :108' followed by a white printer icon (icon only, no text) at the far right. LEFT PANEL: blue header bar 'SELECT REPORT', then exactly four radio rows in a SINGLE column (no second column), each closed by a thin white rule; everything below the fourth row is uniform navy (pixel-exact) down to the bottom edge, so the list is neither clipped nor scrollable. A dark tab with three vertical dots on the border between the two panels is the splitter / collapse handle. RIGHT PANEL: blue header bar 'REPORT CRITERIA' with the CLEAR CRITERIA button (refresh icon) at its right end - drawn slate-grey (RGB 112,127,140) in every screenshot while all other buttons are blue (41,134,220), which is its normal styling in this application, not a disabled state; a bordered criteria box built from grey section-header bars; a footer bar inside the box with blue PRINT / PREVIEW (printer icon) and ADD TO MY FAVORITES (plus icon) right-aligned. The same three actions appear on every report. No criteria panel is truncated: each shows the footer bar and the bottom border of its box, and in 1.PNG and 2.PNG the lower edge line of the page frame is visible under it. PATTERNS: every report starts with PRINT FORMAT = PDF (default) / Excel and OFFICE/GROUP = Office (default) / Office Group radios plus an unlabelled read-only office box showing 108 (= the OID in the title bar) with a SELECT button (building icon). Provider List, Provider Holidays and Provider Operatory add a PROVIDER section in a right-hand column beside OFFICE/GROUP (row label 'Provider', read-only box ALL, SELECT button with single-person icon); Provider Registration has NO provider filter and its OFFICE/GROUP header spans the full width. Only Provider List has SPECIALTY and STATE (side-by-side dropdowns, both ALL, collapsed). Only Provider Holidays has a date range, under the header text 'LAST VISIT DATE RANGE' (odd for a holidays report - apparently a reused header - kept exactly as displayed), with Start Date and End Date both 11/21/2026 (the capture day). Pickers are a read-only grey box (fill RGB 220,223,226) plus a blue SELECT button; dropdowns and date boxes have the light editable fill (241,241,241), so every control in this category is enabled. There is no REPORT FORMAT, DATE RANGE (plain), PATIENT TYPE, OTHER OPTIONS, GROUP BY or SORT BY section anywhere in this category. FONT NOTE: the capital G of the header font renders almost like a C at screenshot resolution (headers look like 'OFFICE/CROUP' and 'LAST VISIT DATE RANCE'); both were confirmed as G on the pixels - the glyph is darker at its lower right (the G spur) whereas the true C of OFFICE in the same header is exactly symmetric top/bottom - and the mixed-case radio label 'Office Group' is unambiguous. Screenshot sizes vary slightly (1.PNG 1366x588, 2.PNG 1363x587, 3.PNG 1365x584, 4.PNG 1365x582) with the content shifted 1-3 px vertically between files; this is a capture detail, not a different state.

### 13.1 Provider List

Screenshots: 1.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 1.PNG only (left-list radio 'Provider List' filled). Layout top to bottom: PRINT FORMAT (full width); OFFICE/GROUP (left half) + PROVIDER (right half) side by side, with the office box + SELECT on a full-width row under the radios; SPECIALTY (left half) + STATE (right half) side by side. The only report of the category with SPECIALTY and STATE filters; both dropdowns are collapsed, so only their current value ALL is known. Below them the criteria box is blank down to the footer bar (exact-colour sweep and a histogram-equalised render found nothing else: no checkbox, no Page Break, no instruction text). The footer bar with PRINT / PREVIEW and ADD TO MY FAVORITES and the bottom border of the box are fully visible and there is no scrollbar - not truncated. No greyed-out control; the picker boxes are grey only because they are read-only.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section. Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio, Excel is empty. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of a two-column band (the PROVIDER section sits beside it on the right). Two radios on one row directly under the header; no row label. Office is the filled (blue) radio; Office Group is empty but enabled (black label, normal radio). |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box (grey read-only fill RGB 220,223,226) on its own row directly below the Office / Office Group radios; that row runs across the full panel width (its right half, under the PROVIDER row, is empty). Shows 108 - the same number as 'OID :108' in the title bar, i.e. the current office. Button to its right: SELECT (blue = enabled, building icon). Presumably picks offices or office groups depending on the radio above (inference, not visible); the selection dialog is not shown in any screenshot. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right half of the two-column band, on the same row as the Office / Office Group radios. Row label 'Provider' in the left cell; read-only box (grey read-only fill RGB 220,223,226) showing ALL in the right cell; button to its right: SELECT (blue = enabled, single-person icon). The provider selection dialog is not shown in any screenshot. |
| SPECIALTY | (unlabelled) | Dropdown | - | ALL | yes | list collapsed - other values not visible. Left half of the second two-column band (STATE beside it on the right), below the office picker row. No label of its own (the section header acts as the label). Light editable fill (RGB 241,241,241) with a single down-chevron at its right end; about 245 px wide. |
| STATE | (unlabelled) | Dropdown | - | ALL | yes | list collapsed - other values not visible. Right half of the second two-column band, side by side with SPECIALTY. No label of its own (the section header acts as the label). Light editable fill (RGB 241,241,241) with a single down-chevron at its right end; about 245 px wide. |

### 13.2 Provider Holidays

Screenshots: 2.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 2.PNG only (left-list radio 'Provider Holidays' filled). Same PRINT FORMAT / OFFICE/GROUP / PROVIDER block as Provider List, then ONE full-width date section whose header literally reads LAST VISIT DATE RANGE - odd wording for a provider-holidays report (it looks like a header reused from a patient report) but that is the text displayed, so it is transcribed as shown and not corrected. No SPECIALTY or STATE section. The only report of the category with a date range. Blank below the End Date row down to the footer bar (exact-colour sweep found nothing else); footer bar and the bottom border of the box fully visible, no scrollbar - not truncated. No greyed-out control.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section. Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio, Excel is empty. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of a two-column band (the PROVIDER section sits beside it on the right). Two radios on one row directly under the header; no row label. Office is the filled (blue) radio; Office Group is empty but enabled. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box (grey read-only fill RGB 220,223,226) on its own row directly below the Office / Office Group radios; that row runs across the full panel width (its right half, under the PROVIDER row, is empty). Shows 108 (= 'OID :108' in the title bar, the current office). Button to its right: SELECT (blue = enabled, building icon). The selection dialog is not shown in any screenshot. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right half of the two-column band, on the same row as the Office / Office Group radios. Row label 'Provider' in the left cell; read-only box (grey read-only fill RGB 220,223,226) showing ALL in the right cell; button to its right: SELECT (blue = enabled, single-person icon). The provider selection dialog is not shown in any screenshot. |
| LAST VISIT DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section below the office picker row. Row label 'Start Date' in the left cell (about one third of the panel width); date box in the next cell with a blue calendar icon inside its right end; the rest of the row is empty. Light editable fill (RGB 241,241,241) - not greyed. Format MM/DD/YYYY. The value equals the capture day, so the default appears to be today's date (inference). |
| LAST VISIT DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Row below Start Date; same layout: label in the left cell, date box with a blue calendar icon in the next cell. Light editable fill (RGB 241,241,241) - not greyed. Same value as Start Date (the capture day). |

### 13.3 Provider Operatory

Screenshots: 3.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 3.PNG only (left-list radio 'Provider Operatory' filled). Three sections only: PRINT FORMAT, OFFICE/GROUP and PROVIDER - no date range, no SPECIALTY, no STATE. The criteria box is blank from the office picker row down to the footer bar (exact-colour sweep found nothing else); footer bar and the bottom border of the box fully visible, no scrollbar - not truncated. No greyed-out control.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section. Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio, Excel is empty. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Left half of a two-column band (the PROVIDER section sits beside it on the right). Two radios on one row directly under the header; no row label. Office is the filled (blue) radio; Office Group is empty but enabled. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box (grey read-only fill RGB 220,223,226) on its own row directly below the Office / Office Group radios; that row runs across the full panel width (its right half, under the PROVIDER row, is empty). Shows 108 (= 'OID :108' in the title bar, the current office). Button to its right: SELECT (blue = enabled, building icon). The selection dialog is not shown in any screenshot. |
| PROVIDER | Provider | Picker | - | ALL | yes | Right half of the two-column band, on the same row as the Office / Office Group radios. Row label 'Provider' in the left cell; read-only box (grey read-only fill RGB 220,223,226) showing ALL in the right cell; button to its right: SELECT (blue = enabled, single-person icon). The provider selection dialog is not shown in any screenshot. |

### 13.4 Provider Registration

Screenshots: 4.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 4.PNG only (left-list radio 'Provider Registration' filled). The smallest criteria set of the category: only PRINT FORMAT and OFFICE/GROUP. There is NO PROVIDER picker (the right half of the OFFICE/GROUP header and rows is empty - confirmed by the exact-colour sweep), no date range, no SPECIALTY, no STATE. Blank below the office picker row down to the footer bar; footer bar and the bottom border of the box fully visible, no scrollbar - not truncated. No greyed-out control.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section. Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio, Excel is empty. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | In this report the OFFICE/GROUP header bar spans the FULL panel width (there is no PROVIDER section beside it). Two radios on one row directly under the header; no row label. Office is the filled (blue) radio; Office Group is empty but enabled. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only box (grey read-only fill RGB 220,223,226) on its own row directly below the Office / Office Group radios. Shows 108 (= 'OID :108' in the title bar, the current office). Button to its right: SELECT (blue = enabled, building icon). The selection dialog is not shown in any screenshot. |

## 14. Lists - Security

- Source: `security_list_reports` (4 reports transcribed) - window title: "Security List Reports"
- Reports listed in the legacy screen: User List, Group List, Group Rights List, User-Group Membership
- Notes: Third-reader verified inventory. All 4 original screenshots, the 4 pre-rendered criteria zooms, the 4 list zooms and 7 extra crops at 3x-7x (prefix C_ in the zoom folder) were read. Readers A and B agreed on every report, section, control, option, default value, enabled state and truncation flag (4 reports, 11 controls); they differed only in descriptive wording. Everything was nevertheless re-checked on the pixels: a whole-image scan of each screenshot for every cluster of non-background pixels found exactly the elements listed here and nothing else (no 'Page Break', no right-edge or second-column extras, no greyed-out control, no instruction or legend text, no scrollbar, no footer text); numeric pixel checks confirmed the filled radios, the empty checkboxes and the SECURITY GROUP header glyphs. COVERAGE: 4 screenshots = 4 different reports of the same screen, each selected exactly once: 1.PNG User List, 2.PNG Group List, 3.PNG Group Rights List, 4.PNG User-Group Membership. No popups, expanded dropdowns or scrolled views. TITLE BAR: 'Security List Reports' at left; identifiers 'PGID :2829 / OID :108' at right, followed by an unlabeled white printer icon at the far right edge (present in all 4 screenshots; not part of the criteria area and not counted as an action). LEFT PANEL 'SELECT REPORT': a SINGLE column of exactly four full-width radio rows separated by thin white lines, with a large empty dark area below; no second column, no scrollbar, not clipped - the list is complete. A vertical splitter/collapse handle (three dots between two notches) sits on the border between the left and right panels at mid-height. RIGHT PANEL 'REPORT CRITERIA': grey section-header bars each followed by a lighter control row, all in one column; the 'CLEAR CRITERIA' button (grey/slate fill, white text, refresh/circular-arrows icon) sits at the right end of the blue REPORT CRITERIA header bar - grey is its styling in every screenshot, not evidence of a disabled state. Bottom action band (right aligned): 'PRINT / PREVIEW' (printer icon) and 'ADD TO MY FAVORITES' (plus icon), both blue. RECURRING PATTERNS: every report starts with PRINT FORMAT = PDF (default) / Excel. Group List and Group Rights List have nothing but PRINT FORMAT. User List adds USER (User picker, ALL) and OTHER OPTIONS (Include Inactive Users, unchecked). User-Group Membership adds REPORT FORMAT (Detail default / Summary), SECURITY GROUP (Group picker, ALL), LOCATION (Office default / Office Group radios plus a label-less picker showing 108) and OTHER OPTIONS (Include Inactive Users, unchecked). Picker rows are a read-only grey box plus a blue SELECT button whose icon varies by entity (user-plus for User, group of people for Group, building for Location). No date range, sort-by, group-by or page-break controls appear anywhere in this category. No control is greyed out or disabled in any screenshot. CAPTURE ARTIFACTS (outside the report window, no readable text): 1.PNG has a 4 px blue strip above the title bar with a small white-outlined rectangle fragment at the top-left corner (x 0-26) - the cropped bottom edge of the application chrome above; 1.PNG, 2.PNG and 3.PNG end with a plain grey strip carrying one darker 1 px line across the full width below the window (uniform across all 1366 px, so it is a frame border, not a scrollbar); the last pixel row of 3.PNG has two 3 px pinkish specks near x 1342-1350 (top edge of something cropped below); 4.PNG is cropped just below the action band. Screenshot sizes: 1366 px wide, 583-598 px tall. All text was legible after zooming; no uncertain readings remain.

### 14.1 User List

Screenshots: 1.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 1.PNG only; 'User List' is the filled radio in SELECT REPORT. Three full-width sections stacked top to bottom: PRINT FORMAT, USER, OTHER OPTIONS, then blank space down to the criteria box's bottom border, which is fully visible above the action band; no scrollbar - not truncated. No office/location, report-format, date-range, group-by or sort-by section for this report. A whole-image pixel-cluster scan found nothing else in the criteria box (no right-edge or second-column controls such as Page Break, no instruction text). No dropdown expanded, no popup open.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header, at the left edge; no row label. PDF is the filled (blue) radio. Both option labels are black (not greyed). |
| USER | User | Picker | - | ALL | yes | Row label 'User' at the far left of the row; read-only grey box (fill RGB 220,223,226, grey text) showing ALL, starting about a quarter of the way across the panel (x 698-1074 of the 1366 px screenshot); button immediately to its right: SELECT (blue = enabled, user-plus icon: person silhouette with a + sign). The value is set through SELECT, not typed. |
| OTHER OPTIONS | Include Inactive Users | Checkbox | - | unchecked | yes | Single checkbox at the left edge of the row; box empty; label in black (not greyed). Nothing else in this section. |

### 14.2 Group List

Screenshots: 2.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 2.PNG only; 'Group List' is the filled radio in SELECT REPORT. PRINT FORMAT is the ONLY section; the rest of the criteria box is blank down to its fully visible bottom border (whole-image pixel-cluster scan: no other text or control, no faint/greyed content, no scrollbar) - not truncated. The report takes no filters at all (no user, group, office or other options).

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header, at the left edge; no row label. PDF is the filled (blue) radio. Both option labels are black (not greyed). |

### 14.3 Group Rights List

Screenshots: 3.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 3.PNG only; 'Group Rights List' is the filled radio in SELECT REPORT. Criteria panel identical to Group List: PRINT FORMAT is the ONLY section; the rest of the criteria box is blank down to its fully visible bottom border (whole-image pixel-cluster scan: no other text or control, no scrollbar) - not truncated. Notably there is no group picker or any other filter on this report.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header, at the left edge; no row label. PDF is the filled (blue) radio. Both option labels are black (not greyed). |

### 14.4 User-Group Membership

Screenshots: 4.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 4.PNG only; 'User-Group Membership' is the filled radio in SELECT REPORT. Five full-width sections in a single column (no side-by-side columns), top to bottom: PRINT FORMAT, REPORT FORMAT, SECURITY GROUP, LOCATION, OTHER OPTIONS, then blank space down to the criteria box's fully visible bottom border; no scrollbar - not truncated. Unlike User List there is NO user picker on this report, and there is no date range. The office section is headed LOCATION here. Whole-image pixel-cluster scan found nothing else (nothing at the right edge of any row, no instruction text). No dropdown expanded, no popup open.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header, at the left edge; no row label. PDF is the filled (blue) radio. Both option labels are black (not greyed). |
| REPORT FORMAT | (unlabelled) | Radio | Detail / Summary | Detail | yes | Two radios on one row directly under the header, at the left edge; no row label. Detail is the filled (blue) radio. Both option labels are black (not greyed). |
| SECURITY GROUP | Group | Picker | - | ALL | yes | Row label 'Group' at the far left of the row; read-only grey box (fill RGB 220,223,226, grey text) showing ALL, starting about a quarter of the way across the panel (x 697-1074); button immediately to its right: SELECT (blue = enabled, group-of-people icon). Header reading: in this small bold caps font the G of GROUP renders almost like a C (it looks like 'SECURITY CROUP' when enlarged); the glyph has the extra lower-right stem pixels that the genuine C of SECURITY lacks, so the header is SECURITY GROUP. |
| LOCATION | (unlabelled) | Radio | Office / Office Group | Office | yes | Two radios on the first row under the header, at the left edge; no row label. Office is the filled (blue) radio. Both option labels are black (not greyed). |
| LOCATION | (unlabelled) | Picker | - | 108 | yes | Second row of the section, directly under the Office / Office Group radios. No label of its own. Read-only grey box (fill RGB 220,223,226, grey text) starting at the left edge of the row (x 472-1067) showing 108 - the same number as 'OID :108' in the title bar, i.e. the current office; button to its right: SELECT (blue = enabled, building/office icon). Presumably picks offices or office groups depending on the radio above (inferred from layout, not stated on screen). |
| OTHER OPTIONS | Include Inactive Users | Checkbox | - | unchecked | yes | Single checkbox at the left edge of the row; box empty (interior pixels uniformly blank); label in black (not greyed). Nothing else in this section. |

## 15. Lists - Setup

- Source: `setup_list_reports` (20 reports transcribed) - window title: "Setup List Reports"
- Reports listed in the legacy screen: Employer List, Carrier List, Insurance Plan List, Inactive Plans List, Drug List, Procedure Codes List, Procedure Codes by Fee Schedule, Explosion Codes List, Credit Codes Report, Fee Schedule List, Capitation Fee Schedule, Office List, Operatory List, Office Holidays, ADA Categories List, Document Types List, Notes Macros List, Default Ins Plan Coverage Category List, Notes Macro Category List, Patient Types List
- Notes: Third-reader verified inventory. All 20 original screenshots, all 20 pre-rendered criteria zooms, the list zooms of 1.PNG and 2.PNG and about 40 extra crops at 3x-6x (prefix c_ in the zoom folder) were read; the left list of the other files was verified by pixel comparison (2-8 identical to 1.PNG, 9-19 identical to 20.PNG, and 1 versus 20 differ only in text anti-aliasing) plus 4x crops of 20.PNG. Readers A and B agreed on every report, section, control, option, default value, enabled state and truncation flag (20 reports, 67 controls); they differed only in the ordering of report_list and in descriptive wording. Everything was nevertheless re-checked on the pixels: the selected-radio glyph located in each file, blue-mark detection for every ticked checkbox / chosen radio, fill and border colours of every input box and button, a pixel comparison of the left list across all 20 files, and an exact-colour sweep of each criteria panel that found nothing beyond the controls listed here (no 'Page Break', no right-edge or second-column extras, no greyed control other than the two date boxes noted below, no instruction or legend text, no scrollbar, no footer text). COVERAGE: 20 screenshots = 20 different reports, each selected exactly once, in the app's row-major order: 1 Employer List, 2 Insurance Plan List, 3 Carrier List, 4 Inactive Plans List, 5 Drug List, 6 Procedure Codes List, 7 Explosion Codes List, 8 Procedure Codes by Fee Schedule, 9 Credit Codes Report, 10 Fee Schedule List, 11 Capitation Fee Schedule, 12 Office List, 13 Office Holidays, 14 Operatory List, 15 ADA Categories List, 16 Default Ins Plan Coverage Category List, 17 Document Types List, 18 Notes Macro Category List, 19 Notes Macros List, 20 Patient Types List. All are the normal two-panel screen in its default state - no popup, no expanded dropdown, no scrolled second view, no foreign screen - so the dialogs behind the SELECT buttons (employer, carrier, user, office / office group) and the option lists of every dropdown (STATE, CATEGORY, PRODUCTION TYPE, FEE SCHEDULE, EFFECTIVE DATE, TYPE, CLASS, CAPITATION FEE SCHEDULE, MACRO CATEGORY) are NOT documented by this category. TITLE BAR (identical in all 20): 'Setup List Reports' at the left; 'PGID :2829 / OID :108' followed by a white printer icon (icon only, no text) at the far right. LEFT PANEL - DIFFERENT FROM THE USUAL LAYOUT: there is NO 'SELECT REPORT' header bar. Directly under the title bar the report radios are organised under six blue group-header bars, each followed by a two-column grid of radio cells: INSURANCE = row 1 Employer List \| Insurance Plan List, row 2 Carrier List \| Inactive Plans List; PRESCRIPTION = Drug List (single cell, no right-hand cell); PROCEDURE = row 1 Procedure Codes List \| Explosion Codes List, row 2 Procedure Codes by Fee Schedule \| Credit Codes Report; FEE SCHEDULE = Fee Schedule List \| Capitation Fee Schedule; OFFICE = row 1 Office List \| Office Holidays, row 2 Operatory List \| (empty cell); MISC = row 1 ADA Categories List \| Default Ins Plan Coverage Category List, row 2 Document Types List \| Notes Macro Category List, row 3 Notes Macros List \| Patient Types List. report_list is given group by group from top to bottom and, inside each group, left column top-to-bottom then right column (4 INSURANCE, 1 PRESCRIPTION, 4 PROCEDURE, 2 FEE SCHEDULE, 3 OFFICE, 6 MISC), so the groups stay contiguous; the app's own item order is evidently row-major (the screenshots follow it and MISC is alphabetical that way). The new system must keep these six group headings. Each of the first five groups is closed by a thin rule carrying a small blue tab with three dots (a collapse / resize handle); a dark vertical tab with three dots on the border between the two panels is the splitter / collapse handle. The group-header bars carry nothing but their title. LIST CLIPPED AT THE BOTTOM: in all 20 screenshots the bottom edge of the window cuts the left panel inside the third MISC row (Notes Macros List \| Patient Types List), about 7 px below its radios - the bottom border of that row and the rule-with-handle that closes every other group are not visible, and no scrollbar is drawn. All 20 visible reports are transcribed, but further MISC reports below the visible area cannot be ruled out. RIGHT PANEL: blue bar 'REPORT CRITERIA' with the CLEAR CRITERIA button (refresh icon) at its right end - drawn slate-grey in every screenshot while all other buttons are blue; a bordered criteria box built from grey section-header bars; footer bar with blue PRINT / PREVIEW (printer icon) and ADD TO MY FAVORITES (plus icon) at the bottom right. The same three actions appear on every report. No criteria panel is truncated: each shows the bottom border of its box with blank space under the last section. PATTERNS: every report starts with PRINT FORMAT = PDF (default) / Excel; five reports have nothing else (ADA Categories List, Default Ins Plan Coverage Category List, Document Types List, Notes Macro Category List, Patient Types List). Section headers act as the labels - pickers, dropdowns and the GROUP # text box have no label of their own, so their label is recorded as empty. Pickers are a read-only grey box (fill RGB 220,223,226) plus a blue SELECT button whose icon varies: single person for EMPLOYER and CARRIER, person-with-plus for USER, building for the office picker; every SELECT button in this category is blue (enabled). Office pickers show 108 (= the OID in the title bar), all other pickers show ALL. All dropdowns are collapsed, so only the selected value is known: ALL everywhere except Procedure Codes by Fee Schedule (FEE SCHEDULE = CIGNA PPO HAMILTON, EFFECTIVE DATE = 01/01/2020, both tenant data). Date boxes show 11/21/2026 for both start and end (apparently the capture date) with a blue calendar icon. ONLY GREYED CONTROLS: the Start Date / End Date boxes of Insurance Plan List (2.PNG) have the grey read-only/disabled fill (220,223,226) whereas those of Office Holidays (13.PNG) have the light editable fill (241,241,241). Section headers seen in this category: PRINT FORMAT, SORT BY, DATE RANGE, EMPLOYER, USER, CARRIER, GROUP #, STATE, CATEGORY, PRODUCTION TYPE, STATUS, OTHER OPTIONS, SUMMARY/DETAIL, PROCEDURE CODE TYPE, FEE SCHEDULE, EFFECTIVE DATE, TYPE, CLASS, CAPITATION FEE SCHEDULE, OFFICE/GROUP, MACRO CATEGORY. There is no REPORT FORMAT, PROVIDER, PATIENT TYPE or GROUP BY section anywhere in this category. FONT NOTE: the capital G of the UI font renders almost like a C at screenshot resolution (GROUP #, OFFICE/GROUP, DATE RANGE, CATEGORY, MACRO CATEGORY and the value CIGNA look like CROUP / RANCE / CATECORY / CICNA); each was confirmed as G by comparing the lower-right spur of the glyph with real C glyphs on the pixels. Screenshot sizes vary slightly (1364-1366 x 582-597 px; 10.PNG is cropped 2 px further left, 9.PNG and 14.PNG are 1365 px wide); the selected-radio glyph is 1 px taller in the FEE SCHEDULE row (10.PNG, 11.PNG) - a rendering detail, not a different state.

### 15.1 Employer List

Screenshots: 1.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 1.PNG. Left-list group INSURANCE (row 1, left cell). Three full-width sections stacked top to bottom: PRINT FORMAT, EMPLOYER, STATE. The rest of the criteria box is blank down to its bottom border (exact-colour pixel sweep found nothing else) - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |
| EMPLOYER | (unlabelled) | Picker | - | ALL | yes | No label of its own (the section header acts as the label). Read-only grey box (fill RGB 220,223,226) showing ALL; button to its right: SELECT (blue = enabled, single-person icon). |
| STATE | (unlabelled) | Dropdown | - | ALL | yes | list collapsed - other values not visible. No label of its own (the section header acts as the label); light editable fill with a single down-chevron at the right end. |

### 15.2 Insurance Plan List

Screenshots: 2.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 2.PNG. Left-list group INSURANCE (row 1, right cell). The only report of the category whose criteria start in two columns: LEFT column = PRINT FORMAT, SORT BY, then EMPLOYER; RIGHT column = DATE RANGE (as tall as PRINT FORMAT + SORT BY), then USER (level with EMPLOYER); below them the full-width CARRIER and GROUP # sections. Sections are listed band by band, left column first, then right. It is also the only report here with a SORT BY choice, Created On / Modified On checkboxes, an 'Include User in Filters' checkbox and a free-text box, and its Start Date / End Date boxes are the only greyed controls of the whole category. Blank space below GROUP # down to the bottom border of the box - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | LEFT column, top. Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |
| SORT BY | (unlabelled) | Radio | Carrier / Employer | Carrier | yes | LEFT column, directly under PRINT FORMAT (beside the lower half of DATE RANGE). Two radios on one row; no row label. Carrier is the filled radio. A blank filler strip follows under the radios because the right-hand DATE RANGE block is taller. |
| DATE RANGE | Created On | Checkbox | - | unchecked | yes | RIGHT column, top (beside PRINT FORMAT + SORT BY). First of two square checkboxes on the row directly under the DATE RANGE header. Empty box. |
| DATE RANGE | Modified On | Checkbox | - | checked | yes | Second checkbox on the same row, right of 'Created On'; shown ticked (blue box with tick). Both are square checkboxes, not radios; presumably they can be combined and choose whether the Start/End Date range is applied to the plan's created and/or modified date (inference, not visible). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | **no (greyed)** | RIGHT column. Row label 'Start Date' at the left, date box with a blue calendar icon in a second sub-column. GREYED: the box has the grey read-only/disabled fill (RGB 220,223,226 - identical to the read-only picker boxes) instead of the light editable fill (241,241,241) of the Start Date / End Date boxes on Office Holidays (13.PNG). Its text colour (72,72,72), border and calendar icon are NOT dimmed. Recorded as disabled, as in the other categories where this fill marks a disabled date box, but a static screenshot cannot prove disabled versus read-only, and nothing visible shows what would enable it ('Modified On' is already ticked). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | **no (greyed)** | Row below Start Date; same layout, blue calendar icon and the same grey read-only/disabled fill (RGB 220,223,226) as Start Date - see that note. Both dates equal the capture date. |
| EMPLOYER | (unlabelled) | Picker | - | ALL | yes | LEFT column, second band (beside USER). No label of its own (the section header acts as the label). Read-only grey box (fill RGB 220,223,226) showing ALL; button to its right: SELECT (blue = enabled, single-person icon). |
| USER | Include User in Filters | Checkbox | - | checked | yes | RIGHT column, second band (beside EMPLOYER). Checkbox on the row directly under the USER header, above the user picker; shown ticked. Text exactly as shown (lower-case 'in'). |
| USER | (unlabelled) | Picker | - | ALL | yes | Row below the 'Include User in Filters' checkbox. No label of its own. Read-only grey box (fill RGB 220,223,226) showing ALL; button to its right: SELECT (blue = enabled, person-with-plus icon). Presumably only applied when the checkbox above is ticked (inference). |
| CARRIER | (unlabelled) | Picker | - | ALL | yes | Full-width section below the two-column area. No label of its own (the section header acts as the label). Read-only grey box (fill RGB 220,223,226) showing ALL; button to its right: SELECT (blue = enabled, single-person icon). |
| GROUP # | (unlabelled) | Text | - | - | yes | Full-width section, last on the panel. One short empty editable text box (light fill RGB 241,241,241, about 90 px wide) under the header; no placeholder text (its interior is uniformly empty) and no label other than the section header 'GROUP #'. |

### 15.3 Carrier List

Screenshots: 3.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 3.PNG. Left-list group INSURANCE (row 2, left cell). Three full-width stacked sections; same shape as Employer List with a CARRIER picker in place of EMPLOYER. Rest of the criteria box blank - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |
| CARRIER | (unlabelled) | Picker | - | ALL | yes | No label of its own (the section header acts as the label). Read-only grey box (fill RGB 220,223,226) showing ALL; button to its right: SELECT (blue = enabled, single-person icon). |
| STATE | (unlabelled) | Dropdown | - | ALL | yes | list collapsed - other values not visible. No label of its own (the section header acts as the label); light editable fill with a single down-chevron at the right end. |

### 15.4 Inactive Plans List

Screenshots: 4.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 4.PNG. Left-list group INSURANCE (row 2, right cell). Only two full-width sections (PRINT FORMAT, CARRIER) - no STATE, no date range, no status choice. Rest of the criteria box blank - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |
| CARRIER | (unlabelled) | Picker | - | ALL | yes | No label of its own (the section header acts as the label). Read-only grey box (fill RGB 220,223,226) showing ALL; button to its right: SELECT (blue = enabled, single-person icon). |

### 15.5 Drug List

Screenshots: 5.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 5.PNG. Left-list group PRESCRIPTION (its only report: a single cell at the left with no right-hand cell). Two full-width sections (PRINT FORMAT, USER). Rest of the criteria box blank - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |
| USER | (unlabelled) | Picker | - | ALL | yes | No label of its own (the section header acts as the label). Read-only grey box (fill RGB 220,223,226) showing ALL; button to its right: SELECT (blue = enabled, person-with-plus icon). No 'Include User in Filters' checkbox here (unlike Insurance Plan List). |

### 15.6 Procedure Codes List

Screenshots: 6.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 6.PNG. Left-list group PROCEDURE (row 1, left cell). Layout: PRINT FORMAT full width; CATEGORY (left half) \| PRODUCTION TYPE (right half) side by side; STATUS full width; OTHER OPTIONS full width with three checkbox rows. Blank space below OTHER OPTIONS down to the bottom border of the box - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section. Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |
| CATEGORY | (unlabelled) | Dropdown | - | ALL | yes | LEFT half, side by side with PRODUCTION TYPE. list collapsed - other values not visible. No label of its own (the section header acts as the label); light editable fill with a single down-chevron at the right end. |
| PRODUCTION TYPE | (unlabelled) | Dropdown | - | ALL | yes | RIGHT half, side by side with CATEGORY. list collapsed - other values not visible. No label of its own (the section header acts as the label); light editable fill with a single down-chevron at the right end. |
| STATUS | (unlabelled) | Radio | Active / Inactive / Both | Active | yes | Full-width section. Three radios on one row; no row label. Active is the filled radio. |
| OTHER OPTIONS | Include Only Tooth Required | Checkbox | - | unchecked | yes | Full-width section; first of three checkboxes, one per row. Empty box. |
| OTHER OPTIONS | Include Only Surface Required | Checkbox | - | unchecked | yes | Second row. Empty box. |
| OTHER OPTIONS | Include Only Bill to Insurance | Checkbox | - | unchecked | yes | Third row; last control on the panel. Empty box. Text exactly as shown (lower-case 'to'). |

### 15.7 Explosion Codes List

Screenshots: 7.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 7.PNG. Left-list group PROCEDURE (row 1, right cell). Two full-width sections only (PRINT FORMAT, SUMMARY/DETAIL). Rest of the criteria box blank - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |
| SUMMARY/DETAIL | (unlabelled) | Radio | Summary / Detail | Summary | yes | Two radios on one row directly under the header; no row label. Summary is the filled radio. |

### 15.8 Procedure Codes by Fee Schedule

Screenshots: 8.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 8.PNG. Left-list group PROCEDURE (row 2, left cell). Layout top to bottom: PRINT FORMAT (full width); PROCEDURE CODE TYPE (full width, three checkbox rows, all ticked); CATEGORY \| PRODUCTION TYPE (side by side); FEE SCHEDULE \| EFFECTIVE DATE (side by side); STATUS (full width); OTHER OPTIONS (full width, three checkbox rows, all unticked). Same criteria as Procedure Codes List plus PROCEDURE CODE TYPE, FEE SCHEDULE and EFFECTIVE DATE. Fullest panel of the category, yet it still ends 83 px above the bottom border of the box (blank body in between) - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section. Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |
| PROCEDURE CODE TYPE | Dental | Checkbox | - | checked | yes | Full-width section; first of three checkboxes, one per row. Shown ticked (blue box with tick). |
| PROCEDURE CODE TYPE | Medical | Checkbox | - | checked | yes | Second row. Shown ticked. |
| PROCEDURE CODE TYPE | Other | Checkbox | - | checked | yes | Third row. Shown ticked. |
| CATEGORY | (unlabelled) | Dropdown | - | ALL | yes | LEFT half, side by side with PRODUCTION TYPE. list collapsed - other values not visible. No label of its own (the section header acts as the label); light editable fill with a single down-chevron at the right end. |
| PRODUCTION TYPE | (unlabelled) | Dropdown | - | ALL | yes | RIGHT half, side by side with CATEGORY. list collapsed - other values not visible. No label of its own (the section header acts as the label); light editable fill with a single down-chevron at the right end. |
| FEE SCHEDULE | (unlabelled) | Dropdown | - | CIGNA PPO HAMILTON | yes | LEFT half, side by side with EFFECTIVE DATE. list collapsed - other values not visible. No label of its own (the section header acts as the label); light editable fill with a single down-chevron at the right end. Shows a specific fee schedule name (tenant data) rather than ALL - unlike the FEE SCHEDULE dropdown of Fee Schedule List - so one schedule is always chosen here by default (whether an ALL choice exists in the list is not visible). The G of CIGNA renders close to a C at this size (looks like CICNA); the lower-right spur of the glyph was confirmed against the leading C on the pixels. |
| EFFECTIVE DATE | (unlabelled) | Dropdown | - | 01/01/2020 | yes | RIGHT half, side by side with FEE SCHEDULE. list collapsed - other values not visible. No label of its own (the section header acts as the label); light editable fill with a single down-chevron at the right end. It is a dropdown with a chevron, NOT a calendar date box. Presumably lists the effective dates of the selected fee schedule (inference). |
| STATUS | (unlabelled) | Radio | Active / Inactive / Both | Active | yes | Full-width section. Three radios on one row; no row label. Active is the filled radio. |
| OTHER OPTIONS | Include Only Tooth Required | Checkbox | - | unchecked | yes | Full-width section; first of three checkboxes, one per row. Empty box. |
| OTHER OPTIONS | Include Only Surface Required | Checkbox | - | unchecked | yes | Second row. Empty box. |
| OTHER OPTIONS | Include Only Bill to Insurance | Checkbox | - | unchecked | yes | Third row; last control on the panel. Empty box. Text exactly as shown (lower-case 'to'). |

### 15.9 Credit Codes Report

Screenshots: 9.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 9.PNG. Left-list group PROCEDURE (row 2, right cell). Three full-width stacked sections (PRINT FORMAT, TYPE, CLASS - TYPE and CLASS are stacked, not side by side). Rest of the criteria box blank - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |
| TYPE | (unlabelled) | Dropdown | - | ALL | yes | list collapsed - other values not visible. No label of its own (the section header acts as the label); light editable fill with a single down-chevron at the right end. |
| CLASS | (unlabelled) | Dropdown | - | ALL | yes | list collapsed - other values not visible. No label of its own (the section header acts as the label); light editable fill with a single down-chevron at the right end. |

### 15.10 Fee Schedule List

Screenshots: 10.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 10.PNG. Left-list group FEE SCHEDULE (left cell). Two full-width sections only (PRINT FORMAT, FEE SCHEDULE). Rest of the criteria box blank - not truncated. (This screenshot is 1364 px wide, i.e. cropped 2 px further left than the others; content is unaffected.)

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |
| FEE SCHEDULE | (unlabelled) | Dropdown | - | ALL | yes | list collapsed - other values not visible. No label of its own (the section header acts as the label); light editable fill with a single down-chevron at the right end. Default here is ALL (on Procedure Codes by Fee Schedule the same-named dropdown shows a specific schedule). |

### 15.11 Capitation Fee Schedule

Screenshots: 11.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 11.PNG. Left-list group FEE SCHEDULE (right cell). Two full-width sections only (PRINT FORMAT, CAPITATION FEE SCHEDULE). Rest of the criteria box blank - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |
| CAPITATION FEE SCHEDULE | (unlabelled) | Dropdown | - | ALL | yes | list collapsed - other values not visible. No label of its own (the section header acts as the label); light editable fill with a single down-chevron at the right end. |

### 15.12 Office List

Screenshots: 12.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 12.PNG. Left-list group OFFICE (row 1, left cell). Two full-width sections (PRINT FORMAT, OFFICE/GROUP). Rest of the criteria box blank - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Two radios on the first row under the header; no row label. Office is the filled radio. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Second row of the section, under the Office / Office Group radios. No label of its own. Read-only grey box (fill RGB 220,223,226) showing 108 - the same number as 'OID :108' in the title bar, i.e. the current office; button to its right: SELECT (blue = enabled, building icon). Presumably picks offices or office groups depending on the radio above (inference, not visible). |

### 15.13 Office Holidays

Screenshots: 13.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 13.PNG. Left-list group OFFICE (row 1, right cell). Three full-width stacked sections (PRINT FORMAT, OFFICE/GROUP, DATE RANGE). Both dates show 11/21/2026 (apparently the capture date, i.e. the default looks like today). Rest of the criteria box blank - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Two radios on the first row under the header; no row label. Office is the filled radio. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Second row of the section, under the Office / Office Group radios. No label of its own. Read-only grey box (fill RGB 220,223,226) showing 108 - the same number as 'OID :108' in the title bar, i.e. the current office; button to its right: SELECT (blue = enabled, building icon). Presumably picks offices or office groups depending on the radio above (inference, not visible). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Row label 'Start Date' at the left; date box with a blue calendar icon in a second sub-column. Light editable fill (RGB 241,241,241) - not greyed. No Created On / Modified On checkboxes in the DATE RANGE of this report. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Row below Start Date; same layout with a blue calendar icon; light editable fill (RGB 241,241,241). |

### 15.14 Operatory List

Screenshots: 14.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 14.PNG. Left-list group OFFICE (row 2, left cell; the cell to its right is empty). Criteria identical to Office List (PRINT FORMAT, OFFICE/GROUP). Rest of the criteria box blank - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Two radios on the first row under the header; no row label. Office is the filled radio. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Second row of the section, under the Office / Office Group radios. No label of its own. Read-only grey box (fill RGB 220,223,226) showing 108 - the same number as 'OID :108' in the title bar, i.e. the current office; button to its right: SELECT (blue = enabled, building icon). Presumably picks offices or office groups depending on the radio above (inference, not visible). |

### 15.15 ADA Categories List

Screenshots: 15.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 15.PNG. Left-list group MISC (row 1, left cell). PRINT FORMAT is the only criteria section - this report has no filters at all. The rest of the criteria box is blank down to its bottom border (exact-colour pixel sweep found nothing else) - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |

### 15.16 Default Ins Plan Coverage Category List

Screenshots: 16.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 16.PNG. Left-list group MISC (row 1, right cell). PRINT FORMAT is the only criteria section - this report has no filters at all. The rest of the criteria box is blank down to its bottom border (exact-colour pixel sweep found nothing else) - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |

### 15.17 Document Types List

Screenshots: 17.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 17.PNG. Left-list group MISC (row 2, left cell). PRINT FORMAT is the only criteria section - this report has no filters at all. The rest of the criteria box is blank down to its bottom border (exact-colour pixel sweep found nothing else) - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |

### 15.18 Notes Macro Category List

Screenshots: 18.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 18.PNG. Left-list group MISC (row 2, right cell). PRINT FORMAT is the only criteria section - this report has no filters at all. The rest of the criteria box is blank down to its bottom border (exact-colour pixel sweep found nothing else) - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |

### 15.19 Notes Macros List

Screenshots: 19.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 19.PNG. Left-list group MISC (row 3, left cell - the last visible row of the left list, which the bottom edge of the window cuts through). Two full-width sections (PRINT FORMAT, MACRO CATEGORY). Rest of the criteria box blank - the criteria panel itself is not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |
| MACRO CATEGORY | (unlabelled) | Dropdown | - | ALL | yes | list collapsed - other values not visible. No label of its own (the section header acts as the label); light editable fill with a single down-chevron at the right end. |

### 15.20 Patient Types List

Screenshots: 20.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 20.PNG. Left-list group MISC (row 3, right cell - the last visible item of the left list, which the bottom edge of the window cuts through). PRINT FORMAT is the only criteria section - this report has no filters at all. The rest of the criteria box is blank down to its bottom border (exact-colour pixel sweep found nothing else) - not truncated.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Two radios on one row directly under the header; no row label. PDF is the filled (blue) radio. |

## 16. My Reports

- Source: `my_reports` (5 reports transcribed) - window title: "My Reports"
- Reports listed in the legacy screen: Daily Journal, Time Clock Report, Missing Progress Notes, Appointment Detail by User, Production Report
- Notes: Five screenshots (1.PNG - 5.PNG, 1366 px wide, 586-593 px high), each showing a different report selected: 1 = Daily Journal, 2 = Time Clock Report, 3 = Missing Progress Notes, 4 = Appointment Detail by User, 5 = Production Report. Every listed report therefore has exactly one screenshot; there are no popups, expanded dropdowns, scrolled second views or non-report screens in this category. 4.PNG is cropped about 7 px at the top (title bar partly cut, still legible), 3.PNG and 5.PNG by 1-2 px; no content is lost.  SCREEN: dark title bar with 'My Reports' at the left and 'PGID :2829 / OID :108' followed by a white printer icon at the far right. Below it a blue header bar reading 'SELECT REPORT' over the left panel and 'REPORT CRITERIA' over the right panel, with the grey CLEAR CRITERIA button (refresh icon) at its right end. A small splitter / collapse handle (three vertical dots) sits between the two panels at mid height. A light action bar at the bottom of the criteria panel holds two blue right-aligned buttons: PRINT / PREVIEW (printer icon) and ADD TO MY FAVORITES (plus icon). No footer text and no scrollbars anywhere. 'My Reports' is an entry of the top-level Reports menu (drop_down_options.PNG in the parent folder), which also lists 'My Favorites' and 'Search Report'.  REPORT LIST: exactly 5 radio items in a two-column bordered grid - left column Daily Journal, Time Clock Report, Missing Progress Notes; right column Appointment Detail by User, Production Report (the third cell of the right column is empty). The rest of the left panel is uniform empty dark blue (pixel-verified), so the list is not scrollable or clipped.  RECURRING PATTERNS: every report has PRINT FORMAT (PDF default / Excel) and OFFICE/GROUP (Office default / Office Group, plus an unlabelled read-only box preset to 108 = the OID in the title bar, with a SELECT button). PRINT FORMAT is the right half of the first row for Daily Journal and Time Clock Report (beside REPORT BY / REPORT FORMAT) and a full-width first section for the other three. All Start Date / End Date fields show 11/21/2026 and carry a calendar icon; the screenshot files are dated 2026-11-21, so both ends evidently default to the current date. SELECT buttons carry a building icon for Office and Codes and a person icon for Provider and Operatory; the Provider, Operatory and Codes boxes default to ALL. No report in this category shows a User picker, GROUP BY, SORT BY or Page Break control.  STATE CHECKS (pixel-verified): enabled editable inputs (the REPORT BY dropdown, the date fields) have fill RGB 241,241,241 and border 206,209,219; the read-only picker boxes, the empty CORRESPONDING PROVIDER box and the Fee Schedule dropdown share fill 220,223,226 and border 209,209,209. The only control with paled text is the 'Group By Office' checkbox of Time Clock Report (label 161,161,161, grey box). The Fee Schedule dropdown of Production Report is recorded as disabled on the strength of its read-only box styling although its text is not paled. Every selected radio and ticked checkbox was confirmed by its blue fill, every unselected one by its empty dark ring / box. A scan of each criteria panel for box borders and for dark or grey ink, and of all blank areas, found no further control or text (no Page Break checkboxes, no right-edge items, nothing below the last section).  FONT CAVEAT: in the bold section-header font the capital G is drawn almost exactly like C at this size, so the pixels look like 'OFFICE/CROUP', 'DATE RANCE', 'APPOINTMENT DATE RANCE' and 'CORRESPONDINC PROVIDER'; they are transcribed as OFFICE/GROUP, DATE RANGE, APPOINTMENT DATE RANGE and CORRESPONDING PROVIDER (the mixed-case labels 'Office Group' and 'General' show a clear G, and the other category inventories read the same headers this way).  CROSS-REFERENCE (from the sibling category inventories, not from these screenshots): 'Daily Journal' and 'Production Report' also exist in Daily Reports with fuller criteria (Provider / User pickers, REPORT FORMAT, GROUP BY, Page Break ...), and 'Time Clock Report' also exists in Management Reports (there with a USER picker and without a PRINT FORMAT section). The My Reports versions are separate screens with no User picker: Daily Journal has a REPORT BY dropdown showing 'User', Production Report has a display-only CORRESPONDING PROVIDER box, and Time Clock Report has PRINT FORMAT but no user filter. 'Missing Progress Notes' and 'Appointment Detail by User' do not appear under these names in the other category inventories written so far.  UNKNOWNS: the values of the two collapsed dropdowns (REPORT BY other than 'User'; Fee Schedule other than 'CIGNA PPO HAMILTON ( 128 )'), the contents of the SELECT picker dialogs (Office, Office Group, Provider, Operatory, Codes), the tooltip of the Fee Schedule info icon, and what enables 'Group By Office' and the Fee Schedule dropdown are not shown in any screenshot.

### 16.1 Daily Journal

Screenshots: 1.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 1.PNG only (filled radio = Daily Journal), default state: no dropdown expanded, no popup. Layout: the first row is split into two half-width sections (REPORT BY left, PRINT FORMAT right); every other section is full width with its controls at the left. The whole criteria panel is visible: a band of uniform blank space lies between OTHER OPTIONS and the action bar and there is no scrollbar, so nothing is clipped. The REPORT BY list is collapsed, so its values other than 'User' are not visible. There is no Provider or User picker, no REPORT FORMAT and no GROUP BY on this screen. All radio / checkbox states and the absence of any further control (no Page Break, no right-edge items) were confirmed by pixel scan.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT BY | (unlabelled) | Dropdown | - | User | yes | list collapsed - other values not visible. No row label: the section header REPORT BY is its only caption. Enabled (light fill, single down-chevron at its right end). The section is the LEFT half of the first row, side by side with PRINT FORMAT. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | RIGHT half of the first row, beside REPORT BY. Both radios on one row. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section. Both radios on one row, no row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on its own row below the Office / Office Group radios; blue SELECT button with a building icon to its right. 108 is the same value as the OID shown in the title bar (the current office). Picker dialog not shown. |
| DATE RANGE | (unlabelled) | Radio | Transaction Date / Created Date | Transaction Date | yes | Date-basis selector on the first row of the section, above the Start Date / End Date rows (chooses which date the range applies to). |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Label in a left cell, date box in the next cell with a blue calendar icon inside the box at its right end. Format MM/DD/YYYY; equals End Date and the capture date (the default appears to be the current date). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Row directly below Start Date; same box with a blue calendar icon inside at its right end. |
| PATIENT TYPE | (unlabelled) | Radio | Both / General / Ortho | Both | yes | Full-width section. All three radios on one row, no row label. |
| TRANSACTION TYPES | Services | Checkbox | - | checked | yes | First of three checkboxes on one row; all three are ticked. |
| TRANSACTION TYPES | Payments | Checkbox | - | checked | yes | Second of three checkboxes on one row. |
| TRANSACTION TYPES | Adjustments | Checkbox | - | checked | yes | Third of three checkboxes on one row. |
| PRINT | (unlabelled) | Radio | Patient ID / Patient Chart# | Patient ID | yes | Both radios on one row, no row label. The second option is written exactly 'Patient Chart#' (no space before #). |
| OTHER OPTIONS | Show Datewise Distribution | Checkbox | - | unchecked | yes | Only control of the section; black label and normal box border (enabled). |

### 16.2 Time Clock Report

Screenshots: 2.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 2.PNG only (filled radio = Time Clock Report), default state: no dropdown expanded, no popup. Layout: the first row is split into REPORT FORMAT (left) and PRINT FORMAT (right); OFFICE/GROUP, DATE RANGE and OTHER OPTIONS are full width. No user / employee / provider picker is shown on this screen. The only greyed control is the Group By Office checkbox. About 200 px of uniform blank panel separate OTHER OPTIONS from the action bar and there is no scrollbar - nothing clipped.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| REPORT FORMAT | (unlabelled) | Radio | Detail / Summary / Employee Total Only | Detail | yes | LEFT half of the first row, side by side with PRINT FORMAT. All three radios on one row, no row label. |
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | RIGHT half of the first row, beside REPORT FORMAT. Both radios on one row. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Full-width section. Both radios on one row, no row label. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on its own row below the radios; blue SELECT button with a building icon to its right. 108 is the same value as the OID in the title bar. Picker dialog not shown. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Label in a left cell, date box in the next cell with a blue calendar icon inside the box at its right end. No date-basis radio row in this report (unlike Daily Journal). |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Row directly below Start Date; same box with a blue calendar icon inside at its right end. |
| OTHER OPTIONS | Group By Office | Checkbox | - | unchecked | **no (greyed)** | GREYED OUT / disabled: pale grey label (RGB 161,161,161 instead of black) and a grey box border and fill, unlike every other checkbox of this category; the box is empty (unchecked). Only control of the section. Captured while OFFICE/GROUP = Office with the single office 108; what enables it is not shown (possibly Office Group or a multi-office selection - inference only). |

### 16.3 Missing Progress Notes

Screenshots: 3.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 3.PNG only (filled radio = Missing Progress Notes), default state: no dropdown expanded, no popup. Layout: PRINT FORMAT full width; then OFFICE/GROUP (left half) and PROVIDER (right half) side by side, with the office box + SELECT on a row beneath them; APPOINTMENT DATE RANGE and APPOINTMENTS TO INCLUDE full width. There is no OTHER OPTIONS section, no date-basis radio row and no greyed control. A large uniform blank area lies below the last section and there is no scrollbar - nothing clipped.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section at the top of the criteria panel. Both radios on one row. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Section header and radio row occupy the LEFT half, side by side with PROVIDER. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on a full-width row beneath the OFFICE/GROUP and PROVIDER columns (box at the left, under the Office / Office Group radios); blue SELECT button with a building icon to its right. 108 is the same value as the OID in the title bar. Picker dialog not shown. |
| PROVIDER | Provider | Picker | - | ALL | yes | RIGHT half, beside OFFICE/GROUP. Row label 'Provider' in a label cell, then a read-only grey box showing ALL, then a blue SELECT button with a person icon. Picker dialog not shown. |
| APPOINTMENT DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section. Label in a left cell, date box in the next cell with a blue calendar icon inside the box at its right end. No date-basis radio row in this report. |
| APPOINTMENT DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Row directly below Start Date; same box with a blue calendar icon inside at its right end. |
| APPOINTMENTS TO INCLUDE | (unlabelled) | Radio | Only with Missing Progress Notes / ALL | Only with Missing Progress Notes | yes | Full-width section. Both radios on one row, no row label. The second option is written in capitals: ALL. |

### 16.4 Appointment Detail by User

Screenshots: 4.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 4.PNG only (filled radio = Appointment Detail by User), default state: no dropdown expanded, no popup. Layout: PRINT FORMAT full width; OFFICE/GROUP (left half) and PROVIDER (right half) side by side with the office box + SELECT on the row beneath; APPOINTMENT DATE RANGE, OPERATORY and OTHER OPTIONS full width. Despite the report name there is no User picker on the screen - the only people / resource filters are Provider and Operatory. No greyed control. A uniform blank area lies between OTHER OPTIONS and the action bar and there is no scrollbar - nothing clipped. The screenshot is cropped by about 7 px at the very top (title bar partly cut, text still legible); the criteria panel itself is complete.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section at the top of the criteria panel. Both radios on one row. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Section header and radio row occupy the LEFT half, side by side with PROVIDER. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on a full-width row beneath the OFFICE/GROUP and PROVIDER columns (box at the left, under the radios); blue SELECT button with a building icon to its right. 108 is the same value as the OID in the title bar. Picker dialog not shown. |
| PROVIDER | Provider | Picker | - | ALL | yes | RIGHT half, beside OFFICE/GROUP. Row label 'Provider' in a label cell, then a read-only grey box showing ALL, then a blue SELECT button with a person icon. Picker dialog not shown. |
| APPOINTMENT DATE RANGE | (unlabelled) | Radio | Appointment Date / Created On Date | Appointment Date | yes | Date-basis selector on the first row of the section, above the Start Date / End Date rows (chooses which date the range applies to). |
| APPOINTMENT DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Label in a left cell, date box in the next cell with a blue calendar icon inside the box at its right end. |
| APPOINTMENT DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Row directly below Start Date; same box with a blue calendar icon inside at its right end. |
| OPERATORY | Operatory | Picker | - | ALL | yes | Full-width section. Row label 'Operatory' in a label cell, then a read-only grey box showing ALL, then a blue SELECT button with a person icon (the same icon as the Provider SELECT button). Picker dialog not shown. |
| OTHER OPTIONS | Include Cancelled Appointments | Checkbox | - | checked | yes | On its own row (first of two). Spelled 'Cancelled' with a double l. |
| OTHER OPTIONS | Include Patient Phone Number | Checkbox | - | checked | yes | On its own row (second of two). |

### 16.5 Production Report

Screenshots: 5.PNG - Actions: CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES

> 5.PNG only (filled radio = Production Report), default state: no dropdown expanded, no popup. Layout: PRINT FORMAT full width; then OFFICE/GROUP (left) \| CORRESPONDING PROVIDER (right) with the office box + SELECT on the row beneath; DATE RANGE full width; PRODUCTION BY (left) \| CODES (right); OTHER OPTIONS (left) \| FEE SCHEDULE TO COMPARE (right). Two non-editable items in this default state: the empty CORRESPONDING PROVIDER box and the Fee Schedule dropdown (both with the read-only grey box styling) - see their notes. There is no REPORT FORMAT, GROUP BY or Page Break on this screen. A uniform blank area lies below the last row and there is no scrollbar - nothing clipped.

| Section | Control | Type | Options | Default | Enabled | Notes |
|---|---|---|---|---|---|---|
| PRINT FORMAT | (unlabelled) | Radio | PDF / Excel | PDF | yes | Full-width section at the top of the criteria panel. Both radios on one row. |
| OFFICE/GROUP | (unlabelled) | Radio | Office / Office Group | Office | yes | Section header and radio row occupy the LEFT half, side by side with CORRESPONDING PROVIDER. |
| OFFICE/GROUP | (unlabelled) | Picker | - | 108 | yes | Unlabelled read-only grey box on a full-width row beneath the OFFICE/GROUP and CORRESPONDING PROVIDER columns (box at the left, under the radios); blue SELECT button with a building icon to its right. 108 is the same value as the OID in the title bar. Picker dialog not shown. |
| CORRESPONDING PROVIDER | (unlabelled) | Text | - | - | **no (greyed)** | RIGHT half, beside OFFICE/GROUP. A single EMPTY box with exactly the read-only grey fill and border of the picker boxes, with NO row label and NO SELECT button or icon beside it (pixel check: nothing inside the box, nothing to its right) - a display-only field. Presumably filled by the system with the provider linked to the logged-in user; that is an inference from the header text, nothing is shown. |
| DATE RANGE | Start Date | Date | - | 11/21/2026 | yes | Full-width section. Label in a left cell, date box in the next cell with a blue calendar icon inside the box at its right end. No date-basis radio row in this report. |
| DATE RANGE | End Date | Date | - | 11/21/2026 | yes | Row directly below Start Date; same box with a blue calendar icon inside at its right end. |
| PRODUCTION BY | (unlabelled) | Radio | Code / Provider / Category | Code | yes | LEFT half, side by side with CODES. All three radios on one row, no row label. |
| CODES | (unlabelled) | Picker | - | ALL | yes | RIGHT half, beside PRODUCTION BY. No row label. Read-only grey box showing ALL, followed by a blue SELECT button with a building icon (the same icon as the office SELECT button). Picker dialog not shown. |
| OTHER OPTIONS | Include UCR | Checkbox | - | unchecked | yes | LEFT half, side by side with FEE SCHEDULE TO COMPARE. Only control of the section; black label and normal box border (enabled). |
| FEE SCHEDULE TO COMPARE | Fee Schedule | Dropdown | - | CIGNA PPO HAMILTON ( 128 ) | **no (greyed)** | list collapsed - other values not visible. RIGHT half, beside OTHER OPTIONS. Row label 'Fee Schedule' in a label cell (followed by a small info icon, recorded as the next control), then the dropdown with a single down-chevron at its right end. Value exactly 'CIGNA PPO HAMILTON ( 128 )' with spaces inside the parentheses. Appears DISABLED in this default state: its fill and border are pixel-identical to the read-only picker boxes (fill RGB 220,223,226 / border 209,209,209) and differ from the enabled REPORT BY dropdown and date fields (fill 241,241,241 / border 206,209,219); the value text and chevron are not paled, so the disabled reading rests on the box styling. It probably unlocks when Include UCR is ticked - inference, the dependency is not shown (the Production Report of the Daily Reports category shows the same dropdown greyed while Include UCR is unticked). |
| FEE SCHEDULE TO COMPARE | (unlabelled) | Other | - | - | yes | Info icon: small blue circle with a white 'i' immediately to the right of the row label 'Fee Schedule' (presumably a tooltip); its tooltip text is not visible in the screenshot. |

