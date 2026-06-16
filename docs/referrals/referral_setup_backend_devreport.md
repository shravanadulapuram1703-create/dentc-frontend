# Referral Setup — backend dev report

Frontend: `src/components/setup/referrals/` (ReferralSetup master-detail screen,
`referralData.ts` form model, `referralService.ts` client wrapper).
Route: `/setup/referrals/referral-sources` (nav: Setup → Referrals → Referral Sources).

## Backend used (tag: Patients)

All CRUD is live and wired through the generated Orval client
(`src/api/generated/endpoints/patients/patients.ts`):

| Operation | Endpoint | Function |
| --- | --- | --- |
| List | `GET /api/v1/referrals` | `listReferrals` (paged, `size` max 200, `sort`/`order`/`search`) |
| Get | `GET /api/v1/referrals/{id}` | `getReferral` |
| Create | `POST /api/v1/referrals` | `createReferral` |
| Update | `PATCH /api/v1/referrals/{id}` | `updateReferral` |
| Delete | `DELETE /api/v1/referrals/{id}` | `deleteReferral` |

`ReferralRead` fields used: `id`, `legacy_id`, `office_id`, `referral_type`,
`first_name`, `last_name`, `address`, `city`, `state`, `zip`, `phone`, `email`,
`npi`, `specialty`, `reason_code`, `notes`.

## Mapping decisions (legacy screen ↔ backend)

- **Referral ID** ← `legacy_id` (falls back to `id`). Seeded data uses legacy ids like `13000001`.
- **Referred By/To** ← `referral_type`, which the backend stores as a **direction code**
  (`"0"` = Referred By, `"1"` = Referred To), NOT a label. All 665 seeded rows use `"0"`.
  The UI maps code ↔ label via `REFERRAL_DIRECTIONS`/`referralDirectionLabel`. The left-rail
  **SEARCH ON** radios filter on this code.
- **Type** ← `reason_code` (drives the left-rail **TYPE** dropdown; seeded values e.g. `R003`, `RC01`).
- **Specialty** ← `specialty`.
- **NPI ID** ← `npi`.

## Gaps (no backend column — surfaced read-only as `N/A`)

1. **eReferral ID** — no field on `ReferralRead`.
2. **Practice Name** — no field. (Referrals carry first/last name only; practice name often
   lived in the legacy `address`/notes blob.)
3. **Contact** — no field.
4. **Cost** — no field. The legacy screen tracked a per-referral cost; not modeled.
5. **Demographics tab** — no referral-demographics endpoint exists. The tab renders the
   Demographic/Data header with an empty-state notice.

### Requested backend changes

- Add `e_referral_id`, `practice_name`, `contact_name`, `cost` columns to the referral model
  (all nullable) so the Referral Info grid can round-trip them.
- Confirm the `referral_type` code domain (is `"1"` = Referred To?) or expose a
  `/definitions`-style enum so the direction labels aren't hardcoded in the frontend.
- Provide a referral demographics feed (or confirm the concept is retired) to fill the
  Demographics tab.
