# Legacy (Denticon) report outputs — Appointment, Recall and Referral Reports

Research input for the Reports & Analytics module plan. Researched 2026-11-22.

**Question answered:** for each report in the legacy `Appointment Reports` (9), `Recall Reports` (4) and `Referral Reports` (8)
menus, what does the generated report actually contain — purpose, printed title, columns, grouping, subtotals / totals,
what each criterion changes, who runs it and when, and known quirks. We hold screenshots of the criteria screens only
`[L1][L2][L3]`; this file reconstructs the outputs.

Sibling documents (not repeated here): `legacy_report_outputs_daily_my.md` (report viewer, Excel export behaviour, picker
dialogs, money conventions, My Reports), `legacy_report_outputs_monthly_mgmt_ledger_statements.md`,
`legacy_report_outputs_insurance_txplan_ortho.md`, `denticon_analytics_and_dso.md`, `dental_kpi_dictionary.md`.

---

## 0. Method, evidence tags, confidence scale

| Tag | Meaning |
|---|---|
| `[Pn]` | Planet DDS Help Center article or vendor PDF, text. Read through the public Help Center API (`support.planetdds.com/api/v2/help_center/en-us/articles/<id>.json`, `.../sections/<id>/articles.json`, `.../articles/search.json?query=`); the HTML pages refuse automated fetches. |
| `[Pn·img]` | Read by us from a screenshot or sample-report image embedded in that article / PDF (`support.planetdds.com/hc/article_attachments/<id>`). The year of each sample is given because samples span 2013–2026. |
| `[Cn]` | Documentation of a comparable system (Dentrix Enterprise, Open Dental, SoftDent, Dentrix Ascend). Used only for INFERRED items. |
| `[L1]` `[L2]` `[L3]` | Our verified criteria transcriptions: `legacy/appointment_reports.json`, `legacy/recall_reports.json`, `legacy/refferal_reports.json`. |
| **(S)** | Seen only as a search-result summary. Lower confidence. |
| **[unverified]** | No source; analyst inference. Do not treat as fact. |
| **[conflict]** | The vendor's own documents disagree, or a sample contradicts itself. |

Confidence rating per report:

- **DOCUMENTED** — the output layout was seen in a vendor sample image, or is described column by column in vendor text.
- **PARTIALLY DOCUMENTED** — purpose and some output facts are documented; a variant or the column list is inferred.
- **INFERRED** — no vendor description of the output; reconstructed from the criteria screen plus a named comparable.

Work done: all articles of the Help Center sections `Appointment Reports`, `Recall Reports` (two sections),
`Procedural Recalls`, `Non-Dental Recalls`, `Referral Reports`, `Referrals`, `Referral Setup`, `Referrals in Patient Record`, `Lab Reports`,
`Lab Cases`, `Labs`, `SmartAssist`, `AppointNow`, `Call List`, `Recall Dates`, `Reports Matrix`, `New Reports Menu`,
`Report Generation` were read; about 70 embedded images were opened; six vendor PDFs were read (`Reporting Matrix Final.pdf`,
`M12 Lab Tracking.pdf`, `M13 End of Day Reporting.pdf`, `M03 Understanding Appointments.pdf`,
`NP Placeholder Workflow.pdf`, `AppointNow Setup Guide.pdf`) and the Dentrix Enterprise 11.0 Reports Reference (566 pages).

Could not be read: the release-note articles (`Denticon Version 89 and Apteryx Updates`,
`Denticon Defect List Version 103-104` — sign-in required); the webinars `17 Recalls Keep'Em Coming Back For More`,
`23 Referrals, Labs, and Miscellaneous Helpful Features`, `56 Reports`, `58 How to Send Internal & External Referrals`, `60 A Dive into SmartAssist` (video only);
a DSO training portal on Google Sites that publishes a "Denticon classroom" (Google login).

Report names, option names and column headers are reproduced exactly (they are identifiers); everything else is
paraphrased. Sample values are the vendor's demo data and are not reproduced.

---

## 1. What planners most need to know

1. **Layout evidence exists for 13 of the 21 reports** (section 2). No output was found for:
   `Missed Appointments Not Marked As Missed`, `New Patients via Appointments`, `Appointments Confirmed Via Vendors`, the three `… Referral Management`
   reports, and for four of six `Appointment List` formats and three of four `Lab Report` types. `Appointment Time Stamps`
   is documented column by column in text only.
2. **Each menu item is a report family; the printed title is not the menu name.** `Recall Due Report` prints `Recall Due`,
   `Scheduled Recall Report` prints `Scheduled Recall Due`, `Procedural Recall Report` prints `Procedural Recall - Provider`,
   `Referral Production List` prints `Referral Production Listing` (subtitle `(by Zip Code)`), `Referral Summary Report`
   prints `Referral Summary`, `Appointment List` / `Cancelled List` prints `Appointment Cancellation List`, `Lab Report` /
   `Not Received` prints `Lab Sent Not Received Appointments`, `SmartAssist Report Card` prints
   `SmartAssist Report Card - Detail` `[P40·img][P42·img][P45·img][P54·img][P52·img][P6·img][P26·img][P17·img]`.
3. **Three corrections to our criteria transcriptions** (section 7): `Appointment List` does have `PRINT FORMAT` and its
   clipped header reads `REPORT FORMAT TO PRINT`; the clipped third option of `Appointment Detail` is
   `Include Patient Home Office`; `Recall Due Report` ends at `Include Inactive Patients` `[P1·img][P3·img][P11·img][P15·img][P40·img]`.
4. **Recall reports are code-level, not patient-level.** One patient line plus one `Code :` line per recallable code with
   `Recall Due`, `Scheduled Date`, `Time`, `Prdr`. A recall counts as scheduled only when the recallable procedure code is
   embedded in the future appointment `[P40][P41][P42·img]`.
5. **Recall reports silently exclude accounts flagged `Send to Collection`** and inactive patients (footer note
   `* Excludes Inactive Patients`) `[P44][P46·img]`.
6. **"Missed" has a rule-based definition:** marked `Missed`, OR no completed visit-code procedure posted for the
   appointment date, OR missed and rescheduled. `Missed Appointments Not Marked As Missed` exists to list the second class
   `[P8]`; its layout is unknown.
7. **`Cancelled List` and `Missed List` are history; `Call List` is the work list** — it drops appointments that were
   replaced or taken "off call list" `[P1][P2][P9]`.
8. **Referral production reports are single-office and current-state only:** results are limited to the office the report
   is run in; changing a patient's office or referral loses the history. Vendor positions them as marketing ROI reports,
   not accounting reports `[P54]`.
9. **Referral source `Cost` is stored but used by no report** — a future ROI report was planned and never shipped `[P64]`.
10. **Referral cases have a fixed status vocabulary:** `Pending` (default), `Accepted`, `Rejected`, `In Progress`,
    `Completed`, `Cancelled`, `Not Needed`, `Expired` (automatic after 30 days); internal referrals use `Tx Status`
    `Incomplete` / `Completed`; external-incoming adds contact tracking `[P57·img][P59·img][P60·img][P61]`.
11. **`SmartAssist Report Card` is a per-appointment compliance checklist with a percentage row** (13 check columns,
    check / cross / `N/A`); it only evaluates data in the office of the appointment `[P17][P17·img][P20·img]`.
12. **Lab reports read lab fields stored on the appointment** (`Lab`, `Lab Cost`, `Sent on`, `Due on`, `Recvd. on`); a case
    without those fields never appears `[P26][P28][P42·img]`.
13. **`Appointment Detail` is the general-purpose appointment listing** (schedule print, monthly appointment count,
    user accountability by `Created On Date`, AppointNow bookings); new-patient placeholders print with `Pat ID` 0
    `[P11][P12][P13][P14·img]`.
14. **Vendor samples contain arithmetic inconsistencies worth not copying:** a `Collection` total that nets signed values
    under unsigned rows, `# Visits` subtotals that do not equal row sums, `Avg Production` equal to production when the
    referral count is zero, opposite collection signs in two layouts of the same report (section 6, section 10).
15. **Time stamps are server time (Pacific), not office time** `[P33]`; this affects `Appointment Time Stamps`, created-date
    grouping and any confirmation timestamp.

---

## 2. Confidence summary

| # | Category | Report (exact legacy name) | Output grain | Confidence | Best evidence | Comparable used |
|---|---|---|---|---|---|---|
| 1 | Appointment | `Appointment List` | One appointment per row; 6 formats | DOCUMENTED (`Cancelled List`, `Cancelled From Automated Campaigns`); PARTIAL (`Call List`, `Missed List`); INFERRED (`Confirmation Call List`, `Pull Chart List`) | Samples 2023, 2024 `[P6·img][P7·img]` | Dentrix Enterprise `Daily Appointment List` `[C1]`; SoftDent `Confirmation List`, `Appointment List` `[C6][C7]`; Open Dental `Confirmation List` `[C3]` |
| 2 | Appointment | `Missed Appointments Not Marked As Missed` | One past appointment per row | INFERRED | Missed definition `[P8]`; criteria `[L1]` | Open Dental `Broken Appointments Report` `[C2]`; Denticon `Appointment Cancellation List` |
| 3 | Appointment | `New Patients via Appointments` | One placeholder appointment per row | PARTIALLY DOCUMENTED (purpose); layout INFERRED | `[P28][P27][P30][P31]` | Dentrix Enterprise `New Patient List` `[C1]` |
| 4 | Appointment | `Lab Report` | One appointment with a lab case per row; 4 types | DOCUMENTED (`Not Received`); PARTIAL (other three) | Sample 2022 `[P26·img]` | Dentrix Ascend `Lab Case – Appointments` `[C9]` |
| 5 | Appointment | `SmartAssist Report Card` | One appointment per row + % row | DOCUMENTED (`Detail`); INFERRED (`Summary`) | Samples 2021, 2022, 2024 `[P20·img][P17·img][P19·img]`; field guide `[P17]` | — |
| 6 | Appointment | `Appointments Confirmed Via Vendors` | One confirmed appointment per row [unverified] | INFERRED | Criteria `[L1]`; vendor API setup `[P34]` | Denticon `Appointment Cancellation Report From Denticon Patient Engagement` `[P7·img]` |
| 7 | Appointment | `Appointment Time Stamps` | One appointment per row | DOCUMENTED (columns in text); layout not seen | `[P16]` | Dentrix Enterprise `Appointment Cycle Time Report` `[C1]` |
| 8 | Appointment | `Appointment Detail` | One appointment per row | DOCUMENTED | Samples 2013, 2023, 2026 `[P13·img][P14·img][P11·img]` | — |
| 9 | Appointment | `Lab Cost Report` | One appointment with a lab case per row | DOCUMENTED | Samples 2022, 2024 `[P26·img][P22·img]` | — |
| 10 | Recall | `Procedural Recall Report` | One completed procedure per row | DOCUMENTED | Sample c. 2019 `[P45·img]` | — |
| 11 | Recall | `Scheduled Recall Report` | Patient line + one line per scheduled recall code | DOCUMENTED | Sample 2026 `[P42·img]` | — |
| 12 | Recall | `Recall Due Report` | Patient line + one line per due recall code | DOCUMENTED | Sample 2022 `[P40·img]`; rules `[P40][P41]` | — |
| 13 | Recall | `Post-Op Report` | One post-op procedure per row | DOCUMENTED | Sample 2020 `[P46·img]` | — |
| 14 | Referral | `Referral Production List` | One referred patient per row | DOCUMENTED (both layouts) | Samples 2016 `[P54·img]` | — |
| 15 | Referral | `Referred Out List` | One referred-out patient per row | DOCUMENTED | Sample 2016 `[P55·img]` | — |
| 16 | Referral | `Referral Source List` | One referral source per row | DOCUMENTED | Sample 2016 `[P56·img]` | — |
| 17 | Referral | `External Outgoing Referral Management` | One referral case per row [unverified] | INFERRED | Utility grid `[P57·img]`; criteria `[L3]` | Open Dental `Referred Proc Tracking` `[C4]`; Dentrix Enterprise `Referred To Doctor Report` `[C1][C8]` |
| 18 | Referral | `Referral Summary Report` | One referral source per row within referral type | DOCUMENTED | Sample 2023 `[P52·img]` | — |
| 19 | Referral | `Referral Count Summary` | One referral source per row within referral type | DOCUMENTED | Sample 2016 `[P53·img]` | — |
| 20 | Referral | `Internal Referral Management` | One referral case per row [unverified] | INFERRED | Utility grid `[P60·img]`; criteria `[L3]` | Open Dental `Referred Proc Tracking` `[C4]` |
| 21 | Referral | `External Incoming Referral Management` | One referral case per row [unverified] | INFERRED | Utility grid and field guide `[P58·img][P59·img]`; criteria `[L3]` | Dentrix Enterprise `Referred By Doctor/Other Report` `[C1]` |

