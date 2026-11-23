# BE data map — the INSURANCE model (carriers, plans, coverage, eligibility, claims, remittances)

_Static analysis only: code + docs read; no server started, no DB connection, no API call, no source-export file opened. Snapshot 2026-11-21. Backend `<workspace>/dentc-backend` (branch `feature/uat-realse`, HEAD `9183df0`; the working tree also carries an uncommitted `app/services/benefit_usage_service.py`), frontend `<workspace>/dentc-frontend` (branch `feature/uat-realse-v5`). `schema.sql` is a pg_dump dated 2026-10-11; every Alembic revision that touches an insurance table is older (latest `d4f1a9c7b3e2`, 2026-09-20), so the dump is current for this scope._

**Legend** — **[V]** verified by reading the cited file/lines. **[I]** inference (reasoned from code, not executed). **[D]** a number/claim quoted from a code comment or backend doc, not re-measured. Paths are relative to `dentc-backend/` unless prefixed `FE:` (= `dentc-frontend/`). Names are snake_case exactly as in the code.

Companions (same folder): `be_data_financial.md` (money stores, sign conventions, the normalised ledger union — its §1.3 / §3.6 / §4 are assumed here, not repeated), `be_existing_reporting.md` (existing KPI endpoints and their formula drift), `be_platform.md` (tenancy, audit, jobs, volumes).

---

## 0. TL;DR for planners

| # | Finding | Evidence |
|---|---|---|
| 1 | A claim is one `insurance_claims` header; **claim lines are `patient_procedures` rows pointing at it through the single FK `claim_id`** — there is no claim-line table. A secondary / tertiary / quaternary claim therefore owns **no lines** and is tied to its primary only by the `claim_number` suffix `-S` / `-T` / `-Q`. | [V] `app/db/models/billing.py` L79-173, `clinical.py` L55; `FE:src/components/patient/claimLifecycle.ts` L7-19, L58-63, L111-135 |
| 2 | `insurance_claims.status` is a free `String(30)`. Code writes 8 values (`draft`, `sent`, `preauth_sent`, `submitted`, `pending`, `paid`, `denied`, `closed`); five services each keep their own open / settled list. There is no `partially_paid`, `rejected`, `appealed`, `resubmitted` or `void` state, and `paid` is stamped on the **first** payment > 0, not on full payment. | [V] `billing_service.py` L390-393, L519, L600-602, L834; `patient_extra_service.py` L713-726; §2.3 |
| 3 | **No status history.** `POST /insurance-claims/{id}/status` overwrites; the audit row does not capture the status value. Only three lifecycle dates exist: `submitted_date`, `paid_date`, `close_date`. No printed / received / denied / last-modified timestamp (the table has no `updated_at`). | [V] `billing_service.py` L860-906 (events carry `"status": None`); `app/middleware/audit.py` L52-77 |
| 4 | Soft delete and close share one flag: both set `is_active = false`. "Deleted" must be derived as `is_active = false AND status <> 'closed' AND close_date IS NULL`. Deleted claims still come back from `GET /insurance-claims`; a reopened claim keeps `close_date` and `is_active = false`. | [V] `app/crud/router_factory.py` L69-73; `patient_extra_service.py` L721-723; `FE:claimLifecycle.ts` L80-89 |
| 5 | `claim_type` is overloaded: migrated rows hold the **tier** (`primary` / `secondary`), app rows hold the **category** (`dental` / `medical`). The tier is `billing_order`. | [V] `denticon_migration/migration/steps/s30_insurance_claims.py` L58-59; `FE:src/features/account-ledger/LedgerPage.tsx` L353-355 |
| 6 | The 96,314 migrated claims carry 15 columns only. NULL / default on all of them: `date_of_service_from/to`, `est_insurance` (0), `close_date`, `billing_provider_id`, `treating_provider_id`, `notes`, `created_by`; `created_at` is the migration-run time. `ins_plan_id` was looked up with the wrong key (§5.2). | [V] `s30` L16-22, L57, L66-82; [D] 96,314 — `alembic/versions/a6b7c8d9e0f1_add_claim_opening_paid.py` L11-15 |
| 7 | Insurance money sits in three stores that must never be added together blindly: legacy ledger `I` rows → `patient_payments` (`payment_type = 'insurance'`, **no claim / carrier / plan column**); legacy claim totals → `insurance_claims.total_paid`, mirrored in `opening_paid`; app remittances → `ledger_insurance_details` (one row per procedure line, per-tier columns, no header row). `total_paid = opening_paid + Σ live coverage rows`. | [V] `s29_patient_payments.py` L17-23; `billing_service.py` L244-275 |
| 8 | Not modelled at all: EOB / ERA document, remittance header, capitation payment, denial reason code, clearinghouse acknowledgement, claim follow-up note. `send_method` is accepted by the submit endpoint and **not stored**. The Utilities entries "Batch Claims", "EClaims Management", "Batch Eligibility", "Close Out Managed Care" are FE simulations (`backend: "pending"`). | [V] `app/schemas/transactions.py` L401; `billing_service.py` L822-831, L852; grep `capitat` over `app/**` = one permission code, one pricing warning code and comments; `FE:src/components/utilities/utilityCatalog.ts` L66-160 |
| 9 | "Claims printed" is not tracked in the database. The server PDF routes write `audit_logs` rows (`action = 'PRINT'`, `resource_type = 'claim_report'`), but the FE prints client-side with jsPDF and logs to `localStorage` (`dentc:claim_print_log:v1:<claim_id>`). | [V] `app/api/v1/claim_forms.py` L60-67, L88-120; `FE:src/features/claims/ada/adaLocalStores.ts` L15, L90-96; no FE caller of `getAdaClaimFormReport` |
| 10 | Eligibility is one overwritable stamp on the **subscriber** row (`elig_status`, `elig_verified_on`, `elig_verified_by`, `elig_notes`), always manual, free text, no history. `elig_status` is uniformly `unknown` on the 65k migrated rows. An `eligibility_checks` table, `insurance_subscribers.elig_method` and `insurance_carriers.stedi_payer_verified*` exist **only in the database dump** — no model, no Alembic revision, no code. | [V] `insurance_service.py` L54-86; `schema.sql` L1573-1593, L2146-2147, L2429; grep `eligibility_checks` = `schema.sql` only; [D] `docs/INSURANCE/insurance_dashboard.md` |
| 11 | A coverage slot is one `patient_insurance` row per `(patient_id, legacy_plan_type, insurance_type)` (unique). It has **no effective / termination date and no history** — replacing a plan overwrites the row. Dates live on `insurance_subscribers`. Migrated tiers are wrong: 1 secondary slot where the source has 954. | [V] `patients.py` L155-191; `schema.sql` L10425; [D] `docs/pricing/pricing_hierarchy_architecture.md` L180, L566-575 |
| 12 | Remaining annual maximum is **derived**, not stored: `benefit_usage_service.slot_benefits` (Python loop per patient, one claims read per call). The stored `max_remaining` / `deductible_remaining` columns are snapshots nothing decrements. A report needs a set-based port (§4.12). | [V] `benefit_usage_service.py` L1-31, L147-223 |
| 13 | Plan limits and group numbers on migrated plans are correct only where `scripts/backfill_insurance_source_fields.py` was applied (`individual_max` non-zero on 4 → 31,263 of 31,331 plans). | [D] `docs/patient-insurance/patient_insurance_backend_response.md` L44-51 |
| 14 | `patient_procedures.claim_id` on migrated charges exists only after `scripts/backfill_ledger_source_fields.py` (297,671 rows). `billing_status` is not a billing state on migrated rows: `s28` wrote `paid` when the **patient** had paid, else `not_billed`. | [V] `s28_patient_procedures.py` L28-31, L113; [D] `docs/account-ledger/account_ledger_backend_response.md` L160-164, L429-435 |
| 15 | Pre-authorisation lives in two unlinked places: `insurance_claims.is_preauth` (+ status `preauth_sent`, `predetermination_number`) and `treatment_plan_insurance_details.preauth_*` per plan item (empty for legacy — no export file). | [V] `billing.py` L111, L154; `treatment.py` L139-160; `denticon_migration/source_to_table_map.md` L105 |
| 16 | Recompute hazard: `_recompute_claim_totals` overwrites `total_billed` and `est_insurance` from the linked lines on every remittance write. On a claim with no linked lines (every secondary claim; every migrated claim whose procedures were not back-filled) the first posted payment sets both to 0. | [I] from `billing_service.py` L244-275, L434-437, L634-666 |
| 17 | No `tenant_id` on `insurance_claims`, `claim_submissions`, `ledger_insurance_details`, `patient_insurance`, `insurance_coverage_rules`, `treatment_plan_insurance_details` — scope through `patients` (or the plan). `legacy_id` and `claim_number` are unique **globally**, not per tenant. | [V] models; `schema.sql` L8849-8913 |
| 18 | No index on any claim date, `office_id` or `carrier_id`; none on `ledger_insurance_details.payment_date`; the `tenant_id` indexes the models declare for carriers / plans / subscribers / employers are absent from the dump. | [V] §6.1 |

---

## 1. Coverage-side entities

### 1.0 Inventory

| Table | Model | Role | `tenant_id` | Volume |
|---|---|---|---|---|
| `insurance_carriers` | `app/db/models/insurance.py` L42-82 | payer | yes | 1,340 (1,335 dental / 5 medical) [D] |
| `employers` | L18-39 | employer group | yes | 4,302 [D] |
| `insurance_plans` | L85-171 | group plan = carrier × employer × group number (no name column) | yes | 31,337; 31,321 active [D] |
| `insurance_subscribers` | L174-217 | policy holder's enrolment on a plan (Denticon `RespInsplan`) | yes | 65,314 [D] |
| `patient_insurance` | `patients.py` L155-191 | patient coverage slot | no | 55,119 [D] |
| `insurance_coverage_rules` | `insurance.py` L220-264 | coverage % and limits per plan per category | no (via plan) | 876,732 – 876,901 [D] |
| `insurance_plan_frequency_groups` | L267-297 | frequency limit per code group | yes | app-era |
| `ins_custom_coverage` | L300-310 | tenant coverage template | yes | — |
| `procedure_insurance_rules` | `procedure_setup.py` L33-47 | plan-agnostic rule per CDT code | yes | app-era |
| `fee_schedule_assignments` | `insurance.py` L313-364 | the only payer ↔ price-list binding | yes | — |
| `fee_schedules`, `fee_schedule_entries` | `codes.py` L104-215 | price lists | yes | 47 lists / 13,493 entries [D] |
| `provider_insurance_ids` | `staff.py` L159-168 | provider × carrier id, `in_network` | yes | empty at migration [D] |
| `provider_carrier_logins` | `provider_setup.py` L133-148 | carrier portal credentials | yes | app-era |
| `insurance_claims` | `billing.py` L79-173 | claim header | no | 96,314 [D] |
| `claim_submissions` | L176-187 | one row per send | no | not documented |
| `ledger_insurance_details` | L190-245 | remittance line (per procedure, per tier) | no | 12,191 migrated (216 on a claim, none with a paid amount) + app rows [D] |
| `claim_attachments` | `patient_extra.py` L221-233 | files on a claim | yes | app-era |
| `treatment_plan_insurance_details` | `treatment.py` L139-160 | per-item estimate and pre-auth | no | empty at migration [D] |
| `procedure_fee_provenance` | `clinical.py` L137-201 | archive of Denticon `LEDGERINSD` per charge | no | empty unless `scripts/load_procedure_fee_provenance.py` ran [D] |
| `eligibility_checks` | `schema.sql` L1573 only | orphan (no ORM model) | yes | unknown |

### 1.1 Join paths

