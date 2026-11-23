# Legacy report outputs — Lists: Patient / Responsible Party, Provider, Security and Setup lists (Denticon by Planet DDS)

Research date: 2026-11-22. Audience: engineers and product designers of the Reports & Analytics module.

Scope: what the legacy tool actually **prints** for the 40 reports under `Reports > Lists` — `Patient/Resp. Party List`
(12), `Provider List` (4), `Security List` (4) and `Setup List` (20). We hold screenshots of the criteria screens only;
this document reconstructs purpose, output columns, grouping, totals, option effects, users and quirks from vendor
documentation, vendor-published images and, where nothing exists, comparable systems.

Sibling documents (not repeated here): `legacy_report_outputs_daily_my.md` (report viewer, Excel export behaviour, money
conventions), `legacy_report_outputs_monthly_mgmt_ledger_statements.md` (statements, aging, Executive Summary figure
definitions), `legacy_report_outputs_appointment_recall_referral.md` (`New Patients via Appointments`),
`legacy_report_outputs_insurance_txplan_ortho.md`, `denticon_analytics_and_dso.md` (menu structure, rights, My Favorites).

---

## 0. How to read this document

### 0.1 Evidence tags

| Tag | Meaning |
|---|---|
| `[Pn]` | Planet DDS Help Center article text or vendor PDF, read in full. |
| `[Pn·img]` | Read by us from an image attached to that article (current or retired attachment). The year of the image is given because several are two UI generations old. |
| `[Cn]` | Comparable system documentation. Used only to shape INFERRED layouts; the comparable report is always named. |
| `[L1]`–`[L4]` | Our verified criteria transcriptions: `legacy/patients_list_reports.json` (12 reports, 85 controls), `providers_list_reports.json` (4, 19), `security_list_reports.json` (4, 11), `setup_list_reports.json` (20, 67). |
| `[I]` | Our inference. The basis is named next to it. |
| **(S)** | Seen only as a search-result summary (article no longer retrievable). Lower confidence. |
| **[unverified]** | No source. Do not treat as fact. |
| **[conflict]** | The vendor's own documents or screens disagree with each other or with our screenshots. |

Report names, option labels and column headers are reproduced exactly (they are identifiers). Vendor prose is paraphrased.
Sample values come from the vendor's demo data.

### 0.2 Confidence rating per report