---

## 3. Cross-cutting facts for these three categories

### 3.1 Shell, viewer, page furniture

| Aspect | Observed | Source |
|---|---|---|
| Criteria screens | `…/ASPX/NewReports.aspx?RptName=Appointment%20Reports`, `Recall%20Reports`, `Referral%20Reports`. Every report in the three categories has `PRINT FORMAT` (`PDF` / `Excel`). | `[P11·img][P43·img][P54·img][P3·img]` |
| Report lists over time | Appointment Reports: the same 9 names in 2022, 2023, 2024, 2025, 2026 screenshots. Recall Reports: the same 4 in 2023 and 2026. Referral Reports: 7 in June 2023 (no `External Incoming Referral Management`), 8 in our 2026 capture. | `[P26·img][P3·img][P22·img][P11·img][P1·img][P43·img][P42·img][P54·img][L3]` |
| Viewer | Separate `Report Viewer` window, `reports.denticon.com` / `reportsazvm.denticon.com` `/ReportViewer/ReportFrame?rptPath=/PoWReports/<name>&args=…`; header bar `Export to:-` with Excel and Word icons. | `[P22·img][P52·img][P6·img][P19·img][P40·img]` |
| Internal report names seen | `LabCostReport`, `SmartAssistRptCardD`, `NewDailyApptCancLst` (Appointment Cancellation List), `ReferralRefSumm` (Referral Summary). `ReferralRefSumm` args: PGID; OID; `false`; start date; end date; `ALL` … (positional, `;`-separated). | same images |
| Header | Line 1 organisation name, line 2 report title, then `Office : <office name>` (underlined) as the outer group. The 2016 referral samples, the c. 2019 Procedural Recall sample and the 2020 Post-Op sample have no `Office :` line. | all samples |
| Footer | Criteria echo, then the title again, `Printed : <date time>`, `PlanetDDS (c) 2003 - <year>`, `Page : n of m`; one sample adds `By : <user>`. Echo labels seen: `From Appt Date` / `Thru`, `From Created Date`, `Appt Date From`, `Date From`, `Procedure Date From`, `From`, `Offices`, `Providers`, `Operatories` / `Operatory`, `Users`, `Labs`, `Exclude Pat Type`, `Ex Resp Party Type`, `Referral Types`, `Specialty`, `Referred Out to`, `From Zip` / `Zip`, `Referral By/To`, starred note `* Excludes Inactive Patients`. | `[P11·img][P13·img][P26·img][P46·img][P53·img][P55·img][P56·img]` |
| Count totals | Count lines use the pattern `Total for, <group value> : n`, `Total Appointments for lab, <lab> : n`, `Total Recalls for, <office> : n`, `Grand Total … : n`. | `[P11·img][P26·img][P42·img]` |
| Excel | No Excel sample was found for these categories. General behaviour (file download, layout-preserving sheet) is in `legacy_report_outputs_daily_my.md` section 3.1. | — |
| Freshness | Reports come from a separate report server that mirrors production data and can lag. | `[P37]` |
| Favourites | One saved version per report (`ADD TO MY FAVORITES` → `UPDATE MY FAVORITES`). | `[P38]` |
| Rights | `Reports - Appointment Reports Screen Full Control` / `View Only`; `Reports - Recall Reports Screen Full Control` / `View Only`; `Reports - Referral Reports Screen Full Control` / `View Only` (view only = see list and parameters, cannot generate). Referral cases themselves need `Utilities - Referral Management Full Control`. | `[P36][P16][P40][P67]` |

### 3.2 Records the reports draw from (seen in vendor screenshots)

| Record | Fields visible | Source |
|---|---|---|
| Appointment (`Add/Edit Appointment`) | `Operatory`, `Status`, `Prod. Type`, `Missed` and `Cancelled` checkboxes, `Notes`, `Date`, `Starts At`, `Duration`, `Patient Pref. Prdr.`, `Campaign ID`, `Prdr.`, `Referred By`, `Short Notice` (weekday AM / PM grid); lab block `Lab` (checkbox + lab), `Lab Cost`, `Sent on`, `Due on`, `Recvd. on`; `Treatments` grid `St.` · `Code` · `TH` · `Surf` · `Description` · `Bill` · `Dur.` · `Prdr.` · `Prdr. Units` · `Est. Pat.` · `Est. Ins.` · `Fee` | `[P42·img]` |
| Appointment status history (details pop-up) | One cell per status — `Scheduled`, `Left Message`, `Confirmed`, `Un-confirmed`, `Missed`, `Cancelled`, `In Reception`, `Available`, `In Operatory`, `Checked Out`, `Posted` — each with timestamp (labelled `PST`) and user; plus `Created:` and `Modified:` date and user | `[P41·img][P32]` |
| Cancellation | Reason (code up to 10 characters + description; about ten system defaults that cannot be inactivated, such as `Cancelled by office`, `Cancelled same day`, `No reason provided`, `Cancelled by Denticon Patient Engagement`; offices add their own) and free-text cancellation note | `[P5][P5·img][P65]` |
| Recall (`RECALLS` grid / `EDIT RECALL DUE DATES`) | Per recallable code: `Code`, `Int` + `Int. Type` (Month / Year, optional `+1 day`), `Recall Due Date`, `Schedule Date`, `Schedule Time`, `Recall Reason`; per patient `First Visit`, `Last Visit` | `[P42·img][P41·img][P49]` |
| Procedure code flags | `Recall` interval, `Post-Op`, `Requires Lab`, `Visit Code`, `Ledger Code`, `A/R Code` | `[P46·img]` |
| Referral source (`Setup > Referrals > Referrals`) | `Referred by/To` (`Referred By` / `Referred To` / `Both`), `Type` (referral type), name, address, phone, contact, email, `Specialty`, `Cost`, notes, custom demographics, `Custom 1` / `Custom 2`, `eReferral ID` and verified state; since 2026-11 optional office-group `ASSOCIATIONS` | `[P64][P56·img][P61][P63]` |
| Patient referral fields | `Referral Type` (mandatory), `Referred By` (optional specific source), `Referred To` with `Ref. To Date` | `[P52][P52·img][P64]` |
| Referral case (`Utilities > Referral Management`) | Tabs `INTERNAL - INCOMING`, `INTERNAL - OUTGOING`, `EXTERNAL - INCOMING`, `EXTERNAL - OUTGOING`; view filter `Active` / `Completed` / `All`, `Hide Deleted Referrals`; 15 rows per page | `[P57·img][P58·img][P60·img]` |

### 3.3 Shared vocabulary

| Term | Meaning in the legacy tool | Source |
|---|---|---|
| Confirmation statuses | `Scheduled` (default), `Confirmed`, `Un-Confirmed`, `Left Message` | `[P32]` |
| Same-day statuses | `In Reception`, `Available`, `In Operatory`, `Checked Out`; `Posted` is set automatically when the appointment's procedures are posted. Future appointments cannot take these or `Missed`. | `[P32][P6]` |
| Missed | (a) status manually set to `Missed`; (b) no completed procedure posted to the ledger for the appointment's date (the code must be a `Visit Code`); (c) missed and rescheduled to another day. Marked-missed appointments stay on the schedule struck through. | `[P8][P32]` |
| Cancelled | Removed from the schedule, kept in appointment history and on the call list. A **deleted** appointment leaves no trace in any appointment report (only the Audit Trail). | `[P32][P10]` |
| Call list | Missed or cancelled appointments still needing a replacement. An entry leaves the list when rescheduled, when a new appointment is made, or when a user ticks `Off List`; it can be restored. Removal does not affect the historical missed / cancelled lists. | `[P9]` |
| New Patient appointment | A placeholder appointment (Quick Save) not yet linked to a patient record; red `N` on the schedule. | `[P29][P31]` |
| New patient (reports) | Two definitions coexist: record created date, and first visit date (first completed procedure). | `[P29]` |
| `Pref Prdr` / `Pref Hyg` | The patient's preferred provider / hygienist from Patient Information. | `[P29][P40·img]` |
| `Transaction Provider` | Provider on the ledger line of the completed procedure. | `[P29][L2]` |
| `Type` (column) | User-defined patient types (up to six per patient), printed as codes. `Resp. Party Type` is a separate account-level code (`CA - Cash`, `CC - Collections`, `IN - Indemnity`, `OO - PPO`, …). | `[P65][P44·img]` |
| Office scope | `Office` = one or more offices; `Office Group` = groups from setup. Referral sources are organisation-wide (office-group associations are new in 2026-11), which is why `Referral Source List` disables the office picker. | `[P56·img][P63]` |
| Time zone | All stored time stamps are Pacific (server) time; no office-local conversion. | `[P33]` |

---

## 4. Appointment Reports (`appointment_reports`)

### Appointment List

**Confidence:** DOCUMENTED for two formats, PARTIALLY DOCUMENTED for two, INFERRED for two. **Family of six list formats**
chosen with `REPORT FORMAT TO PRINT` `[P1·img][L1]`.

| Format (radio) | Printed title | Purpose | Evidence |
|---|---|---|---|
| `Confirmation Call List` | [unverified] | Working list for confirmation calls for a date or range | `[P3]` text only |
| `Call List` | old menu name `Appointment Call List` `[P27]` | Missed or cancelled appointments that still have no replacement | `[P1][P2][P9]` semantics only |
| `Pull Chart List` | old menu name `Appointment Pull Chart List` `[P27]` | "Patients for the day" list for pulling charts | `[P27]` one line |
| `Cancelled List` | `Appointment Cancellation List` | History of cancelled appointments, with reason and note | Sample 2024 `[P6·img]` |
| `Cancelled From Automated Campaigns` | `Appointment Cancellation Report From Denticon Patient Engagement` (2023; the radio was then labelled `Cancelled From Denticon Patient Engagement`) | Appointments cancelled by the patient through an automated campaign message | Sample 2023 `[P7·img]` |
| `Missed List` | old menu name `Missed Appointment List` `[P27]` | History of appointments marked missed | `[P1][P2]` semantics only |

**`Cancelled List` → `Appointment Cancellation List`** (internal name `NewDailyApptCancLst`) `[P6·img]`

