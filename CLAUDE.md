# dentc-frontend — project conventions

## Naming convention — snake_case for data fields (backend ↔ frontend parity)

**Always use `snake_case` for data/API field names; keep the frontend identical to the backend.**

- The DentC backend and the generated Orval client (`src/api/generated/**`) are **snake_case**
  (`OfficeRead.short_id`, `is_active`, `updated_at`, `office_id`, …). Bind component state, form keys,
  service types, and request/response shapes **directly** to those snake_case names.
- **Do not** add camelCase aliases (`officeId`, `shortId`, `phone1`, `isActive`) or snake↔camel mapping
  layers for API data. These caused concrete bugs here (e.g. the Office Setup list rendered blank columns
  and rows wouldn't open because the loader spread `OfficeRead` without mapping `id→officeId`, etc.).
- **Rename any existing camelCase on API-facing data to snake_case** when you touch it (DTOs, form/state
  keys, mappers). Office Setup has been migrated: `src/data/officeData.ts` now exports the snake_case
  `OfficeForm`/`OperatoryUi` types (the legacy camelCase `Office` interface, mock fixtures, and the
  snake↔camel `mapOfficeListItem` adapter were removed); `OfficeSetup`/`InfoTab`/`OperatoriesTab` bind
  directly to `OfficeRead`/`OfficeUpdate`/`OperatoryRead` field names.
- Per-tab services should wrap the **generated client** (no raw axios) and pass snake_case bodies through
  unchanged.

**Scope / exceptions:** applies to *data field identifiers*. React components stay PascalCase, hooks stay
`useX`, library APIs keep their own casing. Flag large renames before doing them.

## Office context — one model, never a fence

- The selected office is the user's **working context** (default read filter for day-data, write stamp for
  point-of-service records, selector for office-owned setup). Patients, the chart, the ledger, catalogs,
  users and Setup are organization-wide; `home_office_id` is a badge, not a wall. Design + backend asks:
  `docs/office-scope/office_scope_backend_devreport.md`.
- Read the office from `useOfficeScope()` (`src/features/office-scope/`): `office_id` (number | null),
  `office`, `home_office_id`, `assigned_office_ids`, `can_view_all_offices`, `switchOffice(id)`. Parse the
  legacy `currentOffice` string ("OFF-<id>") ONLY with `officeKeyToId()` (`src/services/officeLookup.ts`);
  never `parseInt` / `Number` / regex it (ESLint errors on that). Never render the raw key.
- Pass the office to the API explicitly per call — `...officeFilter(office_id)` / `...homeOfficeFilter()` —
  never via an interceptor. Per-screen "This office / My offices / All offices" = `useReadScope(screenKey,
  …)` + `<ScopeToggle>`; there is no global mode. Rows from other offices get `<OfficeBadge>`.
- Pickers **prefer, never exclude** the office roster (`fetchProviders(office)` returns everyone with
  `in_office`; render with `<ProviderOptionGroups>`). Rosters are sparse — never scope providers by the
  `office_id` scalar. Office-list labels come from `useOfficeOptions()` / `listOfficeOptions()`.
- Patient screens read `usePatientOffice()` (`home_office_id`, `posting_office_id`) from the patient shell;
  which office a new record is stamped with is declared in `stampPolicy.ts`.
- Office membership IS enforced (`OFFICE_ASSIGNMENT_ENFORCED = true`): the backend validates every
  `office_id` param/path/body and the `X-Office-ID` header against `user_offices`, returning
  `403 office_not_assigned` unless assigned or privileged (OFF-SCOPE-1/13,
  `docs/office-scope/office_scope_backend_response.md`). Escape hatches (matched client-side in
  `isOfficeAllowed`): privileged callers are never fenced, and a user with ZERO assignments is ungated.
  Mutations carry the working office as `X-Office-ID` (`officeHeader.ts`, attached in `services/api.ts`) —
  the server stamps/audits from it; it is never a read filter. The `permissions_enforced: true` flag is a
  separate axis (the legacy rights catalog, not offices).

## API / Orval workflow
- Backend is the source of truth. Before adding frontend logic, search `openapi.json` + the generated
  Orval client/hooks for an existing endpoint.
- Sync the client with `npm run api:sync` (fetches `openapi.json` from the running backend, then runs
  Orval). `size` query params max **200** on list endpoints.
- Document backend gaps in `backend_devreport.md`; per-module analysis lives under `docs/setup/**`.
- Verify changes with `npx tsc -b` and `npx eslint` before considering work done.