```
insurance_carriers 1─* insurance_plans *─1 employers (employer_id nullable)
insurance_plans    1─* insurance_coverage_rules, insurance_plan_frequency_groups
insurance_plans    1─* insurance_subscribers (ins_plan_id NOT NULL; subscriber_patient_id → patients; office_id)
patients           1─* patient_insurance ─→ ins_plan_id, subscriber_id
patients           1─* insurance_claims ─→ carrier_id, ins_plan_id, other_ins_plan_id, office_id,
                                           billing_provider_id, treating_provider_id
insurance_claims   1─* patient_procedures (claim_id)                ← claim lines, primary claim only
insurance_claims   1─* claim_submissions, claim_attachments, ledger_insurance_details,
                       patient_documents(claim_id), patient_signatures(claim_id), payment_allocations(claim_id)
patient_procedures 1─* ledger_insurance_details (procedure_id)
patient_procedures ─→ coverage_rule_id → insurance_coverage_rules.ins_plan_id   (app-era charges only)
fee_schedule_assignments ─→ ins_plan_id | carrier_id | provider_id | specialty_id (+ office_id | office_group_id) → fee_schedules
treatment_plan_items 1─* treatment_plan_insurance_details ─→ ins_plan_id
```

### 1.2 Carriers and employers [V]

| Column (`insurance_carriers`) | Meaning / vocabulary | Reporting note |
|---|---|---|
| `name`, `payer_id`, `national_id` | display name, electronic payer id | `legacy_id` unique globally |
| `carrier_type` | `"True"` = dental, `"False"` = medical; read through `insurance_service.carrier_is_dental()` L101-105 (`MEDICAL_TOKENS` L93 = `false, medical, m, 0, f, no`; anything else, typos included, reads as dental) | plans have no dental / medical column — the category is the carrier's. List filter `?is_dental=` |
| `insurance_type` | medical sub-type, free text | app-era |
| `claim_type` | the carrier's submission route: `1` = EClaim (Electronic), 1,282 carriers; `0` = Paper Claim, 58 [D]. Labels: definitions group `claim_type` (`scripts/seed_account_definitions.py` L96) | the only stored "paper vs electronic" signal (§2.7) |
| `supports_realtime_eligibility`, `supports_claim_status`, `supports_dxc_attachment` | nullable capability flags | no integration reads them |
| `fee_id` | legacy free-text fee-schedule id, retired | use `fee_schedule_assignments.carrier_id` |
| `is_active` | soft delete | |
| `created_on`, `created_by`, `modified_on`, `modified_by` (Denticon strings); `updated_by` (FK), `created_at`, `updated_at` | audit | |
| `phone`, `phone2`, `fax`, `email`, `address`, `address2`, `city`, `state`, `zip`, `website`, `contact`, `notes`, `ref_num`, `vbs_id`, `vbs_pgid` | list columns | |

`employers`: `name`, `address`, `address2`, `city`, `state`, `zip`, `phone`, `salesrep`, `contact_person`, `created_by`, `updated_by`. No `is_active` (hard delete).

### 1.3 Plans [V]

A plan has no name; its identity is carrier + employer + `group_number`. A duplicate `(carrier_id, group_number)` is allowed with an override — 3,609 groups collide on migrated data [D], so "by group number" is not a unique key.

| Column | Vocabulary | Source and reliability |
|---|---|---|
| `group_number` String(100) | free text | NULL on all migrated plans until the backfill (8 → 31,329 rows) [D]. `insurance_subscribers.group_number` is a separate per-card value and differs from the plan on 22,335 of 65,314 rows [D] |
| `plan_type` String(50) | migrated: `PPO`, `HMO`, `Medicaid`, `Indemnity`, `Prepaid` or NULL (`parsers.PLAN_TYPE_MAP` on `PLANTYPE` 1-5); wizard: `PPO`, `HMO`, `DISCOUNT`, `MEDICAID`, `MEDICAL`, `UNION`, `OUT OF NETWORK` (`insurance_plan_service.PLAN_TYPES` L173-175, definitions `PLANTYPE`) | not validated; case differs between eras; distribution not documented |
| `coverage_type` String(10) | single character; seeded labels `I` Indemnity, `P` PPO, `H` HMO, `C` Capitation, `M` Medicaid, `S` Self Pay, `O` Other (`scripts/seed_account_definitions.py` L99-102) | labels are the seed script's assertion, not confirmed from the source |
| `reporting_subtype` | `PLAN_SUBTYPES`: Aetna, Metlife, Delta, Cigna, Medicaid, Discount, Union | app-era |
| `network_type` | `unknown`, `in_network`, `out_of_network` | `unknown` on 31,334 of 31,335 plans unless `backfill_pricing_hierarchy --only plans` ran [D] |
| `is_prepaid`, `legacy_prepaid_code` | boolean true on 9 rows; raw `ISPREPAID` code `9` (15,364 plans), `0` (8,433), `2` (7,459), then 8 / 4 / 1 / 3 / 5 — undecoded | the capitation signal was lost in migration [V] `insurance.py` L150-156 |
| `claim_option` | `submit`, `do_not_submit`, `print_only` | default `submit` on migrated rows |
| `form_to_print` | `ADA2024`, `ADA2019`, `ADA2012`, `ADA2006`, `CMS1500` | default `ADA2024` |
| `fees_to_print` | `office_ucr`, `plan_fees`, `carrier_fees` | Denticon `PRINTOFFICEUCR`: 1 on 27,421 plans, 0 on 3,907 [D] |
| `individual_max`, `individual_deductible`, `family_max`, `family_deductible`, `ortho_max`, `per_visit_copay` | money | after the backfill: non-zero on 31,263 / 12,227 / 31,321 / 12,328 / 29,720 plans [D]; the migration wrote `0`, not NULL |
| `anniversary_date`, `anniversary_month`, `anniversary_day`, `anniversary_expiry_date` | benefit-year start | month / day are canonical; unset → 1 January (`benefit_usage_service.anniversary` L73-84) |
| `lifetime_ortho_benefits`, `is_non_dup_benefits`, `noa_only` | flags | `lifetime_ortho_benefits` is false on every migrated row (no source column) |
| `is_locked`, `locked_at`, `locked_by`, `plan_notes`, `is_active` | | |
| `created_on`, `created_by`, `modified_on`, `modified_by` (Denticon strings), `updated_by`, `updated_at` | audit | |

Fee-schedule link: **only** `fee_schedule_assignments` (rank keys `ins_plan_id` > `carrier_id` > `provider_id` > `specialty_id`; scope keys `office_id`, `office_group_id`). `fee_schedules.ins_plan_id` and `insurance_carriers.fee_id` are retired. Resolver: `pricing_service.fee_binding` (`GET /insurance-plans/{plan_id}/fee-binding`). The payer's benefit model is the schedule's `fee_schedules.pricing_model`: `percentage` (plan pays a coverage %) or `copay` (the list states `fee_schedule_entries.insurance_fee` = plan pays; Medicaid / DHMO / capitation; 2 lists) [V] `fee_vocab.py` L128-147.

Plan usage counts already exist per plan: `GET /insurance-plans/{plan_id}/usage` → `patients`, `patient_links`, `subscribers`, `claims_total`, `claims_open`, `claims_by_status`, `treatment_plans`, `treatment_plan_items_pending` (`insurance_plan_edit_service.plan_usage` L114-186).

### 1.4 Subscribers and patient coverage slots [V]

| Concept | Column | Vocabulary / note |
|---|---|---|
| Category (dental / medical) | `patient_insurance.legacy_plan_type` | `D` / `M` (Denticon `PatInsPlans.PLANTYPE`) |
| Tier | `patient_insurance.insurance_type` | `primary`, `secondary`, `tertiary`, `quaternary` (`patient_rules_service.INSURANCE_RANKS` L69); a slot may not exist without the tier beneath it |
| Plan / subscriber | `ins_plan_id`, `subscriber_id` | both nullable |
| Relationship to subscriber | `relationship` | codes `S`, `SP`, `P`, `G`, `C`, `D`, `O` (definitions `resp_party_rel`); `sec_sub_rel_to_prim_sub` on non-primary slots |
| Individual remaining | `deductible_remaining`, `max_remaining`, `ortho_remaining` | snapshots; migration wrote 0 (wrong source column) — `deductible_remaining > 0` on 3 of 55,119 slots [D] |
| Medicaid share of cost | `dentical_share_month`, `dentical_share_year`, `dentical_share_amount`, `dentical_unused` | app-era |
| Active | `is_active` | no dates on the slot |
| Subscriber dates | `insurance_subscribers.effective_date`, `term_date` | subscriber ("Sub") dates from `SUBPLANEFFDATE` / `SUBPLANTERMDATE` |
| Plan dates per enrolment | `insurance_subscribers.plan_effective_date`, `plan_term_date` | app-era, NULL on migrated rows |
| Family remaining | `insurance_subscribers.family_max_remaining`, `family_ded_remaining`, `ortho_remaining`, `anniversary_date` | snapshots |
| Member id / card group | `sub_member_id`, `group_number` | |
| Subscriber demographics | `sub_first_name`, `sub_last_name`, `sub_mi`, `sub_suffix`, `sub_dob`, `sub_gender`, `sub_ssn`, `sub_phone`, `sub_address`, `sub_address2`, `sub_city`, `sub_state`, `sub_zip`, `marital_status` | `subscriber_patient_id` = the guarantor's primary patient |
| Office | `insurance_subscribers.office_id` | the only office column on the coverage side; `patient_insurance` has none |

Consequences [I]: (a) "coverage as of a date" cannot be answered from slots — the claim's `ins_plan_id` captured at creation is the only historical record; (b) one subscriber row is shared by every family member on that enrolment, so anything stamped on the subscriber (eligibility, family remaining) is per family, not per patient.

### 1.5 Coverage rules [V]

| Table | Key columns | Note |
|---|---|---|
| `insurance_coverage_rules` | `ins_plan_id`, `start_code`, `end_code`, `category`, `description`, `coverage_pct`, `ded_waived`, `freq_limit` (1-based ordinal into `insurance_plan_service.FREQUENCY_LIMITATIONS` L87-101; 0 / NULL = none), `age_min`, `age_max`, `wait_months` (+ mirror strings `age_limit`, `wait_period`) | two row shapes: category band (`start_code = end_code = '03A'`) on 876,876 rows, ADA range on 25 [D]. Matched by `estimate_service.match_coverage_rule` L100-138 through `procedure_codes.coverage_category` |
| `insurance_plan_frequency_groups` | `ins_plan_id`, `code_group` (definitions `INSLIMITATIONS`), `freq_limit`, `whole_mouth`, `per_day_quantity` | unique `(ins_plan_id, code_group)` |
| `procedure_insurance_rules` | `procedure_code`, `coverage_pct`, `frequency_limit`, `age_limit`, `wait_period` | plan-agnostic |
| `procedure_codes` | `coverage_category`, `is_ortho`, `exempt_from_dental_max`, `requires_attachment`, `requires_perio_chart`, `requires_photo`, `requires_xray`, `requires_missing_tooth_info`, `amb_code`, `is_downgrade`, `alternate_of` | category catalogue: `GET /metadata/coverage-categories`; default table `insurance_plan_service.DEFAULT_COVERAGE_TABLE` L109-138 |

Applied coverage is snapshotted on app-era charges and plan items: `patient_procedures.coverage_pct`, `coverage_rule_id`, `estimated_deductible`, `insurance_estimate` (primary only), `sec_insurance_estimate`, `patient_estimate`, `fee_schedule_id`, `fee_source`, `ucr_fee` (`estimate_service._fill_split` L694-715). Migrated charges carry `insurance_estimate` (= `LEDGER.ESTINS`) and `ucr_fee` only; `patient_estimate` is 0 on 1,372,558 of 1,372,574 [D].

### 1.6 Benefits used, annual maximum, deductible [V] `app/services/benefit_usage_service.py`

| Rule | Definition |
|---|---|
| Benefit year | starts on `anniversary_month` / `anniversary_day` (else month / day of `anniversary_date`, else 1 January), twelve months (`benefit_year_window` L87-93) |
| Claim belongs to a slot | `claim.ins_plan_id = slot.ins_plan_id`; if the claim has no plan id, `claim.carrier_id = plan.carrier_id` and (`claim_type = 'secondary'`) = (slot is not primary) (`_claim_matches` L130-137) |
| Claim date | `date_of_service_from`, else `submitted_date`, else `created_at` (`_claim_dos` L116-120) |
| Benefits used | Σ `total_paid` for `paid` / `closed` claims; `max(total_paid, est_insurance)` while open; `is_preauth` claims and `void, voided, cancelled, canceled, denied, rejected` never count (L50-54, L123-127, L170-176) |
| Remaining max | `individual_max − used`, capped by `patient_insurance.max_remaining` only when the slot row was written (`updated_at`, else `created_at`) inside the current benefit year; with no claims → the current-year column, else the plan limit (L199-209) |
| Deductible | not derived from claims: the slot column if written this year, else `individual_deductible` (L211-216) |
| Ortho | lifetime: `ortho_remaining`, else `ortho_max` (L218-221) |

