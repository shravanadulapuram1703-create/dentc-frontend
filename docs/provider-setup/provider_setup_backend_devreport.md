# Provider Setup — Backend Dev Report

> **Module:** Setup · **Screen:** Provider Setup (`/setup/providers/provider-setup`)
> **Frontend:** [`src/components/setup/providers/ProviderSetup.tsx`](../../src/components/setup/providers/ProviderSetup.tsx) + `tabs/*`
> **Backend:** DentC Backend v1.0.0 (`/api/v1`) · **Updated:** 2026-06-13 (post backend gap-fill)
> Companion: [`docs/setup/providers/PROVIDERS_INTEGRATION.md`](../setup/providers/PROVIDERS_INTEGRATION.md)

## Status: 🟢 all previously-reported gaps implemented and wired

The backend shipped every endpoint/field from the original report. The frontend Orval client was
re-synced (`npm run api:sync`) and **all 11 provider tabs are now fully backend-driven** — no gated
placeholders remain.

| Tab | Endpoint(s) | Generated fn (tag) |
|---|---|---|
| Info (CRUD + settings) | `/api/v1/providers` (+ 13 new fields, see below) | `list/get/create/update/deleteProvider` (organization) |
| Works At | `GET`/`PUT /offices/{id}/providers` | `listOfficeProviders`/`setOfficeProviders` (office-assignment) |
| Operatories | `/operatories` (`provider_id`) | `listOperatories`/`updateOperatory` (organization) |
| Insurance IDs | `/provider-insurance-ids` | `…ProviderInsuranceId` (staff) |
| Route Slips | `/provider-route-slips` | `…ProviderRouteSlip` (staff) |
| **Schedules** | `GET`/`PUT /providers/{id}/schedule` | `getProviderSchedule`/`setProviderSchedule` (provider-setup) |
| **Holidays** | `/providers/{id}/holidays` | `list/create/update/deleteProviderHoliday` (provider-setup) |
| **Watermarks** | `/providers/{id}/watermarks` + `/watermarks/image` | `get/setProviderWatermarks`, `upload/deleteProviderWatermarkImage` |
| **Referrals** | `GET`/`PUT /providers/{id}/referral-offices` | `list/setProviderReferralOffices` |
| **Carrier Login** | `/provider-carrier-logins` | `list/create/update/deleteProviderCarrierLogin` |
| **User & Permissions** | `GET`/`PUT /providers/{id}/user` | `get/setProviderUser` |

**Info-extra fields now on `ProviderRead`/`ProviderCreate`/`ProviderUpdate`** (Info → Provider Settings
/ Advanced): `scheduler_color`, `is_ortho_provider`, `visible_in_appointnow`, `default_provider_time`,
`is_billing_provider`, `print_separate_claim_form`, `dosespot_user_id`, `updox_direct_address`,
`denticon_user_id`, `ortho_questionnaire_template`, `custom_1`, `custom_2`, plus `user_id` (managed via
the User tab, not the Info save).

### Resolved gaps (was #1–#7)
1. ✅ Per-provider schedule — `GET/PUT /providers/{id}/schedule` (`ProviderScheduleDayRead` / `ScheduleDayInput`, `office_id` null = all offices, `effective_from` supported).
2. ✅ Provider holidays — `/providers/{id}/holidays` (`ProviderHolidayRead/Create/Update`).
3. ✅ Watermarks — `/providers/{id}/watermarks` (+ image upload/delete with `kind=watermark|signature`).
4. ✅ Referral offices — `GET/PUT /providers/{id}/referral-offices` (`AssignedReferralOfficeRead` / `ReferralOfficesSet{office_ids}`).
5. ✅ Carrier login — `/provider-carrier-logins` (password write-only, `password_masked` on read).
6. ✅ Provider↔user link — `GET/PUT /providers/{id}/user` (`ProviderUserLink{user_id}`); `user_id` also on the provider record.
7. ✅ Info-extra fields — all 13 added to the provider schemas.

---

## Remaining open items

### Gap A — Provider `id` is still client-supplied (was #8, **still open**)
- `ProviderCreate.id` remains a **required string**. The screen derives `prov-<short_id|name-slug>-<office_id>` on create.
- **Ask:** make `id` server-assigned (like offices/operatories `legacy_id` flows) or publish the required convention, to avoid collisions across offices/tenants. Low severity (create works today) but worth confirming before GA.

### Note B — Provider permissions are managed on the linked user (by design, not a gap)
- There is no dedicated provider-permission resource; role/office/scheduler/clinical/financial/reporting
  access live on the **linked user account** (Security → Users). The User tab links the account and points
  the operator there. No frontend change needed unless the product wants provider-level permission overrides.

### Note C — Holiday status/type options are client-side constants
- Provider (and office) holiday Status/Type dropdowns are sourced from `accountSetupApi` client constants
  (`HOLIDAY_STATUSES`/`HOLIDAY_TYPES`), not a backend `definitions` group. Functional, but a
  `definitions` group (e.g. `holiday_status`, `holiday_type`) would make them backend-driven for parity
  with other lookups. Cosmetic/nice-to-have.

### Note D — `provider_role` / `provider_specialty` definition groups are empty
- The groups exist (`GET /definitions?group_code=provider_role|provider_specialty` return 200) but contain
  no rows, so Info renders those fields as free-text (graceful fallback). Seeding the groups would turn them
  into dropdowns automatically — no frontend change required.

---

## Validation checklist
- [x] `npm run api:sync` (re-generated `endpoints/provider-setup/*`, 30+ new models)
- [x] `npx tsc -b` clean · `npx eslint src/components/setup/providers` clean
- [ ] Live: Schedules PUT, Holidays CRUD, Watermarks settings + image upload/delete, Referrals PUT, Carrier Login CRUD, User link/unlink, Info settings save.
