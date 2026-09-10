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

---

## Add / Edit User form fixes (frontend, 2026-08-20)

`src/components/modals/AddEditUserModal.tsx`

**1. Phone accepted any number of digits.** The field was a plain text input, so
`77788889999523` saved as-is. It now formats as typed via the new shared helper
`src/utils/phone.ts` — digits beyond ten are dropped, the value renders as
`(555) 123-4567`, `maxLength` is 14, a partially-typed number shows an inline
error and blocks Save, and the payload sends the raw ten digits
(`phoneDigits(...)`) rather than the formatted string. Existing records are
formatted on load.

**2. Developer-facing validation text.** The Username field showed
**"Backend must provide username"** on an untouched blank form — a note about the
API, shown to the person filling in the form. Required-field feedback is now
user-facing and appears only once the field has been visited or Save was pressed:

- inline `"Username is required."` (same treatment added to First Name, Last Name
  and Email, which previously gave no feedback at all)
- the Save alert lists screen labels — `Username, First Name, Last Name, Email,
  Home Office, User Role / Type` — instead of the raw state keys
  (`username, firstName, lastName, email, homeOffice, roles`).

**No backend gap.** Both were frontend-only.

**Note:** a stored phone longer than ten digits is truncated to the first ten when
the record is opened for editing, and re-saving persists the truncation. That is
the intended clean-up for US numbers; flag it if any tenant stores international
numbers in this field.

---

## View User Details — layout & avatar (frontend, 2026-08-20)

`src/components/modals/ViewUserDetailsModal.tsx`

**1. Tabs and content were clipped, and scrolling did nothing.** The dialog is a
`max-h-[90vh]` flex column (header / tabs / body / footer). Two CSS defaults broke it:

- the body was `flex-1 overflow-y-auto`, but `flex-1` leaves `min-height: auto`,
  so the pane kept its full content height instead of scrolling;
- header, tabs and footer had no `shrink-0`, so they absorbed the overflow and
  were compressed — the tab strip was cut in half and the header squashed.

Fixed with `min-h-0` on the scroll pane and `shrink-0` on header / tabs / footer
(plus `shrink-0 whitespace-nowrap` on the tab buttons so they don't collapse when
the strip scrolls horizontally). Measured after the fix: header 80px, tabs 49px,
body 444px with `scrollHeight` 2146 — i.e. it actually scrolls.

**2. No avatar when the user had no photo.** The `<img>` rendered only when
`image_url` was set, leaving a blank gap otherwise — and a broken/404 URL left a
broken-image glyph. The header now always renders a 48px avatar: the stored photo
when it loads, otherwise the user's initials (falling back to a user icon). An
`onError` on the image flips to the initials, so a stale path degrades cleanly.

**No backend gap.** `image_url` is returned correctly and
`/uploads/user_images/*.jpg` serves 200 image/jpeg; `apiAssetUrl` was already
prefixing the API host. This was purely presentation.
