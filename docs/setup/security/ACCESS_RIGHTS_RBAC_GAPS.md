# RBAC — Gaps Observed During Frontend Wiring

> **To:** DentC Backend team
> **From:** Frontend
> **Date:** 2026-09-13
> **Context:** After the catalog curation + C1 enforcement shipped
> ([`ACCESS_RIGHTS_BACKEND_RESPONSE.md`](./ACCESS_RIGHTS_BACKEND_RESPONSE.md)), the frontend built a
> gating layer (`src/features/access-control/`) and wired it onto the high-risk writes. This report
> records the gaps found while wiring + live-verifying with a real view-only user.
>
> **Test fixtures (left in the shared dev DB for future RBAC verification):** group **"QA View Only
> (RBAC test)"** (id 22, rights = `setup_security_groups_screen_view_only` +
> `setup_security_users_screen_view_only`); user **`qa_viewonly` / `ViewOnly@123`** (id 841, role
> `staff`, member of group 22).

---

## Summary

> **Status (2026-09-14):** Backend resolved **RBAC-1…5** and shipped **RBAC-6 phase-1** — see
> [`ACCESS_RIGHTS_RBAC_GAPS_RESPONSE.md`](./ACCESS_RIGHTS_RBAC_GAPS_RESPONSE.md). Frontend completed
> **FE-RBAC-3**. Open: RBAC-6 remainder (backend), FE-RBAC-1/2/4 (frontend).

| ID | Severity | Gap | Owner | Status |
|---|---|---|---|---|
| RBAC-1 | 🔴 | `*_view_only` rights don't grant reads — reads gated by coarse `users.role` | Backend | ✅ Fixed (`require_read_access`) |
| RBAC-2 | 🔴 | `GET /user-groups/{id}/rights` 403s a groups-view-only user | Backend | ✅ Fixed |
| RBAC-3 | 🔴 | `GET /users` returns empty for a users-view-only staff user | Backend | ✅ Fixed (reads open, writes admin-only) |
| RBAC-4 | 🟠 | `transactions_edit_fee_ledger` not server-enforced (deferred) | Backend | ✅ Fixed (field-scoped on fee change) |
| RBAC-5 | 🟠 | `transactions_delete_procedure` (ledger charge delete) not server-enforced | Backend | ✅ Fixed |
| RBAC-6 | 🟡 | Server-side enforcement stops at the C1 starter set | Backend | 🟡 Phase-1 (payments/perio/TP-delete); remainder open |
| FE-RBAC-1 | 🟠 | No FE delete UI for `patient_delete_patient_information` | Frontend | ⬜ Open |
| FE-RBAC-2 | 🟠 | No FE delete/un-attach UI for `patient_delete_patient_insurance_plan_information` | Frontend | ⬜ Open |
| FE-RBAC-3 | 🟡 | Restorative / Perio / Imaging screens lack full-vs-view gating | Frontend | ✅ Done (2026-09-14) |
| FE-RBAC-4 | 🟡 | FE gating kill-switch still dark (`RIGHTS_ENFORCED_DEFAULT=false`) | Frontend | ⬜ Open (blockers lifted) |
| FE-RBAC-5 | 🟡 | Nav/tab visibility gating (patient tabs + Setup menu) | Frontend | ✅ Done (2026-09-15) |

---

## Backend gaps

### RBAC-1 🔴 — `*_view_only` rights do not actually grant reads (root cause)

Per [`ACCESS_RIGHTS_BACKEND_RESPONSE.md`](./ACCESS_RIGHTS_BACKEND_RESPONSE.md) §B2, reads are **never** gated
by the fine-grained rights; the server falls back to the coarse `users.role`. Consequence: assigning a
`setup_*_screen_view_only` (or any `*_view_only`) right to a low-role user does **not** grant read access to
that screen's data — the role check still refuses it. So "view-only" groups are not functional for `staff`,
`front_desk`, etc. RBAC-2 and RBAC-3 are concrete instances.

**Ask:** make a screen's `*_view_only` / `*_full_control` right grant read on that screen's data
endpoints (i.e., a read passes when the caller holds either the view or the full right, **or** the legacy
role allows it) — so a group's view right means what it says.

### RBAC-2 🔴 — `GET /user-groups/{id}/rights` refuses a groups-view-only user