| Element | Content |
|---|---|
| Outer group | `Office : <office>` |
| Group band | `Appointment Date: <Weekday, Month d, yyyy>` |
| Columns | `Time` · `Len` · `Prdr` · `Chart #` · `Patient Name` · `Phones` (`(H):` `(W):` `(C):`) · `Lst Pymt` · `#Cancel` · `Appt Reason` · `Charges` · `Curr Bal` |
| Sub-lines per row | `Appt Notes :`, `Cancellation Reason : <reason description>`, `Cancellation Note : <free text>` |
| Totals | `Total Number of Appointments Cancelled : n` and `Total : <sum of Charges>` |

Readings of abbreviated headers are ours: `Lst Pymt` = last payment amount, `#Cancel` = number of cancellations for the
patient, `Appt Reason` = scheduled procedures [unverified].

**`Cancelled From Automated Campaigns` → campaign cancellation report** `[P7·img]`

| Element | Content |
|---|---|
| Groups | `Created Date: <date>` → `Office: <office>` |
| Columns | `Appt Date/Time` (plus `OP: <operatory>`) · `Prdr` · `Patient Name/ID` (plus `Bal:`) · `Cell#/Email` · `Carrier` (`P :` / `S :` with carrier phone) · `Procedure (Codes)` · `Notes` (appointment notes + `Cancellation Reason :`) · `Campaign Name(ID) Touch Point` (campaign name, id, touch point such as SMS n days before) · `Cancelled Date/Time` |
| Totals | `Total for Office, <office> : n`, `Total for, <date> : n`, `Grand Total : n` |

**Criteria → output** `[L1][P3·img][P6·img]`

| Criterion | Effect | Source |
|---|---|---|
| `REPORT FORMAT TO PRINT` | Chooses the layout above and which criteria are enabled. With `Confirmation Call List`: only office, provider, dates and `Include Patient Balance` are enabled. With `Cancelled List`: `EXCLUDE PATIENT TYPE`, `EXCLUDE RESP. PARTY TYPE`, `CANCELLATION REASON` and `Include Off Call List` are enabled; `OPERATORY` and the `Status` boxes stay disabled and `Length` appears disabled. States for the other four formats were not captured. | `[L1][P3·img][P6·img]` |
| `DATE RANGE` | Appointment date; defaults to today. | `[P3][P4]` |
| `PROVIDER`, `OFFICE/GROUP`, `EXCLUDE PATIENT TYPE`, `EXCLUDE RESP. PARTY TYPE` | Row filters. | `[P4][P5]` |
| `CANCELLATION REASON` | Limits cancelled appointments to chosen reasons (system and office-defined). | `[P5]` |
| `APPOINTMENT TYPE` `Length`, `Status` `Missed` / `Cancelled`, `Include Off Call List` | Mirror the Scheduler `Call List` screen filters `Select Duration (mins)`, `Show Missed`, `Show Cancelled`, `Show Off Call List`; presumably active for `Call List` [unverified]. | `[P9·img][P28]` |
| `Include Patient Balance` | Prints the balance (`Curr Bal` / `Bal:`). | `[P3][P6·img]` |
| `SORT BY` (`Appointment Date`, `Provider (Last Name) – Appointment Date`, `Patient Chart#`, `Patient Last Name`) | Row order; disabled for `Confirmation Call List`; presumably enabled for `Pull Chart List` [unverified]. | `[L1]` |

**Rules.** `Cancelled List` and `Missed List` ignore whether a replacement appointment exists; `Call List` omits appointments
that were replaced (default parameters) `[P1][P2]`. The cancellation reason and note print on the `Cancelled List` `[P6]`.

**Who / when.** Front office, daily: `Cancelled List` or `Missed List` to win patients back `[P28]`; `Call List` to reschedule
`[P10]`; the campaign cancellation format daily to catch patient self-cancellations (there is no other notification) `[P7]`;
`Confirmation Call List` before the day `[P3]`; `Pull Chart List` when preparing the next day `[P27]`.

**Inferred layouts (no vendor sample).** `Confirmation Call List`: time, status, patient, phones, provider / operatory,
reason, balance — as in Dentrix Enterprise `Daily Appointment List` (`Time`, `Status`, `Patient Name`, `Prov/Op`,
`Appointment Reason`, `Phone`) `[C1]` and SoftDent `Confirmation List` `[C6]`. `Call List`: the Scheduler screen grid `Status` ·
`Appt. Info` · `Provider` · `Operatory` · `Patient` · `Procedures` · `Prod. $` · `Notes` `[P9·img]`. `Missed List`: the
cancellation-list frame with a missed count [unverified]. `Pull Chart List`: chart number, patient, appointment time,
provider, as in SoftDent `Appointment List` `[C7]` [unverified].

**Quirks.** The campaign format groups by `Created Date`, which in the sample matches neither the appointment date nor the
cancellation date — presumably the appointment's creation date [unverified]. The radio and (probably) the title were
renamed from "Denticon Patient Engagement" to "Automated Campaigns" between June 2023 and May 2024 `[P3·img][P6·img]`.

**Sources:** `[P1][P2][P3][P4][P5][P6][P7][P9][P10][P27][P28][L1][C1][C3][C6][C7]`

### Missed Appointments Not Marked As Missed

**Confidence:** INFERRED. No vendor article, sample or training page names this report's output.

**Purpose (inferred).** List appointments in the date range that satisfy the rule-based missed definition — no completed
visit-code procedure posted for the appointment date — but whose status was never set to `Missed` (and that were not
cancelled). It is the clean-up list that reconciles the schedule with the ledger `[P8][L1]`.

**Criteria** `[L1]`: `PRINT FORMAT`, `OFFICE/GROUP`, `PROVIDER`, `DATE RANGE`, `EXCLUDE PATIENT TYPE`,
`EXCLUDE RESP. PARTY TYPE`, `Show Patient Balance` (ticked by default).

**Inferred layout.** The same frame as `Appointment Cancellation List`: office → appointment date; time, length, provider,
chart number, patient, phones, appointment reason, charges, current balance (when `Show Patient Balance` is ticked); count
total per office [unverified]. Comparable: Open Dental `Broken Appointments Report`, "By appointment status" variant
(`AptDate`, `Patient`, `Doctor`, `Hygienist`, `IsHyg`; total broken appointments per clinic) `[C2]`.

**Who / when.** Front office or office manager at end of day / week, alongside `Daily Audit` (which lists scheduled patients
missing a ledger transaction) `[P27][P28]` [unverified for this report].

**Quirks to expect.** Depends on the `Visit Code` flag: an appointment whose only posted codes are not visit codes still
counts as missed `[P8]`. Posting on a different date than the appointment date has the same effect [unverified].

**Sources:** `[P8][P27][P28][L1][C2]`

### New Patients via Appointments

**Confidence:** PARTIALLY DOCUMENTED (purpose); layout INFERRED.

**Purpose.** Find new-patient placeholder appointments — created with Quick Save on the Scheduler — whose patient record
has not been completed / activated, so staff can finish registration before the visit. Old name
`New Patient Thru Appointment`, also listed under `Lists > Patient List` `[P28][P27][P30]`.

**Criteria** `[L1]`: `PRINT FORMAT`, `OFFICE/GROUP`, `DATE RANGE` only (no provider filter).

**Inferred layout.** One row per placeholder appointment: appointment date / time, operatory, provider, the name typed on
the appointment, phone, appointment notes; count total [unverified]. In-family evidence: `Appointment Detail` prints such
placeholders with the typed name, `Pat ID` 0 and an empty balance `[P14·img]`. Comparable: Dentrix Enterprise
`New Patient List`, which separately totals "non-patients" that had an appointment `[C1]`.

**Who / when.** Front office, weekly `[P28]`; end-of-day routine `[P27]`.

**Quirks.** A placeholder becomes an ordinary appointment once a patient record is linked, so it drops off the report
`[P29]`. Online-registration completion is tracked elsewhere (`Online Registered Patients`) `[P31]`.

**Sources:** `[P27][P28][P29][P30][P31][P14·img][L1][C1]`

### Lab Report

**Confidence:** DOCUMENTED for `Not Received`; PARTIALLY DOCUMENTED for the other three types.

**Family of four** chosen with `REPORT TYPE` `[L1][P26·img]`:

| `REPORT TYPE` | Old menu name `[P23]` | Printed title | Meaning |
|---|---|---|---|
| `Appointment List` | `Appointment List – Lab` | [unverified] | All appointments in the range that carry a lab case |
| `Not Sent` | `Lab Required Not Sent Appointment List` | [unverified] | Lab required but no sent date |
| `Not Received` | `Lab Sent Not Received Appointment List` | `Lab Sent Not Received Appointments` `[P26·img]` | Sent, not yet received |
| `Due Date` | `Appointment List - Lab due date` | [unverified] | Cases due on the `DUE DATE` chosen [unverified] |

**`Not Received` layout** (sample 2022) `[P26·img]`

| Element | Content |
|---|---|
| Groups | `Office : <office>` → `Lab : <lab name>   Phone# : <lab phone>` → `Lab Sent on : <Month d, yyyy>` |
| Columns | `Appt Date` · `Time` · `Provider` · `Patient Name` · `Phone#` (`(H)` `(C)` `(W)`) · `Description` · `Lab Sent` · `Lab Due` · `Charges` |
| Totals | `Total Appointments for lab, <lab> : n`; `Total Appointment for, <office> : n`; `Grand Total Appointments : n` |
| Footer | `Appt Date From` / `Thru`, `Offices`, `Providers`, `Exclude Pat Type`, `Ex Resp Party Type`, `Labs` |

`Description` shows the appointment's procedure description and `Charges` its fee (readings from the samples) [unverified].

**Criteria → output** `[L1][P26]`

| Criterion | Effect |
|---|---|
| `REPORT TYPE` | Selects population and title (table above). |
| `APPOINTMENT DATE RANGE` | Filters on the date of the appointment that carries the lab case. |
| `DUE DATE` | Single date; disabled unless `REPORT TYPE` = `Due Date` (state seen only for `Appointment List`) [unverified]. |
| `LAB`, `PROVIDER`, `OFFICE/GROUP` | Row filters; `Lab` is also the first group level. |
| `EXCLUDE PATIENT TYPE`, `EXCLUDE RESP. PARTY TYPE` | Row filters, echoed in the footer. |

**Who / when.** Back office and clinical staff, daily, looking two days ahead with `Not Received`, so that an appointment is
not kept without its case `[P28]`; end-of-day lab follow-up `[P27]`.

**Quirks.** The case exists only as fields on one appointment (impression or delivery appointment — the office chooses);
without them the appointment never appears `[P24][P28]`. Labs must be set up before the fields unlock `[P25]`. Since 2026-11
labs can be assigned per office / office group `[P63]`.

**Sources:** `[P23][P24][P25][P26][P27][P28][P63][L1][C9]`

### SmartAssist Report Card

**Confidence:** DOCUMENTED (`Detail`); `Summary` layout INFERRED.

**Purpose.** Score each appointment against the office's SmartAssist checklist: before the day to see what must be
collected, after the day to see what was missed; the percentage row is used for weekly / monthly performance review
`[P20][P19]`.

**`Detail` layout** — title `SmartAssist Report Card - Detail` (internal name `SmartAssistRptCardD`) `[P17·img][P19·img][P20·img]`

