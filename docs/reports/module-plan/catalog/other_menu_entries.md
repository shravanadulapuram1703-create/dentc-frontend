# Legacy Reports-menu entries without screenshots

Thirteen of the 26 entries of the legacy `Reports` menu (Denticon by Planet DDS) have no screenshot in the planning
material: `Interactive Reports`, `Office Reports`, `Letters`, `Postcards`, `Labels`, `Custom Letter`,
`Advanced Custom Letter`, `Custom Postcard`, `Blank Insurance Forms`, `Pat Reg/Medical Info Forms`, `My Favorites`,
`Search Report`, `Reports (Old)`. Per entry this document records: what the legacy tool does (public vendor
documentation), where it lands in the module (the decisions of `00_design_brief.md` §1 and PD-15, unchanged, made
concrete), what our application has today (read in code), a parity checklist, what must still be captured on the live
legacy tool, and the work that no other plan document owns.

Researched 2026-11-22; verified and corrected the same day. Hub routes are those of `07_ux_blueprint.md` §1.6 and §2.1
(worklists `/reports/worklists/<full report_key>`, custom reports `/reports/c/custom`, the eight correspondence and
form entries as anchors of `/reports/correspondence` listed in `externalLinks.ts`, favorites
`/reports/library/favorites`, search `/reports?q=`); the legacy-path redirects are those of 07 §2.2. Anchor names below
(`#letters`, `#custom_letter`, …) are 07's. Screen routes of the owning features (`/correspondence/*`, `/setup/correspondence/*`,
`/forms/*`) are NEW proposals for those features; 07 links to them once they exist ("Not available yet" until then).
Worklist keys are those of `06_dashboards.md` §6. Report keys marked (provisional) are not yet fixed by
`catalog/<category>.md`.

| Tag | Meaning |
|---|---|
| `[D]` | DOCUMENTED: stated in the text of a vendor help-centre article (a source tag follows) |
| `[D·img YYYY]` | DOCUMENTED: read by us from a screenshot attached to a vendor article; YYYY = year of the capture. Labels are transcribed exactly |
| `[S]` | Seen only as a search-result summary (the page needs a login). Lower confidence |
| `[R]` | Earlier research of this plan (`research/*.md`, `analysis/reference_screenshots.md`) |
| `[I]` | INFERRED by us. Never a legacy fact |
| `[V]` | Verified by reading our code; the file is named. `FE:` = `dentc-frontend/`, `BE:` = `dentc-backend/` (read-only) |
| `[A]` | Stated by an analysis document of this plan; not re-read in code for this document |
| `[conflict]` | Vendor sources disagree with each other or with a well-known fact; both readings are given |

Method. Help-centre pages refuse page fetches; article text was read through the public article API and images as
article attachments, including retired ones. `HC <id>` = `https://support.planetdds.com/hc/en-us/articles/<id>`,
`img <id>` = `https://support.planetdds.com/hc/article_attachments/<id>`. Article dates are the last edit; captures are
dated by their footer year. Release notes are login-gated (search summaries only). Vendor text is paraphrased; labels,
option names and report names are exact. Demo data and user names visible in vendor captures are not reproduced; folder
names under Office Reports are legacy labels belonging to other customers of the vendor. Five of the thirteen entries
(Letters, Postcards, Labels, Blank Insurance Forms, Pat Reg/Medical Info Forms) run on the same legacy shell as the
report categories (`NewReports.aspx?RptName=<entry>`: `SELECT REPORT`, `REPORT CRITERIA`, `CLEAR CRITERIA`,
`PRINT / PREVIEW`, `ADD TO MY FAVORITES`) `[D·img 2023-2025]`, which is why they sit in the Reports menu and why each
can be saved to My Favorites. The 26 menu entries and their order are confirmed by vendor captures `[G3]` and by our own
screenshot `[R3]`.

| Tag | Source used by several entries | Date |
|---|---|---|
| `[G1]` | Reports-related security rights (rights catalogue of the older menu), HC 115002075251 | edited 2025-08-03 |
| `[G2]` | PDF "Denticon Reporting 101", attached to "Reports Matrix", HC 4415425089563 | file 2024-11-24 |
| `[G3]` | Captures of the open Reports menu: 26 entries, same order as `analysis/reference_screenshots.md` §1.2; img 17109391061019, img 19615497151131, img 21579164500379 (in HC 115002078231) | 2023 |
| `[G4]` | "How to understand the new reports menu", HC 4408457645723 | created 2021-10-16, edited 2022-11-15 |
| `[G7]` | Our own frontend nav before commit `f7332be` (2026-07-05): the legacy Reports menu as once transcribed into `src/components/GlobalNav.tsx` (`git show f7332be^:src/components/GlobalNav.tsx` L583-745). Who transcribed it and from which legacy account is not recorded | — |
| `[G5]` | End-of-day recommendations, HC 115002085792 | edited 2023-07-20 |
| `[G6]` | End-of-month and end-of-year recommendations, HC 115002068151, HC 115002069791 | edited 2023 |
| `[R1]` | `research/denticon_analytics_and_dso.md` §2-§5, §10 | — |
| `[R2]` | `research/legacy_report_outputs_*.md` (old report names, viewer, favorites button) | — |
| `[R3]` | `analysis/reference_screenshots.md` §1 (menu transcription) | — |

## Overview

| Legacy entry | What it is | Evidence | Lands in our module as | Exists in our application today | Phase | Capture needed |
|---|---|---|---|---|---|---|
| Interactive Reports ▶ | Two on-screen work queues with inline actions: `Unsigned Progress Notes`, `Eligibility Verification` | DOCUMENTED (fly-out and one screen seen; second screen PARTLY) | Worklists `worklists.eligibility_verification`, `worklists.unsigned_progress_notes` (06 §6), next to 13 new worklists; `/reports/worklists` (07 §1.6 row 13) | partly - two placeholder routes `FE:src/App.tsx` L291-292; single-record sign and verify endpoints exist | P3 | yes |
| Office Reports ▶ | Per-customer folders of bespoke reports built by the vendor | PARTLY (structure, rights, 7 reports of 4 folders; 24 folder labels once copied into our nav `[G7]`; the tenant's own folder unknown) | Tenant custom reports `custom.<slug>` (06 §9, 02 §11), `/reports/c/custom` (07 §1.6 row 14); a report equal to a standard report becomes its alias | no - four placeholder routes of other customers `FE:src/App.tsx` L295-298 | P5 (aliases: phase of the standard report) | yes |
| Letters | Batch mail-merge of one letter for many patients or responsible parties; 7 letter groups | DOCUMENTED (screen, 7 groups, criteria of 1 group in full and 1 in part); PARTLY (5 groups) | Correspondence feature: batch letters launcher; hub `/reports/correspondence#letters` (07); bulk action `letters` on report and worklist results | partly - single patient only `FE:src/features/letters/**`; batch merge endpoint without PDF or screen `BE:app/api/v1/letters.py` | link P0; launcher P3 | yes |
| Postcards | Batch postcards, four per sheet; 4 types | DOCUMENTED (4 types, criteria of 1); PARTLY (3 types) | Correspondence feature: postcards launcher; hub `/reports/correspondence#postcards`; bulk action `postcards` | partly - template CRUD only `BE:app/api/v1/registry.py` L1377-1379; no render, no screen | link P0; launcher P3 | yes |
| Labels | Batch address labels on sheet stock; 12 label types | DOCUMENTED (12 types, criteria of 1); PARTLY (11 types) | Correspondence feature: labels launcher; hub `/reports/correspondence#labels`; bulk action `labels` | no - only the user preference `print_labels` `FE:src/components/modals/AddEditUserModal.tsx` L775 | link P0; launcher P3 | yes |
| Custom Letter | Authoring of letter, consent and disclosure templates | DOCUMENTED | Setup › Correspondence › Letter templates (correspondence feature); hub `/reports/correspondence#custom_letter` | partly - CRUD API and merge-field catalog, no editor `BE:app/api/v1/registry.py` L1374-1376, `BE:app/services/letter_service.py` L67 | link P0; screen P2 | yes |
| Advanced Custom Letter | Block-layout letter editor with embedded images (referral forms) | PARTLY | Same template screen, editor mode `blocks` NEW; hub `/reports/correspondence#advanced_custom_letter` | no | link P0; editor P4 | yes |
| Custom Postcard | Authoring of postcard templates | DOCUMENTED | Setup › Correspondence › Postcard templates; hub `/reports/correspondence#custom_postcard` | partly - CRUD API only `BE:app/db/models/comms.py` L186 | link P0; screen P2 | yes |
| Blank Insurance Forms | Blank or patient-prefilled claim forms; 6 form versions | DOCUMENTED (2023 screen) | Claims feature: blank forms page; hub `/reports/correspondence#blank_insurance_forms` | partly - ADA 2024 form per claim only `FE:src/features/claims/ada/adaClaimFormPdf.ts`, `BE:app/api/v1/claim_forms.py` | link P0; page P2 | yes |
| Pat Reg/Medical Info Forms | Blank patient registration form and medical / dental questionnaires; 3 forms | DOCUMENTED (3 forms, criteria of 1, one printed sample) | Patient registration and medical-history features: forms page; hub `/reports/correspondence#registration_forms` | partly - filled medical-history PDF endpoint without caller `BE:app/api/v1/medical_history.py` L328 | link P0; forms P3 | yes |
| My Favorites | Per-user list of saved report criteria | DOCUMENTED | Library › Favorites `/reports/library/favorites` (07 §1.6 row 24, §6.4); storage 02 §8 | no - browser-local views only `FE:src/components/reports/lib/savedViews.ts` | P1 | yes (three behaviours) |
| Search Report | Keyword search over report names and descriptions | DOCUMENTED (matching rules INFERRED) | Hub search and command palette `/reports?q=` (07 §1.5); data 02 §13 row 1 | partly - title / description / category match over 6 reports `FE:src/components/reports/components/ReportCatalog.tsx` | P0 | yes (matching rules) |
| Reports (Old) ▶ | The previous menu tree, kept reachable | DOCUMENTED (first level); PARTLY (deeper levels) | Not replicated (brief §1). Old names are aliases; functions that exist only there are decided one by one | no (by decision) | none (aliases: phase of the successor) | yes |

## Interactive Reports

### What it is in the legacy tool

On-screen work queues whose rows are acted on in place; nothing is printed. Users: front office and insurance
coordinators (eligibility), providers and office managers (unsigned notes). Reached through `Reports > Interactive
Reports ▶`. In a late-2023 capture the fly-out holds exactly two children, in this order: `Unsigned Progress Notes`,
`Eligibility Verification` `[D·img 2023]` `[IR1]`. The vendor's report matrix excludes interactive reports `[G2]`. No
security right for the entry exists in the rights catalogue `[G1]` or in the legacy rights list scraped into
`BE:data/Groups.txt` `[V]`.

| Item | Population | Screen | Row actions | Source |
|---|---|---|---|---|
| `Eligibility Verification` (own window, title `ELIGIBILITY UPDATE`) | Patients with an appointment on the chosen date whose eligibility is not verified. The date defaults to today; a future date can be set | Header filters `Appointment Provider` (`ALL`), `Appointment Date`, `Eligibility Status` (`ALL`), button `POPULATE`. Columns `Name`, `Appt Provider`, `Appt Time` (all three sortable), `Primary Insurance`, `Secondary Insurance` (each with a filter icon; the carrier filter lists only carriers present in the result). Insurance cell: `Carrier Name`, `Subscriber Name`, `Subscriber Birthdate`, `Subscriber ID`, `Eligibility Status`, `Last Check` (date, time, `by` user or automatic process) | i icon: quick patient overview. Globe: carrier website (URL from carrier setup). `View Cov Details`: popup `PATIENT PRIMARY INSURANCE INFO` with tabs `PATIENT INS INFO`, `PLAN`, `BEN`, `COVERAGE AND LIMITATIONS`. Note icon: latest eligibility note. Eye icon at `Last Check`: last response (`Eligibility Report`: checked by, last check, payer, subscriber, error). `CHECK ELIGIBILITY`: real-time check. `UPDATE STATUS`: dialog `UPDATE ELIGIBILITY STATUS` with `Eligible`, `Not Eligible`, `Unknown`. An update-coverage button appears when the coverage is expired or ineligible. E-mail / SMS icons under the name: two-way communication asking the patient to update coverage through online registration | `[D]` `[D·img 2023]` `[IR1]` |
| `Unsigned Progress Notes` | Notes of patients who have an appointment today only (a note can be edited only on the day it was entered); keyed to the patient's preferred provider, who must be assigned to the office the list is run in | Layout not found: no image is published | Edit the note from the list. `REVIEW & SIGN` opens the page `Progress Note Summary: Review Note`; sign with `Draw`, `Type` or `Load Signature` (signature pad; "sign as a different user" with that user's credentials); `SAVE`; the row leaves the queue. `Draw` and `Type` need the site feature `ESIGNPROGRESSNOTES`; a 2026 release aligned the stored-signature button of this screen with the note screen | `[D]` `[IR2]` `[IR3]`; `[S]` `[IR5]` |

Related, outside the Reports menu and not one of the 13 entries: `Utilities > AutoEligibility Verification` (2026) lists
appointments by date with `Review Eligibility`, a status filter and a `Review/Update` comparison of stored against payer
data `[D]` `[IR4]`. The printable counterpart of the notes queue is `Reports > Daily Reports > Progress Notes` with the
Unsigned option; the two list different patients by design `[D]` `[IR2]`.

Our own pre-`f7332be` nav listed the same two children in the same order `[G7]`. A search of the vendor help centre for
`Interactive Reports>` paths returned only these two children (re-checked 2026-11-22).

Not found: the Unsigned Progress Notes screen (columns, filters, sort); the option list of the `Eligibility Status`
filter; whether the fly-out holds more than two items today.

| Tag | Source | Date |
|---|---|---|
| `[IR1]` | "Interactive Report- Eligibility Verification", HC 20825080284443; img 20825065792539 (fly-out), 20825036886683 (screen), 20825036916251 (status dialog), 20825036910235 (response hover), 20825065811099 (coverage popup) | created 2023-11-30, edited 2024-01-04 |
| `[IR2]` | "Why are different patients listed on the Interactive Unsigned Progress Notes report …", HC 30330672283163 | 2024-10-24 |
| `[IR3]` | "E-sign of Prog Notes on Unsigned Prog Note Report", HC 51881116218779 | 2026-06-18 |
| `[IR4]` | "AutoEligibility — How Do I Use the AutoEligibility Feature?", HC 53601234391451 | 2026-10-08 |
| `[IR5]` | Release note "Denticon - Release Date - 04-09-2026", HC 52504083205659 (summary only) | 2026-04-09 |

### Where it lands in our module

| Legacy item | Lands as | Key | Route (07 §1.6, §2.1 row 9, §2.2) | Owner |
|---|---|---|---|---|
| `Interactive Reports ▶` | Hub section Worklists; the nav entry `Interactive Reports ▸` keeps its legacy label and lists up to ten worklists + "All worklists" (07 §3.1) | category `worklists` | `/reports/worklists` | `06_dashboards.md` §6; engine `02_architecture.md` §3.10 and §4.6 (`paging_mode = live`); rights `08_security_compliance.md` §2.3 (family of the counterpart) |
| `Eligibility Verification` | Worklist | `worklists.eligibility_verification` (06 §6.3) | `/reports/worklists/worklists.eligibility_verification`; the placeholder path `/reports/interactive/eligibility-verification` redirects (to `/reports/worklists` until P3) | 06 work items DASH-32, DASH-36 |
| `Unsigned Progress Notes` | Worklist | `worklists.unsigned_progress_notes` (06 §6.4) | `/reports/worklists/worklists.unsigned_progress_notes`; the placeholder path `/reports/interactive/unsigned-progress-notes` redirects | DASH-32, DASH-36 |

Phase P3. The 13 further worklists of 06 §6 are additions beyond the legacy tool.

### What exists today

| Piece | State | Evidence |
|---|---|---|
| Menu entry and screens | Two orphan placeholder routes ("Coming Soon"), no nav entry | `[V]` `FE:src/App.tsx` L291-292, `FE:src/components/PlaceholderPage.tsx` |
| Eligibility status update for one subscriber | Endpoint `POST /api/v1/insurance-subscribers/{subscriber_id}/verify-eligibility` exists; the generated `verifySubscriberEligibility` has no caller; the patient insurance screen edits `elig_status` as free text | `[V]` `BE:app/api/v1/insurance.py` L101; `FE:src/features/patient-insurance/EligibilitySection.tsx` L45, `InsurancePlanScreen.tsx` L183 |
| Eligibility counts | `GET /api/v1/reports/insurance-verification-summary` (counts subscribers by free-text status), no frontend caller | `[V]` `BE:app/api/v1/reports.py` L85 |
| Real-time eligibility | None: the verification is a manual stamp; the carrier only carries a flag `supports_realtime_eligibility` | `[V]` `BE:app/services/insurance_service.py` L5-7, L84 |
| Signing one note | `POST /api/v1/progress-notes/{note_id}/sign`, used per patient | `[V]` `BE:app/api/v1/progress_notes.py` L49; `FE:src/features/progress-notes/progressNotesService.ts` L72 |
| Signature capture | Pad and on-screen drawing (`CaptureMode = "topaz"` or `"screen"`); no typed signature, no stored signature | `[V]` `FE:src/features/signature/SignatureCapture.tsx` L44 |
| Office-wide queue of unsigned notes or unverified appointments | None | `[V]` no route in `FE:src/App.tsx` |

Gap: both worklists in full (06 §6.3, §6.4).

### Parity checklist

