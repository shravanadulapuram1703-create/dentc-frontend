# Access Rights Catalog Audit — Setup → Security → Groups

> **Scope:** Audit of the "User Group Access Rights" catalog shown in **Group Setup**
> (`AddEditGroupModal.tsx`), which lists **529** assignable rights served by the backend
> `GET /api/v1/permissions` (`PermissionRead { code, label, category }`).
> **Goal:** Decide what to **remove**, what to **keep/rename**, and what to **add** so that
> *every real DentC operation has a permission item* before we wire enforcement onto users.
> **Date:** 2026-09-13

---

## 0. TL;DR

- The 529-item list is the **legacy Denticon rights catalog, screen-scraped wholesale** — not a
  catalog built for DentC. Proof: 12 rows are literally audit metadata (`Modified On: 1/14/2022 6:09:00
  AM PT`), and ~31 rows are *other Denticon customers'* bespoke office reports (CHI St. Joseph, Kane
  Dental, Hawaii, …).
- **It is currently cosmetic** — verified there is **no permission enforcement anywhere in the
  frontend** yet (the only `hasPermission`-style code is browser *device* permissions in `features/imaging`).
  So we can reshape the catalog freely; nothing breaks.
- Recommended disposition of the 529:

  | Bucket | Count | Action |
  |---|---:|---|
  | **Tier-1 REMOVE** — junk / not-DentC | **143** | Delete outright |
  | **Tier-2 DROP** — Denticon features with no DentC screen | **67** | Delete (of 80 reviewed; see §2) |
  | **Tier-2 KEEP** — roadmap stubs / rename | **13** | Keep (4 clusters — decided 2026-09-13) |
  | **CORE** — maps to a real DentC screen | **306** | Keep (mostly rename/normalize to DentC terms) |
  | **ADD** — DentC operations with **no** permission today | **~45 new** | Add (see §4) |

  → **Remove 210** (143 + 67), **retain 319** (306 + 13), **add ~45** → a clean DentC catalog of
  **~360 well-defined rights**, every one pointing at a real screen or operation, instead of 529 noisy ones.

---

## 1. What this list actually is

The catalog was imported from Denticon's Security → Group screen. Category names alone give it away:
`Denticon Practice Analytics`, `MyTooth`, `AthenaNet`, `EHR`, `HelpAndSupport`, plus codes like
`denticon_mobile_access`, `utilities_denticon_download`, `utilities_dentigram_download`.

### Current category inventory (529)

| Category | Count | Notes |
|---|---:|---|
| Setup | 121 | ~90 map to DentC setup screens; ~28 are Denticon-only setup; a few junk |
| Reports | 106 | ~31 client-specific office reports (junk); most others legacy/aspirational |
| Utilities | 94 | Half are Denticon integrations / EDI / campaigns not in DentC |
| Patient | 71 | Mostly real DentC patient operations |
| Transactions | 53 | Almost all real (ledger, payments, claims, treatment plan) |
| Appointments | 32 | Almost all real (scheduler) |
| General | 20 | **100% junk** — audit-metadata + client-specific batch utils |
| Denticon Practice Analytics | 10 | Denticon product — replace with DentC Dashboard |
| EHR | 9 | Denticon EHR/meaningful-use — DentC is dental-only |
| Report *(singleton dup of "Reports")* | 4 | Data-quality: Batch Schedule Report |
| MyTooth | 3 | Denticon patient-engagement product |
| Help | 2 | 1 junk (invoices), 1 keep-ish |
| AthenaNet / Charting / HelpAndSupport / Transaction | 1 each | Singleton categories (data-quality) |

---

## 2. REMOVE

### Tier-1 — high-confidence junk / not-DentC (143 rows)