| Element | Content |
|---|---|
| Group | `Office : <office>` (rows not grouped by provider in the samples) |
| Columns | `Provider Short ID` · `Appt Date/ Time` · `Checked In By/ Out By` (user names) · `Pat Name/ Pat ID` · `Payment` · `Email` · `Cell Phone` · `Eligibility` · `Medical History` · `HIPAA` · `Consent 1` · `Consent 2` · `Consent 3` · `Consent 4` · `Progress Notes` · `Ledger Posting` · `Next Appt` |
| Cell values | check = complete, cross = action still required, `N/A` = item not enabled in the office's SmartAssist setup |
| Totals | `Total appointments for office, <office> : n` and `Grand Total appointments : n`, each with a completion percentage per check column (`N/A` where not enabled) |
| Footer | `From` / `Thru`, `Offices`, `Providers` |

**Check definitions** `[P17]`

| Column | Complete when |
|---|---|
| `Payment` | Ledger balance is zero; with the setup option for the selected appointment's unpaid balance, an unpaid procedure of that appointment also fails |
| `Email`, `Cell Phone` | Value on file, or a bypass reason recorded |
| `Eligibility` | Primary insurance eligibility status is `Eligible` (`Not Eligible`, `Unknown` or expired fail) |
| `Medical History` | Medical history present within the frequency set in SmartAssist setup |
| `HIPAA`, `Consent 1–4` | The configured form is on file within its frequency (`Every Visit`, `Every Year`, `Every Two Years`, `Every Calendar Year`) |
| `Progress Notes` | A progress note exists on the appointment date |
| `Ledger Posting` | A ledger entry with a transaction date equal to the appointment date exists |
| `Next Appt` | A later appointment exists for the patient in the same office |

**Criteria → output** `[L1][P17][P18]`

| Criterion | Effect |
|---|---|
| `REPORT FORMAT` `Detail` / `Summary` | `Detail` as above. `Summary` not seen; presumably percentages only, per office / provider [unverified]. |
| `APPOINTMENT DATE RANGE` | Appointment date; future dates return rows only with `Include Missed Appointments`. |
| `Include Missed Appointments` | Adds appointments not checked in through checked out / without posted procedures, including future ones. |
| `Include Cancelled Appointments` | Adds cancelled appointments. |
| `PROVIDER`, `OFFICE/GROUP` | Row filters. |

**Quirks.** Checks read only data of the office (OID) of the appointment, even when several offices are selected; a note
or a next appointment in another office counts as missing `[P17]`. `Ledger Posting` fails when procedures are posted on a
later date `[P17]`. An eligibility status that later expires turns the historical row to a cross `[P17]`. The footer spells
the title `Smart Assist Report Card - Detail` `[P20·img]`.

**Sources:** `[P17][P18][P19][P20][P21][L1]`

### Appointments Confirmed Via Vendors

**Confidence:** INFERRED. No vendor article, sample or training page found. The report has existed since at least 2022
`[P26·img]`.

**Purpose (inferred).** List appointments in the date range whose confirmation was written back by a third-party vendor
through the vendor API (patient-engagement partners such as reminder / confirmation services), per vendor — to audit what
an integration confirmed [unverified]. Vendors are enabled per office under `Setup > Offices > Vendor API Settings (New)`
`[P34]`; the public partner list groups about 20 partners as patient engagement `[P34]`.

**Criteria** `[L1]`: `PRINT FORMAT`, `OFFICE/GROUP`, `DATE RANGE`, `VENDORS` (picker, default `ALL`). No provider filter.

**Inferred layout.** Closest in-family template is the campaign cancellation report `[P7·img]`: appointment date / time and
operatory, provider, patient name / id, contact, procedure codes, plus vendor name and confirmed date / time; grouped by
office (and probably vendor), count totals [unverified]. The appointment status history already stores a `Confirmed` time
stamp and user `[P41·img]`; a vendor confirmation presumably records the vendor there [unverified].

**Comparable.** Open Dental marks appointments confirmed automatically from eConfirmations but documents no dedicated
report `[C3]` (S).

**Sources:** `[L1][P34][P7·img][P41·img][P26·img][C3]`

### Appointment Time Stamps

**Confidence:** DOCUMENTED (columns defined in vendor text); page layout, grouping and totals not seen.

**Purpose.** Track patient flow from arrival to check-out and compute waiting and chair time `[P16]`.

**Columns** `[P16]`

| Column | Definition |
|---|---|
| `Appt Date` | Appointment date |
| `Appt Time` | Scheduled time |
| `In Reception` | Time the patient was marked `In Reception` |
| `Available Time` | Time marked `Available` |
| `In Operatory` | Time marked `In Operatory` |
| `Check Out Time` | Time the status became `Checked Out` |
| `Time Waiting (Hr:Min)` | From the **scheduled appointment time** to `In Operatory` |
| `Reception to Operatory (Hr:Min)` | From `In Reception` to `In Operatory` |
| `Operatory to Checkout (Hr:Min)` | From `In Operatory` to `Checked Out` |
| `Posted` | Whether the appointment's procedures were posted to the ledger |

Patient and provider identification columns are presumably present; the article's field table does not list them
[unverified].

**Criteria** `[L1]`: `PRINT FORMAT`, `OFFICE/GROUP`, `PROVIDER`, `DATE RANGE`.

**Who / when.** Office managers reviewing patient flow; no cadence stated `[P16]`.

**Quirks.** `Time Waiting` is anchored on the scheduled time, so it measures lateness of seating, not lobby wait; early
arrivals shorten it and late patients lengthen it. Time stamps are Pacific time `[P33]`. No averages or medians are
documented; the comparable Dentrix Enterprise `Appointment Cycle Time Report` prints average and median wait `[C1]`.

**Sources:** `[P16][P33][L1][C1]`

### Appointment Detail

**Confidence:** DOCUMENTED (three samples: 2013, 2023, 2026).

**Purpose.** General appointment listing: print the schedule for a day, count appointments scheduled in a month (missed
included, cancelled optional), review appointments created by a user or on a date, list AppointNow bookings
`[P11][P12][P13][P15][P27]`.

**Layout by variant**

| Variant | Title | Group order | Columns | Source |
|---|---|---|---|---|
| By appointment date, `GROUP BY` `Provider` | `Appointment Detail` | `Office : <office>` → `Provider : <name> : <short id>` → day band `<Weekday, Month d, yyyy>` | `Time / Len (min)` · `Appt Status` · `Operatory` · `Patient / Pat ID [Chart#]` (plus `Bal :`) · `Pref Provider` · `Carrier` (`P :` / `S :` with carrier phone) · `Procedure (Code Th Surf Descr)` · `Notes` | 2026 `[P11·img]` |
| `Only AppointNow Appointments` | `Appointment Detail (For Only AppointNow Appointments)` | `Office` → `User : Appoint Now` → `Provider` → day band | same as above; notes carry the patient's AppointNow note | 2023 `[P14·img]` |
| By `Created On Date`, grouped by user (older layout) | `Appointment Detail` | `User : <user>` → `Created Date : <date>` → `Office : <office>` | `Appt Date` · `Appt Time` · `Len (min)` · `Op` · `Prdr` · `Chart#` · `Patient` (plus `Bal:`) · `Phone #` (`(H)` `(C)` `(W)`) · `Carrier` · `Procedure ( Code Th Surf Descr )` · `Notes` | 2013 `[P13·img]` |

**Totals** (counts only): `Total for, <date> : n`, `Total for, <provider or user> : n`, `Total for, <office> : n` (older:
`Total for Office, <office> : n`), `Grand Total : n` `[P11·img][P13·img][P14·img]`.

**Footer:** `From Appt Date` / `Thru` (or `From Created Date`), `Offices`, `Providers`, `Operatories`, `Users` `[P11·img]`.

**Criteria → output** `[L1][P11·img][P13·img][P15·img]`

| Criterion | Effect |
|---|---|
| `APPOINTMENT TYPE` `Regular` / `Archived` | Live or archived appointments (archiving is a Patient Overview action) [unverified]. |
| `APPOINT NOW` `Only AppointNow Appointments` | Restricts to online bookings and changes the title. Ticking it enables `Both` / `Appoint Now` / `Appoint Now API` and disables the `User` picker and `GROUP BY`. `Appoint Now API` = bookings made by third parties through the AppointNow API. AppointNow rows appear under user `_APPOINTNOWPAT_` / `Appoint Now`. `[P13·img][P13][P14]` |
| `DATE RANGE` `Appointment Date` / `Created On Date` | Date basis of the range, of the footer label and of the second grouping level. |
| `PROVIDER/USER`, `OPERATORY`, `OFFICE/GROUP` | Row filters; echoed in the footer. |
| `GROUP BY` `Provider` / `User` | First grouping level under the office. |
| `PAGE BREAK BY` `None` / `Date` / `Provider` / `User` | Page breaks; `User` is disabled while grouping by provider, presumably available when grouping by user [unverified]. |
| `Include Cancelled Appointments` | Adds cancelled appointments (default: non-cancelled only, missed included) `[P11][P28]`; presumably unlocks the `CANCELLATION REASON` picker, which is disabled by default [unverified]. |
| `Include Patient Phone Number` | Adds the patient phone numbers. `[P28][P13·img]` |
| `Include Patient Home Office` | Third option, hidden in our capture; presumably prints the patient's home office [unverified]. `[P11·img][P15·img]` |

