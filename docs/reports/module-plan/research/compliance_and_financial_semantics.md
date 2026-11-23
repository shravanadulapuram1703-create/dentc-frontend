# Compliance / security requirements and dental financial semantics for the Reports & Analytics module — research reference

Research date: 2026-11-22. Audience: engineers and product designers planning the Reports & Analytics module.
Scope: (Part 1) what HIPAA, HITECH, SOC 2 and vendor terms require of a reporting module that shows, exports, prints, e-mails,
benchmarks and feeds PHI and financial data to AI; (Part 2) the accounting semantics every dental report definition must get right.
Companion documents in this folder: `dental_kpi_dictionary.md` (`[KPI]`), `denticon_analytics_and_dso.md` (`[DEN]`),
`reporting_architecture_options.md` (`[ARCH]`), `competitor_analytics_teardown.md`; local data model: `../analysis/be_data_financial.md` (`[L-FIN]`).

This is a research reference, not legal or accounting advice. Items tagged *Recommended* are analyst recommendations; everything else
is sourced or explicitly flagged as reasoning or **[unverified]**.

---

## 0. Evidence legend and method

| Tag | Meaning |
|---|---|
| `[R-nnn]`, `[U-nnn]` | Regulation / statute text, read at Cornell LII (the government eCFR site blocks page fetchers). Quoted fragments are reproduced as extracted; long passages are shortened with "..." |
| `[FR-yyyy]` | Federal Register document, read from the govinfo PDF (text extracted locally and searched). Page numbers are approximate (±1). |
| `[NIST-66]`, `[ONC-*]`, `[CMS-CELL]`, `[HFMA-MAP]`, `[IRS-538]` | Government / standards-body publication, read in the cited section. |
| `[OD-*]`, `[DX-*]`, `[DN-*]`, `[ES-*]` | Vendor documentation: Open Dental manual, Dentrix help, Planet DDS (Denticon) Help Center, Eaglesoft handout. Each page was opened and queried for the points cited. |
| `[ANT-*]`, `[OAI-*]`, `[AZ-*]`, `[AWS-*]`, `[GCP-*]`, `[GCS-*]` | LLM / cloud vendor documentation, read on 2026-11-22. |
| `(L)` | Local fact from this repository's analysis documents (not re-verified here). |
| **[unverified]** | Could not be verified from a source in this session (recalled, inferred, or the page was not retrievable). Do not treat as fact. |
| *Recommended* | Analyst recommendation. |

Method notes that affect confidence:

- **No web searches were possible.** The search budget shared by this research run was already exhausted when this document was
  started, so every source was reached by fetching a known primary URL directly, or a URL already listed in the companion documents.
  Coverage is therefore deep on regulation text and vendor manuals and thin on dental-CPA commentary (section 30).
- `hhs.gov` returns HTTP 403 to page fetchers. HHS guidance pages (minimum necessary, de-identification, breach "unsecured PHI"
  guidance, cloud computing, e-mail FAQ) are listed in the Sources as *not retrievable*; where their content matters it is either
  backed by regulation / Federal Register text or marked **[unverified]**.
- `support.planetdds.com` returns HTTP 403 to page fetchers; article text was read through the Help Center's public article API
  (same content, same article ids). Screenshots inside articles are not readable.
- Web pages were read through a fetch tool that extracts the passages asked for; a page can contain relevant detail that was not
  asked about, and a statement that a page "does not say" something means it was not found in that extraction. PDFs (NIST, Federal
  Register, ADA, Eaglesoft) were text-extracted locally and searched.
- Vendor report names, adjustment codes and option labels are reproduced exactly because they are identifiers.
- Proposed field names use `snake_case` to match the backend convention.

---

## 1. Top findings for planners

1. **We are a business associate and the rules bind us directly.** The minimum-necessary standard is addressed to "a covered entity
   or business associate" `[R-502]`; a business associate "may use or disclose protected health information only as permitted or
   required by its business associate contract" `[R-502]`. Cloud and LLM vendors that receive PHI from us are *our* subcontractor
   business associates and need their own written assurances `[R-502]` `[R-308]`.
2. **Minimum necessary is a report-design requirement, not a policy footnote.** The rule requires identifying "persons or classes
   of persons" who need access and "the category or categories" of PHI they need `[R-514]` — that is a role × data-class matrix.
   Routine disclosures need "standard protocols"; non-routine ones need criteria and individual review `[R-514]`.
3. **HIPAA does not list audit-log fields, but four sources converge on the same content**: who, when, what action (query, print,
   copy, transmit), which patient data, and tamper-evidence — the Security Rule audit-controls standard `[R-312]`, NIST's
   implementation guide `[NIST-66]`, the ONC certification criterion built on ASTM E2147-18 `[ONC-D2]` `[R-170]`, and the 2025
   proposed rule, which names "creating, accessing, receiving, transmitting, modifying, copying, or deleting ePHI" `[FR-2025]`.
4. **The log must answer "which patients, sent to whom".** A business associate's breach notice must include "the identification
   of each individual" affected `[R-410]`, and an accounting of disclosures must list date, recipient, description and purpose for
   six years `[R-528]`. Filters and row counts alone are not enough; a per-artifact patient manifest (or a reproducible snapshot) is.
5. **Accounting of disclosures is narrow today and unlikely to widen soon.** Treatment / payment / operations disclosures are
   exempt `[R-528]`; the HITECH requirement to account for those made through an EHR `[U-17935]` was proposed in 2011 `[FR-2011]`
   and in 2018 HHS said it "intends to withdraw the NPRM" `[FR-2018]`. Capture recipient + purpose on every external delivery anyway.
6. **Regulatory calendar (as of 2026-11-22).** The Security Rule overhaul (mandatory encryption at rest and in transit, MFA, real-time
   audit monitoring, annual compliance audit) is still a proposal `[FR-2025]`; HHS moved its target "from May 2026 to July 2027"
   and reclassified it as a long-term action `[DWT-26]`. A Privacy Rule final rule was published on 2026-11-19: patient access
   requests in 15 calendar days; "The final rule did not change the minimum necessary rule" `[ADA-PRIV26]`.
7. **PHI by e-mail: links, not attachments.** The only express allowance for unencrypted e-mail concerns individuals who ask for
   their own PHI after being warned `[FR-2013]`; it is not a basis for mailing staff reports. A cloud signed URL is a bearer
   credential — "Anyone in possession of the signed URL can use it while it's active" `[GCS-SIGN]`.
8. **Cross-tenant benchmarking has a specific legal hook: "data aggregation".** A BAA may permit "data aggregation services relating
   to the health care operations of the covered entity" `[R-504]`; de-identification needs either Safe Harbor (18 identifier classes,
   including all date elements except year and geography below state) or Expert Determination `[R-514]`. Small cells: the CMS policy
   forbids reporting any cell of 1 to 10, directly or derivably `[CMS-CELL]`.
9. **LLMs: a BAA is necessary but each vendor restricts which features are covered.** Anthropic's HIPAA readiness blocks Batch,
   Files API and code execution with HTTP 400 and forbids PHI in JSON schemas `[ANT-RET]`; HHS expects AI tools to be in the risk
   analysis and asset inventory `[FR-2025]`. Sending only aggregates removes most of the problem.
10. **Every PMS classifies adjustments by a type attribute, never by name**: Denticon "Sub Type" `Production` / `Collection` plus sign
    — "Only the adjustment's Type and Sign affect the Ledger calculation" `[DN-ADJPICK]`; Dentrix production vs collection adjustment
    lists `[DX-PAR]`; Open Dental `+` / `-` / `dp`, immutable once created `[OD-ADJT]`.
11. **Financial totals are kept on the posting (entry) date, clinical ageing on the service date.** Dentrix: year-to-date and
    previous-month totals print only when the Day Sheet is run by entry date `[DX-DAY]`; Practice Analysis periods are "determined by
    entry date" while ageing uses "procedure date" `[DX-PA]` `[DX-PA-R]`. Denticon allocates payments "only on the date of transaction
    entry" `[DN-FIFO]`.
12. **All three legacy systems lock closed periods and force corrections through adjustments.** Dentrix: "you can only correct posting
    errors by using an adjustment" `[DX-HIST]`; Denticon "cannot reverse a Close Out" `[DN-CO3]`; Open Dental: a global lock date is the
    only way to stop new items being back-dated `[OD-LOCK]`.
13. **Provider collections depend on the allocation method, and the methods differ.** Denticon applies patient payments "first
    in-first out" `[DN-FIFO]`; Dentrix offers Percentage, Guarantor Estimate (default), FIFO and Equal `[DX-SPLIT]`; Open Dental
    allocates to "the oldest outstanding balance" or by explicit paysplit `[OD-ALLOC]` `[OD-SPLIT]`.
14. **Ageing conventions are not uniform.** Denticon buckets are 0-29 / 30-59 / 60-89 / 90-119 / over 120 and "Aging begins when the
    procedure is entered as 'completed'" `[DN-AGE]`; Dentrix and Open Dental use 0-30 / 31-60 / 61-90 / over 90 `[DX-PA-R]` `[OD-RAGE]`.
15. **Local gap (L).** The backend has no ledger table, no separate posting date, no deposit, no day close or period lock, and
    payment-to-procedure allocation is unusable for migrated history `[L-FIN]`. Sections 17 to 21 describe semantics that cannot be
    delivered until those exist.

---

# PART 1 — Compliance and security

## 2. Regulatory frame

### 2.1 Who is who

| Party | HIPAA role | Consequence for the report module | Source |
|---|---|---|---|
| Dental practice / DSO (tenant) | Covered entity (health care provider) | Owns the minimum-necessary policy, the accounting of disclosures and the patient-access duty; we must give it the controls and the data to meet them | `[R-528]` `[R-514]` |
| Us (SaaS vendor) | Business associate — a person that "creates, receives, maintains, or transmits protected health information" for functions including "data analysis" and "practice management" | May use / disclose PHI "only as permitted or required by its business associate contract"; must comply with the Security Rule; must "Report to the covered entity any use or disclosure of the information not provided for by its contract" and "Make available the information required to provide an accounting of disclosures" | `[R-103]` `[R-502]` `[R-504]` `[R-312]` |
| Cloud host, e-mail / SMS gateway, LLM vendor, PDF or BI service that receives PHI | Subcontractor business associate — "A subcontractor that creates, receives, maintains, or transmits protected health information on behalf of the business associate" | We may disclose PHI to them only after "satisfactory assurances ... that the subcontractor will appropriately safeguard the information", documented in a written contract | `[R-103]` `[R-502]` `[R-308]` |
| Tenant's accountant, consultant, lender, management company | Business associate of the practice when the service involves PHI ("legal, actuarial, accounting, consulting, data aggregation ... management, administrative, accreditation, or financial services"); otherwise outside HIPAA | Prefer PHI-free financial reports; if PHI is needed the practice needs a BAA with them and the delivery is logged | `[R-103]` `[R-504]` |

Other duties that touch reporting:

- A business associate that discovers a breach must notify the covered entity "without unreasonable delay and in no case later than
  60 calendar days after discovery", including "the identification of each individual" affected `[R-410]`.
- An impermissible use or disclosure is presumed to be a breach unless a four-factor risk assessment shows a low probability of
  compromise: the nature and extent of the PHI "including the types of identifiers", who received it, whether it "was actually
  acquired or viewed", and mitigation `[R-402]`. A report e-mailed to the wrong recipient is exactly this case.
- At contract end the business associate must, "if feasible, return or destroy all protected health information" and "retain no
  copies" `[R-504]` — generated report files, caches and analytics marts are in scope.

### 2.2 "Required" vs "addressable" (today)

Each Security Rule implementation specification is "Required" or "Addressable"; an addressable one must be assessed and then either
implemented, or the reasoning documented and an equivalent measure adopted `[R-306]`. Addressable is not optional.

| Specification relevant to reporting | Status today | Source |
|---|---|---|
| Unique user identification | Required | `[R-312]` |
| Audit controls (standard, no sub-specifications) | Required (standard) | `[R-312]` |
| Information system activity review | Required | `[R-308]` |
| Person or entity authentication | Required (standard) | `[R-312]` |
| Disposal of ePHI; media re-use | Required | `[R-310]` |
| Automatic logoff | Addressable | `[R-312]` |
| Encryption and decryption (at rest) | Addressable | `[R-312]` |
| Transmission encryption; integrity controls | Addressable | `[R-312]` |
| Access authorization; access establishment and modification | Addressable | `[R-308]` |
| Log-in monitoring | Addressable | `[R-308]` |

### 2.3 Rule changes in motion

| Item | Status on 2026-11-22 | What it would change for us | Source |
|---|---|---|---|
| Security Rule NPRM (90 FR 898, 2025-01-06; RIN 0945-AA22; comments closed 2025-03-07) | Not final. HHS "pushed back the date of the final amendments ... from May 2026 to July 2027", now listed under long-term actions; the authors "suspect ... HHS will finalize only some of the proposals" | Removes the required / addressable distinction; "encrypt all ePHI at rest and in transit, with limited exceptions"; MFA; audit standard renamed "audit trail and system log controls" with real-time monitoring, recording and retention; compliance audit "at least once every 12 months"; written verification of business associates' technical safeguards every 12 months; restore critical systems "within 72 hours" | `[FR-2025]` (≈ pp. 933, 947, 955-956, 968, 972-973) `[DWT-26]` |
| Privacy Rule final rule "Changes to Support Coordinated Care and Individual Engagement" (RIN 0945-AA00) | Published 2026-11-19; effective 2027-01-19; compliance 2027-07-19 (dates as computed by the ADA from the pre-publication schedule — verify against the Federal Register notice) | Access requests answered "within 15 calendar days (previously 30)" with one extension of up to 30 days; fee schedule; no signed NPP acknowledgment; "The final rule did not change the minimum necessary rule"; "Records held by vendors on behalf of the practice may also be part of its DRS"; "AI-generated analyses may be part of the DRS if they were used to make decisions about the patient's care or payment" | `[ADA-PRIV26]` (linked from `[ADA-HIPAA]`) |
| Accounting of disclosures through an EHR (HITECH § 13405(c)) | Statute in force, never implemented by rule. 2011 NPRM proposed an "access report"; 2018 RFI: "OCR intends to withdraw the NPRM" | None today. Design the log so a per-patient access report is a query, not a project | `[U-17935]` `[FR-2011]` `[FR-2018]` (≈ p. 64307) |
| HHS on AI (request for information inside the 2025 NPRM) | Statement of position, not a new rule | "ePHI in AI training data, prediction models, and algorithm data that is maintained by a regulated entity for covered functions is protected by the HIPAA Rules"; the risk analysis "must include consideration of ... the type and amount of ePHI accessed by the AI tool, to whom the data is disclosed, and to whom the output is provided" | `[FR-2025]` (≈ pp. 990-991) |
| State law | Not researched | HIPAA is a floor; states "may impose more stringent privacy protections, shorter records-release deadlines, or other requirements" | `[ADA-PRIV26]`; specifics **[unverified]** |

---

## 3. Minimum necessary applied to reports and exports

### 3.1 The rule

| Element | Text / effect | Source |
|---|---|---|
| Standard | "a covered entity or business associate must make reasonable efforts to limit protected health information to the minimum necessary to accomplish the intended purpose of the use, disclosure, or request" | `[R-502]` |
| Does not apply to | (i) disclosures to or requests by a provider for treatment; (ii) disclosures to the individual; (iii) uses / disclosures under an authorization; (iv) disclosures to the Secretary; (v) required by law; (vi) required for compliance with the HIPAA rules | `[R-502]` |
| Uses (internal) | Identify the persons or classes of persons in the workforce who need access, the categories of PHI they need and any conditions; make reasonable efforts to limit access accordingly | `[R-514]` (d)(2) |
| Routine, recurring disclosures | Policies or "standard protocols" that limit the PHI to what is reasonably necessary | `[R-514]` (d)(3)(i) |
| Other disclosures | Criteria, and individual review of each request | `[R-514]` (d)(3)(ii) |
| Whole record | An entire medical record may not be used, disclosed or requested unless specifically justified | `[R-514]` (d)(5) |
| HITECH preference | A covered entity is treated as compliant "only if" it limits PHI "to the extent practicable" to the limited data set or, if needed, to the minimum necessary; the disclosing party makes the determination | `[U-17935]` (b) |
| Status | Unchanged by the November 2026 final rule | `[ADA-PRIV26]` |