| Legacy item, filter or option | How the new module covers it | Status |
|---|---|---|
| Fly-out `Interactive Reports ▶` | Hub section Worklists | covered by 06 §6 |
| Eligibility: population (appointment on the date, not verified) | Rows of 06 §6.3 | covered |
| `Appointment Date` (default today, future allowed) | `date_range` on `appointment_date`, default `today`, presets up to 7 days | covered |
| `Appointment Provider` | `provider_ids` | covered |
| `Eligibility Status` filter | Verification-state filter (`unknown`, `not_eligible`, expired) | covered; legacy option list to be confirmed after capture |
| `POPULATE` | Run of the live list | covered |
| Sort on `Name`, `Appt Provider`, `Appt Time` | Sort options of the worklist (02 §4.6) | request to 06: declare patient name, provider, appointment time |
| `Primary Insurance` and `Secondary Insurance` side by side | One row per appointment and coverage slot, `coverage_orders` (default primary) | covered, different layout |
| Carrier filter limited to carriers in the result | `carrier_ids` with result-limited options | covered |
| Cell fields `Carrier Name`, `Subscriber Name`, `Subscriber ID`, `Eligibility Status`, `Last Check` | Columns of 06 §6.3 (member id masked until revealed) | covered |
| Cell field `Subscriber Birthdate` | Not in the column list of 06 §6.3 | request to 06 |
| i icon (quick patient overview) | "Open record"; no hover summary specified | request to 06 |
| Globe (carrier website) | "Open carrier website" | covered; needs a URL on the carrier record |
| `View Cov Details` popup, 4 tabs | "View coverage" opens the patient insurance screen | covered |
| Note icon (latest eligibility note) | Column "latest eligibility note" | covered |
| Eye icon (last eligibility response) | None | not replicated - no real-time eligibility integration exists (06 §6.3) |
| `CHECK ELIGIBILITY` | Hidden action "Run a real-time check" | not replicated until an integration exists |
| `UPDATE STATUS` with `Eligible`, `Not Eligible`, `Unknown` | "Update status" through the existing endpoint | covered; request to 06 and 03: the three legacy values are members of the status vocabulary |
| Update-coverage button (expired or ineligible) | "View coverage" | covered |
| E-mail / SMS icons | "Request updated insurance" (text or e-mail template) | covered |
| Unsigned notes: today's appointments only | Default note date today; presets "last 7 days", "all unsigned" | covered |
| Unsigned notes: keyed to the patient's preferred provider, one office | Keyed to the note's author or provider with `office_scope`; provider restriction `self_unless_privileged` | covered differently - the signer is the author, not the preferred provider; request to 06 to state the difference |
| Edit the note from the list | "Open note" (server lock rule) | covered |
| `REVIEW & SIGN`, review page, `SAVE` | "Review and sign" | covered |
| Signing method `Draw`, `Load Signature` (pad) | `SignatureCapture` screen and pad modes | covered |
| Signing method `Type` (typed name, five script fonts) | 06 §6.4 already names "pad, draw or type"; `SignatureCapture` has no typed mode today (`CaptureMode = "topaz" \| "screen"`) | covered by 06; gap in the signature feature (request) |
| Stored signature applied in one click (`Apply Signature`) | None | to be specified - request to 06 and the signature feature |
| Sign as a different user | Signing as another provider with that provider's credentials (06 §6.4) | covered |
| Row leaves the queue when signed | Exit rule of 06 §6.4 | covered |
| Site feature `ESIGNPROGRESSNOTES` | None | not replicated - no per-site switch is planned |
| Columns, filters and sort of the Unsigned Progress Notes screen | Columns of 06 §6.4 | to be specified after capture |

### To capture from the live legacy tool

1. `Reports > Interactive Reports ▶`: the open fly-out (every child).
2. `Unsigned Progress Notes`: the list with at least one row (columns, filters, sort, buttons), the `REVIEW & SIGN` page with each signing tab, the list after signing.
3. `Eligibility Verification`: the open `Appointment Provider` and `Eligibility Status` dropdowns, a row with secondary insurance, the carrier filter open, the quick patient overview, each tab of `View Cov Details`, the update-coverage button on an expired plan.
4. Every other child of the fly-out, if any: full screen and each dialog.

### Work

Owned by `06_dashboards.md`: DASH-28 to DASH-36 (DASH-32 the two legacy worklists, DASH-36 the placeholder routes). The
"request to 06" rows above are input for DASH-32. This document adds only the capture (RPT-MENU-01).

## Office Reports

### What it is in the legacy tool

A fly-out of per-customer folders. Each folder holds reports the vendor built for one customer organisation; a customer
sees its own folder. Path form: `Reports > Office Reports ▶ > <Customer> Reports > <Report>` `[D]` `[G5]` `[G2]`. Each
folder has its own pair of rights, `Reports - Office Reports - <set> Screen Full Control` / `View Only`, described as
specialised reports for one client; one further set sits at the top level (`Reports - DHA Reports Screen`) `[D]` `[G1]`.
A report can be Excel-only (name suffix `(Excel)`) `[D]` `[G2]`. Office reports are indexed by `Search Report` with the
breadcrumb `Reports->Office Reports-><Folder>-><Report>` `[D·img 2022]` `[OR3]`. The same fly-out exists inside
`Reports (Old)` `[D·img 2023]`. At least one office report was later promoted to a standard menu (`Uncollected Copay`
under Management Reports) `[D]` `[G2]` `[R2]`.

| Folder (legacy label) | Report | What it does | Criteria and output documented | Source |
|---|---|---|---|---|
| `Hawaii Family Dental Reports` | `Uncollected Copay` | Finds patients who did not pay the expected patient portion or a prior balance; part of the end-of-day routine | None for the folder copy. The standard twin under Management Reports has `REPORT FORMAT` Detail / Summary, `PRINT FORMAT` PDF / Excel, `OFFICE/GROUP`, `DATE RANGE`, `Patient Balance Greater Than` | `[D]` `[G5]`; twin `[D·img 2025]` `[FV2]` |
| `Hawaii Family Dental Reports` | `Aging Report by Home Office` (patient receivables) | Same report as under Monthly Reports; offers `Create Task` when aged by patient receivables | None | `[D]` `[OR1]` `[OR2]` |
| `Hawaii Family Dental Reports` | `Production by codes` | Production report by procedure code; the half-cut description line appears to read "for all or specified office groups and procedure codes within a date range" `[I]` (not fully legible) | None | `[D·img 2022]` `[OR3]` |
| `DCA Reports` | `Balance Status Report` | Named as a place where the ledger `Balance Status` can be reviewed, next to the two aging reports with balance status | None | `[D]` `[OR4]` |
| `Tru Family Dental Reports` | `Daily Production vs Collection Report` | Per office, a patient-level list comparing total production, estimated patient portion, patient collection and future production | None | `[D·img 2022]` `[OR3]` |
| `Access Dental Reports` | `Production Analysis Report` | Detailed production analysis with exclusions by date, treating provider, procedure code, patient and carrier | None | `[D·img 2022]` `[OR3]` |
| `[Location Name] Reports` (placeholder written by the vendor) | `Next Appointment Booked Report (Excel)` | Lists who did and who did not leave with a next appointment; run daily | Office, date range; Excel | `[D]` `[G2]` |

Rights sets named by the vendor: `ADRpts`, `BNRpts`, `GSRpts`, `HawaiiRpts`, `VHRpts`, `DHA Reports` `[D]` `[G1]`. The
legacy rights list scraped into our backend carried 31 office-report rights of other customers; our curation removed
all of them `[V]` `BE:app/services/access_rights_catalog.py` L106-136 (31 rows of `REMOVED_ROWS`). The list is global, so
it does not tell which folder our organisation owns.

Folder labels of the fly-out as once transcribed into our own nav (24, in that order) `[G7]`: `Abbey Dental`,
`Access Dental Reports`, `BrightNow Reports`, `CHI St. Joseph Children's Health Reports`, `DCA Reports`,
`Dental Care Reports`, `DHA Reports`, `Great Hills Reports`, `Hawaii Family Dental Reports`, `Healthy Smiles for Kids`,
`Healthcare Network`, `Kane Dental`, `Lumina Reports`, `Kansas Head Start`, `Mid Atlantic Reports`,
`Nursing Home Dental Care`, `OnHealthCare Reports`, `Ottawa Reports`, `Pacific Center for Special Care`,
`Premier Perio Reports`, `Snodgrass-King Reports`, `Tru Family Dental Reports`, `Venture Health Reports`,
`Village Family Dental Reports` (also `analysis/fe_existing_reports.md` §1.1 `[A]`). Four of them match vendor-documented
folders (`Access Dental Reports`, `DCA Reports`, `Hawaii Family Dental Reports`, `Tru Family Dental Reports`). That the
list is what a user of our organisation sees in the live tool is `[I]`: the transcription's source account is unknown,
and a customer normally sees only its own folder `[D]` `[G5]`, so a list of 24 customers suggests a vendor or demo view.

Not found: which folders and reports our organisation sees under `Office Reports ▶` (never public); the criteria screen and
the output of any office report.

| Tag | Source | Date |
|---|---|---|
| `[OR1]` | "How do we use the Enhanced Task Manager screen?", HC 360002419792 | edited 2026-02-24 |
| `[OR2]` | "I do not see the Create Task button … Patient AR Follow-Up", HC 37759543710875 | 2025-06-06 |
| `[OR3]` | Search results capture in "How can we quickly find reports in Denticon?", HC 360020701671, img 10689208181403 | 2022 |
| `[OR4]` | "What is a Balance Status and how can it help with reports?", HC 32299501787163 (read from the article search API) | created 2024-12-28, edited 2025-10-28 |

### Where it lands in our module

| Legacy item | Lands as | Key | Route (07 §1.6 row 14, §2.2) | Owner |
|---|---|---|---|---|
| `Office Reports ▶` | Hub category Custom: reports the organisation defines with the builder, grouped by organisation-defined folder tags (the role of the per-customer folders); the nav entry `Office Reports ▸` lists up to ten custom reports + "All custom reports" + "Report builder" (07 §3.1); also Library tab `custom` | category `custom`, `custom.<slug>` | `/reports/c/custom`; `/reports/library/custom`; builder `/reports/builder`; `/reports/office/*` redirects to `/reports/c/custom` | `06_dashboards.md` §9; store and compilation `02_architecture.md` §11; rights `08_security_compliance.md` §2.2 (`custom` family, `reports_build_custom`) |
| An office report that equals a standard report | Alias: the legacy name is added to `legacy_names[]` of the standard definition (02 §3.1) so that hub search finds it | key of the standard report | runner of that report | `catalog/<category>.md` |
| An office report with no standard twin | Seeded custom definition shipped for the organisation | `custom.<slug>` | `/reports/c/custom` | this document (after capture) |

| Documented office report | Our equivalent | Status |
|---|---|---|
| `Uncollected Copay` | `management.uncollected_copay` (provisional) | covered by the standard report |
| `Aging Report by Home Office` | `monthly.aging_report_by_home_office` (provisional); `Create Task` = `worklists.patient_ar` (06 §6.8) | covered |
| `Next Appointment Booked Report (Excel)` | `worklists.not_reappointed` (06 §6.12) with XLSX export | covered |
| `Production by codes` | `daily.production_report` with production by code | covered |
| `Production Analysis Report` | `daily.production_analysis_report` (provisional) | covered; the exclusion filters to be compared after capture |
| `Daily Production vs Collection Report` | No standard twin | to be specified - candidate seeded custom report |
| `Balance Status Report` (`DCA Reports`) | `monthly.aging_report_by_home_office` (provisional) with the balance-status option, or `worklists.patient_ar` filter `include_balance_status` (06 §6.8) | covered in substance `[I]`; to be compared after capture |

Phase P5 for the builder and the seeds; an alias ships in the phase of its standard report.

### What exists today

| Piece | State | Evidence |
|---|---|---|
| Menu entry | Four orphan placeholder routes named after other customers of the vendor (`/reports/office/abbey-dental`, `/brightnow`, `/dha`, `/access-dental`); no nav entry since commit `f7332be` removed the 24-folder sub-menu | `[V]` `FE:src/App.tsx` L295-298; `FE:src/components/GlobalNav.tsx` L591-594; `[G7]` |
| Rights | 31 legacy office-report rights removed from the catalog | `[V]` `BE:app/services/access_rights_catalog.py` L106-136 |
| Custom report builder, tenant-defined definitions | None | `[V]` no custom-definition or builder code under `BE:app/**` (search) |

Gap: everything; and the tenant's own legacy folder is not known.

### Parity checklist

| Legacy item, filter or option | How the new module covers it | Status |
|---|---|---|
| Fly-out of customer folders | `custom` category with folder tags (06 §9.3) | covered by 06 §9 |
| Folder right pair Full Control / View Only | `reports_custom_reports_full_control` / `_view_only` plus object sharing (08 §2.2, 02 §8.1 `report_shares`) | covered |
| Excel-only office reports | `output_format = xlsx` on any definition; right `reports_export_data_files` | covered |
| Office reports listed in Search Report | Custom reports are catalog entries and are searched like standard reports | covered |
| `Uncollected Copay`, `Aging Report by Home Office`, `Next Appointment Booked Report (Excel)`, `Production by codes`, `Production Analysis Report` | Standard reports and worklists above | covered |
| `Balance Status Report` | Aging with balance status; patient A/R worklist | covered `[I]`; to be compared after capture |
| `Daily Production vs Collection Report` | — | to be specified |
| Folders and reports of our organisation | — | to be specified after capture |
| Folders of other customers (the 24 labels of `[G7]` minus our own) | — | not replicated - they belong to other organisations; the four placeholder routes are deleted and `/reports/office/*` redirects to `/reports/c/custom` (07 §2.2) |

### To capture from the live legacy tool

1. `Reports > Office Reports ▶`: the open fly-out and every folder opened one level further (all report names); compare with the 24 folder labels of `[G7]` to learn where that list came from.
2. For each report of the tenant's folder: the criteria screen in its default state, every dropdown and picker opened, and one generated output (PDF and, where offered, Excel).
3. `Reports (Old) > Office Reports ▶`: the same, to see whether it lists other reports.

### Work

Builder and custom reports are owned by 02 (ENG-53, ENG-54) and 06 (DASH-51), rights by 08 (SEC-40). This document
adds the capture (RPT-MENU-01) and the mapping and seeding of the tenant's office reports (RPT-MENU-15).

## Letters

### What it is in the legacy tool

Batch mail-merge: one letter template is merged for every patient or responsible party that matches the criteria and
printed as one PDF stream in the report viewer. Users: front office (marketing, appointment and recall letters) and
billing (collection letters). Reached through `Reports > Letters` and through the envelope icon of the toolbar
`[D·img 2023]` `[LT3]`; screen title `Letters`, page `NewReports.aspx?RptName=Letters` `[D·img 2023]` `[LT1]`. The
single-patient path (patient Print menu > `Letters`, with question prompts, font choice and signature capture) is a
different screen outside the Reports menu `[D]` `[LT4]` `[LT7]`.

| Topic | Legacy behaviour | Source |
|---|---|---|
| Letters offered | Letters of the chosen group that are assigned to the office (`Setup > Offices > Office Assignment > Letters`) | `[D]` `[LT8]` |
| Address block | Office and recipient addresses print at the top, sized for a window envelope. `Envelope Printing` formats the sender's name and address for the window; nothing is printed on envelopes | `[D]` `[LT1]` `[LT10]` |
| Labels | `LABELS` prints labels for the same recipients | `[D·img 2023]` `[LT1]` |
| Record | A printed letter leaves a record in the patient's Notes. In batch the user is asked whether to add a patient note; OK adds one to every record that matches the criteria; such notes can only be deleted one patient at a time | `[D]` `[LT6]`; `[D·img 2023]` `[LT3]` |
| Question prompts | `@@…@@` prompts are asked for a single patient only; a batch run skips them | `[D]` `[LT4]` |
| No Correspondence | Patients marked "No Correspondence" are left out only when `Exclude patients with no correspondence` is ticked | `[D]` `[LT5]` |
| Logo and sender | The office logo prints on Marketing, Financial Communique, Dentist Communique, Appointment, Insurance and Patient Consent letters; the `Correspondence Name` of the statement settings is the name printed on letters | `[D]` `[LT9]` `[LT11]` |
| Output | PDF in the report viewer (all printing goes through the PDF viewer) | `[D]` `[LT12]` |

Items of the screen (`SELECT REPORT` radios = letter groups):

| # | Group | Criteria documented | Evidence |
|---|---|---|---|
| 1 | `Marketing Letters` | In full (next table) | `[D·img 2023]` `[LT1]`; older layout `[LT3]` |
| 2 | `Financial Communiques` | In part: `SELECT LETTER`; a two-row range and one date field whose labels are hidden by the open dropdown; a radio row; `OTHER OPTIONS` with `Account Bal Over` (`0.00`), `Envelope Printing`, `Include Inactive Patients`, `Exclude patients with no correspondence`; same footer. Demo letters of the group: `CL001 - Coll 1 Letter` to `CL023 - NSF Letter, Fee Charged`, `CS001 - Batch Coll 1 Letter` to `CS009 - Batch Coll 9 Letter` | `[D·img 2023]` `[LT2]` |
| 3 | `Dentist Communiques` | None | label only |
| 4 | `Appointment Letters` | None | label only |
| 5 | `Insurance Letters` | None | label only |
| 6 | `Patient Consent` | None | label only |
| 7 | `Patient Education Letters` | None | label only |

Criteria of `Marketing Letters`:

| Section | Control | Type | Options | Default |
|---|---|---|---|---|
| `SELECT LETTER` | (unlabelled) | dropdown | Letters of the group | first letter |
| `PATIENT NAME RANGE` | `Start Name` with `SEARCH` | text | — | `AAAAA` |
| `PATIENT NAME RANGE` | `End Name` with `SEARCH` | text | — | `ZZZZZ` |
| `EXCLUDE PATIENT TYPE` | picker (`SELECT`) | multi-select | Patient types, `No Type Defined` among them | `None` |
| `DATE RANGE` | (unlabelled) | radio | `By Created Date`, `By First Visit Date`, `By Last Visit Date` | `By Created Date` |
| `DATE RANGE` | `Start Date`, `End Date` | date | — | today / today (older-layout capture) |
| `SORT BY` | (unlabelled) | radio | `Patient/Resp. ID`, `Provider` | `Patient/Resp. ID` |
| `OTHER OPTIONS` | `Envelope Printing` | checkbox | — | off `[I]` (ticked in the capture only to illustrate) |
| `OTHER OPTIONS` | `Include Inactive Patients` | checkbox | — | off |
| `OTHER OPTIONS` | `Exclude patients with no correspondence` | checkbox | — | off |
| Footer | `CLEAR CRITERIA`, `PRINT / PREVIEW`, `LABELS`, `ADD TO MY FAVORITES` | buttons | — | — |
| On `PRINT / PREVIEW` | Confirmation "add a patient note" | dialog | OK = yes, Cancel = no | — |