**Who / when.** Front office daily (tomorrow's schedule; providers use it to call patients, hence phone numbers) `[P27][P28]`;
month end to count scheduled appointments `[P11]`; managers by user and created date to see who pre-books recall visits at
the date of service `[P12]`; AppointNow tracking `[P13]`. A restricted variant is `Appointment Detail by User` in My Reports.

**Quirks.** The balance always prints in the patient cell of the samples. New-patient placeholders print with `Pat ID` 0
`[P14·img]`. Deleted appointments never appear `[P32]`. Created dates are Pacific time `[P33]`.

**Sources:** `[P11][P12][P13][P14][P15][P27][P28][P32][P35][L1]`

### Lab Cost Report

**Confidence:** DOCUMENTED (samples 2022 and 2024).

**Purpose.** Show lab cases sent / received in a period with their cost, per lab — the monthly lab cost report `[P22][P26]`.

**Layout** — title `Lab Cost Report` (internal name `LabCostReport`) `[P22·img][P26·img]`

| Element | Content |
|---|---|
| Groups | `Office : <office>` → `Lab : <lab name>   Phone# : <lab phone>` |
| Columns | `Appt Date` · `Time` · `Provider` · `Patient Name` · `Description` · `Charges` · `Lab Sent` · `Lab Due` · `Lab Recv` · `Lab Cost` |
| Totals | `Total Appointments for lab, <lab> : n` with sums of `Charges` and `Lab Cost`; `Total Appointments for, <office> : n`; `Grand Total Appointments : n` (same two sums) |
| Footer | `Date From` / `Thru`, `Offices`, `Providers`, `Exclude Pat Type`, `Ex Resp Party Type`, `Labs` |

**Criteria → output** `[L1][P26]`

| Criterion | Effect |
|---|---|
| `REPORT TYPE` `All` / `Sent Date` / `Due Date` / `Received Date` | Which date the range is matched against; `All` = appointment date [unverified]. The vendor recommends received date. The section stays titled `APPOINTMENT DATE RANGE`. |
| `Exclude Lab Received` | Drops cases already received [unverified]. |
| `LAB`, `PROVIDER`, `OFFICE/GROUP`, exclude types | Row filters. |

**Who / when.** Office manager / accounting, monthly `[P22]`.

**Quirks.** `Lab Cost` is typed on the appointment and may be entered only when the case is received; unentered costs print
0.00 (the whole 2024 sample shows 0.00) `[P26][P22·img]`. `Charges` is the appointment's procedure fee, not a lab charge
[unverified].

**Sources:** `[P22][P26][L1]`

---

## 5. Recall Reports (`recall_reports`)

Shared rules: a patient is on recall only for procedure codes flagged recallable, with a per-patient due date per code; the
due date is recalculated when the code is posted; `Scheduled Recall Date` is filled only when the code is embedded in a
future appointment `[P49][P41]`. Accounts marked for collection are excluded from all recall reports `[P44]`. Removing a
patient = clearing the due date or making the patient inactive `[P47]`. Non-dental uses (membership renewal, yearly
consent) are handled with recallable office-defined codes `[P50]`.

### Procedural Recall Report

**Confidence:** DOCUMENTED (sample c. 2019).

**Purpose.** List patients who had chosen procedure codes **completed** in a date range — to follow up after invasive
treatment or simply to count patients per procedure code. Any code can be chosen, not only recallable ones
`[P43][P44][P45]`.

**Layout** — title `Procedural Recall - Provider` `[P45·img]`

| Element | Content |
|---|---|
| Groups | `Provider - <Last, First> <short id> : <title>` → `Recall Code : <code>` |
| Columns | `Patient Name` · `Pat ID` · `Chart #` · `Type` · `Homephone` (`(H)` `(W)` `(C)`) · `First Visit` · `Proc. Date` · `Med. Alerts` |
| Totals | Per provider: `Total Recalls [ <provider> ] : n` (rows) and `Total Patients With Recalls [ <provider> ] : n` (distinct patients) |

**Criteria → output** `[L2][P43][P45]`

| Criterion | Effect |
|---|---|
| `PROCEDURE DATE RANGE` | Date the procedure was completed (`Proc. Date`). |
| `TRANSACTION PROVIDER` | Provider of the posted procedure; also the first group level. |
| `RECALL PROCEDURE CODES` | Codes to include; `ALL` = every completed code (very long report). |
| `Age Range` `From` / `To`, `EXCLUDE PATIENT TYPE`, `Include Inactive Patients` | Row filters. |

**Who / when.** Clinical staff after surgery days; managers to count procedures; as needed `[P43][P45]`.

**Quirks.** The picker label says "recall" although the report is not limited to recallable codes `[P43]`. One patient with
several codes appears under each code. Medical alerts print in full, so the report is clinically sensitive.

**Sources:** `[P43][P44][P45][L2]`

### Scheduled Recall Report

**Confidence:** DOCUMENTED (sample 2026).

**Purpose.** Show patients whose recall is already scheduled: the recall codes attached to the appointment with provider,
date and time `[P42]`.

**Layout** — title `Scheduled Recall Due` `[P42·img]`

| Element | Content |
|---|---|
| Group | `Office : <office>` |
| Patient line | `Patient Name` · `Pat ID` · `Chart #` · `Type` · `Pref Prdr` · `Pref Hyg` · `Phone#` · `First Visit` · `Last Visit` |
| Code line(s) | `Code : <code>` · `Recall Due : <date>` · `Scheduled Date : <date>` · `Time : <time>` · `Prdr : <appointment provider>` |
| Totals | `Total Recalls for, <office> : n` with `Total Scheduled Recalls : n`; `Grand Total Recalls : n` with `Grand Total Scheduled Recalls : n` |

**Criteria → output** `[L2][P42·img]`: `SCHEDULED DATE RANGE` filters on the date of the scheduled appointment (not the due
date); `PREFERRED PROVIDER`, `PREFERRED HYGIENIST`, `RECALL PROCEDURE CODES`, `EXCLUDE PATIENT TYPE`, `Age Range`,
`Include Inactive Patients` filter rows.

**Who / when.** Hygiene coordinator checking the booked recall schedule; no cadence stated `[P42]`.

**Quirks.** Uses the Patient Overview `RECALLS` data and the appointment's procedures; a recall can be scheduled long after
its due date (the sample shows a due date 18 months before the scheduled date) `[P42·img]`. If the previous recall
appointment was never checked out or posted, the overview keeps showing that old scheduled date `[P49]`.

**Sources:** `[P42][P49][L2]`

### Recall Due Report

**Confidence:** DOCUMENTED (sample 2022; rules in text).

**Purpose.** List patients whose recall due date for a recallable code falls in the range — usually only those **not
scheduled** — to get them back on the schedule. Old name `Recall Due/Overdue but Not Scheduled Report` `[P40][P28]`.

**Layout** — title `Recall Due` `[P40·img]`

| Element | Content |
|---|---|
| Group | `Office : <office>` |
| Patient line | `Patient Name (Chart#)` · `Pat ID` · `Type` · `Carrier (Primary)` · `Pref Prdr` · `Pref Hyg` · `Phone#` · `First Visit` · `Last Visit` |
| Code line(s) | `Code : <code>` · `Recall Due : <date>` · `Scheduled Date :` · `Time :` · `Prdr :` (blank when not scheduled) |
| Totals | Not visible in the sample (page 1 of 2); presumably the `Total Recalls` / `Total Scheduled Recalls` lines of `Scheduled Recall Due` [unverified] |

**Criteria → output** `[L2][P40][P28]`

| Criterion | Effect |
|---|---|
| `RECALL DATE RANGE` `Recall Date Range` / `No Recall Date` | Range on the recall due date: future range = upcoming, past range = overdue. `No Recall Date` presumably lists patients without any due date [unverified]. |
| `SCHEDULED/NOT SCHEDULED` `ALL` / `Scheduled` / `Not Scheduled` | Whether a future appointment contains the code. `Not Scheduled` is the working list. |
| `RECALL PROCEDURE CODES` | `ALL` = every recallable code; vendor advises anchor codes only (for example the adult / child prophylaxis codes). |
| `PREFERRED PROVIDER`, `PREFERRED HYGIENIST` | Filter on the patient's preferred provider / hygienist (columns `Pref Prdr`, `Pref Hyg`). |
| `Age Range`, `EXCLUDE PATIENT TYPE`, `Include Inactive Patients` | Row filters. |

**Who / when.** Front office daily `[P28]`; month end together with recall postcards (the vendor's postcard service runs
around the 15th for the following month, for patients due and not scheduled) `[P48]`.

**Quirks.** (1) A patient appears as due although booked when the recall code was not embedded in the appointment `[P41]`.
(2) Stale due dates: when a patient moves from one recall code to its replacement (child to adult prophylaxis, prophylaxis
to perio maintenance, comprehensive to periodic exam) the old code's due date must be cleared by hand `[P40][P41]`.
(3) Evaluation is per code: with two of three codes scheduled, the patient still lists for the third `[P28]`. (4) Patient-
communication recall campaigns do not support code targeting, so their audience differs from this report `[P51]`.

**Sources:** `[P40][P41][P28][P47][P48][P51][L2]`

### Post-Op Report

**Confidence:** DOCUMENTED (sample 2020).

**Purpose.** List patients who had procedures flagged `Post-Op` in Procedure Code Setup completed in the range, with phone
numbers, organised by provider, for next-day follow-up calls `[P43][P46]`.

**Layout** — title `Post-Op Report` `[P46·img]`

| Element | Content |
|---|---|
| Group | `Provider - <Last, First> <short id> : <title>` |
| Columns | `Patient Name` · `Pat ID` · `HomePhone` · `WorkPhone` · `CellPhone` · `Referral` · `Procedure` → `Date` · `Code` · `Description` · `Amount` |
| Totals | `Total Patients : n` |
| Footer | `Procedure Date From` / `Thru`, `Providers`, `Exclude Pat Type`, `* Excludes Inactive Patients` |

**Criteria → output** `[L2]`: `PROCEDURE DATE RANGE` (completion date), `TRANSACTION PROVIDER` (group level),
`EXCLUDE PATIENT TYPE`, `Include Inactive Patients` (removes the starred footer note). No code picker: the population is fixed by the
`Post-Op` flag.

**Who / when.** Clinical staff, daily for the previous day `[P46]`.

**Quirks.** Nothing prints unless codes were flagged `Post-Op` first `[P46]`. The `Referral` column is the patient's referral
source [unverified].

**Sources:** `[P43][P46][L2]`

---

## 6. Referral Reports (`refferal_reports`)

Two generations: six classic marketing reports built on patient referral fields (samples from 2016, before the 2021
reports menu), and three `… Referral Management` reports built on referral cases created with the `Refer To` workflow
(internal 2020, external outgoing 2020–21, external incoming 2023) `[P60][P61][P58]`.

### Referral Production List

**Confidence:** DOCUMENTED (both layouts, samples 2016).

**Purpose.** Financial impact of referral sources: per referred patient, visits, procedures, production, collection and
adjustments in the period. Vendor positions it as a marketing return-on-investment report `[P54]`.

**Layouts** `[P54·img]`

| Layout | Title | Groups | Columns | Subtotals |
|---|---|---|---|---|
| Standard | `Referral Production Listing` | `Referral Type : <type>` | `Referral` · `Chart #` · `Pat ID` · `Patient Name` · `# Visits` · `#Proc` · `Production` · `Collection` · `Adjs` | `Total for Referral type, <type> [n]:` (n = patients) with sums of the five numeric columns |
| `Group By Zip Code` | `Referral Production Listing` + subtitle `(by Zip Code)` | `Referral Type` → `Zip Code` → `Referral` | `Zip Code` · `Referral` · `Chart #` · `Pat ID` · `Patient Name` · `# Visits` · `#Proc` · `Production` · `Collection` | `Total for Referral, <source> :`, `Total for Zip code, <zip> :`, `Total for Referral type, <type> :` (last one production and collection only) |

Footer: `From` / `Thru`, `Firsti Visit Date From` / `Thru` (sic), `Referral Types`; zip layout `From Zip`, `Zip`.

**Criteria → output** `[L3][P54]`

| Criterion | Effect |
|---|---|
| `PROCEDURE DATE RANGE` | Period of the posted procedures counted. |
| `FIRST VISIT DATE RANGE ( LEAVE BLANK FOR ALL PATIENTS )` | Restricts to patients whose first visit falls in the range (new-patient cohort). |
| `ZIP CODE RANGE` `From` / `Through` | Patient zip filter. |
| `REFERRAL TYPE` | One referral type or `ALL`. |
| `Group By Zip Code` | Switches to the zip layout. |

**Definitions** `[P54]`: visits per patient; posted procedures per patient; production = procedure transactions posted;
collection = amounts paid toward that production; adjustments.

**Who / when.** Marketing / owner; no cadence stated `[P54]`.

**Quirks.** Data is limited to the office the report is run in, for patients currently in that office; no cross-office
data; history is lost if the patient's office or referral changes `[P54]`. `Referral` is blank when the patient has a
referral type but no `Referred By` source `[P54·img]`. In the samples the standard layout prints collection negative and
the zip layout positive **[conflict]**; `# Visits` subtotals in the zip sample do not equal the sum of their rows
**[conflict]**; the zip layout has no `Adjs` column `[P54·img]`.

**Sources:** `[P54][L3]`

### Referred Out List

**Confidence:** DOCUMENTED (sample 2016).

**Purpose.** Patients the office referred out to another dentist, by date and specialty `[P55]`.

**Layout** — title `Referred Out List` `[P55·img]`

| Element | Content |
|---|---|
| Columns | `Chart #` · `Patient Name` · `Phones` (`(H)` `(C)` `(W)`) · `Last Visit` · `Ref Out On` · `Ref Out Dentist` · `Specialty` |
| Totals | `Total Patients Referred Out : n` |
| Footer | `From` / `Thru`, `Exclude Pat Type`, `Specialty`, `Referred Out to` |

**Criteria → output** `[L3]`: `REFERRED OUT DATE RANGE` (column `Ref Out On`; presumably the patient's `Ref. To Date`
[unverified]), `REFERRAL OUT TO` (referral sources), `SPECIALTY`, `EXCLUDE PATIENT TYPE`, `OFFICE/GROUP`.

**Quirks.** Reads the single `Referred To` field of the patient record `[P64]`, so one patient = one referral; referral
cases created with `Refer To` are reported by the management reports instead [unverified]. No grouping in the sample.

**Sources:** `[P55][P64][L3]`

### Referral Source List

**Confidence:** DOCUMENTED (sample 2016).

**Purpose.** Print the master list of referral sources `[P56]`.

**Layout** — title `Referral Source List` `[P56·img]`

| Element | Content |
|---|---|
| Columns | `Referral By/To` (`Referred By`, `Referred To`, `BOTH`) · `Referral Name` · `Address` · `Phone` · `Contact` · `Speciality` (sic) · `Referral Type` · `Cost` · `Notes` |
| Totals | None visible |
| Footer | `Referral By/To : <code>` (99 printed for all), `Referral Type:`, `By : <user>` |

**Criteria → output** `[L3]`: `REFERRED TO/BY` and `REFERRAL TYPE` dropdowns. `OFFICE/GROUP` is disabled — also in the
vendor's own screenshot — because sources are organisation-wide `[P56·img]`.

**Quirks.** Duplicated sources are common (added without searching, or under the wrong type); a source attached to a
patient cannot be deleted `[P64]`. `Cost` is reference-only `[P64]`.

**Sources:** `[P56][P64][L3]`

### External Outgoing Referral Management

**Confidence:** INFERRED. No article or sample describes the report; the underlying utility is documented.

**Purpose (inferred).** Report of referral cases sent **from** our providers **to** outside providers (created from the
Treatment Plan `Refer To` > External tab), with their status, for follow-up and audit `[P57][P61]`.

**Underlying grid** (`Utilities > Referral Management > EXTERNAL - OUTGOING`) `[P57·img]`: `Referral Date` · `Patient ID` ·
`Patient Name` · `Referred To` · `Referred Out Procedure Codes` · `Referral Status` · `Referring Provider`, plus x-ray /
document / attachment / PDF icons. The report presumably prints these columns, grouped by office [unverified].

**Criteria → expected effect** `[L3]`

| Criterion | Maps to |
|---|---|
| `REFERRED FROM OFFICE/GROUP` | Office that created the referral |
| `REFERRAL DATE RANGE` | `Referral Date` |
| `REFERRED FROM PROVIDER` | `Referring Provider` |
| `REFERRED TO` | External referral source (`Referred To`) |
| `PROCEDURE CODES` | `Referred Out Procedure Codes` |
| `USERS` | User who created the referral [unverified] |
| `SPECIALTY` | Specialty of the referred-to source |
| `STATUSES` (`All`, `Accepted`, `Rejected`, `Pending`, `Cancelled`, `Completed`, `In Progress`, `Not Needed`, `Expired`) | `Referral Status` |

**Status rules** `[P57·img][P59·img][P61]`: `Pending` is the default; staff can set `Accepted`, `Cancelled`, `Completed`,
`In Progress`, `Not Needed`, `Rejected` (with a note); the outside office can update status in the eReferral portal; referrals
expire after 30 days (`Expired`). Referred procedures get treatment-plan status `R*`.

**Comparables.** Open Dental `Referred Proc Tracking` (`Patient`, `Referred To`, `Description`, `Note`, `Date Refer`, `Date Done`,
`Status`; `Total Referrals`) `[C4]`; Dentrix Enterprise `Referred To Doctor Report` (referrals per doctor with
`Total Referrals` / `Listed Referrals`), filterable by referral status `[C1][C8]`.

**Open point.** Our capture is cut after the third `STATUSES` row; `Exclude Deleted Referrals` and a `GROUP BY` section may
follow, as on the sibling reports `[L3]`.

**Sources:** `[P57][P61][P59][L3][C1][C4][C8]`

### Referral Summary Report

**Confidence:** DOCUMENTED (sample 2023).

**Purpose.** Where patients come from: per referral type and source, the number referred and the production and collection
they generated `[P52]`.

**Layout** — title `Referral Summary` (internal name `ReferralRefSumm`) `[P52·img]`

| Element | Content |
|---|---|
| Groups | `Office : <office>` → `Referral Type : <type>` |
| Columns | `Referral` · `#Ref` · `Production` · `Collection` · `Avg Production` · `Referral #` → `MTD` · `YTD` · `Last Year` |
| Rows | One per referral source; `No Referral` collects patients that have the type but no `Referred By` source |
| Totals | `Total :` per referral type for `#Ref`, `Production`, `Collection`, `Avg Production` (none for the `Referral #` columns) |

**Criteria → output** `[L3][P52]`: `PROCEDURE DATE RANGE` (posted procedures), `REFERRAL TYPE`, `OFFICE/GROUP`.

**Observed arithmetic** `[P52·img]`: `Avg Production` = `Production` ÷ `#Ref`, and equals `Production` when `#Ref` is 0; a
type total's average = total production ÷ total `#Ref`. Sources with `#Ref` 0 still show production (patients referred in
earlier periods). One `Collection` total equals the signed net of its rows while the rows print unsigned **[conflict]**.

