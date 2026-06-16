# Security → Users — Missing user fields (sample-user gap report)

> Raised from a sample "View User" screen (legacy DentC). Date: 2026-06-08.
>
> **✅ RESOLVED 2026-06-09** — backend migration `c0d1e2f3a4b5_add_user_structural_fields`
> added all five to the user contract (+ `image_url` and `POST/DELETE
> /api/v1/users/{user_id}/image`). Frontend wired after `npm run api:sync`:
> - **Add/Edit:** Short ID (≤6, upper-cased), Report Access Provider (dropdown from
>   `useListProviders`), Custom 1/2, Signature (file→data-URL), User Image (JPEG/PNG ≤2 MB,
>   uploaded via the multipart endpoint after save; Remove clears it). All five strings ride
>   the `/users/complete` payload; `409` on Short ID collision keeps the modal open.
> - **View:** Short ID, Custom 1/2, Report Access Provider (name), header avatar, signature image.
> - **Types:** `BackendUser` + `UserDetails` carry all six; `userApi` maps them from `UserRead`.
> - **Seed:** `scripts/seed_mock_user.py` populates short_id/custom/report-provider/signature.
>
> Original analysis preserved below.

## Structural gaps (need backend contract + UI) — RESOLVED

### 1. User Short ID (6 chars)
- **Sample:** `Short ID = KRIUDA`.
- **Status:** `short_id` exists on `OfficeRead` but **not** on `UserRead`/`UserCreate`/
  `UserCompleteCreate`. Legacy assigns each user a 6-char code.
- **Suggested:** add `short_id` to the user model (unique per tenant) + a form field.

### 2. Report Access Provider
- **Sample:** `Report Access Provider` (links a user to a provider for reporting scope).
- **Status:** no field; `provider_id` exists only on clinical resources.
- **Suggested:** `report_access_provider_id?: number | null` on the user, fed by
  `GET /api/v1/providers`.

### 3. Custom Fields (Custom 1, Custom 2)
- **Sample:** two free-text custom fields under Login Info.
- **Status:** no field. (Could be modeled as preferences, but they are presented as
  first-class labeled inputs, not settings.)
- **Suggested:** `custom_1` / `custom_2` on the user, or a defined `custom_fields` map.

### 4. Signature (Topaz pad)
- **Sample:** signature capture ("install Topaz Systems Inc. Signature Pad").
- **Status:** `signature_*` fields exist on other resources, not on the user.
- **Suggested:** `signature_id`/`signature_data` on the user + a capture control.

### 5. User Image
- **Sample:** `User Image` (avatar).
- **Status:** no field; no upload endpoint for user avatars.
- **Suggested:** `image_url`/`avatar_id` + an upload endpoint.

## ✅ Preference-storable — now wired (frontend)

These four are stored as preference keys and now have form inputs in the User Settings tab
(`AddEditUserModal`) and read-outs in the View modal. Still pending: backend confirmation
of the canonical `user_preferences_schema` keys (open question #2).

| Sample field | Pref key | Control |
| --- | --- | --- |
| Toolbar | `toolbar` | text input |
| Perio Setup Template | `perio_setup_template` | text input |
| Production View? | `production_view` | checkbox |
| Show Production Colors in Appt Units? | `show_production_colors` | checkbox |

**Remaining work:** route the five structural fields above (Short ID, Report Access
Provider, Custom Fields, Signature, User Image) as backend contract additions.
