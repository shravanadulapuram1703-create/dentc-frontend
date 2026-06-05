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

## API / Orval workflow
- Backend is the source of truth. Before adding frontend logic, search `openapi.json` + the generated
  Orval client/hooks for an existing endpoint.
- Sync the client with `npm run api:sync` (fetches `openapi.json` from the running backend, then runs
  Orval). `size` query params max **200** on list endpoints.
- Document backend gaps in `backend_devreport.md`; per-module analysis lives under `docs/setup/**`.
- Verify changes with `npx tsc -b` and `npx eslint` before considering work done.