**Who / when.** Owner / marketing; as needed `[P52]`. With only the mandatory `Referral Type` filled the report shows types
only; the optional `Referred By` adds the source level `[P52]`.

**Metrics in comparable reports (for the "exceed" list).** Dentrix Enterprise `Referral Analysis`: number of patients,
total production, average per patient, percent of patients and percent of production per source, with clinic totals
`[C1]`. Open Dental `Referral Analysis`: `Count` and `Production` per referrer, with an option to count new patients only
`[C5]`.

**Sources:** `[P52][L3][C1][C5]`

### Referral Count Summary

**Confidence:** DOCUMENTED (sample 2016).

**Purpose.** How well each referral source feeds the practice: count of referred patients seen in the period `[P53]`.

**Layout** — title `Referral Count Summary` `[P53·img]`

| Element | Content |
|---|---|
| Groups | `Referral Type : <type>` |
| Columns | `Referral` · `# Referred Pats Seen` |
| Rows | One per referral source; `No Referred By` for patients without a source |
| Totals | `Total :` per referral type; no grand total visible |
| Footer | `From` / `Thru`, `Referral Types` |

**Criteria** `[L3]`: identical to `Referral Summary Report` (`PROCEDURE DATE RANGE`, `REFERRAL TYPE`, `OFFICE/GROUP`).

**Quirks.** The "no source" row is labelled `No Referred By` here and `No Referral` on `Referral Summary` `[P53·img][P52·img]`.
"Seen" presumably means having a posted procedure in the range [unverified].

**Sources:** `[P53][L3]`

### Internal Referral Management

**Confidence:** INFERRED. No article or sample describes the report.

**Purpose (inferred).** Report of referrals between providers / offices of the same organisation (Treatment Plan
`Refer To` > Internal tab), showing whether the referred treatment was scheduled and completed `[P60]`.

**Underlying grid** (`INTERNAL REFERRAL - INCOMING` / `- OUTGOING`) `[P60·img]`: `Referral Date` · `Patient ID` · `Patient Name` ·
`Referred To Provider` · `Referred Out Procedure Codes` · `Tx Status` (`Incomplete` / `Completed`) · `Appt Date` · `Appt Time` ·
`Appt Op` · `Referring Office` · `Referring Provider`, plus attachment icons and a calendar icon that books the appointment.

**Criteria → expected effect** `[L3]`

| Criterion | Maps to |
|---|---|
| `REFERRED FROM OFFICE/GROUP`, `REFERRED TO OFFICE/GROUP` | `Referring Office`, office of the referred-to provider |
| `REFERRAL DATE RANGE` | `Referral Date` |
| `REFERRED FROM PROVIDER`, `REFFERED TO PROVIDER` (sic) | `Referring Provider`, `Referred To Provider` |
| `PROCEDURE CODES`, `SPECIALTY`, `USERS` | Referred codes, referred-to provider specialty, creating user [unverified] |
| `STATUSES` `All` / `Completed` / `Incomplete` | `Tx Status` |
| `Exclude Deleted Referrals` | Same as the utility's `Hide Deleted Referrals` |
| `GROUP BY` | Options hidden in our capture; likely from / to office or provider [unverified] |

**Comparable.** Open Dental `Referred Proc Tracking` `[C4]`.

**Sources:** `[P60][L3][C4]`

### External Incoming Referral Management

**Confidence:** INFERRED. No article or sample describes the report; the feature and its grid are documented (2023).

**Purpose (inferred).** Report of referral cases received from outside providers through the external referral link (or
keyed in with `ADD REFERRAL`): who referred, to which of our providers, for what reason, whether the patient was contacted,
scheduled and treated `[P58][P59]`.

**Underlying grid** (`EXTERNAL - INCOMING`) `[P58·img][P59·img]`: `Referral Date` · `Patient ID` (`N/A` until a patient record
exists) · `Patient Name` · `Referred To Provider` · `Referral Reason Code` · `Referral Status` · `Appt Date` · `Appt Time` ·
`Appt Op` · `Referred By`, plus incoming-attachment, outgoing-report, calendar, phone (contact tracking), mail (send
referral report) and delete icons.

**Criteria → expected effect** `[L3]`

| Criterion | Maps to |
|---|---|
| `REFERRED TO OFFICE/GROUP` | Office receiving the referral |
| `REFERRAL DATE RANGE` | `Referral Date` |
| `REFERRED TO PROVIDER` | `Referred To Provider` |
| `REFERRED FROM` | Outside referral source (`Referred By`) |
| `STATUSES` (9 values) + `Exclude Deleted Referrals` | `Referral Status`; deleted cases |
| `CONTACT STATUSES` (`All`, `No Response`, `Patient To Call`, `Appointment Scheduled`, `Referral Refused`) | Latest contact-tracking entry made with the phone icon [unverified] |

**Related facts.** Referral reason codes are office-defined per specialty (`Setup > Misc Setup > Referral Reasons`: code,
specialty, description) `[P59][P65]`. A 2026-02 update describes automatic linking of ledger charges to the referred-to
provider and dashboards by production versus volume, zip code and procedure `[P62]`.

**Comparable.** Dentrix Enterprise `Referred By Doctor/Other Report` (referred patients per source with `Treatment Plan`,
`Production`, `Balance`; `Total Referrals` / `Listed Referrals`) `[C1]`.

**Sources:** `[P58][P59][P62][P65][P66][L3][C1]`

---

## 7. Corrections and additions to the criteria transcriptions