Almost every report in a dental PMS is a *use* for payment or health care operations (production, collections, ageing, recall lists,
audits, provider review — see the definition of health care operations: quality assessment, reviewing "the competence or
qualifications of health care professionals", "Business management and general administrative activities" `[R-501]`). The treatment
exemption covers disclosures between providers, not internal reporting. Minimum necessary therefore applies to nearly the whole catalog.

### 3.2 Translation into module controls (*Recommended*)

| Rule element | Control in the report module |
|---|---|
| Classes of persons × categories of PHI | Every report definition, column, dimension and measure carries a data class (3.3). Roles are granted classes, not individual columns. The grant matrix is exportable as the practice's minimum-necessary documentation |
| Conditions of access | Office scope, provider scope (self / assigned / all), aggregate-only mode, time-boxed elevation |
| Standard protocol for routine disclosures | A scheduled report = a frozen definition version + fixed column profile + named recipients + purpose. Changing any of the four needs the schedule-management right and is audited |
| Individual review of non-routine requests | Ad hoc exports above a row / patient threshold, exports containing sensitive classes, and any external delivery prompt for a purpose and can require approval by a second user |
| No whole-record default | No "export all patients / all columns" preset. Bulk patient exports are a separate right with a mandatory reason |
| Limited data set preference | Detail exports default to the least identifying column profile that still does the job: chart number instead of name where a list is for reconciliation, year of birth or age band instead of DOB, no SSN, no free-text notes |
| Reasonable efforts | Summary first, drill-through second: the landing view of a report is aggregated; patient-level rows are a deliberate, logged step |
| Requests to other entities | Out of scope for reporting |

### 3.3 Data classes for report content (*Recommended*)

| Class | Examples in dental reports | Default visibility |
|---|---|---|
| `aggregate` | Totals by office / provider / month; KPI tiles | All report users, subject to small-cell rules when the scope is narrow (section 8.3) |
| `phi_identified` | Patient name, chart number, phone, address, appointment rows, ledger rows | Roles with a patient-facing duty; office-scoped |
| `phi_sensitive` | SSN, full DOB, subscriber id, medical alerts, clinical notes, prescriptions, images, guarantor employer | Named roles only; masked by default; never in scheduled e-mail |
| `financial_practice` | Practice-wide production, collections, A/R, fee schedules, write-off rates | Owners, managers, billing leads |
| `provider_comp` | Production / collections by provider, compensation basis, per-procedure pay | Owner / payroll; a provider sees only their own |
| `payroll_time` | Time-clock punches, hours | Managers, payroll |
| `user_activity` | Transactions by user, audit trail, deleted / voided / back-dated items | Owner / compliance; not visible to the users being reviewed (Dentrix guidance: the Audit Trail report is for the doctor only `[DX-5]`) |
| `payment_instrument` | Card last four, check number, bank reference | Billing roles; never the full card number (PCI DSS masking rule **[unverified]**) |

### 3.4 How the reference products apply the same idea

| Product | Mechanism | Source |
|---|---|---|
| Open Dental | Per-report allow list by user group ("Set All" / "Set None"); a user in several groups gets access if any group allows it; separate permissions "Production and Income, View All Providers" and "Daily Reports, View All Providers" — without them a provider sees only their own figures and the "All" provider filter is disabled; custom SQL split into `User Query` (run released queries), `User Query Admin` (write queries) and `CommandQuery` (non-SELECT) | `[OD-RSEC]` `[OD-PERM]` `[OD-DADJ]` |
| Dentrix | Password rights gate each report; reports queue in the Batch Processor where anyone with batch rights can open them — "To avoid this, delete the report from the Batch Processor after you finish with it" | `[DX-AUD]` `[DX-BATCH]` |
| Denticon | Rights per report family with `Full Control` / `View Only`, enterprise ("Group") reports as a separate right, per-user office access, IP access control, a "Report Access Provider" restriction | `[DEN]` §10; `[DN-SEC]` |

Lesson from Dentrix: a generated report is itself a PHI store. Whoever can open the store sees the content regardless of the right
that was needed to produce it. Re-authorise every read of a stored result against the *viewer* (`[ARCH]` §11.2 makes the same point).

---

## 4. Access control: role, office, provider and financial restriction

### 4.1 Regulatory basis

| Requirement | Text | Source |
|---|---|---|
| Access control | Technical policies and procedures "to allow access only to those persons or software programs that have been granted access rights" | `[R-312]` (a)(1) |
| Unique user identification (R) | A unique name or number per user to identify and track identity — shared logins make every audit record worthless | `[R-312]` (a)(2)(i) |
| Automatic logoff (A) | "terminate an electronic session after a predetermined time of inactivity" | `[R-312]` (a)(2)(iii) |
| Information access management | "policies and procedures for authorizing access to electronic protected health information"; "establish, document, review, and modify a user's right of access" | `[R-308]` (a)(4) |
| Workforce security / termination | "terminating access ... when the employment of, or other arrangement with, a workforce member ends" | `[R-308]` (a)(3) |
| Role-based minimum necessary | Persons or classes of persons × categories of PHI | `[R-514]` (d)(2) |
| Proposed | MFA (verification of "at least two of three categories of factors"); access removed within one hour of termination; notice to other regulated entities within 24 hours | `[FR-2025]` (≈ pp. 926, 950) |

### 4.2 Permission axes (*Recommended*)

| Axis | Values | Enforcement point |
|---|---|---|
| Report right | Per report definition and per category; the legacy catalogue's `Full Control` / `View Only` pair maps to run vs see-in-catalog | Catalog, run creation |
| Action right | `view`, `run`, `drill_to_patient`, `export_pdf`, `export_csv`, `export_xlsx`, `print`, `schedule`, `deliver_internal`, `deliver_external`, `share`, `build_custom`, `view_others_runs`, `manage_definitions` | API guards; exports are distinct rights because the data leaves the audited system |
| Office scope | The user's assigned offices; "all offices" as a privilege; enterprise roll-ups as a separate right | Executor; resolved set stored on the run |
| Provider scope | `self`, `assigned_providers`, `all` | Executor (predicate on the attribution provider of each measure) |
| Data classes | Section 3.3 | Catalog (hide), executor (drop or mask), every export format identically |
| Output mode | `aggregate_only` vs `detail` | Definition `output_modes` + right |
| Step-up | Re-authentication for bulk export, external delivery, audit-report access | API guard |

Rules that prevent the common leaks:

1. A provider-scoped user must not be able to reconstruct other providers' numbers by subtraction: when provider scope is `self`,
   practice totals are hidden or shown only at a grain where the remainder is not one other provider.
2. The same restriction must hold in exports, scheduled deliveries, cached results, AI answers and drill-downs (one authorization
   function, used everywhere).
3. A user in several groups receiving the most permissive right is the Denticon and Open Dental behaviour `[DEN]` `[OD-RSEC]`; make it
   explicit in the UI ("effective access") because it surprises administrators.
4. Separation of duties: the people who post payments and adjustments should not be the only people who can read the audit and
   exception reports about postings. The fraud guidance for dental offices is that "Whoever balances the daily deposit should not be
   the person to take the deposit to the bank" and that the audit trail is for the doctor `[DX-FRAUD]` `[DX-5]`.
5. Central billing teams need many offices' A/R without clinical classes; regional managers need assigned offices with
   `financial_practice` but not `provider_comp`. Model these as role templates rather than one "manager" role.

(L) Today no backend guard references any `reports_*` right, `users.report_access_provider_id` is unenforced, and the legacy rights
catalogue is cosmetic — see `[ARCH]` §11.2. Office membership enforcement already exists and should be the row-scope engine.

---

## 5. Audit logging of report activity

### 5.1 What the sources require

| Source | Requirement | Reference |
|---|---|---|
| Security Rule (binding) | "Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use electronic protected health information" | `[R-312]` (b) |
| Security Rule (binding) | "Implement procedures to regularly review records of information system activity, such as audit logs, access reports, and security incident tracking reports" | `[R-308]` (a)(1)(ii)(D) |
| NIST SP 800-66r2, Table 22 (guidance) | Decide "What activities will be audited (e.g., creating ePHI, accessing ePHI, modifying ePHI, transmitting ePHI, and/or deleting files or records that contain ePHI)"; "What should the audit record include (e.g., user responsible for the activity; event type, date, or time)?"; "Where will audit information reside (e.g., separate server)?"; "How often will audits take place?" | `[NIST-66]` §5.3.2 |
| ONC certification criterion § 170.315(d)(2) (binding only on certified health IT; the best available field list) | Record actions per ASTM E2147-18 sections 7.1.1, 7.1.2 and 7.1.6-7.1.9 "and changes to user privileges"; action types "(e.g., additions, deletions, changes, queries, print, and copy)"; clock synchronised by NTP; logging on by default; disabling "restricted to a limited set of users"; entries "must not be capable of being changed, overwritten, or deleted by the technology"; "Technology must be able to detect whether the audit log has been altered" (hashing at least as strong as SHA-2 suggested); purge after the legal retention period is allowed | `[ONC-D2]` `[R-170]` |
| ONC § 170.315(d)(3) | "Enable a user to create an audit report for a specific time period" and "sort entries in the audit log according to each of the data" elements | `[ONC-D3]` |
| 2025 NPRM (proposed) | Record "creating, accessing, receiving, transmitting, modifying, copying, or deleting ePHI"; monitor "in real-time" and alert; written policy for "retaining and reviewing records of activity"; retention "reasonable and appropriate for the specific type of report or log" | `[FR-2025]` (≈ pp. 947, 972-973) |
| Denticon (legacy behaviour) | Audit Trail tracks Edit, Delete, Close out, Reschedule Appointment, Cut/Copy-Paste Appointment for Patient, Setup, Transactions and Treatment Plan; Denticon "does not provide a report to show all entries and keystrokes"; report *runs* are not documented as audited | `[DN-AUD]` |
| Open Dental | Audit Trail columns Date/Time, Patient, User, Permission, Computer, Log Text, Log Source, Last Edit; module views are logged; entries "are never changed within Open Dental"; rows that fail the integrity check show in red | `[OD-AUDIT]` `[OD-PERM]` |

Printing, exporting and e-mailing are "print", "copy" and "transmit" events. ASTM E2147-18 itself could not be opened (HTTP 403);
its section content is known here only through the ONC text **[unverified beyond the ONC wording]**.

### 5.2 Event catalogue (*Recommended*)

| Event | Emitted when | Why it is separate |
|---|---|---|
| `report.run` | A definition is executed (UI, schedule, API, AI tool) | The query |
| `report.view` | A stored result or dashboard tile with PHI is opened, including by someone other than the runner | Dentrix Batch Processor lesson |
| `report.drill` | A user moves from an aggregate to patient rows or to a patient record | Minimum-necessary evidence |
| `report.export` | A file is generated, one event per format | "copy" |
| `report.download` | An artifact is fetched, one event per fetch | A link can be used many times |
| `report.print` | The print dialog / print-optimised PDF is requested (the browser cannot confirm that paper came out; log the request) | "print" |
| `report.deliver` | One event per recipient per channel, with success / bounce | "transmit"; feeds the disclosure log |
| `report.schedule.*`, `report.share.*` | Create, change, pause, delete; recipients added or removed | Standing disclosures |
| `report.denied` | Authorization failure or blocked export | Activity review |
| `report.definition.*`, `metric.*` | Definition or metric version published | Integrity of numbers |
| `access.grant.*` | Report rights, data classes, office or provider scope changed | "changes to user privileges" `[R-170]` |
| `ai.question`, `ai.tool_call` | Natural-language question, each tool call, the scope applied | The prompt can itself contain PHI |
| `artifact.purge`, `audit.config.*` | File deleted by lifecycle or by a user; audit settings changed | Disposal evidence; audit-log status |

### 5.3 Fields per event (*Recommended*)

| Group | Fields | Regulatory use |
|---|---|---|
| Who | `user_id`, role and groups at the time, `run_as_user_id` for schedules, impersonation / support-access marker | Unique user identification `[R-312]` |
| When | UTC timestamp from an NTP-synchronised clock, duration | `[R-170]` (g) |
| Where | `tenant_id`, working office, IP address, session / device id, source (`ui`, `schedule`, `api`, `ai`) | Activity review |
| What was asked | `report_key`, `definition_version`, full parameter set (date range and **date basis**, offices, providers, payers, codes, status filters), resolved office set, resolved provider scope, column profile and the data classes it contained | "which filters" — needed to judge minimum necessary after the fact |
| How much | `row_count`, `distinct_patient_count`, whether any `phi_sensitive` column was present | "the nature and extent of the protected health information involved, including the types of identifiers" `[R-402]` |
| Which patients | Patient-id manifest for the artifact (compressed list, or a digest plus a reproducible snapshot reference) | "identification of each individual" `[R-410]`; accounting of disclosures `[R-528]` |
| Output | Format, artifact id, size, checksum, watermark id, expiry | Disposal and integrity |
| Recipient | Internal user or external party (name, organisation, address / e-mail), channel | Accounting content `[R-528]` |
| Why | Purpose code and free-text reason when prompted; approver | Non-routine review `[R-514]`; accounting purpose statement |
| Outcome | Success, denied, failed, cancelled; request id | Activity review |

Design points:

- A row count without the patient manifest cannot support breach notification. Storing ids is cheap; for very large exports store a
  digest and keep the immutable result snapshot for the artifact's lifetime.
- The audit store is itself PHI (it holds patient ids and parameters). It needs the same access control, encryption and retention
  rules, and reading it is an audited action.
- Tamper evidence: append-only table, hash chain per tenant, no update / delete grant for the application role, alteration check on
  read (the Open Dental pattern of flagging rows that fail verification is a good UI model `[OD-AUDIT]`).
- Review: the rule requires *regular review*, not just capture `[R-308]`. Ship a "Report access log" report (filter by user, report,
  patient, export, external delivery) and a small set of alerts: bulk export, first-time export of a sensitive class, after-hours
  export, export by a user whose access ends within N days, repeated denials.
- (L) Today's `record_print` rows carry no office, row count or format, `GET /audit-logs` cannot filter by action or date, and
  JSON roll-ups write no audit row (`[ARCH]` §11.1). `patient-procedures` writes are not audited at all `[L-FIN]`.

### 5.4 Retention of the log

| Fact | Source |
|---|---|
| HIPAA sets no explicit retention period for audit logs | absence in `[R-312]` `[R-308]` |
| Documentation of a required "action, activity or assessment" must be retained "for 6 years from the date of its creation or the date when it last was in effect, whichever is later" | `[R-316]` (b) |
| Privacy Rule documentation: "six years from the date of its creation or the date when it last was in effect, whichever is later" | `[R-530]` (j) |
| The accounting of disclosures covers "the six years" before the request, so disclosure records must exist that long | `[R-528]` |
| Proposed: retention "reasonable and appropriate for the specific type of report or log" | `[FR-2025]` |
| ADA: certain HIPAA compliance records "must be retained for at least six (6) years"; patient-record retention "will vary" by state | `[ADA-RET]` |

*Recommended*: six years online-queryable for report audit events and disclosure records, longer where the tenant's state or contract
requires. Whether raw audit logs are "documentation" under § 164.316 is an interpretation for counsel.

---

## 6. Accounting of disclosures and patient access

### 6.1 The right (current rule)

| Element | Rule | Source |
|---|---|---|
| Look-back | Six years before the request (the individual may ask for less) | `[R-528]` (a) |
| Excluded | Disclosures (i) for treatment, payment and health care operations; (ii) to the individual; (iii) incidental; (iv) under an authorization; (v) facility directory / persons involved in care; (vi) national security; (vii) correctional / law-enforcement custody; (viii) as part of a limited data set; (ix) before the compliance date | `[R-528]` (a)(1) |
| Included | Everything else, "including disclosures to or by business associates": public health, health oversight (for example a dental-board inquiry), judicial and administrative proceedings, law enforcement, abuse reporting, research without authorization, workers' compensation, other disclosures required by law; and impermissible disclosures — HHS: covered entities "will continue to be required to account for disclosures that are impermissible under the Privacy Rule" | `[R-528]` (b)(1); `[FR-2011]` (≈ p. 31431) |
| Content per disclosure | Date; name of the recipient and address if known; brief description of the PHI; brief statement of purpose (or a copy of the written request) | `[R-528]` (b)(2) |
| Repeated disclosures | Same recipient and purpose: first disclosure, frequency or number, date of the last | `[R-528]` (b)(3) |
| Research, 50+ individuals | Summary form permitted | `[R-528]` (b)(4) |
| Deadline and fee | 60 days, one 30-day extension with written notice; first accounting in any 12 months free | `[R-528]` (c) |
| Suspension | A health-oversight or law-enforcement agency may require temporary suspension | `[R-528]` (a)(2) |
| Documentation | Keep the information, the accounting provided and the responsible titles for six years | `[R-528]` (d) `[R-530]` |
| Business associate duty | "Make available the information required to provide an accounting of disclosures" | `[R-504]` (e)(2)(ii)(G) |
| Statutory extension | TPO disclosures "through an electronic health record", three-year look-back — not implemented (section 2.3) | `[U-17935]` (c) |

### 6.2 What the report module must feed (*Recommended*)

1. A `disclosure_log` keyed by patient: `disclosed_at`, recipient name / organisation / address, description of PHI (report name +
   data classes), purpose category (`tpo_payment`, `tpo_operations`, `public_health`, `health_oversight`, `legal_process`,
   `law_enforcement`, `research`, `required_by_law`, `individual`, `authorization`, `impermissible`), accountable flag derived from
   the category, `report_run_id`, artifact id.
2. Rows are written automatically by every external delivery (`deliver_external`, shared link to a non-workforce user, export with a
   declared external recipient). Internal viewing by workforce is a *use*, not a disclosure, and stays in the audit log only.
3. An "Accounting of Disclosures" patient-level report that returns the accountable rows for a date range in the regulation's
   content format, collapses repeats per (b)(3), supports the suspension flag, and records that the accounting was provided.
4. An internal "who accessed this patient" query over the audit log. It is not a patient right today, but it is the first thing a
   practice needs in a snooping complaint and the thing HHS once proposed `[FR-2011]`.
5. Because the purpose is captured at delivery time, TPO deliveries are stored too and simply filtered out — so a later rule change
   is a filter change.

### 6.3 Patient access is the other clock

Billing records are part of the designated record set (medical and billing records "maintained by or for a covered health care
provider" `[R-501]`); from the 2027 compliance date access requests must be answered in 15 calendar days and electronic copies provided
in the requested format when readily producible `[ADA-PRIV26]`. The report module should therefore offer a per-patient "financial
record" export (ledger, claims, statements, payment-plan schedule) as a standard, fast, audited artifact. Disclosures to the individual
are exempt from both minimum necessary `[R-502]` and the accounting `[R-528]`.

---

## 7. Export, print, e-mail and scheduled-delivery controls

| Control | Regulatory / factual basis | *Recommended* implementation |
|---|---|---|
| Transport encryption | Transmission security standard; encryption addressable today, mandatory if the NPRM is finalised | TLS for every hop; no PHI in URLs or query strings |
| PHI in e-mail | The Omnibus preamble: covered entities "are permitted to send individuals unencrypted emails if they have advised the individual of the risk, and the individual still prefers the unencrypted email" — scoped to the individual's own PHI `[FR-2013]` (≈ p. 5634). The NPRM would require documenting that request and warning each time `[FR-2025]` (≈ p. 970). HHS e-mail FAQ: not retrievable | Scheduled and shared reports send a notification with no PHI in subject or body: report title, period, generated time, link into the app. Opening requires login and re-checks rights and scope. Attachments only for definitions whose every column is `aggregate` and that pass the small-cell check |
| Download links | A signed URL gives access to "Anyone in possession of the signed URL"; maximum life 604800 seconds (7 days) `[GCS-SIGN]` | Never e-mail a storage URL. The app endpoint authorises the viewer, then mints a single-use signed URL valid for minutes. Link lifetime in the notification = artifact retention; expired links offer "run again" |
| Encryption at rest of generated files | Addressable today `[R-312]`; proposed mandatory `[FR-2025]`. PHI encrypted consistent with NIST SP 800-111 is "secured", so its loss is not a reportable breach `[FR-2025]` (≈ p. 967) `[FR-2013]` (≈ p. 5644). Cloud Storage "always encrypts your data on the server side, before it is written to disk" using AES-256 `[GCS-ENC]` | Private bucket per environment, default encryption plus customer-managed keys if a tenant contract asks; no public ACLs; artifacts addressed by opaque ids |
| Retention and auto-purge | Disposal of ePHI is a required specification `[R-310]`; minimum necessary argues against keeping copies. Lifecycle `Delete` with an `Age` condition is supported; deleted objects are soft-deleted for seven days by default; rule changes "can take up to 24 hours to go into effect" `[GCS-LIFE]` | TTL by artifact kind (table below); soft-delete window set deliberately on the report bucket; `artifact.purge` audit event; legal-hold flag that suspends purge |
| Watermark / header-footer | No HIPAA requirement found. Deterrence and attribution only | Every PDF page and the first rows of CSV / XLSX carry tenant, report title, parameters, generated-at, generated-by, a watermark id that resolves to the audit event, and a "Contains protected health information" line when a PHI class is present |
| Printing | "print" is an auditable action in the ONC list `[ONC-D2]` | Printing goes through the same export pipeline (print-optimised PDF) so that it is authorised, watermarked and logged; `window.print` of live grids is avoided for PHI reports |
| Bulk export limits | Minimum necessary; whole-record rule `[R-514]` | Row and patient thresholds per role; purpose prompt above the threshold; daily volume alert |
| Column parity | Minimum necessary | Exports apply the same class masking as the screen; hidden columns are never serialised |
| Spreadsheet safety | — | Neutralise formula prefixes in CSV / XLSX cells (`[ARCH]` §7) |
| External recipients | Subcontractor / BAA rules `[R-502]` `[R-504]`; accounting content `[R-528]` | Named external-viewer accounts or allow-listed domains, never anonymous links; recipient organisation and purpose are mandatory and feed `disclosure_log` |
| Session controls | Automatic logoff (addressable) `[R-312]` | Idle timeout applies to report viewers and to embedded dashboards on wall displays (use aggregate-only kiosk roles) |
| Payment data | — | Deposit and payment reports show card brand and last four and mask bank account numbers **[PCI DSS reference unverified]** |
| Local copies | Outside our control once downloaded | Say so in the export dialog; prefer in-app viewing; make the watermark traceable |

*Recommended* default artifact lifetimes:

| Artifact | Default TTL | Reason |
|---|---|---|
| Ad hoc export file | 7 days | Convenience copy; the run can be repeated |
| Scheduled-run result | 30 to 90 days, tenant-configurable | Recipients open late |
| Cached result set | Hours | Performance only |
| Period-close snapshot (day sheet, deposit, A/R ageing, production / collections summary) | Same as financial records policy, at least six to seven years | It is the business record of the close (section 17.4), not a convenience export |
| Audit and disclosure records | Six years or more | Section 5.4 |

---

## 8. De-identification, limited data sets and small cells (benchmarking, AI, product analytics)

### 8.1 Three tiers of data

| Tier | Definition | Allowed for | Conditions | Source |
|---|---|---|---|---|
| PHI | Identifiable health information | Uses / disclosures permitted by the Privacy Rule and the BAA | Minimum necessary | `[R-502]` |
| Limited data set | PHI with direct identifiers removed (names, street address, phone, e-mail, SSN, record and account numbers, device / vehicle ids, URLs, IPs, biometrics, full-face photos); dates and city / state / ZIP may stay | "research, public health, or health care operations" only | Data use agreement; recipient may not re-identify or contact individuals | `[R-514]` (e) |
| De-identified | Not PHI; "The requirements of this subpart do not apply" | Anything | Expert Determination (risk "very small", documented) or Safe Harbor | `[R-502]` (d) `[R-514]` (a)-(b) |

### 8.2 Safe Harbor details that trip up analytics

| Identifier class | Rule | Consequence |
|---|---|---|
| Geography | Remove "All geographic subdivisions smaller than a State", except the first three ZIP digits where the combined area "contains more than 20,000 people"; otherwise "changed to 000" | Office city / county / full ZIP attached to patient-level rows is not Safe Harbor. Use state or 3-digit ZIP, or aggregate first |
| Dates | Remove "All elements of dates (except year) for dates directly related to an individual" | Patient-level rows with date of service, birth date or payment date are not Safe Harbor. Use year, or relative day offsets under Expert Determination |
| Age | Ages over 89 "aggregated into a single category of age 90 or older" | Age bands must top-code |
| Record identifiers | Medical record numbers, account numbers and "any other unique identifying number, characteristic, or code" | Our `patient_id`, chart number and account number must go |
| Re-identification code | Allowed only if it "is not derived from or related to information about the individual" and the mechanism is not disclosed | A hash of name / DOB / SSN / chart number does not qualify. Use a random surrogate held in a separate, access-controlled map |
| Actual knowledge | The entity must have no actual knowledge that the remainder could identify an individual | Free-text columns and rare-procedure combinations must be excluded |

Source: `[R-514]` (b)(2), (c). HHS's de-identification guidance page was not retrievable.

### 8.3 Aggregates and small cells

- Aggregated counts and sums are not patient-level records, but a cell describing one or two patients can identify them when
  combined with what the reader already knows.
- Reference standard: the CMS cell-size policy — "no cell ... containing a value of 1 to 10 can be reported directly"; nor may a
  value of 1 to 10 be derivable "from other reported cells or information"; percentages and formulas that expose such a value "are
  prohibited"; suppressing one cell is not enough when totals are shown ("counter-suppression"); zero is allowed `[CMS-CELL]`. It
  binds users of CMS data, not dental software; it is the most defensible published threshold.
- *Recommended*: for cross-tenant benchmarks and for AI inputs, suppress any cell whose distinct-patient count is 1 to 10, apply
  complementary suppression against row / column totals, and require a minimum number of contributing offices and organisations per
  peer group so that no tenant can back out a competitor's numbers (thresholds are a product decision; nothing regulatory was found).
- Inside one tenant, small cells are not a de-identification problem (the viewer is workforce) but they are a minimum-necessary and
  provider-privacy problem for users with `aggregate_only` or `self` provider scope.

### 8.4 What gives us the right to benchmark across tenants

| Question | Answer | Source |
|---|---|---|
| May we combine tenants' PHI to produce comparative analytics for them? | Yes if the BAA permits "data aggregation services relating to the health care operations of the covered entity". Definition: "the combining of such protected health information by the business associate with the protected health information received by the business associate in its capacity as a business associate of another covered entity, to permit data analyses that relate to the health care operations of the respective covered entities" | `[R-504]` (e)(2)(i)(B) `[R-501]` |
| May we de-identify tenants' PHI? | Creating de-identified information is a use the covered entity may make itself or by disclosing PHI "only to a business associate for such purpose"; it is listed under health care operations ("creating de-identified health information or a limited data set"). A business associate acts only within its contract, so the BAA must authorise it | `[R-502]` (d)(1) `[R-501]` `[R-502]` (a)(3) |
| May we use the de-identified result for our own product, research or commercial benchmarks? | De-identified data is outside the rule; whether we may *create* it for our own purposes is a contract question. HHS guidance on this point was not retrievable | **[unverified]** — settle in the BAA and terms of service |
| May we sell data? | Remuneration "in exchange for" PHI needs the individual's authorization, with listed exceptions; this does not reach de-identified data | `[U-17935]` (d) |
| Does showing a tenant its rank against peers disclose other tenants' PHI? | Not if peers appear only as suppressed aggregates. "Customer service, including the provision of data analyses for ... customers" is an operation "provided that protected health information is not disclosed to such ... customer" | `[R-501]` |

Provider and office identities are not patient PHI, but they are personal and commercially sensitive; anonymise both in any
cross-tenant output.

Benchmark pipeline checklist (*Recommended*): BAA and terms contain data-aggregation and de-identification clauses; tenant-level
opt-out; ingestion strips direct identifiers before data leaves the tenant boundary; only pre-aggregated office-month facts enter the
benchmark store; small-cell and minimum-contributor rules enforced at publish time; no free text; documented method and periodic
re-identification review; the benchmark store is treated as confidential even though it is not PHI.

---

## 9. LLM vendors and AI features

### 9.1 What HHS has said

"ePHI, including ePHI in AI training data, prediction models, and algorithm data that is maintained by a regulated entity for covered
functions is protected by the HIPAA Rules"; "generative AI tools have produced in their output the names and personal information of
persons included in the tools' sources of training data"; the risk analysis "must include consideration of, among other things, the
type and amount of ePHI accessed by the AI tool, to whom the data is disclosed, and to whom the output is provided"; AI software that
"interacts with ePHI" belongs in the technology asset inventory `[FR-2025]` (≈ pp. 990-991). This is a statement inside a proposed
rule's request for information, not a regulation, but it describes how OCR reads the current rules.

### 9.2 Vendor terms (read 2026-11-22)

| Vendor / route | BAA path | Retention and "zero retention" | Features relevant to reporting | Caveats |
|---|---|---|---|---|
| Anthropic Claude API (first party) `[ANT-RET]` `[ANT-BAA]` | "HIPAA readiness": signed BAA + HIPAA-enabled organisation; self-serve in the Console for eligible organisations, otherwise through sales. "the configuration is permanent and cannot be disabled"; use a separate organisation for non-HIPAA workloads. The BAA "only covers the single organization that accepted it" | Conversation content "is not retained by default"; ZDR is a separate arrangement and "you do not also need ZDR" under HIPAA readiness. Flagged content may be retained "for up to 2 years". Some top-tier models "require 30-day data retention and are not available under ZDR" | HIPAA-eligible: Messages API, token counting, prompt caching, structured outputs, citations, inline PDF, thinking. Not eligible: batch processing, Files API, code execution, MCP connector, web fetch, managed agents; "the API returns a `400` error" | "Do not include PHI in JSON schema definitions" (schemas are cached separately). Beta features generally not covered. Console playground not covered |
| Claude through Amazon Bedrock or Google-managed Vertex | "the cloud provider is the data processor; refer to those platforms' data retention and compliance documentation" `[ANT-RET]` | Per cloud provider | Per cloud provider | "HIPAA readiness is not available on Claude Platform on AWS" `[ANT-RET]` |
| OpenAI API `[OAI-BAA]` | Self-serve: Settings > Organization > "HIPAA compliance support"; "requires an established history of API usage"; "you cannot disable it" once enabled | Covered services and configuration are in a separate "HIPAA eligible products and functionality" article (not read) **[unverified]** | Not read | "Accepting a BAA and enabling HIPAA compliance support do not, by themselves, make your application HIPAA compliant"; "We do not offer a BAA for ChatGPT Business" |
| Azure-hosted OpenAI models ("Models sold by Azure") `[AZ-PRIV]` | Microsoft's healthcare terms were not read **[unverified]** | Prompts and completions "are NOT available to OpenAI", "NOT used to train any generative AI foundation models without your permission"; "The models are stateless". An abuse-monitoring store can hold prompts for human review unless the customer is approved for modified abuse monitoring | Stateful features (Responses API, Assistants threads, stored completions, batch, files) persist data in the tenant's resource, encrypted with AES-256 | Change log 2026-11-17: for models made available on or after 2026-11-01, modified abuse monitoring "will no longer be available" from a date to be announced |
| Amazon Bedrock `[AWS-BR]` `[AWS-HIPAA]` | "Amazon Bedrock" and "Amazon Bedrock AgentCore" are on the HIPAA Eligible Services list (updated 2026-11-16); an AWS business associate agreement is required first | Model providers "don't have access to Amazon Bedrock logs or to customer prompts and completions" | Not read in detail | Data-retention page not read |
| Google Cloud generative AI `[GCP-HIPAA]` `[GCP-GOV]` | BAA product list (updated 2026-11-11) includes "Generative AI on Agent Platform" and "Gemini Enterprise Agent Platform"; "Don't use pre-GA offerings ... with PHI" | "Google won't use your data to train or fine-tune any AI/ML models without your prior permission"; in-memory cache deleted within 24 hours; request-response logging off by default; grounding with Google Search stores queries for three days and "There is no way to disable" it; partner (OpenAI) models log "for up to 30 days" unless ZDR is approved | — | Zero retention requires turning off or avoiding several features |

Zero data retention and HIPAA eligibility are different things: one is about storage after the response, the other about contractual
safeguards. A design that needs "no PHI stored by the vendor" and "BAA in place" must check both columns for the exact feature used.

### 9.3 Requirements for AI features in the report module (*Recommended*)

1. Default pattern: the model receives the question, the metric catalog and **aggregated** results that have passed the small-cell
   check. Patient-level rows never leave our boundary; patient-specific questions route to ordinary search.
2. The question text can contain PHI (a staff member can type a patient's name). Either the endpoint is BAA-covered and
   HIPAA-configured, or the input is screened and such questions are refused before the call.
3. Use only features on the vendor's eligible list for the configured arrangement; treat "batch", "files" and "code execution" style
   features as unavailable for PHI unless the contract says otherwise.
4. Prompts, tool calls, retrieved data and answers are stored in our audit store under the same retention and access rules
   (`ai.question`, `ai.tool_call`); the model call inherits the asking user's scope and data classes — the model must not be able to
   answer with numbers the user could not see in a report.
5. No tenant data in shared prompt prefixes or caches that are keyed across tenants; cache keys include tenant, scope and class
   profile.
6. No training or fine-tuning on tenant data without an explicit BAA basis.
7. AI-generated narratives used "to make decisions about the patient's care or payment" may be part of the designated record set
   `[ADA-PRIV26]`; keep practice-level narratives clearly separate from patient records.
8. Add each AI component to the risk analysis and asset inventory, with the data it can reach `[FR-2025]`.
9. Keep the provider behind an interface so that a change in a vendor's terms (for example the Azure abuse-monitoring change) is a
   configuration change.

---

## 10. SOC 2 expectations mapped to the report module

SOC 2 reports are attestations against the AICPA Trust Services Criteria (2017 criteria with 2022 points of focus `[AICPA-TSC]`).
The security ("common") criteria are always in scope; availability, processing integrity, confidentiality and privacy are optional
categories. The criterion wording below is **recalled, not re-read** (the PDF sits behind a download page) — treat ids and wording
as **[unverified]** until checked against the document.

| Criterion (recalled) | What an auditor asks of a reporting feature | Evidence the module should produce |
|---|---|---|
| CC6.1 logical access; CC6.2 registration / de-registration; CC6.3 role-based access, least privilege, segregation of duties | Who can run / export which reports; how rights are granted, reviewed and removed | Role × data-class matrix export; access-change events; periodic access-review report; effective-access view per user |
| CC6.7 restriction of transmission, movement and removal of information | How data leaves the system | Export / delivery events with recipient and channel; link-not-attachment design; DLP-style thresholds and alerts |
| CC7.2 monitoring for anomalies; CC7.3 evaluation of security events | Whether anyone looks at the logs | Alert rules, alert history, documented review of the report access log |
| CC8.1 change management | How a report or metric definition changes | Versioned definitions, approval, change log shown on the report |
| C1.1 identification / maintenance of confidential information; C1.2 disposal | Classification and lifecycle of generated files | Data classes; artifact TTLs; purge events |
| PI1.x processing integrity (complete, accurate, timely outputs) | Whether the numbers are right | Reconciliation checks (section 29), definition tests, run metadata (data freshness, basis) printed on every output |
| P4.2 retention / P4.3 disposal; P6.x records of disclosures; P6.7 accounting to data subjects (privacy category only) | Disclosure records and their retention | `disclosure_log`, accounting-of-disclosures report |
| A1.x availability | Whether heavy reports can degrade the transactional system | Async execution, time-outs, per-tenant concurrency limits (`[ARCH]` §6, §11.3) |

---

## 11. Compliance requirements checklist (for the plan)

| Id | Requirement | Priority | Basis |
|---|---|---|---|
| CR-01 | One authorization function for run, view, drill, export, schedule, share and AI; stored results re-authorised against the viewer | P0 | §3, §4 |
| CR-02 | Data classes on every column / measure; masking identical on screen and in every export | P0 | `[R-514]` |
| CR-03 | Office scope and provider scope enforced in the executor and recorded on the run | P0 | `[R-312]` `[R-308]` |
| CR-04 | Audit events for run, view, drill, export, download, print, deliver, schedule, share, denied; fields per §5.3 including parameters, row and patient counts | P0 | `[R-312]` `[NIST-66]` |
| CR-05 | Patient manifest (or reproducible snapshot) per exported or delivered artifact | P0 | `[R-410]` `[R-528]` |
| CR-06 | Tamper-evident, append-only audit store; six-year retention; audited read access | P0 | `[ONC-D2]` `[R-316]` |
| CR-07 | No PHI in e-mail bodies or attachments; app-mediated, short-lived, single-use download links | P0 | `[FR-2013]` `[GCS-SIGN]` |
| CR-08 | Generated files encrypted at rest, private, TTL-purged with audit; legal hold | P0 | `[R-310]` `[R-312]` |
| CR-09 | `disclosure_log` fed by every external delivery; accounting-of-disclosures report | P1 | `[R-528]` `[R-504]` |
| CR-10 | Report access log report + alert rules; documented periodic review | P1 | `[R-308]` |
| CR-11 | Purpose prompt and optional approval for bulk or sensitive exports | P1 | `[R-514]` (d)(3)(ii) |
| CR-12 | Watermark / header on every output, resolving to the audit event | P1 | *Recommended* |
| CR-13 | Per-patient financial record export within the access deadline | P1 | `[ADA-PRIV26]` |
| CR-14 | Cross-tenant benchmarks only from pre-aggregated, small-cell-suppressed facts; BAA clauses for data aggregation and de-identification | P1 (before any benchmark ships) | `[R-504]` `[R-514]` `[CMS-CELL]` |
| CR-15 | AI: aggregates only by default, BAA-covered endpoint with eligible features, scope-inheriting tool calls, prompt logging | P1 (before any AI ships) | `[FR-2025]` `[ANT-RET]` |
| CR-16 | MFA / step-up for export and audit-report access; idle timeout on viewers | P2 (P0 if the NPRM is finalised) | `[FR-2025]` `[R-312]` |
| CR-17 | Segregation: `user_activity` class not visible to the users under review | P1 | `[DX-FRAUD]` |
| CR-18 | Return / destroy path for report artifacts, marts and caches at tenant off-boarding | P2 | `[R-504]` |

---

# PART 2 — Dental financial semantics

## 12. The money model in one page

### 12.1 Identities

| Quantity | Definition | Notes |
|---|---|---|
| Gross production | Σ full (office) fee of completed procedures | ADA: "Gross production includes all dentistry produced, regardless of the ability to collect fees" `[ADA-MS]` |
| Contractual write-off | Full fee − contracted / allowed fee (PPO, capitation, fee-schedule plans) | May be an explicit transaction or implicit in the charged fee (section 13.2) |
| Other production adjustments | Discounts, courtesies, charge corrections, finance / late charges (signed) | Class decides the side, not the name (section 14) |
| Net (adjusted) production | Gross production − contractual write-offs ± other production adjustments | ADA: "Adjusted, or billable production, is the amount that is considered collectable after any adjustments have been taken" `[ADA-MS]` |
| Gross collections | Patient payments + insurance payments received (prepayments included) | Tender-level detail in section 15 |
| Collection adjustments | Refunds, NSF and other payment reversals, payment corrections (signed) | |
| Net collections | Gross collections ± collection adjustments | |
| A/R roll-forward | Ending A/R = beginning A/R + charges + debit adjustments − credit adjustments − payments | Dentrix prints exactly this: "Beginning Balance, plus Total Charges, minus Total Credits" `[DX-PA-P]`. Transfers net to zero |
| Collection percentage | Net collections ÷ net production over the same window | ADA target: "98% of billable/adjusted production" `[ADA-MS]`; variants in `[KPI]` §2.8 |

### 12.2 One procedure, three legitimate reports

Crown on 3 March: full fee 1,200; PPO contracted fee 800; estimate insurance 400 / patient 400; patient pays 400 at checkout. Claim created
4 March. EOB posted 2 April: allowed 780, insurance pays 390, actual write-off 420, patient share 390 (credit of 10).

| View | March | April | Stable after month end? |
|---|---|---|---|
| Gross production (full fee, service date) | 1,200 | 0 | Yes |
| Net production, write-off dated on **insurance payment date** | 1,200 | −420 | Yes, but March is overstated and April absorbs old write-offs |
| Net production, write-off dated on **procedure date** | 800 when run in March (estimate), 780 when re-run after 2 April | 0 | No — history changes when the payment posts |
| Net production, **estimate on claim date + adjustment on payment date** | 800 | −20 | Yes, and close to economic reality |
| Charged-at-contracted-fee systems (no explicit write-off) | 800 | −20 (insurance adjustment) | Yes; gross (1,200) exists only if the full fee is stored beside the charge |
| Collections (cash) | 400 | 390, then −10 refund or 10 credit carried | Yes |
| Collection % on this procedure | 780 ÷ 780 = 100% on net; 65% on gross | | |

The three write-off timings are Open Dental's documented options ("Using insurance payment date", "Using procedure date", "Using
initial claim date for write-off estimates, insurance pay date for write-off adjustments") `[OD-WO]` `[OD-DWO]`. Report definitions
must say which one they use.

### 12.3 Vocabulary across the reference systems

| Concept | Dentrix | Denticon | Open Dental |
|---|---|---|---|
| Charge | Procedure; "The total production from completed procedures entered during the time period" `[DX-PA-P]` | Service / charge posted to the Ledger as completed `[DN-PSIA]` | Completed procedure; "Procedure fees for completed procedures" `[OD-PI]` |
| Adjustment that lowers the balance | Credit adjustment (for example write-offs and cash discounts) `[DX-PA-P]` | Adjustment with `-` sign `[DN-ADJTYPE]` | Subtraction (`-`) type `[OD-ADJT]` |
| Adjustment that raises the balance | Charge (debit) adjustment — includes debit adjustments and patient refunds `[DX-PA-P]` | Adjustment with `+` sign | Addition (`+`) type |
| Production vs collection side | "Production Adjustment List" / "Collections Adjustment List", editable per report; default debit → production, credit → collections `[DX-PAR]` | "Sub Type" = `Production` or `Collection` on the code `[DN-ADJTYPE]` `[DN-DJ]` | Adjustments affect production; insurance write-offs are a separate object on the claim procedure, not an adjustment `[OD-ADJ]` `[OD-PI]` |
| Payment split | Split by provider (four methods) or by family member `[DX-SPLIT]` | Allocation, automatic FIFO `[DN-FIFO]` | Paysplit (provider, clinic, patient, procedure, unearned type) `[OD-SPLIT]` |
| Unapplied money | Provider credit balances `[DX-PCB]` | Provider shown as "Unallocated" `[DN-UNALLOC]` | Unearned / prepayment `[OD-UNEARN]` |
| Period lock | Month-end close moves transactions to history `[DX-ME]` `[DX-HIST]` | Close Out; Update Statement Dates `[DN-CO1]` | Global lock date / days `[OD-LOCK]` |

---

## 13. Gross vs net production, fee bases and write-offs

### 13.1 Fee vocabulary (ADA)

| Term | ADA wording | Source |
|---|---|---|
| Full fee | "The fee for a service that is set by the dentist"; and "The fee for a patient without dental benefits shall be considered a dentist's full fee" — the amount to report to all carriers | `[ADA-GLOSS]` `[ADA-ETH]` 5.B.3 |
| UCR | The glossary lists "usual, customary and reasonable" but the ADA "recommends not using this term" | `[ADA-GLOSS]` |
| Fee schedule | "A list of the charges established or agreed to by a dentist for specific dental services" | `[ADA-GLOSS]` |
| Allowable charge | "The maximum dollar amount on which benefit payment is based" | `[ADA-GLOSS]` |
| Maximum plan benefit | "The reimbursement level determined by the administrator of a dental benefit plan for a specific dental procedure" | `[ADA-GLOSS]` |
| PPO | An agreement with a defined group of dentists using "discounted fees for cost savings" | `[ADA-GLOSS]` |
| Balance billing | "Billing a patient for the difference between the dentist's actual charge and the amount reimbursed" | `[ADA-GLOSS]` |
| Overbilling | "The misrepresentation of a fee as higher than actual charges" | `[ADA-GLOSS]` |

Use "office fee" or "full fee" in the UI; keep "UCR" only as an alias because the legacy tool and staff use it.

### 13.2 Where the contractual write-off lives

| Posting pattern | What the ledger shows | How to get gross / net |
|---|---|---|
| A. Charge the full fee, write off at insurance payment | Production at full fee on the service date; a credit adjustment or claim write-off later | Gross = Σ charges; net = gross − write-offs (dated per §12.2) |
| B. Charge the contracted fee | Production already net of the PPO discount; no write-off transaction | Net = Σ charges; gross exists only if the full fee is stored on the charge line; implied write-off = full fee − charged fee |
| Mixed | Both, by plan or by office | Compute both columns per line and never add a pattern-A write-off to a pattern-B line |

(L) The migrated Denticon data is pattern B for a large share of lines: `patient_procedures.fee` is the charged / contracted fee and
`ucr_fee` the office fee, with `ucr_fee > fee` on about half of 2025 lines `[L-FIN]`. Dentrix supports the same comparison at report
time: the Day Sheet's "Compare to Fee Schedule" option adds "Total charges" recalculated at a chosen schedule and a "Net difference"
`[DX-DAY]`. Open Dental reports gross production and PPO write-offs as separate columns, and excludes capitation production `[OD-PI]`.

### 13.3 Estimate vs actual write-off

- Open Dental stores a **Claim Snapshot** when a claim is created: it "stores the original insurance write-off, fee, and expected
  insurance payment information", cannot be updated, and feeds the reports that show "Write-off Est" and "Write-off Adj" (estimate
  minus actual) `[OD-SNAP]` `[OD-PI]`.
- Trade-offs documented by Open Dental: with payment-date write-offs history stays stable but the day's net production does not
  reflect the write-off; with procedure-date write-offs the day is right but historical reports have to be re-run when the write-off
  changes; the snapshot method keeps history stable and allows paying providers on adjusted production `[OD-WO]`. Open Dental
  recommends the payment-date method to offices that use global lock dates `[OD-WO]` `[OD-LOCK]`.
- Denticon posts automatic entries at insurance payment — "AUTO - Insurance Adjustment" and "AUTO - Xfer Ins Amt To Patient" — when
  a PPO fee or UCR mismatch exists or the payment exceeds the charge; they cannot be deleted individually `[DN-AUTO]`.
- Electronic remittances carry the split: X12 claim adjustment group codes `CO` "Contractual Obligation", `PR` "Patient
  Responsibility", `OA` "Other Adjustment", `PI` "Payor Initiated Reduction" `[X12-CAGC]`. Map `CO` amounts to the contractual
  write-off class and `PR` to patient responsibility (reason-code level mapping not researched **[unverified]**).

### 13.4 Compliance hooks in adjustment reporting

| ADA Code of Ethics advisory | Report that monitors it |
|---|---|
| 5.B.1 Waiver of copayment — accepting the plan payment as payment in full "without disclosing" the waiver is overbilling | Courtesy / discount adjustments on insured procedures, by user and provider |
| 5.B.2 Overbilling — "It is unethical for a dentist to increase a fee to a patient solely because the patient is covered" | Fee overrides above the office fee, by payer |
| 5.B.3 Fee differential — the full fee is what is reported to carriers | Claims where the submitted fee differs from the office fee |
| 5.B.4 Treatment dates — "reporting incorrect treatment dates for the purpose of assisting a patient in obtaining benefits" | Service date changed after posting; entry date far from service date |

Source: `[ADA-ETH]`.

*Recommended*: store full fee and charged fee on every charge line; store the estimate snapshot (insurance portion, write-off, patient
portion) at claim creation; offer the three write-off timings as named bases, default to "estimate at claim date + adjustment at
payment date" for net production and to "payment date" for locked financial statements; print the basis on the report.

---

## 14. Adjustment taxonomy

### 14.1 Canonical classes (*Recommended*; examples are sourced)

| Class | Side | Effect on balance | Examples in the reference systems | Report treatment |
|---|---|---|---|---|
| `contractual_writeoff` | Production | − | Denticon `AC015` Ins Agreement, `AINSO` AUTO - Insurance Adjustment (L); Open Dental PPO write-off `[OD-PI]`; Dentrix credit adjustment `[DX-PA-P]` | Reduces net production; never provider-punitive |
| `capitation_writeoff` | Production | − | Open Dental `CapComplete` write-off `[OD-CAP]`; Denticon `AD900` Capitation Adjustment (L) | Section 23 |
| `discount` (courtesy, coupon, promotion, senior, employee, prompt-pay, membership plan) | Production | − | Denticon `AC014` Courtesy Discount, `AC006` Coupon, `AC005` Special Promotion (L); Open Dental `dp` discount-plan type `[OD-ADJT]`; Dentrix example: a 1,000 procedure with a 900 Charity Care credit shows 100 of production `[DXE-KEY]` | Reduces net production; who bears it in compensation is a policy |
| `charge_correction` | Production | ± | Denticon `AC004` Over Charged Revenue, `AC002` Treatment Incomplete, `AC003` Failed Treatment, `AD004` Increase Patient (L) | Reduces / raises production; high volume by user is an audit flag |
| `finance_or_late_charge` | Production | + | Denticon `AFCHG`, `ALCHG`, `AC001` Late Charge (off) (L); Dentrix finance and late charges posted manually or at month end `[DX-PA-P]` | Usually reported apart from clinical production |
| `nsf_fee` | Production | + | Denticon `AD003` FEE - NSF (L); "Fee – NSF Bank Fee" entered under the office's billing provider `[DN-NSF]` | Non-clinical income |
| `bad_debt` (uncollectable, bankruptcy, small balance) | Production in Denticon; excluded from provider adjustments in Open Dental | − | Denticon `AC008` Uncollectable Balance, `AC009` Bankruptcy (L); Open Dental payroll "Prod Adj" "Excludes Bad Debt type adjustments" `[OD-PAYROLL]` | Own line; reported as a rate (HFMA measures bad debt against gross revenue and notes "This is not the amount written off from A/R" `[HFMA-MAP]`) |
| `collection_agency_transfer` / agency fee | Production (Denticon) / collection | − | Denticon `AC007` Tr to Coll Agency, `AC012` Collection Fee, `COLFE` (L) | Track placed, recovered, fees |
| `refund_patient`, `refund_insurance`, `refund_financing` | Collection | + | Denticon `AR001` to `AR007`, `SUNBR` (L); Dentrix: patient refunds are charge adjustments `[DX-PA-P]` `[DX-ADJ]` | Reduce net collections; HFMA counts cash "inclusive of refunds" `[HFMA-MAP]` |
| `payment_reversal` (NSF, charge-back, voided card) | Collection | + | Denticon `AR008` REV PMT - Non-sufficient funds, `AR005`, `AR006` (L) | Reduce net collections on the reversal's posting date |
| `insurance_recoupment` | Collection | + | Denticon: when close-out prevents deleting the payment, "A positive collection adjustment will add to the patient balance available to be collected against" `[DN-INSREF]` | Reduce insurance collections |
| `transfer` (between patients, providers, offices, accounts) | Both, paired | Net zero | Denticon `AC010` / `AD010` charges, `AR010` / `AI010` payments `[DN-XFER]` `[DN-WRONGPROV]`; Open Dental income transfer: offsetting paysplits "equal to $0" that "do not increase or decrease the total practice income" `[OD-XFER]` | Excluded from totals; shown in attribution reports |
| `opening_balance` | Production (Denticon) | ± | Denticon `APBAL`, `APBAI`, credits `APBAC`, `APBIC` (L); "Previous Balance" at conversion `[DN-PREVBAL]` | Excluded from production; included in A/R |
| `contract_movement` | — | ± | Denticon "Balance Moved To Contract" (`ACMVD`), "Periodic Contract Billing" (`ACBIL`) — "intended to function only within a patient's payment contract" `[DN-CONTRACTCODES]`; `AFEED` / `AFEEI`, `ACCNN` / `ACCNC` (L) | Section 24 |
| `sales_tax` | Liability, not production | + | Denticon `ATAX` is grouped with collection adjustments (L); Open Dental sales-tax tools use adjustments `[OD-ADJ]` | Own column; never production |
| `unearned_application` | — | Net zero | Open Dental "Allocate Unearned Income" `[OD-UNEARN]` | Attribution only |

### 14.2 Rules

1. Class, side and sign are attributes of the adjustment type, stored in the database and versioned. Denticon: "Only the
   adjustment's Type and Sign affect the Ledger calculation" `[DN-ADJPICK]`; a used code can only have its description changed
   `[DN-ADJTYPE]`; Open Dental: "Once the adjustment type is created, this value cannot be changed" `[OD-ADJT]`.
2. Do not let the report user re-classify per run (the Dentrix Provider A/R Totals lists allow it `[DX-PAR]`); it makes two runs of the
   same report disagree. Keep one tenant-level mapping with history.
3. The side decides which report column an adjustment appears in. Denticon's Daily Journal shows production adjustments in the
   charges column "as either a + or a -" by design `[DN-DJ]`; its Income Allocation report separates "Income Adjust (+/-)", "Non-Income"
   and "Prod Adj (+/-)" `[DN-IA]`.
4. An adjustment needs the same attribution as the thing it adjusts. Open Dental: "The clinic and provider of the adjustment must
   match the attached procedure", otherwise "the adjustment is considered a separate charge when a payment is applied" `[OD-ADJ]`;
   Denticon: apply each adjustment to the right patient, provider and location `[DN-FIFO]`.
5. Bad debt deserves its own class even though the legacy catalogue files it under production: net production "before bad debt" and
   "after bad debt" answer different questions, and a collection percentage computed after bad debt hides the problem.
6. (L) The 46 legacy adjustment codes with sign and Production / Collection group exist only in the frontend; the database has 12
   generic definitions without a sign, and `write_off_type` carries two conflicting vocabularies `[L-FIN]`. The taxonomy above needs a
   server-side home before any adjustment report is trustworthy.

---

## 15. Collections

### 15.1 Tender taxonomy

| Tender class | Members | Reconciles against |
|---|---|---|
| Cash | Cash | Deposit slip |
| Check | Paper check, money order; collection-agency remittance check | Deposit slip; remote-deposit batch |
| Card | Visa / Mastercard, American Express, Discover, debit; card on file / recurring | Processor batch settlement (gross, fees, net) |
| ACH / e-check | Recurring bank draft, e-check | Bank statement |
| Third-party patient financing | CareCredit, Sunbit and similar | Financing-company remittance, net of merchant fee — Open Dental's Daily Payments report can show CareCredit and PayConnect fee columns and "Total All Payments After Fees" `[OD-DPAY]` |
| Online / portal | Patient-portal and text-to-pay payments | Processor batch |
| Insurance check | Paper check with EOB | Deposit slip |
| Insurance EFT / virtual card | ERA 835 remittance | Bank statement / processor |
| Capitation payment | Monthly carrier payment | Bank statement (section 23) |
| Non-cash | Transfers, unearned applications, adjustments | Nothing — must be excluded from deposits |

(L) The legacy payment codes map to tender classes only in the frontend (`PP005` cash, `PP009` check, `PP008` Master Card / Visa,
`PF001` Care Credit, …) and card brand is lost on migrated rows `[L-FIN]`.

### 15.2 What counts as collections

| Question | Reference behaviour | Source |
|---|---|---|
| Prepayments / deposits | They are cash received. Open Dental has an "Include Unearned" option on the income reports and warns it "should either always be selected when running the daily payment report or never selected" | `[OD-DPAY]` `[OD-PI]` |
| Insurance payments not yet finalised | Open Dental separates "Ins Income" (received or supplemental in the range) from "Ins Not Final" | `[OD-PAYROLL]` |
| Transfers | Listed in payment reports but net to zero | `[OD-XFER]` |
| Refunds | Reduce cash; HFMA: "Total patient service cash collected for the reporting month, inclusive of refunds" | `[HFMA-MAP]` |
| Which date | Open Dental Daily Payments: "Payment date". Denticon Income Allocation: by date entered — back-dated payments appear in the period they were entered | `[OD-DPAY]` `[DN-IAD]` |
| Provider | Patient payments: the provider on the payment split; insurance payments: the provider on the claim procedure | `[OD-DPAY]` |
| Office | "The payment itself will be recorded to the current office" even when it pays a procedure charged elsewhere | `[DN-MLPAY]` |

### 15.3 Collection percentage definitions

| Name | Formula | Use | Source |
|---|---|---|---|
| Net collection rate | Net collections ÷ net production, same window | Management standard; ADA target 98% of adjusted production | `[ADA-MS]`; variants `[KPI]` §2.8 |
| Gross collection rate | Collections ÷ gross production | Shows fee-schedule drag only | `[KPI]` |
| Cash to revenue (HFMA FM-2) | Cash collected in the month ÷ average monthly net patient service revenue of the last three months | Smooths the timing mismatch | `[HFMA-MAP]` |
| Time-of-service collection | Patient payments on the visit date ÷ estimated patient portion; HFMA "POS" counts cash "collected prior to, at the time of service, and up to seven days after discharge" | Front-desk performance | `[HFMA-MAP]`; `[KPI]` COL-05 |
| Cohort ("collected to date") | Payments allocated to period X's production ÷ period X's net production | The only variant free of timing bias; needs reliable allocations | *Recommended* |

Period mismatch is structural: money collected this month mostly pays earlier work ("payments collected today (aka: deposits) may pay
on procedures entered in the past" `[DN-PSIA]`). Show the month figure with a rolling 3- and 12-month figure beside it.

---

## 16. Cash vs accrual views

| Fact | Source |
|---|---|
| Cash method: "you generally report income in the tax year you receive it"; income is constructively received when "credited to your account or made available to you without restriction" | `[IRS-538]` |
| Accrual method: income when "all events have occurred which fix your right to receive the income" and the amount is determinable | `[IRS-538]` |
| Entities that would otherwise have to use accrual may use cash if average annual gross receipts for the three prior years are within the inflation-indexed threshold ("$26 million or less" in the January 2022 revision — check the current figure) | `[IRS-538]` |
| A monthly close for a dental practice includes "Confirm all deposits are posted and mapped consistently", "Complete bank, merchant, and payroll reconciliations", "Record key accruals" and "Confirm revenue ties to practice collection reporting" | `[CLA-15]` |

Implications:

| View | What it measures | Basis | Typical consumer |
|---|---|---|---|
| Production | Work performed (accrual-like) | Service date for analytics; posting date for the financial close | Providers, operations, compensation |
| Collections | Cash received | Payment / deposit date | Owner, CPA on a cash-basis return |
| A/R | The bridge between the two | As-of date | Billing, lender |
| Deferred items | Prepayments, unapplied credits, contract amounts not yet earned or billed | As-of date | CPA on an accrual-basis entity (DSOs) |

*Recommended*: ship both a "cash" pack (collections by tender and deposit date, refunds, deposits) and an "accrual" pack (net production,
A/R roll-forward, unearned / contract liabilities) and label them. How a given DSO maps PMS figures to GAAP revenue (allowances,
implicit price concessions, contract liabilities) is its accountant's decision and was not researched **[unverified]**.

---

## 17. Date bases, and why the day sheet uses the posting date

### 17.1 Date dictionary

| Date | Meaning | Mutable? | Used by |
|---|---|---|---|
| Service date (DOS, procedure date) | When care was delivered | Editable in all three systems | Clinical analytics, production by provider, ageing, claims |
| Entry / posting date (transaction date, created date) | System date when the row was recorded | System-captured | Day sheet, MTD / YTD, close, audit |
| Business date of a payment or adjustment | Date shown on the account | User-editable | Statements, most Open Dental reports |
| Allocation date | When a payment was applied to charges | System-captured in Denticon | Provider income |
| Claim date / date sent | When the estimate was fixed | — | Write-off estimate, insurance ageing |
| Insurance payment (finalised) date | When the EOB was posted | — | Actual write-off, insurance income |
| Deposit date | When money went to the bank | Set on the deposit | Bank reconciliation, cash-basis books |
| Statement date / close date | Lock boundaries | Set by a close action | Editing rules |

Evidence:

| System | Statement | Source |
|---|---|---|
| Dentrix | Reports offer "Entry Date" (the system date when the procedure was posted) or "Procedure Date" (which differs only if it was changed); run by entry date, the Day Sheet prints both | `[DX-DAY]` `[DX-PAR]` |
| Dentrix | "Month-to-date (MTD) and year-to-date (YTD) totals will not print if you select a billing type range"; YTD and previous-month totals print only when the report is run by entry date | `[DX-DAY]` |
| Dentrix | Practice Analysis: "The time period for all transactions is determined by entry date"; "the totals might not be accurate until the previous month has been closed out" | `[DX-PA]` |
| Denticon | Reports can run by transaction date (when the transaction was entered) or by service date, which differ "if the service was backdated" | `[DN-STX]` |
| Denticon | "Payments are allocated only on the date of transaction entry"; "the allocation date is hard-programmed to be the system-captured creation date"; "The system does not reallocate all the allocations because of a back dated transaction" | `[DN-FIFO]` |
| Denticon | Production Summary lists services "posted to the Ledger during the report date(s) as completed"; Income Allocation lists "monies (aka: payments) collected and entered during the report date(s)" | `[DN-PSIA]` |
| Open Dental | Adjustment "Entry Date" is read-only; the "Adjustment Date" "is the date that appears on the account and most reports" and changing it "could potentially change historical data" | `[OD-ADJ]` |
| Open Dental | User-group lock dates are based on the entry date, so back-dating is still possible; global locks are the only way to prevent back-dating of new items | `[OD-LOCK]` |
| Eaglesoft | Date-based reporting lets listed reports run by "Transaction Range" or "Date Range"; certain end-of-month reports "cannot be run at a later date" | `[ES-RPT]` |

### 17.2 Why the posting date

1. **Completeness.** Every transaction has exactly one posting date, so every transaction lands on exactly one day sheet. A procedure
   entered today for a service last week would never appear on any day sheet printed by service date.
2. **Stability.** The set of rows posted on day D cannot grow after D; totals by posting date can be tied to a deposit and then left
   alone. Totals by service date keep changing as late entries arrive (the Open Dental procedure-date write-off note: historical
   reports must be re-run `[OD-WO]`).
3. **Reconciliation.** The day's posted payments are what is physically in the drawer and the card batch. Eaglesoft: "The Day Sheet is
   a summary of the Audit Trail and will match the Provider Productivity Report totals for Production, Collections, and Adjustments"
   `[ES-RPT]`.
4. **Fraud control.** Back-dating cannot move money out of today's totals; the difference between the two dates is itself the
   audit signal (section 27.3).
5. **Roll-forward.** Opening A/R + the day's posted activity = closing A/R only holds on the posting basis.

Points 1, 2, 4 and 5 are analyst reasoning from the vendor behaviour above, not quotations. Service-date reporting remains the right
basis for "what did this provider do in March" and for clinical KPIs. A module needs both, a visible basis label on every money
report, and a bridge report (rows whose posting period differs from the service period).

### 17.3 Close and lock in the reference systems

| System | Mechanism | Effect | Correction after close | Source |
|---|---|---|---|---|
| Dentrix | Ledger > Close Month ("You cannot close out the current month"); options Close Transactions, move perio / clinical exams to history, Reset Insurance Benefits, appointment purge | Transactions are "moved to history when you close out the month" | Under GAAP "you can only correct posting errors by using an adjustment": post an offsetting adjustment, re-post, and "Change the date to reflect the date you posted the transaction originally"; a procedure in history is invalidated — "Invalidating a procedure removes it from the Patient Chart, while leaving it on the Ledger" | `[DX-ME]` `[DX-HIST]` `[DX-INV]` |
| Denticon | Setup > Close Out with a "New Closing Date", optional "Close All Offices"; "highly recommended that this program be run at least once a month"; separately Reports > Statements > "Update Stmt Dates" locks accounts that received statements | "Staff cannot edit to manipulate the recorded financial information which is recorded prior to the Close Out Date"; "There is no entry in the account ledger to indicate the Close Out" | "Denticon cannot reverse a Close Out"; "Once you have closed you can not change" — void the procedure, post a production adjustment, re-enter with the original date of service. "Do not run Close Out or Update Statement Dates using the current date" | `[DN-EOM]` `[DN-CO1]` `[DN-CO2]` `[DN-CO3]` `[DN-CO4]` `[DN-CLOSED]` |
| Open Dental | Global lock date ("lock this date and all prior dates") or lock days ("Entering 1 allows changes for the current day only"); "Lock includes administrators" option; per-permission user-group lock dates; a separate accounting lock date | Prevents edits and back-dated new items | Admin bypass when the option is off; a separate permission allows adding pay splits to payments created before the lock | `[OD-LOCK]` `[OD-PERM]` `[OD-CLOSE]` |
| Eaglesoft | End-of-day, end-of-month and end-of-year processing with matching report sets | — | — | `[ES-RPT]` |

### 17.4 *Recommended* model for our module

| Element | Design |
|---|---|
| Two clocks on every money row | `service_date` (business meaning) and `posted_at` (immutable, system-captured, UTC) plus the derived office-local `posting_date`; payments also carry `payment_date` and `deposit_id` |
| Period close | `financial_period_close` per office: `closed_through_date`, `closed_by`, `closed_at`; optional daily close, expected monthly close; "close all offices" for enterprises |
| Lock rule | No insert, update or void with `posting_date` on or before `closed_through_date`. Service dates may still be old (that is how late charges are recorded) |
| Corrections | Reversing entry + re-post in the open period, both linked to the original (`reverses_txn_id`, `replaces_txn_id`), with reason and user; the original stays visible |
| Snapshots at close | Day sheet, deposit, production / collections summary, A/R ageing and unearned balance are stored as immutable results. Reports about a closed period read the snapshot by default and can show a live recompute beside it |
| Bridge | "Posted in period X for service in period Y" report explains every difference between posting-basis and service-basis totals |
| Time zone | (L) Timestamps are naive UTC; the office-local posting date must be derived with the office time zone, or a payment posted in the evening lands on the next day `[L-FIN]` |

(L) None of this exists today: one business date per row plus `created_at`, no void date, no deposit, no day close, no period lock,
and `created_at` on migrated rows may be the migration timestamp `[L-FIN]`.

---

## 18. Deposit slips and bank reconciliation

| Evidence | Source |
|---|---|
| Open Dental: the deposit window lists payments "not attached to a deposit (sorted by payment date, then date entered)"; filters by start date, clinic and payment type; deposit date defaults to today; a "Batch #" is "Usually used for credit card payments"; deleting a deposit "does not delete any payments"; deposits can be sent to QuickBooks, and corrections "must manually be made in QuickBooks" | `[OD-DEP]` |
| Dentrix: the Day Sheet dialog can print a "Deposit Slip" (bank format, option to combine family payments and include check detail), a "Receipts Only Day Sheet" and "Daily Collections" | `[DX-DAY]` |
| Denticon: a Deposit Slip report "may be generated to 'prove' the financial amount which is deposited into the office's bank account"; "Deposit Slip-Credit Card" is the month-end report used to reconcile monthly credit-card transactions | `[DN-DEP]` `[DN-EOM]` |
| Eaglesoft daily review set: "Deposit Report w/Itemized Cash", "Secondary Deposit Report", "Adjustments By Type or Adjustment Reconciliation", "Deleted Transactions" | `[ES-RPT]` |
| Controls: "Whoever balances the daily deposit should not be the person to take the deposit to the bank"; "The office should make it a priority to reconcile bank and credit card statements monthly" | `[DX-FRAUD]` |

Reconciliation chain (*Recommended*):

1. Day sheet collections by tender (posting basis) = Σ payments posted that day.
2. Cash + checks = deposit slip total = bank deposit line (same or next banking day).
3. Cards = processor batch gross; batch gross − fees − charge-backs = bank settlement line (days later).
4. Insurance EFT = ERA totals = bank line; third-party financing = remittance advice net of merchant discount.
5. Anything posted but not on a deposit = "undeposited funds"; anything on a deposit but edited afterwards = exception.

Entities needed: `deposit` (office, bank account, `deposit_date`, tender group, processor batch reference, status `open` / `deposited`
/ `reconciled`) and `deposit_item` linking payments; one payment belongs to at most one deposit; a payment on a deposit cannot be
edited without reopening the deposit. Reports: deposit slip, card batch reconciliation, undeposited funds, deposit variance. Mask
bank and card numbers. (L) No deposit entity exists today `[L-FIN]`.

---

## 19. Provider attribution

### 19.1 Treating vs billing provider

| Role | Definition | Source |
|---|---|---|
| Billing dentist or dental entity (claim items 48-52A) | "the individual dentist's name, the name of the practitioner providing care within the scope of their state licensure, or the name of the group practice/corporation that is responsible for billing"; "the information provided in this section may not be the treating dentist" | `[ADA-CLAIM]` |
| Treating dentist (items 53-58) | "the dentist or practitioner acting within the scope of their state licensure who has provided treatment"; the certification is by "the dentist who performed, or is in the process of performing, procedures" | `[ADA-CLAIM]` |
| Open Dental defaults | Billing provider: the treating provider's "Claim Billing Prov Override", else the clinic's "Default Insurance Billing Dentist", else the practice default. Treating provider: "the last provider in the list of selected procedures who is not flagged as a secondary provider" | `[OD-CLAIM]` |

Rule: production, clinical KPIs and compensation follow the **treating** provider on the procedure; claim, payer and tax-id
reports follow the **billing** provider / entity. (L) Both exist on claims (`billing_provider_id`, `treating_provider_id`) and the
charge carries `provider_id` and `hygienist_id` `[L-FIN]`.

### 19.2 Hygiene production

| Evidence | Source |
|---|---|
| Open Dental procedure-code flag "Is Hygiene procedure": "This procedure is automatically assigned to the hygiene provider when scheduling an appointment with two providers"; "Assign to Prov" pins a code to one provider (the manual's example is a dummy provider for retail items so that real providers' production is not inflated) | `[OD-CODE]` |
| ADA benchmark assumes hygiene is measured separately: "Does the dentist generate at least 75% of production, with the hygiene department generating the remaining 25%?" | `[ADA-MS]` |
| Analytics vendors define hygiene by code list in some views and by provider role in others | `[KPI]` §2.3 |

Policy options to expose as a tenant setting (*Recommended*):

| Option | Hygiene procedures credited to | Doctor exam in a hygiene visit | Use |
|---|---|---|---|
| `hygienist` | The hygienist on the procedure | Doctor | Hygiene department KPIs, hygienist scorecards |
| `supervising_dentist` | The dentist of record | Doctor | Some compensation plans and payer views |
| `dual` | Hygienist for clinical / productivity reports, dentist for compensation | Doctor | Avoids forcing one answer; needs both ids on the charge |

(L) There is no hygiene flag on a procedure code; "hygiene production" must be defined by provider role, `hygienist_id` or a code
list `[L-FIN]`.

### 19.3 Allocating payments to providers

| Method | Behaviour | Where |
|---|---|---|
| Line item (explicit) | The user (or the claim) ties each part of a payment to a procedure; the procedure's provider and office receive the income | Open Dental paysplits: "the Clinic and Provider should always be the same as the attached production item" `[OD-SPLIT]`; insurance payments in all systems follow the procedures on the claim `[DN-FIFO]` `[OD-DPAY]` |
| FIFO (oldest first) | Payment goes to the oldest open charge on the account, whoever the patient or provider is | Denticon: "programmed to apply patient-received payments 'first in-first out,' or FIFO"; a payment left as "Apply to Responsible Party" "will allocate to the oldest aging item on the account" `[DN-FIFO]` `[DN-PAYENT]`. Dentrix FIFO: "Applies the payment toward the oldest completed procedures first" `[DX-SPLIT]`. Open Dental Auto-Split: "the oldest outstanding balance" `[OD-ALLOC]` |
| Proportional | By each provider's share of the balance | Dentrix Percentage Payments: "Divides the payment among the providers according to the provider's percentage of the total amount owed" `[DX-SPLIT]` |
| Equal | Same amount to each provider with a balance | Dentrix Equal Payments: "Splits payment amounts equally among all providers with debit balances" `[DX-SPLIT]` |
| Patient-portion first | Only balances that are the guarantor's estimated share | Dentrix Guarantor Estimate (the default): "Applies the payment to providers who have balances as guarantor estimates" `[DX-SPLIT]` |
| Unallocated | Money with no completed charge to pay | Denticon: "the provider field will read 'Unallocated'"; fixed by a "TRANSFER - Payment To" adjustment `[DN-UNALLOC]`; pre-payments stay unallocated until a completed procedure needs them `[DN-PREPAY]`. Open Dental: a split with no provider "will be marked as a prepayment" `[OD-SPLIT]`. Dentrix: provider credit balances, moved with "offsetting adjustments" `[DX-PCB]`, allocated by Guarantor Estimate or FIFO ("according to the oldest balance first") `[DX-ACB]` |

### 19.4 Consequences for reports

| Fact | Consequence | Source |
|---|---|---|
| "Payments (including prepayments/credits) are only allocated after services are completed" | Collections and provider income differ in every period by the unallocated amount | `[DN-IA]` |
| The Income Allocation report is "a live report"; "Account reallocations or adjustments can change report totals after reports have already been run" | Provider pay computed from a live allocation report is not reproducible. Freeze allocations at the pay-period close | `[DN-IAD]` |
| Allocation date is the entry date; back-dating a payment does not re-run allocations | Allocation rows need their own immutable date | `[DN-FIFO]` |
| An overpayment "will not appear on the Allocation report because it has yet to pay a completed procedure" | "Collections" on the deposit report ≠ "income" on the provider report | `[DN-PSIA]` |
| "cannot compare the numbers on the Production report to the production numbers on the Allocation report" | Label the allocation report's production column as "production paid", not production | `[DN-PSIA]` |
| Provider income is read from the "Income" column, per location where the provider worked | Multi-office providers need a consolidated view | `[DN-IA]` `[DN-IAD]` |
| Open Dental's provider payroll report requires "Allocate all income (Insurance, Patient Payments)"; "Pat Inc Unalloc" is shown but excluded from "Net Income" | Unallocated income must be visible beside every provider total | `[OD-PAYROLL]` |
| Reallocation is not always possible: "Not all accounts are eligible for automatic reallocation" | Allocation repair needs an explicit, audited tool | `[DN-REALLOC]` |

*Recommended*: persist one allocation row per (payment or adjustment) × procedure with `allocated_at`, `allocation_method`, provider,
office and the user or rule that created it; never recompute silently; show an "Unallocated" pseudo-provider so provider totals sum to
the practice total; compute compensation from allocations frozen at close; record re-allocations as new dated rows. (L) Migrated
history has no usable allocation rows — only per-charge scalars `pat_paid` / `pat_adjust` `[L-FIN]` — so historical collections by
provider can only be approximated and must be labelled as such.

---

## 20. Unapplied credits, prepayments and credit balances

| Topic | Evidence | Source |
|---|---|---|
| Definition | "Unearned income is typically a patient prepayment towards future charges"; typed by "unearned type"; applied later through "Allocate Unearned Income"; "It is never advisable to create a negative unearned balance" | `[OD-UNEARN]` |
| Prepayments for planned treatment | Hidden pay splits that do not affect the balance "until the treatment planned procedure is set complete", then an automatic income transfer | `[OD-UNEARN]` |
| Reports | Open Dental has four Unearned Income reports (Unearned Accounts, Unearned Allocation, Net Unearned Income, Line Item Unearned Income) and a Hidden Payment Splits report | `[OD-UNR]` `[OD-STD]` |
| Finding credit balances | Denticon: Aging Report (or Aging Report by Home Office) with "Show only Credit Balances". Dentrix: Aging report type "Credit Balances"; Practice Analysis shows "the total amount of any families who have a credit balance" | `[DN-CR]` `[DX-AGE]` `[DX-PA-R]` |
| Family netting | A credit on one family member and a debit on another with a zero account balance: "Adjustments may be entered in order to move a credit from one family member to another" | `[DN-FAMCR]` |
| A/R presentation | Denticon's Executive Summary and Aging Report disagree by default because one omits A/R and the other omits credit balances ("Include Credit Balance") | `[DN-EXAG]` |
| Metric | HFMA "Net Days in Credit Balance": credit balances "reported as the absolute value" ÷ average daily net revenue, excluding pre-service deposits | `[HFMA-MAP]` |
| Government-payer overpayments | A provider that has received a Medicare or Medicaid overpayment must "report and return the overpayment" by 60 days after it was identified; a retained overpayment becomes an "obligation" under the False Claims Act | `[U-1320]` |
| Patient credits and state unclaimed-property rules | Not researched | **[unverified]** |

Rules (*Recommended*): report gross A/R (debit balances), credit balances and net A/R as three numbers, never one; age credits by the
date they arose; distinguish `prepayment` (expected, tied to a plan or contract), `unapplied_payment` (posting backlog) and
`overpayment` (refund or apply) by type, not by inference; a credit-balance worklist with payer class (patient, commercial, Medicaid)
and age supports the 60-day duty where the practice bills government programmes. (L) There is no unapplied-credit table today;
the figures are derived `[L-FIN]`.

---

## 21. A/R and ageing conventions

### 21.1 What the reference systems do

| Aspect | Dentrix | Open Dental | Denticon | HFMA |
|---|---|---|---|---|
| Buckets | "Current, 31-60 Days, 61-90 Days, Over 90 Days" `[DX-PA-R]` | "0-30 Days", "31-60 Days", "61-90 Days", "> 90 Days" `[OD-RAGE]` | 0-29 (current), 30-59, 60-89, 90-119, over 120 `[DN-AGE]` | 0-30, 31-60, 61-90, 91-120, >120; "mutually exclusive ... must sum to 100%" `[HFMA-MAP]` |
| Clock starts | "procedure date" `[DX-PA-R]` | "the date of the charge" `[OD-AGE]` | "Aging begins when the procedure is entered as 'completed'" `[DN-AGE]` | "date of service (outpatient/ambulatory/physicians)" `[HFMA-MAP]` |
| Credits applied | Payment split method (section 19.3) | "credits are applied to the oldest debts first", across the family; optional per-procedure offset `[OD-AGE]` | FIFO `[DN-FIFO]` | — |
| Unit | Guarantor account; by-provider view uses the guarantor's primary provider `[DX-PA-R]` | Family (guarantor) or individual `[OD-RAGE]` | Responsible party; "Account A/R" vs "Patient A/R" `[DN-ARPT]` | Account |
| Insurance vs patient | Insurance estimate and guarantor portion in separate columns `[DX-AGE]` | Patient = Total − Ins Est − W/O Est `[OD-RAGE]` | Patient portion and insurance portion `[DN-AGE]` | Billed A/R by payer |
| Negative balances | Separate "Credit Balances" report type `[DX-AGE]` | Not counted in buckets; shown only in Total and Patient columns `[OD-RAGE]` | Excluded unless "Include Credit Balance"; separate "Show only Credit Balances" `[DN-EXAG]` `[DN-CR]` | Separate credit-balance metric |
| As-of a past date | "Calculated Aged Balance as of" a chosen date (slower) `[DX-AGE]` | As-of date supported: "totals reflect all transactions up to the date entered except for estimated write-offs" `[OD-RAGE]` | Run point-in-time reports "for the default date" to capture "right now" `[DN-EOM]` | Month-end snapshot |
| Multi-office | — | Provider and clinic filters come from the guarantor (family) or the patient (individual) `[OD-RAGE]` | Use "Aging by Home Office"; single-location reports "only evaluate transactions within a single location" `[DN-MLA]` | — |
| Payment plans | Payment agreement amount shown `[DX-AGE]` | "Bal Not Due" when plan logic ages credits and debits; A/R breakdown and ageing "do not match if there are payment plans" `[OD-RPP]` `[OD-RB]` | "Aging Report (Include Contract Balance)" variant `[DN-MLA]` | — |

Eaglesoft's handout lists A/R reports among those that must be printed at period end because they "cannot be run at a later date"
`[ES-RPT]` — the reason for close snapshots (section 17.4).

### 21.2 Insurance A/R

| Fact | Source |
|---|---|
| Open Dental's Insurance Aging columns are "based on the Claim Snapshot and include estimated write-offs"; patient columns are the account balance minus those estimates | `[OD-INSAGE]` |
| The Outstanding Insurance Claims report ages a claim by a chosen date: "Date Sent", "Date Sent Orig" or "Date of Service", with "Days Old (min/max)" filters; "useful for tracking claims that have been sent, but not received" | `[OD-OUTINS]` |
| Denticon's month-end set includes "Outstanding Claims" (also for pre-authorizations) | `[DN-EOM]` |
| A different metric shares the name: Planet DDS industry reports define "Days in AR" as days from claim submission to payment | `[KPI]` §2.8 |

Two clocks are in use and both are legitimate: balance ageing from the service date (how old is the debt) and claim ageing from the
date sent (how long has the payer had it). Do not put them in the same bucket chart.

### 21.3 Patient-responsibility clock

All four sources age from the service date. A patient's share is often not known until the insurer pays, so service-date ageing makes
patient balances look older than the time the patient has actually owed them. Ageing the patient portion from the date responsibility
transferred (EOB posted or first statement) is a reasonable additional view; no vendor source read here documents it **[unverified as an
established convention]**. *Recommended*: canonical ageing from service date (matches the legacy tool and every reference), plus an
optional `patient_responsibility_date` basis for collections worklists.

### 21.4 Days in A/R

| Variant | Formula | Source |
|---|---|---|
| HFMA Net Days in A/R (FM-1) | Net A/R ÷ average daily net patient service revenue, using the "Most recent three-month daily average of total net patient service revenue" | `[HFMA-MAP]` |
| Dental analytics variants | Total A/R ÷ average daily collections; outstanding A/R ÷ (net collections ÷ business days) | `[KPI]` §2.8 |
| A/R ratio | Total A/R ÷ average monthly production | `[KPI]` COL-09 |

*Recommended* canonical: net A/R (debits less credits) ÷ (net production of the trailing 90 days ÷ 90), with the collections-based
variant available because the legacy analytics product uses it; print the formula in the tile's help text.

### 21.5 *Recommended* ageing rules

1. Bucket boundaries are a tenant setting with two presets: legacy (0-29 / 30-59 / 60-89 / 90-119 / 120+) and common (0-30 / 31-60 /
   61-90 / 90+). Buckets are exclusive and sum to the total.
2. Ageing is by open amount per charge after allocations; where allocations are missing, apply credits oldest-first and say so.
3. Insurance estimate, write-off estimate and patient portion are separate columns; estimated figures are labelled as estimates.
4. Contract and payment-plan amounts not yet due are a separate column, not "current".
5. As-of ageing for a closed period comes from the close snapshot; live as-of recomputation is offered with a warning that
   estimates are current, not historical.
6. Every A/R report states its office attribution (section 26) and whether credit balances are netted.

---

## 22. Insurance estimate vs actual

| Stage | What exists | Report use |
|---|---|---|
| At charge | Estimated insurance portion and patient portion from plan rules | Time-of-service collection target; A/R split (estimate) |
| At claim creation | Frozen estimate (Open Dental Claim Snapshot: write-off, fee, expected payment) | Write-off estimate dating; insurance ageing |
| At EOB | Actual payment, actual write-off, deductible applied, amount transferred to the patient (Denticon "AUTO - Xfer Ins Amt To Patient") | Actual net production; estimate accuracy |
| After EOB | Supplemental payments, recoupments, refunds to the insurer | Insurance collection adjustments |

Reports that depend on keeping both numbers: estimate accuracy by carrier / plan / procedure category (estimate vs paid); write-off
variance (Open Dental "Write-off Adj"); claims paid differently from expected; unfinalised insurance payments; procedures not billed
to insurance; overpaid claims and procedures — all of which exist as standard Open Dental reports `[OD-STD]` `[OD-PI]`. (L) In-app
insurance payments are stored in a table that no balance, collections or A/R code reads `[L-FIN]`; until that is unified, insurance
collections and write-offs cannot be reported correctly.

---

## 23. Capitation (DHMO / managed care)

| Topic | Evidence | Source |
|---|---|---|
| Definition | Dentists contract to provide covered services "in return for payment on a per-capita basis" | `[ADA-GLOSS]` |
| Patient charge | "Patients pay a flat fee for some procedures and no fee for other procedures"; a co-pay fee schedule holds the patient amounts | `[OD-CAP]` |
| Write-off | The internal claim procedure with status "CapComplete" holds the write-off; production counts capitation work as "Procedure Fee - Capitation Write-offs", i.e. usually the co-pay or zero | `[OD-CAP]` `[OD-PI]` |
| Carrier's monthly payment | Not entered on claims. Open Dental offers three conventions: a patient payment on a dummy patient named for the carrier, a "capitation payment" procedure (which affects production), or insurance payments | `[OD-CAP]` |
| Denticon | Transactions > "Capitation Payment", posted to a ledger named "Account, Capitation"; the payment code has Class = "Capitation Payment" | `[DN-CAPCHK]` `[DN-CAPCC]` |
| Utilization | Open Dental Capitation Utilization report: per procedure, "UCR Fee" and "Co-Pay", by procedure completed date. Denticon month-end: "Capitation Utilization - Detail" for managed-care offices | `[OD-RCAP]` `[DN-EOM]` |

Reporting rules (*Recommended*): show capitation work at office-fee value in a separate "capitation value of services" measure and keep
it out of collectable net production; treat the monthly capitation payment as collections with tender class `capitation` that is not
tied to procedures; plan profitability = (capitation payments + co-pays collected) ÷ office-fee value of services; for provider
compensation, the practice chooses how to spread capitation revenue (by utilization value or by members assigned) — record the choice.

---

## 24. Payment plans and orthodontic contracts

### 24.1 Mechanics in the reference systems

| System | Arrangement | Behaviour | Source |
|---|---|---|---|
| Dentrix | Payment agreement | "Payment agreements can be used when treatment has been completed"; "Dentrix allows one payment agreement per account" | `[DX-FA]` `[DX-PAG]` |
| Dentrix | Future due payment plan | "Future due payment plans can be used when treatment will be completed over time"; used "to charge accounts monthly for work in progress, such as orthodontics"; set per patient | `[DX-FA]` `[DX-FD]` |
| Denticon | Regular payment plan | Designed from the patient's ledger balance or a treatment plan; number of payments and periodic amount are computed from each other; periodic charges are posted with Utilities > "Generate Regular Payment Plan Charges" (or automatically — "Auto Posting is configured at the organization (account) level") | `[DN-RPPDESIGN]` `[DN-RPP]` |
| Denticon | Contract codes | "Balance Moved To Contract" (`ACMVD`) and "Periodic Contract Billing" (`ACBIL`) work only inside a contract; they were disabled for manual entry because using them outside a contract broke ledger allocation | `[DN-CONTRACTCODES]` |
| Denticon | Ortho contracts | End-of-day routine generates ortho, regular and by-practice contract charges; reports: Patients on Ortho Payment Plan, Ortho Compliance Report (active contract, no future appointment), time in treatment | `[DEN]` §11.1; `[DN-ORTHO]` |
| Open Dental | Dynamic payment plan | Attach completed procedures, treatment-planned procedures and adjustments; "Production items can only be attached to a single Payment Plan"; charges issued on a schedule by a daily service; treatment-planned work either waits ("Await procedure completion") or is scheduled now; whether plan items "affect balances and aging" depends on the "PayPlan charge logic" preference | `[OD-PP]` |
| Open Dental | Report | Principal, accumulated interest, paid, balance, "Due Now", "Bal Not Due"; insurance payment plans flagged | `[OD-RPP]` |

### 24.2 Two recognition patterns

| | A. Charge at start | B. Periodic charges |
|---|---|---|
| Production | Full contract fee on the start (banding) date | Initial fee at start, then one charge per period as the utility posts it |
| Ledger A/R | Whole unpaid contract sits in A/R; needs a "not yet due" column | Only billed instalments; the remaining contract balance is off-ledger |
| Ageing | Distorted unless scheduled amounts are excluded | Clean, but total receivable is understated |
| Collection % | Low at start, over 100% later | Stable |
| Risk | Overstated production if the case is abandoned | If the periodic utility is not run, production and A/R are silently understated |
| Reference | Not documented in the sources read | Dentrix future-due plans; Denticon periodic contract charges |

How either pattern maps to accrual revenue recognition for an orthodontic contract is an accounting-policy question for the tenant's
CPA; no accounting-standard source was read **[unverified]**. How Denticon classifies `ACMVD` / `ACBIL` (production or collection side)
was not found **[unverified]**.

### 24.3 *Recommended* reporting

- A contract register: contract total, initial fee, term, periodic amount, insurance vs patient share, billed to date, remaining to
  bill, paid, instalments past due, next charge date, status.
- "Scheduled receivables" (not yet due) reported beside, never inside, aged A/R.
- A tenant-level `contract_recognition` setting (`at_start` or `periodic`) with both views computable so that ortho production can be
  compared across tenants.
- Exception report: "periodic charges due but not posted" — the Denticon end-of-day checklist exists because this is a manual step.
- Ortho KPIs (starts, average contract amount, delinquency) are defined in `[KPI]` §3.11; they need the contract register, not the ledger.

---

## 25. Refunds, NSF, reversals and transfers

| Event | Reference handling | Canonical treatment (*Recommended*) | Source |
|---|---|---|---|
| Patient refund | Dentrix: a charge (debit) adjustment; Denticon: "Refund Patient" adjustment (codes `AR001` and following) | `refund_patient`, collection side, linked to the payment(s) refunded; reduces net collections on its posting date; reverses the provider allocations it came from | `[DX-PA-P]` `[DN-AUTO]` (L) |
| Card refund / void | Denticon `AR002`, `AR005`; Open Dental income reports list processor activity | Same, with the processor reference for batch reconciliation | (L) `[OD-DPAY]` |
| Insurance refund / recoupment | Denticon: delete the payment if the period is open; otherwise post a positive collection adjustment "under the same provider and location the services were recorded under" | `insurance_recoupment`, linked to the claim and original payment | `[DN-INSREF]` |
| Returned check (NSF) | Denticon: record the returned check plus the bank fee as "Fee – NSF Bank Fee", ideally under the office's billing provider; re-enter the payment when the patient pays again | `payment_reversal` (collection side, reverses the original allocations) + `nsf_fee` (production side, non-clinical provider) | `[DN-NSF]` |
| Payment posted to the wrong account or provider | Denticon: paired transfer adjustments `AR010` (Transfer From) / `AI010` (Transfer To); charges `AC010` / `AD010` | `transfer` pair, net zero, excluded from totals, visible in attribution and audit reports | `[DN-XFER]` `[DN-WRONGPROV]` |
| Income moved between providers / clinics | Open Dental income transfer: a zero-total payment whose splits "do not increase or decrease the total practice income" | Same | `[OD-XFER]` |
| Error in a closed period | Dentrix: offsetting adjustment + re-post; Denticon: void + production adjustment + re-entry | Reversal + replacement in the open period (section 17.4) | `[DX-HIST]` `[DN-CLOSED]` |

(L) Refunds are recorded in two places today (`patient_refunds`, and adjustment rows with codes `AR001` and following) `[L-FIN]`;
reports must union them until the model is unified.

---

## 26. Multi-office attribution

| Attribution | Meaning | Used for | Evidence |
|---|---|---|---|
| Office of service (transaction office) | Where the procedure was performed and charged | Production, provider productivity, capacity | Transactions are "recorded in the office in which they are incurred" `[DN-MLPAY]`; Open Dental assigns production to the procedure's clinic `[OD-PI]` |
| Payment-entry office | Where the payment was keyed (often a central billing office) | Cash handling, deposits, user productivity | "The payment itself will be recorded to the current office"; "Bulk checks, as such, cannot be entered across multiple offices" `[DN-MLPAY]` |
| Allocation office | The office of the charge a payment pays | Collections by office for P&L and compensation | Allocation follows the "location where the procedure was originally charged"; unallocated credits stay with the entry office until treatment is completed `[DN-IA]` |
| Home office (of the responsible party) | The account's owning office | A/R, statements, collections work | "Aging by Home Office" assigns each balance to the responsible party's home office wherever the transactions were recorded `[DN-MLA]` |
| Appointment office | Where the patient is scheduled | Huddle views | `[KPI]` §2.3 |

Why it matters: a 100 charge at location A paid at location B shows 100 due at A and a 100 credit at B on single-location reports,
and zero on the home-office report `[DN-MLA]` `[DN-ZERO]`. "Account A/R" can overstate an office when a dependent's home office differs
from the responsible party's `[DN-ARPT]`. Denticon's advice for provider income is to run the allocation report for all offices and
review the grand totals for providers who work in several `[DN-IAD]`.

*Recommended*: every money row carries `service_office_id` (charges), `posting_office_id` (who keyed it) and resolves `home_office_id`
through the account; each report definition declares one attribution and prints it; enterprise roll-ups sum by allocation office for
collections and by service office for production, so inter-office artefacts cancel; a "cross-office activity" report lists payments
keyed in one office for charges in another. (L) Columns exist for office (`office_id`, `created_office_id` on payments) and
`accounts.home_office_id` `[L-FIN]`; this matches the project rule that the office is a working context, not a fence.

---

## 27. Month-end and year-end close, and audit-trail reports

### 27.1 Close procedures

| Step | Denticon | Dentrix | Open Dental | Eaglesoft | CPA close |
|---|---|---|---|---|---|
| Lock transactions | Close Out to the last day of the prior month; optional "Close All Offices" `[DN-EOM]` `[DN-CO1]` | Close Month (not the current month) `[DX-ME]` | Global lock date `[OD-LOCK]` | EOD / EOM / EOY processing `[ES-RPT]` | "Make sure there are no post-period adjustments beyond this period" `[CLA-15]` |
| Statements | Print, e-mail, then "Update Stmt Dates" last `[DN-EOM]` | — | Billing list | — | — |
| Point-in-time reports | "Aging-Detail" or "Aging by Home Office", "Outstanding Claims", recall, "Treatment Plan Status Report – Detail", "Deposit Slip-Credit Card", "Capitation Utilization - Detail" `[DN-EOM]` | Practice Analysis totals depend on the close `[DX-PA]` | Aging, production and income | Date-specific reports that "cannot be run at a later date" `[ES-RPT]` | "Pull month-end reports for the prior period"; review A/R ageing `[CLA-15]` |
| Benefits | Reset insurance benefits for plans whose anniversary is not 1 January `[DN-EOM]` | "Reset Insurance Benefits" `[DX-ME]` | — | — | — |
| Charges | Generate contract / payment-plan charges; finance and late charges `[DEN]` | Finance and late charges at month end `[DX-PA-P]` | Repeating charges, finance charges `[OD-AGE]` | — | "Record key accruals" `[CLA-15]` |
| Reconciliation | Deposit slips to bank | Deposit slip | Deposits | Deposit reports | "Complete bank, merchant, and payroll reconciliations"; "Confirm revenue ties to practice collection reporting" `[CLA-15]` |
| Year end | "Executive Summary" for the year; benefit reset; fee-schedule update `[DN-EOM]` `[DEN]` §11.2 | Year-end totals | Accounting lock date; "There is no closeout process for accounting transactions in Open Dental" `[OD-CLOSE]` | EOY | Leadership review of P&L, cash and A/R `[CLA-15]` |

### 27.2 Audit-trail reports in the reference systems

| Report | Shows | Source |
|---|---|---|
| Dentrix Audit Trail | "all transaction entries that have been changed or deleted", plus Family File changes (name, SSN, providers, chart number, billing type); filters by date, provider / staff and audit category | `[DX-AUD]` |
| Dentrix Day Sheet and Audit Trail numbering | Both reports carry a sequential audit number that increases with each run | `[DX-5]` |
| Dentrix Adjustment Summary | Adjustments by category or by patient: "If your cash flow is not as it should be, the Adjustment Summary Report is one of the first places I would look" | `[DX-5]` |
| Eaglesoft "Deleted Transactions" | Part of the suggested daily review set, next to deposit and adjustment reconciliation reports | `[ES-RPT]` |
| Denticon Audit Trail | Edit, Delete, Close out, Reschedule Appointment, Cut / Copy-Paste Appointment across Patient, Setup, Transactions and Treatment Plan; unclosed statements appear there too | `[DN-AUD]` `[DN-UNCLOSE]` |
| Denticon Special Transaction | Procedure, payment and adjustment codes by transaction date or service date, grouped by code, user name, insurance plan or transaction provider | `[DN-STX]` |
| Denticon Daily Audit | Visit completeness: "Patient Has" appointment / ledger transaction / progress note "But Missing" one of the others; "A successful Daily Audit is when no records appear" | `[DN-DAUD]` |
| Denticon Daily Journal by User; User Activity | Transactions by posting user; login activity | `[DEN]` §11.1 |
| Open Dental Audit Trail | Actions by permission, user, computer and patient, with integrity check | `[OD-AUDIT]` |

### 27.3 Control expectations and exception reports

Guidance from a certified fraud examiner writing for Dentrix users: review the audit trail monthly for red flags; "Whoever balances
the daily deposit should not be the person to take the deposit to the bank"; "reconcile bank and credit card statements monthly";
"Periodically hire an outside accountant or examiner to drop in with little or no notice to inspect the books"; mandatory vacation
for anyone with control over finances `[DX-FRAUD]` `[DX-5]`.

*Recommended* exception reports (each is a filter over the transaction audit, the posting date and the close):

| Report | Rule |
|---|---|
| Deleted and voided transactions | Any void or delete, with user, reason, original values and whether the row was on a deposit or a claim |
| Changed transactions | Before / after values for amount, date, provider, patient, code, payer |
| Back-dated entries | `posting_date` − `service_date` (or business date) above N days; future-dated entries |
| Post-close corrections | Reversal / replacement pairs that touch a closed period |
| Adjustments by user and class | Totals and counts by class, user, provider; discounts on insured procedures; write-offs without a claim |
| Refunds and reversals by user | Including refunds to a tender different from the original |
| Payments edited after deposit | Any change to a payment on a `deposited` or `reconciled` deposit |
| Unallocated and re-allocated money | Unallocated balance by age; re-allocation events |
| Provider or patient changed on a posted charge | Attribution changes |
| Fee overrides | Charged fee different from the schedule |
| Visit completeness | Appointment without charge, charge without note, unsigned note (the Daily Audit) |
| Statement and close events | Close, unclose, statement lock changes |

These belong to the `user_activity` data class (section 3.3). (L) Charge writes are not audited today and voids carry no timestamp,
user or reason `[L-FIN]`; the exception reports depend on fixing that first.

---

## 28. Canonical definitions recommended for the module

| Term | Canonical definition | Date basis | Attribution | Configurable |
|---|---|---|---|---|
| Gross production | Σ office (full) fee × quantity of completed procedures | Service date (analytics); posting date (financial close) | Treating provider; office of service | Hygiene policy (19.2); contract recognition (24.2) |
| Contractual write-off | Implied (full fee − charged fee) + explicit `contractual_writeoff` / `capitation_writeoff` | Estimate at claim date + adjustment at payment date; alternatives by payment date or service date | As the procedure | Write-off timing |
| Net production | Gross production − contractual write-offs ± other production-side adjustments; shown before and after `bad_debt` | As above | As the procedure | Class mapping (versioned) |
| Gross collections | Σ payments by tender class, prepayments included, transfers excluded | Posting date; deposit date for the cash pack | Payment-entry office (cash handling); allocation office and provider (income) | — |
| Net collections | Gross collections − refunds − payment reversals − recoupments | Posting date | As allocations | — |
| Provider income | Σ allocations to the provider's procedures, net of reversed allocations; "Unallocated" shown separately | Allocation date | Provider of the paid procedure | Allocation method |
| Collection % | Net collections ÷ net production, same window; rolling 3 and 12 months beside the month | Per component | Same scope both sides | Window |
| Total A/R | Σ open debit balances; credit balances reported separately; net A/R = difference | As-of | Home office (default) or office of service | Attribution |
| Aged A/R | Open amount per charge by age from service date | As-of | As total A/R | Bucket preset; patient-responsibility basis |
| Insurance A/R | Outstanding insurance estimates on unpaid claims | As-of; claim ageing from date sent | Billing provider / payer | — |
| Days in A/R | Net A/R ÷ (trailing-90-day net production ÷ 90) | As-of | — | Collections-based variant |
| Unearned / unapplied | Payments not allocated to completed production, by type | As-of | "Unallocated" | Types |
| Day sheet | All transactions with `posting_date` = D, by class and tender, with opening and closing A/R | Posting date only | Posting office | — |
| Deposit | Payments grouped for one bank transaction | Deposit date | Posting office / bank account | — |

Every money report prints: date basis, write-off timing, attribution, class-mapping version, whether the period is closed (snapshot)
or open (live), and the data-as-of time.

---

## 29. Reconciliation invariants and requirements

### 29.1 Invariants the engine must satisfy (automated tests)

1. Σ day sheets (posting basis) over a period = the period's production, adjustment and collection totals on the posting basis.
2. Roll-forward: closing A/R = opening A/R + charges + debit adjustments − credit adjustments − payments, for every office and for the
   organisation.
3. Aged A/R total (credits excluded) − credit balances = net A/R = the roll-forward's closing A/R.
4. Σ provider totals + "Unallocated" = practice total, for production, adjustments and income.
5. Σ office totals = organisation total for each attribution; transfers net to zero inside the organisation.
6. Σ deposits + undeposited funds = collections for the same posting dates; each payment is on at most one deposit.
7. Posting-basis total − service-basis total for a period = the bridge report's net amount.
8. For every charge: insurance estimate + write-off estimate + patient portion = charged fee (while unpaid); payments + adjustments +
   open amount = charged fee (always).
9. A closed period's snapshot equals a recomputation that ignores rows posted after the close.
10. Sign and class come only from the versioned type mapping; no report branches on a type's name.

### 29.2 Financial-semantics requirements checklist

| Id | Requirement | Depends on |
|---|---|---|
| FS-01 | One normalised transaction view with class, side, sign, `service_date`, `posted_at`, provider, offices, account, void / reversal links | (L) no ledger table today |
| FS-02 | Server-side adjustment and payment type catalog with class, side, sign and tender class; legacy codes seeded; versioned | §14, §15 |
| FS-03 | Full fee and charged fee on every charge; claim-time estimate snapshot | §13 |
| FS-04 | Immutable posting timestamp distinct from business dates; office-local posting date | §17 |
| FS-05 | Period close per office with lock, reversal-only corrections and close snapshots | §17, §27 |
| FS-06 | Deposit entity and reconciliation status | §18 |
| FS-07 | Persistent, dated allocations for payments and adjustments; "Unallocated" bucket; re-allocation audit | §19 |
| FS-08 | Named bases on every money report (date basis, write-off timing, attribution) printed on the output | §12, §28 |
| FS-09 | Ageing presets, credit-balance separation, scheduled-receivable separation, as-of from snapshots | §21 |
| FS-10 | Unearned / credit-balance typing and ageing | §20 |
| FS-11 | Capitation measures and tender | §23 |
| FS-12 | Contract register and recognition setting; periodic-charge exception report | §24 |
| FS-13 | Office attributions on every row; declared attribution per report | §26 |
| FS-14 | Transaction audit (changed, deleted, voided, back-dated) feeding the exception reports | §27 |
| FS-15 | Hygiene attribution policy and treating / billing provider separation | §19 |
| FS-16 | Invariant test suite (29.1) run on every definition or mapping change | §29.1 |

---

## 30. Gaps, conflicts and unverified items

### 30.1 Not verified in this session

| Item | Why | Effect |
|---|---|---|
| HHS guidance pages (minimum necessary, de-identification, breach "unsecured PHI" guidance, cloud computing, e-mail FAQ, business associates) | `hhs.gov` returns HTTP 403 | Statements here rest on regulation and Federal Register text; HHS's own interpretive detail (for example whether a business associate may use de-identified data for its own purposes) is **[unverified]** |
| November 2026 Privacy Rule final rule | Known only through the ADA guide, whose dates are "calculated from the prepublication schedule" | Confirm the Federal Register citation, effective and compliance dates, and read the text for anything affecting vendors |
| ASTM E2147-18 audit-log content | HTTP 403 | Field list in section 5.3 is built from the ONC wording and NIST sample questions |
| AICPA Trust Services Criteria wording | PDF behind a download page | Section 10 ids and wording are recalled |
| PCI DSS display / masking rule | Not read | One-line mentions only |
| State privacy, breach, record-retention and unclaimed-property laws | Not researched | Could be stricter than HIPAA; tenant-specific |
| OpenAI eligible-endpoint list; Microsoft healthcare terms; Amazon Bedrock data-retention page | Not read | Section 9.2 rows are partial |
| Orthodontic contract revenue recognition; accrual-basis mapping for DSOs | No accounting-standard or dental-CPA source could be located without search | Section 16 and 24.2 describe mechanics, not accounting policy |
| Dental-specific A/R targets (for example A/R as a multiple of monthly production) | Not sourced here | Use `[KPI]` benchmarks |
| Federal Register page numbers | Computed from extracted PDF text | Treat as ±1 page |
| Denticon screens that exist only as screenshots (Executive Summary column definitions, Close Out screen, contract design, Audit Trail report filters); classification of `ACMVD` / `ACBIL`; how ortho contract charges recognise production | Screenshots are not readable through the article API | Verify against the reference PDFs / the live legacy tool |
| Dentrix payment-agreement mechanics, finance-charge rules, what month-end does to ageing | Overview pages only | Low impact |
| All `(L)` statements | Taken from the repository's analysis documents | Re-check against code before relying on them |

### 30.2 Conflicts between sources (decide explicitly)

| Topic | Positions |
|---|---|
| Ageing buckets | Denticon 0-29 / 30-59 / 60-89 / 90-119 / 120+ `[DN-AGE]` vs Dentrix and Open Dental 0-30 / 31-60 / 61-90 / over 90 `[DX-PA-R]` `[OD-RAGE]` vs HFMA with 91-120 and >120 `[HFMA-MAP]` |
| Side of bad debt | Production-side codes in the Denticon catalogue (L) vs excluded from provider production adjustments in Open Dental `[OD-PAYROLL]` vs an income-statement deduction in HFMA `[HFMA-MAP]` |
| Who classifies adjustments | Fixed on the code (Denticon, Open Dental) vs selectable per report (Dentrix) `[DX-PAR]` |
| Write-off timing | Three supported timings in Open Dental `[OD-WO]`; implicit in the charged fee in the migrated Denticon data (L) |
| Default payment allocation | FIFO (Denticon) vs Guarantor Estimate (Dentrix default) vs explicit or oldest-first (Open Dental) |
| Period lock reversibility | Irreversible (Denticon) vs admin-bypassable lock date (Open Dental) vs history with adjustment-only correction (Dentrix) |
| Office attribution of A/R | Home office vs single location vs "Account A/R" / "Patient A/R" in one product `[DN-MLA]` `[DN-ARPT]` |
| Anthropic BAA enablement for the API | The privacy-center article describes signing a BAA and contacting sales `[ANT-BAA]`; the API documentation describes self-serve enablement in the Console for eligible organisations `[ANT-RET]` |
| "Days in A/R" | Balance-based formula (HFMA, dental analytics) vs claim submission-to-payment days in Planet DDS industry reports `[KPI]` |

---

## Sources

All pages were read on 2026-11-22 unless marked. "Not retrievable" means the fetch failed and the page was **not** read.

### Regulations and statutes (Cornell Legal Information Institute)

- `[R-103]` 45 CFR 160.103, Definitions (business associate, subcontractor, workforce) — https://www.law.cornell.edu/cfr/text/45/160.103
- `[R-306]` 45 CFR 164.306, Security standards: general rules — https://www.law.cornell.edu/cfr/text/45/164.306
- `[R-308]` 45 CFR 164.308, Administrative safeguards — https://www.law.cornell.edu/cfr/text/45/164.308
- `[R-310]` 45 CFR 164.310, Physical safeguards — https://www.law.cornell.edu/cfr/text/45/164.310
- `[R-312]` 45 CFR 164.312, Technical safeguards — https://www.law.cornell.edu/cfr/text/45/164.312
- `[R-316]` 45 CFR 164.316, Policies and procedures and documentation requirements — https://www.law.cornell.edu/cfr/text/45/164.316
- `[R-402]` 45 CFR 164.402, Breach notification definitions — https://www.law.cornell.edu/cfr/text/45/164.402
- `[R-410]` 45 CFR 164.410, Notification by a business associate — https://www.law.cornell.edu/cfr/text/45/164.410
- `[R-501]` 45 CFR 164.501, Definitions (data aggregation, health care operations, designated record set) — https://www.law.cornell.edu/cfr/text/45/164.501
- `[R-502]` 45 CFR 164.502, Uses and disclosures: general rules — https://www.law.cornell.edu/cfr/text/45/164.502
- `[R-504]` 45 CFR 164.504, Organizational requirements (business associate contracts) — https://www.law.cornell.edu/cfr/text/45/164.504
- `[R-514]` 45 CFR 164.514, De-identification, minimum necessary, limited data set — https://www.law.cornell.edu/cfr/text/45/164.514
- `[R-528]` 45 CFR 164.528, Accounting of disclosures — https://www.law.cornell.edu/cfr/text/45/164.528
- `[R-530]` 45 CFR 164.530, Administrative requirements (documentation retention) — https://www.law.cornell.edu/cfr/text/45/164.530
- `[R-170]` 45 CFR 170.210, Standards for health information technology (audit log content) — https://www.law.cornell.edu/cfr/text/45/170.210
- `[U-17935]` 42 U.S.C. 17935 (HITECH § 13405: minimum necessary, accounting, sale of PHI) — https://www.law.cornell.edu/uscode/text/42/17935
- `[U-1320]` 42 U.S.C. 1320a-7k(d), Reporting and returning of overpayments — https://www.law.cornell.edu/uscode/text/42/1320a-7k

### Federal Register (govinfo)

- `[FR-2025]` HHS, HIPAA Security Rule To Strengthen the Cybersecurity of Electronic Protected Health Information, proposed rule, 90 FR 898 (2025-01-06) — https://www.govinfo.gov/content/pkg/FR-2025-01-06/pdf/2024-30983.pdf (HTML: https://www.govinfo.gov/content/pkg/FR-2025-01-06/html/2024-30983.htm)
- `[FR-2013]` HHS, Modifications to the HIPAA Privacy, Security, Enforcement, and Breach Notification Rules (Omnibus Rule), 78 FR 5566 (2013-01-25) — https://www.govinfo.gov/content/pkg/FR-2013-01-25/pdf/2013-01073.pdf
- `[FR-2011]` HHS, HIPAA Privacy Rule Accounting of Disclosures Under the HITECH Act, proposed rule, 76 FR 31426 (2011-05-31) — https://www.govinfo.gov/content/pkg/FR-2011-05-31/pdf/2011-13297.pdf
- `[FR-2018]` HHS, Request for Information on Modifying HIPAA Rules To Improve Coordinated Care, 83 FR 64302 (2018-12-14) — https://www.govinfo.gov/content/pkg/FR-2018-12-14/pdf/2018-27162.pdf

### Government and standards guidance

- `[NIST-66]` NIST SP 800-66r2, Implementing the HIPAA Security Rule: A Cybersecurity Resource Guide (February 2024), §5.3.2 and Table 22 — https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-66r2.pdf
- `[ONC-D2]` ONC, § 170.315(d)(2) Auditable events and tamper-resistance — https://www.healthit.gov/test-method/auditable-events-and-tamper-resistance
- `[ONC-D3]` ONC, § 170.315(d)(3) Audit report(s) — https://www.healthit.gov/test-method/audit-reports
- `[CMS-CELL]` ResDAC, CMS Cell Size Suppression Policy (version 2024-01-26) — https://resdac.org/articles/cms-cell-size-suppression-policy
- `[IRS-538]` IRS Publication 538, Accounting Periods and Methods (rev. January 2022) — https://www.irs.gov/publications/p538
- `[AICPA-TSC]` AICPA, 2017 Trust Services Criteria (With Revised Points of Focus – 2022), landing page only — https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022
- `[X12-CAGC]` X12, Claim Adjustment Group Codes — https://x12.org/codes/claim-adjustment-group-codes
- Not retrievable (HTTP 403): HHS minimum necessary — https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/minimum-necessary-requirement/index.html ; HHS de-identification — https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html ; HHS guidance to render unsecured PHI unusable — https://www.hhs.gov/hipaa/for-professionals/breach-notification/guidance/index.html ; HHS cloud computing — https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html ; HHS e-mail FAQ — https://www.hhs.gov/hipaa/for-professionals/faq/2006/does-the-security-rule-allow-for-sending-electronic-phi-in-an-email/index.html ; ASTM E2147-18 — https://www.astm.org/e2147-18.html

### Legal and professional commentary

- `[DWT-26]` Davis Wright Tremaine, HHS Updates Rulemaking Timeframes (2026-07-08) — https://www.dwt.com/blogs/privacy--security-law-blog/2026/07/hhs-updates-hipaa-rulemaking-timeframes
- `[ADA-PRIV26]` ADA, HIPAA Privacy Rule Update: What Dental Practices Should Know (updated 2026-11-19) — https://www.ada.org/-/media/project/ada-organization/ada/ada-org/files/resources/practice/legal-and-regulatory/privacy_rule_update_2026.pdf
- `[ADA-HIPAA]` ADA, HIPAA resources — https://www.ada.org/resources/practice/legal-and-regulatory/hipaa
- `[ADA-RET]` ADA, Record retention — https://www.ada.org/resources/practice/practice-management/record-retention
- `[ADA-MS]` ADA, Measuring Success — https://www.ada.org/resources/practice/practice-management/measuring-success20160428t155202
- `[ADA-GLOSS]` ADA, Glossary of Dental Administrative Terms — https://www.ada.org/publications/cdt/glossary-of-dental-administrative-terms
- `[ADA-CLAIM]` ADA Dental Claim Form Completion Instructions, version 2024 — https://www.ada.org/-/media/project/ada-organization/ada/ada-org/files/publications/cdt/2024_completioninstructions_adaclaimform_2024.pdf (index: https://www.ada.org/publications/cdt/ada-dental-claim-form)
- `[ADA-ETH]` ADA Principles of Ethics and Code of Professional Conduct, Section 5 Veracity (5.B Representation of Fees) — https://www.ada.org/about/principles/code-of-ethics/veracity
- `[CLA-15]` CLA (CliftonLarsonAllen), Stop Running Your Dental Practice by Bank Balance: Try a 15-Day Close (2026-11-17) — https://www.claconnect.com/en/resources/articles/26/dental-practice-15-day-close
- `[HFMA-MAP]` HFMA, MAP Keys (revenue-cycle KPI definitions) — https://www.hfma.org/data-and-insights/map-initiative/map-keys/

### LLM and cloud vendors

- `[ANT-RET]` Claude API documentation, API and data retention — https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
- `[ANT-BAA]` Anthropic Privacy Center, Business Associate Agreements (BAA) for Commercial Customers — https://privacy.claude.com/en/articles/8114513-business-associate-agreements-baa-for-commercial-customers
- `[OAI-BAA]` OpenAI Help Center, Getting a Business Associate Agreement for the OpenAI API — https://help.openai.com/en/articles/8660679-are-openai-s-services-hipaa-eligible
- `[AZ-PRIV]` Microsoft Learn, Data, privacy, and security for Foundry Models sold by Azure (change log 2026-11-17) — https://learn.microsoft.com/en-us/azure/ai-foundry/responsible-ai/openai/data-privacy
- `[AWS-BR]` Amazon Bedrock User Guide, Data protection — https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html
- `[AWS-HIPAA]` AWS, HIPAA Eligible Services Reference (updated 2026-11-16) — https://aws.amazon.com/compliance/hipaa-eligible-services-reference/
- `[GCP-HIPAA]` Google Cloud, HIPAA compliance and covered products (list updated 2026-11-11) — https://docs.cloud.google.com/docs/security/compliance/hipaa
- `[GCP-GOV]` Google Cloud, generative AI data governance — https://docs.cloud.google.com/vertex-ai/generative-ai/docs/data-governance
- `[GCS-SIGN]` Cloud Storage, Signed URLs — https://docs.cloud.google.com/storage/docs/access-control/signed-urls
- `[GCS-ENC]` Cloud Storage, default encryption at rest — https://docs.cloud.google.com/storage/docs/encryption/default-keys
- `[GCS-LIFE]` Cloud Storage, Object Lifecycle Management — https://docs.cloud.google.com/storage/docs/lifecycle

### Open Dental manual (base https://www.opendental.com/manual/)

- `[OD-STD]` Standard Reports — https://www.opendental.com/manual/reportsstandard.html
- `[OD-PI]` Production and Income Report — https://www.opendental.com/manual/reportprodinc.html
- `[OD-WO]` Show Insurance Write-offs — https://www.opendental.com/manual/writeoffstoproduction.html
- `[OD-SNAP]` Claim Snapshot — https://www.opendental.com/manual/claimsnapshot.html
- `[OD-DWO]` Daily Write-off Report — https://www.opendental.com/manual/reportdailywriteoffs.html
- `[OD-DPAY]` Daily Payments Report — https://www.opendental.com/manual/reportdailypayments.html
- `[OD-DADJ]` Daily Adjustments Report — https://www.opendental.com/manual/reportdailyadj.html
- `[OD-PAYROLL]` Provider Payroll Summary / Detail — https://www.opendental.com/manual/reportprovpayroll.html
- `[OD-RB]` Receivables Breakdown Report — https://www.opendental.com/manual/reportreceivablesbreakdown.html
- `[OD-AGE]` Aging — https://www.opendental.com/manual/aging.html
- `[OD-RAGE]` Aging of Accounts Receivable (A/R) Report — https://www.opendental.com/manual/reportaging.html
- `[OD-INSAGE]` Insurance Aging Report — https://www.opendental.com/manual/reportinsaging.html
- `[OD-OUTINS]` Outstanding Insurance Claims Report — https://www.opendental.com/manual/reportoutins.html
- `[OD-ADJ]` Adjustments — https://www.opendental.com/manual/adjustments.html
- `[OD-ADJT]` Definitions: Adj Types — https://www.opendental.com/manual/definitionsadjtypes.html
- `[OD-SPLIT]` Paysplit — https://www.opendental.com/manual/paysplit.html
- `[OD-ALLOC]` Allocations Setup — https://www.opendental.com/manual/allocationssetup.html
- `[OD-XFER]` Income Transfer — https://www.opendental.com/manual/incometransfer.html
- `[OD-UNEARN]` Unearned Income / Prepayment — https://www.opendental.com/manual/unearnedprepayment.html
- `[OD-UNR]` Unearned Income Reports — https://www.opendental.com/manual/reportunearnedincome.html
- `[OD-DEP]` Deposit Slip — https://www.opendental.com/manual/depositslip.html
- `[OD-LOCK]` Security Lock Dates — https://www.opendental.com/manual/securitylockdates.html
- `[OD-PERM]` Permissions — https://www.opendental.com/manual/permissions.html
- `[OD-RSEC]` Report Setup: Security Permissions — https://www.opendental.com/manual/reportsecurity.html
- `[OD-AUDIT]` Audit Trail — https://www.opendental.com/manual/audittrail.html
- `[OD-CAP]` Capitation Insurance Plans — https://www.opendental.com/manual/plancapitation.html
- `[OD-RCAP]` Capitation Utilization Report — https://www.opendental.com/manual/reportcapitation.html
- `[OD-PP]` Payment Plans (dynamic) — https://www.opendental.com/manual/paymentplandynamic.html
- `[OD-RPP]` Payment Plans Report — https://www.opendental.com/manual/reportpaymentplan.html
- `[OD-CODE]` Procedure Code Edit — https://www.opendental.com/manual/procedurecodeedit.html
- `[OD-CLAIM]` Claim Edit — https://www.opendental.com/manual/claimedit.html
- `[OD-CLOSE]` Accounting Close Year — https://www.opendental.com/manual/accountingcloseyear.html

### Dentrix help and magazine (help base https://hsps.pro/Dentrix/Help/mergedProjects/)

- `[DX-DAY]` Day Sheet — https://hsps.pro/Dentrix/Help/mergedProjects/Office%20Manager/Office_Manager_Reports/Management_Reports/Day_Sheet.htm
- `[DX-PAR]` Provider A/R Totals Report — https://hsps.pro/Dentrix/Help/mergedProjects/Office%20Manager/Office_Manager_Reports/Management_Reports/Provider_A_R_Totals_Report.htm
- `[DX-AGE]` Aging Report — https://hsps.pro/Dentrix/Help/mergedProjects/Office%20Manager/Office_Manager_Reports/Ledger_Reports/Aging_Report.htm
- `[DX-AUD]` Printing the Standard Audit Trail Report — https://hsps.pro/Dentrix/Help/mergedProjects/Office%20Manager/Audit_Trail_Reports/Printing_the_Standard_Audit_Trail_Report.htm
- `[DX-BATCH]` Batch Processor overview — https://hsps.pro/Dentrix/Help/mergedProjects/Office%20Manager/The_Batch_Processor/Batch_Processor_overview.htm
- `[DX-PA]` Practice Analysis overview — https://hsps.pro/Dentrix/Help/mergedProjects/Office%20Manager/Practice_Analysis/Practice_Analysis_overview.htm
- `[DX-PA-P]` Production analysis — https://hsps.pro/Dentrix/Help/mergedProjects/Office%20Manager/Practice_Analysis/Production_analysis.htm
- `[DX-PA-R]` Receivables analysis — https://hsps.pro/Dentrix/Help/mergedProjects/Office%20Manager/Practice_Analysis/Receivables_analysis.htm
- `[DX-ME]` Running month end — https://hsps.pro/Dentrix/Help/mergedProjects/Ledger/Running%20Month%20End/Running_month_end.htm
- `[DX-HIST]` Editing transactions in history — https://hsps.pro/Dentrix/Help/mergedProjects/Ledger/Editing%20Transactions/Editing_transactions_in_history.htm
- `[DX-INV]` Invalidating a procedure in history — https://hsps.pro/Dentrix/Help/mergedProjects/Ledger/Editing%20Transactions/Invalidating_a_procedure_in_history.htm
- `[DX-SPLIT]` Splitting payments — https://hsps.pro/Dentrix/Help/mergedProjects/Ledger/Entering%20Transactions/Splitting_payments.htm
- `[DX-ADJ]` Credit and charge adjustments — https://hsps.pro/Dentrix/Help/mergedProjects/Ledger/Entering%20Transactions/Credit_and_charge_adjustments.htm
- `[DX-ACB]` Allocating credit balances — https://hsps.pro/Dentrix/Help/mergedProjects/Ledger/Allocating_credit_balances.htm and https://hsps.pro/Dentrix/Help/mergedProjects/Ledger/Entering%20Transactions/Allocating_credit_balances_automatically.htm
- `[DX-PCB]` Provider Credit Balances Manager overview — https://hsps.pro/Dentrix/Help/mergedProjects/Ledger/Provider_Credit_Balances_Manager_overview.htm
- `[DX-FA]` Setting up financial agreements — https://hsps.pro/Dentrix/Help/mergedProjects/Ledger/Setting%20Up%20Financial%20Arrangements/Setting_up_financial_agreements.htm
- `[DX-FD]` Future due payment plans overview — https://hsps.pro/Dentrix/Help/mergedProjects/Ledger/Setting%20Up%20Financial%20Arrangements/Future%20Due%20Payment%20Plans/Future_Due_Payment_Plans_overview.htm
- `[DX-PAG]` Payment agreements overview — https://hsps.pro/Dentrix/Help/mergedProjects/Ledger/Setting%20Up%20Financial%20Arrangements/Payment%20Agreements/Payment_agreements_overview.htm
- `[DX-5]` Dentrix Magazine, 5 Dentrix Reports Every Office Should Use (2014, updated 2021) — https://magazine.dentrix.com/5-dentrix-reports-every-office-should-use/
- `[DX-FRAUD]` Dentrix Magazine, Fraud Prevention Starts at the Top (J. Janssen, RDH, CFE, 2017) — https://magazine.dentrix.com/fraud-prevention-starts-at-the-top/
- `[DXE-KEY]` Dentrix Enterprise blog, Key Reports to Check the Health of Your Organization (2020) — https://blog.dentrixenterprise.com/key-reports-to-check-the-health-of-your-organization/

### Eaglesoft

- `[ES-RPT]` Patterson, Eaglesoft V16: Reporting and Date-Based Reporting (attendee handout, PDF) — https://pattersonsupport.custhelp.com/euf/assets/Eaglesoft/Reports/Reporting_and_Date_Based_Reporting_Attendee_Handout.pdf

### Planet DDS Help Center — Denticon (base https://support.planetdds.com/hc/en-us/articles/ ; read through the public article API)

- `[DN-EOM]` Reports and activities recommended at the end of each month and year — https://support.planetdds.com/hc/en-us/articles/115002068151
- `[DN-CO1]` Update Statement Dates vs. Close Out: Locking Ledgers in Denticon — https://support.planetdds.com/hc/en-us/articles/115002072411
- `[DN-CO2]` Difference between a Statement Update and a Close Out — https://support.planetdds.com/hc/en-us/articles/115002072591
- `[DN-CO3]` Accidental Close Out cannot be reversed — https://support.planetdds.com/hc/en-us/articles/115002093712
- `[DN-CO4]` Protecting the financial integrity of recorded transactions — https://support.planetdds.com/hc/en-us/articles/115002084912
- `[DN-CLOSED]` Wrong provider found after Close Out — https://support.planetdds.com/hc/en-us/articles/115002072551
- `[DN-UNCLOSE]` Unclosing a patient's statement — https://support.planetdds.com/hc/en-us/articles/360028499432
- `[DN-AUD]` What activities will the Audit Trail track? — https://support.planetdds.com/hc/en-us/articles/115002073211
- `[DN-DAUD]` Daily Audit Report — https://support.planetdds.com/hc/en-us/articles/4404741110171
- `[DN-STX]` Special Transaction report — https://support.planetdds.com/hc/en-us/articles/30717390364699
- `[DN-SEC]` How does Denticon protect my data? — https://support.planetdds.com/hc/en-us/articles/360052734791
- `[DN-AGE]` Which reports show balances owed by patient and by insurance (ageing buckets) — https://support.planetdds.com/hc/en-us/articles/360029738592
- `[DN-ARPT]` Aging by Account A/R vs Patient A/R — https://support.planetdds.com/hc/en-us/articles/38057961810331
- `[DN-MLA]` Multi-location: which aging reports to run — https://support.planetdds.com/hc/en-us/articles/360003002172
- `[DN-ZERO]` Multi-location aging shows accounts with a $0 ledger balance — https://support.planetdds.com/hc/en-us/articles/115002081412
- `[DN-EXAG]` Executive Summary does not match the Aging Report — https://support.planetdds.com/hc/en-us/articles/34417429197595
- `[DN-CR]` Accounts with credit balances — https://support.planetdds.com/hc/en-us/articles/115002083432
- `[DN-FAMCR]` Credit on one family member, balance on another — https://support.planetdds.com/hc/en-us/articles/115002089712
- `[DN-IA]` Understanding the Income Allocation Summary Report for Provider Payments — https://support.planetdds.com/hc/en-us/articles/115002081992
- `[DN-IAD]` Why Monthly Income Allocation Balances May Differ — https://support.planetdds.com/hc/en-us/articles/30361817476763
- `[DN-PSIA]` Production Summary vs Income Allocation — https://support.planetdds.com/hc/en-us/articles/115002085292
- `[DN-FIFO]` How transactions should be entered so providers and accounts get paid properly — https://support.planetdds.com/hc/en-us/articles/360000367792
- `[DN-PAYENT]` How patient payments should be entered — https://support.planetdds.com/hc/en-us/articles/115002071711
- `[DN-UNALLOC]` Provider showing as unallocated — https://support.planetdds.com/hc/en-us/articles/26580149707419
- `[DN-PREPAY]` Pre-payment not applying to the intended provider — https://support.planetdds.com/hc/en-us/articles/360004808171
- `[DN-REALLOC]` Why does this account need to be reallocated? — https://support.planetdds.com/hc/en-us/articles/9795021411995
- `[DN-ADJTYPE]` Changing payment and adjustment types — https://support.planetdds.com/hc/en-us/articles/115002071531
- `[DN-ADJPICK]` Which adjustment to pick — https://support.planetdds.com/hc/en-us/articles/115002083552
- `[DN-DJ]` Daily Journal: adjustments in the charges column — https://support.planetdds.com/hc/en-us/articles/31644959243803
- `[DN-AUTO]` AUTO adjustments — https://support.planetdds.com/hc/en-us/articles/115002079531
- `[DN-INSREF]` Insurance company requests a refund — https://support.planetdds.com/hc/en-us/articles/33026045299355
- `[DN-NSF]` Returned patient check — https://support.planetdds.com/hc/en-us/articles/360000752831
- `[DN-XFER]` Card payment posted to the incorrect account — https://support.planetdds.com/hc/en-us/articles/360060218591
- `[DN-WRONGPROV]` Procedure, claim and payment recorded to a wrong provider — https://support.planetdds.com/hc/en-us/articles/115002085372
- `[DN-PREVBAL]` Previous balance after conversion — https://support.planetdds.com/hc/en-us/articles/115002071091
- `[DN-CONTRACTCODES]` Adjustment codes ACMVD and ACBIL — https://support.planetdds.com/hc/en-us/articles/115002067331
- `[DN-RPP]` Posting periodic charges for a patient payment contract — https://support.planetdds.com/hc/en-us/articles/115002072271
- `[DN-RPPDESIGN]` Designing a payment contract — https://support.planetdds.com/hc/en-us/articles/115002072231
- `[DN-ORTHO]` Ortho Payment Plan and Ortho Treatment Card report options — https://support.planetdds.com/hc/en-us/articles/360045117932
- `[DN-CAPCHK]` Entering a capitation check payment — https://support.planetdds.com/hc/en-us/articles/115002087552
- `[DN-CAPCC]` Entering a capitation credit card payment — https://support.planetdds.com/hc/en-us/articles/360057622451
- `[DN-MLPAY]` Payments received at a corporate office for a patient of another office — https://support.planetdds.com/hc/en-us/articles/115002071171
- `[DN-DEP]` Daily deposit slip report — https://support.planetdds.com/hc/en-us/articles/115002079011

### Local companion documents

- `[KPI]` `docs/reports/module-plan/research/dental_kpi_dictionary.md`
- `[DEN]` `docs/reports/module-plan/research/denticon_analytics_and_dso.md`
- `[ARCH]` `docs/reports/module-plan/research/reporting_architecture_options.md`
- `[L-FIN]` `docs/reports/module-plan/analysis/be_data_financial.md`