| # | Bucket | What it is | Action |
|---:|---|---|---|
| 12 | **Audit-metadata scraped as rights** | `Modified By:`, `Modified By: DHILEEP.JIN2829`, `Modified On: 3/13/2025 10:05:00 AM PT`, … | Delete — these are not permissions at all |
| 40 | **Denticon / 3rd-party products** | Denticon Practice Analytics (10), MyTooth (3), AthenaNet (1), EHR (9), Dentilytics, Denticon Mobile/Download, Dentigram, MouthWatch, Radius, Transworld, Voice/AI charting | Delete — none of these products exist in DentC |
| 31 | **Client-org-specific office reports** | `Office Reports - CHI St. Joseph…`, `- Kane Dental`, `- HawaiiRpts`, `- Lumina`, `- NEDMRpts`, `- Village Family Dental`, … | Delete — other Denticon tenants' bespoke reports |
| 20 | **Automated Campaigns** | Full campaign/marketing engine (ad-hoc, appointment, recurring, patient-care, mailing lists, templates) | Delete — no campaigns module in DentC |
| 22 | **DHA/DCA/EDI download utilities** | 835 Hub, 837 downloads, Encounter Download, eClaims Mgmt, Direct Claims, Batch Claim Processing, DHA close-out, DCA close-out | Delete — DentC has no EDI batch/clearinghouse layer |
| 12 | **Task Manager / Tickler / Time Clock** | Task Manager (6), Tickler (2), Time Clock (4) | Delete — none built in DentC |
|  6 | **Client-specific batch utils / migration** | Mid-Atlantic BatchFlashAlerts, Data Conversion Mapping, Scheduled Reallocation | Delete |
| **143** | | | |

### Tier-2 — reviewed per-module (80 rows): Denticon features with no DentC screen

These *could* be legitimate someday but have **no screen in DentC today**. Reviewed as 29 module clusters;
**decision (2026-09-13): keep 13 rows (4 clusters), drop the other 67.**

#### KEEP — 13 rows (4 clusters)

| Cluster | Rows | Why kept | Disposition |
|---|---:|---|---|
| **Cross-coders** (CDT↔CPT, CDT↔ICD, CPT↔ICD) | 6 | DentC ships placeholder routes `/setup/procedure-codes/{cdt-to-cpt,cpt-to-icd,cdt-to-icd}` | Roadmap stub |
| **External API / Vendor Access** (Setup) | 3 | DentC ships placeholder routes `/setup/offices/vendor-api-settings-{legacy,new}` | Roadmap stub |
| **DPS Ins Verification** (Appointments) | 2 | DentC nav surfaces "DPS Insurance Verifications" (integration placeholder) | Roadmap stub |
| **Two-Way Communication** (Utilities) | 2 | **Real** — patient SMS two-way exists today | Keep + **rename** to DentC "Patient SMS / Two-Way Communication" |

#### DROP — 67 rows (25 clusters)

No DentC screen and no near-term intent; re-add per-cluster when/if the module ships.

| Category | Drop count | Clusters dropped |
|---|---:|---|
| Setup | 22 | Code Bundling, Collection Agencies, Provider Goals, SSO/Multi-PGID Users, Reset Benefits, Ortho Misc/Questionnaire, Misc Screen / Emergency Now |
| Reports | 18 | Batch Collection Letters, Postcards/Custom Postcard, DHA Reports, Ortho Reports, Recall Reports, Excel Reports, Labels, Blank Insurance Form, Batch Schedule Report *(incl. the "Report" dup category)* |
| Utilities | 10 | Consolidate/Replace Carriers·Plans·Codes (8), Batch Eligibility (2) |
| Patient | 8 | Caries Risk Assessment, Status Tracker, Flash Alerts, Reallocate |
| Transactions | 6 | Capitation Payments (1), Batch Insurance Payments / 835 / Dentical (5, incl. the "Transaction" dup) |
| Appointments | 2 | Short call list, Short notice list |
| **Total** | **67** | |

> **Note on the "your call" clusters** (Recall Reports, Excel Reports, Flash Alerts, Batch Eligibility,
> Batch Insurance Payments/835): dropped for now — each maps to *adjacent* DentC functionality (recall
> *due-dates*, report-runner Excel export, patient/medical *alerts*, treatment-plan *batched eligibility*)
> but not to a standalone screen the right would gate. Re-introduce as those surfaces grow.

---

## 3. KEEP / RENAME — the DentC-mapped core (306 rows)

These map cleanly to real DentC screens. **Keep them**, but two cleanups:

1. **Rename Denticon terminology → DentC terminology** in labels (not codes, if codes are already the
   stable key). E.g. "Messaging Hub" → patient SMS/Communication; "PGID" → tenant/organization.
2. **Normalize categories** (data-quality): merge the singleton/duplicate categories into their canonical
   parent so the picker groups cleanly:
   - `Report` (4) → **Reports**
   - `Transaction` (1) → **Transactions**
   - `HelpAndSupport` (1) → **Help**
   - `Charting` (1) → keep as **Charting** (and grow it — see §4)

Core coverage that is already good (representative, not exhaustive):