**Observed:** signed in as `qa_viewonly` (holds `setup_security_groups_screen_view_only`), the Groups
screen opens (FE route allows view), but selecting any group triggers a **403** ("Insufficient role for
this operation") and the rights panel shows "No rights assigned yet" for every group.
**Ask:** allow this read for a caller holding `setup_security_groups_screen_view_only` (or `_full_control`).

### RBAC-3 🔴 — `GET /users` returns empty for a users-view-only staff user

**Observed:** signed in as `qa_viewonly` (holds `setup_security_users_screen_view_only`), the Users screen
opens but the grid shows **"No users found"** — the list endpoint (users + home-office join) returns nothing
for a `staff` role.
**Ask:** the users list should be readable by a caller holding `setup_security_users_screen_view_only`.

### RBAC-4 🟠 — `transactions_edit_fee_ledger` not enforced

Backend deferred (response §C1): "Edit Fee – Ledger" maps to the generic `PATCH /patient-procedures/{id}`,
and gating all patient-procedure updates with a fee-specific right would over-gate. **Ask:** add a
fee-field-scoped guard so the right can be enforced. Until then the FE gate on this right is advisory only.

### RBAC-5 🟠 — `transactions_delete_procedure` not enforced

`DELETE /patient-procedures/{id}` (deleting a **charge** from the account ledger,
`EditTransactionModal`) is not gated by `transactions_delete_procedure` (only payment deletes are gated,
via `transactions_delete_patient_payments`). The FE gates the charge-delete button on
`transactions_delete_procedure`, but that is advisory until the server enforces it.
**Ask:** gate the patient-procedure DELETE on `transactions_delete_procedure`.

### RBAC-6 🟡 — enforcement coverage stops at the C1 starter set

Server-side 403 currently covers the ~10 endpoints in response §C1. Many other catalog writes the FE will
gate remain ungated server-side, e.g.: `patient_prescription_strike_off`, treatment-plan
`delete`/`discount`/`edit_fee`/`change_status`, payment posting (`transactions_add_post_*`),
progress-note lock override, medical-history edits, `charting_perio_*` writes, `imaging_capture_acquire`.
**Ask:** extend `require_permission` to the rest of the catalog's write operations (phased). FE gates on
these are advisory (hide/disable) until the server enforces them.

---

## Frontend gaps (tracked here; FE will action)

### FE-RBAC-1 🟠 — no delete UI for `patient_delete_patient_information`

The backend enforces `DELETE /patients/{id}`, but the FE currently exposes **no** patient-delete action
(the Security → Users "Delete" is a stub for *users*, not patients). Nothing to gate today; when a
patient-delete action is added it must wrap on `patient_delete_patient_information`.

### FE-RBAC-2 🟠 — no delete/un-attach UI for patient insurance plans

The backend enforces `DELETE /patient-insurance/{id}`, but the FE has no delete/detach action on a
patient's insurance plans (`src/features/patient-insurance/**` has no delete call). When added, gate on
`patient_delete_patient_insurance_plan_information` (and `patient_un_attach_patient_insurance_plan_information`
for detach).

### FE-RBAC-3 ✅ Done (2026-09-14) — clinical screens full-vs-view gating

Restorative, Perio, and Imaging now gate on their `*_full_control` / `*_view_only` rights:

- **Route guards** (App.tsx): each screen needs `full` **or** `view` to open, else `<AccessDenied/>`.
- **Perio** (`PerioChart`): without `charting_perio_full_control` the chart is **read-only** — grid
  disabled (existing `readOnly` extended), New/Delete Exam disabled, a "View only" badge shown. Matches the
  backend, which now enforces `charting_perio_full_control` on perio writes (RBAC-6).
- **Restorative** (`RestorativeChart`): without `charting_restorative_full_control` the ConditionPalette is
  replaced by a "View-only access — charting edits are disabled" note; the Delete button is already gated.
- **Imaging** (`ImagingWorkspace`/`ImagesTab`): without `imaging_full_control` the "Scan & Capture" tab and
  the Upload button are hidden; per-image Delete already gated. View-only users get the Images tab only.

Verified live with `qa_viewonly` (granted the three `*_view_only` codes): all three screens open and render
data (confirming the RBAC-1 read fix), with edit affordances hidden/disabled.

**Remaining (follow-up):** Restorative is not *fully* read-only — secondary edit paths (ChartToolbar
draw/watch tools, missing/implant toggles) are not individually gated; those writes are not server-enforced
except `DELETE /chart-conditions/{id}`, so the gap is advisory. `imaging_capture_acquire` is likewise not
yet server-enforced (RBAC-6 remainder), so the capture gate is advisory until then.

### FE-RBAC-5 ✅ Done (2026-09-15) — nav/tab visibility gating

- **Patient tabs** (`PatientSecondaryNav`): a `TAB_RIGHTS` label→(view-or-full) map filters the tab strip;
  a tab with none of its rights is hidden, unmapped tabs (search/print/utility) stay. Verified with
  `qa_viewonly` (clinical view rights only) → only Restorative/Perio/X-Ray + the unmapped utility tabs show.
- **Setup menu** (`GlobalNav`): a `SETUP_NAV_RIGHTS` path→(view-or-full) map + recursive `filterNavByRights`
  hides Setup leaves the user can't access, drops any group left with no visible child, and hides the
  top-level **Setup** button when nothing remains. Verified with `qa_viewonly` (security view only) → Setup
  shows only the Security group; with the kill-switch off, all 16 groups return (no regression).
- All 101 referenced right codes validated against the live `/api/v1/permissions` catalog (0 typos).

### FE-RBAC-4 🟡 — kill-switch still dark

`RIGHTS_ENFORCED_DEFAULT = false` in `src/features/access-control/rights.ts`. **RBAC-1 is now fixed** and
nav/tab gating (FE-RBAC-5) is in, so the main blockers to flipping are lifted. Before flipping to `true`:
(1) gate the remaining top-nav menus (Transactions/Charting/Reports/Utilities leaves) and add route guards
to the non-clinical patient screens (their tabs are hidden but URLs like `/overview` are still reachable),
(2) decide the rollout (e.g., enable per-tenant first). Until then the layer stays a safe no-op.

---

## What's wired on the FE so far (for reference)

Route guards + button gating using `<RequireRight code={…}>` / `useHasRight`:

| Area | Gated action | Right |
|---|---|---|
| Setup → Security | Users/Groups route entry; Add/Copy/Edit/Delete/Save actions | `setup_security_{users,groups}_screen_{full_control,view_only}` |
| Transactions | Delete Claim (ClaimDetail) | `transactions_delete_insurance_claims` |
| Transactions | Post to Ledger (TxPlanToolbar) | `transactions_treatment_plan_post_to_ledger` |
| Transactions | **Delete treatment plan** (TxPlanToolbar) | `transactions_treatment_plan_delete` |
| Transactions | **Post patient payment** (PaymentsTab APPLY) | `transactions_add_post_patient_payments` |
| Transactions | **Post insurance payment** (InsurancePaymentModal Apply) | `transactions_add_post_insurance_payments` (or `_patient_payments` for check-to-balance) |
| Account Ledger | Delete row (EditTransactionModal) | `transactions_delete_patient_payments` / `transactions_delete_procedure` |
| Appointments | Delete appointment (Scheduler context menu) | `appointments_delete_existing_appointment` |
| Charting | Delete charted condition (RestorativeChart) | `charting_restorative_delete_condition` |
| Charting | Perio full-vs-view (PerioChart read-only) | `charting_perio_full_control` |
| Imaging | Delete image (ImageThumbnail) | `imaging_delete_image` |
| AppointNow | Approve / Decline booking (RequestInbox) | `appointnow_approve_booking` / `appointnow_decline_booking` |

The three **bold** rows (2026-09-15) close the FE side of the backend's **RBAC-6 phase-1** enforced set —
patient-payment post, insurance-payment post, treatment-plan delete now hide/deny in the UI as well as
403 server-side. (Perio writes, also RBAC-6 phase-1, were covered by FE-RBAC-3.)

All are **dark** until FE-RBAC-4 flips. `me-full.permissions` (union of group rights) drives every check;
super-admin (`admin`/`super_admin`) bypasses; `permissions_enforced === false` (ungated users) grants. A
`ready` flag on `useRights()`/`RequireRight` (added 2026-09-15) suppresses a denial flash while `me-full`
is still hydrating after a hard reload.