| # | Report | Finding | Source |
|---|---|---|---|
| 1 | `Appointment List` | The area clipped at the top holds `PRINT FORMAT` (`PDF` / `Excel`) and the header of the six radios is `REPORT FORMAT TO PRINT`. | `[P1·img][P3·img][P6·img]` |
| 2 | `Appointment List` | Fifth radio was `Cancelled From Denticon Patient Engagement` in June 2023 and `Cancelled From Automated Campaigns` from May 2024. | `[P3·img][P6·img]` |
| 3 | `Appointment List` | With `Cancelled List` selected: `EXCLUDE PATIENT TYPE`, `EXCLUDE RESP. PARTY TYPE`, `CANCELLATION REASON`, `Include Off Call List` enabled; `OPERATORY`, `Length`, `Status` disabled. | `[P6·img]` |
| 4 | `Appointment Detail` | The clipped third row of `OTHER OPTIONS` is `Include Patient Home Office`; nothing follows it. | `[P11·img][P15·img]` |
| 5 | `Appointment Detail` | Ticking `Only AppointNow Appointments` enables the three radios and disables the `User` picker and both `GROUP BY` radios. | `[P13·img]` |
| 6 | `Recall Due Report` | `Include Inactive Patients` is the last control. | `[P40·img]` |
| 7 | `Lab Report` | With `Not Received` the `DUE DATE` box shows a date; its enabled state is not readable. | `[P26·img]` |
| 8 | `Referral Source List` | The disabled `OFFICE/GROUP` section is by design. | `[P56·img]` |
| 9 | `Referral Reports` list | `External Incoming Referral Management` was added after June 2023. | `[P54·img][P58]` |
| 10 | `Internal Referral Management`, `External Outgoing Referral Management` | `GROUP BY` options and anything below `STATUSES` remain unknown; no vendor screenshot shows these criteria. | `[L3]` |

---

## 8. Old report names → current report and criteria

| Old name (pre-2021 menus, still used in vendor guides) | Current report → setting | Source |
|---|---|---|
| `Appointment Call List` | `Appointment List` → `Call List` | `[P27]` |
| `Appt Cancellation List` / `Appointment Cancellation List` | `Appointment List` → `Cancelled List` | `[P27][P5]` |
| `Missed Appointment List` | `Appointment List` → `Missed List` | `[P27]` |
| `Appointment Pull Chart List` | `Appointment List` → `Pull Chart List` | `[P27]` |
| `Appointment Cancellation Report From Denticon Patient Communication / Engagement` | `Appointment List` → `Cancelled From Automated Campaigns` | `[P7]` |
| `New Patient Thru Appointment` | `New Patients via Appointments` | `[P27][P30]` |
| `Appointment List – Lab` | `Lab Report` → `Appointment List` | `[P23][P27]` |
| `Lab Required Not Sent Appointment List` | `Lab Report` → `Not Sent` | `[P23]` |
| `Lab Sent Not Received Appointment List` | `Lab Report` → `Not Received` | `[P23]` |
| `Appointment List - Lab due date` | `Lab Report` → `Due Date` | `[P23]` |
| `Appointment Details Report`, `Appointment Detail By User` | `Appointment Detail` (`GROUP BY` `User`; My Reports variant) | `[P27][P28][P35]` |
| `Recall Due/Overdue but Not Scheduled Report` | `Recall Due Report` → `Not Scheduled` | `[P28][P41]` |
| `Referral Production Listing by Zipcode` | `Referral Production List` → `Group By Zip Code` | `[P54]` |
| `Routing Slips` (Appointment Reports) | `Daily Reports` → `Routing Slip` | `[P27]` |

---

## 9. Implications for our module (analyst recommendations, not sourced facts)

1. **Model families, not 21 flat reports:** `Appointment List` (6 formats), `Lab Report` (4 types), `SmartAssist Report Card`
   (2), `Referral Production List` (2 layouts). Keep legacy and old names as search aliases.
2. **Store appointment status events** (`status`, `changed_at` in UTC, `changed_by`, `source`: staff / campaign / vendor /
   portal). One event table answers `Appointment Time Stamps`, `Appointments Confirmed Via Vendors`,
   `Checked In By / Out By`, and adds medians, percentiles and on-time seating — which the legacy report lacks.
3. **Compute "unresolved appointments" by rule** (past, not cancelled, not missed, no posted visit) as a live exception
   queue with a one-click `Mark missed` / `Post` action, instead of a printed list.
4. **Make the work lists interactive:** call list, recall due not scheduled, lab not received, referral pipeline — with row
   actions, assignment and resolution state.
5. **Recall:** derive scheduled status from appointment procedures, and group interchangeable codes (prophylaxis family,
   exam family) so a replacement code satisfies the recall — this removes the largest legacy data-quality problem.
6. **Referral analytics:** cross-office by default, cohort by first visit date, consistent signs, guarded averages, and a
   true ROI metric using the stored referral `cost`; add geography (zip) and a case funnel (received → contacted →
   scheduled → completed) with conversion and ageing.
7. **Lab analytics:** turnaround (sent → received), overdue against the delivery appointment, cost per case and lab cost as
   a share of production, by lab and provider.
8. **Checklist scorecard:** keep the SmartAssist idea (percentage per item) but evaluate organisation-wide data and trend
   it by office, provider and user.

Minimum parity datasets (proposed field names, snake_case):

| Dataset | Grain | Key fields |
|---|---|---|
| `appointment_list` | appointment | `office_id`, `appointment_date`, `start_time`, `duration_minutes`, `operatory_id`, `provider_id`, `patient_id`, `chart_no`, `status`, `is_missed`, `is_cancelled`, `cancellation_reason`, `cancellation_note`, `cancelled_at`, `cancel_source`, `created_at`, `created_by`, `booking_source`, `scheduled_charges`, `current_balance`, `on_call_list`, `is_new_patient_placeholder` |
| `appointment_status_event` | status change | `appointment_id`, `status`, `changed_at`, `changed_by`, `source`, `vendor_id` |
| `lab_case` | appointment lab case | `appointment_id`, `lab_id`, `sent_date`, `due_date`, `received_date`, `lab_cost` |
| `visit_checklist` | appointment × check item | `appointment_id`, `item_code`, `result` (`complete` / `incomplete` / `not_applicable`) |
| `recall_item` | patient × recall code | `patient_id`, `procedure_code`, `interval_value`, `interval_unit`, `recall_due_date`, `scheduled_appointment_id`, `preferred_provider_id`, `preferred_hygienist_id` |
| `referral_source_production` | referral source × patient × period | `referral_type`, `referral_source_id`, `patient_id`, `first_visit_date`, `visit_count`, `procedure_count`, `production`, `collection`, `adjustments` |
| `referral_case` | referral case | `direction` (`internal` / `external_outgoing` / `external_incoming`), `referral_date`, `from_office_id`, `to_office_id`, `from_provider_id`, `to_provider_id`, `referral_source_id`, `procedure_codes`, `reason_code`, `status`, `contact_status`, `appointment_id`, `created_by`, `is_deleted` |

---

## 10. Gaps, conflicts and open questions

| # | Item | Status |
|---|---|---|
| 1 | Output of `Missed Appointments Not Marked As Missed`, `New Patients via Appointments`, `Appointments Confirmed Via Vendors`, the three `… Referral Management` reports | Not documented anywhere we could read; needs a capture from the legacy tenant |
| 2 | Layouts of `Confirmation Call List`, `Call List`, `Pull Chart List`, `Missed List`; `Lab Report` types `Appointment List`, `Not Sent`, `Due Date`; `SmartAssist Report Card` `Summary`; page layout of `Appointment Time Stamps` | Inferred only |
| 3 | Enabled / disabled criteria per `Appointment List` format (four formats unseen) | [unverified] |
| 4 | `GROUP BY` of `Internal Referral Management`; rows below `STATUSES` of `External Outgoing Referral Management` | Hidden in our capture and absent from vendor screenshots |
| 5 | Meaning of `No Recall Date`, `Exclude Lab Received`, `USERS` (referral reports), `Include Patient Home Office`, `APPOINTMENT TYPE` `Archived` | [unverified] |
| 6 | Sample age: referral samples are from 2016, `Procedural Recall` c. 2019, `Post-Op` 2020; layouts may have changed (the `Appointment Detail` layout did between 2013 and 2026) | Risk |
| 7 | Sign and total inconsistencies in referral samples (section 6) | **[conflict]** — decide our own conventions |
| 8 | `Recall Due` (2022) and `Scheduled Recall Due` (2026) differ in patient-line columns (`Carrier (Primary)`, chart number placement) | Version or report difference unknown |
| 9 | No Excel output seen for any of the 21 reports | Gap |
| 10 | Release notes (sign-in) and webinars (video) may document the undocumented reports | Not read |
| 11 | How a vendor confirmation is stored (which vendor, when) | [unverified] |
| 12 | Pacific-time stamps versus office-local time in historical data to be migrated | Risk for wait-time metrics |

---

## 11. Sources

All Help Center articles were read on 2026-11-22. Article URL = `https://support.planetdds.com/hc/en-us/articles/<id>`;
image / PDF attachment URL = `https://support.planetdds.com/hc/article_attachments/<id>`.

### Local

- `[L1]` `docs/reports/module-plan/legacy/appointment_reports.json` (verified transcription, 9 reports)
- `[L2]` `docs/reports/module-plan/legacy/recall_reports.json` (verified transcription, 4 reports)
- `[L3]` `docs/reports/module-plan/legacy/refferal_reports.json` (verified transcription, 8 reports)

### Planet DDS Help Center and vendor PDFs — appointments and cross-cutting