Surfaced on every `GET /patient-insurance` read: `benefit_year_start`, `benefit_year_end`, `annual_max`, `benefits_used_ytd`, `benefit_claim_count`, `max_remaining_effective`, `max_remaining_source` (`claims`, `claims_capped_by_slot`, `slot`, `plan`, `none`), `deductible_remaining_effective`, `deductible_remaining_source`, `slot_values_stale` (`app/schemas/enriched.py` L142-154). Gaps in the rule [I]: it does not test `is_active`, so a soft-deleted draft claim with an estimate still consumes benefit; deductible met is never computed; family maximum is not derived.

### 1.7 Eligibility and verification [V]

| Aspect | Today |
|---|---|
| Store | `insurance_subscribers.elig_status` String(20), `elig_verified_on` timestamp, `elig_verified_by` String(100) (display name, not a user FK), `elig_notes` |
| Writers | `POST /insurance-subscribers/{subscriber_id}/verify-eligibility` (`insurance_service.verify_eligibility` L54-86; default status `verified`, `method` always `manual`); the FE does **not** call it — its UPDATE STATUS button sets `elig_verified_on = today` and `elig_status = form value or "Verified"` client-side and saves through the subscriber PATCH (`FE:src/features/patient-insurance/InsurancePlanScreen.tsx` L180-186; free-text input in `EligibilitySection.tsx` L45) |
| Vocabularies in code | migration: `verified`, `not_eligible`, `unknown` (`parsers.ELIG_STATUS_MAP`); report: verified = `verified, active, confirmed, eligible` (`report_service._ELIG_VERIFIED` L49); scheduler: eligible = `active, eligible, verified, yes`, ineligible = `inactive, ineligible, termed, terminated, denied, no` (`scheduler_service.py` L32-33) — `not_eligible` falls into `unknown` there |
| Data state | `elig_status` uniformly `unknown`; `elig_verified_on` filled on 112 rows after the backfill [D] |
| Existing roll-up | `GET /reports/insurance-verification-summary` → `by_status`, `total`, `verified`, `pending` (active subscribers, optional `office_id`); scheduler feed field `insurance_eligibility` per appointment (`_batch_eligibility` L125-140) |
| History / per-visit record | none |
| Real-time (270 / 271) | none; `account_settings.auto_eligibility`, `account_settings.edi_vendor` and the carrier capability flags are stored and unread |

### 1.8 Provider × carrier [V]

`provider_insurance_ids` (`provider_id`, `carrier_id`, `ins_id`, `in_network`) is the only in-network / credentialing record; it prints in ADA items 52a / 58. `providers.print_separate_claim_form` forces one claim per provider.

---

## 2. Claims

### 2.1 Header columns [V] `billing.py` L79-173

| Group | Columns | App writer | Migrated source (`s30`) |
|---|---|---|---|
| Identity | `id` String(50), `claim_number` (unique, global), `legacy_id` | `id` = client `crypto.randomUUID()` or `uuid7()`; `claim_number` = `String(Date.now())` from the FE, primary number + `-S/-T/-Q` for later tiers, or the id when omitted | `CLM-{CLAIMID}`, `CLAIMID` |
| Patient / office | `patient_id`, `office_id` | `office_id` defaults to `patients.home_office_id` | `PATID`, `OID` |
| Payer | `carrier_id`, `ins_plan_id`, `other_ins_plan_id`, `has_other_coverage` | defaulted from the slot matching `billing_order` (`InsuranceClaimCRUD.create` L556-565) | `CARRIERID`; `ins_plan_id` via a mis-keyed lookup (§5.2); other two NULL |
| Type | `claim_type`, `billing_order`, `is_preauth`, `is_epsdt`, `is_ortho` | `claim_type = 'dental'`, `billing_order = 'primary'` … | tier in both `claim_type` and `billing_order`; `ISPREAUTH` |
| Status | `status`, `is_active` | §2.3 | `CLAIMSTATUS` mapped; `is_active` default true |
| Dates | `date_of_service_from`, `date_of_service_to`, `submitted_date`, `paid_date`, `close_date`, `created_at` | §2.5 | `CLAIMSENTDATE`, `PAIDDATE` or `RECVDDATE`; the rest NULL / load time |
| Money | `total_billed`, `est_insurance`, `total_paid`, `opening_paid`, `write_off_amount`, `write_off_mode`, `write_off_value`, `other_fees` | §2.8 | `CLAIMAMT`, `RECVDAMT` |
| Providers | `billing_provider_id`, `treating_provider_id`, `is_locum_tenens` | majority provider of the lines → patient's preferred provider; billing = `offices.billing_provider_id` → treating | NULL |
| Text | `notes`, `remarks` (ADA item 35), `predetermination_number` (item 2) | free text | NULL (`NOTES` is in the mapping doc but not in the step) |
| ADA fill-out | `icd_qualifier`, `icd_1..icd_4`, `missing_teeth`, `date_last_srp`, `signature_on_file`, `place_of_treatment`, `ortho_appliance_date`, `ortho_months_remaining`, `prosthesis_replacement`, `prosthesis_prior_date`, `accident_type`, `accident_date`, `accident_state` | validated by `claim_form_service.validate_fillout` | none |
| Actor | `created_by` | user id | NULL |

### 2.2 Lines [V]

Claim line = `patient_procedures` with `claim_id = claim.id` and `is_void = false`. Per line: `date_of_service`, `procedure_code`, `tooth`, `surface`, `quadrant`, `quantity`, `diagnosis_pointers`, `fee` (charged / contracted), `ucr_fee`, `insurance_estimate`, `sec_insurance_estimate`, `patient_estimate`, `estimated_deductible`, `coverage_pct`, `coverage_rule_id`, `provider_id`, `hygienist_id`, `office_id`, `billing_order`, `billing_status`, `hold_claim`. Linking: `POST /insurance-claims` with `procedure_ids` (one transaction) or `PATCH /patient-procedures/{id} {claim_id}` per line (what the FE does). A line on a claim cannot go on another (`procedure_already_claimed`); a held line (`hold_claim`) cannot be claimed.

`billing_status` values: `not_billed` (default), `billed` (set by `submit_claim` only, L836-842), `paid` (migration: patient paid). It is not reset when a payment is reversed or a claim is deleted server-side — treat `claim_id` as the truth.

### 2.3 Status vocabulary and transitions [V]

| Value | Written by | Side effects |
|---|---|---|
| `draft` | model default; FE create; migration (`H`, and every unknown code); `reverse_insurance_payment` when paid falls to 0 and never sent | — |
| `sent` | `billing_service.submit_claim` L834; `reverse_insurance_payment` L601 | `submitted_date`, a `claim_submissions` row, lines → `billing_status = 'billed'` |
| `preauth_sent` | `submit_claim` when `is_preauth` | same |
| `submitted` | `POST …/status`; migration (`S`). The FE calls `/submit` and then `/status submitted`, so app claims normally end here. The FE **Reopen** action also posts `/status submitted` on a closed claim (`FE:src/features/account-ledger/ClaimDetailsModal.tsx` L121-128) | `submitted_date` if empty; nothing else — a reopened claim keeps `close_date` and `is_active = false` |
| `pending` | migration (`P`) only | — |
| `paid` | `_mark_claim_paid` L390-393 (any payment > 0 while `sent`, `submitted`, `pending`); `POST …/status`; migration (`R`) | `paid_date` |
| `denied` | `POST …/status`; migration (`D`) | none (no date) |
| `closed` | `POST …/status`; batch payment `close_claim`; migration (`C`) | `close_date`, `is_active = false` |
| anything else | `POST …/status` accepts any string (`ClaimStatusUpdate`) | none |

Seeded definitions group `claim_status`: `draft, submitted, paid, denied, closed` (`scripts/seed_account_definitions.py` L79-82). Counts on migrated data [D]: 9,934 claims in `submitted` / `pending` / `draft`, 0 in `denied` / `rejected`, 96,291 claims in total at that measurement. The five divergent open / settled sets are tabulated in `be_existing_reporting.md` §2.6.

### 2.4 Status history [V]

`GET /insurance-claims/{claim_id}/status-history` (`billing_service.claim_status_history` L860-906) returns audit rows whose `path` ends in `/status`, `/submit`, `/recalculate` — each with `status: null` — plus three synthetic events from the date columns. `PATCH /insurance-claims/{id}` does record a before / after diff in `audit_logs.details` (`CRUDBase.update`), but the FE changes status through `/status`, which bypasses it. Nothing exists for migrated history.

### 2.5 Dates [V]