Related, outside this entry: patient Print menu (`Letters`, `HIPAA Letters ▶` with three office defaults, `Labels ▶`)
`[D·img 2023]` `[LT7]`; the scheduler's right-click `Print > Letter Templates` (2026, see Custom Letter); the collection
letter series `Reports (Old) > Batch Collection Letters` (see Reports (Old)).

Not found: the criteria of groups 3 to 7; the hidden labels of group 2; a printed letter (address block position, logo,
fonts); the `LABELS` output; a maximum batch size.

| Tag | Source | Date |
|---|---|---|
| `[LT1]` | "Envelope Printing Option", HC 360045616352; img 21569132041883 (screen, Marketing Letters) | edited 2023-12-27 |
| `[LT2]` | "… How do I send a collection letter to the Responsible Parties?", HC 115002077391; img 16714808731035 (screen, Financial Communiques) | edited 2023-06-27 |
| `[LT3]` | "We generated a letter for one patient, but a letter generation shows up in every patient's Notes screen", HC 360004713111; img 19615551975707 (older layout and confirmation), 19615433612827 (toolbar icon) | edited 2023-10-16 |
| `[LT4]` | "When we generate a letter … question prompts appear …", HC 115002065971 | edited 2023-06-17 |
| `[LT5]` | "… How does the 'No Correspondence' selection work in Denticon?", HC 115002090192 | edited 2025-08-03 |
| `[LT6]` | "If we print a letter, is that recorded anywhere?", HC 115002081512; "… can we delete the record that it was sent?", HC 115002078831 | edited 2023 / 2025 |
| `[LT7]` | "… How do I print a single letter for one patient?", HC 115002089312; img 19615459960219 (patient Print menu) | edited 2023-10-16 |
| `[LT8]` | "Denticon Setup Guide - Office Assignment", HC 37669944682139 | 2025-06-05 |
| `[LT9]` | "… Which documents will show our logo?", HC 115002078171 | edited 2025-08-03 |
| `[LT10]` | "Do I have to format the letter?", HC 115002095312 | edited 2025-08-03 |
| `[LT11]` | "… How can we get a logo to show in our letters and statements?", HC 115002073331 | edited 2023-12-27 |
| `[LT12]` | "One of our computers is not printing reports, forms, and letters …", HC 115002089532 | edited 2025-08-03 |

### Where it lands in our module

The entry stays with the correspondence feature (PD-15). "Report results can feed them as bulk actions" (brief §1) is
applied in both directions, so that there is one code path: a report or worklist result is sent to letters with the
bulk action `letters`; and the legacy launch screen is a recipient list run by the engine followed by the same action.

| Piece | Lands as | Owner or reference |
|---|---|---|
| Menu entry `Letters` | Nav entry → `/reports/correspondence#letters` (07 §1.6 row 15, page "Correspondence and forms", `externalLinks.ts`); its launch link points to the batch launcher `/correspondence/letters` (NEW) once it exists, "Not available yet" before | Hub: 07 (UX-05). Screen: correspondence feature (`FE:src/features/letters` today) |
| Recipient selection | An engine list run: the NEW recipient lists below, or any list or worklist whose rows carry a patient or an account | Definitions 02 §3; parameters 04 §3 |
| Output | Bulk action `letters` (02 §3.10, API row 14) on the run snapshot → correspondence print service: the existing `POST /api/v1/letters/render-batch` plus a PDF stream (NEW) | 02 §3.10 (handlers belong to the feature); 06 §6.2 row "Letters · postcards · labels"; DASH-31 |
| Labels for the same recipients | Bulk action `labels` on the same snapshot | Labels section |
| Favorites | A saved view of the recipient list, with the chosen template and options in `layout` (02 §8) | 02 §8 |
| Rights | Screen: `reports_letters_screen_full_control` / `reports_letters_screen_view_only` (labels in the legacy rights list, not removed by the curation). Action: `patient_letters_generate` | `[V]` `BE:data/Groups.txt` L549-550, `BE:app/services/access_rights_catalog.py` L274; 08 §2.3 last row |

Recipient lists proposed here (NEW, provisional keys, ordinary `lists.*` definitions with the three correspondence
actions; used by Letters, Postcards and Labels):

| NEW key | Row | Parameters: legacy control → parameter (default) | Datasets (03) | Legacy items served |
|---|---|---|---|---|
| `lists.correspondence_patients` | patient | `PATIENT NAME RANGE` → `patient_name` (`AAAAA` / `ZZZZZ`); `EXCLUDE PATIENT TYPE` → `exclude_patient_type_codes` (`none`); `DATE RANGE` radio → `date_basis` with `created_date`, `first_visit_date`, `last_visit_date` (`created_date`) and `date_range` (today / today); `SORT BY` → `sort_by` with `patient_id`, `provider` (`patient_id`); `Include Inactive Patients` → `include_inactive_patients` (false); `Exclude patients with no correspondence` → `exclude_no_correspondence` (false; NEW parameter key) | `rpt_patient_dim`, `rpt_patient_activity` | Letters: Marketing Letters `[D]`; Dentist Communiques, Insurance Letters, Patient Consent, Patient Education Letters `[I]`. Postcards: Miscellaneous `[I]`. Labels: Patients Labels, Chart Labels `[I]` |
| `lists.correspondence_accounts` | responsible party (account) | Name range → `responsible_party_name` `[I]`; one date (role unknown); `SORT BY` `[I]`; `Account Bal Over` → `account_balance_over` (`0.00`); `include_inactive_patients`; `exclude_no_correspondence` | `rpt_account_dim`, `rpt_ar_open_items` | Letters: Financial Communiques `[D]` in part. Labels: Responsible Party Labels `[I]` |
| `lists.correspondence_appointments` | appointment | `OFFICE/GROUP` → `office_scope` (`current_office`); `SORT BY` → `sort_by` with `last_name`, `date` (`last_name`); `APPOINTMENT DATE RANGE` → `date_range` on `appointment_date` (today / today); `AGE ABOVE` → `age_from` (`0`); `EXCLUDE PATIENT TYPE` → `exclude_patient_type_codes` (`none`); `PROVIDER` → `provider_ids` (`all`) | `rpt_appointment_facts`, `rpt_patient_dim` | Postcards: Appointment Postcards `[D]`. Letters: Appointment Letters `[I]` |
| `lists.patient_birthdays` | patient | Birthday month and day range, `office_scope`, age, patient types `[I]` | `rpt_patient_dim` | Postcards: Birthday Postcards `[I]`. Labels: Birthday Labels `[I]` |

Action options (payload of the bulk action, owned by the correspondence feature; NEW names): `letter_template_id`,
`envelope_printing`, `add_patient_note`. Data limits to state on the screen: the created date of a migrated patient is
the migration time (brief §2); first and last visit are maintained from DATA-19 on; the provider sort uses the preferred
provider, which was not migrated (04 §3.2). Phase P3 (bulk actions arrive with ENG-49).

### What exists today

| Piece | State | Evidence |
|---|---|---|
| Single-patient letters | Dialog (`Envelope Printing`, `Select Letter Group`, `Select Letter`, `Signature Type`, `Signing Provider`, `Treatment Plan`) → client-side merge → jsPDF → viewer → save to chart or sign; route `/patient/:patientId/letters` | `[V]` `FE:src/features/letters/LetterDialog.tsx` L275-366, `LettersPage.tsx`; `FE:src/App.tsx` L226 |
| Template catalog | `letter_templates` (`name`, `letter_type`, `channel`, `title`, `body_html`, `is_editable`, `is_active`), 153 seeded rows `[A]`; per-office assignment where an office without assignments gets every active letter | `[V]` `BE:app/db/models/comms.py` L172-183; `BE:app/services/office_assignment_service.py` L109-136 |
| Letter groups | 8 `letter_type` codes with labels written by our team (`LETTERTYPE` seed): `A` Appointment Letters, `C` Patient Consent, `D` Referral Letters, `E` Email Templates, `F` Financial / Collection, `I` Insurance & Treatment, `M` Marketing Letters, `S` Statements & Disclosures. The frontend hard-codes slightly different labels for `F` and `I` (`Financial / Collection Letters`, `Insurance & Treatment Letters`) | `[V]` `BE:scripts/seed_account_definitions.py` L267-276; `FE:src/features/letters/lettersModel.ts` L15-24 |
| Batch merge | `POST /api/v1/letters/render-batch` (`template_id`, `patient_ids[]`, `office_id`, `signing_provider_id`, `overrides`, `store_html`): inline loop, at most 500 patients, HTML only; run rows `letter_batch_runs` and `letter_batch_items`; `GET /api/v1/letters/batches`. No frontend caller | `[V]` `BE:app/api/v1/letters.py` L70-114; `BE:app/services/letter_service.py` L731-807; `BE:app/core/config.py` L259; `renderLetterBatch` has 0 callers under `FE:src` |
| Batch PDF, window-envelope address block, labels for recipients | None. The single-patient `Envelope Printing` adds a separate envelope page (684 x 297 pt), which is not the legacy meaning | `[V]` `FE:src/features/letters/letterPdf.ts` L24-25, L229-236 |
| No-correspondence flag | Column `patients.no_correspondence` exists; the batch service does not read it | `[V]` `BE:app/db/models/patients.py` L146; `letter_service.py` L731-807 |
| Addressee | A template has no addressee field; the merge context is patient-based with responsible-party tokens | `[V]` `comms.py` L172-183; `letter_service.py` L116-125 |
| Question prompts | Not supported: the token pattern matches `#TOKEN#` only | `[V]` `letter_service.py` L156 |
| Rights | `patient_letters_full_control`, `patient_letters_view_only`, `patient_letters_generate` exist; the letters routes check authentication only | `[V]` `FE:src/features/access-control/rightCodes.ts` L54-56; `BE:app/api/v1/letters.py` L36 |

Gap: the batch launch screen, recipient lists, PDF stream, legacy group names, no-correspondence handling, recipient
history, rights on the routes.

### Parity checklist

| Legacy item, filter or option | How the new module covers it | Status |
|---|---|---|
| Menu entry `Letters`; toolbar envelope icon | `/reports/correspondence#letters` → `/correspondence/letters`; the legacy label is searchable | covered by 07 (UX-05); launcher to be specified |
| Group `Marketing Letters` | Launcher preset on `lists.correspondence_patients`, templates of `letter_type` `M` | to be specified (recipient list NEW) |
| Group `Financial Communiques` | Launcher preset on `lists.correspondence_accounts`, `letter_type` `F`; also a bulk action of `worklists.patient_ar` (06 §6.8) | to be specified after capture (hidden labels) |
| Group `Dentist Communiques` | Launcher preset; `letter_type` `D` `[I]` | to be specified after capture |
| Group `Appointment Letters` | Launcher preset on `lists.correspondence_appointments`; `letter_type` `A` | to be specified after capture |
| Group `Insurance Letters` | Launcher preset; `letter_type` `I` `[I]` | to be specified after capture |
| Group `Patient Consent` | Launcher preset; `letter_type` `C` | to be specified after capture |
| Group `Patient Education Letters` | Launcher preset; `letter_type` `E` `[I]` (our label reads Email Templates) | to be specified after capture |
| Legacy group labels | The seven legacy labels become the labels of the `LETTERTYPE` definitions; today's labels stay as aliases | to be specified (label decision after capture) |
| `SELECT LETTER` | Action option `letter_template_id`; list = `GET /api/v1/offices/{office_id}/letter-templates/effective` filtered by group | covered by the existing endpoint |
| `PATIENT NAME RANGE` | `patient_name` (04 §3.4) | covered (recipient list NEW) |
| `EXCLUDE PATIENT TYPE` | `exclude_patient_type_codes` with the `no_type_defined` row (04 §3.4) | covered |
| `DATE RANGE` basis radio and dates | `date_basis` + `date_range` | covered; created date unreliable for migrated patients |
| `SORT BY` | `sort_by` | covered; provider sort is empty for migrated patients |
| `Envelope Printing` | Action option `envelope_printing` with the legacy meaning (address block for a window envelope) | to be specified - today's option prints a separate envelope page |
| `Include Inactive Patients` | `include_inactive_patients` | covered |
| `Exclude patients with no correspondence` | `exclude_no_correspondence` (NEW key); skipped recipients are counted before printing | to be specified |
| `Account Bal Over` | `account_balance_over` (04 §3.4) on the canonical ledger (PD-2, PD-4) | covered (recipient list NEW) |
| `PRINT / PREVIEW` | Bulk action `letters` → PDF stream, in volumes for large runs | to be specified (print service) |
| `LABELS` | Bulk action `labels` on the same snapshot | to be specified |
| `ADD TO MY FAVORITES` | Saved view of the recipient list with the launcher state | covered by 02 §8 |
| `CLEAR CRITERIA` | Reset of the parameter form (04 §10.2) | covered |
| "Add a patient note" on print | Action option `add_patient_note`; one `letter_batch_items` row per recipient in every case | to be specified |
| Question prompts skipped in batch | A template with prompts is refused for a batch with the reason | to be specified |
| Logo on six letter groups; sender name | Letterhead resolver and `correspondence_name` of the statement settings (`BE:app/db/models/office_setup.py` L50) in the print service | to be specified |
| Letters limited to the office assignment | Office-effective template list | covered |
| Batch size | Job mode with volumes of 500 documents (the statement rule of 02 §7.2); today's limit is 500 patients | to be specified; the legacy limit is unknown |

### To capture from the live legacy tool

1. `Reports > Letters`: each of the seven groups selected in turn, default state, with the `SELECT LETTER` list open and every picker opened (`EXCLUDE PATIENT TYPE`).
2. `Financial Communiques` with the dropdown closed (the hidden section labels and the date field).
3. One printed batch per addressee kind (patient letter, responsible-party letter), with and without `Envelope Printing`; the `LABELS` output for the same criteria.
4. The patient-note confirmation and the resulting entry in a patient's Notes.
5. The number of letters per group (to settle the mapping of our `letter_type` codes `D`, `E`, `I`, `S`).

### Work

RPT-MENU-02 (search and favorites of the correspondence anchor), RPT-MENU-03 (rights), RPT-MENU-04 (merge parity), RPT-MENU-06 (print service), RPT-MENU-08
(recipient lists), RPT-MENU-09 (launcher). The hand-off from worklists is owned by 06 (DASH-31) and the action dispatch
by 02 (ENG-49).

## Postcards

### What it is in the legacy tool