| DentC area | Legacy rights that already cover it |
|---|---|
| **Appointments / Scheduler** | Add/Edit/Delete/Move/Reschedule/Post/Save appt, Change status, Add procedures, Find slot, Daily/Weekly views, Override lunch/reserved, Add-in-other-office, Quick Add Tx Plans |
| **Transactions / Ledger** | Patient Ledger (full/view), Transaction Entry, Add/Delete Procedure, Edit Fee, Add/Post & Change & Delete Patient/Insurance Payments, Add Adjustments, Ledger Note, Locked-account posting, back-dated payment |
| **Treatment Plans** | TP Add/Delete/Discount/Edit Fee/Re-Estimate/Post-to-Ledger/Change Status, TP screen full/view |
| **Claims / Pre-Auth** | Insurance Claim Details (full/view), Delete Insurance Claims, Generate/Delete Pre-Auth, Pre-Auth list/detail |
| **Patient core** | Patient Info/Overview (full/view), Responsible Party, Search, Add New Patient/Member (+Quick Save), Delete Patient Info, Access SSN, Link/Move Patient, Change Home Office/Provider |
| **Medical History** | Medical History (full/view) |
| **Progress Notes** | Add/Edit/View Progress Notes |
| **Patient Notes** | Add/Edit/Delete/View Patient Notes |
| **Prescriptions** | Prescription screen (full/view), Strike Off |
| **Payment Plans** | Regular & Ortho PP (full/view + delete), Post PP charges (regular/ortho/practice) |
| **Insurance (patient)** | Insurance Plan Info (full/view), Delete/Un-attach Plan, Fill-Out Form (dental/medical) |
| **Setup (screens)** | Office, Office Groups, Account, Users, Groups, Providers (+per-office), Insurance Plans/Carriers/Custom Coverage/Employers, Labs/Core Labs, Referrals(+demographics), Procedure/ICD/Modifier/PlaceOfService/TypeOfService/Explosion codes, Fee Schedules(+assignments), Charting Colors/Materials, Perio Template, Medical/Dental Questionnaire, Medical Alerts, Pick List, Custom Toolbar, Prescriptions, Notes Macros(+delete), Payment Types, Frequency-Limit Code Group |
| **Reports** | Daily/Monthly/Management/Insurance/Ledger/Appointment/Treatment-Plan/Recall reports, Letters, Statements, Lists (Patient/Provider/Employer/Office/Responsible-Party) |
| **Utilities** | Change Patient Fee Schedule / Home Office / Provider, Change Future Appts by Provider, Referral Management, Copy Letters, Copy Notes Macros, Text Message Details |

---

## 4. ADD — DentC operations with **no** permission today

This is the important half: real, shipped DentC screens/operations that have **zero** representation in
the catalog. Proposed rights follow the legacy **Full Control / View Only** pair pattern plus discrete
action rights, so they slot into the same picker.

### 4.1 Clinical charting (largest gap)

| Module | Proposed right(s) | Why it's missing |
|---|---|---|
| **Restorative Charting** (`/patient/:id/restorative`) | `charting_restorative_full_control`, `charting_restorative_view_only`, `charting_restorative_delete_condition` | Catalog's only "Charting" row is Denticon **AI Assist** (removed). No right for the actual tooth chart. |
| **Perio Charting** (`/patient/:id/perio`) | `charting_perio_full_control`, `charting_perio_view_only`, `charting_perio_compare`, `charting_perio_print` | Only a *Setup* perio template right exists — nothing for entering/viewing exams. |
| **Imaging / X-rays** (`/patient/:id/imaging`) | `imaging_full_control`, `imaging_view_only`, `imaging_capture_acquire`, `imaging_delete_image`, `imaging_export` | No imaging right of any kind. |

### 4.2 Patient tabs with no right

| Module | Proposed right(s) |
|---|---|
| **Lab Tracking** (patient lab cases, `/patient/:id/lab-tracking`) | `patient_lab_cases_full_control`, `patient_lab_cases_view_only` (create/send/receive case) — *distinct from* the existing `setup_labs_screen` catalog right |
| **Documents** (`/patient/:id/documents`) | `patient_documents_full_control`, `patient_documents_view_only`, `patient_documents_upload`, `patient_documents_delete` |
| **Letters** (patient, `/patient/:id/letters`) | `patient_letters_full_control`, `patient_letters_view_only`, `patient_letters_generate` |
| **Consent / e-signature** (LetterPreview + ConsentSignatureBlock, Topaz) | `patient_consent_sign` |
| **Emergency Contacts** (`/patient/:id/emergency-contacts`) | `patient_emergency_contacts_full_control`, `patient_emergency_contacts_view_only` |

### 4.3 Claims — DentC-specific pieces

