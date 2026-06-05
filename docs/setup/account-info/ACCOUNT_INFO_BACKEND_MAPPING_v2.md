# Account Information — Frontend Integration: Remaining Backend Gaps (v2)

> **Context:** The backend implemented the full Account Info surface (`account-info` tag + tenant). The
> frontend was re-integrated onto the regenerated Orval client (`openapi.json` 856 KB, fetched
> 2026-06-01). `accountSetupApi.ts` and `accountSetupTransform.ts` were rewritten as thin adapters over
> the generated client; **all `/api/accounts/*` and `/api/lookup/*` legacy paths are removed**. UI
> untouched. `tsc -b` / ESLint / `vite build` all green.
>
> This document lists what still **blocks or degrades** end-to-end integration, for hand-off to the
> backend (and a few follow-up UI tasks). Items are grouped: **L#** = lookup/data gaps, **M#** =
> field-shape mismatches between the current UI component and the new backend, **E#** = endpoint gaps.

---

## What is now fully integrated ✅

| Tab | Endpoint(s) wired (generated client) |
|---|---|
| Basic | `getTenant`/`updateTenant` (name, code) + `getAccountSettings`/`updateAccountSettings` (contact, address, email, phone, culture, custom, statement, pgid/oid, audit) + `uploadAccountLogo`/`deleteAccountLogo` |
| Advanced | `getAccountSettings`/`updateAccountSettings` (ledger colors, options, default settings, payment portal, AI assist — secret write-only via `ai_assist_client_secret`, read flag `ai_assist_has_secret`) |
| Holidays | `listAccountHolidays`, `createAccountHoliday`, `updateAccountHoliday`, `deleteAccountHoliday`, `bulkDeleteAccountHolidays`, `importFederalHolidays`, `createHolidayRange` |
| Communications | `getAccountCommunications`/`updateAccountCommunications` (EIN write-only / `ein_masked` read), `verifyAccountTelecom`, `listPhoneAssignments`/`setPhoneAssignments` |
| Online Registration | `getActiveConsent`, `createAccountConsent` (Header + Body) |

---

## L — Lookup / reference-data gaps (blocking dropdown population)

### L1. No backend lookup source for definition-backed dropdowns 🟡 (reduced)
- **RESOLVED client-side (product decision, US-only / stable common lists):** State (50 + DC), Culture
  (en-US/es-US/fr-CA), **Ledger Colors** (named palette with hex), **Charting Option** (Sub Menu (default),
  Tiled Interface), **Default Charting Tab** (Pre-existing, Completed, TxPlans), **Holiday Status**
  (Closed/Open/Half Day) + **Holiday Type** (Federal/Custom). See `accountSetupApi.ts`.
- **EDI Vendor → free-text input** (per product decision "text field, not option for now") — was a select.
- **Still gap (backend):** Communications only — Business Type, Company Status, Stock Exchange, Business
  Industry.
- **Actual:** no `/api/lookup/*` endpoint, and the `definitions` `group_code` values that back these are
  **not documented/seeded**; the integration returns `[]` (graceful empty) for them.