Batch postcards for mailing: one postcard template merged per patient. Reached through `Reports > Postcards`; screen
title `Postcards`. The user picks a type, then a postcard of that type and the criteria, then `PRINT / PREVIEW` `[D]`
`[PC1]`. Four postcards print per 8.5 x 11 in sheet; perforated stock is recommended, no product is required `[D]`
`[PC3]`. Batch recall postcards always leave out patients marked "No Correspondence" `[D]` `[LT5]`. The vendor also
sells a service that produces recall postcards once a month, around the 15th, for the patients due the next month and
not yet scheduled `[D]` `[PC4]`. Rights `Reports - Postcards Full Control` / `View Only` are in the legacy rights
list `[V]` `BE:data/Groups.txt` L594-595 (the vendor's rights article `[G1]` does not list them).

| # | Type (`SELECT REPORT`) | Use | Criteria documented | Evidence |
|---|---|---|---|---|
| 1 | `Recall Postcards` | Recall reminders. Older menu wording: postcards for recall due / no recall date / not scheduled, and for scheduled recall | None for the current screen | `[D]` `[PC1]`; old wording `[D]` `[G6]` |
| 2 | `Appointment Postcards` | Appointment reminders | In full (next table) | `[D·img 2025]` `[PC2]` |
| 3 | `Birthday Postcards` | Birthday greetings `[I]` | None | `[D]` `[PC1]` |
| 4 | `Miscellaneous Postcards` | Any other mailing `[I]` | None | `[D]` `[PC1]` |

Criteria of `Appointment Postcards`:

| Section | Control | Type | Options | Default |
|---|---|---|---|---|
| `OFFICE/GROUP` | (unlabelled) | radio | `Office`, `Office Group` | `Office` |
| `OFFICE/GROUP` | office box with `SELECT` | picker | Offices | current office |
| `SORT BY` | (unlabelled) | radio | `Last Name`, `Date` | `Last Name` |
| `POSTCARD` | (unlabelled) | dropdown | Postcards of the type | first postcard |
| `APPOINTMENT DATE RANGE` | `Start Date`, `End Date` | date | — | today / today |
| `AGE ABOVE` | (unlabelled) | number | — | `0` |
| `EXCLUDE PATIENT TYPE` | picker (`SELECT`) | multi-select | Patient types | `None` |
| `PROVIDER` | picker (`SELECT`) | multi-select | Providers | `ALL` |
| `OTHER OPTIONS` | `Add Patient Note` | checkbox | — | off |
| Footer | `CLEAR CRITERIA`, `PRINT / PREVIEW`, `ADD TO MY FAVORITES` | buttons | — | — |

Merge tags seen in a postcard body: `#APPT_DATE#`, `#APPT_TIME#`, `#APPT_PRDR#`, `#APPT_LENGTH#` `[D·img 2025]` `[PC2]`.

Not found: the criteria of types 1, 3 and 4 (for recall: how due-not-scheduled and scheduled are chosen); the printed
sheet (card size, margins, which side carries the address); whether `Office Group` can be selected.

| Tag | Source | Date |
|---|---|---|
| `[PC1]` | "How can I print patient postcards from within Denticon?", HC 32543905179547 | 2025-01-07 |
| `[PC2]` | "We see patients who speak another language … How can we create these resources to print?", HC 32697815775515; img 33654457400091 (Postcards screen), 33654487034779 (Custom Postcards) | v1.1 2026-05-15, captures 2025 |
| `[PC3]` | "We want to generate recall postcards … Is there a preferred postcard product to use?", HC 115002077311 | edited 2025-08-03 |
| `[PC4]` | "Denticon generates our recall due postcards. When …", HC 115002095172 | edited 2025-08-03 |

### Where it lands in our module

| Piece | Lands as | Owner or reference |
|---|---|---|
| Menu entry `Postcards` | `/reports/correspondence#postcards` (07 §1.6 row 16) → launcher `/correspondence/postcards` (NEW) once it exists | Hub: 07 (UX-05). Screen: correspondence feature |
| `Recall Postcards` | Bulk action `postcards` on `recall.recall_due_report` and `recall.scheduled_recall_report` (provisional keys) and on `worklists.recall_due` (06 §6.6 already lists postcards) | Recall catalog; 06 §6.6 |
| `Appointment Postcards` | Launcher preset on `lists.correspondence_appointments` (NEW, Letters section) | this document |
| `Birthday Postcards` | Launcher preset on `lists.patient_birthdays` (NEW) | this document |
| `Miscellaneous Postcards` | Launcher preset on `lists.correspondence_patients` (NEW) `[I]` | this document |
| Output | Bulk action `postcards` (02 §3.10) → correspondence print service, four cards per Letter sheet; action options `postcard_template_id`, `add_patient_note` (NEW names) | correspondence feature |
| Templates | `postcard_templates` (see Custom Postcard) | correspondence feature |
| Rights | Restore `reports_postcards_full_control` / `reports_postcards_view_only` (removed by the curation) | `[V]` `BE:app/services/access_rights_catalog.py` L139-140 |

Phase P3 (with the Recall and Appointment reports and the bulk actions).

### What exists today

| Piece | State | Evidence |
|---|---|---|
| Templates | Table `postcard_templates` (`office_id`, `legacy_id`, `name`, `card_type`, `body`); CRUD `/api/v1/postcard-templates` with office-scope parameters; no frontend caller | `[V]` `BE:app/db/models/comms.py` L186-194; `BE:app/api/v1/registry.py` L1377-1379; `listPostcardTemplates` has 0 callers under `FE:src` |
| Render, sheet layout, batch run, screen | None | `[V]` the only postcard paths in `FE:openapi.json` are `/api/v1/postcard-templates` and `/api/v1/postcard-templates/{item_id}` |
| Migrated postcard templates | Not checked (no database access in this task) | — |

Gap: everything except the template table.

### Parity checklist

| Legacy item, filter or option | How the new module covers it | Status |
|---|---|---|
| Menu entry `Postcards` | `/reports/correspondence#postcards` | covered by 07 (UX-05); launcher to be specified |
| Type `Recall Postcards` (due not scheduled; scheduled) | Action `postcards` on the two recall reports and on `worklists.recall_due` | covered by the action; criteria to be specified after capture |
| Type `Appointment Postcards` | Launcher preset on `lists.correspondence_appointments` | to be specified (recipient list NEW) |
| Type `Birthday Postcards` | Launcher preset on `lists.patient_birthdays` | to be specified after capture |
| Type `Miscellaneous Postcards` | Launcher preset on `lists.correspondence_patients` | to be specified after capture |
| `OFFICE/GROUP` | `office_scope` (04 §3.1) | covered |
| `SORT BY` `Last Name` / `Date` | `sort_by` | covered |
| `POSTCARD` | Action option `postcard_template_id`, list filtered by `card_type` and office | to be specified |
| `APPOINTMENT DATE RANGE` | `date_range` on `appointment_date` | covered |
| `AGE ABOVE` | `age_from` of the `age` parameter (04 §3.4) | covered |
| `EXCLUDE PATIENT TYPE` | `exclude_patient_type_codes` | covered |
| `PROVIDER` | `provider_ids` (appointment provider) | covered |
| `Add Patient Note` | Action option `add_patient_note` | to be specified |
| `PRINT / PREVIEW`: four cards per Letter sheet | Postcard layout of the print service | to be specified after capture (geometry) |
| `ADD TO MY FAVORITES`, `CLEAR CRITERIA` | Saved view (02 §8); form reset (04 §10.2) | covered |
| "No Correspondence" patients always left out of recall postcards | Mandatory exclusion in the `postcards` handler (`requires[]` of 02 §3.10) with the count shown before printing | to be specified |
| Merge tags `#APPT_DATE#`, `#APPT_TIME#`, `#APPT_PRDR#`, `#APPT_LENGTH#` | Merge catalog: the first and third exist; time and length are missing | to be specified (merge parity) |
| Vendor-run monthly recall postcard service | — | not replicated - a paid vendor service, not a product function; the scheduled run of `recall.recall_due_report` plus the action covers the need |

### To capture from the live legacy tool

1. `Reports > Postcards`: each of the four types selected, default state, `POSTCARD` list open, pickers opened.
2. One printed sheet per type (a full page of four cards, both orientation and address position visible).
3. `Recall Postcards`: how "due and not scheduled" and "scheduled" are chosen.

### Work

RPT-MENU-02, RPT-MENU-03, RPT-MENU-04, RPT-MENU-06, RPT-MENU-08, RPT-MENU-09; templates RPT-MENU-05.

## Labels

### What it is in the legacy tool

Batch address labels on sheet stock for a list of patients, responsible parties or other addressable records. Reached
through `Reports > Labels`; screen title `Labels`, page `NewReports.aspx?RptName=Labels`; twelve radios under
`SELECT REPORT` `[D·img 2023]` `[LB1]`. Rights `Reports - Labels Screen Full Control` / `View Only` `[D]` `[G1]`.

| # | Label type | Criteria documented | Evidence |
|---|---|---|---|
| 1 | `Patients Labels` | None | `[D·img 2023]` `[LB1]` |
| 2 | `Responsible Party Labels` | None | same |
| 3 | `Referral Labels` | None | same |
| 4 | `Provider Labels` | None | same |
| 5 | `Chart Labels` | None | same |
| 6 | `Patients Labels by Insurance Plan` | In full (next table). List twin named by the vendor: `Lists > Patient/Resp. Party List > Patient List - Grouped By` with `REPORT BY` set to patients by insurance plan | `[D]` `[D·img 2023]` `[LB1]` |
| 7 | `Employer Labels` | None | same |
| 8 | `Insurance Carrier Labels` | None | same |
| 9 | `Recall Labels` | None | same |
| 10 | `EZ-Pay Labels` | None; the population is not described anywhere | same |
| 11 | `Birthday Labels` | None | same |
| 12 | `New Patient Labels` | None | same |

Criteria of `Patients Labels by Insurance Plan`:

| Section | Control | Type | Options | Default |
|---|---|---|---|---|
| `OFFICE/GROUP` | (unlabelled) | radio | `Office`, `Office Group` | `Office`; the whole section is greyed in the capture |
| `OFFICE/GROUP` | office box with `SELECT` | picker | Offices | greyed |
| `CARRIER` | picker (`SELECT`) | multi-select | Carriers | `ALL` |
| `EMPLOYER` | picker (`SELECT`) | multi-select | Employers | `ALL` |
| `STATE` | (unlabelled) | dropdown | States | `ALL` |
| `OTHER OPTIONS` | `Include Patient Chart#` | checkbox | — | off |
| `OTHER OPTIONS` | `Include Inactive` | checkbox | — | off |
| Footer | `CLEAR CRITERIA`, `PRINT / PREVIEW`, `ADD TO MY FAVORITES` | buttons | — | — |

| Topic | Legacy behaviour | Source |
|---|---|---|
| Sheet stock | Full-page labels are laid out for Avery 5160 / 8160 style sheets; the article gives the label size as 2 x 2 5/8 in. `[conflict]` that stock is 30 labels of 1 x 2 5/8 in per sheet `[I]`: measure a printed sample. The PDF viewer's scaling must be left at its default | `[D]` `[LB2]` |
| Single labels | Printed on a label printer in two sizes: address label 1-1/8 x 3-1/2 in, shipping label 2-5/16 x 4 in | `[D]` `[LB3]` |
| Patient Print menu (outside this entry) | `Labels ▶`: `Label`, `Label - Small`, `Label - Address`, `Label - Appointment`, `Label - Chart`, `Label - Referral` | `[D·img 2023]` `[LB4]` |
| Appointment label (outside this entry) | Printed automatically after a new appointment is saved when the user setting `Print Labels for Appt.` is Small or Large. Small: patient, date and time, length, provider. Large: plus office name, address and phone | `[D]` `[LB4]` `[LB5]` |

Not found: the criteria of eleven label types; the lines printed on each label type; the population of `EZ-Pay Labels`;
whether a start position on a partly used sheet can be chosen.

| Tag | Source | Date |
|---|---|---|
| `[LB1]` | "How are we able to generate labels for all patients who are assigned to a particular insurance plan?", HC 115002084872; img 17104703482011 (screen), 17104648072219 (menu and label list) | edited 2023-07-13 |
| `[LB2]` | "For what size page are labels designed?", HC 115002079331 | edited 2025-08-03 |
| `[LB3]` | "I see we can print labels on a Dymo LabelWriter. What sizes of label can be used?", HC 115002079171 | edited 2025-08-03 |
| `[LB4]` | "… How may we print a label for a patient's appointment?", HC 115002087652; img 16264715790747 (patient Print menu, Labels) | edited 2023-06-10 |
| `[LB5]` | "… Is there an easy way to print a label for a newly made appointment?", HC 115002087752 | edited 2023-09-16 |

### Where it lands in our module

Nav entry → `/reports/correspondence#labels` (07 §1.6 row 17) → launcher `/correspondence/labels` (NEW) once it exists; output = bulk action `labels` (02 §3.10) handled
by a label renderer of the correspondence feature. Phase P3. Rights: restore `reports_labels_screen_full_control` /
`reports_labels_screen_view_only` (removed by the curation `[V]` `BE:app/services/access_rights_catalog.py` L104-105).

| Label type | Recipient list (provisional keys; NEW where marked) | Basis of the mapping |
|---|---|---|
| `Patients Labels` | `lists.correspondence_patients` (NEW) | `[I]` |
| `Responsible Party Labels` | `lists.responsible_party_list` | `[I]` same population as the list report |
| `Referral Labels` | `referral.referral_source_list` | `[I]` |
| `Provider Labels` | `lists.provider_list` | `[I]` |
| `Chart Labels` | `lists.correspondence_patients` (NEW) with label layout `chart` | `[I]` |
| `Patients Labels by Insurance Plan` | `lists.patient_list_grouped_by` with the insurance-plan grouping; `carrier_ids`, `employer_ids`, `state_codes`, `include_inactive_patients` (04 §3.4, §3.5, §3.7) | `[D]` the vendor names this list as the twin |
| `Employer Labels` | `lists.employer_list` | `[I]` |
| `Insurance Carrier Labels` | `lists.carrier_list` | `[I]` |
| `Recall Labels` | `recall.recall_due_report`; `worklists.recall_due` (06 §6.6 already lists labels) | `[I]` |
| `EZ-Pay Labels` | None until the population is known | not mapped |
| `Birthday Labels` | `lists.patient_birthdays` (NEW) | `[I]` |
| `New Patient Labels` | `lists.patient_list_new_patient` | `[I]` |

Renderer inputs (NEW names, owned by the correspondence feature): label layout `address` (name and mailing address) or
`chart`; option `include_patient_chart_number`; office setting `label_stock` (`sheet_30` by default); start position.
The patient-level labels of the Print menu and the appointment label reuse the same renderer but are outside the
Reports menu and outside this document's scope.

### What exists today

| Piece | State | Evidence |
|---|---|---|
| Batch labels, label renderer, label endpoint | None | `[V]` no label path in `FE:openapi.json`; no label code under `BE:app/**` (search) |
| Appointment label preference | User preference `print_labels`, saved as a boolean string (legacy: none / small / large) | `[V]` `FE:src/components/modals/AddEditUserModal.tsx` L526, L775, L2169 |
| Mailing addresses | Patient and guarantor address columns are planned in the patient and account dimensions | `[A]` `03_data_foundation.md` (`rpt_patient_dim`, `rpt_account_dim`) |

Gap: everything.

### Parity checklist

| Legacy item, filter or option | How the new module covers it | Status |
|---|---|---|
| Menu entry `Labels` | `/reports/correspondence#labels` | covered by 07 (UX-05); launcher to be specified |
| `Patients Labels by Insurance Plan` and its six criteria | Action `labels` on `lists.patient_list_grouped_by`; `CARRIER` → `carrier_ids`, `EMPLOYER` → `employer_ids`, `STATE` → `state_codes`, `Include Inactive` → `include_inactive_patients`, `OFFICE/GROUP` → `office_scope` | covered once that list carries the three filters (to verify in `catalog/patient_lists.md`) |
| `Include Patient Chart#` | Renderer option `include_patient_chart_number` | to be specified |
| `Patients Labels`, `Chart Labels`, `Birthday Labels` | Launcher presets on the NEW recipient lists | to be specified after capture |
| `Responsible Party Labels`, `Referral Labels`, `Provider Labels`, `Employer Labels`, `Insurance Carrier Labels`, `Recall Labels`, `New Patient Labels` | Action `labels` on the list or report of the same population | to be specified after capture (criteria of each legacy screen) |
| `EZ-Pay Labels` | — | to be specified after capture (population unknown) |
| `PRINT / PREVIEW` on 30-per-sheet stock | Label renderer, `label_stock` = `sheet_30` | to be specified after capture (geometry, lines per label) |
| `ADD TO MY FAVORITES`, `CLEAR CRITERIA` | Saved view (02 §8); form reset | covered |
| `LABELS` button of the Letters screen | Action `labels` on the letter recipients | to be specified |
| Label-printer sizes for single labels | Extra `label_stock` values | not replicated in this module - patient-level labels belong to the patient Print menu; the renderer keeps the stock list open |

### To capture from the live legacy tool

1. `Reports > Labels`: each of the twelve types selected, default state, every dropdown and picker opened.
2. One printed sheet per label type (to read the lines printed and to measure the grid).
3. `EZ-Pay Labels`: criteria and one output, to learn the population.
4. The `LABELS` output of the Letters screen.

### Work

RPT-MENU-02, RPT-MENU-03, RPT-MENU-07 (renderer and action handler), RPT-MENU-08, RPT-MENU-09.

## Custom Letter

### What it is in the legacy tool

The authoring screen for every printable patient document built from a template: letters, consent forms, disclosure
statements. Users: administrators and office managers. Reached through `Reports > Custom Letter` (older wording
`Reports > Custom > Custom Letters`); screen title `Letters (New) Setup`, page `ReportsNew/CustomLetterNew.aspx`
`[D·img 2023]` `[CL1]`. Rights: `Reports - Custom Letter Full Control` (add, edit, delete) and
`Reports - Custom Letter Screen View Only` (list and preview only) `[D]` `[G1]`.

| Area | Content | Source |
|---|---|---|
| Left panel `LETTERS` | Filter dropdown (`All Letters` or one letter type); list of letters shown as name and id; `ADD NEW LETTER`. In 2026 the list has the columns `LETTER NAME` and `QUICK PRINT` (a toggle with the tooltip "Show in appointment quick menu", shown for Appointment Letters) and a counter of the form "n of m templates shown in the appointment quick menu" | `[D·img 2023]` `[CL1]`; `[D·img 2026]` `[CL6]` |
| Right panel `LETTER PREVIEW` | `Letter Type`, `Name`, `Title`, `Body` (read-only); `EDIT`, `DELETE`; in 2026 a stamp `Modified On` / `Modified By` | same |
| Dialog `LETTER PREVIEW - ADD` | `Letter Type` (dropdown), `Name` (required), `Title`, `Body` (required, rich-text editor), `+ DATA`, `+ ADD QUESTION`, checkbox `Add to All Offices` (ticked), `SAVE`, `CANCEL`. The article text also names a `To` field (Patient or Responsible Party) and a `Print Address` checkbox that the 2023 capture does not show `[conflict]` | `[D]` `[D·img 2023]` `[CL1]` |
| Editor toolbar | Article text: font, font size, font colour, background colour, bold, italics, underline, strikethrough, bullets, justification, tables `[D]`. The 2023 capture also shows numbered list, outdent / indent, link / unlink, undo / redo, cut / copy / paste, find, replace and spell check; the justification buttons appear only on the older (2020) toolbar image `[D·img 2020, 2023]` | `[CL1]` |
| Dialog `SEARCH DATA RESULTS` (from `+ DATA`) | `SEARCH TEXT`, `CLEAR SEARCH`; grid `VALUE` / `DESCRIPTION`; `SELECT`, `CLOSE`. Shift + # lists the data tags inline | `[D]` `[D·img 2023]` `[CL1]` |
| `+ ADD QUESTION` | Inserts a prompt delimited by `@@`; a prompt can be bound to a pick list (checkbox `Pick List` and a list). Prompts are answered when the letter is printed for one patient | `[D]` `[CL4]` `[CL5]` |

Letter types named by the vendor: `Marketing Letters`, `Financial Communiques`, `Dentist Communiques`,
`Appointment Letters`, `Insurance Letters`, `Patient Education Letters`, `Patient Consent`, `Financial Disclosure`,
`Referral Forms` (the last one seen in Advanced Custom Letter) `[D]` `[LT8]` `[CL7]` `[CL10]` `[AL1]`.

| Rule | Detail | Source |
|---|---|---|
| Length | 7,500 characters including spaces; longer text is cut when printed | `[D]` `[CL3]` |
| Letter type after save | One article says the type cannot be changed once saved; another describes changing it to Patient Consent through Edit `[conflict]` | `[D]` `[CL1]` `[CL10]` |
| Electronic signature | Only letters of type `Patient Consent` capture a patient signature | `[D]` `[CL10]` |
| `Financial Disclosure` | Offered when a treatment plan or payment plan is printed; only question prompts can be added, no further data tags | `[D]` `[CL7]` `[CL13]` |
| Office scope | Custom letters are office-specific. `Add to All Offices` at save; availability per office in `Setup > Offices > Office Assignment > Letters` (dual list per letter type); all letters can be copied from another office, replacing the target's letters; a letter that was assigned and used can no longer be unassigned | `[D]` `[CP3]` `[CL8]` `[CL9]` `[CL13]` |
| Edit and delete | An edit applies at once to every later use; `DELETE` removes the letter | `[D]` `[CL2]` `[CL12]` |
| Quick print (2026) | A toggle per Appointment Letter adds it to the scheduler's right-click `Print > Letter Templates`; turning it on needs `Reports-Custom Letter Full Control`, and the letter must be assigned to the office (assignment needs `Setup - Office Screen Full Control`). The letter opens in a window with save as PDF, export to Word and print | `[D]` `[CL6]` |
| Pasting | Typing in the editor is recommended over pasting from a word processor | `[D]` `[CL10]` |
| Print formatting | Address blocks are placed automatically; for one patient the body font and size can be chosen at print | `[D]` `[LT10]` |
| Other languages | A translated letter is a second letter | `[D]` `[CL11]` |

Data tags. Categories: Appointments, Corporate Office Details, Visit Dates, Insurance, Office Details, Patient
Information, Treatment Plan, Recalls, Responsible Party `[D]` `[CL1]`. Tags seen: `#ACC_ADDRESS#`, `#ACC_CITY#`,
`#ACC_CONTFIRST#`, `#ACC_CONTLAST#`, `#ACC_CUSTOM_FIELD1#`, `#ACC_CUSTOM_FIELD2#`, `#ACC_EMAIL#`, `#ACC_NAME#`,
`#ACC_PHONE#`, `#ACC_PHONE2#` (first rows of the dialog) `[D·img 2023]` `[CL1]`; `#PAT_TXPLAN#`, `#PAT_TXPLAN_FEE#` `[D]`
`[CL14]`; `#USER_CUSTOM_FIELD1#`, `#PAT_FIRST_NAME#`, `#APP_DATE#`, `#PAT_TXPLAN_COMPLETED#` `[D·img 2026]` `[CL6]`.

Not found: the complete data-tag list; the exact options of the `Letter Type` dropdown; the Edit dialog; whether `To`
and `Print Address` still exist; the add-question dialog.

| Tag | Source | Date |
|---|---|---|
| `[CL1]` | "How do I add a new letter?", HC 115002078231; img 21579167132315 (list and preview), 21579164510235 (add dialog), 21579167146395 (data dialog), 360061650172 (toolbar, 2020); img 21579164500379 is the open Reports menu (see `[G3]`) | edited 2024-08-12, captures 2023 |
| `[CL2]` | "How do I edit a letter, consent form, or disclosure statement?", HC 115002095232 | 2026-09-25 |
| `[CL3]` | "We typed a Custom Letter, but not all the text appears …", HC 115002078371 | edited 2025-08-03 |
| `[CL4]` | "… How are we able to input question prompts into our documents?", HC 115002082372 | edited 2023-06-12 |
| `[CL5]` | "How are we able to use our Pick List in patient letters?", HC 115002067991 | edited 2023-06-12 |
| `[CL6]` | "Appointment Book: Letter Templates on the Right-Click Print Menu", HC 57763105828635; img 57763105820443 | v1.1 2026-10-26 (edited 2026-10-28) |
| `[CL7]` | "Our office is unable to edit a letter even users with administrator rights …", HC 360047337051 | edited 2025-08-03 |
| `[CL8]` | "Do we have to setup the letters in each office?", HC 115002081392; "How are we able to control which letters appear for selection?", HC 360059918492 | edited 2023-12-28 |
| `[CL9]` | "… Is there a way to copy the letters from one location to another?", HC 115002077591 | edited 2023-12-28 |
| `[CL10]` | "How do I make a form or letter capture an electronic signature?", HC 115002095532; "How do I enter a new patient consent form?", HC 115002078651; "How do we add a new disclosure statement?", HC 115002074311 | edited 2023-07-01 |
| `[CL11]` | "We see patients who speak another language …", HC 32697815775515 | v1.1 2026-05-15 |
| `[CL12]` | "Can we completely remove a letter from the system?", HC 115002094972 | edited 2025-08-03 |
| `[CL13]` | "I have Financial Disclosures under Custom Letters but cannot use them for Treatment Plans …", HC 36315877136667 | 2025-04-24 |
| `[CL14]` | "… the consent form is not allowing keyboard entry of tooth numbers …", HC 115002089872 | edited 2025-08-03 |

### Where it lands in our module

| Piece | Lands as | Owner or reference |
|---|---|---|
| Menu entry `Custom Letter` | `/reports/correspondence#custom_letter` (07 §1.6 row 18) → `/setup/correspondence/letter-templates` (NEW): Setup › Correspondence › Letter templates | Hub: 07 (UX-05). Screen: correspondence feature (PD-15) |
| Storage and API | Existing `letter_templates` and `/api/v1/letter-templates` CRUD; data tags from `GET /api/v1/letters/merge-fields`; office availability through the office-assignment endpoints | correspondence feature |
| Rights | `reports_custom_letter_full_control` / `reports_custom_letter_screen_view_only` (labels in the legacy rights list, not removed by the curation) | `[V]` `BE:data/Groups.txt` L521-522; 08 §2.3 last row |

Phase P2: independent of the engine and needed before the P3 batch features.

### What exists today

| Piece | State | Evidence |
|---|---|---|
| Template CRUD | `POST`, `PATCH`, `DELETE /api/v1/letter-templates` (generic CRUD; search on `name`, `title`; filters `letter_type`, `is_active`); no frontend caller of create, update or delete | `[V]` `BE:app/api/v1/registry.py` L1374-1376; `createLetterTemplate`, `updateLetterTemplate`, `deleteLetterTemplate` have 0 callers under `FE:src` |
| Template fields | `name`, `letter_type`, `channel`, `title`, `body_html`, `is_editable`, `is_active`, `legacy_id`. No addressee, print-address flag, quick-print flag, change stamp or office column | `[V]` `BE:app/db/models/comms.py` L172-183 |
| Merge-field catalog | 57 tokens (patient, provider, referral, office, marketing, responsible party, appointment, misc, treatment plan); it covers the tokens of the migrated templates | `[V]` `BE:app/services/letter_service.py` L67-145 |
| Legacy tags outside the catalog | `ACC_*`, `APPT_TIME`, `APPT_LENGTH`, `PAT_TXPLAN`, `PAT_TXPLAN_FEE`, `PAT_TXPLAN_COMPLETED`, `USER_CUSTOM_FIELD1`, `APP_DATE`, `PAT_LEDTRAN`, `EXT_IN_REF_*` | `[V]` same file |
| Question prompts and pick lists in letters | None | `[V]` `letter_service.py` L156 |
| Body rendering | Text runs with bold and underline, lists and address blocks only; fonts, colours, italic, justification and table layout of the legacy editor are not rendered | `[V]` `FE:src/features/letters/letterHtml.ts` L1-33, L131-132 |
| Office assignment | Setup › Offices › Office Assignment › Letters tab (dual list) | `[V]` `FE:src/services/officeAssignmentApi.ts` L227-246 |
| Editor screen | None | `[V]` `FE:src/features/letters/` holds no template editor |
| Template data quality | Damaged characters in 21 bodies and 11 truncated bodies await a repair decision | `[A]` `analysis/fe_report_like_outputs.md` §7.2 (LTR-8, LTR-9) |

Gap: the whole authoring screen; addressee and flags on the template; prompts; the missing data tags; richer rendering.

### Parity checklist

| Legacy item, filter or option | How the new module covers it | Status |
|---|---|---|
| Menu entry `Custom Letter` | `/reports/correspondence#custom_letter` | covered by 07 (UX-05); screen to be specified |
| List with type filter; name and id | Template list with `letter_type` filter and search | to be specified (screen) |
| Preview panel | Read-only preview of the selected template | to be specified |
| `ADD NEW LETTER`, `EDIT`, `DELETE` | Existing CRUD endpoints | covered by the API; screen to be specified |
| `Letter Type` and its nine documented values | `letter_type` with the `LETTERTYPE` definitions; legacy labels restored (Letters section) | to be specified after capture (dropdown options) |
| `Name`, `Title`, `Body` | `name`, `title`, `body_html` | covered |
| `To` (Patient / Responsible Party), `Print Address` | New template fields `addressee`, `print_address` (NEW names) | to be specified; existence in the current legacy screen to be confirmed |
| Editor toolbar (fonts, sizes, colours, bold, italic, underline, strikethrough, lists, indent, justification, tables, links, spell check) | Rich-text editor; the print service must render what the editor allows | to be specified - today only bold, underline and lists print |
| `+ DATA` dialog with search | Data-tag picker fed by `GET /api/v1/letters/merge-fields` | covered by the endpoint; picker to be specified |
| Shift + # inline tag list | Editor shortcut | to be specified |
| Data tags of nine categories | Merge catalog extended to the captured list | to be specified after capture (complete tag list) |
| `+ ADD QUESTION` with `@@` prompts and pick lists | Prompt syntax in the merge engine; answered for one recipient | to be specified |
| `Add to All Offices` | At save: assign to every office or to chosen offices (office-assignment endpoints) | to be specified |
| Office assignment by letter type; copy from another office | Existing Letters tab of Office Assignment; copy action | covered (tab exists); copy action to be specified |
| 7,500-character limit | Server-side length rule with the count in the message; the limit itself is a decision | to be specified |
| Letter type fixed after save | Rule on update | to be specified after capture (`[conflict]` in the sources) |
| Signature capture only for `Patient Consent` | Consent flow of the letters feature (`CONSENT_GROUP = 'C'`, `FE:src/features/letters/lettersModel.ts` L68) | covered |
| `Financial Disclosure` restrictions and use on treatment-plan and payment-plan prints | Disclosure texts of those prints come from letter templates of the disclosure type | to be specified |
| `QUICK PRINT` toggle and counter (2026) | Template flag `quick_print` (NEW name) and a scheduler print entry | to be specified |
| `Modified On` / `Modified By` (2026) | Change stamp on the template | to be specified |
| Rights Full Control / View Only | The two kept codes on the screen and on the CRUD routes | to be specified |

### To capture from the live legacy tool

1. `Reports > Custom Letter`: the list filter open; one letter selected; `Letter Type` dropdown open in the add dialog.
2. The add and the edit dialog in full; whether `To` and `Print Address` exist.
3. `+ DATA`: the complete tag list (scroll through every row, or search by each category) with descriptions.
4. `+ ADD QUESTION` dialog with and without `Pick List`.
5. The `QUICK PRINT` column for Appointment Letters; the delete confirmation; the error when the length limit is exceeded.
6. `Setup > Offices > Office Assignment > Letters`: the tab, the `Letter Type` dropdown, the copy-from-office dialog.

### Work

RPT-MENU-02 (search and favorites of the correspondence anchor), RPT-MENU-03 (rights), RPT-MENU-04 (merge parity), RPT-MENU-05 (authoring screen).

## Advanced Custom Letter

### What it is in the legacy tool

A second template screen with a block-layout editor. Reached through `Reports > Advanced Custom Letter`; screen title
`Advanced Custom Letters`, page `ReportsNew/AdvancedCustomLetters.aspx` `[D·img 2023]` `[AL1]`. Documented use: referral
forms that a provider sends back to the referring dentist with embedded images (radiographs or photos); the article text
says to click "Add New" and set the letter type to "Referral Form", the capture shows the value `Referral Forms` `[D]` `[AL1]`.
Patient Consent and Financial Disclosure letters can also be created there `[D]` `[AL2]` `[CL13]`.

| Area | Content | Source |
|---|---|---|
| Screen | Left panel `LETTERS` with a filter dropdown (`All Letters`), `SEARCH TEXT`, the list and `ADD NEW LETTER`; right panel `LETTER PREVIEW` with `EDIT`, `DELETE` | `[D·img 2023]` `[AL1]` |
| Dialog `LETTER PREVIEW - ADD` | Tabs `PREVIEW - DATA FIELDS` and `PREVIEW`; `Letter Type` (`Referral Forms` in the capture), `Name` (required), `Title`, `Body` (required): a drag-and-drop canvas with the content blocks `COLUMNS`, `HEADING`, `TEXT`, `IMAGE`, `BUTTON`, `DIVIDER`, `HTML`, `EMBED IMAGE`; side tabs `Content`, `Blocks`, `Body`, `Images`; undo, redo, preview, desktop / mobile view; `Add to All Offices`; `SAVE`, `CANCEL` | `[D·img 2023]` `[AL1]` |
| Referral data tags | 23 tags of the form `#EXT_IN_REF_…#`: the referral source (name, office name, e-mail, address, city, state, zip, phone, contact, two custom fields), the referred-to provider and office (name, e-mail, address, city, state, zip, two phones), and the referred procedure code with description, with or without tooth and surface | `[D·img]` `[AL1]` |
| `#PAT_LEDTRAN#` | When the form contains it, completing the letter asks for a date range and inserts the ledger charges of that range | `[D]` `[AL1]` |
| Signature | Consents and referral letters are signed on a signature pad | `[D]` `[IR3]` |

Not found: the settings of each block; the letter types offered; how images are picked when a letter is produced; whether
these letters are offered in batch `Reports > Letters`; a separate security right (none is named; the consent-request
article requires `Reports - Custom Letter Full Control` `[D]` `[AL2]`).

| Tag | Source | Date |
|---|---|---|
| `[AL1]` | "How to Setup Referral Forms", HC 25811032403099; img 25811032377499 (add dialog), 25811052141979 (tag table) | v1.1 2026-06-26, capture 2023 |
| `[AL2]` | "How do we send consent forms to a patient for signing?", HC 360045180772 | edited 2025-07-15 |

### Where it lands in our module

Same template screen as Custom Letter, with a second editor mode: template attribute `editor_kind` = `rich_text` or
`blocks` (NEW name). Nav entry → `/reports/correspondence#advanced_custom_letter` (07 §1.6 row 19) →
`/setup/correspondence/letter-templates?editor_kind=blocks` (NEW) once it exists; the legacy label is found by hub search. Owner: correspondence feature (PD-15). Phase P4: it depends on
the referral model (DATA-40, P3) and on image embedding in the print service.

### What exists today

| Piece | State | Evidence |
|---|---|---|
| Block editor, image blocks in templates | None | `[V]` `FE:src/features/letters/` (no editor); `FE:src/features/letters/letterHtml.ts` L1-33 (text blocks only) |
| Referral forms and referral data tags | None in the merge catalog | `[V]` `BE:app/services/letter_service.py` L92-99 (seven `PAT_REF_*` tokens only) |
| Ledger extract inside a letter | None | `[V]` same file |

Gap: everything.

### Parity checklist

| Legacy item, filter or option | How the new module covers it | Status |
|---|---|---|
| Menu entry `Advanced Custom Letter` | `/reports/correspondence#advanced_custom_letter` | covered by 07 (UX-05); editor to be specified |
| List with filter and `SEARCH TEXT`; `ADD NEW LETTER`, `EDIT`, `DELETE` | Same list as Custom Letter, filtered by `editor_kind` | to be specified |
| Tabs `PREVIEW - DATA FIELDS`, `PREVIEW` | Editor and preview with sample data | to be specified |
| Blocks `COLUMNS`, `HEADING`, `TEXT`, `IMAGE`, `BUTTON`, `DIVIDER`, `HTML`, `EMBED IMAGE` | Block editor; `BUTTON` and raw `HTML` only if a printed use is found | to be specified after capture |
| Embedded patient images in referral forms | Image block bound to patient documents or images at print | to be specified |
| 23 `#EXT_IN_REF_…#` tags | Merge tags over the referral model (DATA-40) | to be specified |
| `#PAT_LEDTRAN#` with a date-range prompt | Prompt of type date range and a ledger table block | to be specified |
| `Letter Type` `Referral Forms`, Patient Consent, Financial Disclosure | `letter_type` values | to be specified after capture |
| `Add to All Offices` | As for Custom Letter | to be specified |
| Desktop / mobile preview | — | not replicated - templates are printed documents; a mobile view has no use until templates are sent electronically |

### To capture from the live legacy tool

1. `Reports > Advanced Custom Letter`: the list, the filter open, the add dialog on both tabs.
2. Each block dropped on the canvas with its settings panel; the `Images` and `Body` side tabs.
3. One referral form produced for a patient with an image, and the date-range prompt of `#PAT_LEDTRAN#`.

### Work

RPT-MENU-11; it builds on RPT-MENU-05.

## Custom Postcard

### What it is in the legacy tool

The authoring screen for postcard templates. Reached through `Reports > Custom Postcard` (older wording
`Reports > Custom > Custom Postcards`); screen title `Custom Postcards`, page `ReportsNew/AdvancedCustomPostcards.aspx`
`[D·img 2023]` `[CP1]`. Rights: `Reports - Custom Postcard Full Control` and `Reports - Custom Postcard Screen View Only`
`[D]` `[G1]`. Postcards are office-specific `[D]` `[CP3]`.

| Area | Content | Source |
|---|---|---|
| Left panel `SEARCH` | `SEARCH TEXT` box; the list of postcards; `ADD POSTCARD` (the article text calls it "Add New Postcard") | `[D·img 2023, 2025]` `[CP1]` `[CP2]` |
| Right panel `POSTCARD INFORMATION` | `Postcard Type`, `Name`, `Body`, `To` (read-only); `EDIT POSTCARD`, `DELETE POSTCARD` | same |
| Fields of a new postcard | `Postcard Type`; `Name` (shown in the selection menus); `Body` (text and data tags) | `[D]` `[CP2]` |
| Values seen | `Postcard Type` = `Appointment Postcard`; `To` = `Patient`. Demo postcards: `Appointment Reminder (Dentist)`, `Appointment Reminder (Hygienist)`, `Happy Birthday`, `Recall Due not Schedule Postcard`, `Scheduled Recall` | `[D·img 2023, 2025]` |

Not found: the add and edit dialogs; the option lists of `Postcard Type` (four types expected from the Postcards screen
`[I]`) and `To`; the data-tag list offered for postcards; a length limit.

| Tag | Source | Date |
|---|---|---|
| `[CP1]` | "How do I add a new postcard?", HC 115002077571; img 21568948109851 (screen) | edited 2023-12-27 |
| `[CP2]` | "We see patients who speak another language …", HC 32697815775515; img 33654487034779 | v1.1 2026-05-15, capture 2025 |
| `[CP3]` | "When we add a new office location … Which settings are specific to the office …", HC 115002090332 | edited 2025-08-03 |

### Where it lands in our module

Nav entry → `/reports/correspondence#custom_postcard` (07 §1.6 row 20) → `/setup/correspondence/postcard-templates` (NEW): Setup › Correspondence ›
Postcard templates, owned by the correspondence feature (PD-15), on the existing `/api/v1/postcard-templates` CRUD.
Rights: restore `reports_custom_postcard_full_control` / `reports_custom_postcard_screen_view_only` (removed by the
curation `[V]` `BE:app/services/access_rights_catalog.py` L98-99). Phase P2, with Custom Letter.

### What exists today

| Piece | State | Evidence |
|---|---|---|
| Storage and API | `postcard_templates` (`tenant_id`, `office_id`, `legacy_id`, `name`, `card_type`, `body`); full CRUD with search on `name`, filter `office_id` and office-scope parameters | `[V]` `BE:app/db/models/comms.py` L186-194; `BE:app/api/v1/registry.py` L1377-1379 |
| Screen | None; no frontend caller of any postcard function | `[V]` 0 callers under `FE:src` |
| Addressee field, type vocabulary, merge of postcard bodies | None (`card_type` is free text of 10 characters; no render endpoint) | `[V]` `comms.py` L193 |

Gap: the screen, a type vocabulary, the addressee, body merge.

### Parity checklist

| Legacy item, filter or option | How the new module covers it | Status |
|---|---|---|
| Menu entry `Custom Postcard` | `/reports/correspondence#custom_postcard` | covered by 07 (UX-05); screen to be specified |
| List with `SEARCH TEXT` | List with `search` of the existing endpoint | covered by the API; screen to be specified |
| `ADD POSTCARD`, `EDIT POSTCARD`, `DELETE POSTCARD` | Existing CRUD | covered by the API; screen to be specified |
| `Postcard Type` | `card_type` with a vocabulary of the four legacy types | to be specified after capture |
| `Name`, `Body` | `name`, `body` | covered |
| `To` | New field `addressee` (NEW name) | to be specified after capture |
| Data tags in the body | Same merge engine and picker as letters | to be specified |
| Office-specific postcards | `office_id` on the template (NULL = every office) | covered |
| Rights Full Control / View Only | Two restored codes | to be specified |

### To capture from the live legacy tool

1. `Reports > Custom Postcard`: list, one postcard of each type selected.
2. The add and the edit dialog, `Postcard Type` and `To` opened, the data-tag list.

### Work

RPT-MENU-02, RPT-MENU-03, RPT-MENU-05.

## Blank Insurance Forms

### What it is in the legacy tool

Prints an insurance claim form either blank or filled with one patient's data and the procedures of a ledger date
range, without creating a claim. Reached through `Reports > Blank Insurance Forms`; screen title `Insurance Forms`,
page `NewReports.aspx?RptName=Blank%20Insurance%20Forms` `[D·img 2023]` `[BF1]`. Uses named by the vendor: a claim on
paper to a primary or secondary payer for one patient `[D]` `[BF1]`; a blank form of the most current ADA version kept
on a local computer for internet or power outages `[D]` `[BF2]` `[BF3]`. Rights:
`Reports - Blank Insurance Form Screen Full Control` / `View Only` `[D]` `[G1]`.

| # | Form (`SELECT INSURANCE FORM TO PRINT`, 2023) | Note |
|---|---|---|
| 1 | `ADA Dental Claim Form (2019)` | Selected in the capture |
| 2 | `ADA Dental Claim Form (2012)` | — |
| 3 | `Health Insurance Claim Form (HCFA) 02/12` | Medical claim form `[I]` |
| 4 | `Health Insurance Claim Form (HCFA) 08/05` | Older version of the medical form `[I]` |
| 5 | `Health Insurance Claim Form (HCFA)` | Entry without a version |
| 6 | `Denti-Cal` | Form of a state dental programme `[I]` |

A 2026 article names `ADA 2024 Form` and `HCFA 02/12 PrePrinted` as values of the plan field `Forms to Print`, which
decides the form of real claims; the pre-printed value prints data only, for pre-printed stock `[D]` `[BF4]` `[BF5]`.
Whether the blank-form list now offers a 2024 form is not documented (`[I]`: likely).

| Section | Control | Type | Options | Default |
|---|---|---|---|---|
| (top) | `Print Patient Information` | checkbox | — | off `[I]` (the article tells the user to tick it) |
| `PATIENT` | `Search Patient` with a text box and `SEARCH` | radio | `Last Name`, `First Name`, `Patient ID` | `Last Name` |
| `CRITERIA` | (unlabelled) | radio | `Claim`, `Pre-Auth` | `Claim` |
| `LEDGER DATE RANGE` | `Start Date`, `End Date` | date | — | today / today |
| `PRINT INSURANCE` | `Primary Coverage` | two dropdowns | Coverage category (`Dental` seen) and order (`Primary`, `Secondary` seen) | `Dental`, `Primary` |
| `PRINT INSURANCE` | `Other Coverage` | two dropdowns | Same lists | `Dental`, `Secondary` |
| `OTHER OPTIONS` | `Include do not bill insurance procedure` | checkbox | — | off |
| Footer | `CLEAR CRITERIA`, `PRINT / PREVIEW`, `ADD TO MY FAVORITES` | buttons | — | — |

To print for the secondary payer the two coverage rows are swapped: `Primary Coverage` = `Secondary`, `Other Coverage`
= `Primary` `[D·img 2023]` `[BF1]`.

Not found: the printed forms; the full option lists of the four coverage dropdowns; the current form list; what the
criteria do when `Print Patient Information` is off.

| Tag | Source | Date |
|---|---|---|
| `[BF1]` | "Print a Blank Claim", HC 360056100771; img 17109404085659, 17109464021403 (screen), 17109391061019 (menu) | edited 2023-07-13 |
| `[BF2]` | "Our office sometimes loses internet connection …", HC 115002085812 | edited 2022-08-09 |
| `[BF3]` | "How are we able to prepare for a potential internet or electrical outage?", HC 360015272291 | edited 2023-07-03 |
| `[BF4]` | "How can I change which claim forms are used for an insurance plan?", HC 50348666447643 | v1.1 2026-05-13 |
| `[BF5]` | "I need to use the pre-printed CMS 1500 Form. Where is this setup?", HC 35918213745051 | v1.2, edited 2026-05-14 |

### Where it lands in our module

Stays with the claims feature (brief §1, PD-15): nav entry → `/reports/correspondence#blank_insurance_forms` (07 §1.6
row 22) → page `/forms/blank-insurance` (NEW) once it exists, owned by the claims feature (`FE:src/features/claims/ada`, `BE:app/api/v1/claim_forms.py`). Phase P2, with the
Insurance reports. Two modes on one page:

| Mode | Legacy counterpart | Realisation |
|---|---|---|
| `blank` | `Print Patient Information` off | The ADA 2024 form outline with no data, through the existing form renderer in `form` mode; nothing is stored |
| `prefilled` | `Print Patient Information` on | The form built for one patient from the procedures of a ledger date range, as claim or pre-authorisation, with the chosen coverage in the primary block and the other block, optionally including do-not-bill procedures; rendered by the same builder without creating a claim (NEW endpoint of the claims feature); audited as a print |

Page options (NEW names, owned by the claims feature): `form_code`, `print_patient_information`, `patient_id`,
`claim_kind` (`claims`, `pre_authorization`; the values of 04 §3.5), `date_from`, `date_to`, `primary_coverage` and
`other_coverage` (each a coverage category and order), `include_do_not_bill`.

### What exists today

| Piece | State | Evidence |
|---|---|---|
| ADA 2024 form for one claim | Client renderer (complete form or data-only overlay, calibration page) and server PDF `GET /api/v1/insurance-claims/{claim_id}/reports/ada-claim-form` (`mode` = `form` or `overlay`, offsets), plus a batch by claim ids; the server routes have no frontend caller | `[V]` `FE:src/features/claims/ada/adaClaimFormPdf.ts` L749-779; `BE:app/api/v1/claim_forms.py` L48-107; `BE:app/services/claim_form_service.py` L91; `getAdaClaimFormReport` has 0 callers under `FE:src` |
| Blank form without a claim | None: every route needs a claim id | `[V]` `BE:app/api/v1/claim_forms.py` |
| Form versions | A plan stores `form_to_print` (`ADA2024` default, `ADA2019`, `ADA2012`, `ADA2006`, `CMS1500`); only the 2024 dental form is rendered | `[V]` `BE:app/services/insurance_plan_service.py` L197-203; `FE:src/components/setup/insurance/plan-details/planDetailsModel.ts` L55-61 |
| Medical claim form | None in either repository | `[V]` search for a CMS-1500 renderer: none |
| Menu entry | Placeholder routes `/patient/:patientId/insurance-forms/dental` and `/medical` ("Coming Soon"); their nav entries are commented out | `[V]` `FE:src/App.tsx` L207-208; `FE:src/components/GlobalNav.tsx` L426-438 |
| Rights | `reports_blank_insurance_form_screen_full_control` / `_view_only` removed by the curation | `[V]` `BE:app/services/access_rights_catalog.py` L96-97 |

Gap: the page, the blank mode, the prefilled mode, every form other than ADA 2024.

### Parity checklist

| Legacy item, filter or option | How the new module covers it | Status |
|---|---|---|
| Menu entry `Blank Insurance Forms` | `/reports/correspondence#blank_insurance_forms` → `/forms/blank-insurance` | covered by 07 (UX-05); page to be specified |
| Form `ADA Dental Claim Form (2019)`, `(2012)` | Plan values `ADA2019`, `ADA2012` exist, no renderer | to be specified - product decision; default: offer the 2024 form only (the plan default is `ADA2024`) |
| ADA 2024 form (not in the 2023 list) | Existing ADA 2024 renderer | covered (blank mode: to be specified) |
| Form `Health Insurance Claim Form (HCFA) 02/12` | Plan value `CMS1500` exists, no renderer | to be specified - needed where medical claims are printed |
| Forms `Health Insurance Claim Form (HCFA) 08/05`, `Health Insurance Claim Form (HCFA)` | — | not replicated - superseded versions of the medical form `[I]`; to be confirmed after capture |
| Form `Denti-Cal` | — | to be specified - only if the organisation bills that programme on paper |
| `Print Patient Information` | Mode `prefilled` | to be specified |
| `Search Patient` by `Last Name`, `First Name`, `Patient ID` | Patient picker (`FE:src/features/patients/patientLookup.ts`) | covered |
| `Claim` / `Pre-Auth` | `claim_kind` | to be specified |
| `LEDGER DATE RANGE` | `date_from`, `date_to` on the service date of the procedures | to be specified |
| `Primary Coverage`, `Other Coverage` (category and order) | `primary_coverage`, `other_coverage` | to be specified after capture (option lists) |
| `Include do not bill insurance procedure` | `include_do_not_bill` | to be specified |
| `PRINT / PREVIEW` | PDF in the viewer, print audit row | to be specified |
| `ADD TO MY FAVORITES` | Favorite of the correspondence anchor; the page keeps the last options per user | to be specified |
| `CLEAR CRITERIA` | Reset of the page options | to be specified |
| Blank form kept for outages | Download of the blank PDF | covered by mode `blank` |
| Rights Full Control / View Only | Two restored codes | to be specified |

### To capture from the live legacy tool

1. `Reports > Blank Insurance Forms`: the form list as it is today; each of the four coverage dropdowns opened.
2. One blank print of every form in the list.
3. One print with `Print Patient Information` for a patient with two coverages: as `Claim` and as `Pre-Auth`, primary and swapped.
4. The same run with `Include do not bill insurance procedure` ticked.

### Work

RPT-MENU-02 (search and favorites of the correspondence anchor), RPT-MENU-03 (rights), RPT-MENU-12 (page, modes and form decision).

## Pat Reg/Medical Info Forms

### What it is in the legacy tool

Blank paper forms for new or returning patients: the registration form and the medical and dental questionnaires.
Reached through `Reports > Pat Reg/Medical Info Forms`; screen title `Pat Reg./Medical Info Forms`, page
`NewReports.aspx?RptName=Pat%20Reg%20Med%20Forms` `[D·img 2023]` `[RF1]`. Uses: paper for a patient to fill in; a copy
saved locally for outages `[D]` `[RF1]` `[BF2]`. Rights `Reports - Pat Reg./Medical Info Forms Full Control` /
`View Only` are in the legacy rights list `[V]` `BE:data/Groups.txt` L592-593.

| # | Form (`SELECT REPORT`) | Criteria | Evidence |
|---|---|---|---|
| 1 | `Blank Patient Registration Form` | `Include Medical Questionnaire` (ticked), `Include Dental Questionnaire` (ticked); both ticked in the 2020 and in the 2023 capture | `[D]` `[D·img 2020, 2023]` `[RF1]` |
| 2 | `Medical Questionnaire` | Not shown | `[D·img 2023]` `[RF1]` |
| 3 | `Dental Questionnaire` | Not shown | same |

Footer: `CLEAR CRITERIA`, `PRINT / PREVIEW`, `ADD TO MY FAVORITES` (the 2023 capture shows `UPDATE MY FAVORITES`
because the screen was opened from a favorite).

| Topic | Legacy behaviour | Source |
|---|---|---|
| Printed registration form (retired sample, 2017 or earlier) | Office name, address and phone at the top. Sections: `Patient Personal Information` (title, nickname, name, address, e-mail, birth date, marital status, home, cell and work phone, student, school name, age, sex, driver licence, SSN); `Person responsible/guarantor for paying bills` (the same identity and contact fields); `Do you have Primary Dental Insurance?` and `Do you have Secondary Dental Insurance?` with Yes / No and group, insurance name, employer, subscriber name and address, relationship to patient, birth date, subscriber id; `Patient Medical Information` (check boxes in groups such as `Allergic To`, `Check, if applicable`, `Medication Alerts`); `Dental Questionnaire` | `[D·img 2017]` `[RF1]` |
| Content source | Alerts and questions come from `Setup > Medical > Medical Setup` (Medical Alerts, Medical Questionnaire, Dental Questionnaire), which is global for the organisation | `[D]` `[RF5]` `[CP3]` |
| Logo | Not printed on the registration form, the medical questionnaire or the dental questionnaire | `[D]` `[LT9]` |
| Other languages | No translated form; the vendor suggests a custom letter with the same questions | `[D]` `[RF5]` |
| Related, outside this entry | Patient Print menu > `Medical History`: the patient's filled demographic and medical-history document for review and signature (options: medical history date, `Print Patient Information`, `Print Responsible Party Information`, `Print Insurance Information`); a signature given in online registration does not appear on it | `[D]` `[RF3]` `[RF4]` |

Not found: the criteria of the two questionnaire forms; the current layout of the three printed forms; whether the
header is the working office.

| Tag | Source | Date |
|---|---|---|
| `[RF1]` | "How may we print blank registration forms for the patient to fill out?", HC 115002073871; img 19222663958555 (screen 2023), 360054715972 (screen 2020), 115002815192 (printed form, retired) | edited 2023-09-30 |
| `[RF3]` | "We want our patient to review the demographic information …", HC 115002070211 | edited 2023-06-03 |
| `[RF4]` | "A patient's signature appears on the Medical History form within their online registration packet …", HC 38339864329115 | 2025-06-25 |
| `[RF5]` | "We see patients who speak another language …", HC 32697815775515 | v1.1 2026-05-15 |

### Where it lands in our module

Stays with its owning features (brief §1, PD-15): patient registration (`FE:src/features/add-patient`) and medical
history (`FE:src/features/medical-history`, `BE:app/api/v1/medical_history.py`). Nav entry →
`/reports/correspondence#registration_forms` (07 §1.6 row 23) → page `/forms/registration` (NEW) once it exists. The three forms are rendered on the server from the organisation's own catalogs
(medical alerts `MEDALERT`, medical questions `MEDQUEST`, dental questions `DENTQUEST`), with the header of the working
office. Page options (NEW names): `form_code` (`registration`, `medical_questionnaire`, `dental_questionnaire`),
`include_medical_questionnaire`, `include_dental_questionnaire`. Phase P3 (patients and lists).

### What exists today

| Piece | State | Evidence |
|---|---|---|
| Data-entry twin | Add Patient wizard with medical-alert and questionnaire steps | `[V]` `FE:src/features/add-patient/steps/MedicalAlertsStep.tsx`, `QuestionnairesStep.tsx` |
| Catalogs | Medical alerts and questionnaire definitions (`MEDALERT`, `MEDQUEST`, `DENTQUEST`), maintained in Setup › Medical | `[V]` `FE:src/components/setup/medical/definitionsService.ts`; `BE:app/db/models/patients.py` L541, L569-575 |
| Filled medical-history PDF | `GET /api/v1/patients/{patient_id}/medical-history/pdf`; no frontend caller, no print button | `[V]` `BE:app/api/v1/medical_history.py` L328-343; `getPatientMedicalHistoryPdf` has 0 callers under `FE:src` |
| Blank registration form, blank questionnaires | None | `[V]` no such path in `FE:openapi.json` |
| Patient Print menu | A stub ("Print Reports - Coming Soon") | `[V]` `FE:src/components/PatientSecondaryNav.tsx` L270 |

Gap: the three blank forms and the page.

### Parity checklist

| Legacy item, filter or option | How the new module covers it | Status |
|---|---|---|
| Menu entry `Pat Reg/Medical Info Forms` | `/reports/correspondence#registration_forms` → `/forms/registration` | covered by 07 (UX-05); page to be specified |
| `Blank Patient Registration Form` | Server-rendered blank form with the sections of the legacy sample | to be specified after capture (current layout) |
| `Include Medical Questionnaire` (default on) | `include_medical_questionnaire` (default true) | to be specified |
| `Include Dental Questionnaire` (default on) | `include_dental_questionnaire` (default true) | to be specified |
| `Medical Questionnaire` | Blank form from the `MEDALERT` and `MEDQUEST` catalogs | to be specified after capture (criteria, layout) |
| `Dental Questionnaire` | Blank form from the `DENTQUEST` catalog | to be specified after capture |
| Office header, no logo | Letterhead text of the working office; the logo is a decision | to be specified |
| `PRINT / PREVIEW` | PDF in the viewer; no patient data, so no patient manifest | to be specified |
| `ADD TO MY FAVORITES` | Favorite of the correspondence anchor | to be specified |
| Translated forms | A second template per language is possible once the forms are template-driven | not replicated - the legacy tool has no translated form either |
| Patient Print menu > `Medical History` (related) | The existing filled medical-history PDF behind the Print menu | to be specified (button only; the endpoint exists) |
| Rights Full Control / View Only | `reports_pat_reg_medical_info_forms_full_control` / `_view_only` (kept in the catalog) | to be specified (enforcement) |

### To capture from the live legacy tool

1. `Reports > Pat Reg/Medical Info Forms`: each of the three forms selected (criteria of forms 2 and 3).
2. Printed output: the registration form with both questionnaires, with neither, and each questionnaire alone.
3. Patient Print menu > `Medical History`: the options dialog and one output (context for the related row).

### Work

RPT-MENU-02 (search and favorites of the correspondence anchor), RPT-MENU-03 (rights), RPT-MENU-13 (forms and page).

## My Favorites

### What it is in the legacy tool

A per-user list of report criteria saved from a criteria screen. Reached through `Reports > My Favorites`; screen title
`My Favorites`, page `NewReports.aspx?RptName=My%20Favorites` `[D·img 2023]` `[FV1]`.

| Topic | Legacy behaviour | Source |
|---|---|---|
| Saving | `ADD TO MY FAVORITES` in the footer of a criteria screen stores the report with its current criteria (the article text calls the button "Add Report to Favorites"; the captures read `ADD TO MY FAVORITES`). The button is present on the report categories and on Letters, Postcards, Labels and Blank Insurance Forms, and `UPDATE MY FAVORITES` is seen on Pat Reg/Medical Info Forms | `[D]` `[FV2]`; `[D·img 2023-2025]` (captures of those screens) |
| The page | Header "NUMBER OF REPORTS: n"; grid columns `SR. NO`, `NAME` (a link), `BREADCRUMB` (for example `Reports->Daily Reports->Daily Journal`), `DESCRIPTION`, `CREATED ON` (date and time), `CREATED BY` (login), `UPDATED ON`, `UPDATED BY`, `ACTION` (trash icon); a pager | `[D·img 2023, 2025]` `[FV1]` `[FV2]` |
| Naming | `NAME` and `DESCRIPTION` both show the report's name in the two captures; no rename control is visible | `[D·img]`; that renaming is impossible is `[I]` |
| Opening | The name opens the report's criteria screen with the saved criteria; the footer button then reads `UPDATE MY FAVORITES` | `[D]` `[D·img 2025]` `[FV2]` |
| One per report | A report has one saved version, changed with `UPDATE MY FAVORITES` | `[R]` `[R2]` (vendor training module read by the earlier pass) |
| Office | A favorite runs for the office the user was logged into when it was saved; to run it for another office the user changes the office criterion each time | `[D]` `[FV1]` |
| Delete | Trash icon, with a confirmation dialog | `[D]` `[FV2]` |
| Broken favorite | When `PRINT / PREVIEW` does nothing on a favorite, the documented repair is to delete it and save it again from the breadcrumb | `[D]` `[FV2]` |
| Sharing, scheduling | Not documented | `[R]` `[R1]` |
| Rights | No right for the entry in the rights catalogue or in the legacy rights list | `[D]` `[G1]`; `[V]` `BE:data/Groups.txt` |

Not found: whether a favorite can be renamed; whether two favorites of one report can coexist; the sort order of the
page; whether favorites follow the user across offices.

| Tag | Source | Date |
|---|---|---|
| `[FV1]` | "I have saved reports in the 'My Favorites' section and … I get the office I set it up in …", HC 360059445452; img 17205119744283 (page) | edited 2023-07-17 |
| `[FV2]` | "I saved a report to My Favorites but nothing happens when I press Print/Preview …", HC 38203450746139; img 38203892730907 (page), 38203892732699 (opened favorite) | v1.1 2026-05-15, captures 2025 |

### Where it lands in our module

A hub feature. Storage, semantics and API are owned by `02_architecture.md` §8 (`report_saved_views`, `report_favorites`,
`report_recents`, `report_shares`; API rows 24-36; work items ENG-28, ENG-29); the page and the star controls by
`07_ux_blueprint.md`: Library › Favorites `/reports/library/favorites` (07 §1.6 row 24, §2.1 row 6), the start strip of
`/reports` (first eight favorites), stars on every card and runner header, object types `report`, `saved_view`,
`dashboard`, `custom_report` (07 §6.4; UX-19, UX-20); rights by `08_security_compliance.md` (a private view or favorite
needs no extra right; sharing needs `reports_share`). Phase P1 (brief §6). Legacy actions (07 §4.8): `ADD TO MY
FAVORITES` opens the save-view dialog with "Add to favorites" ticked (saved view + favorite); `UPDATE MY FAVORITES`
updates the saved view.

### What exists today

| Piece | State | Evidence |
|---|---|---|
| Report favorites | None | `[V]` `FE:src/components/reports/components/ReportCatalog.tsx` (no favorite control); no favorites table or route under `BE:app/**` (search) |
| Saved views | Browser-local only: `localStorage` key `dentc:reports:views:<user_id>:<reportId>` | `[V]` `FE:src/components/reports/lib/savedViews.ts` L21-32 |
| Precedent | The Utilities hub keeps favourites, recents and a run history in `localStorage` | `[V]` `FE:src/components/utilities/lib/utilitiesStorage.ts` L13-62 |

Gap: server-side favorites and saved views (planned in 02 §8).

### Parity checklist

| Legacy item, filter or option | How the new module covers it | Status |
|---|---|---|
| `ADD TO MY FAVORITES` on report criteria screens | Saved view plus favorite (02 §8.2; 07 §4.8) | covered by 02 §8 and 07 |
| `ADD TO MY FAVORITES` on Letters, Postcards, Labels | Saved view of the recipient list with the launcher state in `layout` | covered by 02 §8; launcher to be specified |
| `ADD TO MY FAVORITES` on Blank Insurance Forms and Pat Reg/Medical Info Forms | Favorite of the correspondence anchor: value `link` for `report_favorites.object_type` (NEW value, requested of 02 §8.1 and 07 §6.4, which list four types without it); the page keeps the last options per user | to be specified |
| `UPDATE MY FAVORITES` | Update of the saved view (API row 27) | covered |
| Header "NUMBER OF REPORTS" | Count on the favorites page | request to 07 |
| Columns `NAME`, `BREADCRUMB`, `DESCRIPTION`, `CREATED ON`, `CREATED BY`, `UPDATED ON`, `UPDATED BY` | View name; hub path with the legacy menu path as secondary text; description; `created_at`, `created_by`, `updated_at`, `updated_by` of `report_saved_views` | request to 07 (the data exists in 02 §8.1) |
| `ACTION` trash with confirmation | Remove the favorite (API row 34); deleting the view is a separate action | covered |
| One saved version per report | Any number of named views per report, one of them the default | covered, extended |
| Office fixed at save | `office_policy`: `follow_working_office` by default; `fixed` reproduces the legacy behaviour | covered, improved (02 §8.2) |
| Favorite stops working after a report change | `definition_version` with `param_migrations` on resolve and visible notices | covered (02 §8.2) |
| Opening shows the criteria, it does not run | An `interactive` report opens `idle` with the resolved parameters; only "Run" on a card runs once (`run_on_open`) (07 run lifecycle table, §4) | covered by 07 |
| No sharing, no scheduling | `report_shares`; schedules created from a saved view (02 §9) | covered, extended |
| Rename, duplicates, sort order | Named views; manual order (`sort_order`) | covered; legacy behaviour to be confirmed after capture |

### To capture from the live legacy tool

1. `Reports > My Favorites` with at least three favorites, two of them from one category.
2. The same report saved twice with different criteria: does a second row appear or is the first replaced?
3. Any rename or edit control on the page; the delete confirmation; the page after logging into another office.
4. A favorite of Letters or Labels opened from the page.

### Work

Owned by 02 (ENG-28, ENG-29) and by 07 for the page (UX-19, UX-20). This document adds only the favorite of a
correspondence anchor (RPT-MENU-02).

## Search Report

### What it is in the legacy tool

A keyword search across the report menus. Reached through `Reports > Search Report`; screen title `Search Reports`,
page `NewReports.aspx?RptName=Search%20Report` `[D·img 2023]` `[SR1]`.

| Topic | Legacy behaviour | Source |
|---|---|---|
| Input | One box (labelled `REPORT FORMAT` on the 2023 screen, `Enter Search Text` on the 2018 screen) and `SEARCH`. A term becomes a chip with a remove mark, so several terms can be entered; the vendor speaks of terms and short phrases | `[D]` `[D·img 2018, 2022, 2023]` `[SR1]` |
| Results | Header of the form "n REPORTS FOUND" with a pager (17 results on 4 pages in 2022; 48 on 4 pages in 2018). Per result: a thumbnail tile, the report name as a link to the report's criteria screen, the breadcrumb, a description of one or two sentences | `[D]` `[D·img 2018, 2022]` `[SR1]` |
| Thumbnail | 2018: a miniature of the report output. 2022: a placeholder reading "PREVIEW COMING SOON" | `[D·img]` `[SR1]` |
| Scope | Results come from every menu, Office Reports folders included (in the vendor's demo account also folders of several customers); in 2018 also from Group Reports | `[D·img 2018, 2022]` `[SR1]` |
| Matching | Not documented. For the term "production" the first page lists `Executive Day Sheet`, whose name lacks the term while its description contains it, so names and descriptions are both searched | `[I]` from `[D·img 2022]` |
| Rights | No right for the entry | `[D]` `[G1]` |

Not found: the matching rules (prefix or whole word, all terms or any term, ranking); the page size; whether results
respect the user's rights.

| Tag | Source | Date |
|---|---|---|
| `[SR1]` | "How can we quickly find reports in Denticon?", HC 360020701671; img 17156990459675 (2023 screen), 10689208181403 (2022 results), 360016706871 (2018 results) | edited 2023-07-15 |

### Where it lands in our module

A hub feature (brief §1: search across names, legacy aliases and descriptions). The data is owned by
`02_architecture.md`: the catalog call (API row 1, `GET /reports/catalog`) returns key, title, category, legacy names,
description, keywords, `access`, `is_favorite` and `last_run_at` per entry, already filtered by the caller's rights;
definitions carry `legacy_names[]`, `description` and `keywords[]` (02 §3.1; ENG-05). The search box, index, ranking and
result list are owned by `07_ux_blueprint.md` §1.5: index built in the browser from the catalog, dashboards, metrics
and own saved views; every token must match (AND); ranking exact title > title prefix > exact legacy alias > alias or
title word > keyword > description word; route `/reports?q=`; the nav entry `Search Report` opens the command palette
(07 §3.1; UX-05). The pre-`f7332be` path `/reports/search` redirects (07 §2.2). Phase P0 for reports; dashboards,
worklists, custom reports and the correspondence anchors join the index as they ship.

### What exists today

| Piece | State | Evidence |
|---|---|---|
| Catalog search | Substring match on `title`, `description` and `category` over the six client-side reports; no legacy names, no keywords | `[V]` `FE:src/components/reports/components/ReportCatalog.tsx` L12-23; `FE:src/components/reports/reportCatalog.ts` L13-20 |
| Legacy menu path | No route for `/reports/search` or for the other legacy paths of this document | `[V]` `FE:src/App.tsx` L255-298 |

Gap: legacy names, descriptions for all reports, non-report entries, a result list.

### Parity checklist

| Legacy item, filter or option | How the new module covers it | Status |
|---|---|---|
| Search box with term chips | Hub search box; several tokens, all must match (07 §1.5); chips are not specified | covered by 07, different input |
| Match on the report name | `title` | covered by the catalog payload |
| Match on the description | `description`, `keywords[]` | covered |
| Legacy names, current and old | `legacy_names[]` (AD-8); content owned by `catalog/<category>.md` | covered |
| Result count | Header of the result list | request to 07 (not in §1.5) |
| Result name as a link to the criteria screen | Enter opens the report in the user's preferred frame (07 §1.5) | covered by 07 |
| Breadcrumb | Hub path ("Financial › Daily") and the matched legacy alias on each row (07 §1.5) | covered by 07; the legacy menu path itself is a request |
| Description | `description` | covered |
| Thumbnail tile | — | not replicated - the legacy tile is a placeholder today; a sample-output image per report is optional later |
| Pager | A single filtered list | not replicated - the catalog holds a few hundred entries |
| Office Reports in the results | Custom reports are catalog entries | covered |
| The eight correspondence and form entries found by name | The correspondence anchors in the search index with their legacy names; 07 §1.5 does not index them yet | to be specified (RPT-MENU-02) |
| Old-tree entries in the results | Old names resolve to the successor through `legacy_names[]`; a search for `Reports (Old)` shows an explanatory card | to be specified |
| Results limited by rights | Catalog entries are filtered by the report right | covered |
| Matching rule | 07 §1.5: lower case, punctuation normalised, AND over tokens, ranked title > alias > keyword > description | covered by 07; legacy rule to be confirmed after capture |

### To capture from the live legacy tool

1. `Reports > Search Report`: results for one term, for two terms and for a phrase; a term that occurs only in a description; a term with no result.
2. The last result page (page size) and one result opened.
3. The same search as a user without the right to one category.

### Work

Owned by 02 (ENG-05) and by 07 for the search UI. This document adds the correspondence anchors and the old-tree card to the index
(RPT-MENU-02).

## Reports (Old)

### What it is in the legacy tool

The menu tree that preceded the consolidated Reports menu of October 2021 `[D]` `[G4]`, kept as a fly-out at the bottom
of the new menu. During the transition both were top-level menus (`Reports` = the old tree, next to `Report New`)
`[D·img 2020]` `[RO8]`. Current vendor articles still send users into it for functions the new menu lacks `[D]` `[RO2]`
`[RO3]` `[RO4]` `[RO6]`.

First level (2023, in menu order; a slash marks a separator): `Daily Reports`, `Ledger Reports`, `Management Reports`,
`Insurance Reports`, `Appointments Reports`, `Treatment Plan Reports`, `Referral Reports`, `Recall Reports`,
`Ortho Reports` / `Statements`, `Lists ▶` / `Group Reports ▶`, `Office Reports ▶` / `Letters`,
`Batch Collection Letters`, `Postcards`, `Labels`, `Custom ▶` / `My Reports`, `Excel Reports` /
`Blank Insurance Forms`, `Pat Reg./Medical Info Forms` / `Search Report`. `Group Reports ▶` holds
`Appointments Reports`, `Daily Reports`, `Insurance Reports`, `Management Reports`, `Other Reports`, `Referral Reports`
`[D·img 2023]` `[RO1]`. The old tree has no `Monthly Reports`, `Interactive Reports`, `Advanced Custom Letter` or
`My Favorites`; the 2020 menu also had `Dashboard` `[D·img 2020]` `[RO8]`.

| Old path | Leaf | What is documented | Source |
|---|---|---|---|
| `Treatment Plan Reports` | `Treatment Plan Status - Detail`, `Treatment Plan Analysis` | Names and use | `[D]` `[G2]` |
| `Recall Reports` | `Recall` (due or overdue and not scheduled) | Name and use | `[D]` `[G2]` |
| `Insurance Reports` | `Procedures on Hold`; `Capitation Fee Schedule` | Names | `[D]` `[G2]` `[RO5]` |
| `Daily Reports` | `Daily Journal - Detail (Landscape)` | Name, description | `[D·img 2018]` `[SR1]` |
| `Group Reports > Daily Reports` | `Daily Journal - Detail`, `Daily Journal - Summary`; `Special Transaction Report` (the vendor writes the path as `Group Reports > Daily Reports > Management reports`) | Names, descriptions | `[D·img 2018]` `[SR1]`; `[D]` `[G2]` |
| `Group Reports > Management Reports` | `Production by Codes`, `Production by Codes - Provider`, `Production by Category`; `Aging Report by Home Office` | Names and use | `[D]` `[G2]` `[OR1]` |
| `Group Reports > Appointments Reports` | Online-booked appointments | The vendor points here for them | `[D]` `[RO7]` |
| `Group Reports > Other Reports` (screen `Group Reports - Other Reports`, old layout: `Select Report`, `Report Criteria`, `Print / Preview`) | `New Patients List`, `Tx Plan Status Report`, `User Activity Report`, `Tickler`, `Patient Medicaid ID Report`, `Appointments by Provider` | `Tickler`: criteria `User`, `Posted Date Range`. `User Activity Report`: users and dates; two reports, `Login Activity` (logins with IP address, newest first) and `All Activity` (every page visited, with the patient in context) | `[D]` `[D·img 2023]` `[RO2]` `[RO3]` |
| `Lists > Prescription/Drug List` | `Prescription Detail`, `Drug List` | `Prescription Detail` criteria: `Print report in Excel`, `Offices`, `Date Range` (`Start`, `End`), `Provider`, `User` | `[D]` `[D·img 2024]` `[RO4]` |
| `Lists > Procs/Fee List` | `Fee Schedule List` | Name | `[D]` `[RO5]` |
| `Batch Collection Letters` (screen `Batch Collection Letters.`) | The collection letter series | `Date`, `Include Inactive Patients`, `Exclude Resp. Type` (`Select`, `Clear`), display `Last collection letter date`, `Generate Collection Letters`, a list with a `Print` column, `Print / Preview`, `Update Accounts`. Driven by `Setup > Collection Letters Setup`: `Office Min Balance Over`, `Office Min Balance Age Over (Days)`, rows `Letter 1` to `Letter 10` with `Letter`, `Letter Interval Over (Days)`, `Apply Finance Charge` | `[D]` `[D·img 2023]` `[RO6]` |
| `Custom ▶` | Custom letters, custom postcards | Older path of the two authoring screens | `[D]` `[CL4]` `[CP1]` |
| `Excel Reports` | Reports produced in Excel format (right `Reports - Excel Reports`) | Purpose only | `[D]` `[G1]`; `[R]` `[R1]` |

Old report names and their successors in the new menu are tabulated in `[R2]` (for example
`research/legacy_report_outputs_daily_my.md` §7).

Not found: the children of `Lists ▶`, `Custom ▶`, `Office Reports ▶` and of five of the six `Group Reports` nodes; the
report list of each old category screen; the content of `Excel Reports`.

| Tag | Source | Date |
|---|---|---|
| `[RO1]` | Captures of the open `Reports (Old)` fly-out: img 16859375032987 (in HC 115002083412), img 19320995677339 (in HC 115002094732) | 2023 |
| `[RO2]` | "We would like to review all the Tickler messages …", HC 115002083412; img 16859376686747 | edited 2023-07-03 |
| `[RO3]` | "We wish to monitor our user's login activity …", HC 115002093452 | edited 2023-07-08 |
| `[RO4]` | "Running a Prescription History Report by Provider or User", HC 29672330231835; img 29672273835931 | 2024-09-30, updated 2026-08-06 |
| `[RO5]` | "How does the fee schedule effective dates reflect on the fee schedule reports?", HC 360054029692 | edited 2023-06-22 |
| `[RO6]` | "… I've indicated that the account is in Collections … How do I send a collection letter?", HC 115002094732; img 16106967507099 (batch screen), 19320959166107 (setup) | edited 2023-10-04 |
| `[RO7]` | "How is our office able to be 'paperless'?", HC 360015067551 | edited 2023-10-03 |
| `[RO8]` | Older menus in retired images of HC 115002073871: img 360054715892 (2020), 115002815132 (2017 or earlier) | 2017-2020 |

### Where it lands in our module

The menu node is not replicated (brief §1). What that means in the module:

| Old-tree content | Treatment | Owner |
|---|---|---|
| Old report names | Searchable aliases in `legacy_names[]` of the successor definition (02 §3.1, AD-8) | `catalog/<category>.md` |
| `Group Reports ▶` | Replaced by `office_scope` on every report (04 §6); the 13 `reports_group_reports_*` rights are deactivated | 04 §6; 08 §2.2 F |
| `Excel Reports` | Replaced by `output_format = xlsx` on every report with the right `reports_export_data_files` | 04 §3.9; 08 §2.2 B |
| A search for `Reports (Old)` or an old path | An explanatory card naming the successor | hub search (07) |
| Functions that exist only in the old tree | Decided one by one in the checklist below. For these the brief's "superseded by the catalog" does not hold yet; the default here is to specify them after capture, not to restore the menu | this document |

### What exists today

| Piece | State | Evidence |
|---|---|---|
| Old menu | None; the nav comment records that legacy placeholder entries were removed | `[V]` `FE:src/components/GlobalNav.tsx` L593-594 |
| Collection letters | Batch merge route documented for the `CS001..CS009` collection templates; a commented-out nav stub "Collection Letters Setup"; no series logic, no settings | `[V]` `BE:app/api/v1/letters.py` L74; `FE:src/components/GlobalNav.tsx` L1238 |
| Login activity | Only `users.last_login_at`; no login history | `[V]` `BE:app/db/models/identity.py` L59; `BE:app/services/auth_service.py` L109 |
| Tickler | No tickler data; the two `utilities_tickler_*` rights were removed; a simulated Utilities entry remains | `[V]` `BE:app/services/access_rights_catalog.py` L244-245; `FE:src/components/utilities/utilityCatalog.ts` L492-502 |
| Medicaid id | Column `patients.medicaid_id` | `[V]` `BE:app/db/models/patients.py` L65 |
| Prescription history | List endpoint `GET /api/v1/prescriptions` with `provider_id` and office-scope parameters; no report | `[V]` `FE:src/api/generated/model/listPrescriptionsParams.ts` |

### Parity checklist

| Legacy item, filter or option | How the new module covers it | Status |
|---|---|---|
| Fly-out `Reports (Old) ▶` | — | not replicated - brief §1 |
| Nine old category nodes, `Statements`, `Lists ▶`, `My Reports`, `Letters`, `Postcards`, `Labels`, `Custom ▶`, `Blank Insurance Forms`, `Pat Reg./Medical Info Forms`, `Search Report`, `Office Reports ▶` | The same-named entries of the new menu and their sections above | not replicated - duplicates of current entries; old names kept as aliases |
| `Group Reports ▶` and its six nodes | `office_scope` on every report | not replicated - superseded by the office and office-group selector |
| `Excel Reports` | `output_format = xlsx` | not replicated - superseded by the output format of each report |
| `Treatment Plan Status - Detail`, `Treatment Plan Analysis`, `Recall`, `Procedures on Hold`, `Production by Codes`, `Production by Codes - Provider`, `Production by Category`, `Special Transaction Report`, `Daily Journal - Detail`, `Daily Journal - Summary`, `Daily Journal - Detail (Landscape)`, `Aging Report by Home Office` | Aliases of the successor reports listed in `[R2]` | covered by `legacy_names[]` (content in `catalog/<category>.md`) |
| `Capitation Fee Schedule`, `Fee Schedule List`, `Drug List` | Setup lists of the catalog | covered (aliases) |
| `New Patients List`, `Tx Plan Status Report` | `lists.patient_list_new_patient`, `treatment_plan.treatment_plan_status` (provisional keys) | covered (aliases); content to be confirmed after capture |
| `Appointments by Provider` | `appointment.appointment_detail` grouped by provider | to be specified after capture |
| `Patient Medicaid ID Report` | A column and filter of `lists.patient_list` over `patients.medicaid_id` | to be specified after capture |
| `User Activity Report` (`Login Activity`, `All Activity`) | A new audit report in the `audit` family of 08 §6.8; needs login and page-view events, which are not recorded today | to be specified - request to 08 |
| `Tickler` report | A message log report only if the practice still uses ticklers | to be specified - product decision; no tickler data exists |
| `Prescription Detail` | New list `lists.prescription_detail` (NEW) over the prescriptions list: offices, date range, provider, user | to be specified |
| `Batch Collection Letters` and `Collection Letters Setup` | Collection letter series as a bulk action of `worklists.patient_ar` (06 §6.8) with per-office settings (minimum balance, minimum age, up to ten letters with interval and finance-charge flag) | to be specified |
| Online-booked appointments under `Group Reports > Appointments Reports` | The booking request inbox; a funnel report is an option | to be specified after capture |

### To capture from the live legacy tool

1. `Reports > Reports (Old) ▶` with every sub-menu opened: `Lists ▶`, `Group Reports ▶` and each of its six nodes, `Office Reports ▶`, `Custom ▶`.
2. The report list (`Select Report`) of every old category screen, to find names with no successor.
3. `Group Reports > Other Reports`: each of the six reports selected, criteria visible, one output each.
4. `Lists > Prescription/Drug List`: both reports, one output of `Prescription Detail`.
5. `Batch Collection Letters` after `Generate Collection Letters` (the list and its columns) and `Setup > Collection Letters Setup` in edit mode.
6. `Excel Reports`: the screen and its report list.

### Work

Aliases are owned by the category catalogs. This document adds the capture (RPT-MENU-01), the collection letter series
(RPT-MENU-10) and the decision and specification of the old-only reports (RPT-MENU-14).

## Work items

Only work that no other plan document owns. Worklists are owned by 06 (DASH-28 to DASH-36), custom reports by 02 and 06
(ENG-53, ENG-54, DASH-51), favorites, saved views and the catalog by 02 (ENG-05, ENG-28, ENG-29), action dispatch by 02
(ENG-49), the hub pages, the correspondence links page and the legacy redirects by 07 (UX-05, UX-19, UX-20,
`legacyRedirects.ts`). Sizes as in brief §4. Defaults assumed until the product owner decides otherwise:
recipient lists for correspondence run on the report engine; the legacy letter-group labels replace ours; only the ADA
2024 dental form is offered until a payer needs another; the old-only reports are specified, not dropped.

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-MENU-01 | Capture pass on the live legacy tool for the thirteen entries; parity checklists of this document completed | P0 | M | FLT-23 | Every row of the Capture list has a screenshot or a recorded "not present for this organisation"; no checklist row still reads "to be specified after capture"; the Office Reports and Reports (Old) trees are listed leaf by leaf |
| RPT-MENU-02 | Search and favorites for the eight correspondence and form anchors of `/reports/correspondence` (07 `externalLinks.ts`): per anchor the legacy names, keywords, owning-feature right and launch target; anchors in the 07 §1.5 search index and in favorites (`link` object type); an explanatory search card for `Reports (Old)` and old-tree paths; the launch link of each anchor switches from "Not available yet" to the owning feature's route when it ships | P1 | M | UX-05, ENG-05, ENG-29, SEC-13 | Searching each of the thirteen legacy labels returns exactly one destination; an anchor can be added to favorites and survives logout; an anchor's launch link is hidden when the caller lacks the right of its feature; every legacy path of 07 §2.2 for the thirteen entries redirects (no empty shell) |
| RPT-MENU-03 | Rights for the correspondence and form screens: reuse of the kept codes, restore of the removed ones, enforcement on the routes | P1 | S | SEC-01 | The catalog holds a View Only and a Full Control code for letters, postcards, labels, letter templates, postcard templates, blank insurance forms and registration forms; every batch, template and form route answers 403 without the code |
| RPT-MENU-04 | Merge engine parity: addressee (patient or responsible party), the data tags missing from the catalog, question prompts with pick lists for a single recipient, unknown-token report over the template corpus | P2 | M | — | Every data tag captured from the legacy data dialog resolves or is listed as unsupported with a reason; a template with prompts asks once per prompt for one recipient and is refused for a batch with a clear message; the corpus report shows no unknown token |
| RPT-MENU-05 | Template authoring for letters and postcards (legacy Custom Letter and Custom Postcard): list with type filter and search, editor, data-tag picker, prompt builder, addressee, office availability at save, quick-print flag, change stamp | P2 | L | RPT-MENU-03, RPT-MENU-04 | A user with the Full Control code creates, edits and deletes a letter and a postcard; View Only sees list and preview; text formatted in the editor prints the same way; a body over the length limit is rejected with the count |
| RPT-MENU-06 | Correspondence print service: batch PDF for letters with window-envelope address blocks, postcards four per sheet, volumes and job mode above 500 recipients, recipient history, no-correspondence exclusion, print audit with patient manifest | P3 | L | RPT-MENU-04, ENG-14, ENG-23, ENG-38 | A run of 1,200 recipients completes as a job in three volumes; each recipient has one history row and, when chosen, one patient note; excluded recipients are counted before printing; the run is audited with its manifest |
| RPT-MENU-07 | Label renderer and `labels` action handler: sheet stock of 30, address and chart layouts, stock setting per office, start position | P3 | M | ENG-23, ENG-49 | A selection of 61 rows prints three sheets (30, 30, 1) aligned to the stock within 1 mm on the reference printer; rows without a mailing address are skipped and reported |
| RPT-MENU-08 | Recipient lists for correspondence: the four NEW `lists.*` definitions of the Letters section; the three correspondence actions declared on the recall, patient, responsible-party, provider, employer, carrier and referral-source lists | P3 | L | RPT-MENU-01, ENG-49, DATA-05, DATA-16, DATA-19, DATA-41, DATA-53 | Each legacy criteria control of the Letters, Postcards and Labels screens maps to a parameter with the legacy default, checked by the definition lint; the three actions appear on every listed definition |
| RPT-MENU-09 | Correspondence workspace: launchers for Letters (7 groups), Postcards (4 types) and Labels (12 types) with the legacy criteria, recipient preview, print, labels for the same recipients, patient-note option, batch history | P3 | L | RPT-MENU-06, RPT-MENU-07, RPT-MENU-08, DASH-31, FLT-10 | Each of the 23 legacy items runs from its launcher and from a report or worklist selection with the same output; a launcher saved to favorites reopens with its criteria and template |
| RPT-MENU-10 | Collection letter series on the patient A/R worklist (legacy Batch Collection Letters and Collection Letters Setup) | P3 | M | RPT-MENU-06, DASH-35, DATA-35 | With a three-letter series and 30-day intervals an account receives letter 2 no sooner than 30 days after letter 1; updating the accounts advances each account by one step exactly once; no finance charge posts without confirmation |
| RPT-MENU-11 | Advanced letter templates (legacy Advanced Custom Letter): block editor, embedded patient images, referral data tags, ledger date-range prompt | P4 | L | RPT-MENU-05, DATA-40 | A referral form with two embedded images prints as previewed; the ledger tag asks for a date range and prints the charges of that range |
| RPT-MENU-12 | Blank insurance forms page: blank ADA 2024 form, patient-prefilled form from a ledger date range, recorded decision per legacy form version | P2 | M | RPT-MENU-03 | The blank form holds no patient data; the prefilled form for a patient and date range equals the claim form of the same procedures; each of the six legacy forms is covered or carries a signed decision |
| RPT-MENU-13 | Registration and questionnaire forms: blank patient registration form with optional medical and dental questionnaires, the two questionnaire forms, the filled medical-history PDF on the patient Print menu | P3 | M | RPT-MENU-03 | The blank form lists the organisation's active alerts and questions in setup order; both include switches work; the Print menu opens the medical-history PDF and writes a print audit row |
| RPT-MENU-14 | Reports reachable only through the legacy `Reports (Old)` tree: decision and specification per report | P3 | M | RPT-MENU-01 | Each captured old-tree leaf has a successor key, an alias entry, a new definition request or a signed reason for not replicating it |
| RPT-MENU-15 | Office Reports of the organisation: every captured report mapped to a standard report, an alias or a seeded custom report | P5 | M | RPT-MENU-01, ENG-53, DASH-51 | Every report of the captured Office Reports tree runs in the hub under its legacy name or carries a signed "not needed"; seeded custom reports pass the builder validation |

## Capture list

One pass on the live legacy tool, logged in as a user of the organisation with full report rights. Per screen: the
default state, every dropdown and picker opened, and one generated output where the screen prints. Priority A decides
scope and must be done first; B is needed before the P3 specifications; C confirms behaviour.

| Priority | Legacy screen | What to capture | Needed for |
|---|---|---|---|
| A | `Reports > Office Reports ▶` | The fly-out (compare with the 24 labels of `[G7]`); every folder opened; for each report of the organisation's folder the criteria screen and one output (PDF and Excel) | Scope of custom reports and aliases |
| A | `Reports > Reports (Old) ▶` | Every sub-menu opened (`Lists ▶`, `Group Reports ▶` with its six nodes, `Office Reports ▶`, `Custom ▶`); the report list of each old category screen; `Excel Reports`; `Group Reports > Other Reports` with each report's criteria and one output; `Lists > Prescription/Drug List` | Decision on old-only reports |
| A | `Reports > Interactive Reports ▶` | The open fly-out | Whether more than two queues exist |
| A | `Reports > Blank Insurance Forms` | The form list of today; the four coverage dropdowns opened; one blank print per form; one print with `Print Patient Information` as claim and as pre-authorisation | Form-version decision (P2) |
| A | `Reports > Custom Letter` | List filter opened; add and edit dialogs; `Letter Type` opened; the complete data-tag list with descriptions; the add-question dialog with `Pick List`; the `QUICK PRINT` column; the length-limit error | Merge parity and authoring (P2) |
| A | `Reports > Custom Postcard` | List; add and edit dialogs; `Postcard Type` and `To` opened; data-tag list | Authoring (P2) |
| A | `Setup > Security > Groups` | The rights whose label starts with `Reports -` for the thirteen entries | Right names (P1) |
| B | `Reports > Letters` | Each of the seven groups, `SELECT LETTER` opened, pickers opened; `Financial Communiques` with the dropdown closed; one printed batch per addressee kind with and without `Envelope Printing`; the `LABELS` output; the patient-note confirmation and the resulting note | Recipient lists, print service (P3) |
| B | `Reports > Postcards` | Each of the four types; `POSTCARD` opened; one printed sheet per type | Recipient lists, postcard layout (P3) |
| B | `Reports > Labels` | Each of the twelve types; one printed sheet per type; `EZ-Pay Labels` criteria and output | Recipient lists, label layouts (P3) |
| B | `Reports > Interactive Reports > Unsigned Progress Notes` | The list with rows; the review-and-sign page with each signing tab; the list after signing | Worklist parity (06) |
| B | `Reports > Interactive Reports > Eligibility Verification` | The two header dropdowns opened; a row with secondary insurance; the carrier filter; the quick patient overview; each tab of `View Cov Details`; the update-coverage button | Worklist parity (06) |
| B | `Reports > Pat Reg/Medical Info Forms` | Each of the three forms selected; printed registration form with both questionnaires and with neither; each questionnaire alone | Form layouts (P3) |
| B | `Reports (Old) > Batch Collection Letters` and `Setup > Collection Letters Setup` | The generated list with its columns; the setup screen in edit mode | Collection letter series (P3) |
| B | `Setup > Offices > Office Assignment > Letters` | The tab, the `Letter Type` dropdown, the copy-from-office dialog | Office availability of templates (P2) |
| C | `Reports > My Favorites` | Page with three favorites; the same report saved twice; rename or edit controls; delete confirmation; the page from another office; a favorite of Letters opened | Favorites page (P1) |
| C | `Reports > Search Report` | Results for one term, two terms and a phrase; a description-only match; a term without result; last page; the same search without a category right | Hub search (P0) |
| C | `Reports > Advanced Custom Letter` | List; add dialog on both tabs; each block with its settings; one referral form with an image; the ledger date-range prompt | Advanced templates (P4) |
| C | Patient Print menu (`Letters`, `HIPAA Letters ▶`, `Labels ▶`, `Medical History`) | The menu and each dialog (context for the related rows; outside the Reports menu) | Related rows of Letters, Labels and forms |