| Operation | Proposed right(s) |
|---|---|
| **ADA claim form Direct Print** (client-side ADA 2024) | `claims_ada_direct_print` |
| **Claim Save-as-Draft** | `claims_save_draft` |
| **Create secondary…quaternary claim** | `claims_create_secondary_plus` |

### 4.4 Scheduler

| Operation | Proposed right |
|---|---|
| **Scheduler Print** (backend print pending) | `appointments_scheduler_print` |

### 4.5 AppointNow (public online booking + staff inbox) — DentC-specific, zero coverage

| Operation | Proposed right(s) |
|---|---|
| Staff request inbox (`/appointnow/requests`) | `appointnow_request_inbox_full_control`, `appointnow_request_inbox_view_only` |
| Approve / decline a booking | `appointnow_approve_booking`, `appointnow_decline_booking` |
| Public booking-page / office config | `setup_appointnow_config` |

### 4.6 Messaging & Communications

| Operation | Proposed right(s) |
|---|---|
| **Direct Messaging** (user-to-user DM, replaced AI chat) | `messaging_direct_messages_full_control`, `messaging_direct_messages_view_only` |
| **Phone Assignments** (Twilio From-numbers, Setup→Communications on Account) | `setup_communications_phone_assignments_full_control`, `..._view_only` (currently only implicitly under Account Full Control) |
| Patient SMS inbox / send (Twilio) | *covered* by legacy `patient_messaging_hub_*` + `utilities_text_message_details_*` — **rename** to DentC terms rather than add |

### 4.7 Help / Support (DentC → Jira)

| Operation | Proposed right(s) |
|---|---|
| Help Center access | `help_center_access` |
| Report an Issue (submit Jira ticket) | `help_report_an_issue` |
| My Tickets (view / status) | `help_my_tickets_view` |
| *(remove legacy `help_access_invoices` — Denticon billing)* | — |

### 4.8 Home / dashboards

| Screen | Proposed right |
|---|---|
| **Dashboard** (KPI widgets, `/dashboard`) | `dashboard_view` — replaces the removed Denticon Practice Analytics rights |
| **My Page** (personalized home, `/my-page`) | `my_page_access` *(low priority — personal home)* |

### 4.9 Devices & cross-office scope

| Item | Proposed right |
|---|---|
| **Signature Pad** setup/diagnostics (`/setup/devices/signature-pad`) | `setup_signature_pad_device_full_control` |
| **Cross-office data visibility** (This office / My offices / All offices; tied to `can_view_all_offices`) | `office_scope_view_all_offices` — note: office membership is **not** enforced client-side yet (`OFFICE_ASSIGNMENT_ENFORCED = false`); pair this with the backend `user_offices` work |

---

## 5. Data-quality fixes (independent of add/remove)

1. **Delete the 12 `Modified By:` / `Modified On:` rows** — scraping artifacts, never valid rights.
2. **Collapse duplicate categories:** `Report`→`Reports`, `Transaction`→`Transactions`,
   `HelpAndSupport`→`Help`.
3. **De-duplicate near-identical codes**, e.g. `utilities_encounter_download_*` vs
   `utilities_encounterdownload_*` (both slated for removal anyway).
4. **Fix mojibake:** MyTooth labels contain `â€“` (bad en-dash encoding) — moot if MyTooth is removed.

---

## 6. Recommended target shape & next steps

**Target catalog** = **319 retained** (306 core + 13 Tier-2 kept) − *(210 removed: 143 Tier-1 + 67 Tier-2)*
+ **~45 adds** → a curated **~360** rights, every one of which points at a real DentC screen or operation.

**Tier-2 decision (2026-09-13):** keep 4 clusters (13 rows) — Cross-coders, External API/Vendor, DPS Ins
Verification (roadmap stubs), and Two-Way Communication (rename to Patient SMS). Drop the other 67. See §2.

Suggested sequencing (this doc covers step 1 only):

1. ✅ **Audit** (this document) — remove/keep/add lists agreed, incl. the Tier-2 per-module decision.
2. **Curate the backend catalog** — seed the pruned + added rights into `GET /api/v1/permissions`
   (owns `code`/`label`/`category`). This is a backend data change; the FE picker updates automatically.
3. **Define enforcement seams** — a `useHasRight(code)` hook + route guards + button/tab gating, keyed on
   the resolved rights of the user's group memberships (`/user-groups/{id}/rights`). None exists today.
4. **Wire enforcement per module**, starting with the highest-risk write operations (delete payment/claim,
   post to ledger, edit fee, delete patient).