- **Impact:** stored values still load/save, but these option lists render empty.
- **Recommended fix:** publish the canonical `definitions` `group_code` seed values (gap #9), or add
  `/api/v1/lookup/*`. Ledger colors: confirm whether they come from `chart-colors`.

### L2. Model Office / Posting Office / Transworld Office dropdowns ✅ (resolved)
- Wired to `listOffices` (`/api/v1/offices`). These populate correctly. No backend action needed.

---

## M — UI-component ↔ backend field-shape mismatches

The current frontend component predates the backend spec, so a few fields don't line up 1:1. Handled best-effort in the transform; each needs either a **UI update** or a **backend tweak**.

### M1. Required-field toggles: UI boolean ↔ backend enum 🟠
- **UI Field:** Advanced → Required Fields (Patient DOB, SSN, Phone).
- **Expected vs actual:** UI renders **checkboxes** (bool); backend models `dob_required_mode`, `ssn_required_mode`, `phone_required_mode` as **enums** (screenshot showed `Any` / `Required` / `Not Required`).
- **Current behavior:** read derives bool (`mode === "Required"`); write maps bool → `"Required"`/`"Not Required"`. **Loses the `Any` option.**
- **Recommended fix:** update the UI to enum selects (matches production screenshots) — a follow-up UI task, intentionally **not** done here (UI-preservation directive).

### M2. `patient_email_required` name + the two missing toggles 🟠
- `patientEmailRequired` (UI) ↔ `email_required` (backend) — mapped, OK.
- **`patientAddressRequired` and `responsiblePartyRequired` have NO backend column** → not persisted (read as `false`).
- **Recommended fix:** add `address_required_mode` / `responsible_party_required` to `account_settings`, or remove these two toggles from the UI.

### M3. XVWeb / Cloud 9: UI boolean ↔ backend URL 🟠
- **UI Field:** Advanced → Third Party (XVWeb, Cloud 9) render as **checkboxes**; backend stores `xvweb_url` / `cloud9_url` (**strings**).
- **Current behavior:** read derives bool from URL presence; **write does NOT send** these (to avoid clobbering the URL with a boolean).
- **Recommended fix:** change the UI to URL text inputs (production screenshots show URL fields, e.g. `https://2829.dentiray.net`), then map directly.

### M4. Transworld toggle semantics 🟡
- `transworldEnabled` (UI) is mapped to `transworld_all_offices` (backend). Backend also has `transworld_office_id`, `transworld_portal_url`, and the screenshots show several distinct Transworld controls. The current single UI checkbox under-represents the backend model.
- **Recommended fix:** expand the UI Transworld section to match (follow-up UI task).

### M5. Newer Advanced fields not present in the current UI 🟡 (informational)
- Backend `account_settings` includes fields the **current component does not render**: `theme`, `ortho_claim_fee_mode`, `ortho_visit_code`, `treatment_plan_discount_code`, `per_visit_copay_code`, `statement_close_out_all`, `show_booked_production`, `show_production_colors`, `model_office_id`, `default_treatment_plan_filter`, `credit_ins_overpayment_to_patient`, `email_receipts_to_patients`, `default_fee_decrease_code`, `default_transfer_code`, `transfirst_auto_recurring`, `auto_eligibility`, `use_planet_dds_pay`, and Communications' `comm_number_type`.
- **Current behavior:** these persist untouched (partial PATCH only sends rendered fields). No data loss; they're simply not editable in the current UI.
- **Recommended fix:** extend the UI to the full production field set (the larger UI-modernization task) — out of scope for this integration pass.

---

## Integration fixes applied (live-verified via backend logs)

- **`NaN` tenant id → fixed.** `currentOrganization` is the display id `ORG-<pk>`; the service now strips
  the prefix and `AuthContext` exposes a numeric `tenantId`. Logs confirm calls now hit `/tenants/1/...`
  (200 on `PATCH /tenants/1` and `PATCH /tenants/1/account-settings`).
- **`account-settings` 422 (#1) → fixed.** `max_treatment_plan_discount` accepts `number|string`; the
  transform sends a string (within the backend's decimal pattern).
- **`account-settings` 422 (#2) → fixed.** `pronoun_field_visible` is a backend **string** (`anyOf [string,
  null]`) but the UI toggle is a boolean — the transform now writes `"YES"`/`"NO"` and reads it back to
  bool. (This was the Advanced-tab save 422.)

> ℹ️ `GET /tenants/1/consents/active -> 404` is expected when no consent exists yet — the UI treats 404
> as "no active consent" (null). The ~20s latencies + Redis "token store degraded" warnings are backend
> infra (Redis down), not frontend.

## E — Endpoint gaps

### E1. Consent PDF export 🟠
- **Screen/Tab:** Online Registration → "Export Template PDF" (present in the current component).
- **Actual:** backend exposes `GET …/consents/{id}/preview` (**JSON** `{header, body_html}`) but **no PDF endpoint**.
- **Current behavior:** `getConsentPdfUrl` falls back to the preview URL.
- **Recommended fix:** add `GET /api/v1/tenants/{id}/consents/{id}/pdf`, or render the PDF client-side from the preview payload.

### E2. Consent preview is JSON, not a rendered page 🟡
- The component opens the preview URL in a new tab (expects a viewable page); the endpoint returns JSON.
- **Recommended fix:** server-rendered HTML preview, or a client-side preview modal fed by the JSON.

---

## Summary for the backend team

**Must-fix to make the module fully usable:**
1. **L1** — publish/seed `definitions` `group_code` values (or add lookup endpoints) so Basic/Advanced/Communications/Holidays dropdowns populate. *(Single biggest blocker.)*
2. **M2** — add `address_required` / `responsible_party_required` columns (or confirm removal).
3. **E1** — add a consent PDF endpoint (or confirm client-side generation).

**Follow-up UI tasks (frontend, not backend):** M1, M3, M4, M5, E2 — update the current component to the production field set/shapes (enum selects, URL inputs, expanded Transworld, new fields). These are intentionally deferred to honor the "preserve UI exactly" directive for this pass.

**No blockers for:** name/code, contact, addresses, email/phone, culture, custom fields, logo upload, statement, ledger color *values*, AI Assist, holidays CRUD, communications + phone assignments, consent header/body — all integrated and building green.