- `[P1]` Which Appointment Report Helps Ensure Patients Are Rescheduled in Denticon? — https://support.planetdds.com/hc/en-us/articles/49064605424027 ; image 49064605417627 (criteria, 2026)
- `[P2]` Rescheduling failed appointments, which report is best — https://support.planetdds.com/hc/en-us/articles/360003536831
- `[P3]` How do I print a confirmation call list of appointments? — https://support.planetdds.com/hc/en-us/articles/115002086712 ; image 16686706676763 (criteria, 2023)
- `[P4]` List of patients who cancelled or missed appointments — https://support.planetdds.com/hc/en-us/articles/115002070611
- `[P5]` Modifying the list of cancellation reasons — https://support.planetdds.com/hc/en-us/articles/360021345212 ; images 16686440209819, 16686510410907
- `[P6]` Appointment Statuses for Future Appointments — https://support.planetdds.com/hc/en-us/articles/25697944594715 ; images 26120228324123 (criteria, 2024), 26120228330395 (sample `Appointment Cancellation List`, 2024)
- `[P7]` How will we know when a patient cancels via Denticon Patient Communication? — https://support.planetdds.com/hc/en-us/articles/13063581573915 ; image 13063440776731 (sample, 2023)
- `[P8]` How does Denticon consider an appointment as "missed"? — https://support.planetdds.com/hc/en-us/articles/115002067511
- `[P9]` Call List articles — https://support.planetdds.com/hc/en-us/articles/115002087972 , https://support.planetdds.com/hc/en-us/articles/115002088212 , https://support.planetdds.com/hc/en-us/articles/115002087152 , https://support.planetdds.com/hc/en-us/articles/115002087292 ; images 18843937773595 (2023), 360054662672 (2020)
- `[P10]` Cancelled appointment still shows on Patient Overview — https://support.planetdds.com/hc/en-us/articles/35167338120987
- `[P11]` Report to determine how many appointments were scheduled (Appointment Detail) — https://support.planetdds.com/hc/en-us/articles/36706153887131 ; images 36803671287323 (criteria, 2025), 51424282129435 (sample, 2026)
- `[P12]` Appointments created on a particular date (hygienists) — https://support.planetdds.com/hc/en-us/articles/115002066311 ; image 16520410106651
- `[P13]` Appointments made through AppointNow — https://support.planetdds.com/hc/en-us/articles/115002082792 ; images 16686623283739 (criteria, 2023), 115002781111 (sample, 2013)
- `[P14]` How to know an appointment was made via AppointNow — https://support.planetdds.com/hc/en-us/articles/360012573151 ; image 13579812120219 (sample, 2023)
- `[P15]` Printing the schedule for the day — https://support.planetdds.com/hc/en-us/articles/115002070571 ; image 16686971634715 (criteria, 2023)
- `[P16]` Tracking reception and operatory time (Appointment Time Stamps) — https://support.planetdds.com/hc/en-us/articles/36804736309787
- `[P17]` What is the SmartAssist Report Card? — https://support.planetdds.com/hc/en-us/articles/4414927956251 ; image 4414935617947 (sample, 2022)
- `[P18]` SmartAssist Report Card for future dates — https://support.planetdds.com/hc/en-us/articles/4414935596059 ; image 17287575752219 (criteria, 2023)
- `[P19]` "N/A" in SmartAssist Report Card columns — https://support.planetdds.com/hc/en-us/articles/33476890392091 ; image 33476890386843 (sample, 2024)
- `[P20]` What is SmartAssist? — https://support.planetdds.com/hc/en-us/articles/4406816834587 ; image 4406816603675 (sample, 2021)
- `[P21]` How can we activate SmartAssist? — https://support.planetdds.com/hc/en-us/articles/4406816374683 ; image 17892295094043
- `[P22]` Report for monthly lab costs — https://support.planetdds.com/hc/en-us/articles/29273676309531 ; image 29273676307739 (criteria, 2024) and inline sample (2024)
- `[P23]` Ways to track lab cases — https://support.planetdds.com/hc/en-us/articles/115002071011
- `[P24]` Lab case icon; which appointment carries the lab case — https://support.planetdds.com/hc/en-us/articles/115002072851 , https://support.planetdds.com/hc/en-us/articles/115002088992
- `[P25]` Lab setup — https://support.planetdds.com/hc/en-us/articles/360050392211 , https://support.planetdds.com/hc/en-us/articles/115002095152
- `[P26]` Denticon University, `12. Lab Tracking` (PDF `M12 Lab Tracking.pdf`, pages 11, 13, 20, 21) — https://support.planetdds.com/hc/en-us/articles/10601618690075 ; https://support.planetdds.com/hc/article_attachments/10601608310811
- `[P27]` Reports recommended at the end of each day — https://support.planetdds.com/hc/en-us/articles/115002085792
- `[P28]` Reports Matrix, PDF "Denticon Reporting 101" — https://support.planetdds.com/hc/en-us/articles/4415425089563 ; https://support.planetdds.com/hc/article_attachments/26183111395355 ; public copy https://www.planetdds.com/wp-content/uploads/2022/11/Reporting-Matrix.pdf
- `[P29]` Glossary: New Patient Appointments, New Patient, New Patient (as defined for reports), Preferred Provider, Provider, Transaction Provider — https://support.planetdds.com/hc/en-us/articles/115002088832 , https://support.planetdds.com/hc/en-us/articles/115002088712 , https://support.planetdds.com/hc/en-us/articles/115002065911 , https://support.planetdds.com/hc/en-us/articles/115002089072 , https://support.planetdds.com/hc/en-us/articles/115002068051 , https://support.planetdds.com/hc/en-us/articles/115002072791
- `[P30]` Reports for the number of patient records (patient lists) — https://support.planetdds.com/hc/en-us/articles/115002082912
- `[P31]` `NP Placeholder Workflow.pdf` — https://support.planetdds.com/hc/article_attachments/28564985664539
- `[P32]` Appointment status icons; Denticon University `03. Understanding Appointments` (PDF) — https://support.planetdds.com/hc/en-us/articles/360001371251 ; https://support.planetdds.com/hc/article_attachments/10600998442907
- `[P33]` Why time stamps are Pacific time — https://support.planetdds.com/hc/en-us/articles/115002084092
- `[P34]` KI-588524 Unable to Deactivate API vendors; API vendors list — https://support.planetdds.com/hc/en-us/articles/35801342862107 , https://support.planetdds.com/hc/en-us/articles/13532033606555 , https://www.planetdds.com/api-partners-grid/
- `[P35]` `AppointNow Setup Guide.pdf` — https://support.planetdds.com/hc/article_attachments/13825993945243
- `[P36]` Security rights: reports, appointments — https://support.planetdds.com/hc/en-us/articles/115002075251 , https://support.planetdds.com/hc/en-us/articles/115002091452
- `[P37]` New reports menu; report server delay — https://support.planetdds.com/hc/en-us/articles/4408457645723 , https://support.planetdds.com/hc/en-us/articles/115002079551
- `[P38]` Denticon University `13. End of Day Reporting` (PDF, My Favorites) — https://support.planetdds.com/hc/en-us/articles/10601641608987 ; https://support.planetdds.com/hc/article_attachments/10601620951451

### Planet DDS Help Center — recall

- `[P40]` Report of patients due but not scheduled — https://support.planetdds.com/hc/en-us/articles/115002088512 ; images 19396395200411 (criteria, 2023), 6337543498139 (sample `Recall Due`, 2022)
- `[P41]` Recall Due/Overdue but Not Scheduled lists scheduled patients — https://support.planetdds.com/hc/en-us/articles/115002084712 ; images 19396735241627 (appointment details pop-up), 19396759283867 (`EDIT RECALL DUE DATES`)
- `[P42]` Report of patients scheduled for recalls — https://support.planetdds.com/hc/en-us/articles/52118284530971 ; images 52118284508187 (criteria, 2026), 52118330372891 (sample, 2026), 52118284517403 (Patient Overview), 52118330374683 (Add/Edit Appointment)
- `[P43]` Post-Op Report versus Procedural Recall Report — https://support.planetdds.com/hc/en-us/articles/115002086792 ; images 16607050228251, 16607115339547 (criteria, 2023)
- `[P44]` Patient missing from the procedural recall report (collection accounts) — https://support.planetdds.com/hc/en-us/articles/115002067571 ; image 16685888197787
- `[P45]` Patients seen for a particular procedure code — https://support.planetdds.com/hc/en-us/articles/115002078791 ; image 360054493031 (sample, c. 2019)
- `[P46]` Following up after difficult procedures (Post-Op) — https://support.planetdds.com/hc/en-us/articles/115002088552 ; images 19396192782619 (Procedure Code Setup), 360054356852 (sample, 2020)
- `[P47]` Removing a patient from recall reports — https://support.planetdds.com/hc/en-us/articles/115002069671
- `[P48]` When recall postcards are generated — https://support.planetdds.com/hc/en-us/articles/115002095172
- `[P49]` Recall date definitions and posting workflow — https://support.planetdds.com/hc/en-us/articles/115002088572 , https://support.planetdds.com/hc/en-us/articles/360000929192 , https://support.planetdds.com/hc/en-us/articles/115002083452 , https://support.planetdds.com/hc/en-us/articles/30518066884763
- `[P50]` Non-dental recalls with office-defined codes — https://support.planetdds.com/hc/en-us/articles/115002095512 , https://support.planetdds.com/hc/en-us/articles/115002079431
- `[P51]` Denticon Patient Communication FAQ — https://support.planetdds.com/hc/en-us/articles/6464270914843

### Planet DDS Help Center — referrals

- `[P52]` Report to understand from where patients are referred (Referral Summary) — https://support.planetdds.com/hc/en-us/articles/115002069091 ; images 16059211020955 (sample, 2023), 16059083085851 (Patient Overview)
- `[P53]` Referral Count Summary — https://support.planetdds.com/hc/en-us/articles/115002069151 ; image 115002805492 (sample, 2016)
- `[P54]` Financial impact of referral sources (Referral Production List) — https://support.planetdds.com/hc/en-us/articles/115002069131 ; images 16686104240283 (criteria, 2023), 115002787211 and 115002805432 (samples, 2016)
- `[P55]` Referred Out List — https://support.planetdds.com/hc/en-us/articles/115002085132 ; image 115002805472 (sample, 2016)
- `[P56]` Referral Source List — https://support.planetdds.com/hc/en-us/articles/115002069171 ; images 16686233923611 (criteria, 2023), 115002787331 (sample, 2016)
- `[P57]` Managing external referrals with the Referral Management Utility — https://support.planetdds.com/hc/en-us/articles/4564296206107 ; images 18278431517467 (grid), 18278401472539 (status dialog)
- `[P58]` What is the External Referral- Incoming Feature? — https://support.planetdds.com/hc/en-us/articles/19292820804123 ; image 19292435980059 (grid)
- `[P59]` How to Setup the External Referral-Incoming feature — https://support.planetdds.com/hc/en-us/articles/19301563103899 ; images 19301267595803 (grid field guide), 19301072102043 (reason codes)
- `[P60]` How does the Internal Referral feature work? — https://support.planetdds.com/hc/en-us/articles/360049927992 ; image 17892273393947 (grid)
- `[P61]` Sending an external referral; setting up external referral sources; eReferral FAQs — https://support.planetdds.com/hc/en-us/articles/360059504752 , https://support.planetdds.com/hc/en-us/articles/360054889811 , https://support.planetdds.com/hc/en-us/articles/360054274792
- `[P62]` Referral Management Update (2026-02) — https://support.planetdds.com/hc/en-us/articles/46510026528155
- `[P63]` Office Level Filtering for Referrals and Labs (2026-11) — https://support.planetdds.com/hc/en-us/articles/58789839729691-Denticon-Office-Level-Filtering-for-Referrals-and-Labs
- `[P64]` Referral sources and patient referral fields — https://support.planetdds.com/hc/en-us/articles/115002082772 , https://support.planetdds.com/hc/en-us/articles/115002087952 , https://support.planetdds.com/hc/en-us/articles/115002067811 , https://support.planetdds.com/hc/en-us/articles/115002090032 , https://support.planetdds.com/hc/en-us/articles/115002093592 , https://support.planetdds.com/hc/en-us/articles/115002071511 , https://support.planetdds.com/hc/en-us/articles/115002069011
- `[P65]` Denticon Setup Guide - Misc. Setups — https://support.planetdds.com/hc/en-us/articles/37670054739483
- `[P66]` Fields of the External Referral Link — https://support.planetdds.com/hc/en-us/articles/35289278806939
- `[P67]` `Refer To` button and the Referral Management right — https://support.planetdds.com/hc/en-us/articles/360061221711

### Comparable systems

- `[C1]` Dentrix Enterprise 11.0 Reports Reference (Daily Appointment List, Appointment Cycle Time, New Patient List, Referral Analysis, Referred By Doctor/Other, Referred By Patient, Referred To Doctor, Continuing Care Display List) — https://www.ihs.gov/doh/edr/documents/Dentrix_Enterprise_11.0_Reports_Reference.pdf
- `[C2]` Open Dental, Broken Appointments Report — https://opendental.com/manual/reportbrokenappt.html
- `[C3]` Open Dental, Confirmation List — https://www.opendental.com/manual/confirmationlist.html
- `[C4]` Open Dental, Referred Procedure Tracking Report — https://opendental.com/Manual/reportreferralproctrack.html
- `[C5]` Open Dental, Referral Analysis Report — https://opendental.com/Manual/reportreferralanalysis.html
- `[C6]` SoftDent, Confirmation List report — https://help.carestreamdental.com/rh/web/server/SoftDent/projects_responsive/OH_DE1010/CnfrmLstRpt.htm
- `[C7]` SoftDent, Appointment List report — https://help.carestreamdental.com/rh/web/server/SoftDent/projects_responsive/OH_DE1010/AptLstRpt.htm
- `[C8]` Dentrix Enterprise blog, referral statuses and the Referred To Doctor Report — https://blog.dentrixenterprise.com/?p=2121
- `[C9]` Dentrix Ascend release notes, `Lab Case – Appointments` power report — https://learn.dentrixascend.com/release-notes-march-10-2020-prod-351/
