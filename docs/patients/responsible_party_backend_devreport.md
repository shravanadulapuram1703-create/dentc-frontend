# Responsible Party / Family Accounts — backend gap report (RP-1 … RP-16)

_Frontend analysis, 2026-11-16. Branch `feature/uat-realse-v5`. Verified against the local backend
pointed at the shared `Test_Dental_Group` DB, the backend source (`dentc-backend/app/**`) and `openapi.json`._

## 0. The model we need (Denticon parity)

```
ACCOUNT  (one per guarantor; statements, aging, collections, payments are account-level)
  └── RESPONSIBLE PARTY  (the guarantor: either a PATIENT on the account, or a non-patient person)
        ├── member patient A  (relationship to RP: Self)
        ├── member patient B  (relationship: Child)
        └── member patient C  (relationship: Spouse)
```

* Every patient belongs to **exactly one** account and has **exactly one** responsible party.
* If the patient is the guarantor, the RP shown is the patient themselves (**Self**). Otherwise the RP shown
  is the person responsible for that patient (a parent, a spouse, a guardian, or a non-patient payer).
* An account can have **1–3 parties with financial roles** (Denticon: primary guarantor plus additional
  responsible/billing contacts, such as divorced parents splitting a child's balance). Insurance subscribers,
  cash payments, statements and aging all roll up to the account.
* Users must be able to **configure** this anywhere a patient is created or edited (link to an existing
  account, change guarantor, move a patient between accounts, add a non-patient guarantor) and **see** it
  consistently: Overview, Ledger, Scheduler, Statements, Claims, Letters.

## 1. What the data looks like today (live, `Test_Dental_Group`)

| Fact | Value |
|---|---|
| `responsible_parties` rows | **0** |
| Patients (tenant 1) | 135 |
| Patients with `responsible_party_id = str(own id)` ("self", written by `/patients/register` `is_self`) | 104 |
| Patients with `responsible_party_id = NULL` | 31 (e.g. patient 134 *Glikes, Abigail*) |
| Accounts with more than one member | **0** |
| `responsible_party_relationship` | `S` × 114, `NULL` × 21 |

So in practice **no family accounts exist**, and the only guarantor shape in use is "self", encoded as
the patient's own id inside a column that the rest of the system treats as a `responsible_parties.id`.

## 2. Summary of gaps

| ID | Gap | Severity | Area |
|---|---|---|---|
| RP-1 | `patients.responsible_party_id` is an overloaded string: RP row id, patient id (self), or legacy id. The id spaces collide | 🔴 Critical | Schema |
| RP-2 | `resolve_responsible_party` resolves a self-guarantor key to whatever RP row has the same number | 🔴 Critical | Service |
| RP-3 | No first-class **Account** entity. Membership is "everyone sharing the same string" | 🔴 High | Schema |
| RP-4 | 31 patients have no responsible party at all. Registration/PATCH allow `NULL` | 🟠 High | Data + validation |
| RP-5 | No way to link a patient to an **existing patient as guarantor** (head of household) | 🔴 High | API |
| RP-6 | No endpoint to change guarantor / move a patient between accounts (with balance handling) | 🟠 High | API |
| RP-7 | `PATCH /patients/{id}` accepts any `responsible_party_id` string with no validation | 🟠 High | Validation |
| RP-8 | One guarantor per patient only. No secondary / additional responsible parties (1–3 per account) | 🟠 Medium | Schema |
| RP-9 | Payments, statements, aging and collections are per-patient, not per-account | 🟠 High | Billing |
| RP-10 | Account balance and roster are not in the patient payloads that need them | 🟡 Medium | API |
| RP-11 | Guarantor summary missing from `PatientRead`, the scheduler feed and patient search | 🟡 Medium | API |
| RP-12 | Search patients / accounts by guarantor name or account number | 🟡 Medium | API |
| RP-13 | Insurance subscriber ↔ account member link is not enforced or exposed | 🟡 Medium | Insurance |
| RP-14 | Legacy guarantors not migrated (`responsible_parties` empty). Carries over PO-2 | 🟠 High | Migration |
| RP-15 | `relationship` folding is inconsistent (`resp_party_rel` group vs codes vs free text) | 🟢 Low | Metadata |
| RP-16 | RP audit trail: who changed the guarantor, and when | 🟢 Low | Audit |

---

## 3. Details

### RP-1 🔴 Overloaded `patients.responsible_party_id`

`app/db/models/patients.py:95` declares `responsible_party_id: String(50)`, and the `ResponsibleParty`
docstring (`patients.py:580`) says it "holds this row's id, **or the patient's own id** for a self-guarantor".
`patient_intake_service._register_patient` writes `str(patient.id)` for `is_self` and `str(guarantor.id)`
for an inline person. Migrated rows hold legacy guarantor ids.

**Why it breaks things:** patient 132 self-links as `"132"`. As soon as `responsible_parties` row 132 is
created for an unrelated family, patient 132's Overview, Ledger title ("Responsible: …"), letters and
statements will show **that family's guarantor**. Every consumer has to guess which table a number belongs
to. The frontend now guesses in `src/features/patient-overview/guarantor.ts`, which it should not have to do.

**Ask:** replace the string with typed columns:

```
patients.account_id               INT  NOT NULL  FK accounts.id
patients.guarantor_patient_id     INT  NULL      FK patients.id            -- guarantor is a patient
patients.guarantor_party_id       INT  NULL      FK responsible_parties.id -- guarantor is a non-patient
patients.responsible_party_relationship  (keep; code S/SP/P/G/C/D/O)
CHECK (exactly one of guarantor_patient_id / guarantor_party_id is NOT NULL)
```

Self = `guarantor_patient_id = patients.id`. Keep `responsible_party_id` read-only for one release as a
computed legacy alias, then drop it. Migration: `str(id) == responsible_party_id` → self; numeric key
matching an RP row → `guarantor_party_id`; key matching another self-guarantor patient → `guarantor_patient_id`;
legacy key → `responsible_parties.legacy_id` lookup (RP-14).

### RP-2 🔴 Resolver returns the wrong person for self-guarantors

`patient_overview_service.resolve_responsible_party` (`:43`) looks up `ResponsibleParty.id == int(key)`
first. For a self key (`"132"`) that is the wrong table. It is used by `/patients/{id}/overview`,
`/patients/{id}/context` (ledger AL-12 "Responsible:") and letters.

**Ask (until RP-1 lands):** if `rp_key == str(patient.id)`, return a **self** result, with no RP-table lookup.
Return a typed, discriminated payload everywhere a guarantor is returned:

```jsonc
"guarantor": {
  "kind": "self" | "patient" | "responsible_party" | "unresolved",
  "patient_id": 132,              // when kind = self | patient
  "responsible_party_id": null,   // when kind = responsible_party
  "name": "scott, wykie", "cell_phone": "...", "email": "...", "home_office_id": 3,
  "relationship": "S", "resp_party_type": null, "legacy_id": null
}
```

### RP-3 🔴 No Account entity

Account membership is computed by `account_scope.account_members` as "patients with the same raw string".
There is nowhere to store account-level facts that Denticon keeps on the account: account number,
statement preferences, collection status, finance-charge flag, account notes, budget/payment plan owner.
Today these are duplicated per patient (`patients.send_statements`, `is_finance_charge`, …) **and** on
`responsible_parties`. Which copy wins is undefined.

**Ask:** `accounts` table (`id, tenant_id, account_no, primary_guarantor_patient_id | primary_guarantor_party_id,
home_office_id, send_statements, no_email_statement, send_collections, collection_agency_id,
is_finance_charge, statement_message, financial_notes, is_active, timestamps`) plus:

* `GET /accounts/{id}` → account + guarantor(s) + members (with age/sex/next visit/last visit/recall/balance)
* `GET /patients/{id}/account` → same, resolved from a patient
* `PATCH /accounts/{id}` → account-level billing flags

### RP-4 🟠 Patients with no responsible party

31 live patients have `responsible_party_id = NULL` and 21 have no relationship. `account_scope` treats NULL
as "account of one". Every patient must have an account (Denticon has no orphan patients).

**Ask:** backfill NULLs as self (`account_id` = new account, guarantor = self, relationship `S`). Make
`POST /patients` and `/patients/register` default to self when no `responsible_party` is sent. Reject
`responsible_party_id: null` on PATCH unless a replacement guarantor is given.

### RP-5 🔴 Link a new or existing patient to an existing account / patient guarantor

`ResponsiblePartyIn` supports `is_self`, `person` (create a **non-patient** RP), or a raw
`responsible_party_id` string. There is no way to say "the guarantor is patient 132 (mom), add this child
to her account". So "Add New Member" on the Overview cannot work properly, and the frontend wizard always
creates a new standalone RP row for a parent who is already a patient. That produces duplicate people and
a split account.

**Ask:** extend `ResponsiblePartyIn` with
`{ "guarantor_patient_id": 132 }` and `{ "account_id": 77 }` (join that account under its primary
guarantor). Precedence `is_self > guarantor_patient_id > account_id > person > responsible_party_id`. Validate
that the guarantor patient is in the same tenant and is active.

### RP-6 🟠 Change guarantor / move between accounts

No endpoint exists. Today the only option is a raw `PATCH /patients/{id} {responsible_party_id}`, which
silently moves the patient's whole history into a different account's aging and ledger.

**Ask:** `POST /patients/{id}/change-guarantor`
`{ guarantor_patient_id | responsible_party_id | is_self | person, relationship, move_open_balance: bool,
effective_date }` → returns old/new account summary. It must:

* re-point the patient (and optionally the patient's dependents),
* either move or leave open charges with the old account (`move_open_balance`),
* write an audit row (RP-16),
* invalidate the account-balance cache (`balance_service` uses redis).

Also `POST /accounts/{id}/merge` for duplicate accounts.

### RP-7 🟠 No validation on `responsible_party_id`

`PATCH /patients/{id} {"responsible_party_id": "anything"}` is accepted. A typo creates a new phantom
"account" containing one patient.

**Ask:** 422 unless the key resolves to an RP row, an active patient (as guarantor), or a known legacy id.
After RP-1 this becomes FK-enforced.

### RP-8 🟠 Additional responsible parties (1–3 per account)

Denticon supports more than one financially responsible party, for example divorced parents each responsible
for a share, or a separate "bill to" address. Today a patient has exactly one guarantor key and an RP
has no percentage or role.

**Ask:** `account_parties (account_id, patient_id NULL, responsible_party_id NULL, role
['primary','secondary','billing_contact'], responsibility_pct NUMERIC NULL, receives_statements bool,
sort_order)`, max 3 per account, exactly one `primary`. CRUD under `/accounts/{id}/parties`.

### RP-9 🟠 Billing is per-patient, not per-account

`patient_payments.patient_id`, `patient_statements.patient_id`, `payment_allocations`: there is no account
or guarantor column anywhere. Consequences:

* A guarantor paying $100 for two kids must be split by hand into two payments.
* Statements are generated per patient. Denticon sends **one statement per account to the guarantor**,
  listing every member.
* Collections / finance charges cannot be applied to the account.

**Ask:**
* `patient_payments.account_id` (stamped), plus `POST /accounts/{id}/payments`
  `{amount, tender, distribute: "oldest_first" | "by_member", allocations?: [{patient_id, amount}]}` that
  creates the per-member allocations server-side.
* Statements generated per **account**, addressed to the primary guarantor (and secondary parties per
  RP-8 `receives_statements`), with member sections.
* Aging/collections/finance charge computed per account.

### RP-10 🟡 Account balance / roster availability

`GET /patients/{id}/account-balance` (AL-11) and `GET /responsible-parties/{rp_id}/patients` exist and work
(the Overview now uses AL-11). Remaining asks:

* `PatientBalance.account_balance` is documented as *"Alias of balance for the FE"*, but its name says
  "account". The Overview, BALANCES tab and print labelled the **patient's** balance "Account Balance"
  (fixed on the FE). Rename it to `patient_balance_total` or make it the true account total. Do not keep a
  field called `account_balance` that is the patient's own figure.
* Return `guarantor` (RP-2 shape) and `account_id` on `/account-balance` so the panel heading needs no
  second lookup.
* `/responsible-parties/{rp_id}/patients` should return `dob`, `relationship`, `is_guarantor` and
  `next_recall`, so the Overview can drop its per-member fan-out (`MEMBER_ENRICH_CAP`, PO-3).

### RP-11 🟡 Guarantor summary in common payloads

Add `guarantor: {kind, id, name}` and `account_id` to `PatientRead`, the scheduler feed
(`/appointments/scheduler`, today only `responsible_party_id` / `responsible_party_type`), and the patient
search list. The scheduler popover today shows "Resp. Party: <type code>" only.

### RP-12 🟡 Search by guarantor / account

`GET /patients` ignores several filters (PT-SEARCH-1). Add `guarantor_name`, `account_id`/`account_no`, and
include guarantor name in `search`. `GET /responsible-parties?search=` exists but no screen can use it
until RP-5.

### RP-13 🟡 Insurance subscribers ↔ account

`insurance_subscribers.subscriber_patient_id` exists. When a parent (patient) is the subscriber for the
kids' plan, nothing ties that to the account, and adding a new family member does not offer the account's
existing plans. **Ask:** `GET /accounts/{id}/insurance` → the distinct plans/subscribers used by members,
so "Add New Member" can attach the family plan in one step.

### RP-14 🟠 Legacy guarantors not migrated

Same as PO-2: migrated keys (e.g. `"13002496"`) have no `responsible_parties` row. On this DB the table
is empty. Import legacy guarantors with `legacy_id`, then map them per RP-1.

### RP-15 🟢 Relationship vocabulary

Rules metadata publishes `definition_group: "resp_party_rel"` with codes `S/SP/P/G/C/D/O`, while
`/definitions` exposes `RPTYPE` for the *type*. Confirm `resp_party_rel` is seeded for every tenant and
that every write path folds labels to codes (21 NULL relationships today).

### RP-16 🟢 Audit

Log guarantor/account changes (`old_account_id`, `new_account_id`, `old_guarantor`, `new_guarantor`,
`moved_balance`, `user_id`, `at`) and expose them under `GET /patients/{id}/change-log`.

---

## 4. Frontend status (already done, 2026-11-16)

* **Overview → Responsible Party:** classifies the key (self / head-of-account patient / RP row / legacy /
  not set) in `src/features/patient-overview/guarantor.ts`. Self-guarantors no longer show the yellow
  "legacy id … backend gap PO-2" warning. They show a **Self** badge, *Resp ID 132 (Patient ID)*,
  relationship, member count and home office. Edit opens the patient (self), the guarantor patient's
  Overview (head of account), or the RP editor (RP row).
* **Overview → Account Members:** fixed a leak where a patient with `responsible_party_id = NULL` showed
  the first 200 patients in the tenant as "members". The disabled query's key collapsed to `{size: 200}`,
  the same cache entry as the patient list. Members are now filtered to the exact account key.
* **Overview → Balances:** uses AL-11 `/account-balance`. It is labelled "Account of <guarantor> · N members",
  pins and highlights *(this patient)*, and has a **Whole account / This patient** toggle. The BALANCES tab
  and print now say "Patient Balance" for the patient's own figure, and show the account total separately.

**Blocked on backend:** Add New Member linking (RP-5), changing guarantor (RP-6), additional parties
(RP-8), account payments/statements (RP-9).
