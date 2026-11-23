# FE current state — report-like outputs outside `src/components/reports` (analysis for the Reports & Analytics module plan)

_Static analysis only (code + docs read; nothing executed against a server or DB). Snapshot: 2026-11-21, branch `feature/uat-realse-v5`, working tree incl. the uncommitted API sync (`openapi.json` = 564 paths). Companion to `fe_existing_reports.md` (Reports module, Dashboard, My Page); this file covers every other place the frontend prints, exports or lists data, and the docs under `docs/print`, `docs/letters`, `docs/utilities`, `docs/time-clock`._

**Legend** — **[V]** verified by reading the cited FE file/lines. **[V-API]** present in `openapi.json` / the generated Orval client (contract only, not executed). **[V-BE]** read in `dentc-backend` source. **[D]** stated by a project doc (FE `docs/**` or `dentc-backend/docs/**`), not re-verified in code. **[I]** inference. Paths are relative to `dentc-frontend/` unless prefixed. "0 callers" = no importer of the generated function / hook and no raw-path call outside `src/api/generated` (grep).

**Hub-relation codes** — **LINK** = list in the Reports catalog and launch the existing screen / endpoint (needs patient or claim context). **ENGINE** = build as a definition on the new report engine (office / office-group / tenant scope, criteria panel, server render, export, schedule). **ABSORB** = the Reports hub becomes the home of the feature, reusing the existing service / endpoints. **LEAVE** = stays where it is.

---

## 0. TL;DR for planners

| # | Finding | Evidence |
|---|---|---|
| 1 | 21 report-like outputs exist outside the Reports module across 17 feature areas. **Only one is office/tenant-wide** (Time Clock report). All others are single-patient or single-claim documents — none replaces a legacy office-wide report family; they are layout / label references and patient-context catalog entries. | [V] §1.1 |
| 2 | Four rendering paths coexist: server PDF through `openServerReport` with a jsPDF fallback (5 call sites), client-only jsPDF (8 outputs), hand-rolled client CSV (4 writers) + 1 server CSV, and raw `window.print()` (2). 13 PDF builder files outside the Reports module hold ≈ 3,900 LOC of layout code. | [V] §2 |
| 3 | The backend contract has **15 file-rendering endpoints (13 PDF + 2 CSV); the FE calls 6**. Unused: ADA claim form (single + batch ≤ 200), medical-history PDF, statement PDF, payment-plan contract + coupons, time-clock report PDF + CSV, lab cost-report PDF. | [V-API] + [V] §4 |
| 4 | **Statements have no UI at all.** Server: generate / list / get / PDF / deliver / office batch / account statement (7 operations, 0 callers). FE has only settings (Setup → Office → Statement tab, corporate statement address, responsible-party flags). Server "email" delivery only records intent; batch is synchronous and single-office. | [V] §3.2, [V-BE] |
| 5 | Letters are per-patient only: dialog → client-side merge → jsPDF → in-app "Report Viewer" → save to chart / sign. Batch (`/letters/render-batch`, `/letters/batches`), postcards (`/postcard-templates`), template authoring (`POST/PATCH /letter-templates`) exist server-side with 0 FE callers. **Labels do not exist anywhere** (FE or API). | [V] §3.3 |
| 6 | Time Clock report aggregates in the browser over a crawl (200 × ≤ 60 pages) although `GET /api/v1/reports/time-clock` (+ `.csv`, `.pdf`, wages, `office_ids`, `office_group_id`) exists. All 14 TC-BE gaps are answered server-side; the FE adopted none. | [V] §3.4, [D] |
| 7 | Utilities is the reusable precedent for a declarative catalog + param form + confirm + run console + favourites / recents / history — but runs are simulated and audit is `localStorage` even though `POST /utilities/{utility_id}/run`, `GET /utilities/jobs/{job_id}`, `GET /utilities/audit` exist. | [V] §3.10 |
| 8 | 12 server audit / history endpoints have 0 FE callers. One backend helper, `print_service.record_print`, writes `audit_logs` rows with `action='PRINT'` for four routers (patient reports, lab reports, claim form, time-clock report); payment-plan, statement and medical-history PDFs do not call it, and every client-only print (Rx, perio, treatment plan, letters, payment plans, ADA) leaves no server audit. | [V] §3.13, [V-BE] |
| 9 | Scheduler has no print (routing slip / walkout / day sheet / call list): no endpoint, UI actions removed. Restorative chart, Progress Notes and Medical History have no print button in the FE. | [V] §1.4 |
| 10 | Ready mount points for a patient-context report launcher: patient nav "Print" is a stub (`alert("Print Reports - Coming Soon")`), custom-toolbar function `PRINT_REPORTS` is registered, `insurance-forms/dental\|medical` are placeholder routes. | [V] §1.4 |
| 11 | No print / export action is gated by a right code (screens are tab- or route-gated at most; the Time Clock report uses a client role check). `charting_perio_print`, `transactions_claims_ada_direct_print`, `appointments_scheduler_print`, `patient_letters_generate` are defined in `rightCodes.ts` with 0 references. | [V] §9 |
| 12 | Code comments in 11 files still say "no backend endpoint" for things that now exist; FE docs for time-clock, utilities, letters round 2/3 and consent signing lack the backend responses (they live only in `dentc-backend/docs/**`). | [V] §8.2 |
| 13 | No shared CSV / XLSX utility, no CSV formula-injection guard, no logo in any client PDF, 8 different PDF header layouts, hard-coded disclosure texts. | [V] §2.5, §8.1 |
| 14 | Delivery infrastructure for "scheduled + emailed reports" is missing: the SendGrid gateway (`POST /api/v1/email/send`) is patient-scoped (`patient_id` required) with no attachment field; there is no report job / schedule resource. | [V-API], [V-BE] §2.6 |

---

## 1. Inventory

### 1.1 Outputs that produce a file or a print job