- **DOCUMENTED** — the printed layout was seen in a vendor sample image.
- **PARTIALLY DOCUMENTED** — purpose and some output facts are documented (vendor text, a predecessor's sample, or the
  vendor's definition of the underlying setup table); the column layout is reconstructed.
- **INFERRED** — no vendor description of the output; reconstructed from the criteria screen, the documented setup screen
  behind it and a named comparable report.

### 0.3 Method notes (repeatable)

- Help Center HTML pages answer 403 to fetchers; the same articles are readable through the public Help Center API
  (`/api/v2/help_center/en-us/articles/<id>.json`, `/sections/<id>/articles.json`,
  `/api/v2/help_center/articles/search.json?locale=en-us&query=...`, `/articles/<id>/attachments.json`).
- The attachments endpoint also lists **retired** images that are no longer shown in the article body (2007–2022). That is
  where every sample report in this document came from. About 150 attachment images of about 30 articles were screened by
  colour statistics (a report page is white with no application chrome); about 50 were opened.
- Each of the 40 report names (or its distinctive words) was run through the Help Center search API. The whole
  `Lists - Patient, RP, Insurance, Fees and MORE` section (12 articles) was read in full; nine of the 19 Setup Guide
  articles (users, security groups, providers, offices, procedure codes, prescriptions, notes macros, misc. setups) were
  read for field names.
- Two articles named by search engines no longer exist in the API (`RecordNotFound`): `[P10]` and `[P36]`. They are cited
  as **(S)**.
- Not readable: a DSO training page on a login-gated Google Site; training and webinar videos. The Dentrix Enterprise 11.0
  Reports Reference `[C1]` failed a direct fetch (TLS certificate error) and was read from a copy saved earlier in this
  workflow run.
- No generated Excel output of any Lists report was found.

---

## 1. What planners most need to know

1. **Printed layouts were found for 4 of the 40 reports**, plus one predecessor: `Patient's Notes` (2011),
   `Patients on Payment Plan` (Ortho variant, 2021), `Group Rights List` (2016), `Explosion Codes List` (Summary, 2022),
   and `Patient List - Detail` (2014), the predecessor of `Patient List`. 24 reports are PARTIALLY DOCUMENTED, 12 INFERRED
   (section 2).
2. **Each menu item is a report family.** The 8 patient reports replace 27 legacy reports and the 4 responsible-party
   reports replace 11; the variant is chosen with `REPORT BY`, `REPORT TYPE`, `PLAN TYPE` or `STATEMENT TYPE`
   (section 3.3). Printed titles follow the variant, not the menu name: `Patients on Ortho Payment Plan`,
   `Explosion Codes List (Summary)`, `Security - Group Rights List`, `Patient Notes`.
3. **`REPORT BY` value lists that our screenshots do not show were recovered from vendor screenshots:**
   `Patient List - New Patient` = `Appointment`, `Carrier`, `Created Date / First Visit Date`, `Referral`,
   `Referral Type`; `Patient List - Grouped By` = 13 values (`Attached to Provider`, `Birthdate`, `Carrier`, `Employer`,
   `Fee Schedule`, `HIPAA Agreement`, `Insurance Plan`, `Last Visit`, `Medical Alert`, `Patient Type`,
   `Preferred Provider`, `Uninsured`, `Zip Code`); `Responsible Party List` = `Balance`, `Balance Aged Over X Days`,
   `Created Date`, `Resp. Party Type`, `Send Statement Status`, `Zip` `[P3·img][P5·img][P19]`.
4. **Criteria are dynamic.** Choosing `Last Visit` replaces `PROVIDER` / `SPECIALTY` with a `PREFERRED PROVIDER` block
   (radio `Preferred Provider` / `Treating Provider`), a `LAST VISIT DATE RANGE` and the checkbox
   `Include Patients with No Lastvisit date.`; choosing `Send Statement Status` replaces the date range with a
   `SEND STATEMENT STATUS` dropdown `[P4·img][P20·img]`. Our default-state screenshots miss every non-default mode.
5. **The Security List screen changed between c. 2023 and our 2026 capture [conflict].** Vendor screenshots show three
   reports, with `REPORT FORMAT` (`Detail` / `Summary`) on `User List` and on `Group Rights List`. Our capture has four
   reports; `REPORT FORMAT` now sits only on the new `User-Group Membership` `[P33·img][P31·img][P37·img][L3]`.
6. **`Group Rights List` is one row per office × group × right.** The vendor's demo account printed 1,033 pages
   `[P31·img]`. It has no filter at all in our capture `[L3]`.
7. **`Patient's Notes` shows that the patient Notes screen is also a system activity log:** auto-generated notes record
   forms saved, statements, walkout reports and letters printed, and scanned file names, each typed `Patient Notes`,
   `Responsible Party Notes`, `Financial Notes` or `Chart Notes` `[P11·img]`.
8. **"New patient" has two definitions in reports** — `Created Date` (record entered) and `First Visit Date` (first
   completed procedure posted) — and a third population, appointment-only placeholders, reported by
   `REPORT BY` = `Appointment` `[P27][P1]`.
9. **`Patients Seen` counts from ledger transactions, not appointments:** the date basis is `Transaction Date` or
   `DOS Date`, and the vendor states it does not consider missed or cancelled appointments `[L1][P53]`.
10. **Two names mislead.** `Inactive Plans List` = plans **not attached to any patient**, not plans flagged inactive
    `[P9]`. `Include Inactive Accounts` = accounts in which **every** patient is inactive `[L1]`.
11. **The section header `LAST VISIT DATE RANGE` on `Provider Holidays` is a re-used string.** The vendor's screenshot
    shows that header belongs to `Patient List - Grouped By` in `Last Visit` mode `[P4·img][L2]`.
12. **The no-filter Setup lists are dumps of small setup tables whose fields the vendor defines:** patient types (4
    fields), document types (2), default coverage categories (6), note-macro categories (1), ADA categories (range +
    description, read-only) `[P26]`.
13. **Page furniture is uniform:** line 1 office name (single-office lists) or practice-group name (account-wide lists),
    line 2 title, body, footer echo of the criteria, `Printed :` timestamp, `PlanetDDS (c) 2003 - <year>`,
    `Page : n of m`; some builds add `By : <user>` (section 3.2).
14. **Vendor routines barely mention Lists.** Only `New Patient List` / `New Patient Thru Appointment` (end of day) and
    `Update Patient Insurance (Conversion) List - By Appointment` (daily, two days ahead, converted practices) appear in
    the vendor's recommended routines `[P28][P17]`. The rest are ad hoc / audit reports.

---

## 2. Confidence summary

| # | Report (exact name) | Screen group | Confidence | Best evidence | Comparable used |
|---|---|---|---|---|---|
| 1 | `Patient List` | PATIENT LIST | PARTIALLY DOCUMENTED | Sample of predecessor `Patient List - Detail`, 2014 `[P2·img]`; criteria lineage `[P2·img]`; purpose `[P1][P2]` | Dentrix Enterprise `Patient List`; Open Dental `Active Patients Report` |
| 2 | `Patient List - New Patient` | PATIENT LIST | PARTIALLY DOCUMENTED | `REPORT BY` values `[P3·img]`; definitions `[P1][P27]` | Dentrix Enterprise `New Patient List`; Open Dental `New Patients Report` |
| 3 | `Patients Seen` | PATIENT LIST | PARTIALLY DOCUMENTED | Variant purposes `[P1]`; exclusion rule `[P53]` | Open Dental `Active Patients Report` |
| 4 | `Patient's Notes` | PATIENT LIST | DOCUMENTED | Sample 2011 `[P11·img]`; `[P11]` | — |
| 5 | `Patient List - Grouped By` | PATIENT LIST | PARTIALLY DOCUMENTED | 13 `REPORT BY` values, two modes' criteria `[P5·img][P4·img]`; purposes `[P1][P9]` | Dentrix Enterprise `Birthday List`, `Insurance Carrier List`, `Employers and Employed Patients Report` |
| 6 | `Patients on Payment Plan` | PATIENT LIST | DOCUMENTED (Ortho); Regular inferred | Sample 2021 `[P13·img]` | Dentrix Enterprise `Payment Agreement Report` |
| 7 | `Online Registered Patients` | PATIENT LIST | PARTIALLY DOCUMENTED | Purpose and `Active` field `[P15][P16]` | none found |
| 8 | `Update Patient Insurance (Conversion) List - By Appointment` | PATIENT LIST | PARTIALLY DOCUMENTED | Purpose, cadence `[P17]`; placeholder plan `[P18]` | none (conversion-specific) |
| 9 | `Responsible Party List` | RESPONSIBLE PARTY LIST | PARTIALLY DOCUMENTED | 6 `REPORT BY` values and purposes `[P19]`; modes `[P20·img][P19·img]` | Dentrix Enterprise `Collections Manager List` |
| 10 | `Responsible Party - Statements Sent` | RESPONSIBLE PARTY LIST | PARTIALLY DOCUMENTED | Purpose `[P21]`; statement formats `[P22·img]` | none close |
| 11 | `Responsible Party - Sent to Collection` | RESPONSIBLE PARTY LIST | PARTIALLY DOCUMENTED | Purpose `[P19]`; flag and agency `[P23][P24]` | Dentrix Enterprise `Collections Manager List` |
| 12 | `Responsible Party - Email Statement Error Report` | RESPONSIBLE PARTY LIST | PARTIALLY DOCUMENTED | Purpose `[P19]`; limits `[P22]` | none close |
| 13 | `Provider List` | Provider List | INFERRED | Criteria `[L2]`; setup fields `[P38]` | Dentrix Enterprise `Practice Organization List`; SoftDent `Alphabetical Provider List Report` |
| 14 | `Provider Holidays` | Provider List | INFERRED | Criteria `[L2]`; Holidays tab `[P38][P39]` | none found |
| 15 | `Provider Operatory` | Provider List | INFERRED | Criteria `[L2]`; Ops tab `[P38]` | none found |
| 16 | `Provider Registration` | Provider List | INFERRED (low) | Criteria only `[L2]` | Dentrix Enterprise `Practice Organization List`, `Provider IDs List` |
| 17 | `User List` | Security List | PARTIALLY DOCUMENTED | Content facts `[P32][P33]`; older criteria `[P33·img]` | Dentrix Enterprise `Assigned Rights Report` |
| 18 | `Group List` | Security List | INFERRED | Name only `[P31·img][L3]` | Dentrix Enterprise `Audit Rights Report - Group Names` |
| 19 | `Group Rights List` | Security List | DOCUMENTED (Detail) | Sample 2016 `[P31·img]` | — |
| 20 | `User-Group Membership` | Security List | INFERRED | Criteria `[L3]` | Dentrix Enterprise `Audit Rights Report - Users to Groups` |
| 21 | `Employer List` | INSURANCE | PARTIALLY DOCUMENTED | Purpose `[P9]` | Dentrix Enterprise `Employers and Employed Patients Report` |
| 22 | `Carrier List` | INSURANCE | PARTIALLY DOCUMENTED | Purpose `[P9]` | Dentrix Enterprise `Insurance Carrier List` |
| 23 | `Drug List` | PRESCRIPTION | INFERRED | Existence `[P49·img]`; setup `[P49]` | SoftDent `Rx/Pharmacies/Labs` reports |
| 24 | `Procedure Codes List` | PROCEDURE | PARTIALLY DOCUMENTED | Every criterion explained `[P41]`; content fact `[P26]` | Dentrix Enterprise `Procedure Code List` |
| 25 | `Procedure Codes by Fee Schedule` | PROCEDURE | PARTIALLY DOCUMENTED | Purpose `[P43]`; effective dates `[P44]` | Open Dental `Procedure Codes - Fee Schedules Report` |
| 26 | `Fee Schedule List` | FEE SCHEDULE | INFERRED | Existence, `ED` suffix `[P44]` | Dentrix Enterprise `Fee Schedules Report` |
| 27 | `Office List` | OFFICE | INFERRED | Criteria `[L4]`; setup `[P39]` | Dentrix Enterprise `Practice Organization List` |
| 28 | `Operatory List` | OFFICE | INFERRED | Criteria `[L4]`; setup `[P39]` | none found |
| 29 | `ADA Categories List` | MISC | PARTIALLY DOCUMENTED | Table content `[P26]` | — |
| 30 | `Document Types List` | MISC | PARTIALLY DOCUMENTED | Table fields `[P26][P51]` | Dentrix Enterprise `Custom Practice Information Report` |
| 31 | `Notes Macros List` | MISC | INFERRED | Setup `[P50]` | none found |
| 32 | `Insurance Plan List` | INSURANCE | PARTIALLY DOCUMENTED | Purpose `[P9]`; plan fields `[P47·img]` | Open Dental `Insurance Plans Report` |
| 33 | `Inactive Plans List` | INSURANCE | PARTIALLY DOCUMENTED | Definition `[P9]`; cleanup use `[P48]` | none close |
| 34 | `Explosion Codes List` | PROCEDURE | DOCUMENTED (Summary) | Sample 2022 `[P45·img]` | Dentrix Enterprise `Multi-Code List` (for Detail) |
| 35 | `Credit Codes Report` | PROCEDURE | PARTIALLY DOCUMENTED | Purpose `[P46]`; table fields `[P46]` | Dentrix Enterprise `Custom Practice Information Report` |
| 36 | `Capitation Fee Schedule` | FEE SCHEDULE | PARTIALLY DOCUMENTED | Purpose `[P43]`; `ED` `[P44]` | Dentrix Enterprise `Fee Schedules Report` |
| 37 | `Office Holidays` | OFFICE | INFERRED | Criteria `[L4]`; Holidays tab `[P39]` | none found |
| 38 | `Default Ins Plan Coverage Category List` | MISC | PARTIALLY DOCUMENTED | Six fields `[P26]`; rendered in `[P47·img]` | Dentrix Enterprise `Standard Coverage Tables Report` |
| 39 | `Notes Macro Category List` | MISC | PARTIALLY DOCUMENTED | Table fields `[P26][P50]` | — |
| 40 | `Patient Types List` | MISC | PARTIALLY DOCUMENTED | Four fields `[P26]`; sample values `[P23·img]` | Dentrix Enterprise `Custom Practice Information Report` |

---

## 3. Cross-cutting facts for all Lists reports

### 3.1 Menu, screens, rights

| Aspect | Fact | Source |
|---|---|---|
| Menu | `Reports > Lists >` `Patient/Resp. Party List`, `Provider List`, `Security List`, `Setup List`. | `[P1·img]` 2023, `[P19·img]` 2022 |
| Screens | `denticon.com/ASPX/NewReports.aspx?RptName=Patient%20List%20Reports` (title `Patient/Resp. Party List Reports`) and `...RptName=Security%20List%20Reports` (title `Security List Reports`). `Provider List Reports` and `Setup List Reports` are the titles in our captures. | `[P3·img][P37·img][L2][L4]` |
| Layout | Left: report radios. Patient screen has two collapsible groups `PATIENT LIST` (8) and `RESPONSIBLE PARTY LIST` (4); Setup screen has six groups `INSURANCE`, `PRESCRIPTION`, `PROCEDURE`, `FEE SCHEDULE`, `OFFICE`, `MISC`, opened with the three-dot handle under each group name. Right: `REPORT CRITERIA`, `CLEAR CRITERIA`, `PRINT / PREVIEW`, `ADD TO MY FAVORITES`. | `[L1][L4][P41][P19·img]` |
| Earlier menu (to c. 2021) | `Reports > Lists >` `Patient List`, `Responsible Party List`, `Providers List`, `Employers/Carriers/Plans List`, `Prescription/Drug List`, `Procs/Fee List`, `Office List`, `Security List`, `Setup List`. A 2007 screenshot has the first seven only. | `[P1·img]` 2013, `[P7·img]` 2020, `[P3·img]` 2007 |
| Transition | The consolidated menu is documented from October 2021: separate summary / detail / group reports became criteria of one report; multi-office selection replaced the `Group Reports` menu. In a 2021 screenshot the patient screen is still titled `Patient List Reports` with six reports and no responsible-party group; by April 2022 it has today's 8 + 4. `Reports (Old)` is still in the 2023 menu and still served `Lists > Prescription/Drug List` in a 2024 capture. | `[P29][P16·img][P19·img][P49·img]` |
| Old description pane | The old screen showed a one-line description of the selected report under the list. The texts were terse or placeholders (`Patients list - Detail.`, `Group rights list by group.`, `Fee Name/Schedule List.`, `Responsible list with statement status.` shown for two different reports). They carry no layout information. | `[P2·img][P31·img][P43·img][P20·img][P21·img]` |
| Rights | One right per **old** screen family, each `Full Control` (generate) / `View Only` (see list and parameters only): `Reports - Lists - Patient List Screen`, `... Responsible Party List Screen`, `... Provider List Screen`, `... Employer List Screen`, `... Prescription List Screen`, `... Procedure/Fee List Screen`, `... Office List Screen`. Security lists: `Reports-Lists Security Rpts Screen Full C` (also written `Reports - Lists - Security List Rpts Screen Full C`). How these seven rights gate the consolidated `Setup List` screen is not documented [unverified]. | `[P30][P32][P56]` |
| Pickers | Pickers default to "Include All"; to narrow, click `SELECT` and untick `Include All`. | `[P29]` |
| `PRINT FORMAT` | `PDF` (default) / `Excel` on all 40 reports. With `Excel` the file downloads immediately. Excel layout behaviour: see `legacy_report_outputs_daily_my.md` section 3.1. | `[L1]`–`[L4]`, `[P41]` |
| Dates | Every date box defaults to the current day. | `[L1][L2][L4]` |

### 3.2 Page furniture seen on list-type samples

| Sample (printed title) | Year | Header line 1 | Extra header | Footer criteria echo | Source |
|---|---|---|---|---|---|
| `Patient List - Detail` | 2014 | Office name | — | `ExPatType :` (excluded patient types), `* Excludes Inactive Patients` | `[P2·img]` |
| `Patient Notes` | 2011 | Office name | `Notes for Patient : <name>   PatID : <id>` | `From :`, `Thru :`, `Patient :`, `Note Type :` | `[P11·img]` |
| `Patients on Ortho Payment Plan` | 2021 | Office name | `* <office> is integrated with Open Edge` | not visible (cropped) | `[P13·img]` |
| `Security - Group Rights List` | 2016 | Practice-group name | — | `Offices: ALL` | `[P31·img]` |
| `Explosion Codes List (Summary)` | 2022 | Practice-group name | — | not visible (cropped) | `[P45·img]` |
| `Prescription Detail` (neighbour report) | 2019 | Office name | — | `From :`, `Thru :`, `Providers : ALL`, `Offices : ALL`, `Users : ALL` | `[P49·img]` |

Common tail on every full-page sample: the report title repeated, `Printed : <m/d/yyyy h:mm:ss AM/PM>`,
`PlanetDDS (c) 2003 - <year>`, `Page : n of m`; the 2016 sample adds `By : <username>`. Dates print as `M/D/YYYY` without
zero padding. Tables are ruled grids with a grey header row. `Patient List - Detail` is landscape; the others portrait.

### 3.3 Legacy report → current report (the variants each menu item must reproduce)

| Current report | Selector | Legacy reports folded in | Source |
|---|---|---|---|
| `Patient List` | `PATIENT STATUS`, `Include Patients With No Email` | `Active Patient List`, `Inactive Patient List`, `Patients List`, `Patients List - Email`, `Patient List - Detail`, `Patient List - Address` | names `[P1][P7·img]`; mapping `[I]` from shared criteria |
| `Patient List - New Patient` | `REPORT BY` | `New Patient Thru Appointment`, `New Patient List`, `New Patients - By Referral`, `New Patients - By Referral Type` | `[P1][P3·img]` |
| `Patients Seen` | `REPORT BY`, `REPORT TYPE` | `Patients Seen Per Day`, `Patients Seen Per Day By Age`, `Patients Seen by Medical Alerts`, `Patients Seen by Zip code` | `[P1]` |
| `Patient's Notes` | — | `Patient's Notes` | `[P11·img]` |
| `Patient List - Grouped By` | `REPORT BY` (13) | `Patients by Provider` (later `Patients by Preferred Provider`), `Patients by Lastvisit`, `Patients by Patient Type`, `Patients by Zip Code`, `Patients by Birthdate`, `Patients Insurance List`, `Patients by Fee Schedule`, `Patients with Medical Alerts`, `UnInsured Patient List`, and `Patients by Carrier` from the old `Employers/Carriers/Plans List` screen | `[P1][P7·img][P9]` |
| `Patients on Payment Plan` | `PLAN TYPE` | `Patients on Regular Payment Plan`, `Patients on Ortho Payment Plan` | `[P1][P13]` |
| `Online Registered Patients` | `REPORT TYPE` | new with the 2021 menu | `[P16·img]` |
| `Update Patient Insurance (Conversion) List - By Appointment` | `REPORT TYPE` | same name on the 2020 screen | `[P7·img]` |
| `Responsible Party List` | `REPORT BY` (6) | `Responsible Party List`, `Responsible Party List by Balance`, `Responsible Party List Over [30/60/90/120] days`, `Responsible Party by Billing Type`, `Responsible Party Zip Code`, `Responsible Party-Send Statement Status`. `Responsible Party List - Email` has no named successor. | `[P19][P19·img]` |
| `Responsible Party - Statements Sent` | `STATEMENT TYPE` | `Responsible Party-Statements Sent`; probably also `Email Statement Sent Report` `[I]` | `[P19·img][P21]` |
| `Responsible Party - Sent to Collection` | — | `Responsible Party-Sent to collection` | `[P19·img]` |
| `Responsible Party - Email Statement Error Report` | — | `Email Statement Error Report` | `[P19·img]` |
| `User List`, `Group List`, `Group Rights List` | — | `Security - User List`, `Security - Group List`, `Security - Group Rights List` | `[P31·img]` |
| `User-Group Membership` | `REPORT FORMAT` | none; absent from 2023 screenshots | `[P37·img][L3]` |
| Setup `INSURANCE` group | — | old `Employers/Carriers/Plans List` screen: `Employer List`, `Carrier List`, `Patients by Carrier`, `Insurance Plan List`, `Inactive Plans List` | `[P9]` |
| Setup `PRESCRIPTION` group | — | old `Prescription/Drug List` screen: `Prescription Detail`, `Drug List` (only `Drug List` moved) | `[P49·img]` |
| Setup `PROCEDURE` + `FEE SCHEDULE` groups | — | old `Procedure / Fee Schedules List` screen: `Procedure Code List`, `Fee Schedule List`, `Procedure Codes by Fee Schedule`, `Credit Codes Report`, `Explosion Code List`; `Capitation Fee Schedule` came from `Insurance Reports` | `[P43·img][P44·img][P44]` |

### 3.4 Shared criteria semantics

| Criterion | Meaning | Source |
|---|---|---|
| `OFFICE/GROUP` (`Office` / `Office Group` + picker) | `Office` picks offices (default the current OID). `Office Group` picks groups defined in `Setup > Office Groups` (for example regions); without groups a group run covers all offices of the account. On `User-Group Membership` the same control is headed `LOCATION`. | `[P52][P29][L3]` |
| `PROVIDER` / `PREFERRED PROVIDER` | Provider multi-select. Which provider relation is used depends on the report; in `Last Visit` mode a radio chooses `Preferred Provider` or `Treating Provider`. | `[P4·img][L1]` |
| `INCLUDE PATIENT TYPE` / `EXCLUDE PATIENT TYPE` | Patient types are optional report tags; a patient can carry up to six. The old pickers offered `No Type Defined` as a selectable value. Excluded types are echoed in the footer as `ExPatType :`. | `[P25][P1·img][P2·img]` |
| `EXCLUDE RESPONSIBLE PARTY TYPE` | Exactly one mandatory type per account (billing type; examples `Cash`, `Collections`, `Discount Plan`, `No Type Defined`). | `[P25][P19·img][P21·img]` |
| `PATIENT STATUS` `Active` / `Inactive` / `Both` | Replaces the old checkbox `Include Inactive Patients`; an Active-only run prints `* Excludes Inactive Patients`. | `[P2·img][L1]` |
| `REPORT TYPE` / `REPORT FORMAT` / `SUMMARY/DETAIL` | Three different section titles for the same `Summary` / `Detail` switch. The printed title carries the choice (`Explosion Codes List (Summary)`). | `[L1][L3][L4][P45·img]` |
| `USER` | User multi-select. On `Insurance Plan List` it is applied only when `Include User in Filters` is ticked. | `[L4]` |

### 3.5 Vocabulary used by these reports

| Term | Definition | Source |
|---|---|---|
| New patient | Two report definitions: `Created Date` (date the record was entered) and `First Visit Date` (first date a procedure was posted as completed). | `[P27]` |
| New patient through appointment | A scheduler placeholder with only a "New Patient" appointment, not yet activated into a full patient record. | `[P1][P17]` |
| Last Visit | A date on the patient record; a patient may have none. | `[P4][P1]` |
| Patients seen | On the Executive Summary: patients with a ledger procedure whose code is flagged `Visit Code` (see the monthly sibling document). Assumed to apply here `[I]`. | sibling doc; `[P42]` |
| HIPAA Agreement | A checkbox on the patient record (`PATIENT STATUS` block of Edit Patient). | `[P23·img][P5]` |
| Ortho patient | Checkbox `Ortho Patient` on the patient record; assumed to drive `PATIENT TYPE` = `General` / `Ortho` `[I]`. | `[P23·img][P55]` |
| Send Statement / No Email Statements | Responsible-party flags controlling paper and e-mail statements. | `[P22]` |
| Send to Collection / Collection Agency | Responsible-party flag and agency field; agencies are set up under `Setup > Collection Agencies`. | `[P23][P24]` |
| Plan identity | A plan is the combination group number + employer + carrier. Conversions attach a placeholder plan. | `[P18][P48]` |
| Security group | Defined per office; holds rights named `<Area> - <Function>` with `Full Control` / `View Only` variants; a user has a primary group plus optional additional groups. | `[P35][P31·img]` |

---

## 4. Lists > Patient/Resp. Party List — group `PATIENT LIST`

### Patient List

**Confidence: PARTIALLY DOCUMENTED.** The layout of its predecessor `Patient List - Detail` was seen (2014). The current
printed title and layout were not seen.

**Purpose.** Roster of patient records with contact data — the vendor's answer to "name, address, phone and e-mail of our
patients" — and the way to count active and inactive records; with `PATIENT TYPE` = `Ortho` it lists all orthodontic
patients `[P2][P1][P55]`.

**Lineage evidence.** The 2014 criteria of `Patient List - Detail` were `Exclude Patient Type`, `Sex`, `Age`,
`Include Inactive Patients` — the same set as today's `EXCLUDE PATIENT TYPE`, `SEX`, `AGE RANGE`, `PATIENT STATUS`
`[P2·img][L1]`. The current report most likely prints that layout `[I]`.

**Output (2014 sample, landscape) `[P2·img]`.** One row per patient, no group headers:

| # | Column header | Content / format |
|---|---|---|
| 1 | `Title` | `Mr.`, `Mrs.`, `Ms.`, `Miss`, `Dr.` or blank |
| 2 | `Firstname` | |
| 3 | `Lastname` | |
| 4 | `Address` | Street line |
| 5 | `City` | |
| 6 | `State` | Two letters |
| 7 | `Zip` | |
| 8 | `Email` | Wraps onto a second line when long; blank when missing |
| 9 | `Homephone` | `nnn-nnn-nnnn` |
| 10 | `Cellphone` | |
| 11 | `Birthdate` | `M/D/YYYY` |

The sample is sorted by **first name**. No patient ID, provider, office, status or balance column. 15 pages for one demo
office; no total line visible on page 1.

**Criteria → effect.**

| Criterion `[L1]` | Effect |
|---|---|
| `PATIENT STATUS` `Active` (default) / `Inactive` / `Both` | Row filter; Active-only prints the footer note `* Excludes Inactive Patients` `[P2·img]`. Replaces the old `Active Patient List` / `Inactive Patient List` `[I]`. |
| `PATIENT TYPE` `Both` / `General` / `Ortho` | Row filter on the ortho flag `[P55]`. |
| `OFFICE/GROUP` | Offices whose patients are listed (home office assumed `[I]`). |
| `PROVIDER` | Row filter (old `Active Patient List` had the same `Provider` box) `[P1·img]`; preferred provider assumed `[I]`. |
| `INCLUDE PATIENT TYPE` / `EXCLUDE PATIENT TYPE` | Row filters; exclusion echoed as `ExPatType :` `[P2·img]`. |
| `SEX`, `AGE RANGE` `From` / `To` | Row filters (2014: one `Age` box, default `0`) `[P2·img]`. Not printed as columns in the sample. |
| `Include Patients With No Email` (default ticked) | Unticked = only patients with an e-mail address, the old `Patients List - Email` `[I]`. |

**Other legacy variants.** `Patients List` also showed which records have the HIPAA box ticked; `Active Patient List`
offered `Summary` / `Detail` `[P1][P1·img]`. Whether today's single report keeps a HIPAA column or a count-only mode is
not known.

**Grouping / totals.** None in the sample. The vendor describes the active / inactive lists as the way to know the
**number** of records, so a count is expected `[P1]` `[I]`.

**Who / when.** Front office and marketing, ad hoc (mailings, e-mail campaigns, record counts). Not part of the vendor's
daily or monthly routines `[P28][P17]`.

**Quirks.** Sorted by first name; no identifier column, so duplicates cannot be told apart; `SEX` placeholder is six
hyphens.

**Comparable.** Dentrix Enterprise `Patient List` (a chart-number variant with name, birth date, SSN, chart number, and a
standard variant adding address, phones and insurance) `[C1]`; Open Dental `Active Patients Report` (name, provider,
address, carrier; grouped by clinic then provider; total count on the last page) `[C2]`.

### Patient List - New Patient

**Confidence: PARTIALLY DOCUMENTED.** Variants and definitions are documented; no layout seen.

**`REPORT BY` values (2022 screenshot) `[P3·img]`.**

| Value | Legacy report | Documented meaning `[P1]` |
|---|---|---|
| `Appointment` (default) | `New Patient Thru Appointment` | Patients who have only a "New Patient" appointment and have not been activated into a full patient record. Date section is `APPOINTMENT DATE RANGE` `[L1]`. |
| `Carrier` | none listed | New patients by insurance carrier `[I]`. |
| `Created Date / First Visit Date` | `New Patient List` | Patient records newly created within a date range; the option name adds the second definition, first completed procedure `[P27]`. How the user chooses between the two dates is not visible [unverified]. |
| `Referral` | `New Patients - By Referral` | New records in the range, sorted by referral source. |
| `Referral Type` | `New Patients - By Referral Type` | New records in the range, sorted by referral type. |

**Output `[I]`** (basis: variants above; Dentrix Enterprise `New Patient List`; Open Dental `New Patients Report`): one
row per patient with patient ID, name, phone, the qualifying date (created / first visit / appointment date and time),
provider, referral source or type, carrier; a group header and count per referral source, referral type or carrier in
those modes; a total count. Dentrix Enterprise prints first visit date, first procedure date and patient status with
totals by status, including "non-patients" that had an appointment `[C1]`; Open Dental prints `#`, `Date`, `Last Name`,
`First Name`, `Referral`, `Production Fee` and totals the fee `[C2]`.

**Criteria → effect `[L1]`.** `OFFICE/GROUP` filters offices; the date range applies to the date named by `REPORT BY`;
there is no provider or patient-type filter in the captured mode.

**Who / when.** Front office at end of day: `New Patient Thru Appointment` and `New Patient List` are on the vendor's
end-of-day list; the appointment twin under `Appointment Reports` is recommended weekly to complete Quick Save
placeholders `[P28][P17]`. Marketing uses the referral variants monthly `[I]`.

**Quirks.** Three different populations share one menu item, so counts differ by mode. The same placeholder population
is also reported by `Appointment Reports > New Patients via Appointments` (see the appointment sibling document).

### Patients Seen

**Confidence: PARTIALLY DOCUMENTED.** Variant purposes are documented; `REPORT BY` values other than `Day` and the layout
were not seen.

**Purpose.** Counts of patients treated in a date range `[P1]`:

| Legacy report | Documented output `[P1]` | Expected `REPORT BY` value `[I]` |
|---|---|---|
| `Patients Seen Per Day` | Count of patients in a date range | `Day` (confirmed default `[L1]`) |
| `Patients Seen Per Day By Age` | Count shown in 10-year age categories | by age |
| `Patients Seen by Medical Alerts` | Count per medical alert | by medical alert |
| `Patients Seen by Zip code` | Count of patients per zip code | by zip code |

**Criteria → effect `[L1]`.**

| Criterion | Effect |
|---|---|
| `REPORT TYPE` `Summary` (default) / `Detail` | Summary = counts per day or bucket; Detail = the patients behind each count `[I]`. |
| `DATE RANGE` radio `Transaction Date` (default) / `DOS Date` | Date basis: posting date or date of service of ledger entries. This shows the report reads the ledger, not the schedule `[I]`. |
| `OFFICE/GROUP`, `PROVIDER` | Filters; provider = transaction provider assumed `[I]`. |

**What "seen" means.** The vendor states that this report and the Executive Summary do not consider missed or cancelled
appointments `[P53]`. The Executive Summary counts patients with a ledger procedure flagged `Visit Code`; the same rule
is assumed here `[I]`.

**Output `[I]`** (basis: variant descriptions): Summary by day = `Date`, `Patients Seen`, total and possibly a daily
average; by age = one count column per 10-year band; by medical alert / zip = one row per alert / zip with a count;
Detail adds patient ID, name, age and provider under each day or bucket.

**Who / when.** Managers, monthly or on demand (volume by day, catchment by zip, age mix). Comparable: Open Dental
`Active Patients Report` lists patients with a completed procedure in a date range `[C2]`.

**Quirks.** A patient seen on two days counts once per day in the per-day variant but once in a distinct count — the
legacy report does not say which total it prints [unverified]. The medical-alert variant counts a patient under every
alert they have `[I]`.

### Patient's Notes

**Confidence: DOCUMENTED** (sample 2011, old criteria 2020, article updated 2026).

**Purpose.** Prints the notes recorded in one patient's Notes screen for a date range. The vendor recommends it for
history older than the roughly ten years that the `Clinical History` print shows `[P11]`.

**Printed title:** `Patient Notes` (menu name `Patient's Notes`).

**Output (2011 sample, portrait) `[P11·img]`.** Header: office name, title, then
`Notes for Patient : <name>   PatID : <id>`.

| Column | Content |
|---|---|
| `Date Created` | Date and time to the minute (`4/8/2011 12:52 PM`) |
| `Created By` | Username |
| `Note Type` | `Patient Notes`, `Responsible Party Notes`, `Financial Notes`, `Chart Notes` |
| `Note` | Full note text, wrapped; not truncated |

Rows are newest first. Last line: `Total number of notes : 16`. Footer echo: `From :`, `Thru :`, `Patient :` (patient
ID), `Note Type :` (blank when all).

**Content insight.** Most rows in the sample are system-generated: a HIPAA form page saved, a consent saved, a treatment
plan saved, a credit card authorization saved, a statement printed, a walkout report printed, a letter or batch collection
letter printed (with its template code and name), a scanned document's file name. Each carries its own timestamp with a
time-zone suffix inside the text.

**Criteria → effect `[L1][P11][P11·img]`.**

| Criterion | Effect |
|---|---|
| `PRINT NOTES` picker (default `ALL`) | Note types to print. The 2020 list box starts `ALL`, `Patient Notes`, `Resp. Party Notes`, … Users can add `Patient Notes`, `Responsible Party Notes` and `Financial Notes` by hand `[P12]`. |
| `Patient` + `SEARCH` | Mandatory single patient: type the last name, search, pick. |
| `DATE RANGE` | On the note's created date. |

There is no office filter: the only Lists report driven by one patient.

**Who / when.** Front desk and records staff on request (records release, disputes, audits).

**Quirks.** Results depend on how history was originally documented, and the vendor refers users to support for older
records `[P11]`. Comparable: Dentrix Enterprise `Patient Notes Report`, Open Dental `Patient Notes Report` `[C1][C2]`.

### Patient List - Grouped By

**Confidence: PARTIALLY DOCUMENTED.** All 13 `REPORT BY` values and the criteria of two modes were seen; the purposes of
the legacy variants are documented; no layout seen.

**`REPORT BY` values `[P5·img][P8·img][P1·img]`.**

| Value | Legacy report | Documented purpose / use |
|---|---|---|
| `Attached to Provider` (default) | none identified | Shown with `PROVIDER` and `SPECIALTY` filters `[L1]`. How it differs from `Preferred Provider` is not documented [unverified]. |
| `Birthdate` | `Patients by Birthdate` | List sorted by birthday month `[P1]`. |
| `Carrier` | `Patients by Carrier` | Patients attached to a carrier; can be narrowed to one carrier submission address and/or state `[P9]`; includes a patient count, separated by employer **(S)** `[P10]`. |
| `Employer` | — | Patients by employer of the insurance plan `[P8][I]`. |
| `Fee Schedule` | `Patients by Fee Schedule` | Patients with their default fee schedule `[P1][P7]`; old criteria `Provider`, `Exclude Patient Type`, `Fee Schedule` (default `All`), `Include Inactive Patients` `[P7·img]`. |
| `HIPAA Agreement` | part of `Patients List` | Who is and is not flagged as having a HIPAA agreement on file `[P5]`. |
| `Insurance Plan` | `Patients Insurance List` | Plan assigned to each patient record `[P1]`; list twin of `Labels > Patients Labels by Insurance Plan` `[P6]`. |
| `Last Visit` | `Patients by Lastvisit` | Patients with their Last Visit date; used to find patients not seen for a period `[P1][P4]`. |
| `Medical Alert` | `Patients with Medical Alerts` | Patients having selected medical alerts `[P1]`. |
| `Patient Type` | `Patients by Patient Type` | Patients per patient type, when one is set `[P1]`. |
| `Preferred Provider` | `Patients by Provider` / `Patients by Preferred Provider` | Patients assigned to a preferred provider `[P1]`. |
| `Uninsured` | `UnInsured Patient List` | Patients without insurance `[P7·img][I]`. |
| `Zip Code` | `Patients by Zip Code` | List sorted by zip code `[P1]`. |

**Mode-dependent criteria.**

| Mode | Criteria shown | Source |
|---|---|---|
| `Attached to Provider` | `PATIENT STATUS`; `OFFICE/GROUP`; `PROVIDER`; `INCLUDE` / `EXCLUDE PATIENT TYPE`; `SPECIALTY` | `[L1][P5·img]` |
| `Last Visit` | `PATIENT STATUS`; `OFFICE/GROUP`; `PREFERRED PROVIDER` with radio `Preferred Provider` / `Treating Provider`; `LAST VISIT DATE RANGE`; `INCLUDE` / `EXCLUDE PATIENT TYPE`; `OTHER OPTIONS` `Include Patients with No Lastvisit date.` | `[P4·img]` 2022, 2023 |
| other 11 | not captured | — |

**Output `[I]`** (basis: variant purposes; Dentrix Enterprise `Birthday List`, `Insurance Carrier List`,
`Employers and Employed Patients Report`): a group header per `REPORT BY` value (provider, birth month, carrier,
employer, fee schedule, yes / no, plan, patient type, zip), patient rows (ID, name, phones, plus the grouping detail:
birth date, last-visit date, subscriber ID, alert), a count per group and a grand total. Dentrix Enterprise's
`Birthday List` prints name, mailing address and birth date; its carrier and employer lists can include subscribers or
employed patients with a count `[C1]`.

**Who / when.** Reactivation (`Last Visit`, with the no-last-visit box ticked), marketing (`Zip Code`, `Birthdate`),
insurance coordinators (`Carrier`, `Insurance Plan`, `Employer`, `Uninsured`, `Fee Schedule` — for example before
replacing a fee schedule), compliance (`HIPAA Agreement`, `Medical Alert`), providers (`Preferred Provider`). All ad hoc
`[I]`; only the `Last Visit`, `HIPAA Agreement`, `Fee Schedule` and insurance uses are described by the vendor
`[P4][P5][P7][P8]`.

**Quirks.** The label reads `Lastvisit` as one word; the date header reads `LAST VISIT DATE RANGE`. Thirteen modes behind
one name make saved favorites ambiguous unless the mode is stored.

### Patients on Payment Plan

**Confidence: DOCUMENTED for `PLAN TYPE` = `Ortho`** (sample 2021); the `Regular` layout is inferred.

**Purpose.** Patients who have a regular payment contract or an orthodontic contract whose setup date falls in a range;
the report also shows whether a credit card is on file for the plan `[P13][P1][P14]`.

**Printed title:** `Patients on Ortho Payment Plan` (legacy names `Patients on Regular Payment Plan`,
`Patients on Ortho Payment Plan`).

**Output (Ortho sample) `[P13·img]`.** Header: office name, title, note line `* <office> is integrated with Open Edge`
(the card processor).

| Column group | Sub-columns | Sample row |
|---|---|---|
| `ChartNo#` | | blank |
| `PatID` | | `147` |
| `Patient Name` | | `Last, First` |
| `Total Ortho Amt.` | | `1000.00` |
| `Pat Plan Setup Dt` | | `9/4/2020` |
| `Periodic Amt.` (patient) | | `58.34` |
| `Pat No. of Pay` | `Total`, `Rem.` | `12`, `12` |
| `Pat Amount` | `Total Pln.`, `Rem.` | `700.00`, `700.00` |
| `Ty` | | `P` (meaning not documented) |
| `Ins Plan Setup Dt` | | `9/4/2020` |
| `Periodic Amt.` (insurance) | | `25.00` |
| `Ins No. of Pay` | `Total`, `Rem.` | `12`, `11` |
| `Ins Amount` | `Total Pln.`, `Rem.` | `300.00`, `275.00` |
| `CC On File` | | `NO` |

**Grouping / totals.** Group header `Provider : <Last, First Degree> : <ShortID>`. One `Total :` row for the whole report
summing `Total Ortho Amt.`, patient `Total Pln.` / `Rem.` and insurance `Total Pln.` / `Rem.` (sample `3000.00`,
`2700.00`, `2700.00`, `300.00`, `275.00`). Last line `Total number of Patients on Ortho Contract Plans : 3`. No
per-provider subtotal.

**Criteria → effect `[L1]`.**

| Criterion | Effect |
|---|---|
| `PLAN TYPE` `Regular` (default) / `Ortho` | Selects the contract type and the title. A regular contract has no insurance block `[I]`. |
| `PREFERRED PROVIDER` | Filter and, by the sample, the grouping key `[I]`. |
| `PLAN SETUP DATE RANGE` | On the contract setup date (`Pat Plan Setup Dt`). Defaults to today, so the default run is nearly empty. |
| `EXCLUDE PATIENT TYPE` | Row filter. |
| `CREDIT CARD ON FILE` (default `Both`) | Filter on `CC On File`; other values presumably yes / no `[I]`. |

**Who / when.** Ortho and treatment coordinators and billing: reconcile contracts with periodic charge generation, chase
plans without a stored card. Comparable: Dentrix Enterprise `Payment Agreement Report` (agreement date, balance, payment
amount, next and last payment, payments and balance remaining) `[C1]`.

**Quirks.** It filters on setup date, so it is not a list of all open plans unless the range is wide. One sample row shows
24 total payments and 25 remaining.

### Online Registered Patients

**Confidence: PARTIALLY DOCUMENTED.**

**Purpose.** All online patient registrations received during the date range, per office; meant for monitoring the
roll-out of Online Patient Registration across locations `[P15][P16]`.

**Documented field.** `Active` — `TRUE` = registration still active and not yet imported by the office; `FALSE` =
imported `[P15]`.

**Criteria → effect `[L1]`.** `REPORT TYPE` `Summary` / `Detail`; `OFFICE/GROUP`; `CREATED DATE RANGE` (registration
received date).

**Output `[I]`** (basis: `[P15][P16]`): Detail = one row per registration with created date, patient name and contact
data, office, `Active`; Summary = registrations per office, possibly split pending / imported. The raw `TRUE` / `FALSE`
values suggest an unformatted dataset.

**Who / when.** Front office daily (import pending registrations); operations weekly (adoption per office) `[I]`.
No close comparable report was found.

### Update Patient Insurance (Conversion) List - By Appointment

**Confidence: PARTIALLY DOCUMENTED.**

**Purpose.** For practices converted from another system: lists patients with appointments in the date range whose
insurance still needs to be updated so that it can be verified before the visit `[P17]`.

**Why it exists.** Conversions do not convert insurance plans. A converted patient with insurance gets a placeholder plan
(carrier `CONVERSION DEFAULT - Do NOT Delete! Change Pt Ins!`, employer `CONVERSION`, group `DO NOT TOUCH`) that carries
the old system's plan details as a hint; staff must search the plan database and attach the real plan `[P18]`.

**Criteria → effect `[L1]`.** `REPORT TYPE` `Summary` / `Detail`; `OFFICE/GROUP`; `APPOINTMENT DATE RANGE`.

**Output `[I]`** (basis: `[P17][P18]`): Detail = appointment date and time, patient ID, name, phone, provider, and the
converted insurance hint (carrier, employer, group, subscriber ID) per coverage slot; Summary = count of such patients
per office or day.

**Who / when.** Front office, daily for appointments two days ahead, while the practice is post-conversion `[P17]`. It is
the only Lists report in the vendor's `Denticon Reporting 101` role matrix.

**Quirks.** Useless for practices that were never converted. The nearest ongoing equivalent is an eligibility /
verification work list (see the insurance sibling document).

---

## 5. Lists > Patient/Resp. Party List — group `RESPONSIBLE PARTY LIST`

### Responsible Party List

**Confidence: PARTIALLY DOCUMENTED.** Variants and their purposes are in vendor text; no layout seen.

**`REPORT BY` values `[P19]`.**

| Value | Legacy report `[P19·img]` | Documented purpose `[P19]` | Mode-specific criteria |
|---|---|---|---|
| `Balance` | `Responsible Party List by Balance` | Which accounts have a balance | not captured |
| `Balance Aged Over X Days` | `Responsible Party List Over [30/60/90/120] days` | Accounts overdue in the selected aging period | 2021: `Created Date Range`, `Exclude Responsible Party Type`, `Aged Balance range` `Start` `1.00` / `End` `999,999.99`, days `30` / `60` / `90` / `120` `[P19·img]` |
| `Created Date` (default) | `Responsible Party List` | Number of responsible-party accounts | `CREATED DATE RANGE`; `EXCLUDE RESPONSIBLE PARTY TYPE`; `Include Inactive Accounts (All patients inactive in account)` `[L1]` |
| `Resp. Party Type` | `Responsible Party by Billing Type` | Accounts by type | not captured |
| `Send Statement Status` | `Responsible Party-Send Statement Status` | Accounts eligible / ineligible to receive a statement | Date range replaced by `SEND STATEMENT STATUS` (`Yes` / `No`); `EXCLUDE RESPONSIBLE PARTY TYPE`; inactive-accounts checkbox `[P20·img]` |
| `Zip` | `Responsible Party Zip Code` | Accounts by zip code | not captured |

**Output `[I]`** (basis: variants; Dentrix Enterprise `Collections Manager List`): one row per account with
responsible-party ID, name, address, phones, e-mail, type, created date, send-statement flag, balance (and the aged amount
in the aged mode); grouped by type or zip in those modes; account count and balance total.

**Who / when.** Billing. Documented use: before a statement run, list accounts with `Send Statement Status` = `No` to
explain why some accounts get no statement `[P20]`. For "who owes money" the vendor points to the Aging reports instead
`[P61]` (see the monthly sibling document).

**Quirks.** An "inactive account" is one where all patients are inactive. The aged mode filters on created date as well as
on aged balance.

### Responsible Party - Statements Sent

**Confidence: PARTIALLY DOCUMENTED.**

**Purpose.** After statements are generated, lists the accounts for which a statement was generated on a given statement
date. (Before the run, the `Print Statement Report` button on the Statements screen lists eligible accounts.) `[P21]`

**Criteria → effect `[L1]`.**

| Criterion | Effect |
|---|---|
| `STATEMENT TYPE` `Paper` (default) / `Email` / `Both` | Delivery channel. Mirrors the statement formats `Only Paper` / `Only Email` / `Email & Paper` (2014 screen) and `Paper` / `Email` / `Both` (Statement Setup) `[P21·img][P22·img]`. `Email` and `Both` are greyed in our capture — presumably offices without e-statements `[I]`. |
| `Statement Date` | One date, not a range: must equal the date of the statement run. |
| `OFFICE/GROUP` | Offices. |

**Output `[I]`** (basis: `[P21]`): responsible-party ID, name, mailing address or e-mail, statement date, channel,
statement balance; count of statements and total balance.

**Related.** The Denticon Statement Setup dialog has its own buttons `PRINT STATEMENT SENT`, `EMAIL STATEMENT SENT REPORT`
and `EMAIL STATEMENT ERROR REPORT` `[P22·img]`.

**Who / when.** Billing, after each statement run, and when a payer says no statement arrived. A known-issue entry
describes a statement received with no record of it in the system (title only) **(S)** `[P63]`.

### Responsible Party - Sent to Collection

**Confidence: PARTIALLY DOCUMENTED.**

**Purpose.** Accounts that have been sent to collection `[P19]`.

**Underlying data `[P23][P24]`.** The responsible-party record has a `Send to Collection` checkbox and a
`Collection Agency` field (agencies from `Setup > Collection Agencies`). The vendor also advises ticking
`No Correspondence` on the patient and posting a zero-fee `Z` procedure code to the ledger to mark the hand-over. The
balance stays on the account; aging and statements still include it unless
`Exclude patients sent to collection` is ticked.

**Criteria → effect `[L1]`.** `OFFICE/GROUP`; `ACCOUNT BALANCE RANGE` `Start` `0.00` / `End` `999999.99`. No date.

**Output `[I]`** (basis: fields above; Dentrix Enterprise `Collections Manager List`): responsible-party ID, name, phone,
collection agency, account balance (possibly aged), last payment; count and balance total.

**Who / when.** Billing and collections, monthly; reconciliation against the agency's list.

**Quirks.** The flag has no documented date, which is why the vendor recommends a ledger marker; the report therefore
cannot answer "sent when" `[I]`.

### Responsible Party - Email Statement Error Report

**Confidence: PARTIALLY DOCUMENTED.**

**Purpose.** Accounts that did not receive an e-mailed statement because of an error with the e-mail address on file
`[P19]`. One of the e-statement service reports (sent, error, bounced) `[P22]`.

**Documented limits `[P22]`.** The reports give no reason for a failed delivery; typical causes are a wrong address or
blocking by the recipient's mail provider. E-statements go out three days after the statement date, as an e-mail with a
download link.

**Criteria → effect `[L1]`.** `OFFICE/GROUP`; `Statement Sent Date` (one date).

**Output `[I]`**: responsible-party ID, name, e-mail address, statement date / sent date, balance; count.

**Who / when.** Billing, after each e-statement run: correct the address or re-send on paper.

**Quirks.** [conflict] The same vendor article says the `No Email Statements` box must be ticked to send e-statements and,
two lines later, that accounts get e-statements unless it is ticked `[P22]`.

---

## 6. Lists > Provider List

No vendor article describes any of the four reports; only the right `Reports - Lists - Provider List Screen` is documented
`[P30]`. The old menu item was `Providers List` `[P1·img]`.

### Provider List

**Confidence: INFERRED.** Comparable: Dentrix Enterprise `Practice Organization List`; SoftDent
`Alphabetical Provider List Report`.

**Purpose `[I]`.** Roster of providers per office.

**Criteria `[L2]`.** `OFFICE/GROUP`; `PROVIDER`; `SPECIALTY` (default `ALL`); `STATE` (default `ALL`). The only provider
report with specialty and state filters.

**Likely columns `[I]`** — fields of `Setup > Providers > Provider Setup`, `Info` tab `[P38]`:

| Field | Notes |
|---|---|
| `Provider ID` | Assigned sequentially, not editable |
| `Short ID` | Four to six characters; printed on ledgers and plans |
| `Last, First` + degree | |
| `Provider Type` | `Dentist`, `Hygienist`, `Assistant`, `N/A` |
| `Billing Provider` | Yes / no |
| `Specialty` | From a setup list (includes general practice and dental hygienist); also used by the referral manager |
| Address, city, state, zip, phone, e-mail | The `STATE` filter most likely reads this state `[I]` |
| `Active`, `Is Ortho Provider` | |
| Offices (`Works At`) | The `OFFICE/GROUP` filter most likely reads this assignment `[I]` |

Dentrix Enterprise's list prints name, title, provider ID, address, phone, specialty and class, plus identification
numbers and default fee schedule; SoftDent prints provider names with office or home address and can include inactive
providers `[C1][C3]`.

**Who / when.** Administrators after setup and during credentialing or audits `[I]`.

### Provider Holidays

**Confidence: INFERRED.** No comparable report found.

**Criteria `[L2]`.** `OFFICE/GROUP`; `PROVIDER`; a date range whose header reads `LAST VISIT DATE RANGE` (re-used string;
it is a holiday date range).

**Underlying data `[P38][P39]`.** `Provider Setup > Holidays` tab, a list titled "Holidays or Exceptions": each entry is
`One Time` or `Recurring` (every day, week, two, three or four weeks, with `From Date` / `To Date`), has a type
`Office Closed` or `Office Open` (the latter with start, end and lunch times) and a description. Holidays form a
hierarchy `[P38]`; its order — account-wide enterprise holidays, office holidays, office-open exceptions, provider
holidays, provider in-office exceptions — was seen only as a search summary **(S)** `[P57]`.

**Likely output `[I]`.** Grouped by office then provider: date or date range, description, type, recurrence, hours;
entries intersecting the date range.

**Who / when.** Office managers and schedulers planning coverage; payroll or goal checks (provider working days) `[I]`.

### Provider Operatory

**Confidence: INFERRED.** No comparable report found.

**Criteria `[L2]`.** `OFFICE/GROUP`; `PROVIDER`.

**Underlying data `[P38]`.** `Provider Setup > Ops` tab: the operatories a provider is assigned to, per office.
Operatories are schedule columns defined in `Setup > Offices > Operatories`; the vendor's best practice is that providers
do not share operatories.

**Likely output `[I]`.** Office → provider (short ID, name) → operatory names.

**Who / when.** Administrators troubleshooting the scheduler (an appointment shows the wrong provider, a provider is
missing from a view or from goals) `[I]`.

### Provider Registration

**Confidence: INFERRED (low).** Comparable: Dentrix Enterprise `Practice Organization List`, `Provider IDs List`.

**Criteria `[L2]`.** `OFFICE/GROUP` only — no provider picker.

**What it most likely is `[I]`.** A list of provider registration numbers per office: `License #`, `DEA #`, `NPI #`,
`TaxID #` (with its type `EIN` / `SSN` / `HCFA Provider ID`), `CS #` (controlled substance number, District of Columbia),
`DPS` (Texas), `Ref ID` — the identifiers on the provider `Info` tab `[P38]`. Dentrix Enterprise prints the same kind of
numbers (NPI, state ID, TIN, Medicaid, DEA) and has a separate list of per-carrier provider IDs `[C1]`; Denticon keeps
per-carrier legacy IDs on the `INS-IDS` tab `[P40]`.

**Alternative reading [unverified].** Provider enrolment status with connected services (e-claims provider match,
e-prescribing, online booking). No vendor page uses the term "Provider Registration".

**Action.** Obtain one generated sample before specifying this report.

---

## 7. Lists > Security List

Right required: `Reports-Lists Security Rpts Screen Full C` `[P32]`.

### User List

**Confidence: PARTIALLY DOCUMENTED.**

**Purpose.** List of the users set up in the account; shows which security groups each user belongs to, so that anyone can
find who has administrator access `[P32][P34]`.

**Documented output facts.**

- A `Group Membership` column sits on the right side of the report `[P32]`.
- A `Summary` format lists all usernames of the account and shows no passwords; the vendor recommended printing it as a
  username reference before the two-stage login change `[P33]`.

**Criteria [conflict].**

| Version | Criteria | Source |
|---|---|---|
| c. 2023 vendor screenshot | `PRINT FORMAT`; `REPORT FORMAT` `Detail` (default) / `Summary`; `USER` (`ALL`); `OTHER OPTIONS` `Include Inactive Users` | `[P33·img]` |
| Our 2026 capture | `PRINT FORMAT`; `USER`; `Include Inactive Users` — no `REPORT FORMAT` | `[L3]` |

**Likely columns `[I]`** — fields of `Setup > Security > Users` `[P35]`: `Username`, first and last name, `Short ID`,
e-mail, phone, `Primary Security Group`, `User Role/Type`, `Report Access Provider`, `Patient Access Level`, assigned
offices, active flag, and `Group Membership` (all groups). The old `Detail` format probably held these and the `Summary`
the username and name only.

**Who / when.** Account administrators: onboarding and offboarding checks, access reviews, locating an administrator.
Comparable: Dentrix Enterprise `Assigned Rights Report` (`User`, `Clinic`, `Rights`) `[C1]`.

### Group List

**Confidence: INFERRED.** Comparable: Dentrix Enterprise `Audit Rights Report - Group Names` (a change audit, not a
current-state list).

**Criteria `[L3]`.** `PRINT FORMAT` only. Legacy name `Security - Group List` `[P31·img]`.

**Likely output `[I]`.** `Office`, `Group` — security groups are defined per office (the `Group Rights List` sample has
exactly these two leading columns) `[P31·img]` — possibly with a member count. Preloaded groups include `Clerical`,
`Clinical`, `Office Manager`, `Time Clock Only` and a vendor services group; `Administrators` appears in the sample
`[P35][P31·img]`.

**Who / when.** Administrators comparing group sets across offices: groups are copied to a new office only if the user
accepts the copy prompt, otherwise the office starts with `Administrators` alone `[P58]`.

### Group Rights List

**Confidence: DOCUMENTED** for the `Detail` layout (sample 2016).

**Purpose.** The security rights held by each security group, per office `[P31]`; a checklist of rights per group
**(S)** `[P36]`.

**Printed title:** `Security - Group Rights List`.

**Output (2016 sample, portrait) `[P31·img]`.** Header: practice-group name, title.

| Column | Content |
|---|---|
| `Office` | Office name, printed once per office |
| `Group` | Group name, printed once per group (`Administrators`) |
| `Rights` | One right per line: `Appointments - Add New Appointment`, `Appointments - Daily View - Full Control`, `Patient - Add New Flash Alerts`, `Patient - Delete Prescriptions`, … |

Footer: `Offices: ALL`, title, `Printed : <date time>`, `By : <username>`, `Page : 1 of 1033`. No totals.

**Criteria [conflict].**

| Version | Criteria | Source |
|---|---|---|
| 2016 / 2019 old screen | `Detail` / `Summary`; `Office` multi-select (default `ALL`) | `[P31·img]` |
| 2023 new screen | `PRINT FORMAT`; `REPORT FORMAT` `Detail` (default) / `Summary`; no office filter | `[P31·img]` |
| Our 2026 capture | `PRINT FORMAT` only | `[L3]` |

The `Summary` layout was not seen.

**Who / when.** Administrators: find which groups hold a given right (the vendor's own troubleshooting step for a missing
button), review a group before editing it, access audits `[P34][P32]`.

**Quirks.** Volume: rights × groups × offices, 1,033 pages in the demo account, and no way to restrict to one group or one
right in the current screen. The same group name repeats under every office.

### User-Group Membership

**Confidence: INFERRED.** Comparable: Dentrix Enterprise `Audit Rights Report - Users to Groups`.

**Status.** Not on the vendor's 2023 screenshots of this screen (three reports) and not mentioned in any article; present
in our 2026 capture `[P37·img][L3]`. It takes over the question the vendor used to answer with the `Group Membership`
column of `User List` `[P32]`.

**Criteria `[L3]`.** `PRINT FORMAT`; `REPORT FORMAT` `Detail` (default) / `Summary`; `SECURITY GROUP` (`Group`, default
`ALL`); `LOCATION` (`Office` / `Office Group` + picker); `Include Inactive Users`.

**Likely output `[I]`.** Detail: office → group → member rows (username, name, active flag); Summary: number of users per
group per office. A user can belong to several groups, so users repeat `[P35]`. Effective rights are the union of the
groups: where one group gives `View Only` and another `Full Control`, the wider right wins `[P62]` — the report shows
membership, not effective rights.

**Who / when.** Administrators and compliance: periodic access reviews per location `[I]`.

---

## 8. Lists > Setup List

Screen groups `[L4]`: `INSURANCE` (Employer List, Insurance Plan List, Carrier List, Inactive Plans List), `PRESCRIPTION`
(Drug List), `PROCEDURE` (Procedure Codes List, Explosion Codes List, Procedure Codes by Fee Schedule, Credit Codes
Report), `FEE SCHEDULE` (Fee Schedule List, Capitation Fee Schedule), `OFFICE` (Office List, Office Holidays, Operatory
List), `MISC` (ADA Categories List, Default Ins Plan Coverage Category List, Document Types List, Notes Macro Category
List, Notes Macros List, Patient Types List). Sections below follow the order requested, not the screen order.

General use `[I]` (basis: the Dentrix Enterprise reference schedules its equivalents after initial setup and then as
needed `[C1]`): administrators print these after setup or conversion, before clean-ups, at annual fee updates and for
audits.

### Employer List

**Confidence: PARTIALLY DOCUMENTED.** Comparable: Dentrix Enterprise `Employers and Employed Patients Report`.

**Purpose.** All employers entered in the employer database, which insurance plans refer to `[P9]`.

**Criteria `[L4]`.** `EMPLOYER` picker (`ALL`); `STATE` (`ALL`).

**Likely output `[I]`.** Employer ID, name, address, city, state, zip, phone; count. Dentrix Enterprise prints employer
name, mailing address and phone and can add the number of employed patients `[C1]`.

**Who / when.** Insurance coordinators locating duplicate employers before consolidating plans `[P48][I]`. Right:
`Reports - Lists - Employer List Screen` `[P30]`.

### Carrier List

**Confidence: PARTIALLY DOCUMENTED.** Comparable: Dentrix Enterprise `Insurance Carrier List`.

**Purpose.** All carriers entered in the carrier database `[P9]`.

**Criteria `[L4]`.** `CARRIER` picker (`ALL`); `STATE` (`ALL`).

**Likely output `[I]`.** Carrier ID, name, claim submission address, phone, payer ID, electronic / paper; count. A carrier
prints on plan documents as `ID#`, name, address and phone `[P47·img]`; one carrier can have several claim submission
addresses `[P9]`. Dentrix Enterprise's list adds claim format, payor ID and optional subscribers `[C1]`.

**Who / when.** Insurance coordinators; the IDs feed `Utilities > Insurance/Procedure > Consolidate Duplicate Carriers`
(`Old Carrier ID` → new) `[P48]`.

### Drug List

**Confidence: INFERRED.** Comparable: SoftDent `Rx/Pharmacies/Labs` reports.

**Existence.** The old `Prescription/Drug List` screen offered two reports, `Prescription Detail` and `Drug List`
`[P49·img]`.

**Criteria `[L4]`.** `USER` picker (`ALL`). What the user relation is (created by, or user-specific drugs) is not
documented [unverified].

**Underlying data `[P49]`.** `Setup > Prescriptions`: a drug entry with dispense instruction, sig and prescription note,
flagged `Add To All Offices` or assigned to offices under Office Assignment.

**Likely output `[I]`.** Drug name, dispense, sig, refills, dispense-as-written, note, offices. The neighbour report
`Prescription Detail` prints `Rx Date`, `Chart#`, `Patient Name`, `Provider`, `Drug Name`, `Dispense`, `Sig`,
`Dispense as written`, `Refill`, `Created By`, with `Prescription Note:` / `Internal Note:` sub-rows and
`Total Prescriptions : n` `[P49·img]`; the catalogue list should use the same drug column names.

### Procedure Codes List

**Confidence: PARTIALLY DOCUMENTED.** Comparable: Dentrix Enterprise `Procedure Code List`.

**Purpose.** Prints the organisation's procedure codes `[P41]`; the vendor also uses it to see which codes sit in which
insurance coverage category `[P26]`.

**Criteria → effect `[P41][L4]`.**

| Criterion | Effect |
|---|---|
| `CATEGORY` (`ALL`) | Codes of one ADA category |
| `PRODUCTION TYPE` (`ALL`) | Codes of one scheduler production type |
| `STATUS` `Active` / `Inactive` / `Both` | Code status |
| `Include Only Tooth Required` | Only codes that require a tooth number |
| `Include Only Surface Required` | Only codes that require a surface |
| `Include Only Bill to Insurance` | Only codes set up to be billed to insurance |

**Likely output `[I]`** — `Setup > Procedure Codes` fields `[P42]`: `Code`, `Description`, `ADA Category`, `User Code`,
`Scheduler Production Type`, `Insurance Category` (documented as discoverable from this report `[P26]`), tooth / surface
requirement, bill-to-insurance flag, active flag. Dentrix Enterprise prints code, description, treatment area and an
insurance flag `[C1]`.

**Notes.** Procedure codes are global to the account, hence no office filter `[P42]`. Legacy name `Procedure Code List`
`[P43·img]`.

### Procedure Codes by Fee Schedule

**Confidence: PARTIALLY DOCUMENTED.** Comparable: Open Dental `Procedure Codes - Fee Schedules Report`; Dentrix Enterprise
`Fee Schedules Report`.

**Purpose.** The vendor's way to print an office (UCR) or contracted PPO fee schedule `[P43]`.

**Criteria → effect `[L4][P43·img][P44]`.**

| Criterion | Effect |
|---|---|
| `PROCEDURE CODE TYPE` `Dental` / `Medical` / `Other` (all ticked) | Code families included |
| `CATEGORY`, `PRODUCTION TYPE`, `STATUS`, three `Include Only …` boxes | As in `Procedure Codes List` |
| `FEE SCHEDULE` | One schedule; there is no `ALL` default (a specific schedule is preselected) |
| `EFFECTIVE DATE` (dropdown) | One effective-dated version of the chosen schedule. Added with the Effective Date feature (2020); the old dropdown showed the date as a suffix `[ED: m/d/yyyy]` after the schedule name |

**Likely output `[I]`.** Header with schedule name and effective date; rows `Code`, `Description`, `Fee`, possibly under
category headings. Open Dental prints `Category`, `Code`, `Desc`, `Abbr`, `Fee`; Dentrix Enterprise prints `Code`, `Fee`,
`Lab Expense`, `Material` and can place several schedules side by side `[C2][C1]`.

**Who / when.** Office managers at fee updates and PPO negotiations; verifying an imported schedule.

### Fee Schedule List

**Confidence: INFERRED.** Comparable: Dentrix Enterprise `Fee Schedules Report`.

**Criteria `[L4]`.** `FEE SCHEDULE` dropdown, default `ALL`; entries show the effective date as `ED` `[P44]`.

**What it prints is not documented.** Two readings `[I]`: (a) a catalogue of fee schedules — name, ID, effective dates —
because the default is `ALL` and the per-code fees have their own report; (b) codes and fees of every selected schedule.
Reading (a) is more consistent with the criteria. The vendor's sibling product prints a `Fee Schedule` report listing
procedures against schedule name, location and amounts `[C4]`.

### Office List

**Confidence: INFERRED.** Comparable: Dentrix Enterprise `Practice Organization List`.

**Criteria `[L4]`.** `OFFICE/GROUP`.

**Likely output `[I]`** — `Setup > Offices > Office Setup` fields `[P39]`: OID, `Office Name`, `Short ID`, treating
address, phone, fax, `Time Zone`, `Tax ID#`, `Insurance Billing Provider`, `Opening Date`, `Office Group`,
`Default UCR Fee Schedule`, `Default Fee Schedule`. Right: `Reports - Lists - Office List Screen` `[P30]`.

### Operatory List

**Confidence: INFERRED.** No comparable report found.

**Criteria `[L4]`.** `OFFICE/GROUP`.

**Underlying data `[P39]`.** `Office Setup > Operatories`: schedule columns (not necessarily physical chairs), shown in
alphanumeric order on the daily view.

**Likely output `[I]`.** Office, operatory name (and ID), possibly the providers assigned to it.

### ADA Categories List

**Confidence: PARTIALLY DOCUMENTED.**

**Content.** The ADA Categories setup screen holds, for each category, the procedure code range and its description; it is
read-only (the system assigns a code's ADA category from the code) `[P26][P42]`.

**Criteria `[L4]`.** None beyond `PRINT FORMAT`.

**Likely output `[I]`.** Category, code range, description — the value list of every `CATEGORY` filter.

### Document Types List

**Confidence: PARTIALLY DOCUMENTED.** Comparable: Dentrix Enterprise `Custom Practice Information Report`.

**Content.** Document types categorise scanned or uploaded patient documents; each has a `Type Code` (a two-digit
identifier) and a `Description` `[P26][P51]`.

**Criteria `[L4]`.** None. **Likely output `[I]`.** `Type Code`, `Description`.

### Notes Macros List

**Confidence: INFERRED.** No comparable report found.

**Criteria `[L4]`.** `MACRO CATEGORY` (`ALL`).

**Underlying data `[P50]`.** `Setup > Notes Macros`: `Macro Name`, `Macro Category`, a template body built from data tags
and questions (free text or pick list, optionally required), availability for all offices or per office assignment.

**Likely output `[I]`.** Category heading, macro name, and probably the macro text; whether the full template prints is
unknown.

### Insurance Plan List

**Confidence: PARTIALLY DOCUMENTED.** Comparable: Open Dental `Insurance Plans Report`.

**Purpose.** All insurance plans entered in the plan database `[P9]`.

**Criteria → effect `[L4]`.**

| Criterion | Effect |
|---|---|
| `SORT BY` `Carrier` (default) / `Employer` | Sort and probably grouping key `[I]` |
| `DATE RANGE` with checkboxes `Created On` / `Modified On` (default) and `Start Date` / `End Date` (greyed in the capture) | Restricts to plans created and / or modified in a range `[I]` |
| `USER` with `Include User in Filters` (default ticked) | Restricts to plans created or modified by chosen users `[I]` |
| `EMPLOYER`, `CARRIER`, `GROUP #` (free text) | Plan identity filters |

The created / modified / user filters make this the only Setup list that doubles as a change audit `[I]`.

**Likely output `[I]`.** Plan ID, carrier, employer, group number, plan type, created on / by, modified on / by, used or
not used. Plan attributes the vendor prints on the single-plan document `Insurance Plan Details`: `Plan ID`, `Group No`,
`Dental/Medical`, `Plan Type`, carrier (`ID#`, name, address, phone), employer (`ID#`, name), `Anniv.Dt.(M/D)`,
`Effective Date`, `Term Date`, `Per Visit Co-pay`, `Fees to print`, `Print Option`, `Non Dup Ben`, `NOA Only`, benefits
(`Plan Maximum`, `Plan Deductible`, `Plan Ortho Maximum`, individual / family) and the coverage table `[P47·img]`.
Open Dental prints carrier, subscriber, carrier phone and group name with a subscriber total `[C2]`.

**Who / when.** Insurance coordinators auditing plan entry and hunting duplicates; managers reviewing who changed plans.

### Inactive Plans List

**Confidence: PARTIALLY DOCUMENTED.** No close comparable.

**Purpose.** Plans that exist in the database but are **not in use on any patient record** `[P9]`.

**Criteria `[L4]`.** `CARRIER` picker only.

**Likely output `[I]`.** Plan ID, carrier, employer, group number; count.

**Who / when.** Clean-up: after `Consolidate Duplicate Insurance Plans` moves patients to the surviving plan, the
duplicates show as "Not Used" in plan setup and can be deleted `[P48]`.

**Quirk.** "Inactive" means unused, not a status flag.

### Explosion Codes List

**Confidence: DOCUMENTED** for `Summary` (sample 2022); `Detail` inferred.

**Purpose.** Report of the organisation's explosion codes — shortcuts that add a predefined set of procedure codes to an
appointment or treatment plan `[P45]`.

**Printed title:** `Explosion Codes List (Summary)`.

**Output (Summary sample) `[P45·img]`.** Header: practice-group name, title.

| Column header | Content | Sample |
|---|---|---|
| `Exp. Code Short Descr` | Unique short code, no spaces | `CRNPFM` |
| `Exp. Code Descr` | Name the user sees | `Crown PFM` |
| `Default Same Tooth` | `Yes` / `No` | `Yes` |

One row per explosion code; the order is not alphabetical (creation order assumed `[I]`); no grouping or totals visible.

**Criteria `[L4]`.** `SUMMARY/DETAIL` `Summary` (default) / `Detail`.

**Detail `[I]`** (basis: `[P45]`; Dentrix Enterprise `Multi-Code List`): adds the member procedure codes of each explosion
code, in the stored treatment sequence.

**Notes.** Explosion codes are global to the account; they can be made available to all offices or assigned per office
`[P45]`. Legacy name `Explosion Code List` `[P44·img]`.

### Credit Codes Report

**Confidence: PARTIALLY DOCUMENTED.** Comparable: Dentrix Enterprise `Custom Practice Information Report` (payment types,
adjustment types).

**Purpose.** Complete list of the account's payment and adjustment types; run with `TYPE` = `ALL` and `CLASS` = `ALL`
`[P46]`.

**Underlying fields `[P46]`.**

| Field | Values |
|---|---|
| Code | Unique |
| `Description` | Free text |
| `Type` | `Payment` / `Adjustment` |
| `Sub Type` | Payments: `None`, `Cash`, `Check`, `Credit Card`, `Care Credit`, `Direct Deposit`. Adjustments: `Collection`, `Production` |
| `Sign` | `+` / `-`; forced `-` for payments |
| `Class` | Payments: `None`, `Insurance Payment`, `Capitation Payment`, `Insurance Prev. Bal`, `Collection Agency Payment (Transworld)`. Adjustments: `None`, `Write-Off`, `Finance Charge`, `Contract Down Payment`, `Balance Moved to Contract`, `Periodic Contract billing`, `Late Charge`, `Capitation Adjustment`, `Sales Tax`, `Insurance Adjustment`, `Move Patient (Debit)` / `(Credit)`, `Previous Balance (Debit)` / `(Credit)`, `Credit Card Refund (TransFirst)`, `Treatment plan discount`, `Collection Agency Adjustment (Transworld)` |

**Criteria `[L4]`.** `TYPE` (`ALL`); `CLASS` (`ALL`).

**Likely output `[I]`.** Code, description, type, sub type, sign, class; grouped by type.

**Who / when.** Accounting and managers mapping codes to the general ledger and checking that adjustment sub types
(production vs collection) are set correctly. It sits in the `PROCEDURE` group for historical reasons `[P43·img]`.

### Capitation Fee Schedule

**Confidence: PARTIALLY DOCUMENTED.** Comparable: Dentrix Enterprise `Fee Schedules Report`.

**Purpose.** Prints a managed-care fee schedule; the vendor's term covers capitation, dental HMO, HMO and Medicaid
schedules `[P43]`. Formerly `Reports (Old) > Insurance Reports > Capitation Fee Schedule` `[P44]`.

**Criteria `[L4]`.** `CAPITATION FEE SCHEDULE` dropdown (`ALL`); entries show the effective date as `ED` `[P44]`.

**Likely output `[I]`.** Per schedule: code, description and the managed-care amounts (patient co-pay, and the production
value where one is kept). Exact columns unknown.

### Office Holidays

**Confidence: INFERRED.** No comparable report found.

**Criteria `[L4]`.** `OFFICE/GROUP`; `DATE RANGE`.

**Underlying data `[P39]`.** `Office Setup > Holidays` tab, same structure as provider holidays (one-time or recurring,
`Office Closed` / `Office Open` with hours, description, copy from another office). Enterprise holidays set under
`Setup > Account > Account Info > Holidays` close every office and provider unless an exception is set.

**Likely output `[I]`.** Office, date or range, description, type, recurrence, hours. Whether enterprise holidays are
included is unknown.

### Default Ins Plan Coverage Category List

**Confidence: PARTIALLY DOCUMENTED.** Comparable: Dentrix Enterprise `Standard Coverage Tables Report`.

**Content.** The default coverage categories that seed the Coverage and Limitations section of every new plan. Six fields:
`Coverage Key` (up to 10 characters, usually two digits of the code category plus a letter), `Pct. Coverage`,
`Description`, `Frequency Limitation`, `Age Limitation` (through-age), `Waiting Period` `[P26]`. A plan document renders
them as `Category`, `Ded. Waived`, `%Coverage`, `Frequency Limitation`, `Age Limitation`, `Waiting Period (Months)`
`[P47·img]`.

**Criteria `[L4]`.** None. **Likely output `[I]`.** The six fields, one row per category.

**Quirk.** Changing the defaults affects only plans added afterwards; existing plans are not changed retroactively
`[P59]`.

### Notes Macro Category List

**Confidence: PARTIALLY DOCUMENTED.**

**Content.** Categories that organise notes macros; a category needs only a `Description`. The standard list follows the
ADA code categories plus a few extras `[P26][P50]`.

**Criteria `[L4]`.** None. **Likely output `[I]`.** Description (possibly with an internal ID).

### Patient Types List

**Confidence: PARTIALLY DOCUMENTED.** Comparable: Dentrix Enterprise `Custom Practice Information Report`.

**Content.** Patient types are optional markers used as report filters. Four fields: two-character `Type Code`,
`Description`, a Flash Alert switch and, when the alert is on, `Block Charges` `[P26][P25]`. Sample values on the patient
record: `CH - Child`, `CP - Collection Problem, See Notes`, `CQ - Queued For Collections`, `DE - Declined Visit`,
`EC - Corporate Employee & Family`, `EF - Employee & Family` `[P23·img]`.

**Criteria `[L4]`.** None. **Likely output `[I]`.** `Type Code`, `Description`, flash alert, block charges.

---

## 9. Legacy defects and design implications

| # | Legacy behaviour | Implication for the new module |
|---|---|---|
| 1 | One menu name hides up to 13 different reports (`REPORT BY`) and the criteria panel changes with the choice. | Model a list report as entity + grouping dimension + column set; store the mode in every saved view, schedule and favorite. |
| 2 | `Patient List` has no identifier column and sorts by first name. | Always include `patient_id` and the office; default sort last name, first name; let users choose columns. |
| 3 | `Group Rights List` prints every right of every group of every office with no filter (1,033 pages). | Offer a matrix (groups × rights) with search, plus filters by office, group and right, and a "who has right X" view. |
| 4 | Summary / Detail and `REPORT FORMAT` moved between reports across versions. | Do not copy the current screen blindly; decide summary and detail per report from its purpose. |
| 5 | `Inactive Plans List`, `Include Inactive Accounts` and `LAST VISIT DATE RANGE` (on a holiday report) are misnamed. | Name by meaning: unused plans, accounts with no active patient, holiday date range. |
| 6 | Sent-to-collection has no date; staff post a zero-fee ledger code as a marker. | Record `sent_to_collection_at`, agency and user; report on them. |
| 7 | Statement reports take one exact date. | Use a date range and show channel, delivery status and failure reason per statement. |
| 8 | E-mail error report gives no reason. | Keep the provider's bounce / block reason. |
| 9 | Setup lists are print-only dumps, most without filters or audit data. | Serve them as exportable grids from the setup screens; add created / modified / by to all (the legacy tool has it only on `Insurance Plan List`). |
| 10 | Rights follow seven obsolete screen families. | One permission per report or per report category, plus data-scope rules by office. |
| 11 | `Patients on Payment Plan` filters on setup date and defaults to today. | Default to open plans; make setup date an optional filter; add per-provider subtotals. |
| 12 | `Patient's Notes` mixes human notes and system events. | Keep them distinguishable (source, event type) so both a notes print and an activity log are possible. |

---

## 10. Gaps, risks and open questions

**Gaps.**

- No generated sample exists for 36 of the 40 current reports; none at all for the Provider and Office families.
- Non-default `REPORT BY` modes: criteria panels captured for only 2 of 13 (`Patient List - Grouped By`), 1 of 5
  (`Patient List - New Patient`), 2 of 6 (`Responsible Party List`), 1 of ≥ 4 (`Patients Seen`).
- `Patients Seen` `REPORT BY` values other than `Day` are inferred from legacy report names.
- No Excel output of any Lists report was seen.
- Two vendor articles are gone (`[P10]`, `[P36]`); the retired sample images are 4–15 years old.

**Risks.**

- Layouts marked `[I]` may differ from the real output in column order, grouping and totals; treat them as content
  checklists, not pixel specifications.
- The Security List screen is evidently still changing; our capture is one tenant on one date.
- `Provider Registration` could be something other than an identifier list.

**Open questions.**

1. What does `Provider Registration` print?
2. Does the 2026 `User List` still print the `Group Membership` column, and where did `REPORT FORMAT` go on `User List`
   and `Group Rights List`?
3. What distinguishes `Attached to Provider` from `Preferred Provider` in `Patient List - Grouped By`, and what is the
   `SPECIALTY` filter applied to?
4. How does `Created Date / First Visit Date` choose between the two dates?
5. Does `Fee Schedule List` print a catalogue of schedules or the fees of each schedule?
6. What is the `USER` relation on `Drug List`?
7. What does the `Ty` column (`P`) mean on `Patients on Ortho Payment Plan`, and what does the `Regular` variant print?
8. Why are `Email` and `Both` disabled on `Responsible Party - Statements Sent` — e-statement subscription, or office
   setting?

---

## 11. Sources

All pages read on 2026-11-22. Help Center articles were read through the public Help Center API; the human-readable URL
is given. Image ids are attachment ids (`https://support.planetdds.com/hc/article_attachments/<id>`); "retired" means the
image is attached to the article but no longer shown in its body.

### Planet DDS (vendor)

- `[P1]` Is there a report which will help our office know the number of patient records? — https://support.planetdds.com/hc/en-us/articles/115002082912-Is-there-a-report-which-will-help-our-office-know-the-number-of-patient-records — img `17104048841115` (menu, 2023), `17104120545051` (Patient List criteria, 2023), `10528010314523` (Grouped By dropdown, 2022); retired `115002800352` (old Reports menu, 2013), `115002781451` (old Patient List screen, 24 reports, 2013)
- `[P2]` Report with patients' name, address, phone and email — https://support.planetdds.com/hc/en-us/articles/115002067151 — img `17104515570843` (criteria, 2023); retired `115002782691` (sample `Patient List - Detail`, printed 2/14/2014), `115002801432` (old criteria of `Patient List - Detail`, 2014)
- `[P3]` How can I generate a list of new patients? — https://support.planetdds.com/hc/en-us/articles/115002070631-How-can-I-generate-a-list-of-new-patients — img `17372101949339` (criteria, 2023); retired `8550037642523` (`REPORT BY` dropdown, 2022), `115002790991` (Reports menu, 2007)
- `[P4]` Patients not seen for a defined period — https://support.planetdds.com/hc/en-us/articles/115002067011 — img `16059630540699` (Last Visit mode, 2023); retired `5042474795547` (Last Visit mode, 2022), `115002801352` (old `Patients by Lastvisit` criteria, 2014)
- `[P5]` Patients with / without a HIPAA agreement on file — https://support.planetdds.com/hc/en-us/articles/115002088172 — img `16714485206555` (`REPORT BY` dropdown, 2023)
- `[P6]` Labels for patients assigned to an insurance plan — https://support.planetdds.com/hc/en-us/articles/115002084872
- `[P7]` Which patients are on a specific fee schedule — https://support.planetdds.com/hc/en-us/articles/115002070731-How-can-I-tell-which-of-my-patients-are-on-a-specific-fee-schedule — retired `360055315271` (old Patient List screen, 27 reports, 2020), `360055315291` (old Reports menu, 2020)
- `[P8]` To which insurance plans are my patients assigned — https://support.planetdds.com/hc/en-us/articles/115002089432-How-can-I-know-to-which-insurance-plans-my-patients-are-assigned — retired `13563550028699` (Grouped By dropdown, 2023)
- `[P9]` Which insurance plans, carriers and employers are entered — https://support.planetdds.com/hc/en-us/articles/115002089452-How-can-I-understand-which-insurance-plans-insurance-carriers-and-employers-are-entered
- `[P10]` **(S)** Report of patients associated to a plan, carrier or employer (article no longer retrievable) — https://support.planetdds.com/hc/en-us/articles/115002067751
- `[P11]` Printing Historical Patient Notes in Denticon — https://support.planetdds.com/hc/en-us/articles/115002093812-Printing-Historical-Patient-Notes-in-Denticon — retired `115002821972` (sample `Patient Notes`, 2011), `360054838911` (old `Patient's Notes` criteria, 2020)
- `[P12]` How do I write notes on the patient's record? — https://support.planetdds.com/hc/en-us/articles/115002093492
- `[P13]` How do I obtain a list of patients on a payment plan? — https://support.planetdds.com/hc/en-us/articles/4403098488333-How-do-I-obtain-a-list-of-patients-on-a-payment-plan — img `4403098416269` (sample `Patients on Ortho Payment Plan`, 2021)
- `[P14]` Ortho Payment Plan / Treatment Card report options — https://support.planetdds.com/hc/en-us/articles/360045117932
- `[P15]` Online registered patients report: the `Active` field — https://support.planetdds.com/hc/en-us/articles/30161114869787
- `[P16]` Report of patients that completed Online Registration forms — https://support.planetdds.com/hc/en-us/articles/4403477741069 — retired `4403482934285` (`Patient List Reports` screen with six reports, 2021)
- `[P17]` Reports Matrix / `Denticon Reporting 101` (PDF, 9 pages) — https://support.planetdds.com/hc/en-us/articles/4415425089563-Reports-Matrix — attachment `26183111395355`; same document listed at https://www.planetdds.com/wp-content/uploads/2022/11/Reporting-Matrix.pdf (not fetched)
- `[P18]` Converted practice: placeholder insurance plan — https://support.planetdds.com/hc/en-us/articles/360012350992
- `[P19]` How can we generate a list of Responsible Parties in our account? — https://support.planetdds.com/hc/en-us/articles/360040919612-How-can-we-generate-a-list-of-Responsible-Parties-in-our-account — retired `5449647974811` (Responsible Party List criteria, 2022), `4414010984219` (old screen with 11 reports, aged mode, 2021), `360052734132` (old screen, 2020)
- `[P20]` Accounts whose "Send Statement" is not indicated — https://support.planetdds.com/hc/en-us/articles/115002066891 — img `16818003986715` (Send Statement Status mode, 2023); retired `115002801132` (old criteria, 2014)
- `[P21]` Which accounts had a statement generated — https://support.planetdds.com/hc/en-us/articles/115002083272 — retired `360054463231` (old Statements Sent criteria, 2020), `115002801112` (Statements screen, 2014)
- `[P22]` E-Statements: how the feature works — https://support.planetdds.com/hc/en-us/articles/360038576552-Our-office-is-subscribed-to-E-Statements-How-does-this-feature-work — img `21567837864219` (Statement Setup dialog with report buttons, 2023); retired `360047497532` (2019)
- `[P23]` Turning an account over to a collection agency — https://support.planetdds.com/hc/en-us/articles/115002081372 — img `15431005737371` (Edit Patient screen, 2023)
- `[P24]` Setting up collection agencies — https://support.planetdds.com/hc/en-us/articles/115002078871
- `[P25]` Patient Types and Responsible Party Types — https://support.planetdds.com/hc/en-us/articles/115002087932 , /115002087792 , /115002087812
- `[P26]` Denticon Setup Guide - Misc. Setups — https://support.planetdds.com/hc/en-us/articles/37670054739483-Denticon-Setup-Guide-Misc-Setups
- `[P27]` New Patient (as defined for reports) — https://support.planetdds.com/hc/en-us/articles/115002065911-New-Patient-as-defined-for-reports
- `[P28]` Reports recommended at the end of each day — https://support.planetdds.com/hc/en-us/articles/115002085792
- `[P29]` How to understand the new reports menu — https://support.planetdds.com/hc/en-us/articles/4408457645723-How-to-understand-the-new-reports-menu
- `[P30]` Reports-related security rights — https://support.planetdds.com/hc/en-us/articles/115002075251
- `[P31]` How are we able to understand the security rights in a security group? — https://support.planetdds.com/hc/en-us/articles/115002069431-How-are-we-able-to-understand-the-security-rights-in-a-security-group — img `115002788091` (sample `Security - Group Rights List`, printed 4/25/2016), `18470120011163` (Group Rights List criteria, 2023); retired `115002788071` (old Security Reports screen, 2016), `360038381111` (2019)
- `[P32]` I need a security right assigned to my user — https://support.planetdds.com/hc/en-us/articles/30999043081883
- `[P33]` Denticon Two-Stage Login (User List - Summary Report) — https://support.planetdds.com/hc/en-us/articles/39633537207195-Denticon-Two-Stage-Login-What-Changed-and-How-to-Log-In — img `39633537203611` (User List criteria with `REPORT FORMAT`); earlier notice https://support.planetdds.com/hc/en-us/articles/19113449995291
- `[P34]` Users not seeing the "Refer To" button (uses User List and Group Rights List) — https://support.planetdds.com/hc/en-us/articles/360061221711
- `[P35]` Denticon Setup Guide - Users & Security Groups / Security Groups — https://support.planetdds.com/hc/en-us/articles/37670002469659 , https://support.planetdds.com/hc/en-us/articles/37669993401371
- `[P36]` **(S)** How are we able to know the security rights within a security group membership (article no longer retrievable) — https://support.planetdds.com/hc/en-us/articles/115002085732
- `[P37]` How can we quickly find reports in Denticon? — https://support.planetdds.com/hc/en-us/articles/360020701671 — img `17157012310683` (Security List Reports screen with three reports, 2023)
- `[P38]` Denticon Setup Guide - Provider Setup (New Provider / Edit Provider) — https://support.planetdds.com/hc/en-us/articles/37669952439067 , https://support.planetdds.com/hc/en-us/articles/37669939193755
- `[P39]` Holidays and office setup — https://support.planetdds.com/hc/en-us/articles/115002087992 (provider exceptions), /115002071771 (office holidays), /360028264332 (enterprise holidays), /37669915467419 (Setup Guide - Office Setup)
- `[P40]` Provider identifiers — https://support.planetdds.com/hc/en-us/articles/115002067451 (carrier / legacy IDs), /115002072651 (multi-state licences)
- `[P41]` How can I print a list of all the procedure codes in our office? — https://support.planetdds.com/hc/en-us/articles/30749912740507
- `[P42]` Denticon Setup Guide - Procedure Code Setup — https://support.planetdds.com/hc/en-us/articles/37669956816667
- `[P43]` Printing fee schedules — https://support.planetdds.com/hc/en-us/articles/115002068171-How-may-we-print-our-fee-schedules , /115002067111 (PPO), /115002071391 (capitation) — retired `115002803872` (old `Procedure / Fee Schedules List` screen, 2014)
- `[P44]` Fee schedule effective dates — https://support.planetdds.com/hc/en-us/articles/360054029692 , https://support.planetdds.com/hc/en-us/articles/360051120732 — retired `360080059251` (old screen with `[ED: …]` and five reports, 2020)
- `[P45]` Explosion codes — https://support.planetdds.com/hc/en-us/articles/115002068951-How-are-we-able-to-generate-a-report-of-our-explosion-codes (retired `8167644858395`: sample `Explosion Codes List (Summary)`, 2022), https://support.planetdds.com/hc/en-us/articles/115002065831 (setup)
- `[P46]` Payment and adjustment types — https://support.planetdds.com/hc/en-us/articles/4402555545101 (Credit Codes Report), https://support.planetdds.com/hc/en-us/articles/115002071531 (type fields)
- `[P47]` Printing an insurance plan — https://support.planetdds.com/hc/en-us/articles/360036070711 — img `360042636592` (sample `Insurance Plan Details`, 2019)
- `[P48]` Duplicate plans and carriers — https://support.planetdds.com/hc/en-us/articles/115002073251 , https://support.planetdds.com/hc/en-us/articles/115002089912
- `[P49]` Prescriptions — https://support.planetdds.com/hc/en-us/articles/29672330231835 (img `29672273835931`: old `Prescription/Drug List` screen, 2024), https://support.planetdds.com/hc/en-us/articles/360036061411 (img `360042585312`: sample `Prescription Detail`, 2019), https://support.planetdds.com/hc/en-us/articles/37670031723803 (Setup Guide - Prescriptions)
- `[P50]` Denticon Setup Guide - Notes Macros and Pick Lists — https://support.planetdds.com/hc/en-us/articles/37670026912667
- `[P51]` Document types — https://support.planetdds.com/hc/en-us/articles/360020428852
- `[P52]` How are office groups defined and used? — https://support.planetdds.com/hc/en-us/articles/115002067711
- `[P53]` Report of appointments scheduled in a month (states what `Patients Seen` ignores) — https://support.planetdds.com/hc/en-us/articles/36706153887131
- `[P55]` Patient list of all orthodontic patients — https://support.planetdds.com/hc/en-us/articles/49570834274843
- `[P56]` Closing a single office (lists the security-list report right) — https://support.planetdds.com/hc/en-us/articles/40219815489179
- `[P57]` **(S)** Troubleshooting Data Discrepancies in Denticon Practice Analytics (holiday hierarchy) — https://support.planetdds.com/hc/en-us/articles/49834771623067
- `[P58]` Security groups of a newly added office — https://support.planetdds.com/hc/en-us/articles/115002073231
- `[P59]` Updated default insurance categories do not change existing plans — https://support.planetdds.com/hc/en-us/articles/30024552682779
- `[P61]` List of all Responsible Parties who owe money (Aging reports) — https://support.planetdds.com/hc/en-us/articles/115002070511
- `[P62]` Users assigned to multiple security groups — https://support.planetdds.com/hc/en-us/articles/37657163933083
- `[P63]` **(S)** Known issue KI 524545, statement received but not recorded (title only) — https://support.planetdds.com/hc/en-us/articles/32928253583771

### Comparable systems

- `[C1]` Dentrix Enterprise 11.0 Reports Reference (Assigned Rights Report p. 30; Audit Rights Reports pp. 46–53; Birthday List p. 56; Collections Manager List p. 80; Custom Practice Information Report p. 92; Employers and Employed Patients Report p. 126; Fee Schedules Report p. 132; Insurance Carrier List p. 142; Multi-Code List p. 192; New Patient List p. 194; Patient List p. 214; Patient Notes Report p. 218; Payment Agreement Report p. 234; Practice Organization List p. 254; Procedure Code List p. 266; Provider IDs List p. 282; Standard Coverage Tables Report p. 320) — https://www.ihs.gov/doh/edr/documents/Dentrix_Enterprise_11.0_Reports_Reference.pdf
- `[C2]` Open Dental manual — https://opendental.com/manual/reportsstandard.html (report list; `Patient Notes Report` by name only), https://opendental.com/manual/reportactivepatient.html , https://opendental.com/manual/reportsnewpatient.html , https://opendental.com/manual/reportinsuranceplan.html , https://opendental.com/manual/reportprocedurecodes.html
- `[C3]` SoftDent online help — https://help.carestreamdental.com/rh/web/server/SoftDent/projects_responsive/OH_DE1010/AlpPrvLst.htm (Alphabetical Provider List Report), https://help.carestreamdental.com/rh/web/server/SoftDent/projects_responsive/OH_DE1010/RnPESRpt.htm , https://help.carestreamdental.com/rh/web/server/SoftDent/projects_responsive/OH_DE1010/RpMnuCmd.htm
- `[C4]` Planet DDS Cloud 9 (sibling product) report summary table — https://support.planetdds.com/hc/en-us/articles/40354382813851-Summary

### Checked without usable content

- Third-party Denticon report guide (no Lists reports) — https://www.jarvisuniversity.com/insights/denticon-and-jarvis-a-report-guide/
- DSO training page (login required) — https://sites.google.com/godental365.com/pcdmuniversity/PCDM-Introduction/denticon-reporting

### Our transcriptions

- `[L1]` `docs/reports/module-plan/legacy/patients_list_reports.json`
- `[L2]` `docs/reports/module-plan/legacy/providers_list_reports.json`
- `[L3]` `docs/reports/module-plan/legacy/security_list_reports.json`
- `[L4]` `docs/reports/module-plan/legacy/setup_list_reports.json`