| Event | Column | Writer | Migrated |
|---|---|---|---|
| Created | `created_at` (naive UTC timestamp) | DB default | migration-run time |
| Service range | `date_of_service_from`, `date_of_service_to` | from the lines at create / attach; FE sends them | NULL (derive from linked lines) |
| Sent | `submitted_date` (date) | `/submit` (`sent_date` or UTC today); `/status submitted` when empty | `CLAIMSENTDATE` |
| Each send | `claim_submissions.created_at`, `created_by`, `batch_id` | `/submit` | load time; `batch_id` = `CLAIMBATCHID` |
| Printed | — | `audit_logs` only when the server PDF is used (§2.7) | — |
| Received / acknowledged | — | — | — |
| First payment | `paid_date` (date) | `_mark_claim_paid` (first payment's `payment_date`); `/status paid` (UTC today) | `PAIDDATE`, else `RECVDDATE` |
| Last payment | derive `max(ledger_insurance_details.payment_date)` | | — |
| Denied | — | | — |
| Closed | `close_date` (date) | `/status closed`; batch `close_claim` | not loaded |
| Last modified | — (no `updated_at`) | | |

Dates stamped by the server use `datetime.now(timezone.utc).date()` — an evening action lands on the next calendar day for a US office.

### 2.6 Type, tier, pre-authorisation [V]

| Dimension | Column | Rule |
|---|---|---|
| Tier | `billing_order` (`primary`…`quaternary`); fallback `claim_type` when it holds a tier | same fallback as `ledger_service._claim_tier` L243-245 |
| Category | `claim_type` `dental` / `medical` on app rows; migrated rows are dental [I] | `FE:claimLifecycle.ts` L75-78 |
| Claim family | `claim_number` with the suffix stripped | no `parent_claim_id` |
| Pre-authorisation / predetermination | `is_preauth = true`; status `preauth_sent` after submit; `claim_submissions.is_preauth`; the returned number is typed into `predetermination_number` on the later actual-services claim | no approved amount, no response date, no link between the pre-auth claim, the actual claim and the treatment-plan items |
| EPSDT / ortho / accident | `is_epsdt`, `is_ortho`, `accident_type` | ADA form only |

Per treatment-plan item: `treatment_plan_insurance_details.preauth_number`, `preauth_date`, `preauth_expires`, `preauth_amount`, `preauth_status` (`sent` / `closed`, `treatment_service.PREAUTH_STATUSES` L120), `preauth_status_at`, plus `estimated_ins`, `estimated_pat`, `deductible`, `coverage_pct`, `annual_max_rem`, `billing_order`, `ins_plan_id`, `is_archived`. List filter `?preauth_status=` exists on `/treatment-plan-insurance-details`.

### 2.7 Submission channel, batch and print tracking

| Question | What exists | Gap |
|---|---|---|
| Paper or electronic? | per carrier `insurance_carriers.claim_type` (`1` / `0`); per plan `insurance_plans.claim_option`, `form_to_print`; `account_settings.edi_vendor` [V] | per-claim channel is not stored: `ClaimSubmitRequest.send_method` (`electronic` default, `paper`) is echoed in the response and dropped (`billing_service.py` L822-831, L852). No clearinghouse — every app claim is in practice printed or keyed on a portal [I] |
| What was sent? | `claim_submissions.claim_text`: JSON snapshot of the assembled ADA form incl. `warnings[]` (app); raw X12 837 text (migrated) [V] `s31` L47 | `missing_records_overridden` is returned, not stored |
| Batch | `claim_submissions.batch_id` = `BATCH-{uuid7}` per single submit (app), `CLAIMBATCHID` (migrated); `submission_status` = `sent` (app) or the legacy code [V] | no batch entity; an app "batch" always holds one claim |
| Printed | `audit_logs`: `action = 'PRINT'`, `resource_type = 'claim_report'`, `resource_id = <claim id>`, `patient_id`, `user_id`, `created_at`, `details.params` = `claim_number`, `form_version`, `pages`, `mode`, `batch` — written by `GET /insurance-claims/{id}/reports/ada-claim-form` and `POST /insurance-claims/reports/ada-claim-form` (≤ 200 claims in one PDF) [V] | the FE renders with jsPDF and logs in the browser; no `printed_at`, `print_count`, `last_printed_by` column |
| Resubmissions | count of `claim_submissions` rows per claim [I] | a reopen through `/status` creates no row; no resubmission reason |

### 2.8 Amounts [V]

| Amount | Where | Definition |
|---|---|---|
| Billed | `insurance_claims.total_billed` | Σ `fee` of linked non-void lines after any recompute; client-supplied at create; `CLAIMAMT` on migrated rows. It is the charged fee, not UCR. A secondary claim copies the primary's figure at creation (`FE:claimLifecycle.ts` L207) |
| Estimated | `est_insurance` | Σ `patient_procedures.insurance_estimate` (primary) after recompute; a secondary claim gets Σ `sec_estimated` of the primary's coverage rows computed client-side; 0 on migrated claims |
| Paid | `total_paid` | `coalesce(opening_paid, 0)` + Σ (`prim_ins_paid` + `sec_ins_paid` + `ter_ins_paid`) over non-void `ledger_insurance_details` rows of the claim |
| Legacy paid baseline | `opening_paid` | `CLAIMH.RECVDAMT`, seeded for 79,038 claims by Alembic `a6b7c8d9e0f1` |
| Write-off | Σ `prim_ins_adjust` + `sec_ins_adjust` + `ter_ins_adjust` on the coverage rows | `write_off_amount` / `write_off_mode` (`amount`, `percent`) / `write_off_value` are filled only by `POST /ledger-insurance-details/payment-batch` (`_apply_claim_write_off` L533-554); the FE posts line by line, so they stay NULL |
| Deductible applied | Σ `prim_deductible` + `sec_deductible` + `ter_deductible` | entered on the remittance |
| Patient portion | not on the claim | per line `patient_estimate`, else `fee − insurance_estimate` (`procedure_totals_service.patient_share` L190-201) |
| Remaining | computed | `max(est_insurance − ins_paid − ins_adjusted, 0)` (`billing_service.outstanding_claims` L791-793) |

Three "outstanding" formulas are live: `total_billed − total_paid` (`report_service._insurance_receivables` L147-168), `est_insurance − total_paid` (`transactions_service.insurance_receivables` L216-259), `est − paid − adjusted` floored at zero (`outstanding_claims`). `GET /reports/accounts-receivable.insurance_ar` is a fourth: cumulative `insurance_estimate` of all charges clamped to total A/R — $32.2M on migrated data [D], not a receivable.

### 2.9 Denial and rejection

Only the status value `denied` (plus free text in `notes`). No denial date, reason code (CARC / RARC), denied amount, appeal or resubmission state; a denied claim that is later paid loses the fact [V]. Per-line denial does not exist — a zero-paid remittance line is the nearest signal [I].

### 2.10 Attachments and supporting records [V]

| Store | Columns | Note |
|---|---|---|
| `claim_attachments` | `claim_id`, `attachment_type`, `file_name`, `content_type`, `file_size`, `is_deleted`, `created_by`, `created_at` | types `EOB`, `XRAY`, `PHOTO`, `PERIO`, `NARRATIVE`, `REFERRAL`, `TXPLAN`, `PREAUTH`, `OTHER` (`patient_extra_service.CLAIM_ATTACHMENT_TYPES` L588-598), unknown stored as written |
| `patient_documents` | `claim_id`, `procedure_id`, `document_type`, `context` | a document can support a claim or one line |
| `patient_signatures` | `claim_id`, `signature_type` | ADA items 36 / 37 / 53 |
| Readiness | `GET /insurance-claims/{claim_id}/readiness` (`supporting_records_service.claim_readiness` L537-585) | per line: which of `requires_attachment`, `requires_perio_chart`, `requires_photo`, `requires_xray`, `requires_missing_tooth_info` are missing; submit returns 422 `supporting_records_missing` unless `allow_missing_records` |

### 2.11 Notes

`insurance_claims.notes` is one text blob; the FE appends `[date] Ins payment … chk … EOB …` lines to it on every remittance (`FE:src/components/patient/InsurancePaymentModal.tsx` L351-360). `remarks` prints in ADA item 35. `ledger_insurance_details.notes` exists per remittance line. There is no claim-note timeline, follow-up date or assignee.

### 2.12 Provider and office attribution

Claim: `office_id`, `billing_provider_id`, `treating_provider_id` (app-era). Lines: `provider_id`, `hygienist_id`, `office_id`. Remittance line: `office_id` (the FE sends the procedure's office), `created_by`. For migrated claims the provider comes only from the linked lines.

### 2.13 Soft delete versus closed [V]

| State | `is_active` | `status` | `close_date` | Lines |
|---|---|---|---|---|
| Live | true | any | NULL | linked |
| Closed | false | `closed` | set | linked |
| Deleted (`DELETE /insurance-claims/{id}`) | false | unchanged (usually `draft`) | NULL | the FE unlinks them first (`claim_id = null`, `billing_status = 'not_billed'`); the server does not |
| Reopened (`/status submitted` on a closed claim) | false (never reset) | `submitted` | still set | linked |
| Closed, then deleted | false | `closed` | set | indistinguishable from closed |

`GET /insurance-claims?is_active=true` hides closed and reopened claims as well as deleted ones; `is_active=false` mixes all three. Classify on `status` first and use `close_date` only to tell deleted from closed [V] `patient_extra_service.py` L713-726.

### 2.14 Existing API feeds for claims [V]

`GET /insurance-claims` — filters `patient_id`, `status`, `claim_type`, `carrier_id`, `ins_plan_id`, `office_id`, `is_active`; ranges `submitted_date_from/to`, `paid_date_from/to`, `created_at_from/to`; search `claim_number`; read adds `patient_name`, `carrier_name` (`app/api/v1/registry.py` L1164-1183). Also `GET /insurance-claims/{id}/detail` (claim + procedures + payment allocations + coverage rows), `GET /patients/{patient_id}/outstanding-claims` (per-patient roll-up), `GET /offices/{office_id}/insurance-receivables` (by carrier), `GET /claim-submissions?claim_id=&batch_id=`, `GET /ledger-insurance-details?patient_id=&claim_id=&procedure_id=&is_void=&office_id=`. Page size is capped; none aggregates across a tenant. The generated client functions `listOutstandingClaims`, `getOfficeInsuranceReceivables`, `getInsuranceVerificationSummary`, `getInsurancePlanUsage` and `verifySubscriberEligibility` have no caller in `FE:src/**` outside `src/api/generated/**` (grep) — these roll-ups are built and unused.

---

## 3. Insurance payments, EOBs, capitation, adjustments

### 3.1 Stores [V]

| Era / path | Table | Grain | Carrier / claim link | Dates, identifiers |
|---|---|---|---|---|
| Migrated ledger `LTYPE = 'I'` | `patient_payments`, `payment_type = 'insurance'`, `legacy_id` set | one row per ledger line | none | `payment_date` (= `TRANDATE`), `payment_method`, `check_number`, `office_id`, `provider_id`; signed amount (see `ledger_sign.py`) |
| Migrated claim total | `insurance_claims.opening_paid` | one figure per claim | `carrier_id` | `paid_date` (one date per claim) |
| Migrated `LedgerInsDetail_Archive` | `ledger_insurance_details`, `legacy_ledger_id` set | 12,191 rows | 216 have a `claim_id`; `prim/sec/ter_ins_plan_id` | no `payment_date`; no paid amount [D] |
| App "Insurance payment pays off claims" | `ledger_insurance_details`, `legacy_ledger_id` NULL | one row per procedure line per posting | `claim_id`, `procedure_id`, `prim_ins_plan_id` / `sec_ins_plan_id` / `ter_ins_plan_id` | `payment_date`, `payment_method`, `check_number`, `bank_number`, `eob_number`, `eft_trace_number`, `notes`, `office_id`, `created_by`, `created_at` |
| App "Insurance check to previous balance" | `patient_payments`, `payment_type = 'insurance'`, `legacy_id` NULL | one row | none (EOB number folded into `notes`) | `payment_date`, `payment_method`, `check_number`, `bank_number`, `eob_number`, `eft_trace_number` |
| Payment → claim allocation | `payment_allocations.claim_id`, `ins_plan_id`, `alloc_type` | per allocation | by claim | migrated rows all amount 0 [D]; the FE insurance window does not use it |

The legacy `I` rows and `opening_paid` are the same money seen twice; the app remittances exist in `ledger_insurance_details` only (no `patient_payments` row), so no balance, ledger or collections code sees them (`be_data_financial.md` §0 #4).

### 3.2 Remittance row [V] `billing.py` L190-245

Per tier `prim_` / `sec_` / `ter_`: `*_estimated`, `*_deductible`, `*_ins_paid`, `*_ins_adjust`, `*_ins_plan_id`, `*_posted`; plus `prim_ind_max`. Void: `is_void`, `void_reason`, `voided_at`, `voided_by` — `DELETE` and `POST /ledger-insurance-details/{id}/reverse` both void, never remove. Amounts are never negative (422 `negative_remittance_amount`). Payment method values: definitions group `payment_method` with `key2 = 'insurance'` → `insurance`, `insurance_check`, `insurance_eft` (`scripts/seed_transaction_definitions.py`), else the FE fallback `check`, `auto_deposit`, `credit_card`, `cash`, `other`.

FE posting behaviour that shapes the data [V] `FE:InsurancePaymentModal.tsx` L186-189, L291-340: one `POST /ledger-insurance-details/payment` per line (not the batch route); a secondary claim writes the `sec_*` columns, **every other tier — tertiary and quaternary included — writes `prim_*`**; `prim_estimated` / `sec_estimated` carry the estimate shown at posting time; the uploaded EOB file becomes a `claim_attachments` row typed `EOB`.

One cheque covering several claims or patients is N unrelated rows that merely share `check_number` / `eob_number` / `eft_trace_number` / `payment_date` — grouping them is a heuristic [I].

### 3.3 Link to the ledger [V]

Claim events appear on the patient ledger as informational rows (`ledger_service._claim_rows` L342-392: one row per `submitted_date` / `paid_date` / `close_date`, zero charge and credit). The money rows the ledger shows are `patient_payments` only. Per-procedure insurance paid on reads (`PatientProcedureRead.insurance_paid_to_date`) sums `ledger_insurance_details` **without** the `is_void` filter (`procedure_totals_service._insurance_details` L93-105) — a reversed remittance still counts there.

### 3.4 Capitation

No capitation payment, roster or period entity. What exists: `fee_schedules.pricing_model = 'copay'` with `fee_schedule_entries.insurance_fee` (plan pays per code), `insurance_plans.is_prepaid` (unreliable) and `legacy_prepaid_code` (raw), `insurance_plans.per_visit_copay`, `account_settings.per_visit_copay_code`, the pricing-health warning `capitation_plan_without_copay_binding`, and the permission code `transactions_add_post_capitation_payments` with nothing behind it [V].

### 3.5 Insurance adjustments and write-offs

| Kind | Store | Attributable to a carrier? |
|---|---|---|
| Write-off entered with a remittance | `ledger_insurance_details.*_ins_adjust` | yes — tier plan id or the claim |
| Claim-level intent | `insurance_claims.write_off_amount`, `write_off_mode`, `write_off_value` | yes, but NULL in practice (§2.8) |
| Contractual write-off embedded in the fee | `patient_procedures.ucr_fee − fee` (mean $143.85 per line on 32,440 sampled 2025 charges [D]) | through the line's claim, or `fee_schedule_id` → assignment, or `coverage_rule_id` → plan |
| Expected write-off at quote time | `expected_write_off` in the pricing quote | not stored |
| Manual adjustment codes | `patient_adjustments` (`adjustment_type`, `write_off_type` = contractual / provider / insurance / courtesy), `patient_payments` with `payment_type = 'adjustment'` | only via `procedure_id` → `claim_id`; legacy codes were not migrated (`be_data_financial.md` §3.3-3.4) |
| Legacy per-line insurance paid / adjust (`LEDGERINSD.PRIMINSPAID`, `PRIMINSADJUST`) | not loaded (`procedure_fee_provenance` deliberately has no paid / adjust columns) | — |
| Overpayment | `account_settings.credit_ins_overpayment_to_patient` (stored, unread); `remaining` is floored at 0 | — |

---

## 4. Report logic

### 4.0 Shared building blocks

```sql
-- c: claims, tenant-scoped (no tenant_id on the table) and normalised
WITH c AS (
  SELECT cl.*, p.tenant_id,
         lower(btrim(coalesce(cl.status, '')))                                   AS st,
         coalesce(nullif(lower(btrim(cl.billing_order)), ''),
                  CASE WHEN lower(cl.claim_type) IN ('primary','secondary','tertiary','quaternary')
                       THEN lower(cl.claim_type) END, 'primary')                 AS tier,
         CASE WHEN lower(cl.claim_type) LIKE 'med%' THEN 'medical' ELSE 'dental' END AS category,
         (cl.is_active = false AND lower(btrim(coalesce(cl.status, ''))) <> 'closed'
          AND cl.close_date IS NULL)                                             AS is_deleted,
         regexp_replace(cl.claim_number, '-[STQ]$', '')                          AS family_no,
         (cl.legacy_id IS NOT NULL)                                              AS is_migrated
  FROM insurance_claims cl
  JOIN patients p ON p.id = cl.patient_id
  WHERE p.tenant_id = :tenant_id
),
-- cs: one reporting bucket per claim (the vocabulary the module should standardise on)
cs AS (
  SELECT c.*, CASE
      WHEN is_deleted                                                     THEN 'deleted'
      WHEN st IN ('void','voided','cancelled','canceled')                 THEN 'void'
      WHEN st IN ('denied','rejected')                                    THEN 'denied'
      WHEN st = 'closed'                                                  THEN 'closed'
      WHEN st = 'paid'                                                    THEN 'paid'
      WHEN st IN ('sent','submitted','pending','resubmitted','preauth_sent','accepted')
           OR submitted_date IS NOT NULL                                  THEN 'sent'
      WHEN st = 'hold'                                                    THEN 'hold'
      ELSE 'unsent' END AS bucket
  FROM c
),
-- ln: claim lines (only the claim that owns the procedures has any)
ln AS (
  SELECT pp.claim_id, count(*) AS n_lines, sum(pp.fee) AS fee,
         sum(coalesce(nullif(pp.ucr_fee, 0), pp.fee))    AS ucr,
         sum(pp.insurance_estimate)                      AS est_prim,
         sum(coalesce(pp.sec_insurance_estimate, 0))     AS est_sec,
         min(pp.date_of_service) AS dos_from, max(pp.date_of_service) AS dos_to
  FROM patient_procedures pp
  WHERE pp.claim_id IS NOT NULL AND pp.is_void = false
  GROUP BY pp.claim_id
),
-- rt: app-era remittance money, one row per (remittance line, tier)
rt AS (
  SELECT l.id, l.patient_id, l.claim_id, l.procedure_id, l.office_id, l.payment_date, l.payment_method,
         l.check_number, l.eob_number, l.eft_trace_number, l.created_by,
         t.col_tier, t.ins_plan_id,
         coalesce(t.paid, 0) AS paid, coalesce(t.adj, 0) AS adj, coalesce(t.ded, 0) AS ded, t.est
  FROM ledger_insurance_details l
  CROSS JOIN LATERAL (VALUES
      ('primary',   l.prim_ins_plan_id, l.prim_ins_paid, l.prim_ins_adjust, l.prim_deductible, l.prim_estimated),
      ('secondary', l.sec_ins_plan_id,  l.sec_ins_paid,  l.sec_ins_adjust,  l.sec_deductible,  l.sec_estimated),
      ('tertiary',  l.ter_ins_plan_id,  l.ter_ins_paid,  l.ter_ins_adjust,  l.ter_deductible,  l.ter_estimated)
  ) AS t(col_tier, ins_plan_id, paid, adj, ded, est)
  WHERE l.is_void = false AND l.legacy_ledger_id IS NULL
    AND (coalesce(t.paid, 0) <> 0 OR coalesce(t.adj, 0) <> 0 OR coalesce(t.ded, 0) <> 0)
),
-- sl: active coverage slots with plan, carrier and subscriber
sl AS (
  SELECT pi.id AS slot_id, pi.patient_id, lower(pi.insurance_type) AS tier,
         CASE WHEN upper(left(coalesce(pi.legacy_plan_type, 'D'), 1)) = 'M' THEN 'medical' ELSE 'dental' END AS category,
         pi.ins_plan_id, pl.carrier_id, pl.employer_id, pl.group_number, pl.plan_type, pl.coverage_type,
         pl.individual_max, pl.individual_deductible, pl.ortho_max,
         pl.anniversary_month, pl.anniversary_day, pl.anniversary_date,
         pi.max_remaining, pi.deductible_remaining, pi.ortho_remaining,
         coalesce(pi.updated_at, pi.created_at)::date AS written_on,
         s.id AS subscriber_id, s.sub_member_id, s.effective_date, s.term_date, s.plan_term_date,
         s.elig_status, s.elig_verified_on, s.elig_verified_by
  FROM patient_insurance pi
  JOIN patients p            ON p.id = pi.patient_id AND p.tenant_id = :tenant_id
  JOIN insurance_plans pl    ON pl.id = pi.ins_plan_id
  LEFT JOIN insurance_subscribers s ON s.id = pi.subscriber_id
  WHERE pi.is_active = true
)
```

The payer of a claim is `coalesce(cs.carrier_id, plan.carrier_id)`; its tier is `cs.tier`, **not** the `prim_` / `sec_` column family of its remittance rows (§3.2).

### 4.1 Outstanding claims and claim aging by carrier

| Element | Rule |
|---|---|
| Population | `bucket IN ('sent','paid')`, `is_preauth = false` (a `paid` claim can be part-paid) |
| Expected | `est_insurance` when > 0; else Σ line `insurance_estimate` (primary) or `sec_insurance_estimate`; else, for `bucket = 'sent'` only, `total_billed` (gross basis — flag the row) |
| Outstanding | `greatest(expected − total_paid − Σ rt.adj, 0)` |
| Age date | parameter: sent date `coalesce(submitted_date, created_at::date)` or service date `coalesce(ln.dos_to, date_of_service_to)` |
| Buckets | 0-30, 31-60, 61-90, 90+ (add 91-120 / 120+ for parity with the patient aging) |

```sql
SELECT coalesce(cs.carrier_id, pl.carrier_id) AS carrier_id, cs.office_id, cs.tier,
       count(*) AS claims, sum(v.outstanding) AS outstanding,
       sum(v.outstanding) FILTER (WHERE v.age <= 30)             AS d0_30,
       sum(v.outstanding) FILTER (WHERE v.age BETWEEN 31 AND 60) AS d31_60,
       sum(v.outstanding) FILTER (WHERE v.age BETWEEN 61 AND 90) AS d61_90,
       sum(v.outstanding) FILTER (WHERE v.age > 90)              AS d90_plus,
       bool_or(v.basis = 'billed')                               AS has_gross_basis_rows
FROM cs
LEFT JOIN ln ON ln.claim_id = cs.id
LEFT JOIN insurance_plans pl ON pl.id = cs.ins_plan_id
LEFT JOIN (SELECT claim_id, sum(adj) AS adj FROM rt GROUP BY claim_id) w ON w.claim_id = cs.id
CROSS JOIN LATERAL (
  SELECT e.basis,
         greatest(e.expected - coalesce(cs.total_paid, 0) - coalesce(w.adj, 0), 0) AS outstanding,
         :as_of - coalesce(cs.submitted_date, ln.dos_to, cs.date_of_service_to, cs.created_at::date) AS age
  FROM (SELECT CASE
                 WHEN cs.est_insurance > 0                                   THEN cs.est_insurance
                 WHEN cs.tier = 'primary' AND coalesce(ln.est_prim, 0) > 0   THEN ln.est_prim
                 WHEN cs.tier <> 'primary' AND coalesce(ln.est_sec, 0) > 0   THEN ln.est_sec
                 WHEN cs.bucket = 'sent'                                     THEN cs.total_billed
                 ELSE coalesce(cs.total_paid, 0) END AS expected,
               CASE WHEN cs.est_insurance > 0 OR coalesce(ln.est_prim, 0) > 0 OR coalesce(ln.est_sec, 0) > 0
                    THEN 'estimate' ELSE 'billed' END AS basis) e
) v
WHERE cs.bucket IN ('sent','paid') AND NOT cs.is_preauth AND v.outstanding > 0
GROUP BY 1, 2, 3;
```

As-of aging for a past date is approximate only: `submitted_date <= D AND (paid_date IS NULL OR paid_date > D) AND (close_date IS NULL OR close_date > D)`, with app remittances cut at `payment_date <= D`; `opening_paid` has no date other than `paid_date`, and denial / deletion have none.

### 4.2 Claims by status

```sql
SELECT cs.bucket, cs.st AS raw_status, cs.tier, cs.category, cs.is_preauth, cs.office_id,
       coalesce(cs.carrier_id, pl.carrier_id) AS carrier_id,
       count(*) AS claims, sum(cs.total_billed) AS billed, sum(cs.est_insurance) AS estimated, sum(cs.total_paid) AS paid
FROM cs LEFT JOIN insurance_plans pl ON pl.id = cs.ins_plan_id
WHERE cs.submitted_date BETWEEN :date_from AND :date_to      -- or paid_date / close_date / created_at::date / service date
GROUP BY 1, 2, 3, 4, 5, 6, 7;
```

Date basis must be a report criterion (sent / paid / closed / created / service). `created_at` is meaningful for app-era claims only. Summing `total_billed` across tiers double counts a claim family — restrict money totals to `tier = 'primary'` or group by `family_no`.

### 4.3 Unsent claims and unbilled procedures

```sql
SELECT pp.office_id, pp.provider_id, pp.patient_id, pp.id AS procedure_id, pp.date_of_service,
       pp.procedure_code, pp.fee, pp.insurance_estimate, pp.hold_claim,
       cov.carrier_id, cov.ins_plan_id, cs.id AS claim_id, cs.bucket AS claim_bucket,
       :today - pp.date_of_service AS days_unbilled
FROM patient_procedures pp
JOIN patients p ON p.id = pp.patient_id AND p.tenant_id = :tenant_id
LEFT JOIN cs ON cs.id = pp.claim_id
JOIN LATERAL (SELECT sl.carrier_id, sl.ins_plan_id FROM sl
              WHERE sl.patient_id = pp.patient_id AND sl.category = 'dental'
              ORDER BY (sl.tier = 'primary') DESC LIMIT 1) cov ON true        -- patient has dental coverage today
WHERE pp.is_void = false
  AND pp.date_of_service BETWEEN :date_from AND :date_to
  AND (pp.claim_id IS NULL OR cs.bucket IN ('deleted','unsent'))              -- no claim, deleted claim, or never-sent claim
  AND (pp.insurance_estimate > 0 OR coalesce(pp.coverage_pct, 0) > 0)         -- "covered"
  AND pp.legacy_id IS NULL;                                                    -- until the claim_id backfill is confirmed
```

Report three groups: no claim (`claim_id IS NULL`, `hold_claim = false`), held (`hold_claim = true`), on an unsent draft claim. Do not use `billing_status`. Coverage is today's slot, not coverage on the service date. 19 % of a migrated year's charges posted at $0 [D] — exclude `fee = 0` lines.

Secondary claims not yet created (derived, no stored link) [I]:

```sql
SELECT prim.* FROM cs prim
WHERE prim.tier = 'primary' AND prim.bucket IN ('paid','closed') AND NOT prim.is_preauth
  AND EXISTS (SELECT 1 FROM sl WHERE sl.patient_id = prim.patient_id AND sl.category = prim.category AND sl.tier = 'secondary')
  AND NOT EXISTS (SELECT 1 FROM cs s WHERE s.patient_id = prim.patient_id AND s.family_no = prim.family_no
                  AND s.tier = 'secondary' AND s.bucket <> 'deleted');
```

### 4.4 Pre-authorisation tracking

```sql
-- (a) pre-auth claims
SELECT cs.id, cs.claim_number, cs.patient_id, cs.office_id, coalesce(cs.carrier_id, pl.carrier_id) AS carrier_id,
       cs.bucket, cs.submitted_date, :today - cs.submitted_date AS days_out, cs.total_billed, cs.est_insurance
FROM cs LEFT JOIN insurance_plans pl ON pl.id = cs.ins_plan_id
WHERE cs.is_preauth AND cs.bucket NOT IN ('deleted','void');

-- (b) pre-auth recorded on treatment-plan items
SELECT tp.patient_id, tp.office_id, i.id AS plan_item_id, i.procedure_code, i.tooth, i.fee, i.status AS item_status,
       i.scheduled_date, d.ins_plan_id, d.billing_order, d.preauth_number, d.preauth_date, d.preauth_expires,
       d.preauth_amount, d.preauth_status, d.preauth_status_at
FROM treatment_plan_insurance_details d
JOIN treatment_plan_items i ON i.id = d.plan_item_id AND i.is_archived = false
JOIN treatment_plans tp     ON tp.id = i.plan_id
JOIN patients p             ON p.id = tp.patient_id AND p.tenant_id = :tenant_id
WHERE d.is_archived = false
  AND (d.preauth_status IS NOT NULL OR d.preauth_number IS NOT NULL OR d.preauth_date IS NOT NULL);
```

Worklists: sent with no response (`preauth_status = 'sent'`, no `preauth_number`), approved and not scheduled (`preauth_status = 'closed'`, item not completed, `scheduled_date IS NULL`), expiring (`preauth_expires` within N days). The two sources cannot be joined except by matching `insurance_claims.predetermination_number` to `preauth_number` as text.

### 4.5 Insurance payments by carrier

```sql
-- (a) app-era remittances
SELECT coalesce(pl.carrier_id, cl.carrier_id) AS carrier_id, coalesce(rt.ins_plan_id, cl.ins_plan_id) AS ins_plan_id,
       rt.office_id, date_trunc('month', rt.payment_date)::date AS period,
       sum(rt.paid) AS ins_paid, sum(rt.adj) AS ins_write_off, sum(rt.ded) AS deductible_applied,
       count(DISTINCT rt.claim_id) AS claims,
       count(DISTINCT coalesce(rt.check_number, rt.eft_trace_number, rt.eob_number)) AS remittances
FROM rt
JOIN patients p ON p.id = rt.patient_id AND p.tenant_id = :tenant_id
LEFT JOIN insurance_claims cl ON cl.id = rt.claim_id
LEFT JOIN insurance_plans  pl ON pl.id = coalesce(rt.ins_plan_id, cl.ins_plan_id)
WHERE rt.payment_date BETWEEN :date_from AND :date_to
GROUP BY 1, 2, 3, 4
UNION ALL
-- (b) migrated history: claim-level paid baseline, one date per claim
SELECT cs.carrier_id, cs.ins_plan_id, cs.office_id, date_trunc('month', cs.paid_date)::date,
       sum(cs.opening_paid), NULL, NULL, count(*), NULL
FROM cs
WHERE coalesce(cs.opening_paid, 0) <> 0 AND cs.bucket <> 'deleted'
  AND cs.paid_date BETWEEN :date_from AND :date_to
GROUP BY 1, 2, 3, 4
UNION ALL
-- (c) app-era unallocated carrier cheques: no carrier column (app rows store a positive amount; see ledger_sign.py)
SELECT NULL, NULL, pay.office_id, date_trunc('month', pay.payment_date)::date,
       sum(abs(pay.amount)), NULL, NULL, NULL, count(*)
FROM patient_payments pay
JOIN patients p ON p.id = pay.patient_id AND p.tenant_id = :tenant_id
WHERE pay.payment_type = 'insurance' AND pay.legacy_id IS NULL AND pay.is_void = false
  AND pay.payment_date BETWEEN :date_from AND :date_to
GROUP BY 3, 4;
```

For "insurance collections by period / office / provider" on history use the migrated `patient_payments` `insurance` rows instead of (b) — same money, real dates, no carrier. Never add (b) and those rows together.

### 4.6 Write-offs by plan and carrier

```sql
-- explicit insurance write-offs entered with remittances (app era)
SELECT coalesce(pl.carrier_id, cl.carrier_id) AS carrier_id, coalesce(rt.ins_plan_id, cl.ins_plan_id) AS ins_plan_id,
       sum(rt.adj) AS ins_write_off, sum(rt.paid) AS ins_paid,
       round(100 * sum(rt.adj) / nullif(sum(rt.adj) + sum(rt.paid), 0), 1) AS write_off_pct
FROM rt
LEFT JOIN insurance_claims cl ON cl.id = rt.claim_id
LEFT JOIN insurance_plans  pl ON pl.id = coalesce(rt.ins_plan_id, cl.ins_plan_id)
WHERE rt.payment_date BETWEEN :date_from AND :date_to
GROUP BY 1, 2;

-- contractual write-off embedded in the fee, on claimed lines (both eras)
SELECT coalesce(cl.carrier_id, pl.carrier_id) AS carrier_id,
       sum(pp.ucr_fee) AS ucr, sum(pp.fee) AS charged, sum(pp.ucr_fee - pp.fee) AS contractual_write_off
FROM patient_procedures pp
JOIN patients p ON p.id = pp.patient_id AND p.tenant_id = :tenant_id
JOIN insurance_claims cl ON cl.id = pp.claim_id
LEFT JOIN insurance_plans pl ON pl.id = cl.ins_plan_id
WHERE pp.is_void = false AND pp.ucr_fee > pp.fee
  AND pp.date_of_service BETWEEN :date_from AND :date_to
GROUP BY 1;
```

The two are different measures (posted adjustment vs fee-schedule discount) and must be reported in separate columns.

### 4.7 Payer mix

| View | Rule |
|---|---|
| By patients | active patients by primary dental carrier / `plan_type` from `sl` (`category = 'dental'`, `tier = 'primary'`); no slot → self-pay |
| By production | Σ `patient_procedures.fee` by the payer of the charge: its claim's carrier; else `coverage_rule_id` → plan → carrier (app-era); else today's primary slot ("insured, unbilled"); else self-pay |
| By collections | insurance (`rt.paid` + `patient_payments` `insurance` rows) versus patient payments |

```sql
SELECT CASE WHEN cl.id IS NOT NULL OR r.id IS NOT NULL THEN 'insurance'
            WHEN cov.ins_plan_id IS NOT NULL            THEN 'insured_unbilled'
            ELSE 'self_pay' END AS payer_class,
       coalesce(cl.carrier_id, plc.carrier_id, cov.carrier_id) AS carrier_id,
       sum(pp.fee) AS production, count(DISTINCT pp.patient_id) AS patients
FROM patient_procedures pp
JOIN patients p ON p.id = pp.patient_id AND p.tenant_id = :tenant_id
LEFT JOIN insurance_claims cl          ON cl.id = pp.claim_id
LEFT JOIN insurance_coverage_rules r   ON r.id = pp.coverage_rule_id
LEFT JOIN insurance_plans plc          ON plc.id = coalesce(cl.ins_plan_id, r.ins_plan_id)
LEFT JOIN LATERAL (SELECT sl.ins_plan_id, sl.carrier_id FROM sl
                   WHERE sl.patient_id = pp.patient_id AND sl.category = 'dental' AND sl.tier = 'primary' LIMIT 1) cov ON true
WHERE pp.is_void = false AND pp.date_of_service BETWEEN :date_from AND :date_to
GROUP BY 1, 2;
```

### 4.8 Estimated versus actual

```sql
SELECT coalesce(cl.carrier_id, pl.carrier_id) AS carrier_id, pc.coverage_category,
       count(*) AS lines, sum(pp.insurance_estimate) AS estimated, sum(a.paid) AS paid, sum(a.adj) AS written_off,
       sum(a.paid) - sum(pp.insurance_estimate) AS variance,
       round(100 * sum(a.paid) / nullif(sum(pp.insurance_estimate), 0), 1) AS paid_pct_of_estimate
FROM patient_procedures pp
JOIN patients p ON p.id = pp.patient_id AND p.tenant_id = :tenant_id
JOIN insurance_claims cl ON cl.id = pp.claim_id
LEFT JOIN insurance_plans pl ON pl.id = cl.ins_plan_id
JOIN procedure_codes pc ON pc.code = pp.procedure_code
JOIN (SELECT procedure_id, claim_id, sum(paid) AS paid, sum(adj) AS adj FROM rt GROUP BY 1, 2) a
     ON a.procedure_id = pp.id AND a.claim_id = cl.id
WHERE pp.is_void = false AND lower(cl.status) IN ('paid','closed')
GROUP BY 1, 2;
```

App-era, line level. For migrated history only a claim-level comparison is possible: Σ line `insurance_estimate` (needs the `claim_id` backfill) versus `opening_paid`. `rt.est` (`prim_estimated` / `sec_estimated`) gives the estimate as shown when the payment was keyed.

### 4.9 Clean-claim, denial and turnaround rates

```sql
SELECT coalesce(cs.carrier_id, pl.carrier_id) AS carrier_id, date_trunc('month', cs.submitted_date)::date AS sent_month,
       count(*) AS sent,
       count(*) FILTER (WHERE cs.bucket = 'denied')                                         AS denied_now,
       count(*) FILTER (WHERE cs.bucket IN ('paid','closed') AND coalesce(sub.n, 1) = 1)    AS settled_first_pass,
       count(*) FILTER (WHERE coalesce(sub.n, 0) > 1)                                       AS resubmitted,
       avg(cs.paid_date - cs.submitted_date) FILTER (WHERE cs.paid_date >= cs.submitted_date) AS avg_days_to_first_payment,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY (cs.paid_date - cs.submitted_date))
              FILTER (WHERE cs.paid_date >= cs.submitted_date)                              AS median_days_to_first_payment
FROM cs
LEFT JOIN insurance_plans pl ON pl.id = cs.ins_plan_id
LEFT JOIN (SELECT claim_id, count(*) AS n FROM claim_submissions GROUP BY claim_id) sub ON sub.claim_id = cs.id
WHERE NOT cs.is_preauth AND cs.submitted_date BETWEEN :date_from AND :date_to AND cs.bucket <> 'deleted'
GROUP BY 1, 2;
```

Days from sent to first payment is solid for both eras (`CLAIMSENTDATE`, `PAIDDATE`). The denial rate is a point-in-time undercount (no denial event, no reason) and "first pass" is a proxy (no payer acknowledgement). Claims submitted with form warnings: `claim_submissions.claim_text::jsonb -> 'warnings'` on app rows.

### 4.10 Patients with and without insurance

```sql
SELECT p.home_office_id,
       count(*)                                                              AS active_patients,
       count(*) FILTER (WHERE coalesce(d.n, 0) > 0)                          AS with_dental,
       count(*) FILTER (WHERE coalesce(d.n, 0) > 1)                          AS with_dual_dental,
       count(*) FILTER (WHERE coalesce(d.n, 0) = 0 AND coalesce(m.n, 0) > 0) AS medical_only,
       count(*) FILTER (WHERE coalesce(d.n, 0) = 0 AND coalesce(m.n, 0) = 0) AS self_pay
FROM patients p
LEFT JOIN (SELECT patient_id, count(*) AS n FROM sl
           WHERE category = 'dental' AND (term_date IS NULL OR term_date >= :as_of) GROUP BY 1) d ON d.patient_id = p.id
LEFT JOIN (SELECT patient_id, count(*) AS n FROM sl WHERE category = 'medical' GROUP BY 1) m ON m.patient_id = p.id
WHERE p.tenant_id = :tenant_id AND p.is_active = true
GROUP BY 1;
```

Detail variant ("patients by carrier / plan / employer"): `sl` joined to `insurance_carriers`, `employers`, `patients`. The office is the patient's `home_office_id` (a badge, not a fence) or `insurance_subscribers.office_id`.

### 4.11 Expiring and lapsed coverage

```sql
SELECT sl.patient_id, sl.tier, sl.category, sl.carrier_id, sl.group_number, sl.sub_member_id,
       least(sl.term_date, sl.plan_term_date) AS coverage_ends, nxt.next_appt
FROM sl
LEFT JOIN LATERAL (SELECT min(a.date) AS next_appt FROM appointments a
                   WHERE a.patient_id = sl.patient_id AND a.date >= :today
                     AND NOT a.is_cancelled AND NOT a.is_blocked AND NOT a.is_archived) nxt ON true
WHERE least(sl.term_date, sl.plan_term_date) BETWEEN :today AND :today + :days;   -- lapsed: < :today on a still-active slot
```

Benefit-year renewal ("benefits reset in N days") comes from the plan anniversary, as in §4.12.

### 4.12 Unused benefits (remaining annual maximum)

```sql
WITH yr AS (
  SELECT sl.*,
         coalesce(sl.anniversary_month, extract(month FROM sl.anniversary_date)::int, 1) AS am,
         least(coalesce(sl.anniversary_day, extract(day FROM sl.anniversary_date)::int, 1), 28) AS ad
  FROM sl WHERE sl.category = 'dental'
), y AS (
  SELECT yr.*, CASE WHEN make_date(extract(year FROM :as_of)::int, am, ad) <= :as_of
                    THEN make_date(extract(year FROM :as_of)::int, am, ad)
                    ELSE make_date(extract(year FROM :as_of)::int - 1, am, ad) END AS year_start
  FROM yr
), used AS (
  SELECT y.slot_id, count(*) AS claim_count,
         sum(CASE WHEN lower(c.status) IN ('paid','closed') THEN c.total_paid
                  ELSE greatest(c.total_paid, c.est_insurance) END) AS benefits_used_ytd
  FROM y
  JOIN insurance_claims c ON c.patient_id = y.patient_id
   AND c.is_preauth IS NOT TRUE
   AND lower(coalesce(c.status, '')) NOT IN ('void','voided','cancelled','canceled','denied','rejected')
   AND coalesce(c.date_of_service_from, c.submitted_date, c.created_at::date) >= y.year_start
   AND coalesce(c.date_of_service_from, c.submitted_date, c.created_at::date) <  y.year_start + interval '1 year'
   AND (c.ins_plan_id = y.ins_plan_id
        OR (c.ins_plan_id IS NULL AND c.carrier_id = y.carrier_id
            AND (lower(c.claim_type) = 'secondary') = (y.tier <> 'primary')))
  GROUP BY y.slot_id
)
SELECT y.patient_id, y.slot_id, y.tier, y.carrier_id, y.ins_plan_id, y.year_start,
       y.year_start + interval '1 year' AS year_end, y.individual_max,
       coalesce(u.benefits_used_ytd, 0) AS benefits_used_ytd,
       CASE WHEN u.claim_count > 0 AND y.individual_max IS NOT NULL THEN
              least(greatest(y.individual_max - u.benefits_used_ytd, 0),
                    CASE WHEN y.written_on >= y.year_start THEN y.max_remaining END)
            WHEN y.written_on >= y.year_start AND y.max_remaining IS NOT NULL THEN y.max_remaining
            ELSE y.individual_max END AS max_remaining_effective
FROM y LEFT JOIN used u USING (slot_id);
```

This is a line-for-line port of `benefit_usage_service.slot_benefits` (the service clamps the day by month; the port clamps to 28). Add `AND c.is_active` plus the deleted rule from §4.0 to fix the deleted-claim leak. The business report joins it to pending treatment (`treatment_plan_items` not completed / archived) and to "no future appointment" to produce the year-end "use it or lose it" list.

### 4.13 Verification worklist

```sql
SELECT a.id AS appointment_id, a.date, a.start_time, a.office_id, a.provider_id, sl.patient_id,
       sl.tier, sl.carrier_id, sl.sub_member_id, sl.group_number,
       sl.elig_status, sl.elig_verified_on, sl.elig_verified_by, sl.term_date
FROM appointments a
JOIN sl ON sl.patient_id = a.patient_id AND sl.category = 'dental'
WHERE a.date BETWEEN :date_from AND :date_to
  AND NOT a.is_cancelled AND NOT a.is_blocked AND NOT a.is_archived
  AND (sl.elig_verified_on IS NULL
       OR sl.elig_verified_on < a.date - make_interval(days => :max_age_days)
       OR lower(btrim(coalesce(sl.elig_status, ''))) NOT IN ('verified','active','confirmed','eligible','yes'));
```

`appointments` has no `tenant_id` either; `sl` already carries the tenant filter. Normalise `elig_status` case (`Verified` from the FE, `verified` from the endpoint and the migration).

### 4.14 Pitfall checklist

| # | Pitfall |
|---|---|
| P1 | Join `patients` for the tenant on every claim / remittance / slot query; `insurance_coverage_rules` and frequency groups scope through the plan. |
| P2 | Lower-case and trim `status`, `elig_status`, `insurance_type`, `carrier_type`, `plan_type` before grouping; never filter on a literal without normalising. |
| P3 | Exclude deleted claims with the §4.0 rule, not with `is_active` — `is_active = false` is also every closed claim. |
| P4 | `paid` does not mean fully paid; `closed` does not mean paid; a reopened claim is `submitted` with a stale `close_date` and `is_active = false`. Classify on `status`, measure on remaining amounts. |
| P5 | Tier comes from `billing_order`; category from `claim_type` only on app rows. |
| P6 | Money totals across a claim family double count: a secondary claim copies the primary's `total_billed` and shares its lines. After any payment posted on a secondary claim its `total_billed` / `est_insurance` may be 0 (finding 16). |
| P7 | Prefer line roll-ups (`ln`) to the header's `total_billed` / `est_insurance`; headers are client-supplied at create and stale until `POST /insurance-claims/{id}/recalculate`. |
| P8 | `total_paid` already contains `opening_paid`; app remittances are the difference. Legacy `patient_payments` insurance rows are the same money as `opening_paid`. |
| P9 | Exclude `is_void` remittance rows everywhere; identify app-era rows by `legacy_ledger_id IS NULL`. |
| P10 | A tertiary payment is stored in `prim_*` columns; take the tier from the claim. |
| P11 | Migrated claims have no service dates, estimate, provider or creation date — fall back to linked lines and `submitted_date`; report them as a separate "legacy" stratum where the fallback is the gross basis. |
| P12 | Migrated `ins_plan_id` on claims is NULL or unreliable; use `carrier_id` for payer grouping and verify it per environment (§5.2). |
| P13 | Migrated slots: tier and "has secondary" are wrong until the slot repair; `max_remaining` / `deductible_remaining` of 0 mean "not migrated", not "exhausted". |
| P14 | Eligibility is per subscriber, so one stamp marks every dependant verified. |
| P15 | Server-stamped claim dates are UTC dates; `created_at` columns are naive UTC timestamps. |
| P16 | `is_preauth` claims are not receivables and not production — exclude them from every money aggregate (only `benefit_usage_service` does today). |
| P17 | `patient_procedures.is_archived` marks rows loaded from the Denticon archive file, not deleted rows; the claim code does not filter on it while `report_service` does — pick one rule. |
| P18 | `GET /insurance-claims` and the other CRUD lists are paged feeds; tenant-wide insurance reports need server-side aggregation. |

---

## 5. What the data supports today versus gaps

### 5.1 Report matrix

| Report / KPI | Status | Supported by | Missing |
|---|---|---|---|
| Carrier, plan, employer lists; plan coverage table; fee schedule by payer | Supported | `insurance_carriers`, `insurance_plans`, `employers`, `insurance_coverage_rules`, `fee_schedule_assignments` | plan-type vocabulary; reliable `network_type` |
| Patients by carrier / plan / employer; with / without insurance; dual coverage | Supported (app-era exact) | `patient_insurance` + plan + subscriber | migrated tier repair; coverage as of a date |
| Claims register / claims by status | Supported | `insurance_claims` | one status enum; deleted flag; history |
| Claims sent (by date, carrier, user) | Partial | `submitted_date`, `claim_submissions.created_at` / `created_by` / `batch_id` | per-claim channel; real batches; a reopen through `/status` leaves no submission row |
| Claims printed | Not supported | `audit_logs` `PRINT` rows only if the FE switches to the server PDF | `printed_at`, `print_count`, print batch |
| Outstanding claims / insurance aging by carrier | Partial | §4.1 | estimate, service dates and plan on migrated claims; as-of status; `partially_paid` |
| Unsent claims (drafts) | Supported (app-era) | `bucket = 'unsent'` | — |
| Unbilled procedures | Partial | `claim_id IS NULL`, `hold_claim`, slots | `claim_id` backfill on history; coverage on service date; server-side unlink on claim delete |
| Secondary claims not created | Partial (derived) | §4.3 | `parent_claim_id` |
| Pre-authorisation tracking | Partial | `is_preauth` claims; `treatment_plan_insurance_details.preauth_*` | link between the two; approved amount / response date on the claim; nothing for history |
| Insurance payments by carrier / plan / cheque / EOB | Partial | app: `ledger_insurance_details`; history: `opening_paid` by `carrier_id` and `paid_date` | remittance header; carrier on `patient_payments` insurance rows; per-line legacy payments |
| Insurance write-offs by carrier / plan | Partial | `*_ins_adjust`; `ucr_fee − fee` | legacy `PRIMINSADJUST`; one write-off vocabulary |
| Payer mix | Partial | §4.7 | payer snapshot on the charge |
| Estimated versus actual | Partial | app: line level; history: claim level | legacy per-line paid |
| Days to payment by carrier | Supported | `submitted_date`, `paid_date` (both eras) | last-payment / fully-paid date |
| Denial analysis | Not supported | status `denied` only | denial date, reason code, amount, appeal, resubmission |
| Clean-claim / first-pass rate | Proxy only | submission count, warnings snapshot | clearinghouse acknowledgement |
| Expiring / lapsed coverage | Supported where dates exist | `insurance_subscribers.term_date`, `plan_term_date` | fill rate unknown; slot-level dates |
| Unused benefits | Partial | plan limits + claims in the benefit year (§4.12) | backfilled limits; deductible met; family maximum; materialisation |
| Eligibility verification worklist / verified-versus-pending counts | Partial | subscriber stamp + appointments | history, per-patient and per-visit record, status enum, verifier FK |
| Supporting records missing on claims | Supported | `claim_readiness` | persisted override flag |
| Capitation / managed-care utilisation | Not supported | production on `copay` lists is derivable | capitation payments, reliable prepaid flag |
| Provider credentialing by carrier (in / out of network) | Supported if maintained | `provider_insurance_ids.in_network`, `insurance_plans.network_type` | data is empty / default |
| Ortho insurance contract billing | Partial (see `be_data_financial.md` §1.7) | `patient_ins_payment_plans`, `patient_sec_ins_payment_plans`, `ortho_plans.ins_*` | instalment ↔ claim link |

### 5.2 Migrated-data dependencies (status is per environment and not verifiable from the repo)

| Dependency | Fix | Effect when missing | Documented state |
|---|---|---|---|
| Plan `group_number`, `individual_max`, `individual_deductible`, `ortho_max`, `family_deductible`; subscriber `marital_status`, `sub_phone`, `sub_address2`, `elig_verified_on` | `scripts/backfill_insurance_source_fields.py` | unused-benefits and limits read 0; group search inert | "Applied" on the dev DB [D] `docs/patient-insurance/patient_insurance_backend_response.md` L67 |
| `patient_procedures.claim_id` (297,671 rows), `created_by`, `pat_paid`, `pat_adjust` | `scripts/backfill_ledger_source_fields.py` | every migrated charge reads unbilled; migrated claims have no lines, no derived service dates or estimate | "has not been applied yet" [D] `docs/account-ledger/account_ledger_backend_response.md` L429-435 |
| Slot tiers (953 slots labelled `primary` are secondary in the source; 836 real primaries have no row), `deductible_remaining` | `scripts/backfill_pricing_hierarchy.py --only slots` (insert-then-rerank still to be written) | no secondary coverage; wrong primary payer | "deliberately held" [D] `docs/pricing/pricing_hierarchy_architecture.md` L566-575 |
| Plan `fees_to_print`, `network_type`, `legacy_prepaid_code`, `per_visit_copay`, `is_non_dup_benefits` | `backfill_pricing_hierarchy` section `plans` | defaults only | 31,321 plans updated on the dev DB [D] `docs/pricing/pricing_hierarchy_architecture.md` L558 |
| `insurance_claims.opening_paid` | Alembic `a6b7c8d9e0f1` | — | in the migration |
| Claim `ins_plan_id` | re-read `CLAIMH` | `s30` L57 looks `RESPPLANID` (a subscriber-row id) up in the plan-id map, so the plan is NULL or, on an id collision, the wrong plan [I]; `benefit_usage_service` already treats "most migrated claims" as plan-less [D] | open |
| Claim service date, notes, close date, providers | re-read `CLAIMH` (`CLAIMDOSDATE`, `NOTES` are in `denticon_migration/migration_mapping.md` L367-372 but not in `s30`) | NULL | open |
| Claim status map | `parsers.CLAIM_STATUS_MAP` L188-199: `S, P, R, H, D, C`; every other code → `draft` | unknown codes inflate "unsent" | unverified against the source codes |
| Per-charge legacy insurance split (`LEDGERINSD`, 1.45M rows) | `scripts/load_procedure_fee_provenance.py` | no legacy per-line estimate / deductible / plan | "empty on the dev DB" [D] `docs/pricing/pricing_hierarchy_architecture.md` L851 |
| Pre-auth per plan item, provider insurance ids, insurance instalments | no export file | empty | `denticon_migration/source_to_table_map.md` L72-105 |

### 5.3 New columns / tables the insurance catalogue depends on

| # | Need | Unblocks |
|---|---|---|
| I1 | Claim status enum (add `partially_paid`, `rejected`, `appealed`, `resubmitted`, `void`) and a `claim_status_history` (from, to, at, by, reason); written by every transition | claims by status, as-of aging, turnaround by stage |
| I2 | `is_deleted` / `deleted_at` / `deleted_by` separate from `is_active`; server-side line release on delete | every claim report |
| I3 | Denial fields: `denied_date`, reason code (definitions or CARC / RARC), denied amount, appeal and resubmission dates; optional per-line denial on the remittance | denial analysis |
| I4 | Persist `send_method`, `submitted_by`, acknowledgement fields on `claim_submissions`; `printed_at`, `print_count`, `last_printed_by` (or a claim print-event table) | claims sent / printed, clean-claim rate |
| I5 | `parent_claim_id` (optionally a claim ↔ procedure link table) and a guard so recompute cannot zero a claim without lines | secondary claims, family totals |
| I6 | Remittance header (payer, cheque / EFT / EOB, amount, date, office, deposit) with `ledger_insurance_details` as its lines; `claim_id` / `carrier_id` on insurance `patient_payments`; the money posted to the ledger | payments by carrier / cheque, deposit slip, EOB lookup (same as `be_data_financial.md` N1) |
| I7 | Payer snapshot on the charge: `prim_ins_plan_id`, `prim_carrier_id` (and secondary) on `patient_procedures` | payer mix, production by carrier, unbilled (N8 there) |
| I8 | `tenant_id` on `insurance_claims`, `claim_submissions`, `ledger_insurance_details`, `patient_insurance`; `updated_at` / `updated_by` on claims | scoping, incremental extracts |
| I9 | Eligibility verification history (subscriber, patient, appointment, status enum, method, verified at / by FK, benefit snapshot) — adopt or drop the orphan `eligibility_checks` | verification worklist, compliance |
| I10 | Coverage history: effective / termination dates and versioned rows on `patient_insurance` | coverage on a date, expiring coverage, payer at service date |
| I11 | Materialised benefit usage per slot and benefit year (used, remaining, deductible met, family) | unused benefits at tenant scale |
| I12 | Pre-auth link: approved amount / response date on the pre-auth claim and a reference from plan items (or lines) to it | pre-auth tracking |
| I13 | Capitation payments (payer, plan, period, members, amount) and a decoded prepaid flag | capitation reports |
| I14 | Claim notes / follow-up (note, author, time, follow-up date, assignee) | A/R follow-up worklists |

---

## 6. Indexes

### 6.1 Existing [V] `schema.sql`

| Table | Indexes and constraints |
|---|---|
| `insurance_carriers` | PK; unique `legacy_id` (global) + `idx_carriers_legacy`. No `tenant_id`, `name` or `payer_id` index |
| `employers` | PK; unique `legacy_id` + `idx_employers_legacy`. No `tenant_id` index |
| `insurance_plans` | PK; unique `legacy_id` + `idx_ins_plans_legacy`; `idx_ins_plans_carrier (carrier_id)`; `ix_insurance_plans_tenant_group_number (tenant_id, group_number)`. None on `employer_id`, `plan_type` |
| `insurance_subscribers` | PK; unique `legacy_id` + `idx_ins_sub_legacy`; `idx_ins_sub_plan (ins_plan_id)`. None on `tenant_id`, `subscriber_patient_id`, `office_id`, `term_date`, `elig_status`, `elig_verified_on` |
| `patient_insurance` | PK; unique `(patient_id, legacy_plan_type, insurance_type)`; `idx_pat_ins_patient (patient_id)`; `ix_patient_insurance_ins_plan_id`; `ix_patient_insurance_legacy_id`. None on `subscriber_id` |
| `insurance_coverage_rules` | PK; `idx_cov_rules_plan (ins_plan_id)` |
| `insurance_plan_frequency_groups` | PK; unique `(ins_plan_id, code_group)`; `(ins_plan_id)`; `(tenant_id)`; `(tenant_id, ins_plan_id)` |
| `fee_schedule_assignments` | PK; `(ins_plan_id)`; `(carrier_id)`; `(fee_schedule_id)`; unique `(tenant_id, legacy_id)`; partial unique target tuple `uq_fee_schedule_assignments_target` |
| `insurance_claims` | PK; unique `claim_number` (global); unique `legacy_id` + `idx_claim_legacy`; `idx_claim_patient_status (patient_id, status)`; `ix_insurance_claims_ins_plan_id`. None on `office_id`, `carrier_id`, `submitted_date`, `paid_date`, `close_date`, `created_at`, `is_preauth`, providers |
| `claim_submissions` | PK; `idx_claim_sub_claim (claim_id)`. None on `batch_id`, `created_at` |
| `ledger_insurance_details` | PK; `idx_ledger_ins_legacy (legacy_ledger_id)`; `idx_ledger_ins_proc (procedure_id)`; `ix_ledger_insurance_details_claim_id_is_void (claim_id, is_void)`. None on `patient_id` (declared in the model), `payment_date`, `office_id`, `check_number`, plan ids |
| `claim_attachments` | PK; `(claim_id)`; `(tenant_id)` |
| `treatment_plan_insurance_details` | PK; `idx_tp_ins_detail_item (plan_item_id)`; `ix_tp_insurance_details_ins_plan_id`. None on `preauth_status`, `preauth_expires` |
| `patient_procedures` (lines) | `idx_proc_claim (claim_id)`; `(patient_id, date_of_service)` twice; `(is_void)`; `(legacy_id)`; `(treatment_plan_item_id)` |
| `payment_allocations` | `(patient_id)`, `(payment_id)`, `(procedure_id)` twice, `(adjustment_id)`. None on `claim_id` |
| `provider_insurance_ids` | `(carrier_id)`, `(provider_id)` |
| `audit_logs` | `(resource_type, resource_id)`, `(tenant_id)`, `(user_id)`, `(patient_id)`, `(office_id)`, `(created_at)`, `(resource_type)` |
| `eligibility_checks` | `(subscriber_id)`, `(tenant_id)` |

Model / database drift: `index=True` on `tenant_id` in the models of `insurance_carriers`, `employers`, `insurance_plans`, `insurance_subscribers` and on `ledger_insurance_details.patient_id` has no matching index in the dump.

### 6.2 Needed for reporting [I]

| Index | Serves |
|---|---|
| `insurance_claims (office_id, submitted_date)`, `(carrier_id, submitted_date)`, `(submitted_date)`, `(paid_date)`, `(close_date)`, `(created_at)` | claims by period, aging by carrier, turnaround |
| `insurance_claims (carrier_id) INCLUDE (est_insurance, total_paid, total_billed, submitted_date, office_id) WHERE is_active AND NOT is_preauth` | outstanding claims — the hot path |
| `insurance_claims (patient_id, date_of_service_from)` | benefit usage per slot and year |
| `insurance_claims (is_preauth) WHERE is_preauth`; `(treating_provider_id)`, `(billing_provider_id)` | pre-auth list, provider reports |
| `ledger_insurance_details (payment_date) WHERE NOT is_void AND legacy_ledger_id IS NULL`; `(office_id, payment_date)`; `(patient_id)`; `(check_number)`; `(prim_ins_plan_id)`, `(sec_ins_plan_id)` | insurance payments by period / office / cheque / plan |
| `patient_procedures (office_id, date_of_service) WHERE claim_id IS NULL AND NOT is_void` | unbilled procedures |
| `patient_insurance (patient_id) WHERE is_active`; `(subscriber_id)` | with / without insurance, worklists |
| `insurance_subscribers (tenant_id)`, `(term_date)`, `(tenant_id, elig_status)`, `(elig_verified_on)`, `(subscriber_patient_id)` | expiring coverage, verification |
| `insurance_plans (tenant_id, plan_type)`, `(employer_id)`; `insurance_carriers (tenant_id, name)`, `(payer_id)`; `employers (tenant_id)` | list reports, payer mix |
| `claim_submissions (created_at)`, `(batch_id)` | claims sent, batch lookup |
| `treatment_plan_insurance_details (preauth_status)`, `(preauth_expires)` | pre-auth worklists |
| `payment_allocations (claim_id)` | claim drill-down |

A reporting fact / materialised view per claim (normalised status bucket, tier, payer, line roll-ups, remittance roll-ups, age date) and one per coverage slot (plan, carrier, dates, effective remaining) would replace most of these with two indexed tables keyed `(tenant_id, office_id, …)`.

---

## 7. Open questions

| # | Question |
|---|---|
| Q1 | Which of the migrated-data fixes in §5.2 have been applied on UAT and production — in particular the `claim_id` backfill and the slot repair? The insurance reports for history depend on both. |
| Q2 | Are `carrier_id` and `ins_plan_id` populated and correct on the 96k migrated claims (the `RESPPLANID` lookup)? One count query decides whether legacy claim reports can group by carrier at all. |
| Q3 | What are the real Denticon `CLAIMSTATUS` codes and the meanings of `InsPlans.ISPREPAID` 9 / 2 / 8 / 4 / 3 / 5, `COVERAGETYPE` and `PLANTYPE`? They define the status, capitation and plan-type dimensions. |
| Q4 | Should outstanding insurance be measured on the estimate (net of write-offs) or on billed minus paid? Three formulas are live today. |
| Q5 | Will app insurance remittances be posted into the ledger with a remittance header (I6), or must reports union `ledger_insurance_details` and accept disagreeing with on-screen balances? |
| Q6 | Is a clearinghouse / real-time eligibility integration planned (the dump already holds `eligibility_checks` and Stedi columns)? It decides whether denial, acknowledgement and verification reports are designed for manual entry or for EDI events. |
| Q7 | Does the legacy aging report age claims by sent date or by service date, and per claim or per line? |
| Q8 | Is pre-authorisation tracked on the claim, on treatment-plan items, or both — and which one should the legacy pre-auth report follow? |