| ID | Output | Entry point (route → control) | Produces | Data source | Renderer | Scope | Server audit |
|---|---|---|---|---|---|---|---|
| O1 | Patient Overview report | `/patient/:patientId/overview` → printer icon, `src/features/patient-overview/PatientOverviewPage.tsx` L82-93 | PDF portrait, new tab + print dialog | `GET /api/v1/patients/{patient_id}/reports/overview` (`getPatientOverviewReport`, no params) | **Server** reportlab; fallback `overviewPrint.ts` (347 LOC, jsPDF from `OverviewData`) | one patient + account members | yes (`PRINT` / `patient_report`) [D] |
| O2 | Ledger statement (Patient / Account Ledger) | `/patient/:patientId/ledger`, `/account-ledger` → Print, `src/features/account-ledger/LedgerPage.tsx` L452-470 | PDF landscape | `GET …/reports/ledger` (`getPatientLedgerReport`) | **Server**; fallback `ledgerPrint.ts` (206 LOC) over `viewRows` (all filtered rows) | patient or account | yes [D] |
| O3 | Transactions Entry day sheet | `/patient/:patientId/transaction` → Print, `src/features/transactions/TransactionsEntryPage.tsx` L267-273 | PDF landscape | `GET …/reports/transactions?date=` (`getPatientTransactionsReport`) | **Server**; fallback `transactionsPrint.ts` (119 LOC) | one patient, one date | yes [D] |
| O4 | Insurance Details (one slot) | `/patient/:patientId/insurance/{dental\|medical}/{primary\|secondary\|tertiary\|quaternary}` → title-bar printer, `src/features/patient-insurance/InsurancePlanScreen.tsx` L231-236 | PDF portrait | `GET …/reports/insurance?category=&order=` (`getPatientInsuranceReport`); 404 `insurance_slot_not_found` → fallback prints the blank form | **Server**; fallback `insurancePrint.ts` (140 LOC) | one patient, one slot | yes [D] |
| O5 | Lab Report | `/patient/:patientId/lab-tracking` → "Lab Report", `src/features/lab-tracking/LabTrackingPage.tsx` L207-214 | PDF | `GET /api/v1/appointments/lab-cases/report.pdf` (`printLabReport`) with `patient_id` | **Server**; fallback `labReportPrint.ts` `printLabReport` | one patient (endpoint is office-wide capable) | yes (`PRINT` / `lab_report`) [V-BE] |
| O6 | Lab Cost Report | same → "Cost Report", L218-221 | PDF | on-screen rows | **Client jsPDF only** (`labReportPrint.ts` `printLabCostReport`) — server `cost-report(.pdf)` has no `patient_id` (LAB-13) | one patient | none |
| O7 | Lab cases CSV | same → "Export CSV", L222-229 | CSV `lab-cases-<patient>-<date>.csv` | `GET /api/v1/appointments/lab-cases/export.csv` (`exportLabCasesCsv`, `responseType: 'blob'`) | **Server CSV** | one patient | yes (`lab_cases_csv`) [V-BE] |
| O8 | Time Clock Report / My time card | `/time-clock/report` (managers, `TimeClockReportPage.tsx`), `/time-clock` ("My time card", self) → `src/features/time-clock/components/HoursReport.tsx` (470 LOC) | Summary CSV, Detail CSV, PDF (print dialog), on-screen drill-down | `listTimeClockEntries` crawl 200 × ≤ 60 pages (`timeClockService.ts` L101-141), `buildReport()` in `timeClockModel.ts` | **Client** jsPDF `timeClockPrint.ts` (126 LOC) + client CSV (`summaryCsv`, `detailCsv`) | **office / my offices / all offices** via `useReadScope("time-clock-report", {allow:"privileged", defaultMode:"all"})` | none (server report would audit) |
| O9 | Treatment Plan report | `/patient/:patientId/treatment` → report action → `src/features/treatment-plans/TxPlanReportModal.tsx` (176 LOC); handler `TreatmentPlanPage.tsx` L771-800 | PDF preview tab (no auto-print) **or** upload to patient documents (`document_type: 'treatment-plan'`, button label "Save PDF to Notes") | grid rows already on screen + `GET /api/v1/treatment-plans/{plan_id}/report` used **only** for `primary_insurance`, `annual_max_remaining_after`, `deductible_remaining_after` (L738-744) | **Client jsPDF** `txReport.ts` (226 LOC) | one patient, 1..n plans | none |
| O10 | ADA Dental Claim Form (2024) | `/patient/:patientId/claim/:claimId` → DIRECT PRINT (`src/components/patient/ClaimDetail.tsx` L1461-1465) → `src/features/claims/ada/AdaClaimPrintModal.tsx` (621 LOC) | PDF: complete form or data-only overlay, 10 lines per form, optional reverse-side instructions page, alignment test page, live preview | ≈ 18 client requests assembled in `adaClaimFormData.ts` (706 LOC) + per-claim `localStorage` fill-out record | **Client jsPDF** `adaClaimFormPdf.ts` (824 LOC) | one claim | none; local print log `dentc:claim_print_log:v1:<claim_id>` (last 50) |
| O11 | Letters / consent forms | `/patient/:patientId/letters` → New Letter → `LetterDialog.tsx` (442) → `LetterPreviewModal.tsx` (479, titled "Report Viewer — …") | PDF (body + optional #10 envelope page 684 × 297 pt + consent signature block), download ("Save PDF file"), print, "Save to Chart" (`document_type` `consent-form` / `patient-letter` + `/patient-consents` row) | templates `GET /offices/{id}/letter-templates/effective`, tokens `GET /letters/merge-fields`, values `GET /patients/{id}/letter-context` | **Client**: `mergeFields.ts` substitution → `letterHtml.ts` → jsPDF `letterPdf.ts` (387 LOC) | one patient | consent row + signature audit events server-side; no print audit |
| O12 | Periodontal Examination Record | `/patient/:patientId/perio` → Print, `src/features/perio/PerioChart.tsx` L494-518, L579-584 | PDF landscape | selected exam's on-screen state (pending edits flushed first) | **Client jsPDF** `perioPrint.ts` (464 LOC) | one exam | none |
| O13 | Prescription slips | `/patient/:patientId/prescriptions` → PRINT PRESCRIPTION dialog (`RxPrintDialog.tsx`) or quick "print today" (`PrescriptionsPage.tsx` L262-285) | PDF, one prescription per page, legacy slip geometry (Wide / Thin) | on-screen rows + provider directory | **Client jsPDF** `rxPrint.ts` (409 LOC) | one patient | none (RX-P6) |
| O14 | Payment-plan contract + coupons | `/patient/:patientId/payment-plan/regular` (`RegularPaymentPlanPage.tsx` L275-276, L613-616), `/payment-plan/ortho` (`OrthoPaymentPlanPage.tsx` L776-785) | PDF contract (Truth-in-Lending style box) and coupon strip | on-screen form state | **Client jsPDF** `planPrint.ts` (249 LOC) | one plan | none |
| O15 | Payment-plan billing schedule | `src/features/payment-plans/BillingDetailsModal.tsx` L87 | browser print of the page | DOM | `window.print()` | one plan | none |
| O16 | SMS log CSV | `/patient/:patientId/communication` → Export CSV (`components/SmsLogTable.tsx` L31-37) | CSV `sms-log-<patient>.csv` (When, Direction, Type, Phone, Status, Message, Appointment, Log row) | filtered rows already loaded (`listSmsMessages` by `patient_id`) | **Client CSV** `src/features/sms/smsCsv.ts` | one patient | none |
| O17 | Fee-schedule assignments CSV | `/setup/fee-schedules/fee-schedule-assignments` → Export CSV, `src/components/setup/insurance/FeeScheduleAssignments.tsx` L183-208 | CSV `fee-schedule-assignments.csv` (10 columns) | rows on screen | **Client CSV** (inline) | tenant | none |
| O18 | Fee Schedule "Excel" template | `/utilities/run/fee-schedule-excel` → `components/ExcelTemplatePanel.tsx` | CSV template download + client-side validation of the uploaded file | static headers `procedure_code, description, fee, effective_date` | **Client CSV** `src/components/utilities/lib/feeScheduleTemplate.ts` (156 LOC) | — | none |
| O19 | Online-registration consent template "PDF" | Setup → Account Info → Online Registration tab, `src/components/pages/setup/OnlineRegistrationTabContent.tsx` L113-128 | HTML print window ("Save as PDF" in the browser) | `fetchActiveConsent(accountId)` header + `body_html` | `window.open` + `document.write` + `window.print()` | tenant | none |
| O20 | Utility run summary / audit history | `/utilities`, `/utilities/run/:utilityId` (`src/components/utilities/**`, 2,812 LOC) | on-screen run console + local history list (no export) | simulated run; `localStorage` `dentc:utilities:*` | React | per user, per browser | none (server `/utilities/audit` unused) |
| O21 | Stored-document open / download | patient Documents, Notes, Letter History, claim attachments | the stored file | `file_url` (signed GCS URL or `/api/v1/patient-documents/{id}/content` proxy) | `src/services/documentAccess.ts` (`openAsset`, `downloadAsset`, `useAssetObjectUrl`) | one document | not checked |

### 1.2 Filters and options each output offers

| ID | Criteria / options in the UI [V] | What reaches the server |
|---|---|---|
| O1 | none | none (path id only) |
| O2 | scope toggle Patient / Account; date from / to; type filter `FILTER_OPTIONS` = Show All, Procedures, Payments, Adjustments, Claims; sort `SORT_OPTIONS` = date desc/asc, patient A–Z, code A–Z, provider A–Z, amount high–low / low–high (`accountLedgerModel.ts` L266-291) | `GetPatientLedgerReportParams { scope: patient\|account, date_from, date_to, transaction_type: all\|charge\|payment\|adjustment\|claim, include_claims (= filter is all or claim), sort_by: date\|code\|provider\|amount\|patient, order }`; `include_archived` exists on the endpoint but is never sent |
| O3 | transaction date (toolbar "Go") | `{ date }` |
| O4 | the slot is the route (`category` D/M, `order` primary…quaternary) | `{ category, order }` |
| O5 / O7 | status segmented control All / Not Sent / Not Received / Received; appointment date from / to (`LabTrackingToolbar.tsx`) | `{ patient_id, lab_status, date_from, date_to, sort: 'date', order: 'desc' }`. Endpoint also accepts `office_id`, `provider_id`, `lab_vendor_id`, `lab_short_notice`, `lab_sent_from/to`, `lab_due_from/to`, `lab_received_from/to`, `include_archived`, `as_of` — unused |
| O6 | same filter state | nothing (client only). Server `GetLabCostReportParams { date_from, date_to, date_basis: appointment\|sent\|due\|received, group_by: vendor\|provider\|office\|month\|dds, office_id, provider_id, lab_vendor_id, include_archived }` unused |
| O8 | Period (`PERIOD_LABELS`: Today, This week, Last week, Last 2 weeks, This month, Last month, Custom range) + From / To; Employee (All employees / one user) — team mode; Overtime rule (`OVERTIME_RULES`: No overtime, Weekly > 40 h (FLSA), Daily > 8 h, Daily > 8 h + Weekly > 40 h (CA)); "Issues only"; `<ScopeToggle>` (This office / My offices / All offices) | list call only: `user_id`, `office_id`, `all_offices`, `sort`, `order`, `page`, `size`. "My offices" (`office_ids`) is filtered client-side; the date range is applied client-side (the crawl stops when a page passes `from`) |
| O9 | Single / Multiple Tx Plan ID; Phase ID (blank = all); Included Disclosure ("Treatment Plan Disclosure" \| "None"); Include without UCR; Print Account Name; Print Resp. Party Address; Include Statuses (Diagnosed, Accepted, Unaccepted, Hold, Alternative, Referred Out) + Include completed | nothing (client filter `filterReportRows`, `txReport.ts` L49-60) |
| O10 | print mode "Complete form (plain paper)" / "Data only (pre-printed ADA stock)"; offset X / Y (saved per office in `localStorage`); "Add reverse side (instructions page)"; EPSDT / Title XIX; locum tenens; Date last SRP; signature on file; assign benefits; Item 33 missing-teeth picker; Topaz / on-screen signatures for Items 36 / 37 / 53; pre-flight checklist (error / warning / info with "where to fix" hints) | nothing (client render). Server `GetAdaClaimFormReportParams { mode: form\|overlay, offset_x, offset_y }` and batch `POST /insurance-claims/reports/ada-claim-form {claim_ids ≤ 200, mode, offset_x, offset_y}` unused |
| O11 | Envelope Printing; Select Letter Group (from `/definitions?group_code=LETTERTYPE`); Select Letter; Signature Type (Dentist, Hygienist, Assistant, Office Manager, Patient Only) and Signing Provider — consent group only; Treatment Plan — only when the template uses a `requires_treatment_plan` token | `getPatientLetterContext(patient_id, { office_id, treatment_plan_id, include_balance })` |
| O12 | none (uses chart prefs: `numbering_system`, `show_mgj`, `show_lingual`, `pd_warning_level`, `cal_warning_level`) | nothing |
| O13 | scope: "Print Only highlighted item" / "Print Only checked item(s)" / "Print All Prescriptions for today"; pre-printed form; show drug count; size Wide / Thin (`rxPrint.ts` L69-81) | nothing |
| O14 | disclosure pick ("Treatment Plan Disclosure", "Ortho Contract Disclosure", "None") | nothing |
| O16 | filter chips (All messages, Unread replies, Received, Sent, Appt reminders, Confirmations, Recalls, Balance, Manual, Failed), search, date from / to; SMS \| Email tab | nothing new (client filter over loaded rows) |
| O17 | whatever the grid shows | nothing |
| O20 | per-utility params (`ParamKind`: office, provider, date, dateRange, text, number, select, checkbox, file) | nothing (simulation) |

### 1.3 Report-like screens with no export (work queues and logs)

| Screen | Route / file | What it lists | Filters [V] | Export |
|---|---|---|---|---|
| AppointNow request inbox | `/appointnow/requests`, `src/features/appointnow/requests/RequestInbox.tsx` (1,201 LOC) | online booking requests | status tabs Pending / Approved / Declined / Expired / All with counts; search (name, phone, email, reason, code); office; reason; new vs existing patient; date from / to; sort created / slot asc / desc; `<ScopeToggle>` — all client-side over loaded requests (L661-669) | none |
| Letter History | `/patient/:patientId/letters`, `LettersPage.tsx` | generated letters + consent status / signer / method | none | open stored PDF |
| Medical History Change Log | `/patient/:patientId/medical-history`, `MedicalHistoryPage.tsx` L645-730 | created / modified stamps per section + row-level log | none | none |
| Patient Messages inbox | `/patient/:patientId/messages` | SMS + email thread | — | via O16 |
| Utilities execution history | `/utilities` | local run log | none | none |
| Pricing-setup health banner | Setup → Fee Schedules, `src/features/pricing/PricingHealthPanel.tsx` (`GET /api/v1/setup/pricing-health`) | setup findings by severity | none | none |

### 1.4 Legacy outputs with no FE implementation

| Legacy output | FE state [V] |
|---|---|
| Patient "Print" menu (patient reports) | `src/components/PatientSecondaryNav.tsx` L266-271: `onClick: () => alert("Print Reports - Coming Soon")`; toolbar function `{ code: "PRINT_REPORTS", label: "Print Reports" }` in `src/components/setup/custom-toolbar/toolbarCatalog.tsx` L67 |
| Insurance fill-out forms (dental / medical) | `src/App.tsx` L207-208 `PlaceholderPage`; nav entries commented out in `GlobalNav.tsx` L423-435 |
| Scheduler print: routing slip, walkout statement, day sheet, call list | no code in `src/components/pages/Scheduler.tsx` (3,411 LOC) or `src/components/scheduler/**`; "Print actions are removed from the UI" (`docs/scheduler/scheduler_consolidated_backend_gaps.md` G9); no endpoint [V-API] |
| Statements run / reprint | no screen; commented nav stub "Unclose Last Statement" (`GlobalNav.tsx` L487-488) |
| Medical History print | no button; server `GET /api/v1/patients/{patient_id}/medical-history/pdf` has 0 callers |
| Restorative chart print | none (only a freehand-drawing upload, `document_type: 'restorative-drawing'`) |
| Progress Notes print | none |
| Postcards, Labels, Custom Letter, Advanced Custom Letter, Custom Postcard | no screen; see §3.3 |
| Lists (Provider / Security / Setup) | `PlaceholderPage` routes (see `fe_existing_reports.md` §1.1); only O17 exports a setup list |
| Walk-out receipt / superbill | none |

---

## 2. Rendering paths and shared infrastructure

### 2.1 Path summary [V]

| Path | Used by | Properties |
|---|---|---|
| A. Server PDF via `openServerReport` + jsPDF fallback | O1–O5 | canonical data, office letterhead / logo, `Page x of y`, `PRINT` audit row; survives a backend without the route |
| B. Client-only jsPDF | O6, O8–O14 | data limited to what the browser loaded; text-only header; no audit; layout code lives in the FE |
| C. Server CSV | O7 | `text/csv` blob downloaded with `downloadBlob()` (`labTrackingService.ts` L120-129) |
| D. Client CSV | O8, O16, O17, O18 | four independent writers |
| E. `window.print()` | O15, O19 | prints DOM / a hand-written HTML window |

### 2.2 `src/features/print/serverReport.ts` (71 LOC) — the server-first contract [V]

| Behaviour | Lines |
|---|---|
| `openServerReport({ fetch_pdf, fallback, label })`; opens `window.open('', '_blank')` **before** the await (popup-blocker safe) and writes a "Preparing …" placeholder into the blank tab | L39-41, L26-37 |
| On success: `tab.location.href = URL.createObjectURL(blob)`, then `tab.focus(); tab.print()` after 1,200 ms; object URL revoked after 120 s | L43-62 |
| On failure (any error or empty blob): closes the tab, toast "Server report unavailable (status) — printing from screen data", runs `fallback()` | L63-70 |
| No timeout, no `AbortSignal`, no progress, no download-instead-of-print option, no file name control | whole file |

Callers: `PatientOverviewPage.tsx` L87, `LedgerPage.tsx` L454, `TransactionsEntryPage.tsx` L269, `InsurancePlanScreen.tsx` L232, `LabTrackingPage.tsx` L209.

### 2.3 `src/features/print/patientPdf.ts` (263 LOC) — the jsPDF report toolkit [V]

| Helper | Purpose |
|---|---|
| `officeHeader(office, fallback_name)` L36-49 | prefers `OfficeRead.letterhead` (PRINT-2: `name`, `address_line1/2`, `city`, `state`, `zip`, `phone`, `logo_url`, `logo_source`) over the office row; the logo is **not** drawn client-side |
| `openPatientPdf(header, { orientation })` L72-118 | US Letter, 36 pt margin; office block left, report title + "Printed <local time>" right, navy rule, patient line (name, ID, chart, DOB) + `extra` label/value lines |
| `sectionTitle`, `keyValueTable` (2- or 4-column), `dataTable` (blue header, right / centre alignment, fixed widths, bold foot row, empty text), `paragraph`, `ensureSpace` | section building blocks |
| `printPatientPdf(pdf)` L247-259 | stamps `Page x of y`, `doc.autoPrint()`, opens `doc.output('bloburl')` |

Server twin: `dentc-backend/app/services/pdf_report.py` (610 LOC, reportlab) — class `PatientReport` with `section_title`, `key_value_table`, `data_table`, `paragraph`, `notice`, `cards`, `render()`; composition in `app/services/print_service.py` (1,104 LOC); routes in `app/api/v1/patient_reports.py` (142 LOC) with an `_audit(...)` helper [V-BE]. The response doc describes it as "the reportlab twin of `src/features/print/patientPdf.ts`" [D]. This pair is the existing template for report-engine PDF output.

Only the four patient prints use this toolkit. The other eight jsPDF builders each draw their own header (centred office name in `labReportPrint.ts`, `txReport.ts`, `timeClockPrint.ts`; legacy slip in `rxPrint.ts`; own blocks in `planPrint.ts`, `perioPrint.ts`, `letterPdf.ts`, `adaClaimFormPdf.ts`).

### 2.4 `src/services/documentAccess.ts` (161 LOC) — authenticated file access [V]

`needsAuthorizedFetch(url)` keys off the **path** (`/api/…` → fetch through the shared axios instance with the bearer token and hand the browser a blob URL; signed bucket URLs open as-is). `openAsset` pre-opens the tab; `downloadAsset(url, fileName)`; `useAssetObjectUrl(url)` for `<iframe>` / `<img>`. Any stored report artefact (statement PDF, archived run output) must go through this module — a bare `<a href>` returns `{"code":"missing_token"}` [D] `docs/letters/letters_document_link_backend_report.md`.

### 2.5 Other shared facts [V]

| Topic | Fact |
|---|---|
| Libraries | `jspdf ^4.2.1`, `jspdf-autotable ^5.0.8`; no xlsx, html2canvas, pdf.js or react-to-print (`package.json` L66-67) |
| Client builders outside the Reports module | 13 PDF builder files, ≈ 3,900 LOC of layout code: `patientPdf.ts` 263, `overviewPrint.ts` 347, `ledgerPrint.ts` 206, `transactionsPrint.ts` 119, `insurancePrint.ts` 140 (these five are the server-report fallbacks), `labReportPrint.ts` 119, `letterPdf.ts` 387, `planPrint.ts` 249, `perioPrint.ts` 464, `rxPrint.ts` 409, `timeClockPrint.ts` 126, `txReport.ts` 226, `adaClaimFormPdf.ts` 824. (12 files import `jspdf` in total, one of them inside `src/components/reports`) |
| Fonts | jsPDF standard Helvetica (WinAnsi). `letterPdf.ts` folds typographic punctuation to ASCII (`PDF_CHAR_MAP`); `transactionsPrint.ts` L87-88 prints "Y" because there is no check-mark glyph |
| CSV writers | `smsCsv.ts` (BOM via `String.fromCharCode(0xfeff)`), `timeClockModel.ts` `toCsv` L399-402 (BOM, CRLF), `feeScheduleTemplate.ts` (BOM, CRLF), `FeeScheduleAssignments.tsx` (no BOM, every cell quoted). None neutralises formula-leading cells (`=`, `+`, `-`, `@`) |
| "Save to chart" | `uploadPatientDocument({ file, patient_id, office_id, document_type, description })` → `/api/v1/patient-documents`. `document_type` values written by generated outputs: `consent-form`, `patient-letter` (`lettersModel.ts` L121-122), `treatment-plan` (`TreatmentPlanPage.tsx` L792) |
| In-app PDF viewing | `LetterPreviewModal.tsx` ("Report Viewer": Letter / PDF toggle, `<iframe>` of a blob URL, Save to Chart / Print / Save PDF file / Close) and the live preview pane of `AdaClaimPrintModal.tsx`; everything else opens a new browser tab |
| Print CSS | no `@media print` stylesheet; `print:` Tailwind classes remain in 8 files (patient-overview, payment-plans, one insurance plan-details step) from the pre-PDF era |
| Office scope in these outputs | O8 uses `useReadScope` + `<ScopeToggle>`; AppointNow inbox uses `<ScopeToggle>`; patient-scoped outputs take the office from `usePatientOffice()` / the patient row; none supports office groups |

### 2.6 Delivery channels present [V-API] / [V-BE]

| Channel | State |
|---|---|
| E-mail | `POST /api/v1/email/send` (`EmailSendRequest { patient_id (required), office_id, appointment_id, to_email, subject, body_html, body_text, message_type, client_id, override_consent }`), `GET /email/gateway`, `GET /email-messages`; SendGrid, log-only without `SENDGRID_API_KEY` (`dentc-backend/app/services/email_service.py`). Used by the FE only in `src/features/sms/hooks/usePatientEmail.ts`. **No attachment field, no staff / non-patient recipient.** `message_type` vocabulary includes `statement` |
| SMS | `POST /api/v1/sms/send`, `/sms/render`, `/sms-templates`, `/sms/reminders/run`, `/sms/inbox/summary`; FE uses list + send per patient only |
| Statement delivery | `POST /patients/{patient_id}/statements/{statement_id}/deliver { method: email\|print\|download, email }` — `method="email"` only sets `delivery_status="emailed"` / `delivered_to`; code comment: "No SMTP integration is wired; record intent for a downstream mailer/worker" (`dentc-backend/app/services/statement_service.py` L276-296) |
| Job / schedule | only the Utilities run record (`UtilityRunRead { id, utility_id, office_id, run_by, status, parameters, processed, succeeded, failed, logs, created_at, finished_at }`) and letter batch runs (`letter_batch_runs` / `letter_batch_items`); no report schedule resource |

---

## 3. Per-area notes (facts the tables do not carry)

### 3.1 Patient screen prints (O1–O4) — `docs/print/*`

| Fact | Source |
|---|---|
| Server routes: `get_patient_{overview,ledger,transactions,insurance}_report`, tag **Patients**; `Content-Disposition: inline`; "Printed" timestamp in the home office's timezone | [D] `docs/print/patient_print_backend_response.md` |
| Every print writes `audit_logs`: `action='PRINT'`, `resource_type='patient_report'`, `resource_id=<report>`, `patient_id`, `user_id`, `details.params` | [D] same |
| Ledger PDF has no row cap; the FE feed cap is `FEED_SIZE = 5000` (`accountLedgerService.ts` L31) | [V] |
| The FE must pass `include_claims` (default false) or the PDF omits CLM rows | [V] `LedgerPage.tsx` L461-463 |
| Measured: Overview 47 s, Transactions 5 s, Ledger 2.4 s, Insurance 1 s on the dev backend (patient 83433) | [D] `docs/print/patient_print_frontend_status.md` |
| Section and column labels of the four builders are the legacy names; the server PDF repeats them in the same order | [D] |
| `GET /api/v1/patients/{patient_id}/day-totals?date=` (`getPatientDayTotals`) feeds "Today's Est Ded" on the screen and in the PDF | [V] `TransactionsEntryPage.tsx` L218 |

Printed sections (label reference for server-side report definitions): Overview — Patient Information, Responsible Party, Insurance (Dental / Medical × Primary / Secondary), Account Members, Appointments, Recalls, Balances (aging Current / Over 30 / 60 / 90 / 120, Est Pat, Est Ins), Billing, Contract, Contracts, Referrals. Ledger — 17 columns `Date, Patient, Office, A, Code, TH, Surf, T, N, Description, Bill, Provider, Est Pat, Est Ins, Amount, Balance, User` + Balances + Contracts cards. Transactions — Patient Dashboard block + 14-column day grid with totals. Insurance — Insurance Plan, Benefit Information, Eligibility, Subscriber Information, Notes. [V]

### 3.2 Statements

| Piece | State |
|---|---|
| Server operations (0 FE callers): `generatePatientStatement` `POST /api/v1/patients/{patient_id}/statements` (`StatementCreate { office_id, statement_date, date_from, date_to, message }`), `listPatientStatements`, `getPatientStatement`, `getPatientStatementPdf` (`…/statements/{statement_id}/pdf`), `deliverPatientStatement`, `generateStatementBatch` `POST /api/v1/offices/{office_id}/statements/batch` (`StatementBatchRequest { statement_date, date_from, date_to, min_balance, only_aged, scope: patient\|account }`), `generateAccountStatement` `POST /api/v1/accounts/{account_id}/statements` | [V-API], [V] |
| `StatementRead`: `id, patient_id, account_id, statement_scope, snapshot, office_id, statement_date, period_start, period_end, opening_balance, total_charges, total_payments, total_adjustments, closing_balance, aging_current, aging_30, aging_60, aging_90, aging_120, message, batch_id, delivery_method, delivery_status, delivered_to, delivered_at` | [V-API] |
| Batch behaviour, `scope="patient"`: loops active patients with `home_office_id == office_id`, calls `balance_service.get_patient_balance` per patient inside the request, returns every generated statement in the response. `scope="account"`: `family_account_service.generate_account_batch` — one statement per active account homed at the office with `Account.send_statements` true, member sections, addressed to the guarantor. Both: synchronous, one office per call, criteria limited to `min_balance` / `only_aged` / dates (no office group, provider, billing type, name range), no merged print stream (PDF is per statement) | [V-BE] `statement_service.py` L201-244, `statements.py` L126-146, `family_account_service.py` `generate_account_batch` |
| FE settings that feed statements: Setup → Office → Statement tab (`src/components/setup/offices/tabs/StatementTab.tsx`, `src/services/officeStatementApi.ts`): `message_general`, `message_current`, `message_30`, `message_60`, `message_90`, `message_120` (100 chars), `correspondence_name`, `logo_option` (`office\|custom\|none`), `logo_url`, `address_source` (`office\|custom`), `statement_address_1/2`, `statement_city/state/zip`, `statement_phone` | [V] |
| Account-level settings: `statement_address_1`, `statement_city`, `statement_state`, `statement_zip`, `statement_lines_color`, `statement_close_out_individual` (`src/services/accountSetupTransform.ts`; the form state there is camelCase with a snake↔camel mapper) | [V] |
| Responsible-party flags written by the Add Patient wizard: `send_statements`, `no_email_statement`, `statement_message`, `statement_message_print_count`, `send_collections`, `is_finance_charge` (`src/features/add-patient/wizardModel.ts` L632-637) | [V] |
| Stamp policy already declares `statement: "posting"` (`src/features/office-scope/stampPolicy.ts` L28) | [V] |

### 3.3 Letters, consent forms, postcards, labels — `docs/letters/*`

| Piece | State |
|---|---|
| Catalog: 153 seeded templates; `letter_type` groups C 79 Patient Consent, I 23 Insurance & Treatment, F 17 Financial / Collection, E 13 Email Templates, S 8 Statements & Disclosures, A 7 Appointment, M 4 Marketing, D 2 Referral; 56-token merge catalog; HTML subset `br div strong u span ul ol li`; `div.dvfrom` / `div.dvto` drive Envelope Printing | [D] `docs/letters/letters_backend_devreport.md` (2026-08-18) |
| `LetterTemplateRead { id, tenant_id, legacy_id, name, letter_type, channel, title, body_html, is_editable, is_active, created_at }` | [V-API] |
| Render path today: `loadLetterContext` → `merge_letter` (client substitution + "residual" overrides) → `parse_letter_html` → `build_letter_pdf` (`LetterDialog.tsx` L188-264) | [V] |
| Server render exists and is unused: `POST /api/v1/letters/render` (`LetterRenderRequest { template_id, patient_id, office_id, treatment_plan_id, signing_provider_id, overrides }`) → `rendered_html`, `unresolved_tokens`, `unknown_tokens`; `POST /api/v1/letters/render-batch` (`LetterBatchRequest { template_id, patient_ids[], office_id, signing_provider_id, overrides, store_html }`, cap 500 patients, runs inline, durable `letter_batch_runs` / `letter_batch_items`); `GET /api/v1/letters/batches`, `/batches/{batch_id}` | [V-API]; [D] `docs/letters/letters_backend_response.md` |
| No server PDF for letters ("Envelope printing / PDF generation stays in the browser … `POST /letters/render.pdf` later") | [D] same, "Not done" |
| Nine templates are batch collection letters (`CS001…CS009`); "`/letters/render-batch` exists and is not wired to any screen. That belongs with a collections queue" | [D] `docs/letters/letters_backend_devreport.md` addendum |
| Postcards: `PostcardTemplateRead { id, tenant_id, office_id, legacy_id, name, card_type, body, created_at }`, full CRUD `/api/v1/postcard-templates` with office-scope params; 0 FE callers; no render endpoint | [V-API], [V] |
| Labels: no endpoint, no code. Nearest assets: the #10 envelope page in `letterPdf.ts` and the user preference `print_labels` ("Print Labels for Appointments", `src/components/modals/AddEditUserModal.tsx` L2159-2169) | [V] |
| Template authoring (legacy Custom Letter / Advanced Custom Letter / Custom Postcard): `createLetterTemplate` / `updateLetterTemplate` / `deleteLetterTemplate` have 0 callers; the only letter Setup UI is the per-office assignment dual list (Setup → Offices → Office Assignment → Letters, `src/services/officeAssignmentApi.ts` L227-246) | [V] |
| Consent signing: statuses `pending · printed · signed · declined · voided`; `POST /patient-consents/{consent_id}/sign`, `/countersign`, `GET …/signatures`, `…/sig-string`; the FE signs in the viewer (Topaz or on-screen) and stamps signatures into the stored PDF for the generated flow only | [V] `LetterPreviewModal.tsx` L161-241 |
| Dead exports in `lettersService.ts`: `loadConsentFormMasters` (`GET /consent-forms`), `loadConsentStatuses`, `loadTemplate` | [V] |

### 3.4 Time clock — `docs/time-clock/*`

| Piece | State |
|---|---|
| Access: `/time-clock/report` is gated client-side by `canViewTeamTime(user.role)` = `isPrivilegedRole` (`timeClockAccess.ts`); `/time-clock` shows "My time card" (`HoursReport mode="self"`, all offices) | [V] |
| Report model (`timeClockModel.ts`, 487 LOC, unit-tested in `__tests__/timeClockModel.test.ts`): per user → days → rows; regular / overtime split; issues (`ISSUE_LABELS`: Missing clock-out, Clock-out before clock-in, Shift over 16 h); legacy rows rendered in `LEGACY_WALL_CLOCK_ZONE = "UTC"`, new rows in the office `timezone`; open punches older than `STALE_OPEN_HOURS = 20` flagged | [V] |
| Totals strip: Employees (or Days worked), Shifts, Regular hours, Overtime hours, Total hours, Issues | [V] `HoursReport.tsx` L259-273 |
| Truncation: `MAX_PAGES = 60` → 12,000 punches, amber banner "The range is very large" | [V] `timeClockService.ts` L30, `HoursReport.tsx` L275-279 |
| Server report (unused): `GetTimeClockReportParams { from, to (required), user_id, office_id, office_ids, office_group_id, all_offices, include_global, overtime_method, include_wages, include_entries }` → `TimeClockReport { date_from, date_to, timezone_note, overtime_method_override, include_wages, users: ReportUser[], totals: ReportTotals, generated_at }`; `ReportTotals { regular, overtime, total, break_hours, days_worked, entry_count, issue_count, regular_pay, overtime_pay, total_pay }`; `…/report.csv?layout=summary\|detail`; `…/report.pdf?detail=`; both audited as `PRINT` / `time_clock_report` | [V-API]; audit [D] `dentc-backend/docs/time-clock/time_clock_backend_response.md` |
| Server overtime vocabulary `none \| weekly \| daily \| daily_weekly` + per-user thresholds vs the FE's four fixed presets | [D] same; [V] `timeClockModel.ts` L147-159 |
| Also unused: `clockInTimeClock`, `clockOutTimeClock`, `getMyActiveTimeClockEntry`, `restoreTimeClockEntry`, `getTimeClockEntryHistory`, `/time-clock/metadata`, `/time-clock/settings`, `/time-clock/periods` (+ approve / lock), `clock_in_from` / `clock_in_to` list filters | [V-API], [V] |

### 3.5 Lab tracking

Patient tab only; the denormalised office-wide feed `GET /api/v1/appointments/lab-cases` (`listLabCases`: `office_id`, `patient_id`, `provider_id`, `lab_vendor_id`, `lab_short_notice`, `lab_status`, date ranges, per-status `counts`, `total_cost`, `as_of`) is called only with `patient_id` (`labTrackingService.ts` L39-71) [V]. `LabCostReport { date_from, date_to, date_basis, group_by, rows[{ key, label, case_count, total_cost }], case_count, total_cost }` (`getLabCostReport`) has 0 callers; `fetchLabCostReportPdf` (`labTrackingService.ts` L107) is exported and never called [V]. KPI strip on the tab: Lab Cases, Not Received, Overdue, Total Lab Cost [V].

### 3.6 Treatment plan report

`TreatmentPlanReport` (server JSON) carries `plan_id, name, status, patient, item_count, total_fee, total_discount, total_insurance_estimate, total_patient_estimate, items[], primary_insurance, annual_max_remaining_after, deductible_remaining_after, benefit_year_start, max_remaining_source` [V-API] — enough to render the whole report server-side, but the FE reads three fields. Layout: office header, patient / responsible-party / insurance box, rows grouped Tx Plan ID → Phase with phase and plan totals + "Net Est Pat", disclosure paragraph, signature + date lines (`txReport.ts` L97-221) [V].

### 3.7 ADA claim form — `docs/claims/*`

Server side is complete per the backend response (2026-09-11): `GET /insurance-claims/{claim_id}/ada-claim-form` (one JSON document with all 58 items + `warnings[]`), `GET …/reports/ada-claim-form` (PDF, audited `PRINT` / `claim_report`), batch `POST /insurance-claims/reports/ada-claim-form`, `GET /patients/{patient_id}/tooth-status`, `GET /metadata/ada-claim-form-rules` [D], all present in the client [V-API] with 0 callers [V]. The FE keeps: the pre-flight checklist (`checkAdaClaimForm`, `summariseIssues` in `adaClaimFormModel.ts`), the calibration page, the reverse-side instructions page, per-office print offsets and the print log in `localStorage` (`adaLocalStores.ts`: `dentc:ada_print_offset:v1:`, `dentc:claim_print_log:v1:`, `dentc:office_claim_billing:v1:`, `dentc:provider_taxonomy:v1:`) [V].

### 3.8 Perio, restorative, prescriptions, medical history, progress notes

| Area | State |
|---|---|
| Perio | `perioPrint.ts`: header blocks Patient (name, account, address, DOB) and Provider (name, address, Tax ID, License#), one block per arch, derived CAL row, warning-threshold colouring, missing teeth X'd, voided marker. Server `GET /api/v1/perio-exams/compare` (`patient_id`, `exam_ids`, `include_details`, `include_voided`) feeds the on-screen Compare modal; no compare print. "print stays client-side by design" [D] `docs/CONSOLIDATED_BACKEND_GAPS.md` §6b |
| Restorative | no print / export |
| Prescriptions | legacy slip coordinates on a 612 × 792 page, slip 361.8 × 398.2 pt, thin = 0.8 scale; DISPENSE AS WRITTEN / VOLUNTARY FORMULARY PERMITTED pair; no server endpoint and no print log (`docs/prescriptions/prescriptions_backend_devreport.md` RX-P4, RX-P6); `/api/v1/prescriptions` list has office-scope params (`office_id`, `office_ids`, `office_group_id`, `all_offices`) usable for an office-wide prescription log [V-API] |
| Medical history | Change Log built in the browser from row stamps (`computeAudit` L221, `buildChangeLog` L252 in `medicalHistoryService.ts`); server `GET …/medical-history/audit`, `/changes`, `/versions`, `/versions/{version_id}`, `/pdf` all have 0 callers |
| Progress notes | attachments only (`document_type: 'progress_note'`) |

### 3.9 Payment plans

Server PP-3 delivery: `GET /api/v1/payment-plans/{ortho\|regular}/{plan_id}/contract` (JSON, all figures computed server-side), `/contract.pdf`, `/coupons.pdf` (five coupons per page) [D] `dentc-backend/docs/payment-plans/payment_plans_backend_response.md`; all three have 0 FE callers [V]. Related batch operation `POST /api/v1/payment-plans/post-due` exists [V-API] (the Utilities entries "Generate Ortho / Regular Payment Plan Charges" still simulate).

### 3.10 Utilities — `docs/utilities/*`

| Piece | State |
|---|---|
| Framework: `types.ts` (`UtilityDefinition { id, title, description, category, icon, kind, legacyPath, roles, destructive, officeScoped, params[], steps[], backend: live\|pending\|external, launchUrl, route, runNote, confirmLabel, keywords }`), `utilityCatalog.ts` (739 LOC, 9 categories), `UtilityShell.tsx` (RBAC gate → params → confirm → progress → summary + log → audit), `components/UtilityParamsForm.tsx`, `ConfirmDialog.tsx`, `RunConsole.tsx`, `pages/UtilitiesDashboard.tsx` (search, category filter, favourites, recents, execution history) | [V] |
| Persistence: `lib/utilitiesStorage.ts` → `localStorage` `dentc:utilities:{favorites\|recents\|history}:<userId>` (8 recents, 100 history rows) | [V] |
| Execution: `lib/useUtilityRun.ts` simulates every `backend: "pending"` utility; only `fee-schedule-excel` and the two Time Clock entries are `live`; Launch entries are `external` | [V] |
| Server endpoints (0 callers): `runUtility`, `getUtilityJob`, `listUtilityAudit` (`ListUtilityAuditParams { utility_id, office_id, run_by, date_from, date_to }`); run requires the `admin` role; duplicate-run prevention per (utility, office) | [V-API], [V-BE] `dentc-backend/app/api/v1/utilities.py` |
| Report-like catalog entries (all simulated): `batch-paper-med` (paper claim forms), `eclaims-management` (claim register by status), `batch-eligibility`, `referral-management`, `televox-appointments-download`, `integration-denticon-download`, office-specific exports (`office-access-dental-*`, `office-dha-reset`, `office-cs-benefits-import`, `office-corro-maduro`) | [V] |
| Shared with Reports already: `useOffices`, `officeName` from `src/components/reports/lib/useReportRefData.ts` (`UtilityShell.tsx` L12) | [V] |

### 3.11 SMS / e-mail log

Patient-scoped only. `ListSmsMessagesParams` already supports an office-wide log: `office_id`, `office_ids`, `office_group_id`, `all_offices`, `direction`, `send_status`, `message_type`, `template_id`, `reply_intent`, `needs_attention`, `unmatched`, `has_reply`, `unread_replies`, `sent_at_from/to`, `reply_received_on_from/to`, `date_from/to` [V-API]. `getSmsInboxSummary` (`GET /sms/inbox/summary`) has 0 callers [V]. `ListEmailMessagesParams`: `patient_id, office_id, appointment_id, message_type, send_status, is_read, sent_at_from, sent_at_to` [V-API].

### 3.12 AppointNow inbox

A work queue, not a report. Row fields useful for a funnel report: `status` (`pending\|approved\|declined\|expired`), `office_code`, `office_id`, `reason_label`, `slot`, `original_slot`, `is_emergency`, `contact.is_new_patient`, `created_at`, `actioned_by`, `actioned_at`, `reschedule_count`, `contact_notified_via`, `decline_reason`, `appointment_id`, `patient_id` (`src/features/appointnow/transport/types.ts` L174-212) [V]. Per-status totals come from the server (`StatusCounts`, AN-13) [V].

### 3.13 Audit and change logs

| Server endpoint [V-API] | Filters | FE callers [V] |
|---|---|---|
| `GET /api/v1/audit-logs` (`listAuditLogs`) → `AuditLogRead { id, tenant_id, user_id, action, resource_type, resource_id, patient_id, office_id, method, path, status_code, ip_address, request_id, details, created_at }` | `user_id, resource_type, resource_id, patient_id, office_id, search, page, size, sort, order` | 0 |
| `GET /api/v1/patients/{patient_id}/audit-logs` | `resource_type, resource_id, user_id, office_id, search, paging` | 0 |
| `GET /api/v1/patients/{patient_id}/change-log`, `GET /api/v1/accounts/{account_id}/change-log` | — | 0 |
| `GET /api/v1/patients/{patient_id}/medical-history/audit`, `/changes`, `/versions` | — | 0 |
| `GET /api/v1/insurance-claims/{claim_id}/status-history` | — | 0 (no history view; the claim screen shows a single `claim_closed_by` value, `ClaimDetail.tsx` L1277-1284) |
| `GET /api/v1/insurance-plans/{plan_id}/history` | — | 0 |
| `GET /api/v1/time-clock-entries/{entry_id}/history` | — | 0 |
| `GET /api/v1/signature-audit-events` → `SignatureAuditEventRead { entity_type, entity_id, patient_id, event, actor_id, occurred_at, ip, user_agent, device_source, device_model, device_serial, signature_type, content_hash, reason, signer_name, signer_relationship }` | — | 0 |
| `GET /api/v1/utilities/audit` | `utility_id, office_id, run_by, date_from, date_to` | 0 |

`audit_logs` has no date-range filter in `ListAuditLogsParams` (no `created_at_from/to`) [V-API]. `AuditMiddleware` records mutations only; explicit `PRINT` rows are the only record of read-type output [D] `docs/print/patient_print_backend_response.md`.

Print audit is one shared helper: `dentc-backend/app/services/print_service.py` L320-336 `record_print(db, *, tenant_id, user_id, patient_id, report, path, params, resource_type="patient_report")` → `AuditLog(action="PRINT", resource_type, resource_id=report, patient_id, method="GET", path, status_code=200, ip_address, request_id, details={"report", "params"})` [V-BE].

| Caller [V-BE] | `resource_type` | `report` values |
|---|---|---|
| `app/api/v1/patient_reports.py` L45 | `patient_report` | `overview`, `ledger`, `transactions`, `insurance` |
| `app/api/v1/lab_tracking.py` L88 | `lab_report` | `lab_report`, `lab_cost_report`, `lab_cases_csv` |
| `app/api/v1/claim_forms.py` L63 | `claim_report` | the claim id; `details.params` = `claim_number`, `form_version`, `pages`, mode / offsets |
| `app/api/v1/time_clock.py` L399, L433, L450 | `time_clock_report` | `time_clock_summary_csv`, `time_clock_detail_csv`, `time_clock_pdf` (the JSON report is not audited) |
| not called by | — | payment-plan `contract.pdf` / `coupons.pdf` (`payment_plans.py`), statement PDF (`statements.py`), medical-history PDF (`medical_history.py`) |

### 3.14 Miscellaneous

| Item | Fact |
|---|---|
| Patient Documents | `src/components/patient/PatientDocuments.tsx` lists `/patient-documents` with `document_type`; generated outputs saved to the chart appear here |
| Imaging | per-image download (`ImageViewer.tsx` L206) and "Download DICOM" (`DicomViewer.tsx`); right `imaging_export` is defined; not a report |
| Help → My Tickets | local submission log (`src/components/help/lib/ticketLog.ts`); not a report |
| Export-type entries in the Utilities nav | `GlobalNav.tsx` L759-777 lists Utilities → Office-Specific → Universal entries "Download 837D", "Encounter Info for Capitation Plans", "837 Format (Generic)", "837 Format", "Text Format" (`/utilities/office-specific/universal/*`); these sub-exports are not in `utilityCatalog.ts` ("not yet cataloged", `docs/utilities/utilities_backend_devreport.md` L82-85) |

---

## 4. Server report-like endpoints vs FE consumption

| Endpoint [V-API] | Type | FE call site [V] |
|---|---|---|
| `GET /api/v1/patients/{patient_id}/reports/overview` | PDF | `PatientOverviewPage.tsx` |
| `GET /api/v1/patients/{patient_id}/reports/ledger` | PDF | `LedgerPage.tsx` |
| `GET /api/v1/patients/{patient_id}/reports/transactions` | PDF | `TransactionsEntryPage.tsx` |
| `GET /api/v1/patients/{patient_id}/reports/insurance` | PDF | `InsurancePlanScreen.tsx` |
| `GET /api/v1/appointments/lab-cases/report.pdf` | PDF | `LabTrackingPage.tsx` |
| `GET /api/v1/appointments/lab-cases/export.csv` | CSV | `LabTrackingPage.tsx` |
| `GET /api/v1/appointments/lab-cases/cost-report.pdf` | PDF | **none** (wrapper `fetchLabCostReportPdf` unused) |
| `GET /api/v1/appointments/lab-cases/cost-report` | JSON | **none** |
| `GET /api/v1/insurance-claims/{claim_id}/reports/ada-claim-form` | PDF | **none** |
| `POST /api/v1/insurance-claims/reports/ada-claim-form` (batch) | PDF | **none** |
| `GET /api/v1/insurance-claims/{claim_id}/ada-claim-form`, `GET /api/v1/metadata/ada-claim-form-rules`, `GET /api/v1/patients/{patient_id}/tooth-status` | JSON | **none** |
| `GET /api/v1/patients/{patient_id}/medical-history/pdf` | PDF | **none** |
| `GET /api/v1/patients/{patient_id}/statements/{statement_id}/pdf` + 6 statement operations | PDF / JSON | **none** |
| `GET /api/v1/payment-plans/{plan_kind}/{plan_id}/contract.pdf`, `/coupons.pdf`, `/contract` | PDF / JSON | **none** |
| `GET /api/v1/reports/time-clock`, `/report.csv`, `/report.pdf` | JSON / CSV / PDF | **none** |
| `GET /api/v1/treatment-plans/{plan_id}/report` | JSON | `TreatmentPlanPage.tsx` L738 (3 fields) |
| `POST /api/v1/letters/render`, `/render-batch`, `GET /letters/batches`, `/batches/{batch_id}` | JSON | **none** |
| `GET /api/v1/letters/merge-fields`, `GET /api/v1/patients/{patient_id}/letter-context`, `GET /api/v1/offices/{office_id}/letter-templates/effective`, `GET /api/v1/letter-templates` | JSON | `lettersService.ts` |
| `/api/v1/postcard-templates` CRUD; `POST/PATCH/DELETE /api/v1/letter-templates` | JSON | **none** |
| `POST /api/v1/utilities/{utility_id}/run`, `GET /utilities/jobs/{job_id}`, `GET /utilities/audit` | JSON | **none** |
| 12 audit / history endpoints (§3.13) | JSON | **none** |
| `GET/PATCH /api/v1/offices/{office_id}/statement-settings`, `POST/DELETE …/statement-logo` | JSON | `officeStatementApi.ts` |

There is no XLSX endpoint, no scheduler / routing-slip / day-sheet endpoint, no prescription or perio print endpoint, no label endpoint, and no generic report run / export / schedule endpoint [V-API].

---

## 5. Legacy Reports-menu entries → current FE assets

Legacy labels follow `reference_screenshots.md` §1.2.

| Legacy entry | Existing FE asset | Server asset already available | Gap to legacy |
|---|---|---|---|
| Statements | Statement settings tab; RP statement flags | 7 statement operations + PDF | whole run / preview / print / e-mail / history UI; batch criteria; real e-mail delivery |
| Letters | `src/features/letters/**` (single patient) | `/letters/render`, `/render-batch`, `/batches` | batch runs from a patient list / report result; server PDF |
| Postcards | none | `/postcard-templates` CRUD | render, layout, batch, UI |
| Labels | none (envelope page only) | none | everything |
| Custom Letter / Advanced Custom Letter / Custom Postcard | office assignment of letters only | template CRUD (`is_editable`) | editor UI, merge-field picker (`/letters/merge-fields` is ready) |
| Blank Insurance Forms | `adaClaimFormPdf.ts` can draw the full form outline; `renderAdaCalibrationPage`; reverse-side instructions page; placeholder routes `insurance-forms/*` | server ADA PDF (`mode=form`) | a "blank form" entry point [I: an empty `AdaClaimForm` rendered in `form` mode] |
| Pat Reg / Medical Info Forms | Add Patient wizard (data entry), online-registration consent template (O19) | `medical-history/pdf` (filled) | blank printable registration / medical-history forms |
| Lists ▶ (Patient / Provider / Security / Setup) | Patient List runner report (Reports module); O17 CSV | list endpoints | provider / security / setup list reports |
| Interactive Reports ▶ (Unsigned Progress Notes, Eligibility Verification) | placeholder routes; AppointNow and SMS inboxes are the same interaction pattern | `/reports/insurance-verification-summary` | the work-list screens |
| My Reports (Daily Journal, Appointment Detail by User, Time Clock Report, Production Report, Missing Progress Notes) | "My time card" at `/time-clock` | `/reports/time-clock?user_id=` | the other four |
| Appointment Reports → Lab Reports ("Not Received") | O5–O7 per patient | office-wide `lab-cases`, `report.pdf`, `cost-report`, `export.csv` | office-wide screen / catalog entry only — server is ready |
| Appointment Reports → Routing Slips; Scheduler → Call List | none | none | everything |
| Daily Reports → Daily Journal / day sheet | O3 per patient | `GET /api/v1/transactions`, `/offices/{office_id}/transactions` (see `fe_existing_reports.md` §3.3) | office-wide report |
| Ledger Reports | O2 per patient / account | — | office-wide ledger reports |
| Treatment Plan Reports | O9 per patient | `TreatmentPlanRead` roll-ups | office-wide status / analysis reports |
| Ortho Reports / "Patients on Payment Plan" | O14 per plan | `/ortho-plans`, `/patient-payment-plans`, contract JSON | office-wide lists |
| Daily Audit (Daily Reports) | none | `/audit-logs` (no date filter) | report + date-range filter |
| Utilities → Batch Claims — Paper | simulated utility `batch-paper-med` | ADA batch PDF endpoint | wire the real batch |

---

## 6. How each output should relate to the new Reports hub

### 6.1 Recommendation per output

| ID / area | Relation | Rationale and concrete action |
|---|---|---|
| O1–O4 patient prints | **LEAVE + LINK** | Already server-rendered and audited. Catalog section "Patient documents" that asks for a patient (reuse `src/features/patients/patientLookup.ts`) and calls the same four endpoints through `openServerReport`; wire the patient nav "Print" stub and toolbar `PRINT_REPORTS` to the same launcher. Their office-wide cousins (Daily Journal, Ledger reports) are separate **ENGINE** reports |
| O5–O7 lab reports | patient tab **LEAVE**; office-wide Lab Report + Lab Cost Report **ENGINE** | First low-risk engine adapters: the server already has criteria (`office_id`, `provider_id`, `lab_vendor_id`, status, 4 date bases, `group_by`), JSON, PDF and CSV. Needs `office_ids` / `office_group_id` |
| O8 time clock | **LINK** now, then rebind to the server report | One catalog entry ("Time Clock Report", legacy My Reports) pointing at `/time-clock/report`; replace `buildReport()` + CSV + jsPDF with `/reports/time-clock` (+ `.csv`, `.pdf`), which adds wages, office groups and audit. Keep the bespoke editor UI |
| O9 treatment plan report | **LEAVE + LINK**; office-wide treatment-plan reports **ENGINE** | Move rendering to a server PDF built from the existing `TreatmentPlanReport` JSON; `TxPlanReportModal` is a reference for criteria (plan / phase / status / disclosure / header options) |
| O10 ADA claim form | **LEAVE** on the claim; batch print + blank form **ABSORB** | Switch single print to the server PDF behind `openServerReport` (keeps the client renderer as fallback and the pre-flight checklist); expose the batch endpoint from the hub's Insurance section and from Utilities "Batch Claims — Paper" |
| O11 letters | single-patient **LEAVE + LINK**; batch letters, postcards, labels **ABSORB** as hub "Correspondence" | Any report result that is a patient / responsible-party list should offer "Letters / Postcards / Labels for these rows" → `/letters/render-batch`. Template authoring belongs in Setup |
| O12 perio, O13 Rx, O14 contracts | **LEAVE** (patient documents) | Convert to server PDFs as endpoints appear (contracts are ready; Rx and perio need endpoints). Office-wide equivalents (prescription log, patients on payment plan, perio compliance) are **ENGINE** reports |
| O15, O19 `window.print()` | **LEAVE**, low priority clean-up | |
| O16 SMS log, e-mail log | patient view **LEAVE**; office-wide communication / delivery report **ENGINE** | server list params are ready |
| O17, O18 | O17 → **ENGINE** "Setup lists"; O18 **LEAVE** | |
| O20 Utilities | **LEAVE** as its own module; share infrastructure | Wire it to run / job / audit; reuse its catalog, favourites, recents, history and param-form patterns for the Reports hub (already recommended in `fe_existing_reports.md` §4) |
| Statements | **ABSORB** | Hub "Statements" workspace on the existing endpoints: single patient / account first, then batch with criteria, preview, merged print stream, e-mail, history, reprint. Backend extensions needed (§7, §8.3) |
| Medical History PDF | **LINK** | add the Print button via `getPatientMedicalHistoryPdf`; candidate for "Pat Reg / Medical Info Forms" |
| AppointNow inbox | **LEAVE**; funnel KPIs **ENGINE** | requests by status / office / reason, approval rate, time-to-action, new-patient share |
| Audit / change logs | **ENGINE** ("Audit trail", "Print log", "Signature audit", "Utility runs") | all read endpoints exist; needs a date-range filter on `/audit-logs` |
| Scheduler prints | **ENGINE** (new) | routing slip, day sheet, call list — no existing code to reuse; right code `appointments_scheduler_print` is reserved |

### 6.2 Reusable pieces

| Piece | Reuse for |
|---|---|
| `openServerReport` (`serverReport.ts`) | every "open PDF" action of the hub; extend with timeout / abort, download mode, file name, optional in-app viewer |
| `patientPdf.ts` ⇄ `pdf_report.py` | shared visual language of printed reports (header, section bar, grids, totals, page numbers) |
| `documentAccess.ts` | opening stored artefacts (statement PDFs, archived run outputs) |
| `LetterPreviewModal.tsx` | generic in-app "Report Viewer" shell (page / PDF toggle, footer actions, Save to Chart) |
| `uploadPatientDocument` + `document_type` | "save this report to the patient chart" |
| Utilities shell (`UtilityParamsForm`, `ConfirmDialog`, `RunConsole`, favourites / recents / history) | criteria form, long-running run console, My Favorites / recently run |
| `HoursReport.tsx` | working example of a scoped report: `useReadScope` + `<ScopeToggle>`, period presets, summary → drill-down, totals strip, truncation banner |
| `AdaClaimPrintModal.tsx` pre-flight | "validate before output" pattern for statements and batch claim forms |
| `mergeFields.ts` + `/letters/merge-fields` | merge-token catalog for letters / postcards / labels |
| `TxPlanReportModal.tsx`, `RxPrintDialog.tsx` | small criteria dialogs in the existing visual style |

### 6.3 FE work that needs no new backend (each independently shippable)

| # | Change | Endpoint |
|---|---|---|
| 1 | ADA DIRECT PRINT → server PDF with client fallback | `getAdaClaimFormReport` |
| 2 | Payment-plan Print Contract / Print Coupons → server PDFs | `getPaymentPlanContractPdf`, `getPaymentPlanCouponsPdf` |
| 3 | Medical History Print button | `getPatientMedicalHistoryPdf` |
| 4 | Time Clock report data, CSV and PDF from the server | `getTimeClockReport`, `getTimeClockReportCsv`, `getTimeClockReportPdf` |
| 5 | Single-patient statement: generate, list, open PDF, mark delivered | statement operations |
| 6 | Utilities: real run / job / audit instead of simulation + `localStorage` | `runUtility`, `getUtilityJob`, `listUtilityAudit` |
| 7 | Office-wide Lab Report / Lab Cost Report screen | `listLabCases`, `getLabCostReport`, `printLabReport`, `printLabCostReport`, `exportLabCasesCsv` |
| 8 | Patient "Print" menu → launcher for O1–O4 + medical history + statements | existing |

---

## 7. Backend-gap register — reporting, printing, export, audit

Status column: "server" = what the backend reports or the contract shows; "FE" = what the frontend does today.

### 7.1 Patient prints (`docs/print/*`)

| ID | Concern | Server status | FE state |
|---|---|---|---|
| PRINT-1 | server report endpoints for the four patient screens | delivered 2026-09-11 [D] | wired [V] |
| PRINT-2 | `OfficeRead.logo_url` + `letterhead` | delivered [D] | text used in fallback; logo not drawn [V] |
| PRINT-3 | ledger feed cap 500 → 5,000; PDF uncapped | delivered [D] | `FEED_SIZE = 5000` [V] |
| PRINT-4 | `/balance` vs ledger arithmetic | closed by AL-9 [D] | — |
| PRINT-5 | overview composition / 25-member cap | closed by PRINT-1 [D] | — |
| PRINT-6 | `GET /patients/{id}/day-totals` (`estimated_deductible`) | delivered [D] | wired [V] |
| PRINT-7 / PRINT-8 | subscriber `marital_status`, `sub_phone`, `sec_sub_rel_to_prim_sub`; `plan_effective_date` / `plan_term_date` | already existed [D] | rebound [D] |
| PRINT-9 | ortho patient plan (`pat_*` on `/ortho-plans`) | already existed [D] | wired [D] |
| PRINT-10 | patient photo in the Overview PDF | exists (local storage only) [D] | — |
| PRINT-11 | Overview report latency (47 s) | no response found in either repo; no caching in `print_service.py` [V-BE] → open [I] | "Preparing…" tab |
| PRINT-12 | server Insurance PDF prints raw `marital_status` code | `print_service.py` L1095 still prints the raw value [V-BE] → open | FE maps S/M/D/W |
| PRINT-13 | Ledger PDF lists soft-deleted claims | no response found; `ledger_service.py` has no `is_active` predicate [V-BE] → open [I] | screen hides them |
| PHOTO-BE-5 | Overview PDF skips bucket-stored photos | open [D] `docs/patient-photo/patient_photo_backend_devreport.md` | — |

### 7.2 Letters and consent forms (`docs/letters/*`)

| ID | Concern | Server status | FE state |
|---|---|---|---|
| LTR-1 | consent PDFs in object storage, `/content` proxy, `GET /consent-forms` | done, needs `GCS_BUCKET_DOCUMENTS` [D] | handled |
| LTR-2 | `LETTERTYPE` definitions | done [D] | wired [V] |
| LTR-3 | provider / marketing / corporate merge sources | done, data must be filled [D] | — |
| LTR-4 | `#TX_PLAN_TH_NUMBER#` via `treatment_plan_id` | done [D] | wired [V] |
| LTR-5 | `/letters/render`, `/render-batch`, `/batches`, `/merge-fields` | done [D], [V-API] | only `/merge-fields` used; no server PDF |
| LTR-6 | `/patients/{id}/letter-context` | done | wired [V] |
| LTR-7 | `/letter-templates/effective` | done | wired [V] |
| LTR-8 / LTR-9 | mojibake `?` in 21 bodies; `channel` field offset, 11 truncated "Financial Agreement" bodies | repair script shipped, **data not mutated — needs sign-off / re-import** [D] | prints as stored |
| LTR-10 | consent status vocabulary + `/sign` | done | wired [V] |
| LTR-11 | timezone offsets on datetimes | done API-wide [D] | — |
| LTR-12 | `/patient-documents` filters + paging | done [D] | wired |
| LTR-13 | `#APPT_PRDR#` fallback next → last → preferred; `last_appointment_provider` | done [D] backend round 2; field present [V-API] | client residual still in `mergeFields.ts` |
| LTR-14 | `today` in office timezone; `timezone` field | done [D]; field present [V-API] | version probe self-retires the override [D] |
| LTR-15 | `overrides` + `signing_provider_id` on `/letters/render` | done [D]; fields present [V-API] | `/letters/render` still unused [V] |
| LTR-16 | bucket path verified end to end | partly [D] | — |
| LTR-17 | `appointment_source`, `appointment_provider_source`, `fallback_tokens` | done [D]; fields present [V-API] | not displayed [V] |
| LTR-18 | consent PDFs `storage_backend: "local"` → 404 on Cloud Run | open, no response found [D] | cloud-off marker |
| LTR-19 | `file_url` host inconsistent | addressed by CS-6 (request origin) [D] | path-keyed fetch |
| LTR-20 | `mime_type` / `file_path` always null | unknown | — |
| CS-1 | `signed_document_id` beside `signature_data` | shipped [D]; field present [V-API] | not sent (`onRecordStored`) [V] |
| CS-2 | countersign storage (`consent_signatures`, `/countersign`) | shipped [D], [V-API] | countersign only stamped into the PDF [V] |
| CS-3 … CS-8 | `signed_at` / `captured_at`, as-signed rendition + `content_hash`, `include_signature=false`, `file_url` origin, creator rule, `capture_method` | shipped [D] `dentc-backend/docs/letters/consent_inline_signing_backend_response.md` | not adopted |
| OA-29/30/31 | office assignment of macros / Rx / letters | letters partly resolved [D] | Letters tab exists [V] |

### 7.3 Time clock (`docs/time-clock/*`)

| ID | Concern | Server status [D] `dentc-backend/docs/time-clock/time_clock_backend_response.md` (2026-10-03) | FE state [V] |
|---|---|---|---|
| TC-BE-1 / 2 | server-stamped clock-in / out, one open shift | done | client timestamps + pre-check |
| TC-BE-3 | `total_hours` server-computed | done | still sends `total_hours` |
| TC-BE-4 | `clock_in_from` / `clock_in_to` | done | crawl |
| TC-BE-5 | caller-based authorization | done | client role gate |
| TC-BE-6 | soft delete, edit audit, `/history`, `/restore` | done | not shown |
| TC-BE-7 | overtime enum + thresholds, `/time-clock/settings` | done | four fixed presets |
| **TC-BE-8** | **server hours report JSON / CSV / PDF** | done, audited | not used |
| TC-BE-9 | legacy wall-clock rows → `clock_basis` | tooling; backfill not run | `LEGACY_WALL_CLOCK_ZONE` |
| TC-BE-10 | auto-close of forgotten clock-outs | done | 20 h rule in the FE |
| TC-BE-11 | `user_name`, `office_name` on reads | done | `/users` directory crawl |
| TC-BE-12 | `entry_type` work / break / lunch | done | not modelled |
| **TC-BE-13** | **wages (`include_wages`)**; payroll-vendor CSV layouts (ADP / Gusto / Paychex) | hours × rate done; vendor layouts not built | hours only |
| TC-BE-14 | pay-period approve / lock | done | no screen |

The response notes the migration `1745e318c65a` was not applied to the dev DB at the time; the endpoints are in the current `openapi.json` [V-API].

### 7.4 Utilities (`docs/utilities/*`)

| ID | Concern | Server status [D] `dentc-backend/docs/Final/BACKEND_IMPLEMENTATION_RESPONSE.md` L103-108 | FE state [V] |
|---|---|---|---|
| UTIL-1 | run / job API | contract done; per-utility batch logic not implemented | simulation |
| UTIL-2 | durable audit (`GET /utilities/audit`) | done | `localStorage` |
| UTIL-3 | server RBAC on run (`admin`) | done | client role map |
| UTIL-4 | fee-schedule bulk update + template import | deferred | client validation only |
| UTIL-5 | integrations status + sync | deferred | simulated |
| UTIL-6 | launch registry | deferred | hard-coded URLs |

### 7.5 Other modules

| ID | Concern | Server status | FE state |
|---|---|---|---|
| STMT-1 / 2 / 3 | statement generate, batch, delivery / PDF | endpoints exist [V-API]; e-mail delivery is intent-only, batch synchronous [V-BE] | no UI [V] |
| ADA-BE-1 | server-rendered claim form + audit + batch | done 2026-09-11 [D] | client render [V] |
| ADA-BE-2 … 14, CLM-FO-1 … 5 | claim columns for all form items; fill-out record | done [D] | still reads the `localStorage` fill-out record and local stores [V] |
| SIG-8 | signature audit events | shipped [D]; `/signature-audit-events` [V-API] | unused |
| SIG-11 … 16 | claim signature binding; server PDF embeds signature images | shipped [D] `dentc-backend/docs/signature/topaz_signature_backend_response.md` | client only |
| PP-3 | contract / coupon PDFs (+ contract JSON) | shipped [D], [V-API] | client jsPDF; `planPrint.ts` cites a non-existent "PP-10" [V] |
| OPP-5 / RPP-3 | `financial_disclosure` (which disclosure prints) | shipped: key into `GET /definitions?group_code=financial_disclosure` (seeded `STD` / `NOFIN` / `ORTHO`); the contract endpoint resolves `disclosure_text` [D] `dentc-backend/docs/payment-plans/payment_plans_backend_response.md` | hard-coded texts |
| OPP-7 | `ins_mon_claim_print_fee`, `ins_suppress_periodic_printing` (+ secondary) | shipped [D] same | not checked |
| PP-7 | audit trail on contract changes | shipped [D] same | not shown |
| PLAN-6 | treatment-plan server export | JSON report delivered; no PDF [D], [V-API] | client jsPDF |
| PLAN-8 | plan uploads missing from the document list | resolved (list is patient-scoped) [D] `dentc-backend/docs/treatment plans/treatment_plan_edit_backend_response.md` | — |
| PLAN-21 / 22 / 23 | deductible tilde, cash / credit Est Pat split, signature on the printed plan | PLAN-21: `deductible_applied` per line on the report payload; PLAN-22 not modelled; PLAN-23 left as an FE / print follow-up [D] same | none printed |
| TX-MAX-6 | report payload carries netted annual max / deductible | delivered [D] | printed [V] |
| PERIO-BE-10 | server compare / summary / print | compare delivered; print intentionally client-side [D] | client jsPDF |
| RX-P4 | prescription print / export endpoint | none [V-API] → open | client jsPDF |
| RX-P6 | prescription print log (`printed_at` / `printed_by`) | none [V-API] → open | no record |
| MH-15 | medical-history PDF | fixed [D], [V-API] | no button [V] |
| MH-8, MH-17 … 22 | change history / created-modified stamps | field-level log + `/audit`, `/changes`, `/versions` [D], [V-API] | computed client-side [V] |
| LAB-4 / LAB-5 | lab report PDF, cost report, CSV, office-wide feed | done [D] | report PDF + CSV used; cost report unused [V] |
| LAB-13 | cost report has no `patient_id` | open (param absent) [V-API] | client cost report |
| SCHED-CONS-G9 | appointment print (routing slip / walkout / day sheet) | none [V-API] → open | UI removed [D] |
| SCHED-EMAIL-1 | e-mail send endpoint | `/email/send` exists [V-API] | used for patient e-mail [V] |
| AUD-1 | per-record change history (`resource_id` filter) | filter present [V-API] | unused |
| AUD-2 | creator / timestamps on ledger rows | AL-10 `created_by_legacy` + feed fallback [D] | — |
| AUD-3 | claim status history | endpoint present [V-API] | unused |
| EDIT-PLAN-6 | plan history | `/insurance-plans/{plan_id}/history` present [V-API] | unused |
| SMS-6 / SMS-9 / SMS-10 | practice-wide inbox, automated reminders, audit + retention | done [D] `dentc-backend/docs/sms/SMS_BACKEND_RESPONSE.md` | patient view only |
| INS-11 | pending verifications KPI | `/reports/insurance-verification-summary` present [V-API] | unused (see `fe_existing_reports.md`) |
| REPORTS-G1 … G10, DASH-1 … 5 | aggregation, A/R, aging, export / e-mail / schedules (G4), enums, denormalised names | see `fe_existing_reports.md` §3.4; **G4 (server export / email / scheduled reports) is still open** | — |
| OFF-SCOPE-2 / 8 / 13 / 18 | office filter semantics, `office_ids` / `office_group_id`, all-offices right (`reports:all_offices` collapsed into `office_scope_view_all_offices`), dashboard aggregates | done [D] `docs/office-scope/office_scope_backend_response*.md` | partly adopted |
| IMG-6 | image view audit trail | not checked | — |
| HELP-4 | ticket audit persistence | done [D] `dentc-backend/docs/Final/BACKEND_IMPLEMENTATION_RESPONSE.md` | not checked |
| MP-8 / MP-9 | per-user activity log; personal KPI aggregation | not checked | — |
| REST-6 | FHIR R4 export | deferred [D] | — |
| NOTE-DOC-2 / 3, IMG-5 | document storage on local disk, unauthenticated `/uploads`, signed URLs | partly addressed (LTR-1, proxy) [D] | `documentAccess.ts` |

---

## 8. Defects, drift and risks found while reading

### 8.1 Code defects

| # | Issue | Evidence |
|---|---|---|
| X1 | `openServerReport` fallback opens its window **after** an await (the pre-opened tab is closed first), so the jsPDF fallback can be popup-blocked — the file's own header says an un-gestured `window.open` is blocked | [V] `serverReport.ts` L10-11, L64-69 + `patientPdf.ts` L258; effect [I] |
| X2 | No timeout / abort on server reports; closing the "Preparing…" tab does not cancel the request (Overview measured at 47 s) | [V] no `AbortSignal` passed; timing [D] |
| X3 | `LetterPreviewModal.onPrint` checks the return of `window.open(url, '_blank', 'noopener,noreferrer')`; with `noopener` the call returns `null`, so the "Allow pop-ups to print this letter" toast fires even when the tab opened | [V] L263-264; behaviour [I] |
| X4 | `OnlineRegistrationTabContent.handleGeneratePDF` needs the window handle for `document.write` but opens it with `noopener` → always takes the "Popup blocked" branch | [V] L115-119; behaviour [I] |
| X5 | Ledger fallback PDF prints "Showing the first 500 transactions per patient" although the cap is 5,000 | [V] `ledgerPrint.ts` L86 vs `accountLedgerService.ts` L31 |
| X6 | Treatment-plan report and payment-plan contract / coupons print the **patient's own name** as responsible party (`respParty: name`, `responsible_party: patient.name`); "Print Resp. Party Address" prints the patient's address — wrong for any dependent on a guarantor's account | [V] `TreatmentPlanPage.tsx` L750-765; `RegularPaymentPlanPage.tsx` L250; `OrthoPaymentPlanPage.tsx` L402 |
| X7 | "Save PDF to Notes" uploads to patient documents, not notes; the preview does not open the print dialog | [V] `TxPlanReportModal.tsx` L163, `TreatmentPlanPage.tsx` L781-797 |
| X8 | Lab toolbar comment says both reports are server PDFs; the Cost Report is client-only and `fetchLabCostReportPdf` is dead code | [V] `LabTrackingToolbar.tsx` L5, `LabTrackingPage.tsx` L215-221 |
| X9 | Disclosure texts are hard-coded in two files with different wording for the same key | [V] `txReport.ts` L13-21, `planPrint.ts` L12-25 |
| X10 | Four CSV writers, none guards against formula injection; one has no BOM | [V] §2.5 |
| X11 | Client prints leave no audit; the ADA print log lives in `localStorage` (per browser, last 50) | [V] `adaLocalStores.ts` L82-102 |
| X12 | Time Clock: client overtime presets can disagree with the server rules; "My offices" filtered after the crawl; silent truncation risk at 12,000 punches is only a banner | [V] §3.4 |
| X13 | Medical History change log cannot show previous values (derived from current rows) although the server keeps a field-level log | [V] `medicalHistoryService.ts` L221-260; server [D] |
| X14 | `BillingDetailsModal` Print prints the whole browser page | [V] L87 |
| X15 | Standard-font PDFs cannot render non-WinAnsi characters (names, typographic punctuation) | [V] `letterPdf.ts` `PDF_CHAR_MAP`; wider effect [I] |

### 8.2 Stale comments and docs (FE lags the backend)

| File | Stale statement |
|---|---|
| `src/features/print/patientPdf.ts` L3-7 | "There is no backend report/render endpoint for any of these screens" |
| `src/features/time-clock/timeClockPrint.ts` L2-3 | "There is no server-rendered time-clock PDF yet (TC-BE-8)" |
| `src/features/time-clock/timeClockService.ts` L5-10, `timeClockAccess.ts` L3-4 | "The backend exposes plain CRUD only" / "does not restrict list/patch by caller yet" |
| `src/features/letters/letterPdf.ts` L3 | "There is no backend letter render/export endpoint (gap LTR-5)" (render exists; PDF export does not) |
| `src/features/treatment-plans/txReport.ts` L3 | "There is no backend treatment-plan report/export endpoint (see PLAN-6)" (JSON report exists) |
| `src/features/payment-plans/planPrint.ts` L3 | "The backend has no contract/coupon report endpoint (gap PP-10)" (shipped; the gap is PP-3) |
| `src/features/claims/ada/AdaClaimPrintModal.tsx` L10, `src/components/patient/ClaimDetail.tsx` L236, L711 | "no server audit yet — ADA-BE-1" / "No server report route exists (PRINT-1)" |
| `src/components/utilities/lib/useUtilityRun.ts` L8-10, `utilitiesStorage.ts` L3-4 | "exposes no execution endpoints" / "no … audit-log endpoints" |
| `docs/time-clock/`, `docs/utilities/` | contain only the dev reports; responses exist only under `dentc-backend/docs/time-clock/`, `dentc-backend/docs/Final/` |
| `docs/letters/letters_backend_response.md` | FE copy is round 1 (322 lines); rounds 2–3 (LTR-13 … 17) and the consent-signing response exist only in `dentc-backend/docs/letters/` |
| `docs/CONSOLIDATED_BACKEND_GAPS.md` (2026-08-29) | lists LTR-13 … 17, TC-BE-*, CS-*, UTIL-1 … 3, STMT-*, ADA-BE-1, PP-3, MH-15, AUD-1/3 as open |

### 8.3 Risks for the plan

| # | Risk |
|---|---|
| R1 | Statement batch as built will not scale: one synchronous request, per-patient balance calls, full result in the response, one office, no real e-mail, no merged PDF [V-BE]. Legacy statement criteria need a job-based redesign before the hub can absorb Statements. |
| R2 | Two PDF stacks (reportlab server, jsPDF client) with eight client header styles; without a single server render path the "same report, different look / different numbers" problem grows with every report added. |
| R3 | Audit coverage is split: server `PRINT` rows for 4 routers (`record_print`), none for payment-plan / statement / medical-history PDFs, nothing for client prints. A compliance "who printed what" report is only complete after client prints move server-side or post a print-log call, and after every server render path calls `record_print`. |
| R4 | Consent / letter PDFs stored with `storage_backend: "local"` are unreachable on Cloud Run (LTR-18) [D]; any "archive report output" feature inherits the storage configuration problem. |
| R5 | Letter template data quality (LTR-8 / LTR-9) is unresolved [D]; batch collection letters would print the damaged bodies at volume. |
| R6 | Rights are defined but dark; opening batch statements, audit reports and wage data (`include_wages`) to every authenticated user is not acceptable — the hub needs right checks from day one. |
| R7 | The e-mail gateway cannot carry attachments or address staff; scheduled / e-mailed reports need a new delivery path. |
| R8 | Office groups are unsupported in every existing output (FE) and in the lab, statement and patient-report endpoints (single `office_id`); only the time-clock report and list endpoints accept `office_ids` / `office_group_id` [V-API]. |
| R9 | Several per-patient builders take camelCase view models (`officeName`, `patientName`, `chartNo` in `labReportPrint.ts` / `txReport.ts`; `examDate`, `addressLines`, `taxId` in `perioPrint.ts`; `addressLine`, `cityStateZip` in `rxPrint.ts`) — do not copy those shapes into the engine; the project rule is snake_case end to end. |

---

## 9. Rights relevant to these outputs

| Right code (`src/features/access-control/rightCodes.ts`) | Intended for | Referenced at a call site? [V] |
|---|---|---|
| `charting_perio_print` (`RIGHT.charting.perioPrint`) | O12 | no |
| `transactions_claims_ada_direct_print` (`RIGHT.transactions.claimsAdaDirectPrint`) | O10 | no |
| `appointments_scheduler_print` (`RIGHT.appointments.schedulerPrint`) | scheduler print (not built) | no |
| `patient_letters_full_control`, `patient_letters_view_only` | O11 (tab) | tab-visibility map only (`PatientSecondaryNav.tsx` `TAB_RIGHTS` L37-63) |
| `patient_letters_generate`, `patient_consent_sign` | O11 (generate / sign) | no |
| `patient_lab_cases_full_control` / `_view_only` | O5–O7 | tab-visibility map only; the report / export buttons are not gated |
| `imaging_export` | image export | no |
| `office_scope_view_all_offices` | all-offices reads | via office-scope model |

`RIGHTS_ENFORCED_DEFAULT = false` (`src/features/access-control/rights.ts` L27). Server-side: time-clock wages are owner / admin / super_admin only; utility run requires `admin`; time-clock team report requires a manager role or `utilities_time_clock_editor_full_control` [D]. The backend rights catalog's "Reports" category (106 rows, ≈ 31 other tenants' office reports) and the proposed keep-list (Letters, Statements, Lists, Labels, Postcards, Blank Insurance Form, Batch Collection Letters) are analysed in `docs/setup/security/ACCESS_RIGHTS_CATALOG_AUDIT.md` L47, L70, L98, L141.

---

## 10. Open questions

1. Statements: is the hub expected to own the whole statement cycle (run, preview, print stream, e-mail, close-out per `statement_close_out_individual`, reprint history), and may the backend batch be redesigned as an asynchronous job with office-group and billing criteria?
2. Do patient documents (overview, ledger, Rx, perio, treatment plan, consent, contract) appear in the Reports catalog behind a patient picker, or only through the patient "Print" menu?
3. Is the target a single server render path for every printed output (retire the jsPDF builders once endpoints exist), or do client fallbacks stay permanently?
4. Should client-only prints post a print-log call until they are server-rendered, so the audit / print-log report is complete (Rx is the compliance-sensitive one)?
5. Labels and postcards: which stock / layouts are required (Avery sheet sizes, postcard dimensions), and are they driven from report results (recall, birthday, collection lists) as in the legacy tool?
6. Are batch collection letters (`CS001…CS009`) in scope for the first phases, and who signs off the LTR-8 / LTR-9 template repair first?
7. Is Utilities to remain a separate module sharing the run / job / audit infrastructure, or should its report-like entries (EClaims Management, Batch Eligibility, exports) move into the hub as interactive reports?
8. Which delivery channel will scheduled reports use — an extension of the SendGrid gateway (attachments, staff recipients) or in-app delivery only?
